# Quiet tab rehydrate (passkey-like control)

**Status:** Tier 1–3 shipped  
**Audience:** Product, frontend, security review  
**Companions:** [`OWNERSHIP_AND_CONTROL_MODEL.md`](OWNERSHIP_AND_CONTROL_MODEL.md) · [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) · [`CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md`](CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md) · [`VOUCH_READY_KEYS_DESIGN.md`](VOUCH_READY_KEYS_DESIGN.md) · [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md) · [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) (mode-aware rehydrate — planned C2)

---

## Planned: mode-aware rehydrate (WS-CUSTODY C2)

Today (shipped), quiet rehydrate copies **plaintext** `full_keys` wallet rows into `hc_created` when gates pass.

When **`device_unlock`** ships ([`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md)):

| `custody_mode` | Empty session on shell / scan |
|----------------|-------------------------------|
| `full_keys` | Current D10 behavior (silent rehydrate when safe) |
| `device_unlock` | **No silent copy** — WebAuthn **Unlock to manage** before populate `hc_created` |

Scan order invariant unchanged: unlock gate completes **before** vouch / live-control scripts.

## Problem

Users should not think about **keys** or **tabs**. After create, ownership is saved to `hc_wallet` (auto-save default on). Each tab still needs a working copy in `sessionStorage.hc_created` before signing works.

Today, a **new tab** on `/`, `/wallet/`, or `/create/` can show cross-tab / “take control here” chrome even when the user has **one saved object** on the device. That feels like a key-management product, not passkey-like ownership.

**This is not a missing crypto feature.** Keys already live in `localStorage.hc_wallet`. “Sync” means **quietly copy the saved row into this tab’s `hc_created`** — same as manual **Open controls**, without user-facing key vocabulary.

---

## Threat model alignment

| Question | Answer |
|----------|--------|
| Does this upload keys? | **No** — same-origin `activateWalletEntry` copy only |
| Does this contradict “no server custody”? | **No** — browser storage only |
| Does this put private keys in `localStorage` presence map? | **No** — presence stays metadata-only |
| Does this replace `hc_created` per tab? | **No** — each tab still holds its own session copy; tab close clears it |
| Shared / borrowed device risk? | **Tier 1** limits blast radius (single saved card). **Tier 2** adds explicit setting. PIN/device unlock (D6) **blocks** silent rehydrate until unlocked |
| Wrong-card signing? | **Fail closed** — never guess when 2+ saved roots have keys |

**Do not:**

- Store `hc_created` in `localStorage` (persists across browser restarts in all tabs)
- BroadcastChannel private keys tab-to-tab (wallet is already the shared store)
- Server-side session or cloud key sync
- Remove cross-tab UI without a rehydrate policy (duplicate-tab confusion)

---

## Priority stack

| Tier | Behavior | Status |
|------|----------|--------|
| **1** | Exactly **one** saved card with signing keys + empty `hc_created` + no unlock gate → silent rehydrate on **shell bootstrap** (`/`, `/wallet/`, `/create/`, `/created/`) **and scan pages** (`scan-tab-keys.mjs`, P0-1) | **Shipped** |
| **2** | Remember `hc_last_active_profile_id`; rehydrate that profile on new tabs (hub toggle, default on) when multi-card | **Shipped** |
| **3** | Demote cross-tab chrome when rehydrate succeeds; keep notices for unsaved-only-other-tab and unlock-pending | **Shipped** |

**Already shipped (related, narrower):**

- Auto-save to wallet after create (`device-auto-save.mjs`)
- `/created/?profile_id=…` wallet activate (`created.mjs`)
- Vouch-ready scan auto-activate (`vouch-ready-keys.mjs`, opt-in default only)
- Scan vouch sole-row path (P0b-3): `tryAutoActivateSoleSigningWalletForVouch` + `trySoleSigningRowRehydrateForScan` when tab has no keys

---

## Tier 1 contract

### When rehydrate runs

Once per **shell or scan** page load, **before** first chrome refresh (`device-status.mjs` or `scan-tab-keys.mjs` init):

1. `getTabSession()` has **no** `owner_private_key_b58`
2. `loadWallet()` filtered to signing rows → **count === 1**
3. `controlActivationRequiresUnlock(profile_id)` is **false** (D6 PIN / device unlock not blocking)
4. `activateWalletEntryGated(entry)` succeeds

### When rehydrate is skipped (existing UX unchanged)

| Condition | Result |
|-----------|--------|
| Tab already has control | Skip |
| Zero saved cards | Skip |
| Two or more saved signing rows | Skip — no guess |
| `/created/?profile_id=` URL ≠ sole saved card | Skip — keep view-only restore UX (K1b); pass `urlProfileId` into `ensureQuietTabRehydrateBootstrap()` |
| Scan: other tab holds keys (presence heartbeat) | Skip — `maybeQuietTabRehydrateForScan()` after `startTabKeysPresence()` |
| Scan: vouchee profile ≠ sole saved card | Skip — `quietRehydrateBlockedOnScanForDifferentCard` |
| Sign lock enabled and locked | Skip — user unlocks via existing take-control flow |
| Activation error | Skip — no retry loop on bootstrap |

### User-visible copy

**None on success.** Layer 2: user simply “has their object” in the tab. No “keys synced” string.

---

## Tier 2 contract

### Storage

| Key | Storage | Meaning |
|-----|---------|---------|
| `hc_last_active_profile_id` | `localStorage` | Last profile activated into `hc_created` (create, open controls, auto-save) |
| `hc_quiet_tab_rehydrate` | `localStorage` | `"0"` = off; unset / `"1"` = on (default on) |

### When Tier 2 applies

After Tier 1 preconditions (empty tab, no unlock gate), when **two or more** signing rows exist:

1. `isQuietTabRehydrateEnabled()` is **true** (hub toggle **Open last object in new tabs**)
2. `resolveQuietTabRehydrateTarget()` finds a row matching `hc_last_active_profile_id`
3. `activateWalletEntryGated(entry)` succeeds

### When Tier 2 is skipped

| Condition | Result |
|-----------|--------|
| Toggle off (`hc_quiet_tab_rehydrate` = `"0"`) | Skip — existing take-control / hub picker UX |
| No last-active or id not in wallet | Skip — no guess across multiple cards |
| Last-active removed from wallet | Cleared on card remove; skip until user activates again |

### Hub toggle

`#device-quiet-tab-rehydrate-toggle` in homepage Shortcuts & settings (`site/index.html`); initialized from `landing-device-hub.mjs` via `initQuietTabRehydrateToggle()`.

**Standalone PWA:** Row **hidden** — no in-app “new tab” concept. Tier 1 (exactly one saved signing row) still rehydrates on every shell/scan load. Tier 2 follows `hc_quiet_tab_rehydrate` (default on) without UI in standalone; stewards change the pref from a **browser tab** on `/` if needed. See [`PWA_INSTALL.md`](PWA_INSTALL.md) § Browser context vs PWA context.

---

## Tier 3 contract

After successful bootstrap rehydrate (`activateWalletEntryGated` succeeds):

1. Record `hc_quiet_tab_rehydrated_profile` in `sessionStorage` for this tab load
2. Purge stale cross-tab presence for that profile (`notifyProfileSavedOnDevice`) and reset fingerprint streaks
3. Filter shell cross-tab inbox/banner inputs via `filterCrossTabEntriesAfterQuietRehydrate()` — hides the rehydrated profile only; **other** unsaved-only tabs still qualify

### When Tier 3 does not run

| Condition | Cross-tab UX |
|-----------|----------------|
| Rehydrate skipped (unlock pending, multi-card opt-out, activation failed) | Unchanged — take-control / inbox notices remain |
| Other tab holds **different** unsaved profile | Notice kept (`tab_keys_unsaved` / cross-tab row) |
| Scan surfaces (`includeSavedProfiles: true`) | Unchanged — vouch scan may still show “keys in another tab” |

---

## Files

| Area | Module |
|------|--------|
| Pure rules | `site/js/device-quiet-tab-rehydrate-core.mjs` |
| Device prefs + hub toggle | `site/js/device-quiet-tab-rehydrate-prefs.mjs` |
| Standalone visibility gate | `site/js/pwa-browser-tab-shortcuts.mjs` |
| Bootstrap hook + Tier 3 demotion | `site/js/device-quiet-tab-rehydrate.mjs` |
| Last-active writes | `device-keys.mjs`, `device-wallet.mjs`, `create-card.mjs` |
| Last-active clear on remove | `device-wallet-removed-profiles.mjs` |
| Shell cross-tab filter | `device-tab-presence.mjs` (`getOtherTabsWithKeys`) |
| Wire | `site/js/device-status.mjs` (await before `startTabKeysPresence` / chrome refresh); **`site/js/scan-tab-keys.mjs`** (scan pages — [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) P0-1) |
| Tests | `worker/tests/device-quiet-tab-rehydrate-core.test.ts`, `worker/tests/device-quiet-tab-rehydrate.test.ts` |

---

## Regression

```bash
npm run worker:test -- worker/tests/device-quiet-tab-rehydrate-core.test.ts worker/tests/device-status-shell-modules.test.ts
```

Manual: **P1-QTR** in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md).
