# Investigation: Safari / WebKit shell regression (scroll, dot, hub)

**Date opened:** 2026-05-26  
**Status:** Active — reproduction confirmed across reporter devices; fix plan below  
**Owners:** Device shell UX  
**Related:** [`IPHONE_HUB_DOT_UNCLICKABLE_INVESTIGATION.md`](IPHONE_HUB_DOT_UNCLICKABLE_INVESTIGATION.md) · [`STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md`](STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md) · [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md) · [`VISUAL_DEVICE_SHELL.md`](VISUAL_DEVICE_SHELL.md)

---

## Executive summary

After the May 25–26 device-inbox + scroll-chrome landing, **production is healthy for clean profiles** (Tor Mac, Tor Android first visit, iPad Safari) but **broken or flaky on WebKit profiles that stress the new shell** (iPhone Safari, Mac Safari).

This is **not** a “rewrite the hub” problem. It is a **convergence of**:

1. **Document scroll + scroll-edge chrome** — global `scroll` listener, `top-chrome--edge-hidden`, and `body.shell-is-scrolling` run on the **landing document** and cause jank/strobe on iOS; **hub inner scroll does not use that path** and feels smooth when open.
2. **Fragile status module graph** — one failed static import bricks the dot; only bootstrap has `?v=` cache-bust; Mac Safari shows **intermittent red error outline** across hard refreshes.
3. **Sheet / pointer-events stack** — hub + inbox backdrops, float chrome `pointer-events` lace, fixed `transform` sheets; intermittent dead taps on iPhone and **dead dot after hard refresh on Mac Safari** even when the red ring is gone.
4. **Test gap** — CI uses **Pixel 5 Chromium only**; WebKit iPhone was never gated.

**Private tab + cleared website data on iPhone still broken** rules out “stale cache only.” The remaining causes are **runtime WebKit behavior + shell scroll architecture**, possibly amplified by iOS **advanced privacy** warnings.

---

## Reporter device matrix (2026-05-26)

| Environment | Scroll / UX | Status dot / hub | Notes |
|-------------|-------------|------------------|-------|
| **Tor Browser, Mac** (hard refresh) | Good | Good | Clean profile |
| **Tor Browser, Android** (first visit) | Good | Good | Never visited before |
| **iPad Safari** | Good | Good | Hard refresh method unknown |
| **Mac Safari** (hard refresh) | — | **Dot not clickable** | Red ring **sometimes** on 1st refresh, gone on 2nd |
| **iPhone Safari** (normal) | **Very laggy** | **Sometimes** opens hub | Buttons often dead |
| **iPhone Safari** (private) | **Still laggy** | Still broken | **Not** cache-only |
| **iPhone Safari** (after clear website data) | **Still laggy** | Still flaky | **Not** storage-only |
| **iPhone Safari** | — | Safari banner: *reduce advanced privacy protections* | See § Safari privacy banner |

**Critical UX clue:** When the hub **is** open, **scrolling inside the hub is smooth**, but **scrolling the landing page remains painful**.

---

## What that hub clue means (smoking gun)

When the hub sheet is open:

```css
/* site/css/device-shell.css */
body.device-hub-sheet-open {
  overflow: hidden;
}
```

- **Document `window` scroll stops** → `device-shell-chrome.mjs` scroll handler early-returns (hub-open guard) → no `top-chrome--edge-hidden` toggling, no `shell-is-scrolling` flapping on the body.
- User scrolls **`#device-hub .device-hub-body`** only (`-webkit-overflow-scrolling: touch`) → smooth.

When the hub is closed:

- Full landing document scrolls → **every scroll event** runs `markScrolling()` + `requestAnimationFrame(update)` → opacity/blur/class churn on chrome → **lag and strobe** on WebKit, especially iPhone.

So: **landing scroll pain is largely self-inflicted by scroll-edge chrome**, not generic “Safari is slow.”

---

## Symptom catalog

