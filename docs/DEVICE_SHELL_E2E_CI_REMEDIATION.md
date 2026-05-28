# Device shell E2E — CI remediation

**Status:** **Closed** (May 2026) — steps 1–4 shipped; full Device shell E2E bundle passes locally (87 passed, 1 skipped WebKit touch profile)  
**CI job:** [`.github/workflows/test-site.yml`](../.github/workflows/test-site.yml) → **Device shell E2E**  
**Related:** [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) · [`KEYS_CUSTODY_EMPHASIS_CARD_SPACING_INVESTIGATION.md`](KEYS_CUSTODY_EMPHASIS_CARD_SPACING_INVESTIGATION.md) · [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md)

---

## Failure summary (2026-05-28)

| Step | Spec / surface | Symptom | Root cause |
|------|----------------|---------|------------|
| **1** | Pages dev (`site/_redirects`) | `Infinite loop detected` for `/shop/products/*` | **Fixed 2026-05-28:** splat rewrite targets `detail.html` (not `index.html`) |
| **2** | `e2e/device-os-wallet.spec.ts` · `e2e/keys-custody-emphasis-webkit.spec.ts` | `detail` ↔ **Acknowledge** gap **66–68px** (limit **&lt; 56**) | **Fixed 2026-05-28:** wallet `.hc-notice-foot` moved below Acknowledge (`afterActionsHtml`) |
| **3** | `e2e/merch-funnel-customize.spec.ts` | Stays on `/created/?…&hc_ref=scan_customize` | **Fixed 2026-05-28:** `created-merch-funnel.mjs` auto-redirects fresh customize handoffs when `hc_created` is readable |
| — | Wrangler / workerd stderr | `Broken pipe` on Playwright teardown | Benign shutdown noise when Pages dev stops worker; not a product failure |

**Passing:** 87 specs in the Device shell E2E bundle (1 skipped WebKit touch profile on desktop); worker Vitest gate runs before Playwright in the same workflow.

---

## Remediation plan (execute in order)

### Step 1 — Fix `/shop/products/*` Pages rewrite (no `index.html` target)

**Intent:** Silence the invalid redirect warning and avoid ambiguous SPA routing during `pages:dev` / CI.

| Action | File |
|--------|------|
| Rename product detail shell `index.html` → `detail.html` | `site/shop/products/detail.html` |
| Point splat rewrite at `detail.html` (does not re-match splat) | `site/_redirects` |

**Verify:**

```bash
npm run pages:dev
# In another shell — should 200 without redirect-loop warning on first request:
curl -sI http://127.0.0.1:8788/shop/products/sticker_personalized_v1/ | head -5
npm run worker:test -- worker/tests/shop-product-detail-core.test.ts
```

---

### Step 2 — Keys custody wallet layout (detail → Acknowledge gap) ✅

**Intent:** Restore compact stacked rhythm per [`KEYS_CUSTODY_EMPHASIS_CARD_SPACING_INVESTIGATION.md`](KEYS_CUSTODY_EMPHASIS_CARD_SPACING_INVESTIGATION.md); help/import foot **below** Acknowledge, not between detail and button.

| Action | File |
|--------|------|
| Move `.hc-notice-foot` out of `__main` extra copy for `--wallet` (and hub if needed) | `site/js/device-keys-custody.mjs` |
| Optional CSS: foot margin when it follows `__actions` | `site/styles.css` |
| Bump `styles.css?v=` on shell pages if CSS changes | `site/index.html`, `site/wallet/index.html`, … |

**Shipped:** wallet `.hc-notice-foot` via `afterActionsHtml` on `emphasisCardShellHtml` (below Acknowledge, not inside `__main`).

**Verify:**

```bash
npm run worker:test:keys-custody
npm run e2e:keys-custody
npm run e2e:keys-custody:webkit
npm run e2e -- e2e/device-os-wallet.spec.ts -g "keys custody"
```

---

### Step 3 — Merch funnel `scan_customize` auto-redirect ✅

**Intent:** Match [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) exit checklist (“Create card → `/shop/customize/` detects session”) and `e2e/merch-funnel-customize.spec.ts`.

| Action | File |
|--------|------|
| On fresh create with `scan_customize` (or other `CUSTOMIZE_HANDOFF_REFS`), `location.replace()` to customize URL after session is readable | `site/js/created-merch-funnel.mjs` |
| Keep customize CTA card as fallback when redirect blocked / no session | same |

**Shipped:** `shouldAutoRedirectCreatedToCustomize` in `merch-funnel-core.mjs`; redirect when `hc_created` has signing keys, else show CTA card.

**Verify:**

```bash
npm run worker:test:merch-funnel
npm run e2e -- e2e/merch-funnel-customize.spec.ts
```

---

### Step 4 — CI sign-off ✅

**Status:** **Shipped** — full bundle run locally (2026-05-28): 87 passed, 1 skipped (`safari-shell-scroll` touch profile on desktop WebKit only).

Re-run the full Device shell E2E job locally before merge (same bundle as [`.github/workflows/test-site.yml`](../.github/workflows/test-site.yml)):

```bash
npm run e2e:install   # once per machine
npm run device-shell:e2e:signoff
# or: npm run device-shell:e2e
```

Spec list: `worker/scripts/device-shell-e2e-specs.mjs` · Vitest guard: `npm run worker:test -- worker/tests/device-shell-e2e.test.ts`.

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-28 | Opened from CI Device shell E2E failures (3 Playwright specs + `_redirects` warning) |
| 2026-05-28 | **Step 4 tooling:** `device-shell:e2e` / `device-shell:e2e:signoff` + shared spec list; CI uses `npm run device-shell:e2e` |
| 2026-05-28 | **Step 1 shipped:** product detail shell → `detail.html`; `_redirects` splat target updated |
| 2026-05-28 | **Step 2 shipped:** wallet keys custody foot below Acknowledge (`afterActionsHtml`) |
| 2026-05-28 | **Step 3 shipped:** fresh customize handoff auto-redirect from `/created/` |
| 2026-05-28 | **Step 4 shipped:** full Device shell E2E bundle — 87 passed, 1 skipped (WebKit touch profile); doc **Closed** |
| 2026-05-28 | **P1-LW / S12:** `e2e/device-hub-large-wallet-summary.spec.ts` added to bundle (90 specs with new file) |
