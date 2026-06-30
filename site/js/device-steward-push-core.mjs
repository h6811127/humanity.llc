/**
 * Pure steward SSE push parsing and connection policy (hosted tier E4c).
 * @see docs/HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md
 */

export const STEWARD_PUSH_EVENT_LIVE_PROOF_PENDING = "live_proof.pending";
export const STEWARD_PUSH_EVENT_CONNECTION_ACK = "connection.ack";

/** Resume round-robin polling after push channel down (M3). */
export const STEWARD_PUSH_DOWN_FALLBACK_MS = 60_000;

/**
 * @typedef {{
 *   event: string,
 *   id: string | null,
 *   data: string,
 * }} StewardSseMessage
 */

/**
 * @typedef {{
 *   type: string,
 *   version?: number,
 *   operator_id?: string,
 *   account_id?: string,
 *   profile_id?: string,
 *   qr_id?: string,
 *   challenge_id?: string,
 *   expires_at?: string,
 *   issued_at?: string,
 *   connection_id?: string,
 * }} StewardPushEventPayload
 */

/**
 * Split accumulated SSE text into complete messages (double newline framed).
 *
 * @param {string} buffer
 * @returns {{ messages: StewardSseMessage[], remainder: string }}
 */
export function parseSseMessageBlock(buffer) {
  const messages = [];
  let rest = buffer;
  while (true) {
    const idx = rest.indexOf("\n\n");
    if (idx < 0) break;
    const block = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    const msg = parseSseMessageLines(block);
    if (msg) messages.push(msg);
  }
  return { messages, remainder: rest };
}

/**
 * @param {string} block
 * @returns {StewardSseMessage | null}
 */
function parseSseMessageLines(block) {
  if (!block.trim() || block.trimStart().startsWith(":")) return null;
  let event = "message";
  let id = null;
  const dataLines = [];
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("event:")) event = trimmed.slice(6).trim();
    else if (trimmed.startsWith("id:")) id = trimmed.slice(3).trim();
    else if (trimmed.startsWith("data:")) dataLines.push(trimmed.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  return { event, id, data: dataLines.join("\n") };
}

/**
 * @param {string} raw
 * @returns {StewardPushEventPayload | null}
 */
export function parseStewardPushEventPayload(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const type = typeof parsed.type === "string" ? parsed.type : "";
    if (!type) return null;
    return /** @type {StewardPushEventPayload} */ (parsed);
  } catch {
    return null;
  }
}

/**
 * @param {StewardPushEventPayload} payload
 * @param {number} [now]
 */
export function isStaleLiveProofPushEvent(payload, now = Date.now()) {
  if (!payload.expires_at) return false;
  const exp = Date.parse(payload.expires_at);
  return Number.isFinite(exp) && exp <= now;
}

/**
 * @param {StewardPushEventPayload} payload
 */
export function isLiveProofPendingPushPayload(payload) {
  return payload.type === STEWARD_PUSH_EVENT_LIVE_PROOF_PENDING;
}

/**
 * @param {StewardPushEventPayload} payload
 */
export function isConnectionAckPushPayload(payload) {
  return payload.type === STEWARD_PUSH_EVENT_CONNECTION_ACK;
}

/**
 * @param {{
 *   pushEntitled: boolean,
 *   watchEnabled: boolean,
 *   browserAlertsEnabled: boolean,
 *   hasSession: boolean,
 *   pollLeader: boolean,
 *   scopeActive: boolean,
 *   documentVisible: boolean,
 *   inFallbackCooldown?: boolean,
 * }} input
 */
export function shouldMaintainStewardPushConnection(input) {
  if (input.inFallbackCooldown === true) return false;
  if (!input.pushEntitled) return false;
  if (!input.watchEnabled) return false;
  if (!input.browserAlertsEnabled) return false;
  if (!input.hasSession) return false;
  if (!input.pollLeader) return false;
  if (!input.scopeActive) return false;
  if (!input.documentVisible) return false;
  return true;
}

/**
 * @param {number} lastDownAt
 * @param {number} [now]
 */
export function stewardPushInFallbackCooldown(lastDownAt, now = Date.now()) {
  if (!lastDownAt) return false;
  return now - lastDownAt < STEWARD_PUSH_DOWN_FALLBACK_MS;
}

/**
 * @param {PushMessageData | null | undefined} data
 * @returns {Promise<StewardPushEventPayload | null>}
 */
export async function parseWebPushMessageData(data) {
  if (!data) return null;
  try {
    const json = await data.json();
    if (json && typeof json === "object") {
      const type = typeof json.type === "string" ? json.type : "";
      if (type) return /** @type {StewardPushEventPayload} */ (json);
    }
  } catch {
    /* fall through to text */
  }
  try {
    const text = await data.text();
    return parseStewardPushEventPayload(text);
  } catch {
    return null;
  }
}

/**
 * @param {string} base64String URL-safe base64 VAPID public key
 * @returns {Uint8Array}
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * @param {PushSubscription} subscription
 */
export function serializePushSubscriptionForSubscribe(subscription) {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint ?? "",
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
    expirationTime: subscription.expirationTime ?? null,
  };
}

/**
 * Web Push works without a visible tab (Tier 2 force-quit path).
 *
 * @param {{
 *   pushEntitled: boolean,
 *   browserAlertsEnabled: boolean,
 *   hasSession: boolean,
 *   vapidPublicKey?: string | null,
 * }} input
 */
export function shouldMaintainStewardWebPushSubscription(input) {
  if (!input.pushEntitled) return false;
  if (!input.browserAlertsEnabled) return false;
  if (!input.hasSession) return false;
  const key =
    typeof input.vapidPublicKey === "string" ? input.vapidPublicKey.trim() : "";
  return key.length > 0;
}

/**
 * @param {Record<string, unknown> | null | undefined} capabilitiesBody
 */
export function stewardWebPushVapidPublicKeyFromCapabilities(capabilitiesBody) {
  const extensions =
    capabilitiesBody?.extensions &&
    typeof capabilitiesBody.extensions === "object"
      ? capabilitiesBody.extensions
      : null;
  const hosted =
    extensions?.hosted_steward &&
    typeof extensions.hosted_steward === "object"
      ? extensions.hosted_steward
      : null;
  const webPush =
    hosted?.web_push && typeof hosted.web_push === "object"
      ? hosted.web_push
      : null;
  const key =
    typeof webPush?.vapid_public_key === "string"
      ? webPush.vapid_public_key.trim()
      : "";
  return key || null;
}
