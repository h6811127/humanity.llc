# Shop  -  Tier 0 curiosity drop (implementation)

**Status:** Checkout handoff wired (config-driven) · set `shop-config.json` when Shopify product exists  
**Canonical strategy:** `docs/MERCH_LED_V1.md` Phase B, `docs/FOUNDING_DROP_BRIEF.md` Tier 0  
**Merch funnel MVP:** `docs/MERCH_FUNNEL_MVP.md` · `/shop/customize/` QR customizer  
**Headless commerce:** `docs/MERCH_HEADLESS_COMMERCE.md` — Printify = factory, Shopify = checkout, humanity.llc = storefront; dual product IDs  
**Merch QR policy:** `docs/MERCH_QR_LIFECYCLE_POLICY.md` (defer `checkout_open: true` until remaining policy gates pass; M5 passed 2026-05-27)  
**Copy:** `docs/LAUNCH_LANGUAGE_KIT.md` § Tier 0 · Sticker FAQ

---

## Three systems (not interchangeable)

| System | Role in v1 | This doc |
|--------|------------|----------|
| **humanity.llc** | Storefront UI, Tier 0 `/shop/`, Tier 1 `/shop/customize/` | Pages deploy + `shop-config.json` |
| **Shopify** | Payment, tax, refunds — cart permalinks only | § Enable checkout below |
| **Printify** | Manufacture + ship — **never** customer-facing | Worker env + `POST /v1/print/orders` |

Tier 0 uses Shopify variant + optional batch Printify mapping. **Tier 1 personalized** requires artifact intent from the customizer — see [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md). A hoodie “live on Shopify” from Printify publish is a **checkout SKU shell**, not the full personalized product until `/shop/customize/` + webhook path is wired.

---

## Shipped (site)

| Piece | Path |
|-------|------|
| Story-row drop page | `site/shop/index.html` |
| **QR customizer (Tier 1)** | `site/shop/customize/index.html` · `docs/MERCH_FUNNEL_MVP.md` |
| Checkout config | `site/data/shop-config.json` (see `shop-config.example.json`) |
| Shop UI | `site/js/shop.mjs` + `site/js/shop-config.mjs`  -  Buy vs interest by `checkout_open` |
| Drop interest (device-local) | `localStorage` `hc_shop_drop_interest` when checkout closed |
| Post-checkout page | `site/shop/thanks/index.html`  -  link from Shopify thank-you / order status URL · **buyer order status lookup** |
| Hub shortcut | Landing **Shortcuts** → Founding sticker drop |
| Hero secondary CTA | Landing hero → `/shop/` |

The interest form records **optional email** on this browser only (no server upload). Operator exports from DevTools: `JSON.parse(localStorage.getItem('hc_shop_drop_interest'))`.

---

## Enable checkout (operator)

1. Create **Founding signal sticker** in Shopify (test or live store).
2. Copy a checkout URL  -  product page, cart permalink (`/cart/VARIANT_ID:1`), or Buy Button link.
3. Edit `site/data/shop-config.json` (**both** `checkout_open: true` and a non-empty `checkout_url` are required — open alone keeps interest-only UI):

```json
{
  "tier0": {
    "price_display": "$12 + shipping",
    "checkout_url": "https://your-store.myshopify.com/cart/12345678:1",
    "checkout_open": true
  }
}
```

4. In Shopify checkout settings, set **Order status page** or post-purchase link to `https://humanity.llc/shop/thanks/` — see [`SHOPIFY_TIER0_POST_PURCHASE_SETUP.md`](SHOPIFY_TIER0_POST_PURCHASE_SETUP.md) (iPad/Safari steps). When checkout is open, `/shop/` displays the post-purchase URL in the Checkout section for copy-paste.
5. Deploy Pages. `/shop/` shows **Buy** and hides the interest form.
6. Deploy Worker — `npm run worker:deploy` — required for `/v1/store/*` (customizer artifact intent).
7. Run `FOUNDING_DROP_BRIEF.md` and `MERCH_QR_LIFECYCLE_POLICY.md` launch gates before `checkout_open: true` on production.

**Worker (Tier 0 batch fulfillment):** set `TIER0_CAMPAIGN_PROFILE_ID` to the campaign card’s `profile_id` (must exist in D1) and `TIER0_SHOPIFY_VARIANT_IDS` to the Shopify variant id from the cart URL (comma-separated if multiple). Paid webhooks for that SKU queue a batch print order (`hc-tier0-sticker-batch-v1`) without artifact intent metadata.

