# Shell page load content flash — investigation

**Status:** RC-1–RC-17 **shipped** (2026-05-30) · **RC-18 scoped** (2026-06-02 — Nord cold hub; Smooth Phase 0 outlier)  
**Date:** 2026-05-30 (RC-18 scope 2026-06-02)  
**Reported symptom:** Opening any shell or device page shows wrong or “random” data for a brief moment, then content disappears or is replaced with local device truth. Distracting and ugly.  
**Related:** [`CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md`](CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md) (stub → archive) · [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md) · [`PRODUCTION_SAD_PATH_QA_2026-05-26.md`](PRODUCTION_SAD_PATH_QA_2026-05-26.md) · [`SCAN_PAGE_DEVICE_DOT.md`](SCAN_PAGE_DEVICE_DOT.md) · [`CREATED_QR_BOOTSTRAP_FIX.md`](CREATED_QR_BOOTSTRAP_FIX.md)

---

## Executive summary

The product is **static HTML first, JavaScript second**. Shell pages ship large HTML shells with placeholder copy, default chips, and hidden panels. Module scripts boot asynchronously (often after network I/O). Until client code runs and reconciles **sessionStorage**, **localStorage**, and **resolver polls**, the user can see:

1. Placeholder strings baked into HTML (`Active`, `Registered`, `Checking link…`, ` - `).
2. Stale cached network rows from a prior visit (`hc_wallet_network_cache`, `hc_wallet_summary`).
3. A **first paint** from `device-status-core.mjs` that assumes resolver **offline** and may assume **steward** from summary cache before the full status graph loads.
4. **Intentional** scan-page “arriving” animation that transitions from pending → settled labels.
5. On `/created/`, a window where **both** setup wizard and control tabs are unhidden before workspace mode is applied.

There is **no SSR personalization** on Pages shell routes. The Worker only SSRs **scan** pages (`/c/…`). Everything under `/`, `/wallet/`, `/create/`, `/created/` is the same HTML for every visitor until JS runs.

---

## Where is “Advanced”? (navigation — not a flash, but blocked the steward UX)

There is **no tab labeled “Advanced”** on `/created/` today.

| What docs/copy say | What the UI shows |
|--------------------|-------------------|
| “Advanced”, “Open controls → Advanced” | Tab button text is **Manage** (`#created-tab-btn-advanced`, `data-created-tab="advanced"`) |
| Steward review queue link in dot explainer | Disclosure inside **Manage** tab → `#created-manage-tools` |
| Steward vouch privileges (if shipped) | Same **Manage** tab, above review queue |

**How to reach steward tools on `/created/`:**

1. You must be in **control** workspace mode (not the first-run **setup wizard**). Setup hides `#created-control-root` entirely until `hc_setup_done` + wallet save + backup seatbelt rules pass (`created-mode.mjs` → `resolveCreatedMode`).
2. Open **Manage** (second tab next to **Live**). URL hash becomes `#advanced`.
3. Scroll **Manage** panel → `#created-manage-tools` → disclosures (steward vouch privileges, steward review queue, vouch revoke, etc.).

**Separate “advanced” on Live tab:** `#created-tab-now` contains a `<details class="created-advanced-block">` summary **“Network status & IDs”** — that is not the Manage tab and does not contain steward review.

**If you only see setup steps or “Checking link…”:** You are not in control mode yet, or route gate has not finished (`applyCreatedRoutePendingShell` keeps `#created-control-root` hidden while `data-created-route="pending"`).

---

## Architecture: why flash is structurally likely

```text
Browser paints HTML (placeholders + hidden attrs)
        ↓
Inline scripts (theme, www redirect, /created/ wallet redirect)
        ↓
device-status-bootstrap.mjs → dynamic import chain (core → full status)
        ↓ parallel
Page module (created.mjs, wallet-page.mjs, …) — often top-level await
        ↓
localStorage / sessionStorage read + hub re-render (innerHTML)
        ↓
Optional resolver fetch (health, card status, route gate)
        ↓
Second-pass UI (applyDot, renderSavedRows, refreshNetworkStatus)
```

Any step that paints before the next step completes can flash “wrong” data.

---

## Root causes

### RC-1 · Static HTML placeholders visible before any JS

**Status:** Fixed (2026-05-30) — `data-boot="pending"` on shell bodies; `.device-boot-gated` CSS hides personalized rows until `markDeviceBootReady()`.

**Surfaces:** All shell pages; worst on `/created/`.

**Mechanism (historical):** `site/created/index.html` (and siblings) embed default text in the DOM:

| Element | Static default (was) | Updated by |
|---------|----------------|------------|
| `.created-hero-title` | `Checking link…` | `applyCreatedRouteShell`, then `applyCreatedWorkspaceMode` |
| `#created-handle` | ` - ` | Session / gate card in `created.mjs` |
| `#network-card-status` | `Active` | `refreshNetworkStatus()` |
| `#human-trust-label` / sub | `Vouch status` / `No accepted vouches yet.` | `applyHumanTrustDisplay` after status fetch |
| `#network-qr-expires` | ` - ` | Session + network poll |
| Hub `#device-hub-saved-empty` | “Cards you save…” | `renderSavedRows` when wallet count > 0 |

