/**
 * Hosted steward live-proof push fan-out (E4a notify + E4b SSE registry).
 * @see docs/HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md
 */
import { OPERATOR_ID } from "../http/resolver";
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
    const err = new Error("steward_push_connection_limit");
    err.name = "StewardPushConnectionLimitError";
    throw err;
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

/** Vitest isolation. */
export function clearStewardPushConnectionsForTests(): void {
  connectionsByAccount.clear();
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
