# Founding signal sticker — operator setup

**Status:** Preview shipped on site · checkout gated until Shopify + Printify wiring  
**Product id:** `tier0_founding_sticker_v1` · **Print template:** `hc-tier0-sticker-batch-v1`  
**Parent:** [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md) · [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) · [`MERCH_PRODUCT_COPY.md`](MERCH_PRODUCT_COPY.md)

---

## What shipped in repo

| Surface | Path / module |
|---------|----------------|
| Shop hub gallery | `site/shop/index.html` — `#shop-sticker-gallery` |
| Drop PDP | `site/shop/founding/index.html` — preview grid with Beat 1 captions |
| Mockups | `site/images/merch/founding-sticker/*` · manifest `site/data/founding-sticker-mockups.json` |
| Core helpers | `site/js/shop-founding-sticker-mockups-core.mjs` |
| Config skeleton | `site/data/shop-config.json` — no `checkout_url` yet |

**Preview behavior:** Static kiss-cut mockups only — **Kiss cut** (flat art), **On laptop**, **On gift**. Batch campaign QR sample art; not a personal card. See [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) § Beat 1 — physical recognition (belonging register, honest about shared batch QR).

---

## Replace mockup assets

1. Export or photograph final kiss-cut art and context shots.
2. Drop files into `site/images/merch/founding-sticker/` using the same filenames:
   - `flat-kiss-cut.png` — flat product shot (portrait, red border + QR)
   - `on-laptop.jpg` — arm-length recognition context
   - `on-gift.jpg` — giftable context
3. Update `site/data/founding-sticker-mockups.json` if filenames or view order change.
4. Keep alt text and figcaptions aligned with [`shop-founding-sticker-mockups-core.mjs`](../site/js/shop-founding-sticker-mockups-core.mjs) `foundingStickerMockupViewCaption()`.
5. Bump `styles.css?v=` on `/shop/` and `/shop/founding/` if layout CSS changes.
6. Run `npm run worker:test -- worker/tests/shop-founding-sticker-mockups-core.test.ts`.

---

## Enable checkout

Follow [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md) § Enable checkout — set `tier0.checkout_url` and `checkout_open: true` in `shop-config.json` after launch gates pass.

---

## Related

| Topic | Doc |
|-------|-----|
| Tier 0 strategy | [`MERCH_LED_V1.md`](MERCH_LED_V1.md) |
| Batch QR policy | [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) |
| Founding purse gallery (same pattern) | [`MERCH_FOUNDING_PURSE_SETUP.md`](MERCH_FOUNDING_PURSE_SETUP.md) |
