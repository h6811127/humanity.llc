# Merch funnel MVP — scan → profile → customize → Printify

**Status:** Active — customizer UI shipped; operator enables products in `shop-config.json`  
**Parent:** [`MERCH_LED_V1.md`](MERCH_LED_V1.md) · [`V1_FLOW_AUDIT.md`](V1_FLOW_AUDIT.md) · [`features/Storefront v1.0.md`](features/Storefront%20v1.0.md)  
**Implementation:** [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md) · `site/shop/customize/` · honesty copy [`MERCH_PRODUCT_COPY.md`](MERCH_PRODUCT_COPY.md) (**shipped** on PDP + customizer)  
**Visual choreography:** [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) — physical → scan notary → customize/created delight (two registers, five beats)

---

## Implementation priority stack (2026-05-27)

Ordered work after repo review. Update row status as steps complete. Cross-links: [`AI_FEATURE_DEVELOPMENT.md`](AI_FEATURE_DEVELOPMENT.md) · [`PHASE_A_STRANGER_PATH_PRIORITIES.md`](PHASE_A_STRANGER_PATH_PRIORITIES.md) · [`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md) · [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) § Open issues · headless commerce [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md).

| Priority | Work | Type | Status |
|----------|------|------|--------|
| **1** | **Merch funnel close-out** — scan → `/shop/customize/` (`scan_customize` ref + CTA); enable Tier 1 in `shop-config.json`; prove one paid personalized order (intent → webhook → mint → Printify submit) | Engineering + operator | **Engineering ✅** (2026-05-29: `verify-exit:fast`, `e2e:merch-funnel` 8/8, scan merch regression) · **Operator phase active:** paste variant URLs · `step2 -- --verify --strict` · live payment + Printify · physical QA [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md) |
| **2** | **Phase A trust MVP** — run M5 stranger runbook (3 outsiders, unassisted create → scan → revoke) | Validation | **✅ Passed 2026-05-27** — [`M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md) |
| **3** | **Hosted steward production rollout** — `hosted:rollout:step*` through step 6 (secrets, flag, CF dashboard, regression) | Ops | **Nearly complete** — 5a ✅ · 5b preflight ✅ · 6 Vitest + E2E ✅ · 4b prod smoke ✅ · **remaining:** `OPERATOR_AUDIT_TOKEN=… npm run hosted:rollout:step5b -- --verify` |
| **4** | **AI P1 product decision** — keep / rename / deterministic-only / remove scan reader (no new L3 user features until Phase A) | Product | ☐ |
| **5** | **Large-wallet shell performance** — bound `hc_wallet_network_cache`, avoid full-wallet parse on hub/inbox hot paths | Engineering debt | **✅ Shipped** — S6–S12 + `hc_wallet_summary` (see `DEVICE_OS_REQUEST_BUDGET.md`) |
| **6** | **Ephemeral state UX (Tier 1 WEAR)** — unlock owner update without revoke-first gate; Tier 1 `/shop/thanks/` → `/created/#update-status` | Engineering | **✅ Shipped** — [`EPHEMERAL_STATE_AND_MERCH.md`](EPHEMERAL_STATE_AND_MERCH.md) |
| **7** | **Merch visual choreography (V1–V4)** — customize preview Settle, created live object card, thanks activation, preview-as-stranger handoff; scan notary unchanged | Product + design | **✅ V1–V4 shipped** — [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) |

**Rule:** Do not start new L3 user-facing AI surfaces until priority **2** passes. Commerce never grants vouch. Owner-surface motion (priority **7**) must not regress stranger scan Settle or 5-second comprehension.

### Operator close-out (after engineering + M5)

**Engineering sign-off (2026-05-29):** `merch-funnel:rollout:complete -- --preflight` · `e2e:merch-funnel` (M1–M2 sad paths + checkout handoff + customize + Glitch PDP) · scan merch HTML regression (`worker/tests/scan.test.ts` `-t merch`).

**Blocking live Tier 1 checkout today** (`npm run merch-funnel:verify-config`):

