# Merch headless commerce — humanity.llc + Shopify + Printify

**Status:** Canonical operator + engineering reference (2026-05-31)  
**Parent:** [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) · [`MERCH_LED_V1.md`](MERCH_LED_V1.md)  
**Specs:** [`features/Storefront v1.0.md`](features/Storefront%20v1.0.md) · [`features/Printify Fulfillment Middleware v1.0.md`](features/Printify%20Fulfillment%20Middleware%20v1.0.md) · [`V1_DECISION_LOCK.md`](V1_DECISION_LOCK.md) § Commerce stack  
**Visual choreography:** [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) — customize preview (Beat 3) is the storefront delight moment; scan stays shared notary  
**Production integration proof:** [`MERCH_PRODUCTION_INTEGRATION_CHECKLIST.md`](MERCH_PRODUCTION_INTEGRATION_CHECKLIST.md) — one paid Glitch hoodie operator run (software loop only)

---

## First launch recommendation (2026-05-30)

**Lead with Tier 1 personalized merch** — scan live wear → create card → `/shop/customize/` → unique LIVE OBJECT QR → Shopify checkout → Printify fulfillment.

**Founding drop:** **Glitch LIVE QR hoodie** — fixed Glitch artwork, **unique QR per buyer**, target id `glitch_hoodie_v1` in `personalize.products` ([`MERCH_PRODUCT_COPY.md`](MERCH_PRODUCT_COPY.md)). **Not** shared-batch `tier0_glitch_hoodie_v1`.

| Launch path | Real product? | Notes |
|-------------|---------------|-------|
| **Tier 1 Glitch hoodie** `/shop/customize/` + artifact intent | **Yes** — **primary launch wedge** | Fixed Glitch art · unique `print_artifact` per unit · buyer holds keys |
| **Tier 1** generic hoodie / sticker | **Yes** | Same plumbing · optional second SKUs |
| **Tier 0** batch founding sticker | Optional curiosity SKU | Shared campaign QR; no customizer |
| **Tier 0 shared-batch Glitch PDP** (`tier0_glitch_hoodie_v1`) | **No** (deprecated for launch) | Pre-printed same URL on every unit — superseded 2026-05-30 |
| **Shopify hoodie alone** (Printify publish, no customizer flow) | **No** — payment SKU only | Static print file; not per-buyer QR |
| **Status plate / door pilot** | Optional Phase A vertical | Not the primary GTM wedge post-M5 |

Without Tier 1 customizeability, merch is a generic POD listing — not the humanity.llc product (live state on humans, revocable per item, same ink / new meaning).

---

## Mental model (one paragraph)

**Printify is the factory** (garment template, print area, production, shipping). **Shopify is the cash register** (cart, payment, tax, refunds, customer email). **humanity.llc is the store** (story, customizer, LIVE OBJECT QR preview, artifact intent, trust copy). Customers never browse Printify and do not shop your Shopify theme as the primary experience — they customize on humanity.llc and **pass through Shopify only to pay**.

---

## Three layers

| Layer | System | Customer sees? | Responsibility |
|-------|--------|----------------|----------------|
| **Storefront** | `humanity.llc` (Pages + Worker) | Yes — primary | Story rows, `/shop/customize/`, QR preview, artifact intent, bearer limits, scan funnel |
| **Commerce** | **Shopify** | Checkout tab only | Cart permalink, payment capture, tax, discounts, refunds, order admin, buyer email |
| **Fulfillment** | **Printify** (via Humanity Worker API) | No — hidden | Manufacture, ship, tracking; never checkout or identity authority |

Locked in [`V1_DECISION_LOCK.md`](V1_DECISION_LOCK.md): v1 uses **headless Shopify** for commerce; Humanity builds identity + artifact differentiation instead of native checkout.

---

## What “headless Shopify” means here

**Not:** Shopify theme as your main storefront.  
**Not:** Printify’s public catalog or Printify checkout.  
**Yes:**

```text
humanity.llc UI  →  Shopify cart/checkout URL  →  Shopify paid webhook
       →  Humanity commerce order  →  Printify API order  →  ship
```

