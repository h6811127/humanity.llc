# Keys custody emphasis card — excessive vertical spacing

**Status:** **Closed** (May 2026) — steps 1–18; CI WebKit custody e2e; regression via `npm run worker:test:keys-custody` and `npm run e2e:keys-custody`  
**Surface:** `#device-keys-custody-hub`, `#device-keys-custody-wallet`, `device-keys-custody--created`, `device-keys-custody--compact`  
**Canonical spacing:** [`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md) § Internal spacing ladder · F3 stacked layout

---

## Symptom

Hub keys custody card (`KEYS CUSTODY` / “Your browser holds the private key”) shows a **large empty band** between the detail copy and the **Acknowledge** button. Card reads much taller than its content (screenshot: landing hub sheet, May 2026).

---

## Root cause

1. **Missing F3 stacked layout** — `.device-keys-custody.hc-emphasis-card` set `flex-direction: column` and `gap: var(--hc-emphasis-card-gap-section)` but **not** `justify-content: flex-start` or `flex: none` on `.hc-emphasis-card__main` (see stacked block for `#wallet-tab-hint`, `.device-cross-tab-banner`, etc. in `site/styles.css`).

2. **Inherited flex growth** — Base `.hc-emphasis-card__main` uses `flex: 1 1 12rem`. With `justify-content: space-between` on `.hc-emphasis-card`, the main block can absorb free height and push **Acknowledge** to the card bottom when the card is taller than its copy.

3. **Marketing density on a device notice** — Global comfort tokens (`padding` **20px**, section `gap` **24px**) from the May 2026 spacing ladder (F5) are appropriate for landing marketing cards, not for compact hub/wallet informational notices. Hub inset alerts (`.hub-card-status-alert`) already use tighter padding (**10px 12px**) and **8px** gap.

---

## Fix plan (execute in order)

| Step | Action | File(s) |
|------|--------|---------|
| 1 | Add **compact density** tokens on `:root` | `site/styles.css`, `site/scan-pass.css` (token sync) |
| 2 | Extend **F3 stacked** rules to `.device-keys-custody.hc-emphasis-card`: `justify-content: flex-start`, `flex: none` on `__main`, full-width actions | `site/styles.css` |
| 3 | Apply compact padding + section gap on `.device-keys-custody.hc-emphasis-card` | `site/styles.css` |
| 4 | Document compact tier in visual alignment spacing table | `HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md` |
| 5 | Vitest: stacked + compact tokens + `flex-start` on custody | `worker/tests/device-keys-custody-html.test.ts`, `device-emphasis-card-html.test.ts` |
| 6 | Cache bust `styles.css?v=` on shell pages that mount custody | `site/index.html`, `site/wallet/index.html`, `site/create/index.html`, `site/created/index.html` |
| 7 | **`npm run worker:bundle-scan`** — sync compact tokens into scan bundle | `worker/src/resolver/scan-pass-styles.ts` ([`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) § Engineering hygiene) |
| 8 | Run rollout QA commands (below) | Vitest + optional wallet e2e |

**Do not** lower global `--hc-emphasis-card-gap-section` (24px) — landing / cross-tab marketing cards keep comfort density.

---

## Acceptance

- Copy and **Acknowledge** sit with **~12px** section rhythm (compact token), no internal dead band.
- Hub, wallet, created, and compact custody variants share the same density.
- **Regression:** `npm run worker:test:keys-custody` · `npm run e2e:keys-custody` · `npm run worker:test:ui-color-scheme` ([`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) § QA)
- **Manual:** [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P1-KC** (hub + wallet, light + dark)

---

## Follow-up — phase 4 created column cards (step 9)

Same root cause as keys custody: column `hc-emphasis-card` without F3 stacked layout inherits `justify-content: space-between` and `flex: 1 1 12rem` on `__main`.

| Step | Action | Selectors |
|------|--------|-----------|
| 9 | Apply compact stacked layout | `#no-session`, `#created-error`, `#live-control-proof`, `#created-vouch-return-banner`, `#owner-revoked-banner`, `.revoke-id-warning` | **Shipped** |
| 10 | Bump `styles.css?v=` on shell pages | `site/index.html`, `wallet/`, `create/`, `created/` | **Shipped** `v=125` |
| 11 | Vitest guards for `flex-start` on created column cards | `device-emphasis-card-html.test.ts` | **Shipped** |

---

## Acceptance — automated (step 12)

| Step | Action | Status |
|------|--------|--------|
| 12 | E2E: wallet + hub keys custody compact layout (detail ↔ Acknowledge gap, `flex-start`, `__main` not growing) | `e2e/device-os-wallet.spec.ts` | **Shipped** |
| 13a | Runbook: **P1-KC** in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) | Manual checklist | **Shipped** |
| 13b | E2E: Acknowledge dismiss persists; dark theme readable on wallet custody | `e2e/device-os-wallet.spec.ts` | **Shipped** |
| 13c | WebKit regression: wallet + hub custody compact layout and Acknowledge styling | `e2e/keys-custody-emphasis-webkit.spec.ts` (webkit + iphone-13-pro) | **Shipped** |
| 13d | iPhone 13 Pro project (same spec as 13c) | `npm run e2e:keys-custody:webkit` | **Shipped** |

---

## Closeout (step 14)

| Step | Action | Status |
|------|--------|--------|
| 14a | Bundle Vitest: `npm run worker:test:keys-custody` | **Shipped** |
| 14b | Bundle e2e: `npm run e2e:keys-custody` (chromium custody tests) | **Shipped** |
| 14c | `prefers-reduced-transparency` opaque fallback on `.hc-emphasis-card` | `device-emphasis-card-html.test.ts` (phase B CSS guard) | **Shipped** |
| 14d | Optional physical iPhone spot-check | Operator — only if WebKit CI fails or UX doubt | As needed |

---

## Post-close (step 15)

| Step | Action | Status |
|------|--------|--------|
| 15a | CI: `e2e/keys-custody-emphasis-webkit.spec.ts` on push (WebKit + iPhone 13 Pro) | `.github/workflows/test-site.yml` | **Shipped** |
| 15b | `AGENTS.md` regression commands | `worker:test:keys-custody` · `e2e:keys-custody` | **Shipped** |
| 15c | Acceptance section uses bundled scripts (below) | This file | **Shipped** |

---

## Archive (step 16)

| Step | Action | Status |
|------|--------|--------|
| 16a | Record **production mount scope** (hub + wallet only) | This file § Mount scope | **Shipped** |
| 16b | Align rollout doc: compact/created HTML shipped; mounts optional | [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) | **Shipped** |
| 16c | Rollout QA item 6 → `e2e:keys-custody` when custody chrome changes | [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) § QA | **Shipped** |

### Mount scope

| Variant | Mount point | Production |
|---------|-------------|------------|
| `hub` | `#device-keys-custody-hub` · `landing-device-hub.mjs` | **Yes** |
| `wallet` | `#device-keys-custody-wallet` · `wallet-page.mjs` | **Yes** |
| `created` | `#device-keys-custody-created-setup` · `created-setup.mjs` (setup save step, unsaved keys) | **Yes** (step 17) |
| `compact` | `#create-public-card-notice` on `/create/` (static warn card; same compact F3) | **Yes** (step 18) — `device-keys-custody--compact` HTML not mounted |

Spacing/CSS for hub/wallet/created custody uses `.device-keys-custody.hc-emphasis-card`; create uses `#create-public-card-notice` in the same compact stacked block.

**No further engineering steps** after 18 unless CI regresses — see [`DEVICE_SHELL_E2E_CI_REMEDIATION.md`](DEVICE_SHELL_E2E_CI_REMEDIATION.md) **step 2** (wallet foot placement vs detail→Acknowledge E2E gap).

---

## CI regression (step 19)

| Step | Action | Status |
|------|--------|--------|
| 19 | Wallet `--wallet` foot links below Acknowledge (not between detail and button) | [`DEVICE_SHELL_E2E_CI_REMEDIATION.md`](DEVICE_SHELL_E2E_CI_REMEDIATION.md) step 2 | **Shipped** |

---

## Product mount (step 17)

| Step | Action | Status |
|------|--------|--------|
| 17a | Mount `created` variant in setup wizard save panel | `created-setup.mjs` · `#device-keys-custody-created-setup` | **Shipped** |
| 17b | Hide when wallet saved or global custody dismiss | `syncSetupKeysCustody()` | **Shipped** |
| 17c | E2E: `fresh=1` setup shows warn custody card above keys strip | `e2e/device-os-wallet.spec.ts` | **Shipped** |

---

## Create compact parity (step 18)

| Step | Action | Status |
|------|--------|--------|
| 18a | Compact F3 stacked layout on `#create-public-card-notice` (create warn card) | `site/styles.css` | **Shipped** |
| 18b | Vitest guard for `flex-start` + `flex: none` on create notice | `device-emphasis-card-html.test.ts` | **Shipped** |
| 18c | `styles.css?v=` bump on `/create/` | `site/create/index.html` | **Shipped** |
| 18d | P1-KC runbook: `/created/?fresh=1` setup custody card | [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) | **Shipped** |
