# Keys custody emphasis card — excessive vertical spacing

**Status:** Steps 1–12 **shipped** (May 2026) — step 13 manual QA remains; `styles.css?v=125`  
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
- `npm run worker:test -- worker/tests/device-keys-custody-html.test.ts worker/tests/device-emphasis-card-html.test.ts`
- `npm run worker:test:ui-color-scheme` ([`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) § QA)
- `npm run e2e -- e2e/device-os-wallet.spec.ts` when wallet/hub custody chrome changed (rollout § QA item 6)
- Manual: hub + wallet keys custody, light + dark ([`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md) § QA checklist)

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
| 13 | Manual QA: light + dark hub/wallet custody; Acknowledge dismiss ([`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md) § QA) | Operator |
