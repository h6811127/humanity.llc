# Tier 1 merch — technical feasibility (Shopify + Printify + humanity.llc)

**Status:** Engineering investigation (2026-05-28)  
**Question:** Can a buyer preview a customized hoodie on humanity.llc, pay through a Shopify checkout that feels native, and receive a Printify garment printed with **their** unique QR?  
**Short answer:** **Yes — but only with the three-system architecture already documented.** Printify is **not** the storefront or checkout. Shopify variant URLs are **required for payment**, not a mistake. Several steps are **shipped in code**; fulfillment after payment is **partially manual** by design (mint + Printify submit gates). “Native-looking” checkout does **not** mean checkout runs on `humanity.llc` or that Printify hosts the cart.

**Canonical stack:** [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) · [`V1_DECISION_LOCK.md`](V1_DECISION_LOCK.md) · [`features/Storefront v1.0.md`](features/Storefront%20v1.0.md)  
**Visual choreography:** [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) — preview mock is CSS/HTML today; planned Settle on QR land (Beat 3)

---

## Verdict (read this first)

| Your mental model | Reality in v1 |
|-------------------|---------------|
| “We use Printify for the store” | Printify is **factory only**. Customers never check out on Printify. |
| “Why paste Shopify URLs if we use Printify?” | **Shopify = cash register.** One hoodie exists as three IDs: Humanity `product_id`, **Shopify variant** (payment), **Printify product** (manufacturing). See [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) § Dual product IDs. |
| “Preview on our site → pay on our site” | Preview on humanity.llc ✅ · Payment on **Shopify’s domain** (new tab) — locked in decision lock. |
| “Pay → Printify prints automatically” | Pay → webhook queues order → **mint (owner-signed QRs)** → **operator submit to Printify** → production. Not one click end-to-end today. |
| “Publish hoodie from Printify to Shopify = personalized product” | **No.** That path is a **static** print file for every buyer. Tier 1 needs artifact intent + middleware per-order artwork ([`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) § Printify “Publish to Shopify” vs Humanity middleware). |

**Is the approach possible?** **Yes**, for the intended v1 architecture. **Is it “almost done” without operator wiring?** **No.** **Is it impossible?** **No** — but it is **not** “Printify storefront with a customizer plugin.” Treating it that way is why the stack feels incoherent.

---

## Intended architecture (three layers)

```text
┌─────────────────────────────────────────────────────────────┐
│  humanity.llc (Pages + Worker) — PRIMARY STORE EXPERIENCE   │
│  /shop/customize/ · QR preview · artifact intent · trust copy │
└───────────────────────────┬─────────────────────────────────┘
                            │ cart URL + line properties
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Shopify — CHECKOUT ONLY (cart, tax, payment, refunds)      │
│  Variant ID in shop-config.json · orders/paid webhook       │
└───────────────────────────┬─────────────────────────────────┘
                            │ paid webhook + metadata
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Humanity Worker — MIDDLEWARE (not customer-facing)         │
│  validate intent · queue print order · mint · artwork · API │
└───────────────────────────┬─────────────────────────────────┘
                            │ Printify REST API (per-order art)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Printify — FACTORY (manufacture + ship)                    │
└─────────────────────────────────────────────────────────────┘
```

This matches [`V1_DECISION_LOCK.md`](V1_DECISION_LOCK.md): headless Shopify for commerce; Printify only behind middleware; users never browse Printify.

---

## Step-by-step feasibility

### Step 1 — Stranger / buyer has a Humanity card (signing keys on device)

| | |
|---|---|
| **Requirement** | Tier 1 customizer needs `loadCardSessionForCustomize()` — profile + source `qr_id` from same-browser card session (`hc_created`). |
| **Feasible?** | **Yes** — shipped (`site/js/shop-customize.mjs`). |
| **Gap** | Buyer must **create a card on humanity.llc first**. Cannot personalize Tier 1 from scan alone without that session. Tier 0 batch sticker is the no-card path (different QR model). |

### Step 2 — Preview customized QR on hoodie mockup (humanity.llc)

| | |
|---|---|
| **Requirement** | Show branded LIVE OBJECT QR on a product mockup before pay. |
| **Feasible?** | **Yes, with caveats.** |
| **Shipped** | `POST /v1/store/artifact-intents` allocates **planned** `qr_id`s (not minted). Preview renders scan URL via `buildPlannedItemScanUrl` + `renderQrToImage` (`shop-customize.mjs`). Mockup is **CSS/HTML** (`data-preview=hoodie|sticker`), not Printify’s live mockup API. |
| **Caveats** | (1) Preview is **approximate garment art**, not Printify’s production mockup. (2) Physical ink QA is required ([`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md), A-004). (3) If intent API fails, UI can fall back to **card QR** preview — checkout is blocked in `card_fallback` mode until planned intent works. (4) **Preview Settle (V1):** one-shot vessel animation when QR lands — **✅ shipped** ([`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) Beat 3); scan notary unchanged. |

### Step 3 — Reserve customization metadata (artifact intent + attach)

| | |
|---|---|
| **Requirement** | Tie checkout to planned QR ids before payment. |
| **Feasible?** | **Yes** — shipped. |
| **Shipped** | `artifact-intents.ts`: creates intent, `attach` returns `cart_line_attributes` (`artifact_intent_id`, `profile_id`, `planned_item_qr_ids`, …). |
| **Gap** | Intent **expires**; expired checkout → webhook holds order (`ARTIFACT_INTENT_EXPIRED`). |

### Step 4 — “Native-looking” checkout (Shopify)

| | |
|---|---|
| **Requirement** | User pays; Shopify records order with line metadata for webhook. |
| **Feasible?** | **Partially** — payment works; “native” is limited. |
| **Shipped** | `buildShopifyCartUrl()` opens **new tab** to Shopify cart URL with `properties[artifact_intent_id]=…` (`shop-customize-core.mjs`). Tests assert property encoding (`shop-customize-core.test.ts`). Webhook parses line properties + note attributes (`shopify-order-metadata.ts`). |
| **What “native-looking” actually means** | Storefront v1 SF-FR-04: Shopify must stay **visually subordinate** where Shopify allows — not full embedded checkout on humanity.llc. Checkout is on **Shopify’s domain** (`*.myshopify.com` or Shopify Checkout). Branding = Shopify checkout settings + optional Plus customization — **not** controlled entirely from this repo. |
| **Critical operator detail** | **`checkout_url` must be a cart permalink** `/cart/{VARIANT_ID}:1`. Product-page or preview URLs may **not** attach line properties correctly. Docs prefer cart permalinks ([`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md), [`SHOP_CHECKOUT_PROD_INVESTIGATION.md`](SHOP_CHECKOUT_PROD_INVESTIGATION.md)). |
| **Why Shopify variant URL is required** | Shopify assigns **variant IDs** for payment SKUs. Printify has **different** product/variant IDs for manufacturing. There is **no automatic sync** — operator maps both in config + Worker env. |

