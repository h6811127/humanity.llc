# Visual system — iOS-native utility layer

**Status:** Shipped on device-shell pages + scan bundle  
**Load order:** `styles.css` → `css/ios-system.css`  
**Motion:** `js/ios-motion.mjs` (imported from `device-status.mjs`)

---

## Design intent

The product should feel like a **native system utility** — calm, layered, under-explained — not a dashboard or crypto admin panel.

Principles:

| Principle | Implementation |
|-----------|----------------|
| Materials over outlines | Grouped fills, hairline separators, soft elevation |
| Translucency | Unified `top-chrome` Liquid Glass bar (not a floating white card); status row is inline text |
| Weight over size | Section labels 15px semibold, not uppercase micro-labels |
| System language | Status line: Resolver Online, N on Device, Tab Keys Active |
| Motion continuity | Spring easing, hub expand fade, tab panel enter, press feedback |
| Scan as sheet | `site/scan-pass.css` iOS block → Worker bundle |

---

## Files

| Path | Role |
|------|------|
| `site/css/ios-system.css` | Materials, typography, `top-chrome` glass, hub/created/shop overrides |
| `site/js/ios-motion.mjs` | Hub open state, list press feedback |
| `site/js/device-counts.mjs` | System status segment copy |
| `site/scan-pass.css` | Scan page (run `npm run worker:bundle-scan` after edits) |

---

## Deferred (native shell / later)

- Full shared-element transitions (card expand from tap origin)
- Trust-state icon morph animations
- WKWebView haptics on revoke / save / prove
- Further copy reduction on landing long-form (let interaction explain)

---

## Regenerate scan CSS in Worker

```bash
npm run worker:bundle-scan
```
