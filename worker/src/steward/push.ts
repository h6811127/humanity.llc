/**
 * Hosted steward live-proof push fan-out (E4a notify + E4b SSE registry).
 * @see docs/HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md
 */
import { OPERATOR_ID } from "../http/resolver";
import { generateStewardPushConnectionId } from "../id";
import type { Env } from "../index";
import { hostedStewardEnabled } from "./config";
import {
  incrementUsage,
  profileLinkedAccount,
  resolveEffectiveEntitlements,
  stewardSchemaReady,
} from "./db";
import { utcDayKey } from "./plans";

export const LIVE_PROOF_PENDING_TYPE = "live_proof.pending";
export const STEWARD_PUSH_DELIVERED_EVENT = "notify.push.delivered";

/** Per-account concurrent SSE streams (M3). */
export const STEWARD_PUSH_MAX_CONNECTIONS_PER_ACCOUNT = 5;

/** Abuse guard per client IP (M3). */
export const STEWARD_PUSH_MAX_CONNECTIONS_PER_IP = 20;

/** SSE comment heartbeat interval (M3). */
export const STEWARD_PUSH_HEARTBEAT_MS = 30_000;

export const CONNECTION_ACK_TYPE = "connection.ack";

export class StewardPushConnectionLimitError extends Error {
  constructor(message = "steward_push_connection_limit") {
    super(message);
    this.name = "StewardPushConnectionLimitError";
  }
}

export class StewardPushIpLimitError extends Error {
  constructor(message = "steward_push_ip_limit") {
    super(message);
    this.name = "StewardPushIpLimitError";
  }
}

export interface LiveProofPendingNotifyInput {
  profile_id: string;
  qr_id: string;
  challenge_id: string;
  issued_at: string;
  expires_at: string;
}

export interface LiveProofPendingPushEvent {
  type: typeof LIVE_PROOF_PENDING_TYPE;
  version: 1;
  operator_id: string;
  account_id: string;
  profile_id: string;
  qr_id: string;
  challenge_id: string;
  issued_at: string;
  expires_at: string;
}

export interface StewardPushSink {
  accountId: string;
  connectionId: string;
  deviceId: string;
  write: (chunk: string) => void;
  close?: () => void;
}

const connectionsByAccount = new Map<string, Set<StewardPushSink>>();
const connectionCountByIp = new Map<string, number>();

/**
 * @param {StewardPushSink} sink
 * @returns {() => void} unregister
 */
export function registerStewardPushSink(sink: StewardPushSink): () => void {
  let set = connectionsByAccount.get(sink.accountId);
  if (!set) {
    set = new Set();
    connectionsByAccount.set(sink.accountId, set);
  }
  if (set.size >= STEWARD_PUSH_MAX_CONNECTIONS_PER_ACCOUNT) {
    throw new StewardPushConnectionLimitError();
  }
  set.add(sink);
  return () => {
    const current = connectionsByAccount.get(sink.accountId);
    if (!current) return;
    current.delete(sink);
    if (current.size === 0) connectionsByAccount.delete(sink.accountId);
  };
}

/** @param {string} accountId */
export function stewardPushConnectionCount(accountId: string): number {
  return connectionsByAccount.get(accountId)?.size ?? 0;
}

export function stewardPushConnectionSummary(): {
  accounts_with_connections: number;
  active_connections: number;
  active_client_ips: number;
} {
  let activeConnections = 0;
  for (const set of connectionsByAccount.values()) {
    activeConnections += set.size;
  }
  let activeClientIps = 0;
  for (const count of connectionCountByIp.values()) {
    if (count > 0) activeClientIps += 1;
  }
  return {
    accounts_with_connections: connectionsByAccount.size,
    active_connections: activeConnections,
    active_client_ips: activeClientIps,
  };
}

/** E5.4 — drop in-memory SSE sinks when subscription expires. */
export function closeStewardPushConnectionsForAccount(accountId: string): void {
  const set = connectionsByAccount.get(accountId);
  if (!set) return;
  for (const sink of [...set]) {
    try {
      sink.close?.();
    } catch {
      /* ignore */
    }
  }
  connectionsByAccount.delete(accountId);
}

/** @param {string} clientIp */
export function stewardPushIpAtLimit(clientIp: string): boolean {
  const ip = clientIp.trim() || "unknown";
  return (connectionCountByIp.get(ip) ?? 0) >= STEWARD_PUSH_MAX_CONNECTIONS_PER_IP;
}

/**
 * @param {string} clientIp
 * @returns {() => void}
 */
export function registerStewardPushIp(clientIp: string): () => void {
  const ip = clientIp.trim() || "unknown";
  const current = connectionCountByIp.get(ip) ?? 0;
  if (current >= STEWARD_PUSH_MAX_CONNECTIONS_PER_IP) {
    throw new StewardPushIpLimitError();
  }
  connectionCountByIp.set(ip, current + 1);
  return () => {
    const next = (connectionCountByIp.get(ip) ?? 1) - 1;
    if (next <= 0) connectionCountByIp.delete(ip);
    else connectionCountByIp.set(ip, next);
  };
}

/** Vitest isolation. */
export function clearStewardPushConnectionsForTests(): void {
  connectionsByAccount.clear();
  connectionCountByIp.clear();
}

