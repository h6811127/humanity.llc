/**
 * Merch PDP / customizer honesty copy — canonical text in docs/MERCH_PRODUCT_COPY.md
 */
import { TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID, GLITCH_HOODIE_STORE_PRODUCT_ID, FOUNDING_PURSE_STORE_PRODUCT_ID } from "./shop-store-catalog-ids.mjs";

/** Product ids mirrored from worker store-catalog (avoid import churn). */
export const HOODIE_LIVE_OBJECT_STORE_PRODUCT_ID = "hoodie_live_object_v1";
export const STICKER_PERSONALIZED_STORE_PRODUCT_ID = "sticker_personalized_v1";
export { FOUNDING_PURSE_STORE_PRODUCT_ID };

/** @typedef {{ title: string, lines: string[] }} ProductHonestyBlock */
/** @typedef {{ title: string, sub: string }} CustomizeHonestyRow */

export const TIER1_HONESTY_SECTION_TITLE = "Your pen, not the page";

/** @type {CustomizeHonestyRow[]} */
export const SHOP_CUSTOMIZE_HONESTY_ROWS_GLITCH = [
  {
    title: "Live",
    sub: "After fulfillment, your unit’s QR resolves to your card. Update status from /created/ (or hub → Update status) — same ink, new meaning.",
  },
  {
    title: "Fossil",
    sub: "If you lose signing access without recovery or backup, you may not be able to edit again; scans can still show the last thing you published until you revoke the item.",
  },
  {
    title: "Keys",
    sub: "Keys stay in your browser; save ownership on this device and set recovery before you rely on the shirt in public.",
  },
];

/** @type {CustomizeHonestyRow[]} */
export const SHOP_CUSTOMIZE_HONESTY_ROWS_LIVE_OBJECT = [
  {
    title: "Live",
    sub: "After fulfillment, each unit’s QR resolves to your card. Update status from /created/ (or hub → Update status) — same ink, new meaning.",
  },
  {
    title: "Fossil",
    sub: "If you lose signing access without recovery or backup, you may not be able to edit again; scans can still show the last thing you published until you revoke the item or disable the card with keys.",
  },
  {
    title: "Keys",
    sub: "Keys stay in your browser; save ownership on this device and set recovery before you rely on the shirt in public.",
  },
];

/** @type {CustomizeHonestyRow[]} */
export const SHOP_CUSTOMIZE_HONESTY_ROWS_DEFAULT = [
  {
    title: "Live",
    sub: "After fulfillment, your QR points at your card. Update what strangers read without reprinting.",
  },
  {
    title: "Fossil",
    sub: "Lose signing access without recovery and you may not edit again; the scan can keep showing the last line you published until you revoke the item.",
  },
  {
    title: "Keys",
    sub: "Control stays in your browser. Save ownership on this device and set recovery before you wear this in public.",
  },
];

/**
 * @param {CustomizeHonestyRow[]} rows
 * @param {string} [title]
 * @returns {ProductHonestyBlock}
 */
export function pdpHonestyBlockFromRows(rows, title = TIER1_HONESTY_SECTION_TITLE) {
  return {
    title,
    lines: rows.map((row) => `${row.title} — ${row.sub}`),
  };
}

/** @type {CustomizeHonestyRow[]} */
export const SHOP_CUSTOMIZE_HONESTY_ROWS_FOUNDING_PURSE = [
  {
    title: "Live",
    sub: "After fulfillment, your purse QR resolves to your card. Update status from /created/ (or hub → Update status). Same ink, new meaning.",
  },
  {
    title: "Fossil",
    sub: "If you lose signing access without recovery or backup, you may not be able to edit again; scans can still show the last thing you published until you revoke the item.",
  },
  {
    title: "Keys",
    sub: "Keys stay in your browser; save ownership on this device and set recovery before you carry this in public.",
  },
];

/** @type {CustomizeHeroCopy} */
export const SHOP_CUSTOMIZE_HERO_FOUNDING_PURSE = {
  eyebrow: "Next founding drop · preview",
  title: "Founding LIVE OBJECT purse",
  lead: "The 2023 prototype, carried forward. Fixed founding art on the front panel. Your unique QR, your live line.",
};

