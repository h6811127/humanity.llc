# Device hub (Phase 10) — repair spec

**Date:** 2026-05-25  
**Status:** Audit complete · repair slices 1–5 implemented  
**Scope:** `docs/DEVICE_OS.md`, `docs/DEVICE_HUB_AND_LOCAL_SEARCH.md`, shared hub on `/`, `/wallet/`, `/created/`  
**Out of scope:** Flow 2 public scan (see `docs/FLOW_2_QR_SCAN_REPAIR_SPEC.md`), storefront, Worker resolver logic except status JSON consumed by hub

---

## Source of truth

| Doc | Use for |
|-----|---------|
| `docs/DEVICE_OS.md` | Placement rules, layers, live-control inbox scope, baseline/alert behavior |
| `docs/DEVICE_HUB_AND_LOCAL_SEARCH.md` | Storage keys, search, glance, wallet row chips, copy alignment |
| `docs/CREATED_TASK_DASHBOARD.md` | `/created/` Tasks tab (separate from hub shell, shares chrome) |
| `docs/M6_VOUCHING_DESIGN.md` | Return-to-scan vouch (`hc_vouch_return_url`) |
| `docs/V1_IMPLEMENTATION_CONTRACTS.md` | `GET …/cards/{id}/status?q=` scan JSON |

**Static UI:** `site/` (Cloudflare Pages). **Network reads:** Worker `/.well-known/hc/v1/cards/{profile_id}/status`.

---

## Capability map (placement rules → code)

| DEVICE_OS placement | Primary modules | Surfaces |
|---------------------|-----------------|----------|
| Status line, dot, system banner, hub sheet | `device-status.mjs`, `device-hub-sheet.mjs`, `device-shell-chrome.mjs` | `/`, `/wallet/`, `/created/` |
| Hub body (saved, pins, search, import, activity) | `device-hub-ui.mjs`, `device-hub-search.mjs`, `device-hub-import.mjs` | Shared `#device-hub` |
| Hub glance + popover | `device-hub-glance.mjs`, `device-hub-glance-popover.mjs` | Landing popover; `#wallet-hub-glance` on `/wallet/` |
| Network chips + since-visit alerts | `device-wallet-network.mjs`, `device-wallet-network-core.mjs`, `wallet-network-baseline.mjs` | Saved rows when `fetchNetworkStatus: true` |
| Live proof inbox (poll only) | `device-live-control-inbox.mjs`, `device-live-control-inbox-core.mjs` | Landing + `/wallet/` when `showLiveControlInbox: true` |
| Cross-tab keys | `device-tab-presence.mjs`, `device-cross-tab-banner.mjs`, `device-cross-tab-visibility.mjs` | `/`, `/wallet/` |
| Focus mode + auto-save | `landing-focus.mjs`, `device-auto-save.mjs` | Landing |
| Shortcuts & settings (Appearance, alerts) | `index.html` `#landing-shortcuts` + hub toggles | Homepage only (not inside hub sheet) |
| Signing / manage | `device-keys.mjs`, `device-notice-nav.mjs` | **Use keys** → `/created/`; pins cannot sign |
| Local storage | `device-wallet.mjs`, `device-pins.mjs`, `device-activity.mjs` | `hc_wallet`, `hc_device_pins`, `hc_device_activity` |
| Baseline storage | `device-wallet-network.mjs` | `hc_wallet_last_seen_network`, `sessionStorage.hc_wallet_network_cache` |

**Inits:**

| Page | Module | Config |
|------|--------|--------|
| `/` | `landing-device-hub.mjs` | `noticeMode: created-url`, `showLiveControlInbox: true` |
| `/wallet/` | `wallet-page.mjs` | `showShortcuts: false`, hub expanded by default |
| `/created/` | `create-hub.mjs` | `noticeMode: created-url`, `showLiveControlInbox: false` |

---

## Flow map (owner journeys)

### 1. Returning user opens landing

| Step | Expected (docs) | Implementation |
|------|-----------------|----------------|
| Glance counts | Network / saved / pinned / notices | `device-counts.mjs` → `device-status.mjs` status panel |
| Expand hub | Saved rows, chips, optional alerts | `device-hub-ui.mjs` `renderSavedRows` + `fetchAndApplyNetworkChips` |
| Collapsed glance | Notice, cross-tab, live proof, up to 3 cards | `device-hub-glance.mjs` |

### 2. Save card on device

| Step | Expected | Implementation |
|------|----------|----------------|
| Create → save | `hc_wallet` entry with keys + `qr_id` | `device-wallet.mjs` `walletEntryFromSession` |
| Optional auto-save | `hc_auto_save_device` | `device-auto-save.mjs` |
| Activity log | `saved` event | `device-activity.mjs` |

### 3. Network sync per saved row

