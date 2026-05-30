# Shell page load content flash — investigation

**Status:** RC-1–RC-4 **shipped** (2026-05-30) · RC-5–RC-14 open for follow-up  
**Date:** 2026-05-30  
**Reported symptom:** Opening any shell or device page shows wrong or “random” data for a brief moment, then content disappears or is replaced with local device truth. Distracting and ugly.  
**Related:** [`CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md`](CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md) · [`CROSS_TAB_KEYS_FLASH_AFTER_CARD_DELETE_INVESTIGATION.md`](CROSS_TAB_KEYS_FLASH_AFTER_CARD_DELETE_INVESTIGATION.md) · [`PRODUCTION_SAD_PATH_QA_2026-05-26.md`](PRODUCTION_SAD_PATH_QA_2026-05-26.md) · [`SCAN_PAGE_DEVICE_DOT.md`](SCAN_PAGE_DEVICE_DOT.md) · [`REVOKE_UI_INVESTIGATION.md`](REVOKE_UI_INVESTIGATION.md) · [`CREATED_QR_BOOTSTRAP_FIX.md`](CREATED_QR_BOOTSTRAP_FIX.md)

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

**Surfaces:** Status dot overlay, hub cross-tab group, wallet tab hint, inbox badge.

**Mechanism:** `device-tab-presence.mjs` heartbeats in `localStorage.hc_tab_keys_presence`. On load, `getOtherTabsWithKeys()` may briefly report tabs that are closing or stale. Coordinator debounces some paths but not all; mutual exclusion with “keys in this tab” can **appear then disappear**.

**User-visible effect:** 1–2 second flash of “Keys in another tab” or wrong card name in banner (user report: “random notification”).

**Evidence:** [`CROSS_TAB_KEYS_FLASH_AFTER_CARD_DELETE_INVESTIGATION.md`](CROSS_TAB_KEYS_FLASH_AFTER_CARD_DELETE_INVESTIGATION.md); [`CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md`](CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md).

---

### RC-7 · Hub full re-render via `innerHTML` (no stable SSR shell)

**Surfaces:** Hub saved list, pins, activity, inbox alerts.

**Mechanism:** `device-hub-ui.mjs` `renderSavedRows`, `refreshHubActivity`, etc. set `savedList.innerHTML = ""` then rebuild rows. Opening hub or chrome refresh **clears and repopulates** the list. Stranger-empty vs saved chrome toggles `#device-hub-empty-hint`, `#device-hub-keys-custody`, steward tools strip visibility.

**User-visible effect:** Empty state → populated list; or row text changing when verification/network cache updates mid-render.

**Evidence:** `device-hub-ui.mjs` ~1496+; `device-chrome-refresh.mjs` `refreshDeviceChrome({ immediate: true })` on boot.

---

### RC-8 · Scan page SSR truth + client “live check arrive” animation

**Surfaces:** `GET /c/{profile_id}?q=…` (Worker HTML).

**Mechanism:**

1. Worker SSR renders full scan state from D1 at request time (`scan-html.ts`) — correct **for the scanned object**.
2. Client modules load in order: `scan-tab-keys.mjs` (await rehydrate) → … → `scan-live-check-arrive.mjs`.
3. Hero uses `scan-live-check--pending` class; `scan-live-check-arrive.mjs` intentionally holds **Checking** label for `SCAN_ARRIVE_MIN_CHECKING_MS`, then swaps to settled labels and reveals rows with stagger.

**User-visible effect:** Status strip and pills **animate** from pending to settled even when SSR data was already correct — by design ([`SCAN_PAGE_TRUST_UI.md`](SCAN_PAGE_TRUST_UI.md)), but reads as “flash then change.”

**Viewer device layer:** Scan page dot may upgrade from static brand dot to dynamic steward/keys dot after eligibility read (`SCAN_PAGE_DEVICE_DOT.md` progressive activation).

**Evidence:** `scan-html.ts` `scan-live-check--pending`; `scan-live-check-arrive.mjs`; `SCAN_PAGE_DEVICE_DOT.md` § First paint.

---

### RC-9 · Session vs resolver verification lag on `/created/`

**Surfaces:** Live tab cockpit, Manage steward disclosures, human-trust row.

**Mechanism:**

1. `applyHumanTrustDisplay` may run from **session** or signed card JSON (`verification.level: 1, Registered`) before `refreshNetworkStatus` returns live `verification.state: steward`.
2. Steward-only disclosures (`#steward-vouch-privileges-details`, `#steward-review-details`) toggle on `state === "steward"` only after network refresh updates `applyHumanTrustDisplay`.

**User-visible effect:** Green steward dot (from summary/session) while copy still says Registered; steward Manage items **pop in** after poll.

**Evidence:** `created.mjs` `applyHumanTrustDisplay`, `refreshNetworkStatus`; public card JSON vs `GET …/status` divergence documented in [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md).

---

### RC-10 · Quiet tab rehydrate changing tab session mid-boot

**Surfaces:** All shell pages + scan (after P0-1).

**Mechanism:** `maybeQuietTabRehydrate()` in `device-status.mjs` boot may **activate a wallet row** into `hc_created` after first paint. Components that read session once at module init see empty keys; components that listen for events see keys appear — UI shifts (save banners, vouch readiness, custody cards).

