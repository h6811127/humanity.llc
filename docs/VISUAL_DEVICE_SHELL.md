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
| Status cluster | Dot = trust/state; inbox badge = actionable count (see [`DEVICE_INBOX.md`](DEVICE_INBOX.md)) |
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
| `site/js/device-status.mjs` | Status dot + inbox badge |
| `docs/DEVICE_INBOX.md` | Inbox + background alerts spec |
| `site/scan-pass.css` | Scan page (run `npm run worker:bundle-scan` after edits) |

---

## Roadmap (OSification)

### Phase A  -  Kill the “website header” (shipped v1)

1. **Scroll-edge chrome**  -  fixed `top-chrome`, content inset via `--shell-chrome-h`, single-row bar; status collapses on scroll down (`device-shell-chrome.mjs`).
2. **Hub as sheet**  -  `/` and `/created/` use `device-hub--sheet` + backdrop (`device-hub-sheet.mjs`). **`/wallet/`** is a **dedicated page** (`#wallet-page`, `wallet-page.mjs`) that reuses hub list renderers via `initDeviceHub({ hubRoot })` — not the bottom sheet.
3. **Landing de-explain**  -  shorter hero + compact framing on `/` (**v2 shipped:** studio example uses, **Design choices**, **Clear limits**, and **Documentation** default closed in icon **disclosure cards** (`.landing-disclosure-card` on `site/index.html`; chevron rotates when open). The status-plate **object model** strip (`.flow-strip--model`) uses the same elevated surface as lists in dark mode (`theme-dark.css`). Status-dot pulse and chrome blur pause while scrolling via `shell-is-scrolling` in `device-shell-chrome.mjs`. **`content-visibility: auto` on tutorial blocks was removed** (2026-05-26) — it caused jumpy mobile scroll; see [`IPHONE_HUB_DOT_UNCLICKABLE_INVESTIGATION.md`](IPHONE_HUB_DOT_UNCLICKABLE_INVESTIGATION.md).

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
