# Merch checkout sad-path matrix

**Status:** Active — engineering gate before `personalize.checkout_open: true`  
**Date:** 2026-05-29  
**Audience:** Engineering, ops, QA  
**Related:** [`SAD_PATH_COVERAGE_AND_BACKLOG.md`](SAD_PATH_COVERAGE_AND_BACKLOG.md) § Commerce · [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) · [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) · [`V1_ASSUMPTION_REGISTER.md`](V1_ASSUMPTION_REGISTER.md) A-001–A-004

---

## Purpose

Tier 1 personalized checkout (`/shop/customize/`) must not go live until unhappy paths are **documented**, **automated where possible**, and **physically QA'd** where ink or money is involved.

This matrix is the canonical inventory. Cross-reference sad-path backlog item **P1 Merch checkout** in [`SAD_PATH_COVERAGE_AND_BACKLOG.md`](SAD_PATH_COVERAGE_AND_BACKLOG.md).

---

## Gate rule

Do **not** set `personalize.checkout_open: true` in deployed `site/data/shop-config.json` until:

1. Every **P0** row below has automated regression (Vitest or Playwright) **or** a signed physical QA runbook result.
2. Operator runs `npm run merch-funnel:verify-config -- --require-checkout` after config change.
3. Engineering runs `npm run merch-funnel:verify-exit` (includes sad-path E2E).

---

## Matrix

| ID | Sad path | User behavior | Expected UX / system | Automation | Manual |
|----|----------|---------------|----------------------|------------|--------|
| **M1** | No card in this tab | Opens `/shop/customize/` cold | Card gate — create or wallet; no checkout | `e2e/merch-checkout-sad-path.spec.ts` | — |
| **M2** | Checkout not live | Has card; `checkout_open: false` | Preview works; **Checkout opening soon** interest block; no checkout button | Same E2E · CSS `[hidden]` on checkout btn | — |
| **M3** | Proof consent incomplete | Checkout open; skips checkboxes | **Continue to checkout** disabled; status prompts acknowledgments | `e2e/merch-funnel-checkout.spec.ts` | — |
| **M4** | Recovery seatbelt missing | Consent complete; no backup/recovery | Backup nudge; checkout disabled; Manage CTA | `e2e/merch-funnel-checkout.spec.ts` | P1-MERCH-R in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) |
| **M5** | Print setup incomplete | Clicks checkout during card-fallback preview | Error status; refresh preview | Vitest `shop-customize-core` / manual | — |
| **M6** | Shopify paid without metadata | Buyer bypasses customize / stripped cart attrs | Webhook → `held_for_review` · `CHECKOUT_METADATA_MISSING` | `worker/tests/shopify-orders-webhook.test.ts` | Ops review queue |
| **M7** | Duplicate / replay webhook | Shopify retries same order | Idempotent processing; no double print queue | `worker/tests/shopify-orders-webhook.test.ts` | — |
| **M8** | Wrong variant / unknown SKU | Paid order for unmapped variant | Held or inventory-only path per config | `worker/tests/shopify-orders-webhook.test.ts` | — |
| **M9** | Commerce ≠ verification | Buyer expects vouch / identity proof | Proof consent copy + post-purchase thanks copy | E2E M3 + copy review | Stranger comprehension |
| **M10** | Physical QR unreliable | Scan after Printify ship | Resolver works; ink damage out of app | — | [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md) |
| **M11** | Calendar expiry vs revoke | Buyer thinks merch “expires” | Status line + revoke semantics | Copy only | Stranger FAQ |
| **M12** | Happy path handoff | Full customize → Shopify cart | Same-tab cart URL with `artifact_intent_id` | `e2e/merch-funnel-checkout.spec.ts` | Live payment smoke (ops) |

---

## Automated regression index (merch)

| ID | Command |
|----|---------|
| M1–M2 | `npm run e2e:merch-checkout-sad-path` |
| M3–M4, M12 | `npm run e2e:merch-funnel` (checkout spec) |
| M6–M8 | `npm run worker:test -- worker/tests/shopify-orders-webhook.test.ts` |
| Full gate | `npm run merch-funnel:verify-exit` |

---

## Operator checklist (before live Tier 1)

1. Physical QA sign-off — [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md)
2. `site/data/shop-config.json` — valid `checkout_url` + `shopify_variant_id` on launch SKU
3. `npm run merch-funnel:verify-config -- --require-checkout`
4. `npm run merch-funnel:rollout:step6 -- --verify`
5. Post-deploy: `npm run merch-funnel:rollout:post-deploy -- --all`

---

## Changelog

| Date | Notes |
|------|-------|
| 2026-05-29 | Initial matrix; M1–M2 E2E; cross-links to existing M3–M4, M6–M8 coverage |