| Blocker | Status |
|---------|--------|
| `personalize.checkout_open` | `false` (correct until QA) |
| `glitch_hoodie_v1` in `personalize.products` + Shopify variant | **pending** — founding launch SKU ([`MERCH_PRODUCT_COPY.md`](MERCH_PRODUCT_COPY.md)) |
| `hoodie_live_object_v1` `checkout_url` + `shopify_variant_id` | empty — paste from Shopify (optional generic SKU) |
| `sticker_personalized_v1` `checkout_url` + `shopify_variant_id` | empty — paste from Shopify |
| Physical ink QA | not signed — [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md) |
| Live paid order → Printify submit | not proven — [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) |

**Operator sequence:**

1. Paste Shopify cart permalinks into `site/data/shop-config.json` (template: `site/data/shop-config.example.json`).
2. `npm run pages:deploy` then `SITE_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:step2 -- --verify --strict`.
3. `npm run merch-funnel:verify-config -- --require-checkout` (must pass before enabling checkout).
4. Prove one paid personalized order (intent → webhook → mint → Printify submit).
5. Complete physical ink QA — [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md).
6. Set `personalize.checkout_open: true`, redeploy Pages, re-run step 2 verify.
7. Optional stranger row: scan live wear → customize CTA → understands scan does not prove ownership.