From [`features/Storefront v1.0.md`](features/Storefront%20v1.0.md) SF-FR-03 / SF-FR-21: users must not visit Printify; checkout must go through Shopify.

humanity.llc **does not auto-sync** from Shopify or Printify. Operators paste **Shopify cart URLs** into `site/data/shop-config.json` and set **Printify product IDs** in Worker env ([`SHOP_CHECKOUT_PROD_INVESTIGATION.md`](SHOP_CHECKOUT_PROD_INVESTIGATION.md)).

---

## Tier 0 vs Tier 1 (where customization lives)

| | **Tier 0 — curiosity** | **Tier 1 — belonging (first real personalized launch)** |
|--|--------------------------|--------------------------------------------------------|
| **Path** | `/shop/` | `/shop/customize/` |
| **QR model** | Shared batch campaign QR | **Unique `print_artifact` per physical unit** |
| **Customizer** | Not used | **Required** — preview + artifact intent |
| **Shopify line metadata** | Optional (variant match only) | **`artifact_intent_id` + `profile_id` required** |
| **Product meaning** | Walking ad / curiosity | **Your wedge** — LIVE OBJECT on wear, revocable per item |

Tier 0 batch sticker can run in parallel as a cheap curiosity SKU. **It is not a substitute for Tier 1 customizeability.**

Commerce never grants vouch. See [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md).

---

## Where personalization happens (not on Shopify)

Personalization is **not**:

- Shopify’s native product customizer / line-item apps alone
- Whatever **static** design you published from Printify → Shopify (one fixed print file for all buyers)

Personalization **is**:

1. Card owner session on humanity.llc (`loadCardSessionForCustomize`)
2. **`POST /v1/store/artifact-intents`** — allocates **planned unique `qr_id`s** per unit (not minted until paid)
3. Preview on `/shop/customize/` (LIVE OBJECT branded QR on mockup)
4. **`POST …/artifact-intents/{id}/attach`** — Shopify cart line attributes
5. After **paid webhook** — mint `print_artifact` QRs, generate print artwork, submit Printify order

The browser **never** calls Printify. See [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) § What “QR customizer” means.

---

## Glitch print frame background (buyer → fulfillment)

Glitch `/shop/customize/` lets the buyer choose **White card** (`full`) or **Transparent** (`transparent`) for the **printed** LIVE OBJECT QR — not only the on-page preview. Today the UI can show transparent mockups and a planned-QR block below the garment; **fulfillment must read the same choice** from durable storage, not `sessionStorage` alone.

**Registers** ([`QR_BRANDING.md`](QR_BRANDING.md) § Two registers): digital scan/created surfaces stay on the default full card. Print/upload uses `renderPrintArtworkFromScanUrl` with per-template profile **overridden** by the stored buyer value when `template_id` is `hc-glitch-hoodie-v1`.

| Layer | Field / artifact | Values | Notes |
|-------|------------------|--------|-------|
| **Customizer (browser)** | `sessionStorage` `hc_glitch_print_frame_background` | `full` \| `transparent` | Restored on load; sent on intent create/attach (step 3). Cache key includes frame so variant/frame changes mint a new planned QR. |
| **D1 `artifact_intents`** | `print_frame_background` | `full` \| `transparent` | Set at intent create/attach; source of truth at checkout. Migration `0026_artifact_intent_print_frame_background.sql`. |
| **D1 `print_orders`** | `print_frame_background` | `full` \| `transparent` | Copied from intent when the paid webhook creates the print order. |
| **Shopify cart/order** | line attribute `print_frame_background` | same | Operator visibility; attach step (step 2). |
| **Printify SVG** | render opts | `frameBackground`, `transparentQrQuietZone`, `skipFinderLogo` when `transparent` | `preparePrintifyLineItems` / `renderPrintArtworkFromScanUrl` (steps 4–5). |

