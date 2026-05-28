# Emphasis card CSS import regression (shell pages)

**Status:** Step 1–5 shipped (Step 4 automated May 2026)  
**Introduced:** Phase 2 (`1f0c517`) — extract `site/css/hc-emphasis-card.css`  
**Symptom:** `#wallet-active-banner` and other `hc-emphasis-card` surfaces on shell pages render as **unstyled text** (no shadow, dot, or pill CTA).

---

## Summary

Shell pages load `site/styles.css`, which references shared emphasis-card rules via:

```css
@import url("./css/hc-emphasis-card.css");
```

That `@import` was placed at **line ~5626** — after thousands of other rules. Per the CSS spec, `@import` must precede all other rules (except `@charset`). Browsers **ignore** mid-file imports.

**Scan resolver pages are unaffected:** `npm run worker:bundle-scan` concatenates `hc-emphasis-card.css` into `SCAN_PASS_CSS` (no `@import`).

---

## What still worked

| Layer | State |
|-------|--------|
| HTML markup | Correct — `hc-emphasis-card hc-emphasis-card--active` on `#wallet-active-banner` |
| JS | Correct — `wallet-page-chrome.mjs` only sets copy/visibility |
| `:root` tokens in `styles.css` | Present — `--hc-emphasis-card-shadow`, fills, title/detail fg |
| `theme-dark.css` modifier overrides | Present — but useless without base `.hc-emphasis-card` rules |
| Vitest guards | Read `hc-emphasis-card.css` **directly** — did not catch broken delivery via `styles.css` |

---

## Affected surfaces (shell / Pages)

All pages that rely on `styles.css` only (not scan bundle):

- `#wallet-active-banner`, `#wallet-tab-hint`, `#device-cross-tab-banner`
- `#live-control-proof`, `#no-session`, `#created-error`, `#owner-revoked-banner`
- `#create-public-card-notice`, `.revoke-id-warning`, `.hub-card-status-alert`
- Dynamically injected cards (`device-cross-tab-banner.mjs`, `device-keys-custody.mjs` `--created`)

---

## Fix plan

| Step | Action | Status |
|------|--------|--------|
| **1** | Move `@import` to **top** of `site/styles.css` (before `:root`) | **Shipped** |
| **2** | Add Vitest guard: `@import` must appear before first `{` rule block in `styles.css` | **Shipped** |
| **3** | Bump `styles.css?v=` on shell pages that ship emphasis cards (`/wallet/`, `/`, `/created/`, `/create/`, hub) | **Shipped** (`v=110`) |
| **4** | QA: wallet active banner 3D card, cross-tab pill CTAs, created live proof (light + dark) | **Shipped** — automated: `npm run e2e:shell-emphasis-card` · cross-tab pills: `npm run e2e:safari` (P1-CT); manual sign-off optional post-deploy |
| **5** | Optional: `<link href="/css/hc-emphasis-card.css">` on shell pages as belt-and-suspenders (not required if Step 1 holds) | **Shipped** — `/`, `/wallet/`, `/create/`, `/created/`, `/organizer-revoke/` |

**Do not** rely on mid-file `@import` again. Alternative long-term: explicit `<link>` on shell HTML only (no `@import` in `styles.css`).

---

## Regression test (Step 2)

`worker/tests/ui-color-scheme-popover-guard.test.ts` — assert first non-comment line in `styles.css` is the emphasis-card `@import`, or that `@import` index < `:root` index.

---

## Related

- [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) — Phases 0–5 shipped; engineering hygiene
- [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md) — emphasis card tokens and QA