**M5 (Priority 2):** passed 2026-05-27 — digital stranger path per [`M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md). Preflight: `npm run site:verify-positioning-exit`.

---

## One-sentence MVP

A stranger **scans live wear**, sees the wearer’s **signed profile** (optional plain-language reader), wants their own, **creates a card**, **customizes a branded QR** on a **Printify product**, and **checks out on humanity.llc** — without touching Printify directly.

---

## Front door alignment (create vs buy)

Commerce and BYOP create are **carrier split**, not competing products ([`PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md`](PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md) § Create vs buy hoodie).

| Surface | Path | Revenue | Same primitive |
|---------|------|---------|----------------|
| **Scan → want** (primary merch) | Scan live wear → curiosity CTA → `/shop/customize/` → checkout → `print_artifact` mint | Yes | Live signed state on fabric |
| **`#landing-live-object-carriers`** (shipped on `/`) | Featured row → `/shop/` → customize | Yes | Teaser only — full story on `/shop/` |
| **Start with one live object** (shipped on `/`) | `/create/` deploy (BYOP) | No (today) | Sign · print own sticker/sign |
| Merch funnel step 4 | Create card before customize | Keys for buyer | Required for owned QR on purchased garment |

**Rules (do not break):**

- Never paywall sign · publish · revoke ([`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) § Create entry).
- Create in the funnel is **ownership**, not a substitute for buying the hoodie.
- Landing **`/`** teases carriers — does **not** embed checkout or duplicate `/shop/` story rows.
- **No** product carousel on `/` until catalog ≥5 distinct carriers ([`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) § Landing carriers row).
- Shipped: **“Or print your own wear”** on `/shop/customize/` → `/create/?intent=wear` (BYOP).
- UX target (step 20): wear **two tracks** in one room — fulfilled `print_artifact` (no calendar expiry) vs BYOP `card` QR (expiry honest) — [`STEWARD_UX_PRESENTATION_TARGET.md`](STEWARD_UX_PRESENTATION_TARGET.md) § Room 2.
- Commerce never grants vouch; webhook mint uses existing `print_artifact` scope — no parallel scan product.

**Architecture alignment:** `POST /v1/store/artifact-intents`, Shopify webhook, and steward `/created/` Live share one resolver; [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) lifecycle unchanged.

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

**How each step should feel** (owner delight vs stranger notary): [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) § Five beats.

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

## Product tiers (2026-05-30 launch)

| Tier | QR model | Customizer | Launch SKUs |
|------|----------|------------|-------------|
| **Tier 0** curiosity | Batch / shared campaign QR | Not used — founding sticker as-is | `tier0_founding_sticker_v1` |
| **Tier 1** belonging | Unique `print_artifact` per unit | **`/shop/customize/`** | **`glitch_hoodie_v1`** (founding drop, target) · `hoodie_live_object_v1` · `sticker_personalized_v1` |

**Glitch hoodie launches Tier 1** — fixed Glitch art, unique QR per buyer, owner keys. Shared-batch `tier0_glitch_hoodie_v1` is **deprecated for launch** ([`MERCH_PRODUCT_COPY.md`](MERCH_PRODUCT_COPY.md)).

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

4. Verify config locally: `npm run merch-funnel:verify-config` (use `--require-checkout` in CI when enabling payments).
5. Deploy Pages. `/shop/customize/` shows **Continue to checkout** when card session exists and `checkout_open` is true.
6. **Deploy Worker** — `npm run worker:deploy` — `humanity.llc/v1/*` must route to the resolver (else artifact intent returns 405).
7. **Worker env (Tier 1 Printify queue):** after Shopify `orders/paid` webhook validates artifact intent metadata, a print order is queued automatically. Set Printify mappings per product template (secrets via `wrangler secret` where noted):

| Template | Env vars |
|----------|----------|
| `hc-hoodie-live-object-v1` | `PERSONALIZE_HOODIE_PRINTIFY_PRODUCT_ID`, `PERSONALIZE_HOODIE_PRINTIFY_VARIANT_ID`, optional `PERSONALIZE_HOODIE_PRINTIFY_SHIPPING_METHOD` |
| `hc-sticker-square-v1` | `PERSONALIZE_STICKER_PRINTIFY_PRODUCT_ID`, `PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID`, optional `PERSONALIZE_STICKER_PRINTIFY_SHIPPING_METHOD` |

Shared: `PRINTIFY_SUBMIT_ENABLED=1`, `PRINTIFY_API_TOKEN` (secret), `PRINTIFY_SHOP_ID`, `SHOPIFY_WEBHOOK_SECRET` (secret), `FULFILLMENT_PII_ENCRYPTION_KEY` (secret — 32-byte base64; captures Shopify shipping on paid webhook). Operator submits via `POST /v1/print/orders` with `{ commerce_order_id, submit_to_printify: true }` after minting planned QRs — omit `shipping_address` to use encrypted store, or pass it to override. Same path as Tier 0 ([`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md)).

8. Run [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) gates before live payments.
9. **Apparel QA:** physical scan test on printed hoodie ([`V1_ASSUMPTION_REGISTER.md`](V1_ASSUMPTION_REGISTER.md) A-004) — runbook [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md); automated regression: `npm run worker:test:merch-print-qa`.
10. **Engineering rollout:** `npm run merch-funnel:rollout:step1` → `step6` — see [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) § Production rollout commands.

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
| `customize_glitch` | Customizer with **Glitch hoodie** selected (launch target) |
| `customize_hoodie` | Customizer with generic Live Object hoodie selected |
| `scan_customize` | Scan page → customize CTA on live wear / print_artifact scans |
| ~~`tier0_glitch`~~ | ~~Shared-batch Glitch PDP~~ — **deprecated**; use `customize_glitch` |

---

## Exit checklist (MVP)

| Step | Pass? |
|------|-------|
| Glitch launch via `/shop/customize/` (`glitch_hoodie_v1` target) | ☐ engineering rewire — [`MERCH_PRODUCT_COPY.md`](MERCH_PRODUCT_COPY.md) § Engineering rewire |
| Legacy Glitch PDP (`tier0_glitch_hoodie_v1`) + store API | ✅ smoke/E2E only — **not** launch checkout path |
| Stranger scans campaign merch; profile loads with limits + customize CTA | ✅ scan hint · ☐ manual stranger QA |
| Create card → `/shop/customize/` detects session | ✅ redirect + E2E `e2e/merch-funnel-customize.spec.ts` |
| Preview shows LIVE OBJECT branded QR on product mockup | ✅ UI |
| Artifact intent created; attach returns Shopify line attributes | ✅ API tests |
| Checkout URL includes `properties[artifact_intent_id]` | ✅ `shop-customize-core.test.ts` |
| Paid webhook → print queue → mint planned QRs | ✅ `shopify-orders-webhook` + `merch-funnel-paid-mint-path` · ☐ live Printify submit |
| Paid webhook → Printify queue (operator env) | ✅ queue on paid webhook · Tier 1 template + Printify env mapping |
| Per-order artwork upload to Printify on submit (PM-FR-13) | ✅ `printify-upload.ts` · `printify-line-items.ts` — requires `PERSONALIZE_*_PRINTIFY_BLUEPRINT_ID` + `PRINT_PROVIDER_ID` |
| Buyer order status on `/shop/thanks/` (O-003) | ✅ `GET /v1/store/order-status` · email hash lookup · no shipping PII in response |
| Encrypted shipping from Shopify webhook (PM-FR-41) | ✅ `commerce_fulfillment_pii` · decrypt on Printify submit · body override still supported |
| Tracking links + reconciliation polling (O-003) | ✅ Printify webhook + 30m cron poll · buyer `/shop/thanks/` tracking link |
| Tier 1 `shop-config.json` ready | `npm run merch-funnel:verify-config` · ☐ operator paste variant URLs |
| Checkout opens Shopify with `artifact_intent_id` | ✅ E2E stub · ☐ live Shopify test payment |
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

## Tests

```bash
npm run merch-funnel:rollout:step6 -- --preflight   # local Vitest gate before Playwright
npm run merch-funnel:rollout:complete -- --verify # step 6 + scan merch (engineering done → operator QA)
npm run merch-funnel:verify-exit          # same as step 6 --verify + scan merch (no production smoke)
npm run merch-funnel:verify-exit:fast     # step 6 --preflight only (no Playwright)
npm run merch-funnel:verify-config -- --require-checkout   # CI when Tier 1 goes live
```

| Command | Covers |
|---------|--------|
| `merch-funnel:rollout:complete -- --verify` | Step 6 regression + scan merch HTML; prints operator-only next steps |
| `merch-funnel:verify-exit` | Step 6 `--verify` (no production smoke) + scan merch; `wrangler.toml` `v1/*` route guard |
| `merch-funnel:verify-exit:fast` | Step 6 `--preflight` only (no Playwright) |
| `worker:test:merch-funnel` | Ref helpers, config validation, customize core, paid webhook → mint, production route guard |
| `merch-funnel:verify-config` | Operator readiness of `site/data/shop-config.json` Tier 1 block |
| `e2e:merch-funnel` | Create → customize; checkout handoff; sad-path gate (M1–M2); **Glitch PDP** (`shop-product-detail`) — stubs `__HC_E2E_SHOP_CONFIG__` + store API on `:8787` |
| `e2e:merch-checkout-sad-path` | Card gate + checkout-closed UX only — [`MERCH_CHECKOUT_SAD_PATH_MATRIX.md`](MERCH_CHECKOUT_SAD_PATH_MATRIX.md) |

**E2E notes:** Customizer preview requires protocol-valid `profile_id` / `qr_id` (see `qr-scan-url-lock.mjs`). Playwright `page.route('**/v1/...')` does not match `http://127.0.0.1:8787/...` — use `/artifact-intents/` or start `worker:dev`. Cross-origin Shopify popups: assert `window.__HC_E2E_LAST_CHECKOUT_URL` (see `merch-funnel-checkout.spec.ts`).

---

## Related

| Doc | Role |
|-----|------|
| [`MERCH_LED_V1.md`](MERCH_LED_V1.md) | Curiosity + belonging strategy |
| [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) | Shopify + Printify operator wiring |
| [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md) | Printed artifact scan QA |
| [`MERCH_CHECKOUT_SAD_PATH_MATRIX.md`](MERCH_CHECKOUT_SAD_PATH_MATRIX.md) | Sad-path inventory before live Tier 1 checkout |
| [`AI_FEATURE_DEVELOPMENT.md`](AI_FEATURE_DEVELOPMENT.md) | Optional scan reader only |
| [`EPHEMERAL_STATE_AND_MERCH.md`](EPHEMERAL_STATE_AND_MERCH.md) | Same ink / new meaning — Tier 1 owner UX |
| [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) | Two registers, five beats, motion budget by surface |
| [`V1_IMPLEMENTATION_BACKLOG.md`](V1_IMPLEMENTATION_BACKLOG.md) | O-002 Printify adapter |
| [`features/Printify Fulfillment Middleware v1.0.md`](features/Printify%20Fulfillment%20Middleware%20v1.0.md) | Server-side fulfillment |
