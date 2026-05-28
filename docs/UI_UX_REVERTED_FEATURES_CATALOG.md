# UI/UX reverted features catalog (May 25–26)

**Purpose:** Record **each behavior that was removed or rolled back** during the landing-lag / Safari / rate-limit incident, whether reverting it affects other product areas, and how to **rebuild the intent later without reintroducing the laggy paths**.

**Companion docs:** [`UI_UX_SAFE_REBUILD_IMPLEMENTATION.md`](UI_UX_SAFE_REBUILD_IMPLEMENTATION.md) (phased rebuild) · [`UI_UX_REVERT_PLAN.md`](UI_UX_REVERT_PLAN.md) (incident steps & status) · [`SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md`](SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md) (root-cause narrative)

**Baseline (pre–inbox-wave shell):** `4d1e965` (2026-05-25 20:59 CDT)

**Production fixes (committed):**

| Commit | What it removed |
|--------|-----------------|
| [`6bcef6b`](https://github.com/h6811127/humanity.llc/commit/6bcef6b) | Document scroll-edge chrome entirely |
| [`277d08e`](https://github.com/h6811127/humanity.llc/commit/277d08e) | Global `initDeviceOsCoordinator()` from status bootstrap |
| [`733ae5e`](https://github.com/h6811127/humanity.llc/commit/733ae5e) | May 26 WebKit sheet CSS cascade (hit-test, blur-off, visibility) |

**Step 3 cleanup (Safari cascade JS/tests):** Marked done in the revert plan. The old broad Safari cascade was removed; the current repo intentionally restores an invariant-only WebKit smoke (`e2e/safari-shell-scroll.spec.ts`) for dot/hub/backdrop checks. See §11 below.

**Not reverted by this incident:** Device inbox v2 (badge, sheet, dot overlays, live-proof SW), resolver-confirmed card-disabled correctness, module manifest, steward E2E - still shipped. Optional steps 4–6 in the revert plan are **future** rollbacks, not done here.

---

## How to read each section

| Field | Meaning |
|-------|---------|
| **Introduced by** | Commit(s) that added the feature |
| **Reverted by** | Commit or local change that removed it |
| **Lag / rate-limit link** | Why this was treated as harmful or “mystery jank” code |
| **Cross-feature impact** | What still works vs what is weaker without it |
| **Safe rebuild** | How to get the product intent back **without** copying the old implementation |

---

## 1. Document scroll-edge chrome

### What it was

On shell pages with `#top-chrome`, a **global `window` `scroll` listener** (passive) ran on every scroll tick:

- Added `body.shell-is-scrolling` for ~120ms (idle timer).
- Toggled `top-chrome--edge-hidden` on the float bar when scrolling down past a threshold (hide minimal bar / dim chrome); showed again near top or on scroll-up.
- Used `requestAnimationFrame` coalescing; skipped updates when hub sheet open (`device-hub-sheet-open` / `top-chrome--hub-locked`).

Supporting logic lived in `device-shell-chrome.mjs` + `device-shell-chrome-core.mjs` (gating). CSS in `site/styles.css` and `device-shell.css` reacted to `shell-is-scrolling` and `top-chrome--edge-hidden`.

### Introduced by

`c1e1751` (Safari shell regressions), refined in `a1ab3fa` (hysteresis, bottom guard), `88d5d01` (default off + opt-in), then **`6bcef6b` (deleted entirely)**.

### Reverted by

**`6bcef6b`** - listener and `device-shell-chrome-core.mjs` removed; `body.shell-scroll-chrome-off` always set; inset sync only (`syncShellChromeInset` + `ResizeObserver`).

### Lag link

**Primary landing jank on WebKit.** Hub open feels smooth because `body.device-hub-sheet-open { overflow: hidden }` stops document scroll, so this listener barely runs. Closed landing scroll → constant class/opacity/blur churn. Documented as the main “smoking gun” in the Safari investigation.

### Cross-feature impact

| Area | Effect of reversion |
|------|---------------------|
| Landing scroll | **Improved** - main fix target |
| Status dot / hub open | **Unchanged** - dot still opens hub |
| Chrome inset (`--shell-chrome-h`) | **Still updated** on resize; no scroll-hide animation |
| Create / wallet / created shell | Same - no edge-hide on scroll |
| Focus mode / landing layout | **Unchanged** |
| Dead taps | **Indirect** - less scroll-driven layout churn; not a substitute for backdrop fixes |

Leftover CSS for `.top-chrome--edge-hidden` and `body.shell-is-scrolling` remains but **nothing sets those classes** today (inert rules).

### Safe rebuild

**Do not** reattach a document-level scroll listener that toggles chrome classes every frame.

Acceptable directions:

1. **Static chrome** - current state; optional subtle opacity via CSS only (no scroll JS).
2. **Hub-inner scroll only** - if “hide chrome while reading hub,” key off `#device-hub .device-hub-body` scroll, not `window`.
3. **Desktop-only, opt-in** - if ever restored, gate with explicit user setting + `(pointer: fine)` and **never** on `(pointer: coarse)`; cover with Vitest + manual P0-W, not production default.
4. **IntersectionObserver** - observe a sentinel at top of main column instead of per-scroll `rAF` (one threshold crossing vs continuous updates).

**Do not rebuild:** `initScrollEdgeChrome()` + `markScrolling()` + `top-chrome--edge-hidden` on landing document scroll as shipped May 26.

---

## 2. Scroll chrome opt-in kill switch (`device-shell-chrome-core.mjs`)

### What it was

Pure helpers + `localStorage.hc_shell_scroll_chrome === "1"` to enable scroll-edge chrome on fine-pointer desktop after reload. Default off after `88d5d01`. Vitest in `worker/tests/device-shell-chrome.test.ts`.

### Introduced by

`88d5d01`, `189c3a3` (expanded gating)

### Reverted by

**`6bcef6b`** (module deleted with scroll chrome)

### Lag link

Only existed to re-enable feature (1); opt-in still risked accidental enablement and test surface for dead code.

### Cross-feature impact

None operational - feature (1) is gone.

### Safe rebuild

Only if rebuilding (1) under stricter gates above; keep rules in a **tested pure module**, default **off**, no `localStorage` on touch profiles.

---

## 3. Global device OS coordinator auto-start

### What it was

`initDeviceOsCoordinator()` in `device-os-coordinator.mjs` registered on **every shell page** via `device-status.mjs` bootstrap:

| Trigger | Batched work (debounced 300ms) |
|---------|--------------------------------|
| `init` | `fetchResolverHealth` + optional full `refreshWalletNetworkStatuses` + `refreshLiveControlInbox` + tab presence sync |
| `visibilitychange` → visible | Same pipeline |
| `storage` on `hc_wallet`, pins, created, activity, tab presence | Same (cross-tab) |
| `hc-device-hub-changed` | Same |
| `pagehide` | `snapshotNetworkSeenOnExit` only |

Dispatched `hc-device-os-refreshed` (`DEVICE_OS_REFRESHED`) with `networkStatus` + wallet poll detail. Hub and glance listened to refresh card-disabled UI.

### Introduced by

`7ef219d` (coordinator module) + **`d520c9b`** (wired into `device-status.mjs`)

### Reverted by

**`277d08e`** - removed `initDeviceOsCoordinator()` call and `DEVICE_OS_REFRESHED` wiring from `device-status.mjs`, `device-hub-ui.mjs`, `device-hub-glance.mjs`. Status bootstrap now:

- `fetchResolverHealth` only on init + tab visible
- `refreshSummary()` on storage / hub-changed / inbox / network events (UI only, no full wallet poll from dot path)

**Module kept:** `device-os-coordinator.mjs` still exports `initDeviceOsCoordinator` / `requestDeviceOsRefresh` but **nothing calls `init`** in the repo.

### Lag / rate-limit link

**Primary Cloudflare “temporarily rate limited” fix.** N tabs × N saved cards × (health + per-card status + live-proof) on every focus/storage event → edge rate limit and tab meltdown. Worse than scroll jank for production severity.

### Cross-feature impact

| Area | After reversion |
|------|-----------------|
| Status dot network color | **OK** - health-only poll on visible |
| Resolver degraded banner | **OK** - tied to health |
| Hub card rows / network badges | **OK** - `device-hub-ui.mjs` still calls `refreshWalletNetworkStatuses` when hub runs |
| Card-disabled-since-visit (hub/inbox/dot) | **Weaker on landing when hub collapsed** - glance/dot refresh on `NETWORK_REFRESHED`, which hub emits when it polls; no global poll on tab focus unless hub/network path runs |
| Live proof inbox badge | **OK on landing/wallet** - `startLiveControlInboxPolling()` in hub-ui (interval + visible), not coordinator |
| `/create/`, `/created/` | **Fewer background polls** - intentional (`create-hub.mjs` disables live-control inbox on create) |
| Background OS notifications SW | **Unchanged** - separate SW path |
| Cross-tab wallet sync UI | **OK** - storage → `refreshSummary()`; hub still refreshes on storage when mounted |
| Docs mentioning `DEVICE_OS_REFRESHED` | **Stale** - update when rebuilding (e.g. `CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md`, `DEVICE_HUB_REPAIR_SPEC.md`) |

### Safe rebuild

**Do not** call `initDeviceOsCoordinator()` from `device-status.mjs` again.

Acceptable patterns:

1. **Scoped entry points** - start coordinator (or equivalent) only from `initDeviceHub()` when `showLiveControlInbox` / wallet present, or when hub expands.
2. **Split pipelines** - health-only on status dot; wallet network poll only when hub visible or user opens inbox; live-proof only via existing `startLiveControlInboxPolling`.
3. **Throttle storage** - ignore `storage` for full wallet poll; debounce per-tab leader election if cross-tab sync is required.
4. **Explicit manual refresh** - “Retry” on dot already calls `refreshNetwork()`; extend hub actions instead of global auto-batch.

Re-enabling coordinator globally without scoping repeats the rate-limit incident.

---

## 4. `DEVICE_OS_REFRESHED` hub / glance listeners

### What it was

After coordinator poll, hub ran `reapplyRevokedSinceVisitFromLatestResolved()` + inbox groups; glance re-rendered card-disabled rows.

### Introduced by

`d14f3b6` / coordinator integration (`d520c9b`)

### Reverted by

**`277d08e`** (listeners removed)

### Cross-feature impact

Card-disabled glance lines may update **one poll later** until hub triggers `NETWORK_REFRESHED` or user opens hub. Inbox/dot still use resolver-confirmed maps when hub/inbox refresh runs. **Correctness preserved**; **timeliness** reduced on collapsed landing.

### Safe rebuild

On `NETWORK_REFRESHED`, hub already passes `resolverConfirmedMap` in event detail - prefer **that** event only. If adding coordinator back, scope it to hub-initiated polls so one event path remains.

---

## 5. Chrome inset “floor” (monotonic `--shell-chrome-h`)

### What it was

`chromeInsetFloor` - only increase measured bar height, never shrink, to avoid scroll jump when cluster positioning changed (`a1ab3fa`).

### Introduced by

`a1ab3fa`

### Reverted by

**`6bcef6b`** - inset uses live measured height each sync (no floor).

### Lag link

Minor; floor was a **layout-stability** fix paired with scroll-edge + fixed cluster. Removing scroll chrome reduced need; floor could leave excess padding if bar shrinks.

### Cross-feature impact

Possible **small scroll jump** at page bottom if chrome height changes dynamically; report if it returns on iPhone.

### Safe rebuild

If jump returns **without** scroll-edge chrome: restore floor **only** in `syncShellChromeInset`, not scroll listeners.

---

## 6. Fixed status cluster on `top-chrome--edge-hidden` (CSS)

### What it was

While scroll-edge hid the bar, status dot cluster used `position: fixed` + `pointer-events: auto` so dot stayed tappable (`a1ab3fa` partially; cascade expanded in `733ae5e` revert diff).

### Reverted by

**`733ae5e`** removed `.top-chrome--float.top-chrome--edge-hidden .shell-status-cluster` from the “always reachable” rule set (edge-hidden no longer used anyway).

### Cross-feature impact

**None today** - class never toggled. If scroll-edge returns, dot reachability must be redesigned (hub-inner or inset-only).

### Safe rebuild

Never combine fixed cluster + shrinking `--shell-chrome-h` + document scroll (root cause of `a1ab3fa` jump).

---

## 7. Lazy inbox sheet loader (Phase 2.2 / 2.2b)

### What it was

`device-inbox-sheet-loader.mjs` - dynamic `import()` of `device-inbox-sheet.mjs` so `device-status.mjs` did not static-import the full inbox sheet graph at dot bootstrap. `openInboxFromChrome` / `closeInboxSheet` proxied through loader. Glance stopped static-importing inbox sheet (`189c3a3`).

### Introduced by

`fcd9ed7`, `189c3a3`

### Reverted by

**Step 3 (local / pending commit):** delete loader; `device-status.mjs` imports `device-inbox-sheet.mjs` directly again. Vitest `device-status-lazy-inbox.test.ts` removed.

### Lag link

**Not landing scroll lag** - aimed at **dot bootstrap failures** (large graph, Safari flaky import). Tradeoff: first badge tap pays import cost; smaller initial graph.

### Cross-feature impact

| Area | Effect |
|------|--------|
| Status dot load reliability | **Slightly worse** on slow networks - heavier initial `device-status` graph |
| First inbox open | **Faster** - no extra dynamic import |
| Module manifest / E2E | Simpler graph; manifest must list all static imports |
| Red error ring on dot | Theoretically more likely if inbox sheet import fails at bootstrap |

### Safe rebuild

If dot load failures return on Safari:

1. Lazy-load **only** `device-inbox-sheet.mjs`, not via status static import chain from glance.
2. Keep `openInboxFromChrome` on a tiny loader module listed in `DEVICE_STATUS_SHELL_JS_FILES`.
3. Do **not** combine with global coordinator or scroll chrome.

Alternative: split `device-inbox-sheet-core.mjs` (DOM + open/close) from heavy row builders.

---

## 8. Backdrop lifecycle reconcile (`device-sheet-backdrop-sync.mjs`)

### What it was

`syncSheetBackdropClosed(backdrop)` - force `hidden`, remove `is-visible`, set `aria-hidden`.

`bindSheetLifecycleReconcile(reconcile)` - run hub/inbox `reconcile*SheetState` on `visibilitychange` (visible), `window` `focus`, and `pageshow`.

Called from hub/inbox sheet modules after close and on init; replaced bfcache-only `pageshow` in hub sheet.

### Introduced by

`c8004d8`

### Reverted by

**Step 3 (local / pending):** module deleted; hub sheet back to `pageshow` + `e.persisted` only; inbox sheet similar.

**`733ae5e`** also removed `[hidden] { visibility: hidden }` backdrop rules from cascade.

### Lag link

**Not scroll lag** - fixed **dead taps** from stuck `.is-visible` backdrops. Extra listeners run rarely (tab focus), negligible perf.

### Cross-feature impact

| Area | Effect |
|------|--------|
| Dead buttons / dead dot | **Risk increased** on Safari bfcache or stuck backdrop after fast navigation |
| Hub/inbox close | Still sets backdrop state in `setHubSheetOpen` / `setInboxSheetOpen` |
| Accessibility | `aria-hidden` on backdrop may be less consistent on close |

### Safe rebuild

Reintroduce **only** the pure helpers + lifecycle binds:

1. No scroll listeners.
2. Call `syncSheetBackdropClosed` in `set*SheetOpen(false)` (idempotent).
3. Keep `pageshow` + `persisted` **and** `bindSheetLifecycleReconcile` - low cost.
4. Vitest `device-sheet-backdrop-sync.test.ts` (restore from `c8004d8`).

Do not bundle with WebKit `visibility:hidden` sheet CSS unless hit-testing is validated on iPhone.

---

## 9. WebKit sheet hit-test CSS (Phase 1.5)

### What it was

- Collapsed hub/inbox sheets: `visibility: hidden`, `contain: strict`, `pointer-events: none`, backdrop filters stripped.
- Expanded sheets: `visibility: visible`.
- Hub collapsed: removed always-on `visibility: visible` on expanded rule.
- `touch-action: manipulation` on dot button.
- Backdrop `[hidden] { visibility: hidden; pointer-events: none }`.
- Status cluster `pointer-events: auto` when `top-chrome--edge-hidden`.

### Introduced by

`b83a35f`, parts of `c8004d8` / `a1ab3fa`

### Reverted by

**`733ae5e`**

### Lag link

**Possible scroll jank** on coarse pointers when combined with backdrop-filter on full-screen overlays (`fa5acbf`). Hit-test rules themselves are cheap; blur removal was the perf lever.

### Cross-feature impact

| Area | Effect |
|------|--------|
| Dead dot after hard refresh | May **return** intermittently - investigate before re-adding |
| Collapsed sheet blocking taps | **Risk** - invisible sheet intercepting hits if classes desync |
| GPU / scroll | **Improved** on touch - less full-screen blur |

### Safe rebuild

One change at a time on real iPhone (P0-W):

1. Restore `device-hub-backdrop[hidden] { pointer-events: none }` without `visibility:hidden` on sheets first.
2. If dead taps persist, try `visibility:hidden` **only** on collapsed hub, not inbox + not while hub locked open.
3. Never re-add `top-chrome--edge-hidden` cluster fix without removing scroll-edge chrome.

---

## 10. Touch backdrop blur disable (Phase 1.6)

### What it was

`@media (pointer: coarse)` - hub sheet, glance popover, and sheet backdrops use solid rgba backgrounds; `backdrop-filter: none`.

### Introduced by

`fa5acbf`

### Reverted by

**`733ae5e`**

### Lag link

Blur on large fixed layers during document scroll is expensive on WebKit.

### Cross-feature impact

**Visual:** frosted glass returns on phone. **Perf:** possible minor scroll cost when sheets exist in DOM. **Functional:** none.

### Safe rebuild

If scroll regresses on iPhone with hub closed:

- Disable blur **only** on backdrops, not on hub body, via coarse-pointer media query.
- Do not tie to document scroll listener.

---

## 11. Safari shell Playwright smoke (`e2e/safari-shell-scroll.spec.ts`)

### What it was

WebKit project tests: scroll landing, dot/hub, optional scroll-chrome flag, backdrop reconcile behavior. CI `test-site.yml` / `playwright.config.ts` WebKit project.

### Introduced by

`1aa878b`, extended in `618cae8`

### Reverted by

**Step 3 cleanup:** the old broad spec was removed with the cascade. The current state is rebuilt as an invariant-only smoke in `e2e/safari-shell-scroll.spec.ts` and wired through `playwright.config.ts` + `.github/workflows/test-site.yml`.

### Cross-feature impact

**Regression detection** for scroll + Safari shell only. Chromium device E2E remain. **P0-W** manual sign-off still required.

### Safe rebuild

After any shell scroll or backdrop change:

- Keep tests limited to **invariants** (dot opens hub, no stuck backdrop), not scroll-edge class toggling.
- Keep WebKit CI as a regression gate while stable; **P0-W** remains the real-device sign-off.

---

## 12. `88d5d01` - scroll chrome default-off (superseded)

### What it was

Intermediate state: scroll chrome behind opt-in + `shell-scroll-chrome-off` by default.

### Reverted by

**`6bcef6b`** (full removal, strict superset)

### Safe rebuild

N/A - use §1 instead.

---

## Still shipped (not reverted) - do not confuse with this catalog

These landed in the same timeframe but **were not removed** by `6bcef6b` / `277d08e` / `733ae5e` / step 3:

| Feature | Notes |
|---------|--------|
| Device inbox v2 (badge, sheet, priorities) | [`DEVICE_INBOX.md`](DEVICE_INBOX.md) |
| Dot overlays (proof, cross-tab, card-disabled) | Still in `device-inbox.mjs` / dot state |
| Live-proof service worker | Background alerts |
| Resolver-confirmed card-disabled maps | Hub/inbox correctness |
| `device-status-shell-modules.mjs` manifest | Import graph guard |
| Hub scoped wallet poll + live-control interval | `device-hub-ui.mjs` |

Optional revert plan steps **4–6** would roll these back to `4d1e965`; that is a **product decision**, not required for lag/rate-limit recovery.

---

## Rebuild priority matrix

When bringing behavior back, use this order (safest first):

| Priority | Feature | Risk if restored naïvely |
|----------|---------|---------------------------|
| 1 | Backdrop reconcile (§8) | Low - dead taps |
| 2 | `[hidden]` backdrop pointer-events (§9, partial) | Low–medium |
| 3 | Lazy inbox loader (§7) | Medium - graph size |
| 4 | Touch blur-off (§10) | Low–medium - visuals/scroll |
| 5 | Chrome inset floor (§5) | Low |
| 6 | Scoped coordinator (§3) | **High** - rate limits |
| 7 | Document scroll-edge chrome (§1) | **High** - landing lag |

---

## Verification after any rebuild

```bash
npm run worker:test
npm run worker:test -- worker/tests/device-status-shell-modules.test.ts
npm run e2e -- e2e/device-status-dot.spec.ts e2e/device-inbox.spec.ts e2e/device-os-wallet.spec.ts
```

Manual: [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P0-3** (dot → hub), **P0-W** (iPhone Safari scroll + tap), multi-tab rate-limit smoke (no Cloudflare interstitial).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-26 | Initial catalog: features 1–12 from commits `6bcef6b`, `277d08e`, `733ae5e`, and May 26 Safari cascade |
