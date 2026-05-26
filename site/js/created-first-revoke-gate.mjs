/**
 * Phase A: tuck manifesto update until owner has revoked once in-session.
 * @see docs/PHASE_A_STRANGER_PATH_PRIORITIES.md
 */

const STORAGE_KEY = "hc_created_first_qr_revoke";

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
 * @param {string | null | undefined} profileId
 */
export function syncUpdateStatusTaskGate(profileId) {
  const scannersSee = document.getElementById("created-live-scanners-see");
  const hint = document.getElementById("created-scanners-see-gate-hint");
  const unlocked = hasFirstRevokeDone(profileId);
  if (scannersSee) scannersSee.hidden = !unlocked;
  if (hint) hint.hidden = unlocked;
}