**Timing (was):** From first paint until the page module assigns real values (often after `await gateCreatedRoute` on `/created/`).

**Fix:** `device-shell-boot-core.mjs` + `device-shell-boot.mjs`; CSS `[data-boot=ready]` in `device-shell.css`; `/created/` marks ready after initial session populate; hub/wallet/landing mark ready after first chrome refresh (`markDeviceBootReadyIfShellPage`).

**Evidence:** `site/js/device-shell-boot.mjs`; `site/css/device-shell.css`; `site/created/index.html` `device-boot-gated`; `created.mjs` `markDeviceBootReady`.

**Why it felt random:** User with steward verification still saw “Registered” / “Vouch status” for one frame because HTML defaults were generic, not empty.

---

### RC-2 · `/created/` route gate async gap + shell visibility race

**Status:** Fixed (2026-05-30) — route shell no longer unhides workspace roots; `applyCreatedWorkspaceMode` runs immediately after session/gate merge in `bootCreatedMain`.

**Surfaces:** `/created/` only.

**Mechanism (historical):**

1. `created.mjs` calls `applyCreatedRoutePendingShell()` immediately → `#created-setup-root` and `#created-control-root` **hidden**, hero `Checking link…`.
2. Top-level `await gateCreatedRoute(...)` — network fetch to resolver.
3. On success, `applyCreatedRouteShell({ action: "ok" })` set `blocked = false` → **both** `#created-setup-root` and `#created-control-root` got `hidden = false` simultaneously.
4. `applyCreatedWorkspaceMode(mode)` ran later in `bootCreatedMain` (after many sync initializers) and hid one of them based on `setup` vs `control`.

**Gap (was):** Between steps 3 and 4, user could see **setup wizard and Manage/Live tabs at the same time**, plus placeholder network rows inside the now-visible control root.

**Fix:** `createdRouteShellHidesWorkspaceRoots()` always returns true; only `applyCreatedWorkspaceMode` sets `hidden` on setup vs control. Workspace mode is applied right after gate card session merge, before handle/network DOM updates.

**Evidence:** `created-route-gate-core.mjs` `createdRouteShellHidesWorkspaceRoots`; `created-route-gate.mjs` `applyCreatedRouteShell`; `created.mjs` early `applyCreatedWorkspaceMode`.

**Related historical bug:** P0-1 in [`PRODUCTION_SAD_PATH_QA_2026-05-26.md`](PRODUCTION_SAD_PATH_QA_2026-05-26.md) — hero/readiness inconsistent with resolver until poll (partially gated since route gate shipped).

---

### RC-3 · Two-stage status dot bootstrap (offline → ok, device axis correction)

**Status:** Fixed (2026-05-30) — core defers `applyCoreDot()`; dot hidden until first settled `applyDot()` after health fetch + quiet rehydrate.

**Surfaces:** `/`, `/create/`, `/created/`, `/wallet/` (all pages with `device-status-bootstrap.mjs`).

**Mechanism (historical):**

1. `device-status-bootstrap.mjs` dynamically imports `device-status-core.mjs`.
2. Core initialized `networkStatus = "offline"` and called `applyCoreDot()` using **wallet summary cache only** (`deviceStateForCore` hardcodes `unsavedTabKeys: false`).
3. Later, `device-status.mjs` loaded, ran `maybeQuietTabRehydrate()`, `refreshNetwork()` (async health fetch), then `refreshSummary()` → `applyDot()` again with true tab session + health.

**User-visible effect (was):** Dot color, `data-dot-state`, aria-label, and hub status panel could **change twice** on load (e.g. offline/neutral → ok/steward green). Documented QA signal: “borrowed-phone flash of steward green” in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) P0-3 fail signals.

**Fix:** `device-status-dot-boot-core.mjs` + `data-dot-boot` on `#brand-status-dot-btn`; core sets pending and skips initial paint; `bootDeviceStatusShell` awaits `refreshNetwork()` before first chrome refresh; `markDotBootstrapSettled()` + `markDotBootReadyIfSettled()` on first settled `applyDot()`. Partial load fallback paints via `applyCoreDot()` in `wireStatusPartialLoadDot`.

**Evidence:** `device-status-dot-boot.mjs`; `device-status-core.mjs` `wireDotAndHub`; `device-status.mjs` `bootDeviceStatusShell`, `refreshNetwork`, `applyDot`.

---

### RC-4 · Stale `sessionStorage` network cache (`hc_wallet_network_cache`)

**Status:** Fixed (2026-05-30) — hub rows show per-profile **checking** chips until `isResolverConfirmedProfile(profileId)`; cache ignored for identity/icon/scan-kind until poll confirms.

**Surfaces:** Hub saved rows, wallet page rows, inbox/banners tied to poll maps.

