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

### QA (hub card menu)

After migrating `.hub-card-menu-*`, run the standard contrast checklist on a saved card with keys: open ⋯ menu in **light** and **dark** (`localStorage.hc_theme = "dark"`), confirm section label, default items, and danger rows (`Revoke QR`, `Remove from device`).
