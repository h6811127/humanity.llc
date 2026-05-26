# Device hub (Phase 10) — repair spec

**Date:** 2026-05-25  
**Status:** Audit complete · repair backlog  
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
| `/created/` | `create-hub.mjs` | `noticeMode: created-url`, `showLiveControlInbox: true` |

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
| **DH-5** | `DEVICE_OS.md` § Live-control inbox: **not on `/created/`**. `create-hub.mjs` and `landing-device-hub.mjs` set `showLiveControlInbox: true` on `/created/` — duplicate surface vs **Prove live control** panel. |
| **DH-6** | `site/features/scan-ui.html` subline still says “flippable pass card”; scan UI is flat status panel (`worker/tests/scan.test.ts`) — feature marketing drift (hurts trust in docs map). |

---

### P1 — Tests and CI drift

| ID | Gap |
|----|-----|
| **DH-7** | `e2e/device-os-wallet.spec.ts` clicks **“Control card”** — button no longer exists (UI: **Use keys**). E2E does not cover since-visit alert, live-control inbox, or cross-tab banner. |
| **DH-8** | Vitest (`device-os-frontend.test.ts`, `wallet-network.test.ts`) covers pure helpers only — **no test** for `applyRevokedSinceVisitAlerts` / `applyNetworkChipsToDom` coupling or post-fetch chip `scanKind`. |

---

### P1 — Data model drift

| ID | Gap |
|----|-----|
| **DH-9** | `hc_wallet[].status` updated from `statusMap` card.status string (`device-hub-ui.mjs` after fetch), not from `scan.kind`. Can read `active` while alert/chip logic uses different dimensions. |
| **DH-10** | Saved rows without `qr_id` skip live-control poll (`isPollableWalletEntry`) but still fetch status — if `q` omitted, status is **card-only** (`buildCardOnlyScanViewModel`), which may disagree with full scan URL on row. |

---

### P2 — Doc drift (DEVICE_HUB_AND_LOCAL_SEARCH vs DEVICE_OS)

| ID | Gap |
|----|-----|
| **DH-11** | `DEVICE_HUB_AND_LOCAL_SEARCH.md` still mentions **“New here?” help drawer** and floating help pill — removed per `DEVICE_OS.md` checklist. |
| **DH-12** | `DEVICE_OS.md` checklist marks browser notifications as optional; `device-browser-notifications.mjs` is mounted on landing — doc should say **shipped** or gate behind setting only. |

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

### Slice 1 — Network UI single source of truth (P0)

**Goal:** Chip + alert always use the same post-fetch `{ status, scanKind }`.

- [ ] Extend `fetchAndApplyNetworkChips` to pass `scanKind` from cache entry or fresh parse into `applyNetworkChipsToDom` / `networkChipHtml`.
- [ ] Do not call `applyRevokedSinceVisitAlerts()` until first fetch completes **or** explicitly mark row “checking” without since-visit alert.
- [ ] Hide since-visit alert when `scanKind !== card_revoked` even if cache stale (defense in depth).

**Files:** `device-hub-ui.mjs`, optionally `device-wallet-network.mjs`.

**Done when:** Production repro cleared; new Vitest or DOM test for stale-cache scenario.

---

### Slice 2 — Glance + snapshot safety (P0)

- [ ] Glance rows: use same post-fetch state as hub (listen to `hc-wallet-network-baseline-changed` / hub refresh, don’t infer from stale cache alone).
- [ ] `snapshotNetworkSeenOnExit`: only snapshot after fresh fetch timestamp or skip if cache `at` older than last successful fetch.

**Files:** `device-hub-glance.mjs`, `device-wallet-network.mjs`.

---

### Slice 3 — Live-control inbox placement (P0 product)

- [ ] Set `showLiveControlInbox: false` in `create-hub.mjs` **or** update `DEVICE_OS.md` if product wants inbox on created.

**Done when:** One surface for owner signing on `/created/`.

---

### Slice 4 — E2E + integration tests (P1)

- [x] Fix `e2e/device-os-wallet.spec.ts` to click **Use keys** (or role name from `device-hub-ui.mjs`).
- [x] Add Playwright or Vitest case: saved card + mocked status `active` → no since-visit banner.

---

### Slice 5 — Doc hygiene (P2)

- [x] Sync `DEVICE_HUB_AND_LOCAL_SEARCH.md` with removed help pill / current landing layout.
- [x] Update `site/features/scan-ui.html` (regenerate via `generate-feature-pages.mjs` if needed).
- [x] Note browser notifications as shipped in `DEVICE_OS.md`.

---

## Done when (Device hub overall)

- [ ] No false “card disabled since last visit” on active cards (production + e2e).
- [ ] Chip label matches resolver `scan.kind` after sync.
- [ ] Live-control inbox scope matches `DEVICE_OS.md`.
- [ ] `npm run worker:test` + `npm run e2e` green for device-os specs.

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
