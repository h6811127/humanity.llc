/**
 * Setup wizard hash → step index (pure).
 * @see docs/CARD_WORKSPACE_UX.md · docs/LANDING_PROGRESS_STRIP.md
 */

export const SETUP_STEP_IDS = ["save", "qr", "test", "protect", "done"];

/** @type {Record<string, number>} */
export const SETUP_HASH_TO_INDEX = {
  setup: 0,
  "setup-qr": 1,
  "setup-test": 2,
  "setup-protect": 3,
  "setup-done": 4,
};

/**
 * @param {string} [hash] location.hash or bare key
 * @returns {number | null}
 */
export function setupStepIndexFromHash(hash = "") {
  const key = String(hash).replace(/^#/, "").trim();
  if (!key) return null;
  const idx = SETUP_HASH_TO_INDEX[key];
  return typeof idx === "number" ? idx : null;
}