### A. Red outline ring on status **button** (not pulsing dot fill)

| Property | Detail |
|----------|--------|
| **Mechanism** | `#top-chrome[data-device-status-error]` set only by `device-status-bootstrap.mjs` when `import("./device-status.mjs")` fails |
| **CSS** | `outline: 2px solid` on `#brand-status-dot-btn` in `device-shell.css` |
| **Effect** | No `dot_click` handler; hub cannot open via dot |
| **Mac Safari** | Intermittent across consecutive hard refreshes → flaky module fetch / cache (see [`STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md`](STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md)) |

**Do not confuse with:** pulsing red **fill** / `box-shadow` on `.pass-dot` (custody semantics; JS loaded).

**Verify:**

```js
document.getElementById("top-chrome")?.dataset?.deviceStatusError
// "1" => load failure; undefined => not load failure
```

### B. Landing scroll lag, strobe, bottom glitch

| Property | Detail |
|----------|--------|
| **Mechanism** | `site/js/device-shell-chrome.mjs` — `scroll` listener → `shell-is-scrolling` + `top-chrome--edge-hidden` |
| **CSS** | Bar opacity 0.45 when edge-hidden; blur removed while `shell-is-scrolling` (`site/styles.css`) |
| **Partial fix shipped** | `a1ab3fa` — inset floor, hysteresis, bottom guard; removed `content-visibility: auto` on landing |
| **Still reported** | iPhone still “laggy as fuck” after data clear + private tab |

### C. Dead buttons site-wide

| Property | Detail |
|----------|--------|
| **Most likely** | `#device-hub-backdrop` or `#device-inbox-backdrop` stuck with `.is-visible` and `pointer-events: auto` (z-index 54–56) |
| **Reconcile today** | `reconcileHubSheetState()` / `reconcileInboxSheetState()` on init + `pageshow` (bfcache) only |
| **Mac Safari** | Dot not clickable after hard refresh **without** necessarily showing red ring → load OK but **tap path or overlay** broken |

### D. Dot “sometimes” opens hub (iPhone)

Combines **B + C + D**: scroll jank, intermittent overlay, possible WebKit hit-testing on fixed `transform` sheets (see [`IPHONE_HUB_DOT_UNCLICKABLE_INVESTIGATION.md`](IPHONE_HUB_DOT_UNCLICKABLE_INVESTIGATION.md) §5).

---

## Ruled out

| Hypothesis | Evidence |
|------------|----------|
| Prod deploy missing files | Tor / fresh Android / curl 200 on module manifest |
| Cache-only on iPhone | Private tab + cleared website data **still** broken |
| Whole product unredeemable | iPad Safari + Tor profiles work on same URL |
| Hub sheet internal scroll broken | Reporter: hub scroll **smooth** when open |
| Need ground-up rearchitecture | Clean profiles work; failures cluster on WebKit + document-scroll shell |

---

## Safari privacy banner (iPhone)

Message paraphrased: *“If this page is not displaying as expected, you can reduce advanced privacy protections…”*

This is **iOS Safari** signaling that **Advanced Tracking/Fingerprinting protections** may be interfering with the page (heavy fixed layers, storage, workers, etc.).

**Product does not require disabling privacy** for normal use. For **diagnostics only** (one session):

- Settings → Safari → **Advanced** → **Advanced Tracking and Fingerprinting Protection** → try **off** for a single repro, or use the in-banner shortcut if offered.

Record whether behavior changes. If it only works with protections off, document as **WebKit + privacy interaction** and still ship P0 fixes that reduce main-thread scroll work (those help everyone).

---

## Architecture (relevant paths)