| Step | Expected | Implementation |
|------|----------|----------------|
| Poll status | `GET …/status?q={qr_id}` | `refreshWalletNetworkStatuses` in `device-wallet-network.mjs` |
| Chip | `scan.kind`-aware labels | `networkStatusChip(status, scanKind)` in `device-wallet-network-core.mjs` |
| Since-visit alert | Only `card_revoked` transition | `isRevokedSinceLastVisit` + `wallet-network-baseline.mjs` |
| Acknowledge | Got it / Use keys / Manage | `recordNetworkSeen`, `acknowledgeNetworkSeenForEntry` |

### 4. Live proof waiting

| Step | Expected | Implementation |
|------|----------|----------------|
| Poll pending | Every 5s, saved rows with `qr_id` | `device-live-control-inbox.mjs` |
| Open sign | `/created/?…&live_challenge=` | `openLiveControlProof` |
| **Not on `/created/`** | DEVICE_OS § Live-control inbox | **Violated** — `create-hub.mjs` enables inbox |

### 5. Vouch return-to-scan (recent)

| Step | Expected | Implementation |
|------|----------|----------------|
| Scan → vouch → return | Restore scan URL | `hc_vouch_return_url` in `created.mjs`; **Use keys** passes `returnUrl` in `device-hub-ui.mjs` |

---

## Production observation (2026-05-25)

