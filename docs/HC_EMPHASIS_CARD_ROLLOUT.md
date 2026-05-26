# Emphasis card rollout (`hc-emphasis-card`)

**Status:** Phase 0 shipped · Phase 1 next  
**Visual standard:** [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md) § Emphasis notice cards  
**Primary CSS:** `site/styles.css`, `site/css/theme-dark.css`

---

## What this is

Shared **raised notice cards** for high-salience device warnings and actions: shadow-only 3D depth, opaque neutral fills, semantic color in eyebrow/dot/CTA—not a painted rim.

Replaces over time: flat `.hc-notice` strips, plain `<p>` cross-tab lines, and amber bordered `.wallet-strip-hint` boxes where a card + CTA is appropriate.

---

## Markup contract

```html
<div
  class="hc-emphasis-card hc-emphasis-card--{active|info|warn|urgent}"
  id="…"
  role="status"
  hidden
>
  <div class="hc-emphasis-card__main">
    <span class="hc-emphasis-card__dot hc-emphasis-card__dot--{success|info|warn|urgent}" aria-hidden="true"></span>
    <div class="hc-emphasis-card__copy">
      <p class="hc-emphasis-card__eyebrow" id="…-eyebrow">EYEBROW</p>
      <p class="hc-emphasis-card__title" id="…-title">Optional title</p>
      <p class="hc-emphasis-card__detail" id="…-detail">Body copy.</p>
    </div>
  </div>
  <a class="hc-emphasis-card__cta" href="…">Action</a>
  <!-- or <button type="button" class="hc-emphasis-card__cta"> -->
</div>
```

| Modifier | Use when | Eyebrow | Dot | Fill |
|----------|----------|---------|-----|------|
| `--active` | Keys live in **this** tab | Green | `--success` | Gray-green neutral |
| `--info` | Cross-tab keys, custody, informational CTA | Blue | `--info` | Cool gray neutral |
| `--warn` | Reversible risk, setup gates | Amber | `--warn` | Warm gray neutral |
| `--urgent` | Live proof, revoke, errors | Red | `--urgent` | Warm gray neutral |

**IDs:** Keep stable `id`s for JS (`#wallet-active-banner`, `#wallet-active-label`, etc.) even when classes migrate.

**Legacy aliases:** `.wallet-active-banner` and `.wallet-active-*` remain valid aliases to `.hc-emphasis-card` / `__*` through Phase 1 (do not remove until call sites migrate).

---

## CSS tokens (`:root`)

| Token | Role |
|-------|------|
| `--hc-emphasis-card-shadow` | Shared inset + outer lift (light/dark override) |
| `--hc-emphasis-card-fill-{active,info,warn,urgent}` | Opaque gradients per modifier |
| `--hc-emphasis-card-eyebrow-{active,info,warn,urgent}` | Eyebrow text color per modifier |

Default CTA: `.hc-emphasis-card__cta` uses `var(--red)` pill (brand primary action).

---

## Rollout phases

| Phase | Scope | Status |
|-------|--------|--------|
| **0** | Extract `.hc-emphasis-card` + four modifiers; migrate `#wallet-active-banner` markup/classes; Vitest guard | **Shipped** |
| **1** | `#wallet-tab-hint` → `--info` card; `#device-cross-tab-banner` on `/wallet/` + `/` (`device-cross-tab-banner.mjs`) | Next |
| **2** | `#scan-cross-tab-banner` (`scan-pass.css` + `device-cross-tab-banner.mjs`) | Planned |
| **3** | `.live-control-notification` on `/created/` → `--urgent` | Planned |
| **4** | Create custody + revoke / no-session `hc-notice` → `--warn` / `--urgent` | Planned |
| **5** | `.hub-card-status-alert` inset `--warn` (optional) | Planned |

### Phase 0 — shipped

- Shared block in `site/styles.css` (`.hc-emphasis-card`, `__main`, `__dot`, `__copy`, `__eyebrow`, `__title`, `__detail`, `__cta`)
- Modifiers `--active`, `--info`, `--warn`, `--urgent` (fills + eyebrow tokens; dots per semantic)
- `site/wallet/index.html` uses `hc-emphasis-card hc-emphasis-card--active` (+ legacy `wallet-active-*` classes)
- Dark overrides for fills and typography in `theme-dark.css`
- `worker/tests/ui-color-scheme-popover-guard.test.ts` guards `.hc-emphasis-card`

### Phase 1 — next (wallet + landing cross-tab)

| Surface | File(s) | Target |
|---------|---------|--------|
| `#wallet-tab-hint` | `site/wallet/index.html`, `wallet-page-chrome.mjs` | `hc-emphasis-card--info` with **Open that tab** / copy from inbox |
| `#device-cross-tab-banner` | `site/index.html`, `site/wallet/index.html`, `device-cross-tab-banner.mjs` | Render card HTML instead of flat `hc-notice--info` paragraph |

**Acceptance:** Cross-tab visible on wallet/landing matches active banner depth; no blue rim; CTAs as pills where applicable.

### Phase 2–5

See tier tables in [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md) § Rollout candidates.

---

## Related docs (update per phase)

| Phase | Docs |
|-------|------|
| 0–1 | This file, `UI_COLOR_SCHEME_STANDARD.md`, `CARD_WORKSPACE_UX.md` |
| 1 | `CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md`, `DEVICE_INBOX.md` |
| 2 | `SCAN_PAGE_DEVICE_DOT.md`, `M3_SCAN_PAGE_UI.md` |
| 3–4 | `CARD_WORKSPACE_UX.md`, `CREATED_TASK_DASHBOARD.md`, `DEVICE_HUB_REPAIR_SPEC.md` |

---

## QA (every phase)

1. Light + dark theme on target page.
2. No blue (or semantic) **rim** from translucent fill—only shadow depth.
3. Eyebrow, title, detail, CTA readable; tap targets ≥44px where buttons.
4. `npm run worker:test:ui-color-scheme`
5. Wallet/cross-tab: `npm run e2e -- e2e/device-os-wallet.spec.ts` when touching wallet chrome.

---

## Out of scope

Glance rows, inbox sheet rows, solid `.device-hub-notice-banner` full-bleed taps, marketing `.research-live-banner`.