### Step 5 — Shopify `orders/paid` webhook → Humanity commerce order

| | |
|---|---|
| **Requirement** | Paid order links to artifact intent; idempotent; capture shipping. |
| **Feasible?** | **Yes** — shipped. |
| **Shipped** | `shopify-orders-webhook.ts`: HMAC verify, intent validation, `commerce_order` row, encrypt shipping if `FULFILLMENT_PII_ENCRYPTION_KEY` set. |
| **Failure modes (by design)** | Missing/wrong line properties → **held_for_review** (no silent generic print). Intent already converted / expired → hold. Buyer checkout **without** going through customizer → **not Tier 1 personalized** ([`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) FAQ). |
| **Operator** | Register webhook URL on Shopify; set `SHOPIFY_WEBHOOK_SECRET` on Worker. |

### Step 6 — Queue internal print order (post-payment, pre-factory)

| | |
|---|---|
| **Requirement** | Create fulfillment record with planned QR ids from intent. |
| **Feasible?** | **Yes** — shipped. |
| **Shipped** | `queuePrintOrderAfterPaidWebhook` → `ensurePrintOrderForCommerceOrder` → status **`awaiting_production_approval`** (`fulfillment-queue.ts`). |
| **Not shipped** | **Automatic** Printify submit on webhook (intentionally deferred — operator gate). |

### Step 7 — Mint `print_artifact` QRs (cryptographic — owner-signed)

| | |
|---|---|
| **Requirement** | Planned QRs become real resolver credentials (`scope: print_artifact`, `expires_at: null`). |
| **Feasible?** | **Yes in principle** — **not automated** for production buyers today. |
| **Shipped** | `POST /v1/print/orders/{id}/mint` with **owner-signed** `qr_credentials` batch (`fulfillment-mint.ts`). Vitest covers webhook → queue → mint in test harness (`merch-funnel-paid-mint-path.test.ts`). |
| **Gap (important)** | When pre-mint at checkout fails or buyer returns on another device, **`/shop/thanks/`** offers email+order auth and owner-key signing via `POST /v1/store/order-mint`. Auto-mint on webhook still preferred when pre-mint credentials exist. |
| **Implication** | A paid Shopify order can sit in **`awaiting_production_approval`** until someone with signing keys completes mint (owner device, support tooling, or future automation you have not shipped). |

### Step 8 — Generate print artwork & submit Printify order

| | |
|---|---|
| **Requirement** | Per-unit unique QR artwork → Printify order with buyer shipping. |
| **Feasible?** | **Yes** — shipped in code, **gated in production**. |
| **Shipped** | `preparePrintifyLineItems`: render SVG from scan URL → upload → ephemeral Printify product per QR (`printify-line-items.ts`, PR #63). Submit via `POST /v1/print/orders` with `submit_to_printify: true` when `PRINTIFY_SUBMIT_ENABLED=1`. |
| **Requires** | Mint complete (`all_planned_minted`). Env: `PERSONALIZE_*_PRINTIFY_BLUEPRINT_ID`, `PRINT_PROVIDER_ID`, `PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID`, encrypted shipping from webhook. |
| **Operator** | Manual production approval ([`V1_DECISION_LOCK.md`](V1_DECISION_LOCK.md) § Production approval). |

### Step 9 — Printify produces & ships; buyer sees status

| | |
|---|---|
| **Requirement** | Tracking + honest status on humanity.llc. |
| **Feasible?** | **Yes** — largely shipped. |
| **Shipped** | Printify webhooks + reconciliation cron; `GET /v1/store/order-status`; `/shop/thanks/` lookup (PR #66). |
| **Gap** | End-to-end **live** proof (one paid order → ink in hand) not done in repo — physical QA checklist still open ([`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md)). |

