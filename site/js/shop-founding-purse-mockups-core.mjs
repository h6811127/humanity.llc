/**
 * Founding LIVE OBJECT purse mockups for /shop/customize/.
 * Data: site/data/founding-purse-mockups.json
 */

export const FOUNDING_PURSE_MOCKUPS_URL = "/data/founding-purse-mockups.json";

export const FOUNDING_PURSE_DEFAULT_MOCKUP_VIEW = "front";

export const FOUNDING_PURSE_MOCKUP_VIEW_ORDER = ["front", "styled", "on-person", "context"];

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareFoundingPurseMockupViewOrder(a, b) {
  const ai = FOUNDING_PURSE_MOCKUP_VIEW_ORDER.indexOf(a);
  const bi = FOUNDING_PURSE_MOCKUP_VIEW_ORDER.indexOf(b);
  const ar = ai === -1 ? FOUNDING_PURSE_MOCKUP_VIEW_ORDER.length : ai;
  const br = bi === -1 ? FOUNDING_PURSE_MOCKUP_VIEW_ORDER.length : bi;
  return ar - br;
}

/**
 * @typedef {{
 *   view_id: string;
 *   label: string;
 *   src: string;
 *   composites_qr?: boolean;
 *   is_default?: boolean;
 * }} FoundingPurseMockupEntry
 */

/**
 * @param {unknown} payload
 * @returns {FoundingPurseMockupEntry[]}
 */
export function listFoundingPurseMockups(payload) {
  const mockups = payload?.mockups;
  if (!Array.isArray(mockups)) return [];
  return mockups
    .filter((entry) => entry && typeof entry.src === "string" && entry.src.trim())
    .map((entry) => ({
      view_id: String(entry.view_id ?? entry.label ?? "view").trim(),
      label: typeof entry.label === "string" ? entry.label.trim() : "View",
      src: String(entry.src).trim(),
      composites_qr: entry.composites_qr === true,
      is_default: entry.is_default === true,
    }))
    .sort((a, b) => compareFoundingPurseMockupViewOrder(a.view_id, b.view_id));
}

/**
 * @param {FoundingPurseMockupEntry[]} mockups
 * @param {string} viewId
 */
export function findFoundingPurseMockupByView(mockups, viewId) {
  const id = typeof viewId === "string" ? viewId.trim() : "";
  return mockups.find((entry) => entry.view_id === id) ?? null;
}

/**
 * @param {FoundingPurseMockupEntry[]} mockups
 * @param {string} [preferredView]
 */
export function resolveDefaultFoundingPurseMockup(mockups, preferredView = FOUNDING_PURSE_DEFAULT_MOCKUP_VIEW) {
  if (!mockups.length) return null;
  return (
    findFoundingPurseMockupByView(mockups, preferredView) ??
    mockups.find((entry) => entry.is_default) ??
    mockups[0] ??
    null
  );
}

/**
 * @param {string} [url]
 */
export async function fetchFoundingPurseMockups(url = FOUNDING_PURSE_MOCKUPS_URL) {
  const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error("Founding purse mockups unavailable.");
  return res.json();
}
