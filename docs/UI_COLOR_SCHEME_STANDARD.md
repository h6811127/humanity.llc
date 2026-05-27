# UI Color Scheme Standard (Light + Dark)

**Status:** Active standard  
**Scope:** Popups, warning cards, coachmarks, dot explainers, and similar surfaced UI across shell pages  
**Primary files:** `site/styles.css`, `site/css/device-shell.css`, `site/css/theme-dark.css`

---

## Why this exists

Ad-hoc color literals caused inconsistent contrast in dark mode (especially popup/coachmark surfaces).  
This standard defines shared semantic tokens so text/background contrast remains readable in both themes.

---

## Core rules

1. **Use semantic tokens, not raw rgba literals, for popup/warning surfaces.**
2. **Popover/popup surfaces are opaque** (or near-opaque), not translucent enough to wash out text.
3. **One token family for both themes:** light defines defaults in `:root`; dark overrides in `html[data-theme="dark"]`.
4. **Warning text must pass AA contrast intent** against its surface in both themes.
5. **Theme-specific tweaks belong in `theme-dark.css`, not inline component JS.**

---

## Standard tokens

Defined in `site/styles.css` and overridden in `site/css/theme-dark.css`:

- `--surface-popover-bg`
- `--surface-popover-fg`
- `--surface-popover-fg-muted`
- `--surface-popover-accent`
- `--surface-popover-border`
- `--surface-popover-control-bg`
- `--surface-popover-control-fg`
- `--surface-popover-notice-bg` / `--surface-popover-notice-border` / `--surface-popover-notice-fg`
- `--surface-popover-crosstab-bg` / `--surface-popover-crosstab-border` / `--surface-popover-crosstab-fg`
- `--surface-popover-warn-bg` / `--surface-popover-warn-border` / `--surface-popover-warn-fg` (live proof, revoked)
- `--hc-emphasis-card-shadow` — layered inset + outer lift for **emphasis notice cards** (no painted stroke; see below)

Use these for:

- Intro coachmark (`.device-hub-intro-*`)
- Warning cards (`.hub-card-status-alert*`)
- Glance popover surfaces and text
- Hub card overflow menu (`.hub-card-menu-panel`, `.hub-card-menu-item*`)
- Device hub and inbox bottom sheets (`.device-hub--sheet`, `.device-inbox-sheet`)
- Any new floating panel or popup-style shell component
- Wallet **Active in this tab** banner (`.wallet-active-banner` on `/wallet/`)

---

## Emphasis notice cards (`hc-emphasis-card` pattern)

