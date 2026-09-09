/**
 * Landing “Try a live object” — company-hosted demo status plate pointer.
 * Read-only proof of the physical-internet primitive; no guest write path.
 * @see docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md § Front door
 */

export const LANDING_TRY_LIVE_OBJECT_DATA_URL = "/data/showcase-status-plate.json";

export const LANDING_TRY_LIVE_OBJECT_TITLE = "Try a live object";

export const LANDING_TRY_LIVE_OBJECT_LEAD =
  "Open a company demo plate — same scan shape as a sticker in the world. Read-only; no account.";

/**
 * @param {unknown} data
 * @returns {{
 *   scanUrl: string;
 *   label: string;
 *   profileId: string;
 *   qrId: string;
 * } | null}
 */
export function resolveLandingTryLiveObject(data) {
  if (!data || typeof data !== "object") return null;
  const row = /** @type {Record<string, unknown>} */ (data);
  const scanUrl = String(row.scan_url ?? "").trim();
  const profileId = String(row.profile_id ?? "").trim();
  if (!scanUrl || !profileId) return null;
  if (!/^https?:\/\//i.test(scanUrl) && !scanUrl.startsWith("/")) return null;
  return {
    scanUrl,
    label: String(row.label ?? "").trim(),
    profileId,
    qrId: String(row.qr_id ?? "").trim(),
  };
}

/**
 * Desktop pedagogy: show on-screen QR when fine pointer + wider viewport.
 * @param {{ matchMedia?: (query: string) => { matches: boolean } } | null | undefined} [win]
 */
export function shouldShowLandingTryLiveObjectQr(win = typeof window !== "undefined" ? window : null) {
  if (!win || typeof win.matchMedia !== "function") return false;
  try {
    return win.matchMedia("(pointer: fine) and (min-width: 720px)").matches;
  } catch {
    return false;
  }
}
