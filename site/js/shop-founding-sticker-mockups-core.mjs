/**
 * Tier 0 founding signal sticker mockups — shop hub + /shop/founding/ preview gallery.
 * Data: site/data/founding-sticker-mockups.json
 * @see docs/MERCH_VISUAL_CHOREOGRAPHY.md § Beat 1 — physical recognition
 * @see docs/SHOP_TIER0_IMPLEMENTATION.md
 */

export const FOUNDING_STICKER_MOCKUPS_URL = "/data/founding-sticker-mockups.json";

export const FOUNDING_STICKER_DEFAULT_MOCKUP_VIEW = "flat";

export const FOUNDING_STICKER_MOCKUP_VIEW_ORDER = ["flat", "on-laptop", "on-gift"];

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareFoundingStickerMockupViewOrder(a, b) {
  const ai = FOUNDING_STICKER_MOCKUP_VIEW_ORDER.indexOf(a);
  const bi = FOUNDING_STICKER_MOCKUP_VIEW_ORDER.indexOf(b);
  const ar = ai === -1 ? FOUNDING_STICKER_MOCKUP_VIEW_ORDER.length : ai;
  const br = bi === -1 ? FOUNDING_STICKER_MOCKUP_VIEW_ORDER.length : bi;
  return ar - br;
}

/**
 * @typedef {{
 *   view_id: string;
 *   label: string;
 *   src: string;
 *   is_default?: boolean;
 * }} FoundingStickerMockupEntry
 */

/**
 * @param {unknown} payload
 * @returns {FoundingStickerMockupEntry[]}
 */
export function listFoundingStickerMockups(payload) {
  const mockups = payload?.mockups;
  if (!Array.isArray(mockups)) return [];
  return mockups
    .filter((entry) => entry && typeof entry.src === "string" && entry.src.trim())
    .map((entry) => ({
      view_id: String(entry.view_id ?? entry.label ?? "view").trim(),
      label: typeof entry.label === "string" ? entry.label.trim() : "View",
      src: String(entry.src).trim(),
      is_default: entry.is_default === true,
    }))
    .sort((a, b) => compareFoundingStickerMockupViewOrder(a.view_id, b.view_id));
}

/**
 * @param {FoundingStickerMockupEntry[]} mockups
 * @param {string} viewId
 */
export function findFoundingStickerMockupByView(mockups, viewId) {
  const id = typeof viewId === "string" ? viewId.trim() : "";
  return mockups.find((entry) => entry.view_id === id) ?? null;
}

/**
 * @param {FoundingStickerMockupEntry[]} mockups
 * @param {string} [preferredView]
 */
export function resolveDefaultFoundingStickerMockup(
  mockups,
  preferredView = FOUNDING_STICKER_DEFAULT_MOCKUP_VIEW
) {
  if (!mockups.length) return null;
  return (
    findFoundingStickerMockupByView(mockups, preferredView) ??
    mockups.find((entry) => entry.is_default) ??
    mockups[0] ??
    null
  );
}

/**
 * @param {string} [url]
 */
export async function fetchFoundingStickerMockups(url = FOUNDING_STICKER_MOCKUPS_URL) {
  const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error("Founding sticker mockups unavailable.");
  return res.json();
}

/**
 * @param {FoundingStickerMockupEntry | null | undefined} entry
 * @returns {string}
 */
export function foundingStickerMockupViewCaption(entry) {
  if (entry?.view_id === "flat") {
    return "Kiss-cut vinyl — sample batch art (shared campaign QR, not a personal card).";
  }
  if (entry?.view_id === "on-laptop") {
    return "Arm-length recognition on everyday surfaces.";
  }
  if (entry?.view_id === "on-gift") {
    return "Giftable curiosity — ink stays fixed; scan shows live status.";
  }
  return "Sample batch sticker art — not proof of identity.";
}
