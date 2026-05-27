import { inferPilotTemplate } from "./manifesto-display.mjs";

/**
 * Phase A: tuck generic manifesto update until owner has revoked once in-session.
 * Status plate and lost-item pilots need live line edits before revoke field tests.
 * @see docs/PHASE_A_STRANGER_PATH_PRIORITIES.md
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
 * @param {string | null | undefined} profileId
 * @param {Record<string, unknown> | null | undefined} session
 */
export function syncUpdateStatusTaskGate(profileId, session = null) {
  const scannersSee = document.getElementById("created-live-scanners-see");
  const hint = document.getElementById("created-scanners-see-gate-hint");
  const unlocked = hasFirstRevokeDone(profileId) || isPilotUpdateUnlocked(session);
  if (scannersSee) scannersSee.hidden = !unlocked;
  if (hint) hint.hidden = unlocked;
}