**Mechanism (historical):** `device-wallet-network.mjs` persists per-profile status in `sessionStorage`. Hub `renderSavedRows` read `getCachedNetworkStatus`, `getCachedVerification`, `getCachedNetworkScanKind` **before** or between polls. If cache reflected a prior session (revoked, disabled, wrong verification label), chips and banners showed that until `fetchAndApplyNetworkChips` completed.

**User-visible effect (was):** Card labels, verification chips, “disabled since visit” banners, or scan-kind subtitles **flipped** when poll returned. Documented extensively as G1–G3 in [`CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md`](CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md).

**Fix:** `shouldShowHubNetworkCheckingChip` / `hubNetworkChipStatusForProfile` in `device-wallet-network-core.mjs`; `device-hub-ui.mjs` uses `isResolverConfirmedProfile` for row render, `applyCachedNetworkChipsOnly`, and pre-poll `applyNetworkChipsToDom`. Wallet edits still pass `initialChipChecking: true` to force all rows checking.

**Evidence:** `device-wallet-network-core.mjs`; `device-hub-ui.mjs` `renderSavedRows`, `currentNetworkStatus`, `fetchAndApplyNetworkChips`.

---

### RC-5 · Stale `localStorage` wallet summary (`hc_wallet_summary`)

**Status:** Fixed (2026-05-30) — first `loadWalletSummary()` each visit materializes `hc_wallet` and rebuilds summary; persisted fast path skipped until reconciled.

**Surfaces:** Hub glance, collapsed hub preview rows, dot `stewardReady` in core bootstrap.

**Mechanism (historical):** `loadWalletSummary()` read denormalized rows (no private keys). Hub rendered **summary rows** (`hub-card-item--summary`) from summary before full wallet hydration. Count, labels, or `stewardReady` could disagree with live `hc_wallet` until coordinator refresh.

**User-visible effect (was):** Wrong card count, wrong handle in glance, or steward dot hint before wallet module reconciled.

**Fix:** `shouldUsePersistedWalletSummaryFastPath()` in `device-wallet-summary-core.mjs`; `loadWalletSummary()` always calls `loadWallet()` on first read per visit and rewrites `hc_wallet_summary`. `pageshow` bfcache restore resets reconcile flag.

**Evidence:** `device-wallet-summary-core.mjs`; `device-wallet.mjs` `loadWalletSummary`; `device-hub-ui.mjs` summary row paths; `device-status-core.mjs` `deviceStateForCore`.

---

### RC-6 · Cross-tab presence churn (badge / banner / inbox)

**Status:** Fixed (2026-05-30) — cross-tab inbox/dot/banner/scan surfaces suppressed until `data-boot=ready`; `primeCrossTabNotificationState()` skipped during boot; boot-ready chrome refresh re-paints status surfaces once.

**Surfaces:** Status dot overlay, hub cross-tab group, wallet tab hint, inbox badge.

**Mechanism (historical):** `device-tab-presence.mjs` heartbeats in `localStorage.hc_tab_keys_presence`. On load, `getOtherTabsWithKeys()` may briefly report tabs that are closing or stale. Coordinator debounces some paths but not all; mutual exclusion with “keys in this tab” can **appear then disappear**. Boot `refreshDeviceChrome({ immediate: true })` plus `primeCrossTabNotificationState()` could advance the stability streak to 2 before the first visible paint, showing stale “Keys in another tab” for 1–2s.

**User-visible effect:** 1–2 second flash of “Keys in another tab” or wrong card name in banner (user report: “random notification”).

**Fix:** `device-cross-tab-boot-core.mjs` — `shouldSuppressCrossTabChromeUntilShellBoot()` gates `getCrossTabNotificationState()`, `getCrossTabScanSnapshot()`, `crossTabPresenceActiveRaw()`, and priming until shell boot ready. After `markDeviceBootReadyIfShellPage()`, one follow-up status/banner refresh applies stabilized presence only when still valid.

**Evidence:** [`CROSS_TAB_KEYS_FLASH_AFTER_CARD_DELETE_INVESTIGATION.md`](CROSS_TAB_KEYS_FLASH_AFTER_CARD_DELETE_INVESTIGATION.md); [`CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md`](CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md). Tests: `worker/tests/device-cross-tab-boot.test.ts`.

---

### RC-7 · Hub full re-render via `innerHTML` (no stable SSR shell)

**Status:** Fixed (2026-05-30) — hub saved list, pins, activity, inbox alerts, stranger-empty chrome, and glance popover defer `innerHTML` rebuild until `data-boot=ready`; `device-boot-gated` on hub personalized HTML sections; `hc-device-boot-ready` triggers first full hub render.

**Surfaces:** Hub saved list, pins, activity, inbox alerts.

**Mechanism (historical):** `device-hub-ui.mjs` `renderSavedRows`, `refreshHubActivity`, etc. set `savedList.innerHTML = ""` then rebuild rows. Opening hub or chrome refresh **cleared and repopulated** the list on boot before wallet summary and network polls settled. Stranger-empty vs saved chrome toggled `#device-hub-empty-hint`, `#device-hub-keys-custody`, steward tools strip visibility.

