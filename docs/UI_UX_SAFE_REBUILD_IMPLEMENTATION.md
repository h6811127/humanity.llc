# Safe UI/UX rebuild — implementation plan

**Status:** Step 1 complete · Step 2 complete · Step 3 complete · Step 4 complete  
**Audience:** Engineers restoring May 25–26 shell work without landing lag or rate limits  
**Related:** [`UI_UX_REVERTED_FEATURES_CATALOG.md`](UI_UX_REVERTED_FEATURES_CATALOG.md) · [`UI_UX_REVERT_PLAN.md`](UI_UX_REVERT_PLAN.md) · [`SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md`](SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md)

---

## Goal

Restore **product behavior** (dead-tap fixes, inbox bootstrap, fresher hub state, optional Safari polish) while **never re-shipping** the two mechanisms tied to production incidents:

| Banned forever | Why |
|----------------|-----|
| Document `window` `scroll` → `shell-is-scrolling` / `top-chrome--edge-hidden` | Landing scroll jank on WebKit |
| `initDeviceOsCoordinator()` from `device-status.mjs` (global health + wallet + live-proof on init/visible/`storage`) | Cloudflare rate limits, tab meltdown |

Uncertainty about minor lines in old commits is OK if each step stays off these paths and passes verification below.

---

## Process (every step)

1. Read the step section (scope, files, forbidden deps).
2. Implement only what the step lists.
3. Bump `DEVICE_SHELL_ASSET_VERSION` in `site/js/device-status-shell-modules.mjs` and every shell `?v=` peer import + HTML bootstrap when touching the status graph.
4. Add new graph files to `DEVICE_STATUS_SHELL_JS_FILES` in the same PR.
5. Run automated checks for that step.
6. Manual **P0-3** / **P0-W** when the step touches sheets or taps ([`DEVICE_OS_QA.md`](DEVICE_OS_QA.md)).

```bash
npm run worker:test
npm run worker:test -- worker/tests/device-status-shell-modules.test.ts
# After step 1+:
npm run worker:test -- worker/tests/device-sheet-backdrop-sync.test.ts
npm run e2e -- e2e/device-status-dot.spec.ts e2e/device-inbox.spec.ts e2e/device-os-wallet.spec.ts
```

---

## Step 1 — Backdrop reconcile + closed backdrop hit-test (current)

**Intent:** Fix stuck hub/inbox backdrops blocking taps after bfcache or fast navigation. **No** scroll listeners, **no** network polling.

### Scope

| In scope | Out of scope |
|----------|----------------|
| `site/js/device-sheet-backdrop-sync.mjs` | `visibility:hidden` on collapsed sheets (Step 4) |
| `syncSheetBackdropClosed`, `bindSheetLifecycleReconcile` | Touch blur-off (Step 4) |
| Wire into `device-hub-sheet.mjs`, `device-inbox-sheet.mjs` | Lazy inbox loader (Step 2) |
| CSS: `[hidden] { pointer-events: none }` on hub/inbox backdrops only | Global OS coordinator (Step 5 — scoped only) |
| `worker/tests/device-sheet-backdrop-sync.test.ts` | `visibility: hidden` on `[hidden]` backdrops (avoid unless Step 4 proves need) |

### Implementation checklist

- [x] Add `device-sheet-backdrop-sync.mjs` (pure helpers, no DOM side effects except listeners in `bind*`).
- [x] In `setHubSheetOpen` / `setInboxSheetOpen`:
  - Set `aria-hidden` on backdrop when open/closed.
  - On close: call `syncSheetBackdropClosed(backdrop)`.
  - On close: call `reconcile*SheetState()` (hub/inbox) to clear stuck body classes.
- [x] In `reconcile*SheetState` `hide_backdrop` branch: use `syncSheetBackdropClosed`.
- [x] Call `bindSheetLifecycleReconcile(reconcile*SheetState)` at module init; remove duplicate `pageshow` listener if it only duplicated reconcile.
- [x] Add CSS after `.device-hub-backdrop.is-visible` / `.device-inbox-backdrop.is-visible`:

```css
.device-hub-backdrop[hidden],
.device-inbox-backdrop[hidden] {
  pointer-events: none;
}
```

- [x] Add `device-sheet-backdrop-sync.mjs` to `DEVICE_STATUS_SHELL_JS_FILES`.
- [x] Bump `DEVICE_SHELL_ASSET_VERSION` to **31** and all shell `?v=` imports.

### Acceptance

