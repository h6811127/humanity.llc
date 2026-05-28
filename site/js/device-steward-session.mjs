/**
 * Browser steward session — sign steward_account_link_v1 and POST session (E2).
 * @see docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § E2
 * @see docs/STEWARD_DEVICE_ROADMAP.md § Current engineering steps
 */
import { activateWalletEntry, getTabSession } from "./device-keys.mjs";
import { loadWallet } from "./device-wallet.mjs";
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
  STEWARD_PENDING_ACCOUNT_STORAGE_KEY,
  buildStewardAccountLinkUnsigned,
  isValidStewardAccountId,
  parseStewardAccountIdFromUrl,
  resolveStewardAccountLinkTarget,
  stewardAccountLinkTimestamps,
} from "./device-steward-session-core.mjs";

export {
  STEWARD_ACCOUNT_URL_PARAM,
  isValidStewardAccountId,
  parseStewardAccountIdFromUrl,
} from "./device-steward-session-core.mjs";

let sessionClientInit = false;

/**
 * @returns {string | null}
 */
export function readPendingStewardAccountId() {
  try {
    const raw = sessionStorage.getItem(STEWARD_PENDING_ACCOUNT_STORAGE_KEY);
    if (!raw) return null;
    return isValidStewardAccountId(raw) ? raw.trim() : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} accountId
 */
export function writePendingStewardAccountId(accountId) {
  if (!isValidStewardAccountId(accountId)) return;
  try {
    sessionStorage.setItem(STEWARD_PENDING_ACCOUNT_STORAGE_KEY, accountId.trim());
  } catch {
    /* ignore */
  }
}

export function clearPendingStewardAccountId() {
  try {
    sessionStorage.removeItem(STEWARD_PENDING_ACCOUNT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Persist checkout return account id (survives reload until link succeeds).
 *
 * @returns {string | null}
 */
export function captureStewardAccountIdFromUrl() {
  if (typeof window === "undefined") return null;
  const accountId = parseStewardAccountIdFromUrl(location.search);
  if (accountId) writePendingStewardAccountId(accountId);
  return accountId;
}

/**
 * Stripe success_url may include profile_id — load matching wallet keys when saved.
 *
 * @returns {boolean}
 */
export function tryActivateWalletForBillingReturn() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(location.search);
  if (!params.has(STEWARD_ACCOUNT_URL_PARAM) && !readPendingStewardAccountId()) {
    return false;
  }
  const profileId = params.get("profile_id")?.trim();
  if (!profileId) return false;

  const session = getTabSession();
  if (session?.profile_id === profileId && session?.owner_private_key_b58) {
    return true;
  }

  const entry = loadWallet().find((row) => row.profile_id === profileId);
  if (!entry?.owner_private_key_b58) return false;

  activateWalletEntry(entry);
  return true;
}

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
    clearPendingStewardAccountId();
    return false;
  }

  captureStewardAccountIdFromUrl();
  const accountId = resolveStewardAccountLinkTarget(
    parseStewardAccountIdFromUrl(location.search),
    readPendingStewardAccountId()
  );
  if (!accountId) return false;
  if (!getTabSession()?.owner_private_key_b58) return false;

  const result = await linkStewardAccountWithActiveKeys(accountId);
  if (result.ok) {
    stripStewardAccountUrlParam();
    clearPendingStewardAccountId();
    window.dispatchEvent(new Event("hc-steward-session-linked"));
  }
  return result.ok;
}

/**
 * Idempotent: run link-from-URL once per page load when hub/keys context is ready.
 */
export function initStewardSessionClient() {
  if (sessionClientInit || typeof window === "undefined") return;
  sessionClientInit = true;

  const attempt = () => {
    captureStewardAccountIdFromUrl();
    tryActivateWalletForBillingReturn();
    void tryCompleteStewardAccountLinkFromUrl();
  };

  attempt();
  window.addEventListener("hc-device-hub-changed", attempt);
}
