# Merch funnel MVP — scan → profile → customize → Printify

**Status:** Active — customizer UI shipped; operator enables products in `shop-config.json`  
**Parent:** [`MERCH_LED_V1.md`](MERCH_LED_V1.md) · [`V1_FLOW_AUDIT.md`](V1_FLOW_AUDIT.md) · [`features/Storefront v1.0.md`](features/Storefront%20v1.0.md)  
**Implementation:** [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md) · `site/shop/customize/`

---

## One-sentence MVP

A stranger **scans live wear**, sees the wearer’s **signed profile** (optional plain-language reader), wants their own, **creates a card**, **customizes a branded QR** on a **Printify product**, and **checks out on humanity.llc** — without touching Printify directly.

---

## Funnel (user journey)

```text
1. SEE     QR on hoodie / sticker / campaign merch
2. SCAN    https://humanity.llc/c/{profile_id}?q={qr_id}
3. READ    Live manifesto + object snapshot (+ optional L3 plain-language reader)
4. WANT    Curiosity CTA → Create card (hc_ref preserved)
5. CUSTOM  /shop/customize/ — preview LIVE OBJECT QR on product mockup
6. INTENT  POST /v1/store/artifact-intents → planned per-item qr_ids
7. CHECKOUT Shopify cart with artifact_intent metadata
8. FULFILL Paid webhook → Printify middleware → unique print_artifact QR minted
9. WEAR    Update ephemeral state from /created/ — same ink, new meaning
```

Canonical architecture diagram: [`V1_FLOW_AUDIT.md`](V1_FLOW_AUDIT.md) § Canonical V1 Flow.

Storefront spec (personalized purchase): [`features/Storefront v1.0.md`](features/Storefront%20v1.0.md) § **10.2**.

---

## What “QR customizer” means in code

| User-facing | Implementation |
|-------------|----------------|
| QR customizer | `/shop/customize/` + `site/js/shop-customize.mjs` |
| Branded QR preview | `qr-branding.mjs` · `qr-render.mjs` (`LIVE OBJECT` band) |
| Print layout (sticker) | `qr-print-sticker.mjs` |
| Pre-checkout record | **Artifact intent** — `POST /v1/store/artifact-intents` |
| Cart metadata | `POST …/artifact-intents/{id}/attach` → `shopify.cart_line_attributes` |
| Fulfillment | Printify Fulfillment Middleware after Shopify paid webhook |

The customizer **does not** call Printify from the browser. It prepares intent + preview, then hands off to Shopify.

---

## AI in the funnel (brand-safe)

| Surface | Role |
|---------|------|
| Scan profile | **Signed** `manifesto_line` + `public_snapshot` (L0–L2) |
| Optional reader | L3 P1 opt-in “plain language” — not signed truth ([`AI_FEATURE_DEVELOPMENT.md`](AI_FEATURE_DEVELOPMENT.md)) |
| Customizer | **No AI** — steward already created the card; preview is deterministic QR artwork |
| Marketing | Lead with **live state on humans**, not “AI profiles” |

---

## Product tiers (unchanged policy)

| Tier | QR model | Customizer |
|------|----------|------------|
| **Tier 0** curiosity | Batch QR on `/shop/` | Not used — buy founding sticker as-is |
| **Tier 1** belonging | Unique `print_artifact` per unit | **`/shop/customize/`** — hoodie, personalized sticker, etc. |

Commerce never grants vouch. Bearer warning on scan + product copy. [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md).

---

## Shipped site pieces

| Piece | Path |
|-------|------|
| Funnel doc | This file |
| Tier 0 shop | `site/shop/index.html` |
| **QR customizer** | `site/shop/customize/index.html` |
| Customizer logic | `site/js/shop-customize.mjs` · `site/js/shop-customize-core.mjs` |
| **Create → customize handoff** | `site/js/created-merch-funnel.mjs` · `merch-funnel-core.mjs` |
| Shop config | `site/data/shop-config.json` → `personalize.products[]` |
| Config helpers | `site/js/shop-config.mjs` |
| Merch attribution | `site/js/merch-funnel-core.mjs` · scan `scan-merch-funnel.mjs` |
| Artifact intent API | `worker/src/resolver/artifact-intents.ts` |
| QR renderer | `site/js/qr-branding.mjs` |

---

## Operator setup (personalized products)

1. Create **Shopify** product(s) for hoodie / personalized sticker — cart permalink with variant id.
2. Map **Printify** product + variant (fulfillment — see [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md)).
3. Edit `site/data/shop-config.json`:

```json
{
  "personalize": {
    "checkout_open": true,
    "products": [
      {
        "product_id": "hoodie_live_object_v1",
        "title": "Live Object hoodie",
        "preview": "hoodie",
        "price_display": "$48 + shipping",
        "shopify_variant_id": "12345678901234",
        "checkout_url": "https://YOUR-STORE.myshopify.com/cart/12345678901234:1"
      }
    ]
  }
}
```