**User-visible effect:** Empty state → populated list; or row text changing when verification/network cache updates mid-render.

**Fix:** `device-hub-boot-core.mjs` gates hub render paths; `markDeviceBootReady()` dispatches `hc-device-boot-ready`; hub modules listen and run one consolidated `refreshDeviceHub()` / `refreshHubGlance()`.

**Evidence:** `device-hub-ui.mjs` ~1496+; `device-chrome-refresh.mjs` `refreshDeviceChrome({ immediate: true })` on boot. Tests: `worker/tests/device-hub-boot.test.ts`.

---

### RC-8 · Scan page SSR truth + client “live check arrive” animation

**Status:** Fixed (2026-05-30) — SSR strip shows resolved label; client skips checking hold when strip agrees with `data-arrive-label` (online).

**Surfaces:** `GET /c/{profile_id}?q=…` (Worker HTML).

**Mechanism:**

1. Worker SSR renders full scan state from D1 at request time (`scan-html.ts`) — correct **for the scanned object**.
2. Client modules load in order: `scan-tab-keys.mjs` (await rehydrate) → … → `scan-live-check-arrive.mjs`.
3. Hero uses `scan-live-check--pending` class; `scan-live-check-arrive.mjs` intentionally holds **Checking** label for `SCAN_ARRIVE_MIN_CHECKING_MS`, then swaps to settled labels and reveals rows with stagger.

**User-visible effect:** Status strip and pills **animate** from pending to settled even when SSR data was already correct — by design ([`SCAN_PAGE_TRUST_UI.md`](SCAN_PAGE_TRUST_UI.md)), but reads as “flash then change.”

**Fix (shipped):** Worker SSR renders the settled strip label in `.scan-arrive-status-label` (matching `data-arrive-label`). Client `shouldSkipScanArriveCheckingPhase()` skips `SCAN_ARRIVE_MIN_CHECKING_MS` when labels agree and the device is online; row stagger + settle pulse remain. Offline/cached HTML that still shows **Checking…** keeps the checking motion. Module cache bust `scan-live-check-arrive.mjs?v=2` in `scan-html.ts`.

**Evidence:** `scan-html.ts` `scan-live-check--pending`; `scan-live-check-arrive.mjs`; `SCAN_PAGE_DEVICE_DOT.md` § First paint. Tests: `npm run worker:test:scan-live-check-arrive`.

---

### RC-9 · Session vs resolver verification lag on `/created/`

**Status:** Fixed (2026-05-30) — human-trust row shows **Checking…** until first successful `refreshNetworkStatus()`; steward review queue hidden until poll confirms `verification.state === "steward"`.

**Surfaces:** Live tab cockpit, Manage steward disclosures, human-trust row.

**Mechanism (historical):**

1. `applyHumanTrustDisplay` may run from **session** or signed card JSON (`verification.level: 1, Registered`) before `refreshNetworkStatus` returns live `verification.state: steward`.
2. Steward-only disclosures (`#steward-review-details`) toggle on `state === "steward"` only after network refresh updates `applyHumanTrustDisplay`.

**User-visible effect:** Green steward dot (from summary/session) while copy still says Registered; steward Manage items **pop in** after poll.

**Fix:** `created-verification-boot-core.mjs` — defer human-trust icon/copy and steward review queue until `createdVerificationPollConfirmed` after resolver status poll.

**Evidence:** `created.mjs` `applyHumanTrustDisplay`, `refreshNetworkStatus`; public card JSON vs `GET …/status` divergence documented in [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md). Tests: `worker/tests/created-verification-boot.test.ts`.

---

### RC-10 · Quiet tab rehydrate changing tab session mid-boot

**Status:** Fixed (2026-05-30) — shared `ensureQuietTabRehydrateBootstrap()`; `/created/` and `/wallet/` await rehydrate before reading `hc_created`.

**Surfaces:** All shell pages + scan (after P0-1).

**Mechanism (historical):**

1. `maybeQuietTabRehydrate()` in `device-status.mjs` boot may **activate a wallet row** into `hc_created` after first paint. Components that read session once at module init see empty keys; components that listen for events see keys appear — UI shifts (save banners, vouch readiness, custody cards).

**Fix:** `device-quiet-tab-rehydrate-bootstrap.mjs` dedupes bootstrap rehydrate into one promise; `device-status.mjs`, `created.mjs`, and `wallet-page.mjs` await it before session-dependent paint. `/wallet/` also refreshes tab-save chrome on `hc-quiet-tab-rehydrated`.