```text
device-status-bootstrap.mjs?v=21
  └─ dynamic import → device-status.mjs
       ├─ device-hub-sheet.mjs      (backdrop, body classes)
       ├─ device-inbox-sheet.mjs      (second backdrop)
       ├─ device-shell-chrome.mjs     (scroll listener — landing only)
       └─ device-os-coordinator.mjs   (debounced refresh → applyDot)

Landing scroll (painful):
  window scroll → device-shell-chrome.mjs → edge-hidden + shell-is-scrolling

Hub scroll (smooth):
  body overflow hidden → hub-body overflow-y auto (no document scroll listener work)
```

**Module cache-bust gap:** Only bootstrap URL has `?v=`; graph siblings are bare `/js/device-*.mjs` ([`device-status-shell-modules.mjs`](../site/js/device-status-shell-modules.mjs)).

---

## Fix plan

### Phase 0 — Confirm failure mode (1 session, no code)

On **broken** iPhone Safari (normal tab), Mac Safari (dot dead after hard refresh):

| Step | Action | Pass criterion |
|------|--------|----------------|
| 0.1 | Console: `dataset.deviceStatusError` | Record `"1"` vs absent |
| 0.2 | Network filter `device-` on load | Any 404 / (failed)? |
| 0.3 | Console snippet § Backdrop state below | `hubBackdropVisible: false` when hub looks closed |
| 0.4 | `localStorage.setItem('hc_dot_diagnostics','1')`, reload, tap dot | `dot_click` in `hc_dot_diag_log`? |
| 0.5 | Optional: privacy protections off once | Note if scroll/taps change |

**Backdrop state snippet:**

```js
({
  chromeError: document.getElementById("top-chrome")?.dataset?.deviceStatusError,
  bodyHubOpen: document.body.classList.contains("device-hub-sheet-open"),
  hubCollapsed: document.getElementById("device-hub")?.classList.contains("device-hub-collapsed"),
  hubBackdropVisible: document.getElementById("device-hub-backdrop")?.classList.contains("is-visible"),
  inboxBackdropVisible: document.getElementById("device-inbox-backdrop")?.classList.contains("is-visible"),
})
```

---

### Phase 1 — P0 ship (stop the bleeding)

**Goal:** Reliable dot + hub on WebKit; landing scroll acceptable on iPhone.

| # | Change | Files | Rationale |
|---|--------|-------|-----------|
| 1.1 | **Unified cache-bust for entire status graph** — single `DEVICE_SHELL_ASSET_VERSION`; append `?v=` to every path from `deviceStatusShellModulePaths()`; bump on all shell HTML | `device-status-shell-modules.mjs`, `index.html`, `create/`, `created/`, `wallet/` | Mac Safari intermittent red ring; postmortem P0 |
| 1.2 | **Disable or heavily gate scroll-edge chrome on coarse pointer / iOS** — e.g. skip `initScrollEdgeChrome()` when `matchMedia('(pointer: coarse)')` or `navigator.userAgent` WebKit mobile; OR only enable after `matchMedia('(prefers-reduced-motion: no-preference)')` + desktop | `device-shell-chrome.mjs` | Private iPhone still laggy; hub-open smooth implicates document scroll listener |
| 1.3 | **Remove `shell-is-scrolling` blur/animation suppression on touch** (or entirely until reworked) | `site/styles.css`, `device-shell-chrome.mjs` | Strobe on scroll |
| 1.4 | **Harden backdrop reconcile** — run on `visibilitychange` (visible), `focus`, and after `setHubSheetOpen(false)`; assert `pointer-events: none` when `hidden` | `device-hub-sheet.mjs`, `device-inbox-sheet.mjs` | Dead buttons / intermittent taps |
| 1.5 | **iOS hit-test hardening** — `touch-action: manipulation` on `.shell-status-dot-btn`; `visibility: hidden` on collapsed hub/inbox sheets (in addition to `pointer-events: none`) | `device-shell.css` | WebKit fixed/transform hit testing per iPhone investigation doc |
| 1.6 | **Reduce mobile backdrop cost** — `@media (pointer: coarse)` disable or lighten `backdrop-filter` on hub/inbox backdrops | `device-shell.css` | Main-thread GPU load on scroll |

