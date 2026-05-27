# Merch funnel MVP — scan → profile → customize → Printify

**Status:** Active — customizer UI shipped; 2-row shop hub + same-tab checkout handoff in progress  
**Parent:** [`MERCH_LED_V1.md`](MERCH_LED_V1.md) · [`V1_FLOW_AUDIT.md`](V1_FLOW_AUDIT.md) · [`features/Storefront v1.0.md`](features/Storefront%20v1.0.md)  
**Implementation:** [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md) · `site/shop/` · `site/shop/customize/`

---

## MVP feasibility (2026-05-27)

**Yes — the MVP is technically feasible** with the architecture already locked in [`V1_DECISION_LOCK.md`](V1_DECISION_LOCK.md):

- **humanity.llc** — browse, story rows, QR preview/proof, post-purchase
- **Headless Shopify** — cart, checkout, payments, tax, refunds (no native checkout required for v1)
- **Printify middleware** — fulfillment only on the server; users never touch Printify in the browser

What reads as “cheap” is not the stack — it is **UX polish and checkout handoff** (new-tab dump, single-SKU landing, placeholder mocks, operator/debug copy). Premium feel is achievable on the same architecture.

**Would block MVP only if:** payment UI had to be 100% embedded on humanity.llc with zero Shopify surface. That constraint is **not** required.

---

## Spec vs shipped (honest gap table)

| Area | Spec ([`Storefront v1.0.md`](features/Storefront%20v1.0.md)) | Shipped today | Gap |
|------|----------------------------------------------------------------|---------------|-----|
| Browse model | Story-row hub (~50 SKUs over time) | **2-row hub** at `/shop/` + product pages | Full catalog deferred |
| Tier 0 batch merch | Founding objects row | `/shop/founding/` — founding sticker | Founding glitch shirt / luxury batch page TBD |
| Tier 1 personalize | Customizer → artifact intent → checkout | Personalized **sticker** path wired; hoodie after QA | Operator: sticker Shopify URL + Printify env |
| Checkout | Branded Humanity checkout; may pass through Shopify | Same-tab redirect to Shopify; return via `/shop/thanks/` | Post-pay order timeline on site (thin) |
| Catalog API | `GET /v1/store/rows` | Static `shop-config.json` | API rows when catalog grows |
| Print catalog | Apparel from `GET /v1/print/catalog` | Customizer merges catalog + `shop-config.json` | Hoodie Printify QA + operator enable |
| Fulfillment | Paid webhook → Printify | Queue + template resolve + Printify env for sticker | Operator submit after mint |

**Do not conflate:** Tier 0 founding batch page (`/shop/founding/`) and Tier 1 customizer (`/shop/customize/`). Different QR models, different stories.

---

## Premium UX principles (headless Shopify)

Checkout on Shopify is acceptable for v1 when framed as a **secure payment step**, not a tab dump:

| Avoid (feels cheap) | Target (feels intentional) |
|---------------------|----------------------------|
| `window.open` to Shopify in a new tab | Same-tab redirect; copy names Shopify as secure checkout |
| Single product page as the whole “shop” | `/shop/` hub: **Make it yours** + **Founding objects** |
| Grey CSS-only hoodie mock | Real product imagery + approved print template when live |
| “Checkout opening soon” on production paths | Production copy; config gates only where checkout is truly closed |
| Story stops at payment | Branded `/shop/thanks/` + future order status on humanity.llc |

See [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md) for operator checkout setup.

---

## Implementation phases (engineering order)

| Phase | Scope | Status |
|-------|--------|--------|
| **1** | Same-tab Shopify checkout handoff (`shop-checkout-handoff.mjs`) | Shipped |
| **2** | 2-row `/shop/` hub + `/shop/founding/` Tier 0 page | Shipped |
| **3** | Wire customizer to `GET /v1/print/catalog` when hoodie QA passes | Shipped |
| **4** | Enable one personalized SKU E2E (`personalize.checkout_open` + webhook → Printify) | Shipped |
| **5** | Post-purchase order status on humanity.llc | Next |
| **6** | Full story-row catalog (~50 SKUs) | Post-MVP |

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
| Print catalog merge | `site/js/shop-print-catalog-core.mjs` · `GET /v1/print/catalog` |
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
| **Tier 0** curiosity | Batch QR on founding product page | Not used — buy founding sticker at **`/shop/founding/`** |
| **Tier 1** belonging | Unique `print_artifact` per unit | **`/shop/customize/`** — hoodie, personalized sticker, etc. |

Commerce never grants vouch. Bearer warning on scan + product copy. [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md).