**Evidence:** [`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md); [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) scan module order. Tests: `worker/tests/device-quiet-tab-rehydrate-bootstrap.test.ts`.

---

### RC-11 · Resolver health gate flips “since visit” suppression (G5)

**Status:** Fixed (2026-05-30) — resolver health starts **`unset`**; since-visit UI stays suppressed until `data-boot=ready`, health is known, and at least one wallet poll confirms this visit (`hasWalletNetworkTruthPoll`).

**Surfaces:** Hub disabled-since-visit banners, inbox.

**Mechanism (historical):** `resolverHealthStatus` initialized **`offline`** in `device-wallet-since-visit-gate.mjs`. Banners suppressed at first, then enabled after health → `ok`, then re-applied from stale maps — could **flash on** before wallet poll.

**Fix:** `device-wallet-since-visit-gate-core.mjs` — `unset` boot health + require wallet poll before opening gate when health is `ok`.

**Evidence:** [`CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md`](CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md) § G5. Tests: `npm run worker:test:card-disabled-since-visit`.

---

### RC-12 · bfcache / PWA standalone resume — **Shipped**

**Surfaces:** PWA home screen app, Safari back-forward on `/`, `/wallet/`, `/create/`, `/created/`.

**Mechanism:** Restored tabs replay old DOM + old in-memory poll state for at least one frame before debounced standalone refresh runs.

**Fix:** `pageshow` + `persisted` → synchronous `handleShellBfcacheRestore()` — re-enter `data-boot=pending` + `data-dot-boot=pending`, reset since-visit gate + cross-tab cache + dot bootstrap settled flag, dispatch `hc-shell-bfcache-resume`, immediate `refreshDeviceChrome({ immediate: true })`. `/created/` re-polls status then `markDeviceBootReady()`.

**Evidence:** [`PWA_INSTALL.md`](PWA_INSTALL.md); `device-shell-resume.mjs` · `device-wallet-network.mjs` pageshow baseline reset. Tests: `npm run worker:test:shell-boot` (`device-shell-resume-core.test.ts`).

---

### RC-13 · Manage tab hidden until control mode — **Shipped**

**Surfaces:** `/created/` steward UX during first-run setup.

**Mechanism (historical):** `#created-control-root` stays hidden during setup, so users never saw the **Manage** tab while the wizard ran. Copy still said “Advanced” in places, and the done step said “advanced options” without naming **Manage**.

**Fix:** Persistent setup hint (`#created-setup-manage-hint`) visible while `data-created-mode=setup`; done panel names **Live** vs **Manage**; user-visible “Advanced” tab pointers aligned to **Manage** (`device-ownership-copy-core.mjs`, `device-dot-state-core.mjs`, `created.mjs`).

**Evidence:** `created-workspace-manage-visibility-core.mjs` · `created-workspace.mjs` · `site/created/index.html`. Tests: `npm run worker:test:shell-boot` (`created-workspace-manage-visibility.test.ts`).

---

### RC-14 · Dot / hub `startViewTransition` on state change — **Shipped**

**Surfaces:** Shell status dot when the browser supports View Transitions API and reduced-motion is off.

**Mechanism (historical):** `applyDot()` wrapped class changes in `document.startViewTransition()` when the hub sheet was closed — a deliberate cross-fade that read as a load flash while boot settled.

**Fix:** `shouldSkipDotViewTransition()` skips View Transitions during shell boot (`data-boot` pending), before dot bootstrap settles, on first paint, when the dot state key is unchanged, and for cross-tab overlay-only flaps (existing policy).

**Evidence:** `device-status-dot-view-transition-core.mjs` · `device-status.mjs` `applyDot`. Tests: `npm run worker:test:shell-boot` (`device-status-dot-view-transition.test.ts`).

---

### RC-15 · Landing settings toggles flash wrong On/Off — **Shipped**

**Surfaces:** Landing `/` **Shortcuts & settings** (`#landing-device-settings`).

**Mechanism (historical):** Settings rows were not `device-boot-gated`. Static HTML used mismatched defaults (e.g. auto-save **Off** while storage default is **On**). Module `sync()` ran after first paint; browser alerts synced even later via `device-status.mjs` → `initBrowserNotifications()`.

**Fix:** `device-prefs-boot-core.mjs` (shared toggle copy) · `device-prefs-boot.mjs` (`applyDevicePrefsBootToDocument`) · head inline sets `html[data-prefs-boot=ready]` · `.device-prefs-boot-gated` CSS · neutral `…` placeholders in HTML · `landing-device-hub.mjs` applies prefs before hub init. Existing `*-prefs.mjs` and `syncBrowserNotifToggleButtons` reuse core copy helpers.

**Evidence:** `site/index.html` · `site/css/device-shell.css` · `site/js/device-prefs-boot*.mjs`. Tests: `worker/tests/device-prefs-boot-core.test.ts`.

---

### RC-16 · Wallet child-object full list rebuild — **Shipped**

**Surfaces:** `/wallet/` and expanded hub saved list (general root cards with nested objects).

**Mechanism (historical):** After `reconcileChildObjectsForProfileIds()` network fetch, `scheduleHubChildObjectReconcile` called full `renderSavedRows()` (`savedList.innerHTML = ""`), repainting root + child rows even when only child metadata changed.

**Fix:** `hub-child-object-patch-core.mjs` (signature + patch plan) · `patchHubChildObjectRowsForProfile(s)` in `device-hub-ui.mjs` — add/remove/reorder child `li` nodes in place; full re-render only when parent row missing. Per-profile signatures skip no-op reconciles.

**Evidence:** `device-hub-ui.mjs` `scheduleHubChildObjectReconcile`, `syncHubChildObjectRowSignatures`. Tests: `worker/tests/hub-child-object-patch-core.test.ts`.

---

### RC-17 · Wallet local boot + DOM stability — **Shipped**

**Surfaces:** `/wallet/` saved list, pins, activity, PWA resume on wallet.

**Mechanism (historical):** Entire saved-items block stayed `device-boot-gated` until `await refreshNetwork()` → multi-second blank, then list + banners + chips all appeared together. Child reconcile still `replaceWith` on every poll. Wallet banners ran on init before boot ready.

**Fix:**

- `data-boot="local"` after quiet rehydrate + `initDeviceHub` on wallet (`markDeviceBootLocalIfWalletPage`) — `.device-boot-local-gated` shows saved section; `.device-boot-gated` banners/custody wait for `ready`.
- `refreshDeviceHubLocalContent()` + `hubSavedListRenderDeferred()` — saved/pins/activity paint at local; inbox/custody at ready.
- `wallet-page.mjs` — `updateContextBanners()` only after `hc-device-boot-ready`.
- `patchHubChildObjectRowElementInPlace` + `childObjectRowRenderSignature` — skip `replaceWith` when child row copy unchanged.
- `shouldDeferStandaloneSoftRefreshWhileBootPending` — PWA resume coalesces with boot pipeline (~500ms after ready).

**Evidence:** `device-shell-boot-core.mjs` · `device-hub-boot-core.mjs` · `wallet-page.mjs` · `site/wallet/index.html` · `pwa-standalone-refresh-core.mjs`. Tests: `device-shell-boot.test.ts`, `device-hub-boot.test.ts`, `hub-child-object-patch-core.test.ts`.

---

### RC-18 · Nord cold first hub open (Smooth Phase 0 outlier) — **Scoped, not shipped**

**Trigger:** [`DEVICE_SMOOTH_MODE_PHASE0_GATE.md`](DEVICE_SMOOTH_MODE_PHASE0_GATE.md) lab matrix **3/3** (2026-06-02). **OnePlus Nord N200 5G** (4 GB RAM, Android 12, Chrome on production) is the **only** low-end device where **S1 cold first hub open** is subjectively **jumpy**. iPhone SE class and Android Go / 3 GB budget **pass cold S1–S3**. Nord **warm** reopen, 7-card scroll, PWA standalone, and `/created/` Live all **pass**.

**Symptom (lab language):** After cold load `/` with cleared site data, user taps status dot → hub sheet opens with visible layout/content churn before settling. Not a steady-state scroll or signing regression. Desk Playwright proxy reports `boot-ready-ms=623` on fast hardware — **does not reproduce** this device class.

**Why RC-7 did not close this:** RC-7 defers hub `innerHTML` rebuild until `data-boot=ready`. Nord pain persists on **first** hub open after cold boot, which suggests one or more of:

| Hypothesis | What to check |
|------------|---------------|
| **H1 — Post-ready hub paint cost** | Gap between `data-boot=ready` / `hc-device-boot-ready` and first stable hub frame on 4 GB Android (70-module graph already parsed; first `renderHub*` still heavy) |
| **H2 — Sheet open + render race** | Hub overlay animation concurrent with first full stranger-empty or saved-list render → layout shift reads as “jumpy” |
| **H3 — Stranger vs saved path** | Cold empty wallet uses stranger-empty HTML path; compare with 1-card and 7-card wallet on same device |
| **H4 — Chrome tab vs PWA** | Nord PWA steady-state pass; confirm whether cold S1 jumpiness differs in standalone vs browser tab |
| **H5 — Wrong-then-right flash** | Distinguish **layout jank** (CLS) from **content flash** (placeholder → truth). RC-1–RC-17 targeted content flash; RC-18 may be perf/CLS on one Android tier |

**Investigation protocol (minimum)**

1. **Reproduce** on Nord N200 · Chrome · `https://humanity.llc` · cleared site data · cold S1 from gate worksheet.
2. **Record** stopwatch TTI (load → dot state → hub tap → visually settled) and subjective **Jumpy / Pass**.
3. **DevTools Performance** (USB debugging): one trace per variant — empty wallet, 1 card, 7 cards; note `data-boot`, `hc-device-boot-ready`, first hub `innerHTML` / sheet open.
4. **Control device:** repeat S1 on iPhone SE class (pass row) with same wallet states.
5. **Desk regression only** (not a lab substitute):

```bash
npm run device-smooth:phase0 -- --e2e
npm run worker:test:shell-boot
npm run worker:test -- worker/tests/device-status-shell-modules.test.ts
```

6. **Classify outcome:** content flash (wrong copy/chips) vs layout jank vs both — drives fix direction.

**Likely code touchpoints (if H1/H2 confirmed)**

| Area | Files |
|------|-------|
| Boot → hub handoff | `device-shell-boot.mjs`, `device-shell-boot-core.mjs`, `device-hub-boot-core.mjs` |
| First hub render | `device-hub-ui.mjs` (`renderHub*`, stranger-empty), `device-hub-stranger-empty*` |
| Hub sheet chrome | Hub open path from status dot / `device-status-hub*` |
| CSS gates | `device-shell.css` — `.device-boot-gated`, hub sheet transitions |

**Success criteria (RC-18 close)**

- Nord cold S1 **Pass** on production after a targeted fix **or**
- Written root-cause note in this section + product decision: accept, defer Phase 4 graph, or reopen Smooth Phase 1 scope

**Explicit non-goals until RC-18 triage completes**

- Do **not** start Smooth mode Phase 1 (`device-shell-tier.mjs`, quiet defaults) — unlikely to fix cold bootstrap on Nord per Phase 0 gate.
- Do **not** split bootstrap graph (Phase 4) unless investigation proves **H1** and transfer/eval cost is the dominant factor (baseline: shell v82, **465.1 KiB** graph, 70 modules — [`DEVICE_SMOOTH_MODE_PHASE0_GATE.md`](DEVICE_SMOOTH_MODE_PHASE0_GATE.md)).

**Sign-off**

| Role | Status | Date |
|------|--------|------|
| Investigation scoped | ☑ | 2026-06-02 |
| Nord repro + trace captured | ☐ | |
| Root cause / fix shipped | ☐ | |

---

## Surface matrix (quick reference)

| Surface | Primary RC IDs | First paint source | Stabilizes when |
|---------|----------------|--------------------|-----------------|
| `/created/` hero + tabs | RC-1, RC-2, RC-9, RC-13 | HTML + route shell | Workspace mode + session + status poll |
| Hub saved cards | RC-4, RC-5, RC-7, RC-11 | Summary/cache + innerHTML | Network poll + chrome refresh |
| Status dot | RC-3, RC-6, RC-14 | Core offline paint | Full status + health fetch |
| Scan hero | RC-8 | SSR + pending class | `scan-live-check-arrive` settle (SSR fast path skips checking hold) |
| Wallet page | RC-4, RC-7, RC-10, RC-16, RC-17 | Local list at `data-boot=local`; banners at `ready` | Poll chips; child in-place patch; deferred wallet banners |
| Landing `/` | RC-3, RC-5, RC-7, RC-15 | Stranger hub HTML + settings HTML defaults | Wallet count + status bootstrap; prefs boot before hub |
| Landing settings | RC-15 | Static list-sub placeholders | `applyDevicePrefsBootToDocument` + `data-prefs-boot=ready` |

---

## Reproduction hints (for future fixes)

1. **Slow 3G + disable cache** in DevTools → open `/created/?profile_id=…&qr_id=…` — watch hero, both roots, network row.
2. **`localStorage.hc_wallet_summary` + `sessionStorage.hc_wallet_network_cache`** seeded with stale revoked/steward mix → reload `/wallet/` — watch chip flip.
3. **Two tabs**, close one → watch remaining tab badge ([`CROSS_TAB_KEYS_FLASH…`](CROSS_TAB_KEYS_FLASH_AFTER_CARD_DELETE_INVESTIGATION.md) protocol).
4. **`localStorage.hc_debug = "1"`** → hub build stamp + console `formatSiteBuildConsoleLine` to correlate deploy vs cache bust ([`SITE_BUILD_VERSIONING.md`](SITE_BUILD_VERSIONING.md)).
5. Scan: hard reload on active card — strip should settle without redundant **Checking** hold when SSR `data-arrive-label` matches resolver (RC-8).
6. **RC-18:** OnePlus Nord N200 5G · cleared site data · cold `/` → dot → hub — compare with iPhone SE class on same network; capture Performance trace on first hub open (see § RC-18).

---

## Regression

```bash
npm run worker:test:shell-boot
npm run worker:test -- worker/tests/device-prefs-boot-core.test.ts worker/tests/hub-child-object-patch-core.test.ts
npm run worker:test:scan-live-check-arrive
npm run worker:test -- worker/tests/device-status-shell-modules.test.ts
```

After status-graph or hub network changes, also run dot/inbox E2E per [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P0-3**.

---

## Explicit non-goals (this doc)

- Does not replace feature-specific postmortems (card-disabled, cross-tab, status-dot load failure).
- Does not propose splitting the device shell into a separate app — only documents why the current **HTML + deferred JS** architecture produces the reported flashes.
- RC-18+ remain future work unless noted **Shipped** in § Suggested doc cross-links.

---

## Suggested doc cross-links when fixing (future)

| Fix direction | Likely touches |
|---------------|----------------|
| Hide all personalized rows until ready | **Shipped (RC-1)** — `data-boot`, `.device-boot-gated`, `device-shell-boot.mjs` |
| Single status bootstrap | **Shipped (RC-3)** — defer core dot paint; `data-dot-boot` until health + session settled |
| Cache discipline | **Shipped (RC-4)** — per-profile checking until `isResolverConfirmedProfile`; cache ignored pre-poll |
| Wallet summary reconcile | **Shipped (RC-5)** — first `loadWalletSummary()` rebuilds from `hc_wallet`; no summary fast path pre-materialize |
| `/created/` shell race | **Shipped (RC-2)** — workspace mode before unhide; route shell never reveals roots |
| Cross-tab boot flash | **Shipped (RC-6)** — suppress cross-tab chrome until `data-boot=ready`; skip prime during boot |
| Hub innerHTML boot flash | **Shipped (RC-7)** — defer hub render until boot ready; `device-boot-gated` hub sections |
| Copy alignment | **Shipped (RC-13)** — setup Manage hint + Live/Manage done copy; user strings say **Manage** not Advanced tab |
| Scan arrive animation | **Shipped (RC-8)** — SSR strip label matches `data-arrive-label`; skip checking hold when labels agree |
| Created verification lag | **Shipped (RC-9)** — checking human-trust row + hidden steward queue until status poll |
| Quiet rehydrate boot race | **Shipped (RC-10)** — shared bootstrap promise; page modules await before session read |
| Since-visit health boot flash | **Shipped (RC-11)** — `unset` health + shell boot + wallet poll before since-visit show |
| bfcache / standalone resume flash | **Shipped (RC-12)** — `pageshow` persisted re-enters boot pending; immediate chrome refresh · shell v77 |
| Setup Manage discoverability | **Shipped (RC-13)** — setup hint + done panel Live/Manage copy; Advanced tab strings → Manage |
| Dot view-transition load flash | **Shipped (RC-14)** — skip `startViewTransition` during boot / unchanged dot state · shell v78 |
| Landing settings On/Off flash | **Shipped (RC-15)** — `data-prefs-boot`, prefs boot core, gated settings section |
| Child object list rebuild flash | **Shipped (RC-16)** — incremental child row patch after network reconcile |
| Wallet blank then list pop | **Shipped (RC-17)** — `data-boot=local` + local-gated saved section; banners at ready |
| Nord cold first hub open (Smooth Phase 0) | **Scoped (RC-18)** — lab outlier only; boot-graph triage before Smooth Phase 1 · [`DEVICE_SMOOTH_MODE_PHASE0_GATE.md`](DEVICE_SMOOTH_MODE_PHASE0_GATE.md) |

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-30 | Initial investigation doc (RC-1–RC-14); Manage vs Advanced navigation clarified |
| 2026-05-30 | RC-2 fix: route shell keeps workspace roots hidden; early `applyCreatedWorkspaceMode` |
| 2026-05-30 | RC-1 fix: `data-boot` gate + `.device-boot-gated` CSS; boot ready from page/chrome refresh |
| 2026-05-30 | RC-3 fix: defer status dot paint until health fetch + quiet rehydrate settle |
| 2026-05-30 | RC-4 fix: hub network chips checking until per-profile resolver poll confirms |
| 2026-05-30 | RC-5 verification — `worker:test:shell-boot` includes wallet summary tests |
| 2026-05-30 | RC-5 fix: wallet summary rebuild from hc_wallet on first load; skip summary fast path |
| 2026-05-30 | Verification gate — `npm run worker:test:shell-boot` |
| 2026-05-30 | RC-6 fix: defer cross-tab chrome until shell boot ready; skip prime during boot |
| 2026-05-30 | RC-7 fix: defer hub innerHTML rebuild until boot ready; boot-ready event + CSS gate |
| 2026-05-30 | RC-8 fix: scan arrive SSR fast path — skip checking hold when `data-arrive-label` embedded; `scan-live-check-arrive.mjs?v=2` |
| 2026-05-30 | RC-8 refine: SSR strip shows resolved label; skip checking when strip agrees with `data-arrive-label` |
| 2026-05-30 | RC-9 fix: defer /created/ human-trust + steward queue until resolver status poll |
| 2026-05-30 | RC-10 fix: shared quiet rehydrate bootstrap; /created/ + /wallet/ await before session read · shell v76 |
| 2026-05-30 | RC-11 fix: since-visit suppress until health unset clears, boot ready, and wallet poll confirms |
| 2026-05-30 | RC-12 fix: bfcache resume re-enters boot pending + immediate chrome refresh; /created/ re-poll · shell v77 · `created.mjs?v=78` |
| 2026-05-30 | RC-13 fix: setup Manage tab hint + Live/Manage done copy; user-facing Advanced tab pointers → Manage · `created.mjs?v=79` |
| 2026-05-30 | RC-14 fix: skip dot View Transitions during boot and unchanged state · shell v78 |
| 2026-05-30 | RC-15 fix: landing settings prefs boot + shared toggle copy · RC-16 fix: incremental hub child-object row patch |
| 2026-06-02 | **RC-18 scoped** — Nord N200 cold first hub open (Smooth Phase 0 3/3 outlier); investigation protocol + non-goals · Phase 1 deferred |