**Acceptance (manual):**

- iPhone Safari normal profile: landing scroll usable; dot opens hub 5/5 taps; landing settings row taps work.
- Mac Safari: hard refresh 5× — no red ring; dot opens hub every time.
- Tor / iPad: no regression.

---

### Phase 2 — P1 (confidence + regression gates)

| # | Change | Files |
|---|--------|-------|
| 2.1 | Playwright project **`webkit` + `iPhone 13 Pro`** — dot opens hub, `elementFromPoint` on dot, backdrop closed when collapsed, scroll + tap | `playwright.config.ts`, `e2e/device-status-dot.spec.ts`, new `e2e/safari-shell-scroll.spec.ts` |
| 2.2 | **Lazy dynamic import** of `device-inbox-sheet.mjs` from dot/inbox paths only | `device-status.mjs` | Shrinks blast radius of import failure (postmortem P2) |
| 2.3 | **Vitest** for scroll chrome gating flag / backdrop reconcile | `worker/tests/` | |
| 2.4 | Link this doc from [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md) troubleshooting | docs | |

**CI:** Extend `.github/workflows/test-site.yml` to run WebKit smoke (can be nightly if slow).

---

### Phase 3 — P2 (shell UX rethink if P1 insufficient)

Only if iPhone still fails Phase 1 acceptance:

| Option | Description |
|--------|-------------|
| **A. CSS-only chrome** | Drop `scroll` listener; use `position: sticky` bar without `edge-hidden` JS |
| **B. Separate scroll roots** | Move landing into a scroll container; keep chrome outside (like hub body) |
| **C. Feature flag** | `localStorage hc_shell_scroll_chrome=0` kill switch for support |

---

## Verification matrix (post-fix)

| Device | Landing scroll | Dot → hub | Landing buttons | Red ring after 5 reloads |
|--------|----------------|-----------|-----------------|-------------------------|
| iPhone Safari normal | smooth enough | 5/5 | 5/5 | 0/5 |
| iPhone Safari private | — | 5/5 | — | — |
| Mac Safari | — | 5/5 | — | 0/5 |
| iPad Safari | — | 5/5 | — | — |
| Tor Mac / Android | no regression | 5/5 | — | — |
| Pixel 5 CI | — | E2E green | — | — |

---

## Emergency workarounds (support / QA)

**Unstick backdrops (console):**

```js
(() => {
  for (const id of ["device-hub-backdrop", "device-inbox-backdrop"]) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.hidden = true;
    el.classList.remove("is-visible");
  }
  document.body.classList.remove("device-hub-sheet-open", "device-inbox-sheet-open");
  document.getElementById("top-chrome")?.classList.remove("top-chrome--hub-locked", "top-chrome--inbox-locked");
  document.getElementById("device-hub")?.classList.add("device-hub-collapsed");
  return "unstuck";
})();
```

**Kill scroll chrome (Phase 3C — persists until cleared):**

```js
localStorage.setItem("hc_shell_scroll_chrome", "0");
location.reload();
// Re-enable: localStorage.removeItem("hc_shell_scroll_chrome"); location.reload();
```

**One-off devtools cleanup (without reload):**

```js
document.getElementById("top-chrome")?.classList.remove("top-chrome--edge-hidden");
document.body.classList.remove("shell-is-scrolling");
```

---

## Files map