**Worker (Tier 0 Shopify inventory — e.g. Glitch hoodie):** set `TIER0_SHOPIFY_INVENTORY_VARIANT_IDS` to the pre-printed SKU variant id(s) (same numeric id as `shopify_variant_id` in `shop-config.json`). Paid webhooks record `fulfillment_mode: tier0_inventory` and **do not** queue Printify — Shopify ships from existing stock. Before `checkout_open: true`: `npm run merch-funnel:verify-config -- --require-tier0=tier0_glitch_hoodie_v1`. Set Shopify order-status URL to `https://humanity.llc/shop/thanks/?hc_ref=tier0_glitch` (copy from Glitch product page when checkout is open). See [`COMPANY_MERCH_AND_COMMUNITY_CAMPAIGN.md`](COMPANY_MERCH_AND_COMMUNITY_CAMPAIGN.md).

**Printify submit (operator):** set `PRINTIFY_SUBMIT_ENABLED=1`, `PRINTIFY_API_TOKEN` (secret), `PRINTIFY_SHOP_ID`, `TIER0_PRINTIFY_PRODUCT_ID`, and `TIER0_PRINTIFY_VARIANT_ID`. Set `FULFILLMENT_PII_ENCRYPTION_KEY` (secret, 32-byte base64) so paid Shopify webhooks encrypt shipping into `commerce_fulfillment_pii`. Then `POST /v1/print/orders` with `{ commerce_order_id, submit_to_printify: true, quantity? }` — shipping loads from the encrypted store; optional `shipping_address` in the body overrides for one-off fixes. Tier 1: after minting via `POST /v1/print/orders/{id}/mint`, you may pass `submit_to_printify: true` on the same mint request to chain submit.

**Printify webhooks (O-003):** register order events to `POST /v1/print/webhooks/printify` with shared `PRINTIFY_WEBHOOK_SECRET`. Updates print order status and tracking idempotently; reconciliation cron polls Printify every 30 minutes for active orders. No raw payload stored in D1.

## Not shipped yet

| Piece | Owner / doc |
|-------|-------------|
| Shopify store + live product URL in config | Operator  -  paste into `shop-config.json` |
| `shopify.order_paid` → Printify middleware | **Shipped** — queue + submit + webhook status sync |
| Batch QR artwork + Printify product ID | `FOUNDING_DROP_BRIEF.md` |
| Scan→create analytics (aggregate, no PII) | **Shipped** — `POST …/metrics/merch-funnel` · `GET …/operator/merch-funnel-monitor` · `hc_ref` on scan/create |
| Resolver waitlist API (optional) | Only if moving interest off localStorage |

---

## Wire-up checklist (checkout)

| Step | Status |
|------|--------|
| 1. Create Shopify product **Founding signal sticker** | Operator |
| 2. `site/data/shop-config.json` + example file | ✅ |
| 3. Buy CTA when `checkout_open` + valid `checkout_url` | ✅ (`shop.mjs`) |
| 4. Post-purchase page + Shopify email copy | ✅ thanks page · [`SHOPIFY_TIER0_POST_PURCHASE_SETUP.md`](SHOPIFY_TIER0_POST_PURCHASE_SETUP.md) · email in `LAUNCH_LANGUAGE_KIT.md` |
| 5. Pre-launch gates before live payments | Operator (`FOUNDING_DROP_BRIEF.md`) |

---

## Copy rules (always on page)

- **Buying this sticker does not verify you.**
- Bearer warning: QR does not prove the holder owns the card.
- Secondary CTA: **Create a free card** → `/create/`.

---

## Related

| Topic | Doc |
|-------|-----|
| **Headless Shopify + Printify wiring** | `docs/MERCH_HEADLESS_COMMERCE.md` |
| Owner revoke from second device | `docs/M5_5_OWNER_KEY_PORTABILITY.md` (shipped in repo) |
| Device hub (save keys, inbox) | `docs/DEVICE_OS.md` |
| Drop ops checklist | `docs/FOUNDING_DROP_BRIEF.md` |
| Merch QR lifecycle | `docs/MERCH_QR_LIFECYCLE_POLICY.md` |
