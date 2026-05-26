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

Use these for:

- Intro coachmark (`.device-hub-intro-*`)
- Warning cards (`.hub-card-status-alert*`)
- Glance popover surfaces and text
- Hub card overflow menu (`.hub-card-menu-panel`, `.hub-card-menu-item*`)
- Any new floating panel or popup-style shell component

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
| Hub card warning alert | `.hub-card-status-alert`, `.hub-card-status-alert-text`, `.hub-card-alert-dismiss`, `.hub-card-alert-view-scan` | Surface/text on popover tokens; action links use `--hc-notice-link` (dark override in `theme-dark.css`). |
| Glance popover chrome | `.brand-status-popover` | Legacy class on `#device-hub-glance-popover`; aligned panel bg/border with popover tokens. |
| Dot explainer (glance) | `.device-hub-glance-popover .device-dot-explainer*` | Status-dot Now/Why/Next block inside glance popover uses popover fg/muted/accent and control surface (not `--black` / `--grey` on a nested light wash). |
| Intro coachmark | `.device-hub-intro-coachmark`, `.device-hub-intro-*` | First-visit status-dot coachmark; base styles in `device-shell.css` with popover tokens (dark overrides in `theme-dark.css`). |
| Glance popover help | `.device-hub-glance-popover .device-hub-glance-help` | Contact row at bottom of glance popover; uses control surface + accent (not `--shell-surface-elevated` white chip). |
| Dot explainer (hub sheet) | `.device-hub-body .device-dot-explainer:not(.device-dot-explainer--popover)` | Expanded hub status-key explainer; same popover token family as glance variant. |

### QA (hub card menu)

After migrating `.hub-card-menu-*`, run the standard contrast checklist on a saved card with keys: open ⋯ menu in **light** and **dark** (`localStorage.hc_theme = "dark"`), confirm section label, default items, and danger rows (`Revoke QR`, `Remove from device`).

### QA (warning alert + glance explainer)

1. Trigger a **disabled since visit** (or similar) hub card alert; confirm body and **Dismiss** / **View scan** links in light and dark.
2. Open the status-dot **glance popover** with the dot explainer visible; confirm kicker, three lines, quick-action button, and **info@humanity.llc** help row in both themes.
3. Expand the **device hub sheet** and confirm the status-key dot explainer (Now/Why/Next) in both themes.

### QA (intro coachmark)

Clear `localStorage` key for hub intro dismissal (see `device-hub-intro-coachmark.mjs`), reload `/`, confirm coachmark title/body/dismiss in light and dark.
