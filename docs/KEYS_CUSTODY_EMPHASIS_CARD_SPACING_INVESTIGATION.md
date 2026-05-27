# Keys custody emphasis card — excessive vertical spacing

**Status:** **Fixed** (May 2026) — compact tokens + F3 stacked layout shipped; `styles.css?v=124` on shell pages  
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

**Do not** lower global `--hc-emphasis-card-gap-section` (24px) — landing / cross-tab marketing cards keep comfort density.

---

## Acceptance

- Copy and **Acknowledge** sit with **~12px** section rhythm (compact token), no internal dead band.
- Hub, wallet, created, and compact custody variants share the same density.
- `npm run worker:test -- worker/tests/device-keys-custody-html.test.ts worker/tests/device-emphasis-card-html.test.ts`
