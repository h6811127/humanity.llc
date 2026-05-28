# Device shell E2E — CI remediation

**Status:** In progress (May 2026)  
**CI job:** [`.github/workflows/test-site.yml`](../.github/workflows/test-site.yml) → **Device shell E2E**  
**Related:** [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) · [`KEYS_CUSTODY_EMPHASIS_CARD_SPACING_INVESTIGATION.md`](KEYS_CUSTODY_EMPHASIS_CARD_SPACING_INVESTIGATION.md) · [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md)

---

## Failure summary (2026-05-28)

| Step | Spec / surface | Symptom | Root cause |
|------|----------------|---------|------------|
| **1** | Pages dev (`site/_redirects`) | `Infinite loop detected` for `/shop/products/*` | Rewrite target `index.html` is normalized by Pages and re-matches the splat rule ([same class of bug as `/create`](site/_redirects) comment) |
| **2** | `e2e/device-os-wallet.spec.ts` · `e2e/keys-custody-emphasis-webkit.spec.ts` | `detail` ↔ **Acknowledge** gap **66–68px** (limit **&lt; 56**) | Wallet custody puts `.hc-notice-foot` **inside** `__main` between detail and the actions row; E2E measures detail bottom → ack top |
| **3** | `e2e/merch-funnel-customize.spec.ts` | Stays on `/created/?…&hc_ref=scan_customize` | `created-merch-funnel.mjs` shows customize CTA card only; E2E + exit checklist expect **auto-redirect** to `/shop/customize/` on fresh `scan_customize` create |
| — | Wrangler / workerd stderr | `Broken pipe` on Playwright teardown | Benign shutdown noise when Pages dev stops worker; not a product failure |

**Passing:** 84 specs in the Device shell E2E bundle; worker Vitest gate runs before Playwright in the same workflow.

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

### Step 2 — Keys custody wallet layout (detail → Acknowledge gap)

**Intent:** Restore compact stacked rhythm per [`KEYS_CUSTODY_EMPHASIS_CARD_SPACING_INVESTIGATION.md`](KEYS_CUSTODY_EMPHASIS_CARD_SPACING_INVESTIGATION.md); help/import foot **below** Acknowledge, not between detail and button.

| Action | File |
|--------|------|
| Move `.hc-notice-foot` out of `__main` extra copy for `--wallet` (and hub if needed) | `site/js/device-keys-custody.mjs` |
| Optional CSS: foot margin when it follows `__actions` | `site/styles.css` |
| Bump `styles.css?v=` on shell pages if CSS changes | `site/index.html`, `site/wallet/index.html`, … |

**Verify:**

```bash
npm run worker:test:keys-custody
npm run e2e:keys-custody
npm run e2e:keys-custody:webkit
npm run e2e -- e2e/device-os-wallet.spec.ts -g "keys custody"
```

---

### Step 3 — Merch funnel `scan_customize` auto-redirect

**Intent:** Match [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) exit checklist (“Create card → `/shop/customize/` detects session”) and `e2e/merch-funnel-customize.spec.ts`.

| Action | File |
|--------|------|
| On fresh create with `scan_customize` (or other `CUSTOMIZE_HANDOFF_REFS`), `location.replace()` to customize URL after session is readable | `site/js/created-merch-funnel.mjs` |
| Keep customize CTA card as fallback when redirect blocked / no session | same |

**Verify:**

```bash
npm run worker:test:merch-funnel
npm run e2e -- e2e/merch-funnel-customize.spec.ts
```

---

### Step 4 — CI sign-off

Re-run the full Device shell E2E job locally before merge:

```bash
npm run e2e:install
npm run e2e -- e2e/device-status-dot.spec.ts e2e/device-inbox.spec.ts e2e/device-os-wallet.spec.ts e2e/scan-page-dot.spec.ts e2e/safari-shell-scroll.spec.ts e2e/scan-cross-tab-banner-webkit.spec.ts e2e/keys-custody-emphasis-webkit.spec.ts e2e/merch-funnel-customize.spec.ts
```

Update this doc **Status** to **Closed** when all steps pass in CI.

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-28 | Opened from CI Device shell E2E failures (3 Playwright specs + `_redirects` warning) |
| 2026-05-28 | **Step 1 shipped:** product detail shell → `detail.html`; `_redirects` splat target updated |