/** @type {Record<string, ProductHonestyBlock>} */
export const SHOP_PRODUCT_HONESTY_BLOCKS = {
  [GLITCH_HOODIE_STORE_PRODUCT_ID]: pdpHonestyBlockFromRows(SHOP_CUSTOMIZE_HONESTY_ROWS_GLITCH),
  [FOUNDING_PURSE_STORE_PRODUCT_ID]: pdpHonestyBlockFromRows(SHOP_CUSTOMIZE_HONESTY_ROWS_FOUNDING_PURSE),
  [HOODIE_LIVE_OBJECT_STORE_PRODUCT_ID]: pdpHonestyBlockFromRows(
    SHOP_CUSTOMIZE_HONESTY_ROWS_LIVE_OBJECT
  ),
  [TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID]: {
    title: "Superseded for launch",
    lines: [
      "Launch path — Glitch hoodie is Tier 1 personalized wear: fixed founding art, unique QR per buyer.",
      "Not this PDP — Shared-batch tier0_glitch_hoodie_v1 is deprecated; use /shop/customize/?product=glitch_hoodie_v1.",
      "Your own object — Each buyer holds keys and updates what strangers read from their phone — not a shared campaign scan.",
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
  sectionTitle: TIER1_HONESTY_SECTION_TITLE,
  lines: SHOP_CUSTOMIZE_HONESTY_ROWS_DEFAULT.map((row) => `${row.title} — ${row.sub}`),
};

export const SHOP_CUSTOMIZE_PROOF_PERSISTENCE =
  "Printed ink persists. I can revoke this item’s QR while I have signing access; if I lose keys without recovery, strangers may still read the last published scan until I revoke.";

/** @typedef {{ eyebrow: string, title: string, lead: string }} CustomizeHeroCopy */

/** @type {CustomizeHeroCopy} */
export const SHOP_CUSTOMIZE_HERO_DEFAULT = {
  eyebrow: "Tier 1 · personalize",
  title: "Customize your live object",
  lead: "Your unique QR on the garment. Change what strangers read from your phone; the ink stays the same.",
};

/** Founding-run chromatic glitch unit (red/blue QR modules on white card). */
export const GLITCH_PRINT_CHROMATIC_UNIT_EXAMPLE_SRC =
  "/assets/glitch-print-chromatic-artifact.png?v=3";

export const SHOP_GLITCH_PRINT_ARTIFACT_CALLOUT = {
  title: "Chromatic glitch units",
  lead:
    "Some founding hoodies arrive with a production artifact we still see on Printify runs: part of the QR modules print in blue or purple on fabric instead of red. We treat these as limited variance in the batch, not misprints to hide.",
  exampleSummary: "See example",
  caption:
    "Founding-run example. Scanning may be harder or impossible depending on camera and light. The ink is still yours; the glitch is the edition.",
  imageSrc: GLITCH_PRINT_CHROMATIC_UNIT_EXAMPLE_SRC,
  imageAlt:
    "LIVE OBJECT QR with chromatic glitch: red and blue modules on a white card with red border",
};

/** @type {CustomizeHeroCopy} */
export const SHOP_CUSTOMIZE_HERO_GLITCH = {
  eyebrow: "Founding drop · personalized",
  title: "Glitch LIVE QR hoodie",
  lead: "Founding Glitch art on your chest. Your unique QR, your live line.",
};

/**
 * @param {string | null | undefined} productId
 * @returns {CustomizeHeroCopy}
 */
export function customizeHeroForProduct(productId) {
  const id = typeof productId === "string" ? productId.trim() : "";
  if (id === GLITCH_HOODIE_STORE_PRODUCT_ID) return SHOP_CUSTOMIZE_HERO_GLITCH;
  if (id === FOUNDING_PURSE_STORE_PRODUCT_ID) return SHOP_CUSTOMIZE_HERO_FOUNDING_PURSE;
  return SHOP_CUSTOMIZE_HERO_DEFAULT;
}

/**
 * @param {string | null | undefined} productId
 * @returns {CustomizeHonestyRow[]}
 */
export function customizeHonestyRowsForProduct(productId) {
  const id = typeof productId === "string" ? productId.trim() : "";
  if (id === GLITCH_HOODIE_STORE_PRODUCT_ID) return SHOP_CUSTOMIZE_HONESTY_ROWS_GLITCH;
  if (id === FOUNDING_PURSE_STORE_PRODUCT_ID) return SHOP_CUSTOMIZE_HONESTY_ROWS_FOUNDING_PURSE;
  if (id === HOODIE_LIVE_OBJECT_STORE_PRODUCT_ID) return SHOP_CUSTOMIZE_HONESTY_ROWS_LIVE_OBJECT;
  return SHOP_CUSTOMIZE_HONESTY_ROWS_DEFAULT;
}

/** @typedef {{ eyebrow: string, title: string, lineHtml: string, meta: string }} Tier1ThanksCopy */

/** @type {Tier1ThanksCopy} */
export const TIER1_THANKS_COPY_DEFAULT = {
  eyebrow: "Tier 1 · thanks",
  title: "Same ink — you choose what it means",
  lineHtml:
    "Your personalized Live Object is in production. When it arrives, <strong>scan it before you wear it</strong>. The QR on the garment stays fixed; what strangers read updates when you change your signed public line from your phone.",
  meta: "Thanks for your personalized Live Object order. Update what scanners read from your phone — same ink, new meaning.",
};

/** @type {Tier1ThanksCopy} */
export const TIER1_THANKS_COPY_GLITCH = {
  eyebrow: "Founding drop · thanks",
  title: "Your Glitch ink ships — you hold the pen",
  lineHtml:
    "Thanks for backing the founding Glitch LIVE QR hoodie. When it arrives, <strong>scan your unique QR before you wear it</strong>. Fixed Glitch art on the garment; what strangers read updates when you change your signed line from your phone.",
  meta: "Thanks for your Glitch LIVE QR hoodie order. Update what scanners read from your phone — same ink, new meaning.",
};

/**
 * @param {string | null | undefined} merchRef
 * @returns {Tier1ThanksCopy}
 */
export function tier1ThanksCopyForMerchRef(merchRef) {
  const ref = typeof merchRef === "string" ? merchRef.trim().toLowerCase() : "";
  if (ref === "customize_glitch") return TIER1_THANKS_COPY_GLITCH;
  return TIER1_THANKS_COPY_DEFAULT;
}