---

## Shipped site pieces

| Piece | Path |
|-------|------|
| Funnel doc | This file |
| **Shop hub** (2 story rows) | `site/shop/index.html` · `site/js/shop-hub.mjs` |
| Tier 0 founding sticker | `site/shop/founding/index.html` · `site/js/shop-founding.mjs` |
| Checkout handoff | `site/js/shop-checkout-handoff.mjs` |
| **QR customizer** | `site/shop/customize/index.html` |
| Customizer logic | `site/js/shop-customize.mjs` · `site/js/shop-customize-core.mjs` |
| Shop config | `site/data/shop-config.json` → `personalize.products[]` |
| Config helpers | `site/js/shop-config.mjs` |
| Merch attribution | `site/js/merch-funnel-core.mjs` · scan `scan-merch-funnel.mjs` |
| Artifact intent API | `worker/src/resolver/artifact-intents.ts` |
| QR renderer | `site/js/qr-branding.mjs` |

---

## Operator setup (personalized products)

**Phase 4 launch SKU:** `sticker_personalized_v1` only (`personalize.checkout_product_id`). Hoodie remains preview-only until apparel QA.

1. Create **Shopify** personalized sticker product — cart permalink with variant id.
2. Map **Printify** sticker product in Worker env (`PERSONALIZED_STICKER_PRINTIFY_*` — see [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md)).
3. Edit `site/data/shop-config.json` — each product needs `print_template_id` matching an approved template from `GET /v1/print/catalog`:

```json
{
  "personalize": {
    "checkout_open": true,
    "checkout_product_id": "sticker_personalized_v1",
    "products": [
      {
        "product_id": "sticker_personalized_v1",
        "print_template_id": "hc-sticker-square-v1",
        "print_variant_id": "2x2-white",
        "title": "Personalized sticker",
        "preview": "sticker",
        "price_display": "$12 + shipping",
        "shopify_variant_id": "12345678901234",
        "checkout_url": "https://YOUR-STORE.myshopify.com/cart/12345678901234:1"
      }
    ]
  }
}
```

The customizer loads `GET /v1/print/catalog`, merges approved templates with commerce fields above, and hides products not in the catalog (including Tier 0 batch templates).

4. Deploy Pages. `/shop/customize/` shows **Continue to checkout** when card session exists and `checkout_open` is true.
5. **Deploy Worker** — `npm run worker:deploy` — `humanity.llc/v1/*` must route to the resolver (else artifact intent returns 405).
6. Run [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) gates before live payments.
7. **Apparel QA:** physical scan test on printed hoodie ([`V1_ASSUMPTION_REGISTER.md`](V1_ASSUMPTION_REGISTER.md) A-004).

### Worker route (required)

Artifact intent: `POST /v1/store/artifact-intents`. Route pattern `humanity.llc/v1/*` in `worker/wrangler.toml`. Without it, Pages returns **405** and the customizer shows your **card QR fallback** only.

---

## Merch funnel refs (`hc_ref`)

Aggregate metrics only — no PII. Allowed refs:

| Ref | When set |
|-----|----------|
| `tier0_shop` | `/shop/` hub |
| `tier0_sticker` | `/shop/founding/` · Tier 0 campaign scan |
| `customize_shop` | `/shop/customize/` |
| `customize_hoodie` | Customizer with hoodie selected |
| `scan_customize` | Scan page → customize CTA on live wear / print_artifact scans |

---

## Exit checklist (MVP)

| Step | Pass? |
|------|-------|
| Stranger scans campaign merch; profile loads with limits + create CTA | ✅ scan merch hint + footer CTAs (`scan_customize`) |
| Create card → `/shop/customize/` detects session | ☐ manual |
| Preview shows LIVE OBJECT branded QR on product mockup | ✅ UI |
| Artifact intent created; attach returns Shopify line attributes | ✅ API tests |
| Checkout URL includes `properties[artifact_intent_id]` | ✅ `shop-customize-core.test.ts` |
| Paid webhook → Printify queue (operator env) | ✅ code path for personalized sticker |
| Printed item scans; bearer warning visible | ☐ physical QA |
| Owner updates manifesto from phone without reprint | ✅ resolver |

---

## Not in this MVP slice

- Full story-row catalog (~50 SKUs) — [`Storefront v1.0.md`](features/Storefront%20v1.0.md)
- Separate founding luxury batch page (e.g. glitch shirt campaign) — story TBD
- Drag-and-drop QR placement on arbitrary Printify mockups
- In-browser native checkout (headless Shopify is the v1 decision)
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
