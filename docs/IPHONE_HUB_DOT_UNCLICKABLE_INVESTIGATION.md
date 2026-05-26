# Investigation: iPhone — status dot / hub / shortcuts feel dead

**Date:** 2026-05-26  
**Reporter symptom:** On iPhone (Safari and Chrome), the status indicator (`#brand-status-dot-btn`) does not open the hub; “Shortcuts” and “Settings” cannot be tapped. Same site works on iPad and laptop.  
**Scope:** Read-only code + docs review (no device lab in this session; Playwright WebKit not installed locally).  
**Related:** [`SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md`](SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md) (master doc + fix plan), [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md) (troubleshooting), [`STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md`](STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md), [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) P0-3

---

## Executive summary

The device shell is built around a **floating top chrome** (status dot) and a **fixed bottom hub sheet**, with deliberate `pointer-events` rules so the dot stays tappable while the sheet is open or while the bar is visually hidden on scroll. When that stack or the status **JavaScript module graph** fails, users see exactly this report: dot dead, hub shortcuts dead, and (on `/`) the on-page **Shortcuts & settings** block dead if a full-screen backdrop is swallowing touches.

iPhone and iPad both use **WebKit** for Safari and for “Chrome” on iOS, so a true engine split (Safari vs Chrome) is unlikely. The more plausible iPhone-specific angles are:

1. **Stale cached CSS vs fresh JS** (classic mobile cache skew) — especially the `shell-status-cluster` override that keeps the dot clickable when `body.device-hub-sheet-open` is set.
2. **Stuck hub/backdrop open state** — invisible dimmer at `z-index: 54` blocking the page; dot also dead if the cluster override CSS is missing.
3. **`device-status.mjs` never loads** — no click listener; red error ring on dot if bootstrap ran.
4. **Test gap** — CI emulates **Pixel 5 (Chromium)** only, not iPhone WebKit viewports.

---

## What “Shortcuts & settings” refers to in the product

Two separate surfaces use similar copy:

| Surface | Location | How users reach it |
|--------|----------|-------------------|
| **Hub row** | `#device-hub-shortcuts-group` → link “Settings & shortcuts” | Status dot → hub sheet |
| **Landing block** | `#landing-device-settings` (“Shortcuts & settings”) | Scroll on `/` (below hero / progress) |

If **both** the dot and the landing settings rows are dead, suspect a **global touch blocker** (backdrop) or **module load failure**, not only the dot handler.

If only the **hub row** fails but landing settings work, suspect **hub sheet `pointer-events`** or hub open-state desync.

---

## Expected behavior (reference)

| Page | Dot tap |
|------|---------|
| `/`, `/create/`, `/created/` | Toggles `#device-hub.device-hub--sheet` (open / close) |
| `/wallet/` | Scrolls to saved cards — **no** bottom sheet |

Handler chain: `#brand-status-dot-btn` `click` → `openHubFromChrome()` → `setHubExpanded()` → `setHubSheetOpen()` (`site/js/device-status.mjs`, `site/js/device-hub-sheet.mjs`).

---

## Architecture (click path and stacking)

### Z-order (simplified)

```
z-index 65  .shell-status-cluster (fixed, when hub open / edge-hidden / hub-locked)
z-index 60  #top-chrome.top-chrome--float
z-index 57  .device-inbox-sheet (when open)
z-index 56  #device-inbox-backdrop (when .is-visible)
z-index 55  #device-hub.device-hub--sheet
z-index 54  #device-hub-backdrop (when .is-visible)
z-index ≤3  main content (.screen-landing, #landing-device-settings, …)
```

### Pointer-events model (`site/css/device-shell.css`)

- `#top-chrome.top-chrome--float` → `pointer-events: none` (pass-through shell).
- `.top-chrome-bar--minimal` / `--wallet` → `pointer-events: auto` (normal: dot lives here).
- When `body.device-hub-sheet-open` or `.top-chrome--hub-locked`:
  - Bar → `pointer-events: none` (hidden).
  - **`.shell-status-cluster` → `pointer-events: auto` + `position: fixed` + `z-index: 65`** so the dot still receives taps.
- Collapsed hub → `pointer-events: none`; open hub → `pointer-events: auto`.
- Closed backdrops → `pointer-events: none`; `.is-visible` → `pointer-events: auto` (full-screen tap target to dismiss).

This design shipped after commit `77816d1` (see status-dot postmortem). **If an iPhone has old `device-shell.css` cached but new JS**, the body can get `device-hub-sheet-open` while the dot cluster never regains `pointer-events: auto` — the dot and most of the page feel dead.

### Module load

Shell pages load `device-status-bootstrap.mjs?v=21`, which dynamic-imports `device-status.mjs`. On failure, `#top-chrome` gets `data-device-status-error` (red outline on the dot) and **no** `click` listener is registered.

`device-shell-chrome.mjs` (scroll hide, `--shell-chrome-h`) is imported from `device-status.mjs`; it does not run if the status graph aborts.

---

## Why iPad / laptop can work while iPhone fails