**Status:** Shared component shipped · **Visual alignment v2 shipped** (Phases A–E, May 2026) — see [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) · [`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md)  
**Files:** `site/css/hc-emphasis-card.css` (imported by `site/styles.css` and bundled into scan via `worker:bundle-scan`), `site/css/theme-dark.css`  
**Regression:** `npm run worker:test:ui-color-scheme` · `npm run worker:test -- worker/tests/device-emphasis-card-html.test.ts`

Raised, card-shaped callouts for **high-salience device state** on page chrome (keys active, cross-tab, live proof, setup gates). They sit between flat `.hc-notice` strips and full-bleed hub tap banners (`.device-hub-notice-banner`).

**Scan hero (tier above emphasis cards):** Public resolver **live check hero** uses the same shadow *language* at larger scale — not the `.hc-emphasis-card` component. Token: `--hc-scan-hero-shadow` on `:root` (`site/styles.css`, `site/scan-pass.css`; dark override in `theme-dark.css`). See [`SCAN_HERO_CARD_VISUAL_SPEC.md`](SCAN_HERO_CARD_VISUAL_SPEC.md) § Visual tier.

**Scan trust surfaces (Check at scan time, vouch, limits):** Raised cards and disclosure rows on bundled scan pages. Token family `--hc-scan-surface-*` in `site/scan-pass.css` (Worker bundle via `npm run worker:bundle-scan`). **Do not** leave `#fff` / `rgba(255,…)` card fills while copy uses flipped `var(--black)` in dark — labels disappear (white on white). See **Scan page surfaces (dark mode)** below.

**Reference instances:** `#wallet-active-banner` (`--active`, green) · `#wallet-tab-hint` / `#device-cross-tab-banner` (`--info`, blue).

### Design rules (shipped — May 2026, alignment v2)

| Rule | Why |
|------|-----|
| **Border + shadow** | `0.5px` hairline (`--hc-emphasis-card-border-neutral` / per-modifier semantic tint) **plus** `box-shadow: var(--hc-emphasis-card-shadow)`. Shadow alone is not enough for the physical-object read. |
| **Glass fill** | Default: `--hc-emphasis-card-fill-*-glass` + `backdrop-filter: var(--hc-emphasis-card-backdrop)`. Opaque `--hc-emphasis-card-fill-*` via `@supports not (backdrop-filter)` and `prefers-reduced-transparency: reduce`. **Do not** use translucent semantic rims only (`rgba(0, 122, 255, 0.1)` on white). |
| **Semantic color in copy, not the frame** | Eyebrow + status dot carry green/blue/amber/red; card fill stays neutral-tinted gray. |
| **Typography ladder** | Eyebrow (12px uppercase, `letter-spacing: 0.025em`) → title → detail → CTA. |
| **CTA shape** | `border-radius: 10px` (`--hc-emphasis-card-cta-radius`); primary `var(--red)`; secondary flat control with hairline border — not full pill (`999px`). |
| **14px corner radius** | Card shell; shadow stack tuned for this radius. |
| **Landing CTAs** | Hero + framing + final block use `hc-emphasis-card__cta` family — **no** `landing-liquid-glass.css`. |

### Token: `--hc-emphasis-card-shadow`

Defined on `:root` in `site/styles.css`, overridden on `html[data-theme="dark"]` in `theme-dark.css`:

- **Light:** top white inset highlights → neutral bottom inset shade → `inset 0 0 0 1px` white inner rim → two neutral outer drops (`0 5px 18px`, `0 12px 32px`).
- **Dark:** stronger bottom inset + deeper outer stack (`0 8px 24px`, `0 16px 40px`) so the card lifts on black.

Future variants may add `--hc-emphasis-card-fill-*` and `--hc-emphasis-card-eyebrow-*` per semantic; **share one shadow token** across variants.

### Shared component (Phase 0)

| Class | Role |
|-------|------|
| `.hc-emphasis-card` | Base layout, hairline border, shadow, glass backdrop |
| `.hc-emphasis-card--{active,info,warn,urgent}` | Glass fill + semantic border color per modifier |
| `.hc-emphasis-card__main` / `__copy` | Left column |
| `.hc-emphasis-card__dot--{success,info,warn,urgent}` | Optional status dot |
| `.hc-emphasis-card__eyebrow` / `__title` / `__detail` | Typography ladder |
| `.hc-emphasis-card__cta` | Primary control (`var(--red)`); `__cta--secondary` for in-card rows |

Fill tokens: `--hc-emphasis-card-fill-*` (opaque fallback) and `--hc-emphasis-card-fill-*-glass` (default); borders `--hc-emphasis-card-border-*`; eyebrows `--hc-emphasis-card-eyebrow-*` on `:root` (dark overrides in `theme-dark.css`).

Typography tokens — **single source of truth** for every `.hc-emphasis-card` instance (wallet active, cross-tab, scan when migrated). Set on `:root` in `site/styles.css` and overridden on `html[data-theme="dark"]` in `theme-dark.css`. **Do not** point card copy at `var(--black)`, `var(--shell-label)`, or per-page selectors.

| Token | Used by | Light (`:root`) | Dark (`html[data-theme="dark"]`) |
|-------|---------|-----------------|-------------------------------------|
| `--hc-emphasis-card-title-fg` | `.hc-emphasis-card__title` | `#1c1c1e` | `#f5f5f7` |
| `--hc-emphasis-card-detail-fg` | `.hc-emphasis-card__detail` | `rgba(60, 60, 67, 0.88)` | `rgba(235, 235, 245, 0.9)` |

Eyebrow colors stay on `--hc-emphasis-card-eyebrow-{active,info,warn,urgent}` per modifier. Detail is **one step softer than title**, not hub `shell-label` (too dim on tinted card fills).

### Typography contrast — implementation checklist

1. **Tokens** — Assign explicit `--hc-emphasis-card-title-fg` and `--hc-emphasis-card-detail-fg` on `:root` and `html[data-theme="dark"]` (no `var(--shell-label)` alias for detail in dark).
2. **Selectors** — `.hc-emphasis-card__title` and `.hc-emphasis-card__detail` (and legacy `.wallet-active-label` / `.wallet-active-detail` aliases) use **only** these tokens for `color`.
3. **Regression** — Extend `worker/tests/ui-color-scheme-popover-guard.test.ts` so dark `:root` block forbids `--hc-emphasis-card-detail-fg: var(--shell-label)`.
4. **QA** — `/wallet/` dark: title and detail both readable on every modifier fill; bump `theme-dark.css?v=` on shell pages when CSS changes.

### Dark mode (emphasis cards — surfaces)

**Symptom (May 2026):** Card stayed **light** while copy used dark-theme shell colors → detail looked invisible; **Home** pill on `/wallet/` inherited `color: inherit` from `html[data-theme="dark"] a` (white on white).

**Fix (shipped):**

1. Title/detail use `--hc-emphasis-card-title-fg` and `--hc-emphasis-card-detail-fg` (not `var(--black)` alone).
2. `theme-dark.css` sets **explicit** `background: var(--hc-emphasis-card-fill-*-glass)` per modifier (`--active`, `--info`, `--warn`, `--urgent`), with opaque fallback under `prefers-reduced-transparency: reduce`.
3. `a.wallet-chrome-home` keeps `color: var(--red)` and `background: var(--shell-fill)` in dark mode.

**QA:** `/wallet/` with `localStorage.hc_theme = "dark"` — active card surface is dark gray-green; title, detail, and eyebrow readable; **Home** pill shows red label on elevated shell fill.

### Reference instance: wallet active tab (`--active`)

**When shown:** `/wallet/` when this tab holds signing keys (`wallet-page-chrome.mjs`).  
**Markup:** `#wallet-active-banner` with `hc-emphasis-card hc-emphasis-card--active` (+ legacy `wallet-active-*` classes).

| Part | Class | Light | Dark |
|------|--------|-------|------|
| Card | `.hc-emphasis-card--active` | `--hc-emphasis-card-fill-active` | dark gradient override |
| Dot | `.hc-emphasis-card__dot--success` | Green + halo | (unchanged) |
| Eyebrow | `.hc-emphasis-card__eyebrow` | `--hc-emphasis-card-eyebrow-active` | `#30d158` |
| Title | `.hc-emphasis-card__title` | `--hc-emphasis-card-title-fg` | `#f5f5f7` |
| Detail | `.hc-emphasis-card__detail` | `--hc-emphasis-card-detail-fg` | `rgba(235, 235, 245, 0.9)` |
| CTA | `.hc-emphasis-card__cta` | Pill, `var(--red)` | (unchanged) |

### Semantic modifiers (CSS shipped; rollout per phase doc)

| Modifier | Eyebrow / dot | Fill | Typical CTA |
|----------|----------------|------|-------------|
| `--active` | Green / `--success` | Gray-green neutral | Open workspace |
| `--info` | Blue / `--info` | Cool gray neutral | Open that tab |
| `--warn` | Amber / `--warn` | Warm gray neutral | Acknowledge |
| `--urgent` | Red / `--urgent` | Warm gray neutral | Prove live |

### History

| Stage | Rim | Depth / fill |
|-------|-----|----------------|
| Pre–May 2026 | `0.5px` blue, low opacity | Single top inset; soft 3D |
| `b68aff2` | `1px solid` blue (`--hc-emphasis-card-border`) | Blue-tinted shadow — read as outline |
| May 2026 (current) | **None** | Shared shadow token + **opaque** neutral fill + green eyebrow |

### Rollout candidates (brainstorm)

Prioritized places that could adopt the same **raised card** pattern. Extraction work: generalize `.wallet-active-banner` → `.hc-emphasis-card` + modifiers; keep one shadow token.

#### Tier 1 — Wallet / My cards (same screen, highest fit)

| Surface | Selector / ID | Today | Fit |
|---------|----------------|-------|-----|
| Keys in another tab (strip) | `#wallet-tab-hint` `.wallet-strip-hint` | Amber flat box + `1px` border | Same page as active banner; cross-tab copy deserves equal visual weight |
| Cross-tab (page top) | `#device-cross-tab-banner` | Plain `<p>`; links only | Landing + wallet; rendered by `device-cross-tab-banner.mjs` |
| Hub slot on wallet | `#device-hub-crosstab-notice` | Full-bleed `.device-hub-notice-banner--info` (solid blue button) | Optional **secondary** card style for “Keys in another tab” while keeping tap target; or replace if product wants consistency over hub-blue chrome |

#### Tier 2 — Landing + device chrome

| Surface | Selector / ID | Today | Fit |
|---------|----------------|-------|-----|
| Cross-tab (landing) | `#device-cross-tab-banner` on `/` | Same as wallet | Tier 1 |
| System / resolver degraded | `#device-system-banner` | Plain status line | Lower urgency — only if copy includes a CTA; else keep minimal |
| Keys custody summary | `#device-keys-custody-hub`, `-wallet`, `-compact` | **Shipped** — `--info` / `--warn` emphasis cards (`device-keys-custody-html.test.ts`) |

#### Tier 3 — Card workspace (`/created/`)

| Surface | Selector / ID | Today | Fit |
|---------|----------------|-------|-----|
| Live proof waiting | `#live-control-proof` | **Shipped** — `hc-emphasis-card--urgent` + pill **Prove control now** (Phase 3) |
| No session / view mode | `#no-session` | **Shipped** — `hc-emphasis-card--warn` + **My cards** pill (Phase 4) |
| Owner revoked | `#owner-revoked-banner` | **Shipped** — `hc-emphasis-card--urgent` (Phase 4) |
| Created error | `#created-error` | **Shipped** — `hc-emphasis-card--urgent` (Phase 4) |
| Vouch return | `#created-vouch-return-banner` | **Shipped** — `hc-emphasis-card--active` (rollout backlog) |
| Revoke warnings | `.revoke-id-warning` | **Shipped** — `hc-emphasis-card--warn` (Phase 4) |

#### Tier 4 — Scan resolver pages

| Surface | Selector / ID | Today | Fit |
|---------|----------------|-------|-----|
| Cross-tab on scan | `#scan-cross-tab-banner` | **Shipped** — `hc-emphasis-card--info` (Phase 2); pair with scan dot overlay (`SCAN_PAGE_DEVICE_DOT.md`) |
| Vouch / signing blocks | Vouch explainer areas in `scan-pass.css` | Mixed | Only where a **single** action card is needed; avoid competing with trust-tool rows |

#### Tier 5 — Create flow

| Surface | Selector / ID | Today | Fit |
|---------|----------------|-------|-----|
| Public card warning | `#create-public-card-notice` on `/create/` | **Shipped** — `hc-emphasis-card--warn` (Phase 4) |
| Keys custody (created) | `device-keys-custody--created` | **Shipped** — `hc-emphasis-card--warn` (Phase 4) |
| Keys custody (hub/wallet) | `#device-keys-custody-hub`, `-wallet` | **Shipped** — `--info` emphasis cards (`device-keys-custody-html.test.ts`) |
| Flow warnings | `.form-warning` legacy (non-notice) | **Shipped** — create public-card notice uses `hc-emphasis-card--warn`; no legacy `form-warning` class |

#### Tier 6 — Hub card context (use with care)

| Surface | Selector / ID | Today | Fit |
|---------|----------------|-------|-----|
| Disabled since visit | `.hub-card-status-alert` | **Shipped** — inset `hc-emphasis-card--warn` inside card row (Phase 5) |
| Live proof / card-disabled lists | `#device-hub-live-control-group`, `#device-hub-card-disabled-group` | List rows | Keep list pattern; optional **summary** emphasis card above list |

#### Out of scope (different UX tier)

- **Glance popover rows** (`.device-hub-glance-row--*`) — list controls, not page-level cards.
- **Inbox sheet rows** — dense list; badge + hub stack already own detail.
- **Solid full-bleed hub banners** (`.device-hub-notice-banner` red/blue) — intentionally high-contrast tap targets; changing them affects hub scanability.
- **Marketing / research** (`.research-live-banner`, idea callouts) — separate visual language.

#### Suggested rollout order

Tracked in [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md): **Phases 0–5** shipped. Further work: that doc § Further optimization backlog.

---

## Implementation guidance

### Do

- Prefer tokenized declarations:
  - `background: var(--surface-popover-bg);`
  - `color: var(--surface-popover-fg);`
  - `border-color: var(--surface-popover-border);`
- Keep text hierarchy:
  - Strong title: `--surface-popover-fg`
  - Body/subtext: `--surface-popover-fg-muted`
  - Emphasis/CTA: `--surface-popover-accent`

### Avoid

- Component-local hardcoded light backgrounds (`rgba(255,255,255,...)`) without dark override
- Mixing unrelated tokens (`--grey`, `--black`) on popup surfaces where semantic popover tokens exist
- Dark-mode-only fixes that do not also define light-mode intent

---

## QA checklist (contrast)

For every popup/warning component:

1. Verify readability in **light** and **dark** theme.
2. Verify primary title, body copy, and CTA/button text separately.
3. Verify warning card text remains legible when resolver is degraded/offline.
4. Verify screenshot on iPhone Safari and desktop Safari/Chrome.
5. Confirm no regressions when `prefers-reduced-transparency` is enabled.

---

## Migration note

When touching legacy components, migrate them incrementally to this token family rather than introducing new one-off color variables.

### Migrated components

| Component | Selectors | Notes |
|-----------|-----------|--------|
| Hub card ⋯ menu | `.hub-card-menu-panel`, `.hub-card-menu-item`, `.hub-card-menu-section-label`, `.hub-card-menu-divider` | Replaced hardcoded `rgba(255,255,255,0.96)` panel and `--black` / `--red` menu text with popover tokens; removed translucent backdrop blur on panel. |
| Hub card warning alert | `.hub-card-status-alert.hc-emphasis-card--warn` | Phase 5: inset emphasis card; secondary pill **Got it** / **View scan** (see `HC_EMPHASIS_CARD_ROLLOUT.md`). |
| Glance popover chrome | `.brand-status-popover` | Legacy class on `#device-hub-glance-popover`; aligned panel bg/border with popover tokens. |
| Dot explainer (glance) | `.device-hub-glance-popover .device-dot-explainer*` | Status-dot Now/Why/Next block inside glance popover uses popover fg/muted/accent and control surface (not `--black` / `--grey` on a nested light wash). |
| Intro coachmark | `.device-hub-intro-coachmark`, `.device-hub-intro-*` | First-visit status-dot coachmark; base styles in `device-shell.css` with popover tokens (dark overrides in `theme-dark.css`). |
| Glance popover help | `.device-hub-glance-popover .device-hub-glance-help` | Contact row at bottom of glance popover; uses control surface + accent (not `--shell-surface-elevated` white chip). |
| Dot explainer (hub sheet) | `.device-hub-body .device-dot-explainer:not(.device-dot-explainer--popover)` | Expanded hub status-key explainer; same popover token family as glance variant. |
| Hub + inbox bottom sheets | `.device-hub.device-hub--sheet`, `.device-inbox-sheet`, sheet chrome (handle/close/title/list) | Opaque `--surface-popover-bg` / fg; removed translucent sheet blur; inbox row title/sub on popover tokens. |
| Glance popover list rows | `.device-hub-glance-popover .device-hub-glance-btn`, status row titles | Default rows on control surface (fixes dark `shell-fill` override); status title colors have dark-theme overrides. |
| Inbox browser-alert prompt | `.device-inbox-sheet .device-browser-notif-prompt*` | Live-proof OS notification opt-in inside inbox sheet footer on popover tokens. |
| Glance status row tints | `.device-hub-glance-row--notice/crosstab/liveproof/revoked` | Notice/cross-tab/warn bg, border, and title fg tokens (light + dark on `:root`). |
| Dot explainer (base) | `.device-dot-explainer*` | Default explainer block uses popover tokens; hub/glance scopes retain explicit rules. |
| Wallet active-tab banner | `.hc-emphasis-card--active` (`#wallet-active-banner`) | Phase 0 reference; legacy `.wallet-active-*` aliases retained (see **Emphasis notice cards**, [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md)). |

### Migration complete (shell popovers)

All surfaces listed under **Use these for** are migrated as of this standard. New floating shell UI must use `--surface-popover-*` (and status tint tokens when applicable) from the first PR - do not add hardcoded `rgba(255,255,255,…)` panel fills without dark overrides.

### Regression guard

Vitest **`worker/tests/ui-color-scheme-popover-guard.test.ts`** asserts:

- `:root` and `html[data-theme="dark"]` define the full `--surface-popover-*` token set (including notice / cross-tab / warn tints).
- Migrated selectors (hub ⋯ menu, glance popover, sheets, coachmark, card alert, dot explainer, glance rows) keep semantic tokens and avoid known regressions (e.g. `rgba(255,255,255,0.96)` menu panels, `--black` / `--red` menu text, `backdrop-filter` on opaque sheets).

When adding a new popover surface, extend that test’s guarded selector list in the same PR.

```bash
npm run worker:test:ui-color-scheme
```

Manual contrast QA remains in the sections below and in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P1-5** / **P1-6**.

### QA (hub card menu)

After migrating `.hub-card-menu-*`, run the standard contrast checklist on a saved card with keys: open ⋯ menu in **light** and **dark** (`localStorage.hc_theme = "dark"`), confirm section label, default items, and danger rows (`Revoke QR`, `Remove from device`).

### QA (warning alert + glance explainer)

1. Trigger a **disabled since visit** (or similar) hub card alert; confirm body and **Dismiss** / **View scan** links in light and dark.
2. Open the status-dot **glance popover** with the dot explainer visible; confirm kicker, three lines, quick-action button, and **info@humanity.llc** help row in both themes.
3. Expand the **device hub sheet** and confirm the status-key dot explainer (Now/Why/Next) in both themes.

### QA (intro coachmark)

Per [`DEVICE_HUB_INTRO_COACHMARK.md`](DEVICE_HUB_INTRO_COACHMARK.md): clear `hc_device_hub_intro_seen` and `hc_device_hub_intro_dismissed`, reload `/`, confirm title/body/**Got it** in light and dark; refresh without interaction must not re-show (`seen` gate).

### QA (hub + inbox sheets)

1. Open **device hub** sheet (status dot) in light and dark; confirm sheet surface, handle, close control, and card list text.
2. With inbox badge visible, open **Needs attention** sheet; confirm title, row titles/subtitles, empty state, and footer border in both themes.
3. With `prefers-reduced-transparency: reduce`, confirm sheets stay opaque (no frosted wash) and backdrops use solid dimming only.

### QA (glance list + inbox browser prompt)

1. Glance popover with default saved-card rows and notice/cross-tab/live-proof rows - titles readable in light and dark.
2. Inbox sheet with live-proof waiting + browser notification prompt - prompt copy and dismiss in both themes.

### Scan page surfaces (dark mode)

**Symptom (May 2026):** Trust-tool rows (`.scan-trust-details`), vouch blocks (`.vouch-card`), and `.scan-page .list` kept **light** `#fff` fills while `html[data-theme="dark"]` remaps `--black` → `#f5f5f7` → titles/readouts invisible on white cards; section lead copy stayed `rgba(60, 60, 67, …)` on the black page chrome.

**Rule:** Any scan **card-shaped** surface (trust disclosure, list stack, vouch, limits) uses `--hc-scan-surface-*` for background, border, title, and muted copy — not hardcoded white + `var(--black)`.

| Token | Role | Light (`:root` in `scan-pass.css`) | Dark (`html[data-theme="dark"]` in bundled block) |
|-------|------|-------------------------------------|---------------------------------------------------|
| `--hc-scan-surface-bg` | Card / list panel fill | `#ffffff` | `#1c1c1e` |
| `--hc-scan-surface-subtle-bg` | Vouch / secondary inset | `#f7f7f9` | `#2c2c2e` |
| `--hc-scan-surface-fg` | Titles on surfaces | `#1c1c1e` | `#f5f5f7` |
| `--hc-scan-surface-fg-muted` | Lead, peek, foot copy on surfaces | `rgba(60, 60, 67, 0.65)` | `rgba(235, 235, 245, 0.72)` |
| `--hc-scan-surface-fg-subtle` | Chevrons, tertiary on surfaces | `rgba(60, 60, 67, 0.58)` | `rgba(235, 235, 245, 0.58)` |
| `--hc-scan-surface-border` | Card hairline | `rgba(60, 60, 67, 0.14)` | `rgba(255, 255, 255, 0.12)` |

**Selectors (migrate to tokens):**

- `.scan-trust-details` — `background`, `border-color`
- `.scan-group-summary-title`, `.scan-trust-details .list-title` — `--hc-scan-surface-fg`
- `.scan-group-summary-peek`, `.scan-trust-tools-lead` — muted / subtle tokens
- `.scan-page .list`, `.scan-limits-settings`, `.live-control-card`, `.vouch-card` — `--hc-scan-surface-bg` or `--hc-scan-surface-subtle-bg`

**Implementation checklist (one PR slice per step):**

1. **Tokens** — Add `--hc-scan-surface-*` on `:root` in `site/scan-pass.css`; mirror dark values in the bundled `html[data-theme="dark"]` block (keep in sync with `site/css/theme-dark.css` if shell ever shares these surfaces).
2. **Light selectors** — Replace hardcoded `#fff` / fixed `rgba(60, 60, 67, …)` on the selectors above with surface tokens.
3. **Dark selectors** — Confirm dark block sets token overrides only (no duplicate per-component `#fff`); optional explicit rules if a selector still wins on specificity.
4. **Regression** — Extend `worker/tests/ui-color-scheme-popover-guard.test.ts` (or `scan-hero-visual-contract.test.ts`) to require tokens in `scan-pass.css` and forbid `background: #fff` on `.scan-trust-details`.
5. **Bundle** — `npm run worker:bundle-scan` after CSS edits; then `npm run site:generate-scan-e2e-fixture` so Pages e2e fixtures embed the new CSS.
6. **QA** — `npm run worker:test:ui-color-scheme` · `npm run worker:test -- worker/tests/scan-hero-visual-contract.test.ts` · `npm run e2e:scan-hero-visual` with `hc_theme=dark`: trust row title contrast ≠ card background; hero plate unchanged.

**QA (manual):** Active scan URL, `localStorage.hc_theme = "dark"` — **Check at scan time** row titles readable; expand a row — list titles readable; **Vouch** signing copy readable; limits disclosure lead readable on black chrome.

### QA (wallet active-tab banner / `hc-emphasis-card` reference)

1. On `/wallet/` with signing keys in this tab, confirm **Active in this tab** banner shows **opaque** gray-green fill, green dot + eyebrow, and **Open workspace** pill.
2. Confirm **no blue rim** (no stroke, no translucent blue fill bleeding at corners) in light and dark.
3. Edges read raised: top highlight, bottom shade, card lifts from page (outer shadow).
4. Hard-refresh after CSS deploy — stale cache can show pre-May-2026 blue stroke.