**Evidence:** [`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md); [`SAFARI_KEYS_WIPE_INVESTIGATION.md`](SAFARI_KEYS_WIPE_INVESTIGATION.md) scan module order.

---

### RC-11 · Resolver health gate flips “since visit” suppression (G5)

**Surfaces:** Hub disabled-since-visit banners, inbox.

**Mechanism:** `resolverHealthStatus` initializes **`offline`** in `device-wallet-since-visit-gate.mjs`. Banners suppressed at first, then enabled after health → `ok`, then re-applied from `latestResolved*` maps — can **flash on** if cache poisoned.

**Evidence:** [`CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md`](CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md) § G5, G1–G3.

---

### RC-12 · bfcache / PWA standalone resume

**Surfaces:** PWA home screen app, Safari back-forward.

**Mechanism:** Restored tabs replay old DOM + old storage snapshots. `pageshow` handlers and standalone refresh (`pwa-standalone-refresh.mjs`) may reload or refresh **after** one frame of stale UI.

**Evidence:** [`PWA_INSTALL.md`](PWA_INSTALL.md); `device-wallet-network.mjs` pageshow baseline reset comment (CARD_DISABLED doc).

---

### RC-13 · Manage tab hidden until control mode (not a flash — visibility)

**Surfaces:** `/created/` steward UX.

**Mechanism:** `#created-control-root` hidden during setup. User on first-run wizard never sees **Manage** tab. Copy that says “Advanced” or “after setup” is easy to miss when setup is incomplete or user expects controls immediately after create.

**Evidence:** `created-workspace.mjs`; `site/created/index.html` `#created-control-root hidden`.

---

### RC-14 · Dot / hub `startViewTransition` on state change

**Surfaces:** Shell status dot when browser supports View Transitions API and reduced-motion off.

**Mechanism:** `applyDot()` wraps class changes in `document.startViewTransition(run)` when hub sheet closed — deliberate cross-fade that can read as flash.

**Evidence:** `device-status.mjs` `applyDot` ~302–312.

---

## Surface matrix (quick reference)

| Surface | Primary RC IDs | First paint source | Stabilizes when |
|---------|----------------|--------------------|-----------------|
| `/created/` hero + tabs | RC-1, RC-2, RC-9, RC-13 | HTML + route shell | Workspace mode + session + status poll |
| Hub saved cards | RC-4, RC-5, RC-7, RC-11 | Summary/cache + innerHTML | Network poll + chrome refresh |
| Status dot | RC-3, RC-6, RC-14 | Core offline paint | Full status + health fetch |
| Scan hero | RC-8 | SSR + pending class | `scan-live-check-arrive` settle |
| Wallet page | RC-4, RC-7, RC-10 | Same hub patterns | Poll + wallet-page-chrome |
| Landing `/` | RC-3, RC-5, RC-7 | Stranger hub HTML | Wallet count + status bootstrap |

---

## Reproduction hints (for future fixes)

1. **Slow 3G + disable cache** in DevTools → open `/created/?profile_id=…&qr_id=…` — watch hero, both roots, network row.
2. **`localStorage.hc_wallet_summary` + `sessionStorage.hc_wallet_network_cache`** seeded with stale revoked/steward mix → reload `/wallet/` — watch chip flip.
3. **Two tabs**, close one → watch remaining tab badge ([`CROSS_TAB_KEYS_FLASH…`](CROSS_TAB_KEYS_FLASH_AFTER_CARD_DELETE_INVESTIGATION.md) protocol).
4. **`localStorage.hc_debug = "1"`** → hub build stamp + console `formatSiteBuildConsoleLine` to correlate deploy vs cache bust ([`SITE_BUILD_VERSIONING.md`](SITE_BUILD_VERSIONING.md)).
5. Scan: hard reload on active card — watch pending → settled animation regardless of correct SSR.

---

## Regression

```bash
npm run worker:test:shell-boot
npm run worker:test -- worker/tests/device-status-shell-modules.test.ts
```

After status-graph or hub network changes, also run dot/inbox E2E per [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P0-3**.

---

## Explicit non-goals (this doc)

- Does not replace feature-specific postmortems (card-disabled, cross-tab, status-dot load failure).
- Does not propose splitting the device shell into a separate app — only documents why the current **HTML + deferred JS** architecture produces the reported flashes.
- RC-5+ fixes remain future work unless noted **Shipped** in § Suggested doc cross-links.

---

## Suggested doc cross-links when fixing (future)

| Fix direction | Likely touches |
|---------------|----------------|
| Hide all personalized rows until ready | **Shipped (RC-1)** — `data-boot`, `.device-boot-gated`, `device-shell-boot.mjs` |
| Single status bootstrap | **Shipped (RC-3)** — defer core dot paint; `data-dot-boot` until health + session settled |
| Cache discipline | **Shipped (RC-4)** — per-profile checking until `isResolverConfirmedProfile`; cache ignored pre-poll |
| Wallet summary reconcile | **Shipped (RC-5)** — first `loadWalletSummary()` rebuilds from `hc_wallet`; no summary fast path pre-materialize |
| `/created/` shell race | **Shipped (RC-2)** — workspace mode before unhide; route shell never reveals roots |
| Copy alignment | Rename Manage → Advanced or update all docs to say **Manage** |
| Scan arrive animation | Skip pending when SSR and client agree; or reduce `SCAN_ARRIVE_MIN_CHECKING_MS` |

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-30 | Initial investigation doc (RC-1–RC-14); Manage vs Advanced navigation clarified |
| 2026-05-30 | RC-2 fix: route shell keeps workspace roots hidden; early `applyCreatedWorkspaceMode` |
| 2026-05-30 | RC-1 fix: `data-boot` gate + `.device-boot-gated` CSS; boot ready from page/chrome refresh |
| 2026-05-30 | RC-3 fix: defer status dot paint until health fetch + quiet rehydrate settle |
| 2026-05-30 | RC-4 fix: hub network chips checking until per-profile resolver poll confirms |
| 2026-05-30 | RC-5 fix: wallet summary rebuild from hc_wallet on first load; skip summary fast path |
| 2026-05-30 | Verification gate — `npm run worker:test:shell-boot` |