| Factor | iPhone | iPad / laptop |
|--------|--------|----------------|
| Engine (Safari / iOS Chrome) | WebKit | WebKit / desktop Chrome |
| Viewport | Narrow (~390px); chrome spans full width | Often wider; same 430px column but different scroll habits |
| Cache behavior | Aggressive HTTP cache for CSS; PWA / “Add to Home Screen” amplifies skew | Often hard-refreshed during dev; desktop cache easier to clear |
| Automated tests | **Not covered** in default CI | Pixel 5 Chromium only (`playwright.config.ts`) |

Same URL does **not** guarantee same cached asset versions on each device.

---

## Ranked hypotheses

### 1. CSS / JS cache mismatch on the phone (high)

**Mechanism:** New `device-status.mjs` sets hub/backdrop/body classes; old CSS lacks `body.device-hub-sheet-open .shell-status-cluster { pointer-events: auto; … }`.

**Symptoms:** Dot dead; landing settings rows dead; page may look undimmed or slightly dimmed depending on backdrop CSS version. No red dot ring if JS loaded.

**On-device checks:**

- Settings → Safari → Clear Website Data for the site, or long-press reload → hard refresh.
- Private tab: if everything works, cache skew is likely.

**Compare asset versions:** Note `device-shell.css?v=` and `device-status-bootstrap.mjs?v=` in page source; they should match current deploy (`device-shell.css?v=33`, bootstrap `?v=21` on `/` at time of writing).

---

### 2. Stuck hub backdrop or sheet-open classes (high)

**Mechanism:** `#device-hub-backdrop.is-visible` with `pointer-events: auto` covers the viewport at z-index 54. Main content and `#landing-device-settings` are below that layer. Dot should still work **if** cluster override CSS is present; if not, dot is dead too.

**On-device checks (Safari Web Inspector via Mac, or Eruda if enabled):**

```js
({
  bodyOpen: document.body.classList.contains('device-hub-sheet-open'),
  hubCollapsed: document.getElementById('device-hub')?.classList.contains('device-hub-collapsed'),
  backdrop: document.getElementById('device-hub-backdrop')?.className,
  backdropHidden: document.getElementById('device-hub-backdrop')?.hidden,
  chromeError: document.getElementById('top-chrome')?.dataset.deviceStatusError,
})
```

**Expected when hub closed:** `bodyOpen: false`, `hubCollapsed: true`, backdrop not `.is-visible`, `hidden: true`.

**Recovery:** `reconcileHubSheetState()` runs on hub sheet init and on `pageshow` (bfcache); if JS never loaded, classes can remain stuck until reload after cache clear.

---

### 3. `device-status.mjs` import graph failure (medium)

**Mechanism:** Any missing or throwing module in `DEVICE_STATUS_SHELL_JS_FILES` (`site/js/device-status-shell-modules.mjs`) prevents bootstrap from attaching the dot listener.

**Symptoms:** Dot visible but inert; **`data-device-status-error` on `#top-chrome`** and red outline on dot; theme/hub list may still partially work via `landing-device-hub.mjs` depending on failure point.

**On-device checks:** Console for failed `import` / 404 on `/js/device-inbox-sheet.mjs`, etc. Enable diagnostics:

```js
localStorage.setItem('hc_dot_diagnostics', '1');
// reload, tap dot, then:
JSON.parse(sessionStorage.getItem('hc_dot_diag_log') || '[]');
```

Missing `{ type: 'dot_click' }` after tap → handler never ran.

---

### 4. Hub state desync (toggle trap) (medium)

**Mechanism:** `body.device-hub-sheet-open` true while `#device-hub` still has `device-hub-collapsed`. First tap calls close path with no visible change.

**Mitigation in code:** `hubSheetOpen()` treats collapsed hub as closed (`device-status.mjs`); `reconcileHubSheetState()` on init / bfcache.

**Symptoms:** Dot “does nothing” on first taps; may work after several taps or reload. Less likely if shortcuts on the **landing** section are also dead.

---

### 5. iOS hit-testing edge cases (lower — needs WebKit repro)

Theoretical WebKit issues worth validating in **WebKit** (not Chromium):

- Transformed `position: fixed` hub sheet (`translateY(100%)`) still participating in hit-testing when `pointer-events: none` is missing on an old build.
- `click`-only handler on the dot without `touch-action: manipulation` (legacy 300ms less common on current iOS but still a cheap hardening).
- `content-visibility: auto` on landing tutorial sections — **does not** apply to `#landing-device-settings` (no `data-landing-tutorial`), so unlikely for that block.

---

### 6. Wallet misunderstanding (low if reporter uses `/`)

On `/wallet/`, the dot **scrolls** to saved cards; it does not open a sheet. Unlikely to explain landing “Shortcuts & settings” also failing.

---

## What does *not* explain iPhone-only failure

- **Safari vs Chrome on iPhone** — same WebKit; both failing supports environmental/cache/state, not “wrong browser.”
- **Pass card tilt** — landing `/` has no `#pass-scene` in `index.html`; pass handlers are not in play on the homepage.
- **Separate iPhone wallet sync** — keys do not sync between devices; that affects steward state, not whether the dot opens the hub.

---

