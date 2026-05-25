# Visual system  -  device shell layer

**Status:** Shipped on device-shell pages + scan bundle  
**Load order:** `styles.css` → `css/device-shell.css`  
**Motion:** `js/device-shell-motion.mjs` (imported from `device-status.mjs`)

---

## Design intent

The product should feel like a **native system utility**  -  calm, layered, under-explained  -  not a dashboard or crypto admin panel.

Principles:

| Principle | Implementation |
|-----------|----------------|
| Materials over outlines | Grouped fills, hairline separators, soft elevation |
| Translucency | Unified `top-chrome` bar; status row is inline text |
| Weight over size | Section labels 15px semibold, not uppercase micro-labels |
| System language | Status line: Resolver Online, N on Device, Tab Keys Active |
| Motion continuity | Spring easing, hub expand fade, tab panel enter, press feedback |
| Scan as sheet | `site/scan-pass.css` shell block → Worker bundle |

---

## Files

| Path | Role |
|------|------|
| `site/css/device-shell.css` | Materials, typography, `top-chrome`, hub/created/shop overrides |
| `site/js/device-shell-motion.mjs` | Hub open state, list press feedback |
| `site/js/device-shell-chrome.mjs` | Fixed chrome inset + scroll-edge compact |
| `site/js/device-hub-sheet.mjs` | Hub bottom sheet + backdrop |
| `site/js/device-counts.mjs` | System status segment copy |
| `site/scan-pass.css` | Scan page (run `npm run worker:bundle-scan` after edits) |

---

## Roadmap (OSification)

### Phase A  -  Kill the “website header” (shipped v1)

1. **Scroll-edge chrome**  -  fixed `top-chrome`, content inset via `--shell-chrome-h`, single-row bar; status collapses on scroll down (`device-shell-chrome.mjs`).
2. **Hub as sheet**  -  `/`, `/wallet/`, `/created/` use `device-hub--sheet` + backdrop (`device-hub-sheet.mjs`).
3. **Landing de-explain**  -  shorter hero + compact framing on `/` (more trimming possible).

**Flow pages** (`/create/`, etc.) use `body.page-flow` with no header chrome  -  rely on the browser back gesture/button for home, not a floating dot or Create pill.

### Phase B  -  Object continuity (shipped v1)

4. **Card open transition**  -  `navigateTo` / `openCardNowPage` use `document.startViewTransition` when available (hub, wallet, activity).
5. **Trust state morph**  -  shell status dot uses view transitions + spring CSS on class changes (`device-status.mjs`).
6. **Scan environments**  -  pass layer → limits → stacked trust sheets (`scan-pass-layer`, `scan-trust-stack`, `scan-trust-layer`).

**Also:** scroll-edge chrome hides the floating bar while scrolling down (`top-chrome--edge-hidden` in `device-shell-chrome.mjs`).

### Phase C  -  Native shell (optional)

7. **WKWebView wrapper**  -  haptics on save / revoke / prove; safe-area owned by shell not CSS sticky hacks.

---

## Regenerate scan CSS in Worker

```bash
npm run worker:bundle-scan
```
