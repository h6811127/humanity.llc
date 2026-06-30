/**
 * Web Push subscription ingest + send (Tier 2 / RFC P2).
 * @see docs/HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md
 */
import { errorResponse, jsonResponse } from "../http/resolver";
import type { Env } from "../env";
import {
  STEWARD_WEB_PUSH_MAX_SUBSCRIPTIONS_PER_ACCOUNT,
  deleteStewardWebPushSubscriptionForAccount,
  stewardWebPushSchemaReady,
  upsertStewardWebPushSubscription,
} from "./web-push-db";

export const WEB_PUSH_SUBSCRIBE_NOT_ENABLED = "web_push_subscribe_not_enabled";

export interface StewardWebPushSubscribeBody {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}

export function parseStewardWebPushSubscribeBody(
  raw: unknown
): StewardWebPushSubscribeBody | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  const keysRaw = body.keys;
  if (!endpoint || !keysRaw || typeof keysRaw !== "object") return null;
  const keys = keysRaw as Record<string, unknown>;
  const p256dh = typeof keys.p256dh === "string" ? keys.p256dh.trim() : "";
  const auth = typeof keys.auth === "string" ? keys.auth.trim() : "";
  if (!p256dh || !auth) return null;
  const expirationTime =
    body.expirationTime === null || body.expirationTime === undefined
      ? null
      : typeof body.expirationTime === "number"
        ? body.expirationTime
        : null;
  return { endpoint, keys: { p256dh, auth }, expirationTime };
}

export function parseStewardWebPushUnsubscribeBody(
  raw: unknown
): { endpoint: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const endpoint =
    typeof (raw as Record<string, unknown>).endpoint === "string"
      ? (raw as Record<string, unknown>).endpoint.trim()
      : "";
  return endpoint ? { endpoint } : null;
}

export function stewardWebPushSubscribeConfigured(env: Env): boolean {
  return (
    typeof env.STEWARD_VAPID_PUBLIC_KEY === "string" &&
    env.STEWARD_VAPID_PUBLIC_KEY.trim().length > 0
  );
}

export async function handlePostStewardWebPushSubscribe(
  env: Env,
  db: D1Database,
  input: {
    accountId: string;
    deviceId: string;
    body: StewardWebPushSubscribeBody;
  }
): Promise<Response> {
  if (!stewardWebPushSubscribeConfigured(env)) {
    return errorResponse(
      WEB_PUSH_SUBSCRIBE_NOT_ENABLED,
      "Web Push subscription storage is not enabled on this operator yet.",
      501
    );
  }
  if (!(await stewardWebPushSchemaReady(db))) {
    return errorResponse(
      WEB_PUSH_SUBSCRIBE_NOT_ENABLED,
      "Web Push subscription storage is not enabled on this operator yet.",
      501
    );
  }

  const result = await upsertStewardWebPushSubscription(db, {
    accountId: input.accountId,
    deviceId: input.deviceId,
    body: input.body,
  });
  if (!result.ok) {
    return errorResponse(
      "steward_web_push_subscription_limit",
      `Too many Web Push subscriptions for this account (max ${STEWARD_WEB_PUSH_MAX_SUBSCRIPTIONS_PER_ACCOUNT}).`,
      429,
      { "Retry-After": "60" }
    );
  }

  return jsonResponse({ ok: true }, 200);
}

export async function handleDeleteStewardWebPushSubscribe(
  env: Env,
  db: D1Database,
  input: {
    accountId: string;
    endpoint: string;
  }
): Promise<Response> {
  if (!stewardWebPushSubscribeConfigured(env)) {
    return errorResponse(
      WEB_PUSH_SUBSCRIBE_NOT_ENABLED,
      "Web Push subscription storage is not enabled on this operator yet.",
      501
    );
  }
  if (!(await stewardWebPushSchemaReady(db))) {
    return errorResponse(
      WEB_PUSH_SUBSCRIBE_NOT_ENABLED,
      "Web Push subscription storage is not enabled on this operator yet.",
      501
    );
  }

  const removed = await deleteStewardWebPushSubscriptionForAccount(
    db,
    input.accountId,
    input.endpoint
  );
  if (!removed) {
    return errorResponse("NOT_FOUND", "Web Push subscription not found.", 404);
  }
  return jsonResponse({ ok: true }, 200);
}
