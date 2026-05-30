/**
 * Merch PDP / customizer honesty copy — canonical text in docs/MERCH_PRODUCT_COPY.md
 */
import { TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID } from "./shop-store-catalog-ids.mjs";

/** Product ids mirrored from worker store-catalog (avoid import churn). */
export const HOODIE_LIVE_OBJECT_STORE_PRODUCT_ID = "hoodie_live_object_v1";
export const STICKER_PERSONALIZED_STORE_PRODUCT_ID = "sticker_personalized_v1";

/** @typedef {{ title: string, lines: string[] }} ProductHonestyBlock */

/** @type {Record<string, ProductHonestyBlock>} */
export const SHOP_PRODUCT_HONESTY_BLOCKS = {
  [TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID]: {
    title: "How the scan behaves",
    lines: [
      "Live — The QR always opens humanity.llc; campaign stewards can change what strangers read without reprinting this batch.",
      "Not yours — Buying does not give you signing keys or a vouch. Holding the hoodie does not prove you control the card behind the scan.",
      "Your own object — Want your QR on a garment? Use the Live Object hoodie or sticker — each unit is unique to one card.",
    ],
  },
  [HOODIE_LIVE_OBJECT_STORE_PRODUCT_ID]: {
    title: "How the scan behaves",
    lines: [
      "Live — After fulfillment, your unit’s QR points at your card. Update what strangers read from your phone; the ink stays the same.",
      "Fossil — Lose signing access without recovery and you may not edit again; scans can still show the last line you published until you revoke the item.",
      "Keys — Control stays in your browser. Save ownership on this device and set recovery before you wear this in public.",
    ],
  },
  [STICKER_PERSONALIZED_STORE_PRODUCT_ID]: {
    title: "How the scan behaves",
    lines: [
      "Live — Each sticker gets its own QR tied to your card. Change what strangers read without reprinting.",
      "Fossil — Lose keys without recovery and the scan can become a fixed record of your last published state.",
      "Keys — Same as the hoodie: your card, your backup, not platform custody.",
    ],
  },
};

/**
 * @param {string | null | undefined} productId
 * @returns {ProductHonestyBlock | null}
 */
export function productHonestyBlockForId(productId) {
  const id = typeof productId === "string" ? productId.trim() : "";
  if (!id) return null;
  return SHOP_PRODUCT_HONESTY_BLOCKS[id] ?? null;
}

export const SHOP_CUSTOMIZE_HONESTY = {
  sectionTitle: "Your pen, not the page",
  lines: [
    "Live — Your QR on the garment. After checkout and fulfillment, update what strangers read from your phone without reprinting.",
    "Fossil — Lose signing access without recovery and you may not be able to edit again; the scan can keep showing the last thing you published.",
    "Keys — Keys stay in this browser. Save ownership on this device and set a recovery path before the shirt matters in public.",
  ],
};

export const SHOP_CUSTOMIZE_PROOF_PERSISTENCE =
  "Printed ink persists. I can revoke this item’s QR while I have signing access; if I lose keys without recovery, strangers may still read the last published scan until I revoke.";