---

## What is shipped vs what still blocks “it works in production”

| Layer | Shipped in repo | Still needed (ops / product) |
|-------|-----------------|------------------------------|
| Customizer + preview | ✅ | Card session; valid Worker route |
| Artifact intent API | ✅ | Worker deploy + D1 |
| Shopify handoff + properties | ✅ | **Cart permalink** + variant ID in `shop-config.json` |
| Webhook → commerce + print queue | ✅ | Webhook secret + Shopify registration |
| Per-order Printify artwork API | ✅ | Blueprint/provider env + `PRINTIFY_SUBMIT_ENABLED` |
| **Auto mint after pay** | ❌ | Owner-signed mint (manual/API today) |
| **Auto Printify submit after pay** | ❌ | Operator submit (by policy + flag) |
| Physical scan QA | ❌ | [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md) |
| Live Tier 1 checkout enabled | ❌ | `personalize.checkout_open` + real URLs + gates |

Engineering rollout scripts (`merch-funnel:rollout:step*`) validate **config and code paths** — they do **not** replace the operator table above.

---

## Risks that can make it “not work” even when code is correct

### 1. Double fulfillment (Printify Shopify app + Humanity middleware)

If the same Shopify SKU is connected to Printify’s **auto-fulfill app** *and* Humanity submits the same order via API, you can get **duplicate production jobs**. Tier 1 personalized SKUs should use **Humanity-controlled submit only** ([`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) § Do not double-fulfill).

### 2. Static Printify→Shopify publish without customizer

Buyer pays on Shopify for a hoodie published from Printify → they receive **generic** print art, and webhook may **hold** or tier0-path — **not** their unique QR.

### 3. Wrong `checkout_url` shape

Using Shopify **product preview URLs** instead of **`/cart/VARIANT:1`** may drop `properties[artifact_intent_id]` → webhook cannot link personalization → order held or wrong fulfillment mode.

### 4. Mint never happens after payment

Payment succeeds; print order stays **`awaiting_production_approval`** forever until mint + submit. Buyer sees “paid” in Shopify but no personalized garment ships.

### 5. Cloudflare / bot challenge on `/v1/*`

Production smoke may warn on `/v1/print/catalog` from curl; browser customizer uses same origin — verify on real devices ([`merch-funnel-rollout-step3.mjs`](worker/scripts/merch-funnel-rollout-step3.mjs)).

### 6. Preview ≠ production ink

Client preview and server print SVG use related pipelines but **physical QA** is mandatory (size, contrast, hood fold, scan distance).

---

## “Native-looking” checkout — honest UX spec

| Expectation | v1 delivery |
|-------------|-------------|
| Stay on humanity.llc for entire purchase | **No** — checkout opens Shopify in **new tab** (`window.open` in `shop-customize.mjs`). |
| Never see Shopify | **No** — Shopify hosts payment (decision lock). |
| Never see Printify | **Yes** — Printify is backend-only. |
| See **their** QR on mockup before pay | **Yes** — planned QR preview when intent API succeeds. |
| Garment photo matches Printify catalog exactly | **Partial** — static mockup on site, not Printify embed. |
| Pay once → factory prints unique QR automatically | **No** — mint + submit gates remain. |

For **more** native checkout (embedded Shopify, less domain switch), you would need a different integration (Shopify Storefront API / Checkout Extensibility / Plus) — **out of scope** for current v1 lock ([`Storefront v1.0.md`](features/Storefront%20v1.0.md) § 3.3 Why Not Native Checkout First).

---

## Are we “missing something”?

**Architecturally:** No hidden fourth system. The confusion is usually **role separation**: Printify ≠ checkout; Shopify variant URLs are **how payment knows which SKU was sold**; Printify env is **how factory knows what to print**.

**Operationally:** Yes — several items are **not** “flip a switch”:

1. **Three-way product mapping** (Humanity product id + Shopify variant + Printify blueprint/product).
2. **Cart permalinks** in `shop-config.json` (not just “I created a product in Shopify”).
3. **Webhook + secrets** on Worker.
4. **Post-payment mint** — biggest **product/eng gap** if you expect zero ops touch: no buyer-facing mint flow after Shopify thank-you page.
5. **Printify submit** — operator-gated by policy (`PRINTIFY_SUBMIT_ENABLED`, manual approval).
6. **Physical QA** before marketing “custom hoodie.”

**Policy doc vs code:** [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) fulfillment pipeline step 2 mentions “idempotent Printify submit” after webhook; **implementation** stops at **queued print order** — submit is a **later** explicit step. Docs in [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) § Post-payment ops are more accurate for today’s code.

---

## Minimum path to prove it once (recommended)

Use this to validate feasibility with real money and real ink — not to skip policy gates.

1. **Shopify:** Create Tier 1 variant; copy **`/cart/{variant_id}:1`** into `shop-config.json`; register `orders/paid` webhook.
2. **Printify:** Configure `PERSONALIZE_HOODIE_PRINTIFY_*` + blueprint/provider per [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) § Operator setup; disable auto-fulfill duplicate if app installed.
3. **Worker:** Deploy; set webhook secret, Printify token, PII encryption key, `PRINTIFY_SUBMIT_ENABLED=1` when ready.
4. **humanity.llc:** `personalize.checkout_open: true`; deploy Pages; run `merch-funnel:rollout:step2 -- --verify --strict`.
5. **Test purchase:** Create card → `/shop/customize/` → checkout → confirm Shopify order line shows `artifact_intent_id` property.
6. **Fulfillment:** Mint with owner keys (`POST …/print/orders/{id}/mint`) → submit with `submit_to_printify: true` → track via `/shop/thanks/`.
7. **Physical QA:** Scan printed QR per runbook.

If step 6 fails because nobody mints, the architecture is still **valid** but **not yet product-complete** for unattended buyers.

---

## Engineering follow-ups (if product requires unattended Tier 1)

These are **not** blockers to feasibility; they are **gaps vs “fully automatic”**:

| Follow-up | Why |
|-----------|-----|
| Post-checkout **mint UX** (thanks page or email deep link) using owner keys in browser | ✅ Shipped — `/shop/thanks/` + `POST /v1/store/order-mint` |
| Optional **auto-submit** after successful mint (still behind `PRINTIFY_SUBMIT_ENABLED`) | ✅ Shipped — webhook chains submit after auto-mint |
| Shopify **Checkout Extensibility** / branding pass | Closer to “native” feel |
| Embedded shipping quote (PM-FR-20) | Deferred; Shopify totals remain authority |

Do not build native Humanity checkout without revisiting [`V1_DECISION_LOCK.md`](V1_DECISION_LOCK.md).

---

## Related documents

| Doc | Use |
|-----|-----|
| [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) | Operator wiring, dual IDs, FAQ |
| [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) | Funnel + exit checklist |
| [`SHOP_CHECKOUT_PROD_INVESTIGATION.md`](SHOP_CHECKOUT_PROD_INVESTIGATION.md) | Why Shopify URL paste is required for Buy/customize |
| [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) | Mint policy, no calendar expiry on ink |
| [`EPHEMERAL_STATE_AND_MERCH.md`](EPHEMERAL_STATE_AND_MERCH.md) | Same ink / new meaning — product vs Printify ephemeral |
| [`features/Printify Fulfillment Middleware v1.0.md`](features/Printify%20Fulfillment%20Middleware%20v1.0.md) | Full middleware spec |

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-28 | Initial feasibility review — code paths + docs aligned; mint/submit automation gap documented |