4. Deploy Pages. `/shop/customize/` shows **Continue to checkout** when card session exists and `checkout_open` is true.
5. **Deploy Worker** — `npm run worker:deploy` — `humanity.llc/v1/*` must route to the resolver (else artifact intent returns 405).
6. **Worker env (Tier 1 Printify queue):** after Shopify `orders/paid` webhook validates artifact intent metadata, a print order is queued automatically. Set Printify mappings per product template (secrets via `wrangler secret` where noted):

| Template | Env vars |
|----------|----------|
| `hc-hoodie-live-object-v1` | `PERSONALIZE_HOODIE_PRINTIFY_PRODUCT_ID`, `PERSONALIZE_HOODIE_PRINTIFY_VARIANT_ID`, optional `PERSONALIZE_HOODIE_PRINTIFY_SHIPPING_METHOD` |
| `hc-sticker-square-v1` | `PERSONALIZE_STICKER_PRINTIFY_PRODUCT_ID`, `PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID`, optional `PERSONALIZE_STICKER_PRINTIFY_SHIPPING_METHOD` |

Shared: `PRINTIFY_SUBMIT_ENABLED=1`, `PRINTIFY_API_TOKEN` (secret), `PRINTIFY_SHOP_ID`, `SHOPIFY_WEBHOOK_SECRET` (secret). Operator submits via `POST /v1/print/orders` with `{ commerce_order_id, submit_to_printify: true, shipping_address }` after minting planned QRs — same path as Tier 0 ([`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md)).

7. Run [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) gates before live payments.
8. **Apparel QA:** physical scan test on printed hoodie ([`V1_ASSUMPTION_REGISTER.md`](V1_ASSUMPTION_REGISTER.md) A-004) — runbook [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md); automated regression: `npm run worker:test:merch-print-qa`.
9. **Engineering rollout:** `npm run merch-funnel:rollout:step1` → `step6` — see [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) § Production rollout commands.

### Worker route (required)

Artifact intent: `POST /v1/store/artifact-intents`. Route pattern `humanity.llc/v1/*` in `worker/wrangler.toml`. Without it, Pages returns **405** and the customizer shows your **card QR fallback** only.

---

## Merch funnel refs (`hc_ref`)

Aggregate metrics only — no PII. Allowed refs:

| Ref | When set |
|-----|----------|
| `tier0_shop` | `/shop/` |
| `tier0_sticker` | Tier 0 campaign scan |
| `customize_shop` | `/shop/customize/` |
| `customize_hoodie` | Customizer with hoodie selected |
| `scan_customize` | Scan page → customize CTA on live wear / print_artifact scans |

---

## Exit checklist (MVP)

| Step | Pass? |
|------|-------|
| Stranger scans campaign merch; profile loads with limits + create CTA | ✅ scan merch hint + footer CTAs (`scan_customize`) |
| Create card → `/shop/customize/` detects session | ✅ handoff ref + `/created/` customize CTA + `loadCardSessionForCustomize` |
| Preview shows LIVE OBJECT branded QR on product mockup | ✅ UI |
| Artifact intent created; attach returns Shopify line attributes | ✅ API tests |
| Checkout URL includes `properties[artifact_intent_id]` | ✅ `shop-customize-core.test.ts` |
| Paid webhook → Printify queue (operator env) | ✅ queue on paid webhook · Tier 1 template + Printify env mapping |
| Per-order artwork upload to Printify on submit (PM-FR-13) | ✅ `printify-upload.ts` · `printify-line-items.ts` — requires `PERSONALIZE_*_PRINTIFY_BLUEPRINT_ID` + `PRINT_PROVIDER_ID` |
| Buyer order status on `/shop/thanks/` (O-003) | ✅ `GET /v1/store/order-status` · email hash lookup · no shipping PII in response |
| Printed item scans; bearer warning visible | ☐ physical QA · ✅ automated scan regression (`npm run worker:test:merch-print-qa`, [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md)) |
| Owner updates manifesto from phone without reprint | ✅ resolver |

---

## Not in this MVP slice

- Full story-row catalog (~50 SKUs) — [`Storefront v1.0.md`](features/Storefront%20v1.0.md)
- Drag-and-drop QR placement on arbitrary Printify mockups
- In-browser native checkout
- Game-master / city-scale AI
- Scan analytics

---

## Related

| Doc | Role |
|-----|------|
| [`MERCH_LED_V1.md`](MERCH_LED_V1.md) | Curiosity + belonging strategy |
| [`AI_FEATURE_DEVELOPMENT.md`](AI_FEATURE_DEVELOPMENT.md) | Optional scan reader only |
| [`V1_IMPLEMENTATION_BACKLOG.md`](V1_IMPLEMENTATION_BACKLOG.md) | O-002 Printify adapter |
| [`features/Printify Fulfillment Middleware v1.0.md`](features/Printify%20Fulfillment%20Middleware%20v1.0.md) | Server-side fulfillment |
