# Landing desktop layout

**Status:** Shipped  
**Scope:** `/` (`site/index.html`) · `body.has-device-hub-search`  
**Companion:** [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md)

---

## Problem

The site uses a **430px** centered `.page` column (mobile-first “device frame”). On desktop monitors this leaves large empty gutters and reads as a floating phone, not a product homepage.

---

## Design (reference operator)

| Viewport | Behavior |
|----------|----------|
| **&lt; 880px** | Unchanged: `max-width: 430px`, optional phone border from 500px |
| **≥ 880px** (`hover: hover` and `pointer: fine`) | Wider page (**760px**), softer frame, **two-column** intro in `main.screen-landing` |

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
