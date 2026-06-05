/**
 * Create → /created/ redirect handoff (sessionStorage, no URL change).
 * @see P2.2 redirect handoff clarity
 */

import { generalRootDisplayLabel } from "./create-flow-convergence-core.mjs";

export const CREATE_HANDOFF_SESSION_KEY = "hc_create_handoff_v1";

/** @typedef {"deploy_sign" | "deploy_relay" | "wear" | "season"} CreateHandoffKind */

/**
 * @param {CreateHandoffKind} kind
 * @param {Record<string, unknown> | null | undefined} entry
 */
export function buildCreateHandoffPayload(kind, entry) {
  return {
    kind,
    handle: generalRootDisplayLabel(entry),
    at: Date.now(),
  };
}

/**
 * @param {ReturnType<typeof buildCreateHandoffPayload>} payload
 */
export function writeCreateHandoff(payload) {
  try {
    sessionStorage.setItem(CREATE_HANDOFF_SESSION_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/**
 * @returns {ReturnType<typeof buildCreateHandoffPayload> | null}
 */
export function readCreateHandoff() {
  try {
    const raw = sessionStorage.getItem(CREATE_HANDOFF_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const kind = parsed.kind;
    if (
      kind !== "deploy_sign" &&
      kind !== "deploy_relay" &&
      kind !== "wear" &&
      kind !== "season"
    ) {
      return null;
    }
    return {
      kind,
      handle: typeof parsed.handle === "string" ? parsed.handle : "",
      at: typeof parsed.at === "number" ? parsed.at : 0,
    };
  } catch {
    return null;
  }
}

export function clearCreateHandoff() {
  try {
    sessionStorage.removeItem(CREATE_HANDOFF_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string | null | undefined} raw
 */
function normalizeHandoffHandle(raw) {
  const handle = String(raw ?? "").trim().replace(/^@/, "");
  return handle || null;
}

/**
 * Ignore stale create handoffs when opening a different saved account.
 * @param {ReturnType<typeof readCreateHandoff>} handoff
 * @param {Record<string, unknown> | null | undefined} session
 */
export function createHandoffAppliesToSession(handoff, session) {
  if (!handoff) return false;
  const sessionHandle = normalizeHandoffHandle(
    typeof session?.handle === "string" ? session.handle : ""
  );
  const handoffHandle = normalizeHandoffHandle(handoff.handle);
  if (!sessionHandle || !handoffHandle) return true;
  return sessionHandle === handoffHandle;
}

/**
 * @param {CreateHandoffKind} kind
 * @param {string} handle
 */
export function createHandoffDetailLine(kind, handle) {
  const onAccount = handle ? ` on ${handle}` : "";
  if (kind === "deploy_sign") {
    return `We'll open your existing account${onAccount} so you can add your sign there.`;
  }
  if (kind === "deploy_relay") {
    return `We'll open your existing account${onAccount} so you can add your return tag there.`;
  }
  if (kind === "wear") {
    return `We'll open your existing account${onAccount} so you can continue to your wearable QR.`;
  }
  return `We'll open your existing account${onAccount} so you can continue season setup.`;
}

export const CREATE_HANDOFF_BANNER_TITLE = "You're already set up on this device.";

/**
 * @param {Record<string, unknown> | null | undefined} entry
 */
export function redirectOpenStatusForDeploy(template, entry) {
  const handle = entry ? generalRootDisplayLabel(entry) : "";
  if (template === "lost_item_relay") {
    return handle
      ? `Opening ${handle} to add your return tag…`
      : "Opening your account to add your return tag…";
  }
  return handle ? `Opening ${handle} to add your sign…` : "Opening your account to add your sign…";
}

/**
 * @param {Record<string, unknown> | null | undefined} entry
 */
export function redirectOpenStatusForWear(entry) {
  const handle = entry ? generalRootDisplayLabel(entry) : "";
  return handle
    ? `Opening ${handle} for your wearable QR…`
    : "Opening your account for your wearable QR…";
}

/**
 * @param {Record<string, unknown> | null | undefined} entry
 */
export function redirectOpenStatusForSeason(entry) {
  const handle = entry ? generalRootDisplayLabel(entry) : "";
  return handle ? `Opening ${handle} for season setup…` : "Opening your account for season setup…";
}
