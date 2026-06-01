/**
 * Tier 1 personalized sticker Printify mockups — /shop/customize/.
 * Data: site/data/sticker-mockups.json (npm run printify:export-sticker-mockups)
 */

import { STICKER_PRINTIFY_MOCK_ART_PATH } from "./shop-sticker-printify-mock-core.mjs";

export const STICKER_MOCKUPS_URL = "/data/sticker-mockups.json";

export const STICKER_DEFAULT_MOCKUP_VIEW = "flat";

export const STICKER_MOCKUP_VIEW_ORDER = ["flat", "on-laptop", "on-gift"];

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareStickerMockupViewOrder(a, b) {
  const ai = STICKER_MOCKUP_VIEW_ORDER.indexOf(a);
  const bi = STICKER_MOCKUP_VIEW_ORDER.indexOf(b);
  const ar = ai === -1 ? STICKER_MOCKUP_VIEW_ORDER.length : ai;
  const br = bi === -1 ? STICKER_MOCKUP_VIEW_ORDER.length : bi;
  return ar - br;
}

/**
 * @typedef {{
 *   view_id: string;
 *   label: string;
 *   src: string;
 *   local_src?: string;
 *   is_default?: boolean;
 * }} StickerMockupEntry
 */

/**
 * @param {unknown} payload
 * @returns {StickerMockupEntry[]}
 */
export function listStickerMockups(payload) {
  const mockups = payload?.mockups;
  if (!Array.isArray(mockups)) return [];
  return mockups
    .filter((entry) => entry && (typeof entry.src === "string" || typeof entry.local_src === "string"))
    .map((entry) => ({
      view_id: String(entry.view_id ?? entry.label ?? "view").trim(),
      label: typeof entry.label === "string" ? entry.label.trim() : "View",
      src: typeof entry.src === "string" ? entry.src.trim() : "",
      local_src:
        typeof entry.local_src === "string" && entry.local_src.trim()
          ? entry.local_src.trim()
          : undefined,
      is_default: entry.is_default === true,
    }))
    .filter((entry) => resolveStickerMockupPhotoSrc(entry))
    .sort((a, b) => compareStickerMockupViewOrder(a.view_id, b.view_id));
}

/**
 * @param {StickerMockupEntry | null | undefined} entry
 * @returns {string}
 */
export function resolveStickerMockupPhotoSrc(entry) {
  const local = entry?.local_src?.trim();
  if (local) return local;
  return entry?.src?.trim() ?? "";
}

/**
 * @param {unknown} payload
 * @returns {boolean}
 */
export function stickerHasPrintifyMockups(payload) {
  return listStickerMockups(payload).length > 0;
}

/**
 * @param {StickerMockupEntry[]} mockups
 * @param {string} viewId
 */
export function findStickerMockupByView(mockups, viewId) {
  const id = typeof viewId === "string" ? viewId.trim() : "";
  return mockups.find((entry) => entry.view_id === id) ?? null;
}

/**
 * @param {StickerMockupEntry[]} mockups
 * @param {string} [preferredView]
 */
export function resolveDefaultStickerMockup(mockups, preferredView = STICKER_DEFAULT_MOCKUP_VIEW) {
  if (!mockups.length) return null;
  return (
    findStickerMockupByView(mockups, preferredView) ??
    mockups.find((entry) => entry.is_default) ??
    mockups[0] ??
    null
  );
}

/**
 * @param {string} [url]
 */
export async function fetchStickerMockups(url = STICKER_MOCKUPS_URL) {
  const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error("Sticker mockups unavailable.");
  return res.json();
}

/**
 * @param {StickerMockupEntry | null | undefined} entry
 * @returns {string}
 */
export function stickerMockupViewCaption(entry) {
  if (entry?.view_id === "flat") {
    return "Kiss cut — sample LIVE OBJECT art with Updates from your phone (not your unique code).";
  }
  if (entry?.view_id === "on-laptop") {
    return "Arm-length recognition — sample art only.";
  }
  if (entry?.view_id === "on-gift") {
    return "Giftable context — sample art only.";
  }
  return "Sample sticker mockup — fixed art, not your unique code.";
}

/** Fallback flat art when manifest has no rows yet. */
export function stickerFallbackFlatMockupEntry() {
  return {
    view_id: STICKER_DEFAULT_MOCKUP_VIEW,
    label: "Kiss cut",
    src: "",
    local_src: STICKER_PRINTIFY_MOCK_ART_PATH,
    is_default: true,
  };
}
