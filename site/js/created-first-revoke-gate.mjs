import { inferPilotTemplate } from "./manifesto-display.mjs";
import {
  hasActiveTier1MerchRef,
  hasTier1EphemeralOwner,
} from "./merch-funnel-core.mjs";

/**
 * Phase A: tuck generic manifesto update until owner has revoked once in-session.
 * Pilots and Tier 1 merch owners need live line edits before revoke field tests.
 * @see docs/PHASE_A_STRANGER_PATH_PRIORITIES.md
 * @see docs/EPHEMERAL_STATE_AND_MERCH.md
 */

const STORAGE_KEY = "hc_created_first_qr_revoke";
const PILOT_TEMPLATES_UNLOCKED_BEFORE_REVOKE = new Set([
  "status_plate",
  "lost_item_relay",
]);

/**
 * @param {string | null | undefined} profileId
 */
export function markFirstRevokeDone(profileId) {
  if (!profileId) return;
  try {
    const all = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    all[profileId] = true;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

/**
 * @param {string | null | undefined} profileId
 */
export function hasFirstRevokeDone(profileId) {
  if (!profileId) return false;
  try {
    const all = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    return all[profileId] === true;
  } catch {
    return false;
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function isPilotUpdateUnlocked(session) {
  const explicit = typeof session?.pilot_template === "string" ? session.pilot_template : "";
  if (PILOT_TEMPLATES_UNLOCKED_BEFORE_REVOKE.has(explicit)) return true;
  if (typeof session?.manifesto_line !== "string") return false;
  return PILOT_TEMPLATES_UNLOCKED_BEFORE_REVOKE.has(
    inferPilotTemplate(session.manifesto_line)
  );
}

/**
 * Tier 1 merch / live wear — same ink, new meaning without revoke-first gate.
 * @param {string | null | undefined} profileId
 * @param {Record<string, unknown> | null | undefined} session
 */
export function isEphemeralStateUpdateUnlocked(profileId, session = null) {
  return (
    isPilotUpdateUnlocked(session) ||
    hasActiveTier1MerchRef() ||
    hasTier1EphemeralOwner(profileId)
  );
}

/**
 * @param {string | null | undefined} profileId
 * @param {Record<string, unknown> | null | undefined} session
 */
export function isScannersSeeUnlocked(profileId, session = null) {
  return hasFirstRevokeDone(profileId) || isEphemeralStateUpdateUnlocked(profileId, session);
}

/**
 * @param {string | null | undefined} profileId
 * @param {Record<string, unknown> | null | undefined} session
 */
export function syncUpdateStatusTaskGate(profileId, session = null) {
  const scannersSee = document.getElementById("created-live-scanners-see");
  const hint = document.getElementById("created-scanners-see-gate-hint");
  const unlocked = isScannersSeeUnlocked(profileId, session);
  if (scannersSee) scannersSee.hidden = !unlocked;
  if (hint) hint.hidden = unlocked;
}
