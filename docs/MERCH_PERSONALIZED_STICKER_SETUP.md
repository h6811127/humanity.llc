# Personalized sticker — operator setup

**Status:** Printify mock art + customize gallery shipped in repo · checkout gated until Shopify + Printify wiring  
**Product id:** `sticker_personalized_v1` · **Print template:** `hc-sticker-square-v1`  
**Parent:** [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) · [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) · [`QR_BRANDING.md`](QR_BRANDING.md)

---

## What shipped in repo

| Surface | Path / module |
|---------|----------------|
| Customize gallery | `/shop/customize/?product=sticker_personalized_v1` — Printify mock photos + planned QR below |
| Mock art generator | `npm run print:sticker-printify-pngs` → `site/images/merch/printify-art/sticker-live-object-updates-from-phone.png` |
| Mockup manifest | `site/data/sticker-mockups.json` · `site/js/shop-sticker-mockups-core.mjs` |
| Printify export | `npm run printify:export-sticker-mockups` (after upload + mock regeneration) |

**Preview behavior:** Kiss-cut mockups show sample LIVE OBJECT art with **Updates from your phone** on the ink. The buyer’s unique planned QR renders in a separate block below (same pattern as Glitch hoodie).

---

## Operator workflow

1. **Generate flat print art** (sample QR for Printify product setup):

   ```bash
   npm run print:sticker-printify-pngs
   ```

2. **Upload** `site/images/merch/printify-art/sticker-live-object-updates-from-phone.png` to the Printify sticker product (2×2 in kiss cut).

3. **Regenerate mockups** in Printify (flat, on-laptop, on-gift angles).

4. **Export mock URLs** into the site manifest:

   ```bash
   PRINTIFY_STICKER_PRODUCT_ID=<id> npm run printify:export-sticker-mockups
   ```

   Preserves `local_src` on re-runs. Set `PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID` when filtering variant-specific angles.

5. **Verify customize** — open `/shop/customize/?product=sticker_personalized_v1` with a card session; kiss-cut gallery + planned QR below.

6. Run `npm run worker:test -- worker/tests/shop-sticker-mockups-core.test.ts worker/tests/shop-sticker-printify-mock-core.test.ts`.

---

## Replace mockup assets

1. Re-run `npm run print:sticker-printify-pngs` when QR branding changes.
2. Re-upload to Printify and export with `printify:export-sticker-mockups`.
3. Optionally add self-hosted context shots under `site/images/merch/sticker-mockups/` and set `local_src` on manifest rows (flat fallback stays `printify-art/sticker-live-object-updates-from-phone.png`).
4. Bump `styles.css?v=` on `/shop/customize/` if layout CSS changes.

---

## Enable checkout

Follow [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) — set `PERSONALIZE_STICKER_PRINTIFY_*` in Worker env, Shopify variant + checkout URL in `shop-config.json`, then `personalize.checkout_open: true`.

---

## Related

| Topic | Doc |
|-------|-----|
| Tier 0 founding sticker (batch QR) | [`MERCH_FOUNDING_STICKER_SETUP.md`](MERCH_FOUNDING_STICKER_SETUP.md) |
| Print sticker fulfillment sheet | [`QR_BRANDING.md`](QR_BRANDING.md) § Print sticker template |
| Physical scan QA | [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md) |
