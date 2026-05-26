# Landing desktop layout

**Status:** Retired (mobile-only layout restored May 2026)  
**Scope:** `/` (`site/index.html`) · `body.has-shell-chrome.has-device-hub-search`  
**Companion:** [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md) · [`VISUAL_DEVICE_SHELL.md`](VISUAL_DEVICE_SHELL.md)

---

## Problem (original)

The site uses a **430px** centered `.page` column (mobile-first “device frame”). A desktop widening experiment caused inconsistent rendering on mobile Chrome; layout is **430px at all viewports** again.

---

## Design (retired)

| Viewport | Behavior |
|----------|----------|
| **All** | `max-width: 430px`, optional phone border from 500px |
| ~~**≥ 880px**~~ | ~~Removed: 760px grid, two-column hero~~ |

### Two-column intro (desktop only)

| Column | Blocks |
|--------|--------|
| **Left** | `.hero.hero-tight`, `.landing-progress` |
| **Right** | `.landing-framing` (aligned to top of hero) |
| **Full width** | All other `main.screen-landing` children (studio, trust, docs, etc.) |

Hub chrome (`#device-hub`, status dot, banners) stays full width above `main`-device OS first, marketing second.

---

## Chrome inset on first paint (May 2026)

The landing hero kicker (`.hero-headline-kicker`) sits directly under the fixed status dot. Before May 2026, `/` omitted `has-shell-chrome` on `<body>` until `device-shell-chrome.mjs` ran, so the hero loaded under the dot and jumped down when JS set `--shell-chrome-h`.

**Fix:** `site/index.html` ships `has-shell-chrome` on `<body>` (same as `/create/` and `/wallet/`). `:root` in `device-shell.css` sets `--shell-chrome-h: calc(56px + env(safe-area-inset-top, 0px))` so `.page` padding matches the minimal chrome bar on first paint. `device-shell-chrome.mjs` only raises the inset when measurement exceeds that value (monotonic floor; no inline override when already tall enough).

Do not rely on extra `<br>` or hero-only spacer hacks - they double-offset after JS runs.

**Verify:** Hard refresh `/` - red kicker line should not overlap the status dot before or after the status module loads.

---

## Implementation checklist

| Step | Task | Location |
|------|------|----------|
| 1 | Desktop media block: page width + grid | `site/styles.css` |
| 2 | Relax hero `max-width` on desktop | `site/styles.css` (`.hero-tight`, `.hero-tagline`) |
| 3 | Bump cache-bust `styles.css?v=` on `/` | `site/index.html` |

All steps above are implemented in the repo.

---

## Verification

1. Open `/` at ≥ 1200px width: page wider than 430px; hero and “Physical software objects” side by side.
2. Resize below 880px: single column, 430px cap returns.
3. Focus mode and hub sheet unchanged (mobile sheet behavior preserved).
