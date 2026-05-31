# Founding LIVE OBJECT purse — operator setup

**Status:** Preview shipped on site · checkout gated until Printify + Shopify wiring  
**Product id:** `founding_purse_v1` · **Print template:** `hc-founding-purse-v1`  
**Parent:** [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) · [`MERCH_PRODUCT_COPY.md`](MERCH_PRODUCT_COPY.md)

---

## What shipped in repo

| Surface | Path / module |
|---------|----------------|
| Store row | `worker/src/store/store-catalog.ts` — published in **Make it yours** (preview) |
| Mockups | `site/images/merch/founding-purse/*.png` · manifest `site/data/founding-purse-mockups.json` |
| Customizer | `/shop/customize/?product=founding_purse_v1` · `site/js/shop-founding-purse-mockups-core.mjs` |
| Config skeleton | `site/data/shop-config.json` — no `checkout_url` yet |
| Merch ref | `customize_purse` → thanks `?hc_ref=customize_purse` |

**Preview behavior:** Static product mockups only — **Front styled** default, **Back**, on-model, and flat-lay angles. No QR composited on bag photos; unique QR is reserved at checkout (see [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) Beat 3 — belonging register without faking ink on mock photos).

---

## Shopify does not sell purses for you

Shopify is the **cash register** (cart, tax, payment). You create the product listing and variant. Printify (or another factory) fulfills.

Shopify merchants sell handbags/purses every day — you list your SKU, set price, and paste the **cart permalink** into `shop-config.json` like the Glitch hoodie.

---

## Step 1 — Printify (factory)

1. **Find a blank** close to the founding satchel (structured dome bag, front print panel). Search Printify catalog for **tote**, **handbag**, or **crossbody** with a **flat front print area** (DTF/DTG preferred — QR scans poorly through embroidery).
2. Run blueprint lookup (replace `{id}` with Printify blueprint id):
   ```bash
   PRINTIFY_API_TOKEN=… npm run printify:lookup-blueprint -- {id}
   ```
3. Create a **reference product** in your Printify shop with the founding art + sample QR positioned on the front panel. Note:
   - `blueprint_id`
   - `print_provider_id`
   - `variant_id` (black / one size)
   - `placeholder` position (likely `front`)
   - image `x`, `y`, `scale`, `angle` for the LIVE OBJECT QR rectangle
4. Set Worker secrets (mirror Glitch hoodie pattern):
   ```bash
   wrangler secret put PERSONALIZE_FOUNDING_PURSE_PRINTIFY_PRODUCT_ID
   wrangler secret put PERSONALIZE_FOUNDING_PURSE_PRINTIFY_VARIANT_ID
   wrangler secret put PERSONALIZE_FOUNDING_PURSE_PRINTIFY_SHIPPING_METHOD
   wrangler secret put PERSONALIZE_FOUNDING_PURSE_PRINTIFY_BLUEPRINT_ID
   wrangler secret put PERSONALIZE_FOUNDING_PURSE_PRINTIFY_PRINT_PROVIDER_ID
   wrangler secret put PERSONALIZE_FOUNDING_PURSE_PRINTIFY_PLACEHOLDER
   wrangler secret put PERSONALIZE_FOUNDING_PURSE_PRINTIFY_IMAGE_X
   wrangler secret put PERSONALIZE_FOUNDING_PURSE_PRINTIFY_IMAGE_Y
   wrangler secret put PERSONALIZE_FOUNDING_PURSE_PRINTIFY_IMAGE_SCALE
   wrangler secret put PERSONALIZE_FOUNDING_PURSE_PRINTIFY_IMAGE_ANGLE
   ```
5. **Physical QA** before opening checkout — [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md) § A (scan at arm's length + indoor light). Bags curve; QR on front panel must still scan.

**Optional:** When Printify mockups exist, export to `site/data/founding-purse-mockups.json` (same pattern as `npm run printify:export-glitch-mockups` for hoodies).

---

## Step 2 — Shopify (cash register)

1. In **Shopify Admin → Products**, create **Founding LIVE OBJECT purse** (or publish from Printify).
2. Add at least one variant (e.g. Black / One size).
3. Copy **cart permalink**: `https://humanity-llc.myshopify.com/cart/{VARIANT_ID}:1`
4. Ensure **orders/paid** webhook points at `https://humanity.llc/v1/webhooks/shopify/orders` (already required for Glitch hoodie).
5. Optional: set product image to `site/images/merch/founding-purse/front-styled.png`.

---

## Step 3 — humanity.llc config (storefront)

Edit `site/data/shop-config.json`:

```json
{
  "product_id": "founding_purse_v1",
  "print_template_id": "hc-founding-purse-v1",
  "print_variant_id": "black-onesize",
  "title": "Founding LIVE OBJECT purse",
  "preview": "founding_purse",
  "price_display": "$XXX + shipping",
  "shopify_variant_id": "YOUR_VARIANT_ID",
  "checkout_url": "https://humanity-llc.myshopify.com/cart/YOUR_VARIANT_ID:1"
}
```

**Checkout gating options:**

| Mode | Config |
|------|--------|
| Preview only (current) | Leave `checkout_url` empty · `personalize.checkout_product_id` stays `glitch_hoodie_v1` |
| Purse checkout live | Set `checkout_url` + either switch `checkout_product_id` to `founding_purse_v1` **or** allow multi-SKU checkout (future) |

Deploy Pages:

```bash
npm run pages:deploy
curl -sS https://humanity.llc/data/shop-config.json | jq '.personalize.products[] | select(.product_id=="founding_purse_v1")'
```

---

## Step 4 — Worker (middleware)

1. Wire `FOUNDING_PURSE_TEMPLATE_ID` in `printify-template-config.ts` and `printify-artwork-config.ts` (same pattern as Glitch hoodie env keys above).
2. `npm run worker:deploy`
3. Prove one test order: customize → artifact intent → Shopify pay → webhook → mint → Printify submit.

---

## Step 5 — Enable checkout

1. Complete physical ink QA on a real sample.
2. Set `personalize.checkout_product_id` to `founding_purse_v1` **or** keep Glitch as default and enable purse when ready to take purse orders.
3. `npm run merch-funnel:verify-config -- --require-checkout`
4. `SITE_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:step2 -- --verify --strict`

---

## Verify customizer locally

```bash
npm run worker:migrate:local && npm run worker:dev   # terminal 1
npm run pages:dev                                     # terminal 2
```

Open: `http://localhost:8788/shop/customize/?product=founding_purse_v1`

- Product picker shows **Founding LIVE OBJECT purse**
- Default tab: **Front styled** · then **Back**, On model, Flat lay
- Mock photos only — no QR overlay on the bag image

---

## Copy / positioning

- **Not** a separate “women's line” — founding carry object from the 2023 prototype.
- Same honesty register as Glitch: commerce ≠ verify, bearer ≠ owner, unique QR per unit.