| Area | Path |
|------|------|
| Bootstrap / error ring | `site/js/device-status-bootstrap.mjs` |
| Dot + hub open | `site/js/device-status.mjs` |
| Scroll jank | `site/js/device-shell-chrome.mjs` |
| Backdrops | `site/js/device-hub-sheet.mjs`, `site/js/device-inbox-sheet.mjs` |
| Pointer-events / sheets | `site/css/device-shell.css` |
| Scroll class side effects | `site/styles.css` (`shell-is-scrolling`) |
| Module manifest | `site/js/device-status-shell-modules.mjs` |
| E2E | `e2e/device-status-dot.spec.ts`, `playwright.config.ts` |

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-05-26 | **Phase 3C shipped:** `localStorage hc_shell_scroll_chrome=0` disables desktop scroll-edge chrome after reload |
| 2026-05-26 | **Phase 2.2b shipped:** `device-inbox-sheet-loader.mjs`; glance no longer static-imports inbox sheet; graph `v=26` |
| 2026-05-26 | **Phase 2.3 shipped:** Vitest for `shouldAttachDocumentScrollChromeEffects` + `bindSheetLifecycleReconcile` |
| 2026-05-26 | **Phase 2.4 shipped:** cross-link from `STATUS_INDICATOR_STEWARD_GREEN.md` troubleshooting (already present) |
| 2026-05-26 | **Phase 2.2 shipped:** `device-inbox-sheet.mjs` lazy `import()` from `device-status.mjs` (badge/hub/explainer only); graph `v=25` |
| 2026-05-26 | **Phase 2.1 shipped:** Playwright `webkit` + `iPhone 13 Pro` projects; `e2e/safari-shell-scroll.spec.ts`; CI installs WebKit; graph `v=24` (inbox backdrop `aria-hidden` on create) |
| 2026-05-26 | **Phase 1.6 shipped:** `@media (pointer: coarse)` removes `backdrop-filter` on hub/inbox backdrops (solid dim); `device-shell.css?v=36` |
| 2026-05-26 | **Phase 1.5 shipped:** `touch-action: manipulation` on status dot; `visibility: hidden` on collapsed hub/inbox sheets; `device-shell.css?v=35` |
| 2026-05-26 | **Phase 1.4 shipped:** `device-sheet-backdrop-sync.mjs`; reconcile on visibility/focus/pageshow; `syncSheetBackdropClosed` after close |
| 2026-05-26 | **Phase 1.2–1.3 shipped:** document scroll-edge chrome + `shell-is-scrolling` gated to `(pointer: fine)` + `(hover: hover)`; `body.shell-scroll-chrome-off` on touch |
| 2026-05-26 | **Phase 1.1 shipped:** `DEVICE_SHELL_ASSET_VERSION=22`; all manifest URLs and graph peer imports use `?v=22`; shell HTML bootstrap bumped |
| 2026-05-26 | Document opened; private iPhone failure elevates priority of scroll-chrome gating over cache-only narrative |
| 2026-05-26 | Hub-smooth / landing-jank clue → treat `device-shell-chrome.mjs` document scroll listener as primary perf suspect |
| 2026-05-26 | No ground-up rearchitecture; phased P0–P2 plan |

---

## Changelog

| Date | Update |
|------|--------|
| 2026-05-26 | Initial investigation doc + fix plan from cross-device reporter matrix |
| 2026-05-26 | Phase 1.1 implemented (unified graph cache-bust v22) |
| 2026-05-26 | Phase 1.2–1.3 implemented (scroll-edge chrome off on touch; `styles.css?v=92` on shell pages) |
| 2026-05-26 | Phase 1.4 implemented (backdrop lifecycle reconcile) |
| 2026-05-26 | Phase 1.5 implemented (WebKit hit-test hardening) |
| 2026-05-26 | Phase 1.6 implemented (coarse-pointer backdrop blur off) |
| 2026-05-26 | Phase 2.1 implemented (WebKit Playwright smoke) |
| 2026-05-26 | Phase 2.2 implemented (lazy inbox sheet import from device-status) |
| 2026-05-26 | Phase 2.3 implemented (Vitest scroll chrome + backdrop lifecycle) |
| 2026-05-26 | Phase 2.4 implemented (STATUS_INDICATOR troubleshooting link) |
| 2026-05-26 | Phase 2.2b implemented (shared inbox loader; glance off static inbox graph) |
| 2026-05-26 | Phase 3C implemented (scroll chrome localStorage kill switch) |
