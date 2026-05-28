/**
 * Browser steward session — sign steward_account_link_v1 and POST session (E2).
 * @see docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § E2
 * @see docs/STEWARD_DEVICE_ROADMAP.md § Current engineering steps
 */
import { getTabSession } from "./device-keys.mjs";
import {
  decodePrivateKeyBase58,
  randomBase58,
  resolverApiOrigin,
  signDocument,
  withProtocolFields,
} from "./hc-sign.mjs";
import {
  getOrCreateStewardDeviceId,
  readStewardSessionToken,
  refreshStewardEntitlements,
  writeStewardSession,
} from "./device-steward-entitlements.mjs";
import {
  STEWARD_ACCOUNT_LINK_TYPE,
  STEWARD_ACCOUNT_URL_PARAM,
  buildStewardAccountLinkUnsigned,
  isValidStewardAccountId,
  parseStewardAccountIdFromUrl,
  stewardAccountLinkTimestamps,
} from "./device-steward-session-core.mjs";

export {
  STEWARD_ACCOUNT_URL_PARAM,
  isValidStewardAccountId,
  parseStewardAccountIdFromUrl,
} from "./device-steward-session-core.mjs";

let sessionClientInit = false;

/**
 * @param {string} accountId
 * @returns {Promise<{ ok: true, token: string, account_id: string } | { ok: false, status?: number, message: string }>}
 */
export async function linkStewardAccountWithActiveKeys(accountId) {
  if (!isValidStewardAccountId(accountId)) {
    return { ok: false, message: "Invalid steward account id." };
  }

  const session = getTabSession();
  if (!session?.profile_id || !session.owner_private_key_b58) {
    return { ok: false, message: "Load signing keys in this tab first." };
  }

  const profileId = String(session.profile_id);
  const deviceId = getOrCreateStewardDeviceId();
  const { issued_at, expires_at } = stewardAccountLinkTimestamps();
  const unsigned = buildStewardAccountLinkUnsigned({
    profile_id: profileId,
    account_id: accountId.trim(),
    device_id: deviceId,
    nonce: `nonce_${randomBase58(16)}`,
    issued_at,
    expires_at,
  });

  let linkProof;
  try {
    const privateKey = decodePrivateKeyBase58(String(session.owner_private_key_b58));
    const publicKeyBase58 = String(session.owner_public_key_b58 || "");
    linkProof = await signDocument(
      withProtocolFields(unsigned, STEWARD_ACCOUNT_LINK_TYPE),
      privateKey,
      publicKeyBase58
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not sign link proof.";
    return { ok: false, message };
  }

  const url = `${resolverApiOrigin()}/.well-known/hc/v1/steward/session`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "omit",
      body: JSON.stringify({
        profile_id: profileId,
        device_id: deviceId,
        link_proof: linkProof,
      }),
    });
  } catch {
    return { ok: false, message: "Could not reach the resolver." };
  }

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const message =
      body && typeof body.message === "string"
        ? body.message
        : res.status === 404
          ? "Hosted steward is not enabled on this operator."
          : `Session request failed (${res.status}).`;
    return { ok: false, status: res.status, message };
  }

  const token = body && typeof body.token === "string" ? body.token.trim() : "";
  const linkedAccountId =
    body && typeof body.account_id === "string" ? body.account_id.trim() : accountId.trim();
  if (!token) {
    return { ok: false, message: "Session response missing token." };
  }

  writeStewardSession({ token, account_id: linkedAccountId });
  await refreshStewardEntitlements({ force: true });
  return { ok: true, token, account_id: linkedAccountId };
}

/**
 * Remove `hc_account_id` from the URL without navigation.
 */
export function stripStewardAccountUrlParam() {
  if (typeof window === "undefined") return;
  const url = new URL(location.href);
  if (!url.searchParams.has(STEWARD_ACCOUNT_URL_PARAM)) return;
  url.searchParams.delete(STEWARD_ACCOUNT_URL_PARAM);
  const next = `${url.pathname}${url.search}${url.hash}`;
  history.replaceState(history.state, "", next);
}

/**
 * After billing/checkout return: link account when keys are active and param present.
 *
 * @returns {Promise<boolean>} true when a link attempt completed successfully
 */
export async function tryCompleteStewardAccountLinkFromUrl() {
  if (typeof window === "undefined") return false;
  if (readStewardSessionToken()) {
    stripStewardAccountUrlParam();
    return false;
  }

  const accountId = parseStewardAccountIdFromUrl(location.search);
  if (!accountId) return false;
  if (!getTabSession()?.owner_private_key_b58) return false;

  const result = await linkStewardAccountWithActiveKeys(accountId);
  stripStewardAccountUrlParam();
  return result.ok;
}

/**
 * Idempotent: run link-from-URL once per page load when hub/keys context is ready.
 */
export function initStewardSessionClient() {
  if (sessionClientInit || typeof window === "undefined") return;
  sessionClientInit = true;

  const attempt = () => {
    void tryCompleteStewardAccountLinkFromUrl();
  };

  attempt();
  window.addEventListener("hc-device-hub-changed", attempt);
}