On [humanity.llc](https://humanity.llc/) with saved cards, hub rows showed **“Card disabled on the network since your last visit”** while chips read **“Sync Checking…”**.

Resolver for showcase (active):

```bash
curl -s "https://humanity.llc/.well-known/hc/v1/cards/nSVXWPqgRFEhGPjxyRzidF6s/status?q=qr_xBZTq7M27tueCzBY" | jq '.scan.kind'
# → "active"
```

Indicates **stale session cache / pre-fetch alert application**, not network truth. Confirms **DH-1** and **DH-2** below.

---

## Mismatches only

### P0 — False or sticky “card disabled since last visit”

| ID | Gap |
|----|-----|
| **DH-1** | `renderSavedRows` → `applyRevokedSinceVisitAlerts()` runs on **cached** `getCachedNetworkAlertState` before `fetchAndApplyNetworkChips` completes. Stale `scanKind: card_revoked` in `sessionStorage.hc_wallet_network_cache` + baseline `active` → alert visible while resolver is `active`. |
| **DH-2** | `applyNetworkChipsToDom` sets chip with `networkStatusChip(status, getCachedNetworkScanKind(pid))` — **does not pass fresh `scanKind` from fetch** (`alertStateMap` / cache entry). Can show **Card disabled** chip while `status` is `active` or `checking`. |
| **DH-3** | `device-hub-glance.mjs` uses cache-only alert state (no fetch gate) — glance can show **Card disabled since last visit** when hub row would clear after fetch. |
| **DH-4** | `snapshotNetworkSeenOnExit()` writes `getCachedNetworkAlertState` to `hc_wallet_last_seen_network` on tab hide. Stale cache can **poison baseline** to `card_revoked` without a resolver transition (self-heal on next successful fetch may be delayed). |

**Files:** `device-hub-ui.mjs`, `device-wallet-network.mjs`, `device-hub-glance.mjs`.

**Done when:** Active card on production never shows since-visit alert; chip label matches `scan.kind` after fetch; Vitest integration case for “stale cache + fresh active fetch hides alert.”

---

### P0 — Placement / doc violations

| ID | Gap |
|----|-----|
| **DH-5** | ✅ Fixed: `/created/` now initializes hub with `showLiveControlInbox: false`; signing stays in the page proof panel. |
| **DH-6** | ✅ Fixed: `site/features/scan-ui.html` subline now says “flat status panel + grouped trust blocks.” |

---

### P1 — Tests and CI drift

| ID | Gap |
|----|-----|
| **DH-7** | ✅ Fixed: `e2e/device-os-wallet.spec.ts` uses current **Open controls** action and passes. |
| **DH-8** | ✅ Addressed with E2E guardrail for active-status/no-alert and helper-level coverage in wallet-network tests; monitor for future DOM-level unit tests if regressions recur. |

---

### P1 — Data model drift

| ID | Gap |
|----|-----|
| **DH-9** | ✅ Fixed: wallet persistence now stores both `status` and `scan_kind` from resolver sync (`device-hub-ui.mjs`), so saved state tracks both card status and `scan.kind` dimensions. |
| **DH-10** | ✅ Fixed: `walletEntryQrId()` resolves `q` from `scan_url` when `qr_id` is missing; status fetch, live-control poll, and `/created/` links use the same QR; hub backfills `qr_id` into `hc_wallet` on sync. |

---

### P2 — Doc drift (DEVICE_HUB_AND_LOCAL_SEARCH vs DEVICE_OS)

| ID | Gap |
|----|-----|
| **DH-11** | ✅ Fixed: `DEVICE_HUB_AND_LOCAL_SEARCH.md` now reflects current landing layout without floating help pill language. |
| **DH-12** | ✅ Fixed: `DEVICE_OS.md` optional polish table now marks browser notifications as shipped. |

---

### P2 — Resolver / status edge cases

| ID | Gap |
|----|-----|
| **DH-13** | On fetch `!res.ok`, code sets `alertStateMap[pid] = "active"` while `statusMap[pid] = "error"` — chip shows error path via `networkStatusChip("error")` but alert suppressed; inconsistent. |
| **DH-14** | `networkStatusChip` maps legacy `status: "revoked"` to “Revoked on Network” but `alertStateFromScanKind` ignores card.status — only `scan.kind === card_revoked` drives alerts (documented, but confusing if card JSON status diverges). |

---

## Aligned (not listed as mismatches)

- Placement: no per-pin revoke on hub; **Manage** / **Use keys** for mutations.
- Pins are bookmarks only (`device-pins.mjs`).
- Search is client-side over wallet/pins/activity (`device-hub-search.mjs`).
- Baseline semantics (`card_revoked` only, not `qr_revoked`) match `wallet-network-baseline.mjs` tests.
- Cache bypass when cached `card_revoked` disagrees with baseline (`shouldUseCachedNetworkStatus`) — implemented; undermined by DH-1/DH-2 UI applying cache before fetch finishes.
- Cross-tab presence + banner wiring exists per DEVICE_OS § Phase 8.
- Wallet page hub expanded by default; landing focus mode hides intro sections.
- Return-to-scan vouch: `hc_vouch_return_url` + hub **Use keys** passes `returnUrl` (recent commits).

---

## Repair slices (ordered)

### Slice 1 — Network UI single source of truth (P0) ✅

**Goal:** Chip + alert always use the same post-fetch `{ status, scanKind }`.

- [x] Extend `fetchAndApplyNetworkChips` to pass `scanKind` from cache entry or fresh parse into `applyNetworkChipsToDom` / `networkChipHtml`.
- [x] Do not call `applyRevokedSinceVisitAlerts()` until first fetch completes **or** explicitly mark row “checking” without since-visit alert.
- [x] Hide since-visit alert when `scanKind !== card_revoked` even if cache stale (defense in depth).

**Files:** `device-hub-ui.mjs`, optionally `device-wallet-network.mjs`.

**Done when:** Production repro cleared; new Vitest or DOM test for stale-cache scenario.

---

### Slice 2 — Glance + snapshot safety (P0) ✅

- [x] Glance rows: use same post-fetch state as hub (listen to `hc-wallet-network-baseline-changed` / hub refresh, don’t infer from stale cache alone).
- [x] `snapshotNetworkSeenOnExit`: only snapshot after fresh fetch timestamp or skip if cache `at` older than last successful fetch.

**Files:** `device-hub-glance.mjs`, `device-wallet-network.mjs`.

---

### Slice 3 — Live-control inbox placement (P0 product) ✅

- [x] Set `showLiveControlInbox: false` in `create-hub.mjs` **or** update `DEVICE_OS.md` if product wants inbox on created.

**Done when:** One surface for owner signing on `/created/`.

---

### Slice 4 — E2E + integration tests (P1) ✅

- [x] Fix `e2e/device-os-wallet.spec.ts` to click **Use keys** (or role name from `device-hub-ui.mjs`).
- [x] Add Playwright or Vitest case: saved card + mocked status `active` → no since-visit banner.

---

### Slice 5 — Doc hygiene (P2) ✅

- [x] Sync `DEVICE_HUB_AND_LOCAL_SEARCH.md` with removed help pill / current landing layout.
- [x] Update `site/features/scan-ui.html` (regenerate via `generate-feature-pages.mjs` if needed).
- [x] Note browser notifications as shipped in `DEVICE_OS.md`.

---

## Done when (Device hub overall)

- [x] No false “card disabled since last visit” on active cards (production + e2e).
- [x] Chip label matches resolver `scan.kind` after sync.
- [x] Live-control inbox scope matches `DEVICE_OS.md`.
- [x] `npm run worker:test` + `npm run e2e` green for device-os specs.

---

## AI repair prompt (Slice 1)

> Implement DH-1 and DH-2 from `docs/DEVICE_HUB_REPAIR_SPEC.md` only. Ensure hub network chips and since-visit alerts use fresh `scan.kind` from the latest `refreshWalletNetworkStatuses` result; do not show since-visit alert during cache-only pre-fetch. Add a Vitest test for stale `sessionStorage` cache + active fetch. Do not change Worker resolver.

---

## Related audits

| Area | Spec |
|------|------|
| Public scan | `docs/FLOW_2_QR_SCAN_REPAIR_SPEC.md` |
| Created Tasks tab | `docs/CREATED_TASK_DASHBOARD.md` (UX contract; not hub network sync) |
| Vouching | `docs/M6_VOUCHING_DESIGN.md` |