export function formatSsePingComment(): string {
  return ": ping\n\n";
}

/**
 * @param {{
 *   accountId: string,
 *   connectionId: string,
 *   deviceId?: string,
 * }} input
 */
export function formatConnectionAckSse(input: {
  accountId: string;
  connectionId: string;
  deviceId?: string;
}): string {
  const data = JSON.stringify({
    type: CONNECTION_ACK_TYPE,
    version: 1,
    operator_id: OPERATOR_ID,
    account_id: input.accountId,
    connection_id: input.connectionId,
    device_id: input.deviceId ?? null,
  });
  return `event: connection\nid: ${input.connectionId}\ndata: ${data}\n\n`;
}

/**
 * @param {Request} request
 * @param {{
 *   accountId: string,
 *   deviceId: string,
 *   clientIp: string,
 * }} ctx
 */
export function createStewardPushSseResponse(
  request: Request,
  ctx: { accountId: string; deviceId: string; clientIp: string }
): Response {
  const connectionId = generateStewardPushConnectionId();
  const encoder = new TextEncoder();
  let unregisterSink: (() => void) | null = null;
  let unregisterIp: (() => void) | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (pingTimer != null) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    unregisterSink?.();
    unregisterSink = null;
    unregisterIp?.();
    unregisterIp = null;
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      try {
        unregisterIp = registerStewardPushIp(ctx.clientIp);
        unregisterSink = registerStewardPushSink({
          accountId: ctx.accountId,
          connectionId,
          deviceId: ctx.deviceId,
          write(chunk) {
            if (closed) return;
            try {
              controller.enqueue(encoder.encode(chunk));
            } catch {
              cleanup();
            }
          },
          close: cleanup,
        });
      } catch (err) {
        cleanup();
        controller.error(err);
        return;
      }

      controller.enqueue(
        encoder.encode(
          formatConnectionAckSse({
            accountId: ctx.accountId,
            connectionId,
            deviceId: ctx.deviceId,
          })
        )
      );

      pingTimer = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(formatSsePingComment()));
        } catch {
          cleanup();
          try {
            controller.close();
          } catch {
            /* ignore */
          }
        }
      }, STEWARD_PUSH_HEARTBEAT_MS);

      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Resolver-Operator": OPERATOR_ID,
    },
  });
}

/**
 * @param {LiveProofPendingPushEvent} event
 */
export function formatLiveProofPendingSse(event: LiveProofPendingPushEvent): string {
  const data = JSON.stringify({
    type: event.type,
    version: event.version,
    operator_id: event.operator_id,
    account_id: event.account_id,
    profile_id: event.profile_id,
    qr_id: event.qr_id,
    challenge_id: event.challenge_id,
    issued_at: event.issued_at,
    expires_at: event.expires_at,
  });
  return `event: live_proof\nid: ${event.challenge_id}\ndata: ${data}\n\n`;
}

/**
 * Fan-out `live_proof.pending` to active SSE sinks for the linked steward account.
 * Does not throw; logs on unexpected errors.
 */
export async function notifyLiveProofPending(
  env: Env,
  db: D1Database,
  input: LiveProofPendingNotifyInput
): Promise<{ delivered: number; account_id: string | null }> {
  if (!hostedStewardEnabled(env) || !(await stewardSchemaReady(db))) {
    return { delivered: 0, account_id: null };
  }

  const accountId = await profileLinkedAccount(db, input.profile_id);
  if (!accountId) {
    return { delivered: 0, account_id: null };
  }

  const resolved = await resolveEffectiveEntitlements(db, accountId);
  if (!resolved) {
    return { delivered: 0, account_id: accountId };
  }

  const { account, entitlements } = resolved;
  if (account.status !== "active" && account.status !== "trialing") {
    return { delivered: 0, account_id: accountId };
  }
  if (entitlements["steward.hosted"] !== true) {
    return { delivered: 0, account_id: accountId };
  }
  if (entitlements["notify.push.live_proof"] !== true) {
    return { delivered: 0, account_id: accountId };
  }

  const event: LiveProofPendingPushEvent = {
    type: LIVE_PROOF_PENDING_TYPE,
    version: 1,
    operator_id: OPERATOR_ID,
    account_id: accountId,
    profile_id: input.profile_id,
    qr_id: input.qr_id,
    challenge_id: input.challenge_id,
    issued_at: input.issued_at,
    expires_at: input.expires_at,
  };

  const chunk = formatLiveProofPendingSse(event);
  const sinks = connectionsByAccount.get(accountId);
  if (!sinks || sinks.size === 0) {
    return { delivered: 0, account_id: accountId };
  }

  const dayKey = utcDayKey();
  let delivered = 0;
  for (const sink of sinks) {
    try {
      sink.write(chunk);
      delivered += 1;
      try {
        await incrementUsage(
          db,
          accountId,
          sink.deviceId || "",
          STEWARD_PUSH_DELIVERED_EVENT,
          dayKey
        );
      } catch {
        /* metering must not break fan-out */
      }
    } catch (err) {
      console.error("steward_push_sink_write_failed", {
        account_id: accountId,
        connection_id: sink.connectionId,
        err,
      });
    }
  }

  return { delivered, account_id: accountId };
}
