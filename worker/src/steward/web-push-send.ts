/**
 * Tier 2 Web Push fan-out on live_proof.pending (RFC P2 step 2).
 */
import type { Env } from "../env";
import type { LiveProofPendingPushEvent } from "./push";
import { STEWARD_PUSH_DELIVERED_EVENT } from "./push";
import { incrementUsage } from "./db";
import { utcDayKey } from "./plans";
import {
  deleteStewardWebPushSubscription,
  listStewardWebPushSubscriptions,
  stewardWebPushSchemaReady,
} from "./web-push-db";
import {
  importVapidKeyPair,
  sendWebPushTextMessage,
  stewardWebPushContactFromEnv,
  stewardWebPushSendConfigured,
  decodeBase64Url,
} from "./web-push-send-core";

let cachedVapidKeys: {
  publicKeyBase64Url: string;
  privateKey: CryptoKey;
  publicKeyRaw: Uint8Array;
} | null = null;

/** @internal tests */
export function clearWebPushSendCacheForTests(): void {
  cachedVapidKeys = null;
}

async function loadVapidSendKeys(env: Env) {
  if (cachedVapidKeys) return cachedVapidKeys;
  const publicKeyBase64Url = env.STEWARD_VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKeyBase64Url = env.STEWARD_VAPID_PRIVATE_KEY?.trim() ?? "";
  if (!publicKeyBase64Url || !privateKeyBase64Url) return null;
  const pair = await importVapidKeyPair(publicKeyBase64Url, privateKeyBase64Url);
  cachedVapidKeys = {
    publicKeyBase64Url,
    privateKey: pair.privateKey,
    publicKeyRaw: decodeBase64Url(publicKeyBase64Url),
  };
  return cachedVapidKeys;
}

/**
 * @param {LiveProofPendingPushEvent} event
 */
export function liveProofPendingWebPushPayload(event: LiveProofPendingPushEvent): string {
  return JSON.stringify({
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
}

export async function fanOutWebPushLiveProofPending(
  env: Env,
  db: D1Database,
  accountId: string,
  event: LiveProofPendingPushEvent
): Promise<number> {
  if (!stewardWebPushSendConfigured(env)) return 0;
  if (!(await stewardWebPushSchemaReady(db))) return 0;

  const vapid = await loadVapidSendKeys(env);
  if (!vapid) return 0;

  const subscriptions = await listStewardWebPushSubscriptions(db, accountId);
  if (subscriptions.length === 0) return 0;

  const message = liveProofPendingWebPushPayload(event);
  const contact = stewardWebPushContactFromEnv(env);
  const dayKey = utcDayKey();
  let delivered = 0;

  for (const row of subscriptions) {
    try {
      const res = await sendWebPushTextMessage(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth_key },
        },
        message,
        {
          vapidPublicKeyBase64Url: vapid.publicKeyBase64Url,
          vapidPrivateKey: vapid.privateKey,
          vapidPublicKeyRaw: vapid.publicKeyRaw,
          contactInformation: contact,
          ttl: 120,
          urgency: "high",
        }
      );
      if (res.status === 404 || res.status === 410) {
        await deleteStewardWebPushSubscription(db, row.endpoint);
        continue;
      }
      if (!res.ok) {
        console.error("steward_web_push_send_failed", {
          account_id: accountId,
          endpoint: row.endpoint,
          status: res.status,
        });
        continue;
      }
      delivered += 1;
      try {
        await incrementUsage(
          db,
          accountId,
          row.device_id || "",
          STEWARD_PUSH_DELIVERED_EVENT,
          dayKey
        );
      } catch {
        /* metering must not break fan-out */
      }
    } catch (err) {
      console.error("steward_web_push_send_error", {
        account_id: accountId,
        endpoint: row.endpoint,
        err,
      });
    }
  }

  return delivered;
}
