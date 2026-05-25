# Landing desktop layout

**Status:** Retired (mobile-only layout restored May 2026)  
**Scope:** Was `/` (`site/index.html`) · `body.has-device-hub-search`  
**Companion:** [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md)

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

Hub chrome (`#device-hub`, status dot, banners) stays full width above `main`—device OS first, marketing second.

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