- Vitest: `device-sheet-backdrop-sync.test.ts` green.
- Vitest: `device-status-shell-modules.test.ts` green.
- E2E: device-status-dot, device-inbox, device-os-wallet green.
- Manual: open hub → close → scroll landing; dot and primary CTAs still tap (P0-3). iPhone: back-forward cache with hub once open (P0-W) if available.

### Lag / rate-limit tripwires

CI grep (manual until scripted): no new `addEventListener("scroll"` in `site/js/device-shell-chrome.mjs` or `device-status.mjs`; no `initDeviceOsCoordinator()` in `device-status.mjs`.

---

## Step 2 — Lazy inbox sheet loader (implemented)

**Intent:** Shrink `device-status.mjs` static import graph so Safari is less likely to brick the dot on first load.

### Scope

- Restore `device-inbox-sheet-loader.mjs`; `device-status.mjs` imports loader only, not full sheet.
- `device-hub-glance.mjs` must not static-import `device-inbox-sheet.mjs`.
- Manifest lists loader + sheet; bump asset version.
- Restore `worker/tests/device-status-lazy-inbox.test.ts`.

### Forbidden

- Do not re-add global coordinator.
- Do not add document scroll chrome.

### Acceptance

Same as Step 1 E2E + lazy-inbox Vitest; dot loads on cold navigation in Playwright.

---

## Step 3 — Hub-scoped network freshness (implemented)

**Intent:** Card-disabled glance/inbox timeliness without global polling.

### Scope

- On `NETWORK_REFRESHED` from hub wallet poll only, ensure `refreshHubGlance` + hub banners already run (verify; add hub-only `requestDeviceOsRefresh('hub-changed')` **only inside** `device-hub-ui.mjs` if gaps found).
- Optional: debounced refresh when hub **expands**, not on every landing `visibilitychange`.
  
### Implementation checklist

- [x] In `site/js/device-hub-ui.mjs`, gate `fetchAndApplyNetworkChips()` on `visibilitychange` so it only runs when `#device-hub` is **not** `.device-hub-collapsed`.
- [x] Keep the init-time hub poll (`fetchAndApplyNetworkChips()` on hub init) so card-disabled rows update immediately when hub loads.

### Forbidden

- `initDeviceOsCoordinator()` from `device-status.mjs`.
- Full wallet poll on `storage` from status bootstrap.

### Acceptance

Multi-tab: no Cloudflare interstitial under normal use; card-disabled row appears after hub poll or hub open.

---

## Step 4 — Safari sheet CSS (implemented)

**Intent:** Reduce dead taps without scroll jank.

Shipped (2026-05-26):

1. `touch-action: manipulation` on `#brand-status-dot-btn` only (`site/css/device-shell.css`).
2. Collapsed hub `pointer-events: none` (existing); explicit `.device-inbox-sheet--collapsed { pointer-events: none }`.
3. `@media (pointer: coarse)` — `backdrop-filter: none` on `.device-hub-backdrop` and `.device-inbox-backdrop` only (not hub sheet body, not glance popover).
4. **Deferred:** `visibility: hidden` on collapsed sheets — add only if P0-W still shows dead taps after Step 1–3 on iPhone.

`device-shell.css?v=42` on shell pages (`index`, `create`, `created`, `wallet`).

### Forbidden per knob

- No `top-chrome--edge-hidden` cluster fixes bundled with sheet visibility.
- No document scroll listener.
- No coarse-pointer blur strip on `.device-hub.device-hub--sheet` (reverted jank path).

---

## Step 5 — Optional chrome inset floor (planned)

Only if iPhone reports scroll jump at page bottom **without** scroll-edge chrome: monotonic `--shell-chrome-h` in `syncShellChromeInset` only.

---

## Never (do not schedule)

| Item | Alternative |
|------|-------------|
| Document scroll-edge chrome | Static chrome or hub-inner scroll |
| `localStorage` scroll chrome opt-in on touch | N/A |
| Global `initDeviceOsCoordinator()` | Step 3 hub-scoped polls |

---

## Doc map

| Step | Catalog § |
|------|-----------|
| 1 | §8, partial §9 (`[hidden]` pointer-events only) |
| 2 | §7 |
| 3 | §3, §4 |
| 4 | §9, §10 |
| 5 | §5 |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-26 | Initial plan; Step 1 implementation |
| 2026-05-26 | Step 4: dot `touch-action`, collapsed inbox hit-test, coarse backdrop blur-off only |
