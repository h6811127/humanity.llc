/**
 * Live tab scan-detail disclosure: onboarding expand + summary copy.
 * @see docs/CREATED_TASKS_TAB_REDESIGN.md § Inline edit: what scanners see
 */

export const SCAN_DETAILS_ONBOARDING_STORAGE_KEY = "hc_created_scan_details_onboarding";

/**
 * @param {Storage | null | undefined} storage
 * @param {string | null | undefined} profileId
 */
export function readScanDetailsOnboardingDone(storage, profileId) {
  if (!storage || !profileId) return false;
  try {
    const all = JSON.parse(storage.getItem(SCAN_DETAILS_ONBOARDING_STORAGE_KEY) || "{}");
    return !!all[profileId];
  } catch {
    return false;
  }
}

/**
 * @param {Storage | null | undefined} storage
 * @param {string | null | undefined} profileId
 */
export function writeScanDetailsOnboardingDone(storage, profileId) {
  if (!storage || !profileId) return;
  try {
    const all = JSON.parse(storage.getItem(SCAN_DETAILS_ONBOARDING_STORAGE_KEY) || "{}");
    all[profileId] = true;
    storage.setItem(SCAN_DETAILS_ONBOARDING_STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * @param {unknown} streams
 * @returns {number}
 */
export function countFilledObjectStreams(streams) {
  if (!Array.isArray(streams)) return 0;
  let n = 0;
  for (const item of streams) {
    if (!item || typeof item !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (item);
    const label = String(row.label ?? "").trim();
    const value = String(row.value ?? "").trim();
    if (label && value) n += 1;
  }
  return n;
}

/**
 * @param {Array<{ label: string; value: string }>} rows
 */
export function countFilledStreamFormRows(rows) {
  let n = 0;
  for (const row of rows) {
    if (row.label.trim() && row.value.trim()) n += 1;
  }
  return n;
}

/**
 * @param {{
 *   onboardingDone: boolean;
 *   filledStreamCount: number;
 * }} input
 */
export function shouldOpenScanDetailsDisclosure(input) {
  if (input.filledStreamCount > 0) return true;
  return !input.onboardingDone;
}

/**
 * @param {{
 *   filledCount: number;
 *   dirty: boolean;
 * }} input
 * @returns {string}
 */
export function formatScanDetailsSummaryMeta(input) {
  const parts = [];
  if (input.filledCount > 0) {
    parts.push(
      input.filledCount === 1 ? "1 line set" : `${input.filledCount} lines set`
    );
  } else {
    parts.push("Optional");
  }
  if (input.dirty) parts.push("unsaved");
  return parts.join(" · ");
}