## Test coverage gap

| Check | Current state |
|-------|----------------|
| `e2e/device-status-dot.spec.ts` | Passes on **Pixel 5** (Chromium) |
| WebKit / iPhone 13 Pro profile | **Not in** default `playwright.config.ts` |
| Real device QA | [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) P0-3 — manual |

**Recommendation:** Add a Playwright project using `devices['iPhone 13 Pro']` and `webkit` for at least: dot opens hub, dot works with `top-chrome--edge-hidden`, `elementFromPoint` at dot center hits `#brand-status-dot-btn`, backdrop closed when hub collapsed.

---

## On-iPhone diagnosis playbook (for the reporter)

Do these in order (~2 minutes):

1. **Visual** — Red ring on status dot? → module load failure (§3). See postmortem doc.
2. **Hard refresh / clear site data** — If fixed → cache skew (§1).
3. **Private tab** — If fixed → cache or extension/content blocker on normal profile.
4. **Console state** — Run the stuck-state snippet in §2.
5. **Diagnostics** — `hc_dot_diagnostics` + tap dot; confirm `dot_click` and `hub_toggle` entries.
6. **Which page** — `/` vs `/created/` vs `/wallet/`; note whether **landing** settings rows (scroll down on `/`) work when the dot does not.
7. **Optional** — Mac Safari → Develop → [iPhone] → inspect; Network tab for 404 on `/js/device-*.mjs`.

---

## Engineering follow-ups (if repro confirmed)

Prioritized by leverage:

1. **CI:** WebKit + iPhone viewport smoke for dot, backdrop closed, `elementFromPoint` on dot.
2. **Cache bust:** When touching `device-shell.css` pointer-events section, bump `device-shell.css?v=` on **all** shell HTML (`/`, `/create/`, `/created/`, `/wallet/`) in the same deploy.
3. **Runtime hardening (if WebKit repro):** `touch-action: manipulation` on `.shell-status-dot-btn`; optional `pointerdown` → `openHubFromChrome` guard; consider `visibility: hidden` on collapsed hub sheet in addition to `pointer-events: none` for iOS hit-testing.
4. **UX:** Hub link `href="#landing-device-settings"` scrolls content **behind** an open backdrop — on phone, close sheet first or navigate in-sheet; document or close-on-hash.
5. **Support doc:** Link this file from [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md) troubleshooting for “works on iPad, not iPhone.”

---

## Files reviewed

| Area | Path |
|------|------|
| Dot + hub logic | `site/js/device-status.mjs`, `site/js/device-hub-sheet.mjs`, `site/js/device-hub-sheet-core.mjs` |
| Bootstrap / module list | `site/js/device-status-bootstrap.mjs`, `site/js/device-status-shell-modules.mjs` |
| Chrome scroll | `site/js/device-shell-chrome.mjs` |
| Pointer-events / sheets | `site/css/device-shell.css` |
| Landing settings + hub shortcuts | `site/index.html` |
| E2E | `e2e/device-status-dot.spec.ts`, `playwright.config.ts` |
| Existing troubleshooting | `docs/STATUS_INDICATOR_STEWARD_GREEN.md`, `docs/STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md` |

---

## Update (2026-05-26) — scroll jank on all devices

Follow-up report: laggy/jumpy scroll on `/` and `/created/`, rapid up/down glitch at the **bottom** of the page on Android and iPhone (all devices).

**Root cause (confirmed in code review):** scroll-edge chrome (`top-chrome--edge-hidden`) moved `.shell-status-cluster` to `position: fixed`, which **collapsed the top bar height**. `ResizeObserver` in `device-shell-chrome.mjs` then lowered `--shell-chrome-h` and **`padding-top` on `.page`**, shifting document layout on every scroll-direction flip. At the document bottom, rubber-band overscroll oscillated `scrollY` → edge-hidden toggled rapidly → padding thrashed → visible glitch. Landing also used `content-visibility: auto` on tutorial sections (commit `0ae74a6`), which adds layout instability on mobile.

**Fix shipped:**

- `site/css/device-shell.css` — fixed positioning for status cluster only when hub sheet open / hub-locked, **not** on scroll-edge-hidden.
- `site/js/device-shell-chrome.mjs` — chrome inset **floor** (never shrink measured height); scroll **hysteresis** + **bottom guard** (no edge-hidden toggling near max scroll).
- `site/styles.css` — removed `content-visibility: auto` on landing tutorial blocks.
- Cache-bust: `device-shell.css?v=34`, `styles.css?v=91` on `/`.

---

## Conclusion

The codebase already documents “dead dot” failures; **stale CSS/JS** and **stuck hub backdrop** remain valid checks. The **all-device scroll glitch** was a separate layout bug in scroll-edge chrome + landing `content-visibility`, fixed as above. After deploy, hard-refresh once on each device to pick up `?v=34` / `?v=91`.

**Update (2026-05-26):** Follow-up testing showed **iPhone Safari still broken after private tab and cleared website data** (not cache-only). Mac Safari intermittent red ring; hub smooth when open but landing scroll laggy. See **[`SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md`](SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md)** for the consolidated fix plan.