**Color policy (customizer only):** Charcoal Heather and Royal Blue force **white card** in the UI. Navy and other colors may select transparent; physical scan QA on fabric is still required before treating transparent as the catalog default ([`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md)).

**Implementation sequence (do not skip order):**

| Step | Work | Status |
|------|------|--------|
| **1** | D1 columns + `worker/src/db/*` + copy intent → print order on webhook | **Shipped** — migration `0026`, `print-frame-background.ts`, `artifact-intents` / `print-orders` / `fulfillment-queue` |
| **2** | `POST /v1/store/artifact-intents` + attach: accept `print_frame_background`, Shopify attributes | **Shipped** — `resolveArtifactIntentPrintFrameBackground`, attach field update, cart/order attributes |
| **3** | Customize: send field on create/attach; refresh intent when frame or variant changes | **Shipped** — `shop-customize.mjs` + `shop-customize-printify-qr-core.mjs` |
| **4** | Fulfillment: `renderPrintArtworkFromScanUrl` uses stored value (not static `full` profile) | **Shipped** — `qrFrameRenderOptionsForFulfillment`, Printify submit path |
| **5** | Docs/hints + operator QA sign-off for transparent-on-fabric production | **Hints shipped** — customize copy + [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md) § A.7; **operator sign-off open** until A7.1–A7.4 pass on target color |

**API (step 2):** Optional body field `print_frame_background`: `"full"` \| `"transparent"`. Resolved in `resolveArtifactIntentPrintFrameBackground()` — transparent only stored for `glitch_hoodie_v1` when `print_variant_id` color is not Charcoal Heather or Royal Blue. Responses and Shopify `cart_line_attributes` / `order_note_attributes` include `print_frame_background`. Attach always updates `print_variant_id` + `print_frame_background` before returning cart metadata.

**Customize (step 3):** `createArtifactIntent` / `attachArtifactIntent` send `print_frame_background` for Glitch (`glitchArtifactIntentPrintFrameBackground`). Intent cache key is `artifactIntentSelectionKey` (variant + frame); changing Navy size or white card ↔ transparent allocates a new planned QR after debounced sync.

**Fulfillment (step 4):** `preparePrintifyLineItems` → `renderPrintArtworkFromScanUrl(scanUrl, templateId, printOrder.print_frame_background)` via `qrFrameRenderOptionsForFulfillment`. Buyer `transparent` sets `frameBackground: "transparent"`, `transparentQrQuietZone: true`, `skipFinderLogo: true` (matches customize preview). Default / `full` uses template profile white card.

**Regression (steps 1–4):**

```bash
npm run worker:test -- worker/tests/print-frame-background.test.ts worker/tests/artifact-intents.test.ts worker/tests/fulfillment-queue.test.ts worker/tests/print-template-render.test.ts worker/tests/printify-line-items.test.ts
```

---

## Dual product IDs (one logical hoodie, three references)

One sellable product (e.g. Live Object hoodie) is wired in **three places**:

| Reference | Example field | Purpose |
|-----------|---------------|---------|
| **Humanity product** | `hoodie_live_object_v1` in `shop-config.json` | Customizer picker, artifact intent `product_id`, print template mapping |
| **Shopify variant** | `shopify_variant_id`, `checkout_url` in `shop-config.json` | Payment — cart permalink `…/cart/{VARIANT_ID}:1` |
| **Printify product** | `PERSONALIZE_HOODIE_PRINTIFY_PRODUCT_ID` (+ variant) in Worker env | Manufacturing — `POST …/shops/{id}/orders.json` |

SF-FR-08 ([`Storefront v1.0.md`](features/Storefront%20v1.0.md)): Shopify variant IDs must map to Humanity template IDs.  
Print template IDs in code: `hc-hoodie-live-object-v1`, `hc-sticker-square-v1` ([`worker/src/print/print-catalog.ts`](../worker/src/print/print-catalog.ts)).

**Shopify Admin product ≠ automatic link to Printify in this architecture.** You map both sides explicitly.

---

## End-to-end flow (Tier 1 personalized)

```text
SEE   QR on live wear
SCAN  /c/{profile_id}?q={qr_id}
WANT  Create card (hc_ref preserved)
CUSTOM /shop/customize/
        ├─ preview planned QR (artifact intent)
        ├─ user approves limits checkbox
        └─ buildShopifyCartUrl(checkout_url, properties[artifact_intent_id], …)
           + POST …/pre-mint (owner-signed qr_credentials)
CHECKOUT  Shopify (same tab) — buyer pays
WEBHOOK   Shopify orders/paid → commerce order → print queue → auto-mint → auto-submit when PRINTIFY_SUBMIT_ENABLED=1
SUBMIT    (fallback) operator POST …/print/orders { submit_to_printify: true }
PRINTIFY  production → ship → webhook status sync
WEAR      Owner updates manifesto from phone; same ink, new meaning
```

Canonical diagram: [`V1_FLOW_AUDIT.md`](V1_FLOW_AUDIT.md) § Flow 4 · [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) funnel list.

---

## Printify “Publish to Shopify” vs Humanity middleware

### Standard Printify + Shopify app path

- Design product in Printify → **Publish to Shopify**
- Shopify listing has **one fixed print file**
- Printify app may auto-fulfill when Shopify order is paid

**Fine for:** static designs, Tier 0–style batch SKUs, creating a **Shopify SKU shell** (same garment in admin).

**Insufficient alone for Tier 1:** each buyer needs a **different QR** on the print. Static publish cannot replace per-order artifact intent + middleware.

### Humanity v1 path (personalized launch)

- Storefront + customizer on humanity.llc
- Shopify = **payment only** (cart URL + line properties)
- Fulfillment = **Humanity Worker → Printify API** after paid webhook + validation
- Manual production approval gate remains (`PRINTIFY_SUBMIT_ENABLED`, operator submit)

**Do not double-fulfill:** If a Shopify product is Printify-app-connected *and* the Worker submits the same order to Printify, you may get **two production jobs**. For Tier 1 personalized orders, prefer **Humanity-controlled submit** after webhook. Disable or avoid auto-routing duplicate paths for the same SKU until ops policy is explicit.

---

## Configuration surfaces

### Pages — `site/data/shop-config.json`

| Field | Role |
|-------|------|
| `tier0.checkout_url` + `checkout_open` | Tier 0 Buy button → Shopify |
| `personalize.checkout_open` | Global gate for Tier 1 checkout button |
| `personalize.products[].product_id` | Humanity id (`hoodie_live_object_v1`, …) |
| `personalize.products[].checkout_url` | Shopify cart permalink |
| `personalize.products[].shopify_variant_id` | Passed to artifact intent attach (metadata) |

Both `checkout_open: true` **and** non-empty `checkout_url` required per product. See [`SHOP_CHECKOUT_PROD_INVESTIGATION.md`](SHOP_CHECKOUT_PROD_INVESTIGATION.md).

Deploy: `npm run pages:deploy` after edits.

### Worker — `worker/wrangler.toml` + secrets

| Var / secret | Role |
|--------------|------|
| `SHOPIFY_WEBHOOK_SECRET` | Verify `orders/paid` webhooks |
| `TIER0_*` / `PERSONALIZE_*_PRINTIFY_*` | Printify product mapping per template |
| `PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID` | API auth |
| `PRINTIFY_SUBMIT_ENABLED=1` | Allow live Printify HTTP submit (operator-gated) |
| `FULFILLMENT_PII_ENCRYPTION_KEY` (secret) | AES-256-GCM key (32 raw bytes, base64) — encrypt Shopify `shipping_address` at paid webhook |

Deploy: `npm run worker:deploy`. Route `humanity.llc/v1/*` required for artifact intents. Run `npm run worker:migrate:local` (or remote apply) for `0020_commerce_fulfillment_pii.sql`.

---

## Shipped in repo vs spec gap

| Capability | Status | Notes |
|------------|--------|-------|
| `/shop/customize/` preview + artifact intent API | ✅ Shipped | [`artifact-intents.ts`](../worker/src/resolver/artifact-intents.ts) |
| Shopify cart URL + line `properties[artifact_intent_id]` | ✅ Shipped | [`shop-customize-core.mjs`](../site/js/shop-customize-core.mjs) |
| Paid webhook → commerce order → print queue | ✅ Shipped | [`shopify-orders-webhook.ts`](../worker/src/http/shopify-orders-webhook.ts) |
| Tier 1 template → Printify env mapping | ✅ Shipped | [`printify-template-config.ts`](../worker/src/print/printify-template-config.ts) |
| Operator mint planned QRs | ✅ Shipped | Auto-mint after paid webhook when pre-mint credentials stored · manual `POST …/mint` fallback |
| Printify order submit (product/variant line) | ✅ Shipped | Auto-chains after webhook mint when `PRINTIFY_SUBMIT_ENABLED=1` · operator fallback |
| Printify webhook status sync | ✅ Shipped | O-003 slice |
| **Per-order artwork upload to Printify** | ✅ Shipped (PR #63) | PM-FR-13 — [`printify-upload.ts`](../worker/src/print/printify-upload.ts) · [`printify-line-items.ts`](../worker/src/print/printify-line-items.ts). Upload SVG → ephemeral product with `print_areas` → order line item per planned QR. Requires `PERSONALIZE_*_PRINTIFY_BLUEPRINT_ID` + `PRINT_PROVIDER_ID`. |
| **Encrypted shipping at rest (PM-FR-41)** | ✅ Shipped | Shopify paid webhook → `commerce_fulfillment_pii` · [`fulfillment-pii-crypto.ts`](../worker/src/commerce/fulfillment-pii-crypto.ts) · Printify submit via [`resolve-printify-shipping.ts`](../worker/src/commerce/resolve-printify-shipping.ts) |
| Shipping quote before checkout | ☐ Deferred | PM-FR-20 — Shopify remains checkout total authority for v1 |
| humanity.llc order timeline UI | ✅ Buyer status shipped (PR #66) | `GET /v1/store/order-status` · `/shop/thanks/` form · **tracking links** on shipped orders · reconciliation cron every 30m |
| Post-checkout **buyer mint** (thanks page) | ✅ Shipped | `GET /v1/store/order-status` → `mint` · `POST /v1/store/order-mint` · `/shop/thanks/` sign panel when pre-mint missed — [`EPHEMERAL_STATE_AND_MERCH.md`](EPHEMERAL_STATE_AND_MERCH.md) |

---

## Operator setup checklist (Tier 1 hoodie or sticker)

### 1. Printify (factory)

**Tier 1 hoodie blank (approved):** [Champion S700 hoodie](https://printify.com/app/products/528/champion/champion-hoodie) — Printify **blueprint `528`**. Launch size/color: **Solid Black / M** (`print_variant_id: black-m` in `shop-config.json`).

- [ ] Run `PRINTIFY_API_TOKEN=… npm run printify:lookup-blueprint -- 528` — lists print providers, variant ids, and suggested `wrangler.toml` lines. Prefer a provider with **DTF or DTG on front** (QR scans poorly through embroidery).
- [ ] Save a **reference product** in your Printify shop (same blueprint / provider / variant) — copy its **shop product id** into `PERSONALIZE_HOODIE_PRINTIFY_PRODUCT_ID` (shipping quotes use this; Tier 1 submit creates ephemeral products with per-order artwork).
- [ ] Set `PERSONALIZE_HOODIE_PRINTIFY_BLUEPRINT_ID`, `PRINT_PROVIDER_ID`, `VARIANT_ID`, placeholder + image offsets after physical QA per [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md) (A-004)
- [ ] Sticker path unchanged — separate `PERSONALIZE_STICKER_PRINTIFY_*` env keys

### 2. Shopify (cash register)

- [ ] Create product + variant (can start from Printify publish **or** manual SKU)
- [ ] Copy **cart permalink**: `https://{store}.myshopify.com/cart/{VARIANT_ID}:1`
- [ ] Register **orders/paid** webhook → `https://humanity.llc/v1/webhooks/shopify/orders` (or staging Worker URL)
- [ ] Optional: order status link → `https://humanity.llc/shop/thanks/` ([`SHOPIFY_TIER0_POST_PURCHASE_SETUP.md`](SHOPIFY_TIER0_POST_PURCHASE_SETUP.md))
- [ ] **Tier 1 personalized:** post-purchase URL → `https://humanity.llc/shop/thanks/?hc_ref=customize_hoodie` (or `customize_shop`) so buyers see ephemeral-state copy and `/created/#update-status` link — [`EPHEMERAL_STATE_AND_MERCH.md`](EPHEMERAL_STATE_AND_MERCH.md)

### 3. humanity.llc config (storefront)

- [ ] Edit `site/data/shop-config.json` — `personalize.checkout_open: true`, product `checkout_url` + `shopify_variant_id`
- [ ] `npm run pages:deploy`
- [ ] Verify: `curl -sS https://humanity.llc/data/shop-config.json`

### 4. Worker (middleware)

- [ ] Set `PERSONALIZE_*_PRINTIFY_*` (variant + shipping) **and** `PERSONALIZE_*_PRINTIFY_BLUEPRINT_ID` + `PRINT_PROVIDER_ID` for per-order artwork submit
- [ ] Set `FULFILLMENT_PII_ENCRYPTION_KEY` secret (`openssl rand -base64 32`) — enables encrypted Shopify shipping capture
- [ ] `npm run worker:deploy`
- [ ] Test artifact intent: `POST /v1/store/artifact-intents` (not 405)

### 5. Launch gates

- [ ] [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) · [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) launch gates
- [ ] Physical sample sign-off ([`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md))
- [ ] Automated regression: `npm run worker:test:merch-print-qa`

### 6. Post-payment ops (Printify submit auto-chains when enabled)

- [x] **Auto-mint:** Buyer pre-signs at `/shop/customize/` checkout → paid webhook mints planned QRs
- [x] **Auto-submit:** When `PRINTIFY_SUBMIT_ENABLED=1` and encrypted shipping captured, paid webhook submits to Printify after successful mint (idempotent)
- [ ] **Manual fallback:** Mint or submit via operator APIs when auto steps fail or flags are off

---

## Production rollout commands (engineering)

Mirrors [`hosted:rollout:step*`](HOSTED_TIER_G0_READINESS.md) for merch funnel close-out. Run in order before enabling live Tier 1 payments.

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `npm run merch-funnel:rollout:step1` | Validate repo `shop-config.json` + merch funnel Vitest |
| 1 strict | `npm run merch-funnel:rollout:step1 -- --strict` | Fail if launch SKU lacks `checkout_url` |
| 2 preflight | `npm run merch-funnel:rollout:step2 -- --preflight` | Local shop-config + rollout unit tests (no fetch) |
| 2 | `SITE_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:step2 -- --verify` | Smoke deployed Pages config + shop/customize + store API + repo drift |
| 2 CI | `deploy-pages.yml` → `merch-funnel:rollout:post-deploy -- --pages` | Post-deploy step 2 verify (non-`--strict`; warnings OK until operator pastes URLs) |
| 3 preflight | `npm run merch-funnel:rollout:step3 -- --preflight` | `humanity.llc/v1/*` route + rollout Vitest (no API) |
| 3 | `API_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:step3 -- --verify` | Health, print catalog, store rows + artifact-intent route |
| 3 CI | `deploy-worker.yml` → `merch-funnel:rollout:post-deploy -- --worker` | Post-deploy step 3 verify after Worker deploy |
| 4 | `npm run merch-funnel:rollout:step4` | Worker env + route checklist (`wrangler.toml`, `index.ts` store catalog) |
| 5 | `npm run merch-funnel:rollout:step5` | Launch gates + physical QA checklist |
| 5 preflight | `npm run merch-funnel:rollout:step5 -- --preflight` | Automated `verify:merch-funnel` + print QA Vitest |
| 5 verify | `SITE_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:step5 -- --verify` | Preflight + production shop/customize + store API + config audit (digital gate) |
| 6 preflight | `npm run merch-funnel:rollout:step6 -- --preflight` | Rollout unit tests + `verify:merch-funnel` (no Playwright) |
| 6 | `npm run merch-funnel:rollout:step6 -- --verify` | Engineering close-out: preflight + `e2e:merch-funnel` + production shop API + `verify-config` |
| **Complete** | `npm run merch-funnel:rollout:complete -- --verify` | Step 6 + scan merch test; prints operator-only next steps |
| Post-deploy all | `npm run merch-funnel:rollout:post-deploy -- --all` | Steps 2 + 3 production verify (Pages + Worker) |

**Vitest bundle:** `npm run verify:merch-funnel` (= merch funnel + print QA + shop-config rollout tests).  
**Exit gate:** `npm run merch-funnel:verify-exit` delegates to step 6 + scan merch HTML test.

---

## FAQ

### “I already have a hoodie on Shopify to launch my store — is that the product?”

That listing is the **payment SKU**. The **product** (unique LIVE OBJECT QR per buyer) is created on **`/shop/customize/`** via artifact intent. Wire the Shopify variant into `shop-config.json`; wire Printify ids into Worker env.

### “Isn’t Printify the real merch base?”

**Yes for manufacturing.** Shopify is still required for **payments and commerce records** in v1. humanity.llc is required for **customization and trust**. All three.

### “Can I skip Shopify and sell on Printify only?”

**No for v1.** Spec and decision lock require Shopify checkout. Printify is fulfillment-only from the customer’s perspective.

### “Does buying the Shopify hoodie without going through /shop/customize/ work?”

You get a **generic** garment charge — **no artifact intent**, webhook **holds** or tier0 batch path only. Not Tier 1 personalized fulfillment. Checkout must include `properties[artifact_intent_id]` from the customizer attach flow.

### “Why not use Shopify’s Printify integration for everything?”

Auto-fulfill uses the **published static design**. Tier 1 needs **per-order unique QR artwork** — Humanity middleware after payment. See § Printify “Publish to Shopify” vs Humanity middleware.

### “Isn’t customizeability the whole point?”

**Yes.** The real product is: stranger scans wear → wants their own → **previews their QR on a hoodie/sticker on humanity.llc** → pays → receives **their** unique ink. A Shopify tester store or Printify-published listing without `/shop/customize/` + artifact intent is infrastructure setup, not launch.

### “What still blocks taking money on Tier 1?”

| Blocker | Owner |
|---------|--------|
| `personalize.checkout_open: true` + Shopify cart URLs in `shop-config.json` | Operator + Pages deploy |
| Shopify `orders/paid` webhook + Worker secrets | Operator |
| Printify env (`PERSONALIZE_*_PRINTIFY_*` + blueprint/provider) | Operator |
| ~~Per-order artwork upload in Printify submit~~ | ✅ Shipped — PR #63 |
| Physical sample QA sign-off | Operator — [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md) |
| Founding drop / lifecycle policy gates | Operator — [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) |

Code path for scan → customize → intent → webhook → queue → **artwork upload submit** is shipped; remaining gaps are **operator wiring** and **physical QA**.

---

## Privacy and trust boundaries

From [`V1_FLOW_AUDIT.md`](V1_FLOW_AUDIT.md) § Cross-System Boundaries:

- **Humanity → Shopify:** variant ids, `artifact_intent_id`, `profile_id` — not private keys or vouch secrets
- **Humanity → Printify:** artwork, fulfillment address — not verification secrets or scan analytics
- **Printify → customer:** never identity authority or “verified human” status

---

## Related

| Doc | Role |
|-----|------|
| [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) | User funnel + exit checklist |
| [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md) | Tier 0 shop + shared webhook/Printify ops |
| [`SHOP_CHECKOUT_PROD_INVESTIGATION.md`](SHOP_CHECKOUT_PROD_INVESTIGATION.md) | Why Buy button needs config + deploy |
| [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md) | Printed ink QA |
| [`V1_ASSUMPTION_REGISTER.md`](V1_ASSUMPTION_REGISTER.md) | A-001 metadata · A-004 print QA · A-006 per-item QR |
