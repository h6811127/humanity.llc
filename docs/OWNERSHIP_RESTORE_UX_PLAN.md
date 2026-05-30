# Ownership restore and view-mode UX plan

**Status:** Phase 4 step 2 shipped (hub import copy convergence); Phase 4 step 1 shipped (hub restore always visible); Phase 3 step 1 shipped (view-mode Live tab); Phase 2 shipped (setup wizard hard gate)  
**Audience:** Product, design, engineering, QA  
**Related:** [`OWNERSHIP_AND_CONTROL_MODEL.md`](OWNERSHIP_AND_CONTROL_MODEL.md) · [`CARD_WORKSPACE_UX.md`](CARD_WORKSPACE_UX.md) · [`M5_5_OWNER_KEY_PORTABILITY.md`](M5_5_OWNER_KEY_PORTABILITY.md) · [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md)

## Locked decisions

| Topic | Decision |
|-------|----------|
| Primary cross-device artifact | **Recovery code** (encrypted backup = advanced) |
| Setup before “You're live” | **Hard gate** (Phase 2) |
| View-only `/created/` | **Read-only Live · Manage**; restore at top of Manage |
| Hub | **Always show** restore / import section |

## Phase 1 (shipped)

- View mode shows `#created-control-root` with Live · Manage tabs
- **Restore ownership** panel at top of Manage (`#created-view-restore-panel`)
- Tests: `created-view-mode-core.test.ts` · `e2e:key-loss-sad-path` (K1/K5)

## Phase 2 (shipped)

Setup wizard **hard gate** before step **You're live**:

- New step **Protect** (between Test scan and Live)
- Continue / **Open card controls** blocked until `rootHasChildObjectBackupSeatbelt(session)`:
  - `recovery_key_acknowledged === true`, or
  - `key_backup_exported_at` set (encrypted backup download in wizard)
- Inline recovery ack + compact backup export in setup (not Manage tab)
- Modules: `created-setup-seatbelt.mjs` · `child-object-backup-gate-core.mjs`
- Tests: `created-setup-hash.test.ts` · `created-setup-seatbelt.test.ts` · `key-loss-copy-guards` (K7)

## Phase 3 (step 1 shipped)

- **Live tab** default on view-only `/created/` (Manage when `#recovery` / `#backup` / `#restore`)
- Read-only banner `#created-view-live-banner` + **Restore ownership** → Manage restore panel
- Hide signing-only Live blocks (primary CTA, publish form, custody, live proof, setup memory); keep deploy disclosures (print, test scan, copy link, download QR)
- P0-7 wallet-branch copy on `#no-session-detail` and Manage restore leads (`created-view-only-copy-core.mjs`)
- `bootstrapViewRestoreTools` hydrates public copy from resolver when session is partial
- Modules: `created-view-live-core.mjs` · `created-view-mode.mjs` · `created-view-only-copy-core.mjs`
- Tests: `npm run worker:test:view-only-restore` · `e2e:key-loss-sad-path` (K1)

## Phase 4 (step 1 shipped)

- Hub backup import group uses **`data-hub-restore-always`** — stays visible in stranger-empty mode (locked decision: hub always shows restore / import)
- CSS exempts `[data-hub-restore-always]` from `.device-hub--stranger-empty` hide rules
- Converged copy constant `HUB_RESTORE_IMPORT_HINT` in `device-ownership-copy-core.mjs`
- Modules: `device-hub-stranger-empty-core.mjs` (`HUB_RESTORE_ALWAYS_ATTR`)
- Tests: `npm run worker:test:hub-restore-always` · `e2e:key-loss-sad-path` (K2 stranger-empty import visible)
- Manual: [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P1-HE** step 1 (import form visible when empty)

## Phase 4 (step 2 shipped)

- Hub import **form hint** and **summary** converge on `HUB_RESTORE_IMPORT_HINT` / `HUB_RESTORE_IMPORT_SUMMARY` — hydrated by `applyHubRestoreImportCopy()` in `device-hub-import.mjs` (no divergent inline HTML on `/`, `/create/`, `/wallet/`)
- Placeholders: `#hub-import-form-hint`, `.hub-import-list-sub`
- Tests: `npm run worker:test:hub-restore-always`

## P0-4 first-session backup gate (shipped)

- **Control workspace** blocked until setup wizard completes or `ownershipBackupSeatbeltSatisfied` (recovery ack, backup export, or import) — `created-first-session-gate-core.mjs` + `created-mode.mjs`
- Wallet rows persist seatbelt markers via `mergeOwnershipSeatbeltFields` on save (`device-wallet.mjs`)
- Legacy `hc_setup_done` backfill only when wallet row already has seatbelt
- Tests: `npm run worker:test:first-session-gate` · `npm run worker:test:setup-protect`
- Tracker: [`SAFARI_KEYS_WIPE_INVESTIGATION.md`](SAFARI_KEYS_WIPE_INVESTIGATION.md) rollout step 7

## Safari P0b-2 (shipped)

- Setup wizard **test scan** no longer auto-advances when preview opens in a **new browser tab** (`shouldAutoAdvanceSetupTestScan`); steward taps **Continue** again on `/created/` before Protect
- PWA standalone may still advance after same-tab `location.assign`
- Modules: `created-setup.mjs` · `pwa-scan-handoff-core.mjs`
- Tests: `npm run worker:test:pwa-install` (handoff core)

## Safari P0b-3 (shipped)

- Scan vouch flow: after opt-in **default vouch** attempt, **sole signing row** auto-activate (network-gated, no default required) then D10 `trySoleSigningRowRehydrateForScan` fallback
- Modules: `vouch-scan-sole-signing-activate-core.mjs` · `vouch-issue.mjs` · `device-quiet-tab-rehydrate.mjs`
- Tests: `npm run worker:test:vouch-scan-sole-activate` · `npm run e2e:vouch-scan-sole-signing`

## Safari P2-2 (shipped)

- When `hc_last_signing_shell_mode` differs from the current shell and the wallet has signing rows but this tab cannot sign, show context-specific copy (R5 session split)
- **Standalone app** after Safari signing: hub / wallet / scan offer **Restore control in this app** (`openRestoreControlInThisTab`)
- **Safari browser** after standalone signing: informational copy to open the Home Screen app (no false restore CTA)
- Record mode on `setTabSession` when tab gains signing keys
- Modules: `device-pwa-session-mismatch-core.mjs` · `device-pwa-session-mismatch.mjs` · `device-pwa-session-mismatch-record.mjs`
- Tests: `npm run worker:test:pwa-session-mismatch`

## Safari P3-3 (shipped)

- **Defense in depth:** `hc_wallet_summary` rows built via allowlisted `walletSummaryRowFromEntry`; persist path runs `serializeWalletSummaryForStorage` (no `owner_private_key_b58` / `recovery_private_key_b58` in JSON).
- Module: `site/js/device-wallet-summary-core.mjs` · tests: `npm run worker:test -- worker/tests/device-wallet-summary-core.test.ts worker/tests/device-wallet-meta.test.ts worker/tests/device-wallet-save.test.ts`
- Tracker: [`SAFARI_KEYS_WIPE_INVESTIGATION.md`](SAFARI_KEYS_WIPE_INVESTIGATION.md) rollout step 17

## Safari P2-3 (shipped)

- WebKit regression for matrix **S2** (sole-card scan tab rehydrates vouch signing) and **S3** (browser `/wallet/` after standalone signing shows home-screen guidance)
- `e2e/safari-keys-persistence.spec.ts` · `npm run e2e:safari-keys-persistence`
- Tracker: [`SAFARI_KEYS_WIPE_INVESTIGATION.md`](SAFARI_KEYS_WIPE_INVESTIGATION.md) rollout step 16

## Safari P1-4 (shipped)

- On `hc_wallet` parse failure, hub shows urgent **`#device-hub-wallet-corrupt`** emphasis card (not stranger-empty hub)
- Hub **Import backup** + **Backup help** via `device-wallet-corrupt-core.mjs`; saved-cards empty hint hidden while corrupt
- **`/wallet/`** `#wallet-tab-hint` uses shared corrupt copy + import/help CTAs
- Modules: `device-wallet-parse-core.mjs` · `device-hub-wallet-corrupt.mjs` · `device-wallet-corrupt-core.mjs` · `wallet-page-chrome.mjs`
- Tests: `npm run worker:test:wallet-corrupt`
- Tracker: [`SAFARI_KEYS_WIPE_INVESTIGATION.md`](SAFARI_KEYS_WIPE_INVESTIGATION.md) rollout step 13

## Safari P2-1 (shipped)

- **iOS shell pages** (`/`, `/wallet/`, `/created/`): dismissible info card when the device has saved cards — explains ~7-day Safari storage eviction and that **Add to Home Screen** / regular opens reset the timer (R4)
- Browser vs standalone copy branches in `device-ownership-copy-core.mjs`
- Modules: `safari-itp-storage-notice-core.mjs` · `safari-itp-storage-notice.mjs` (lazy after status bootstrap)
- Tests: `npm run worker:test:safari-itp-notice`
- Tracker: [`SAFARI_KEYS_WIPE_INVESTIGATION.md`](SAFARI_KEYS_WIPE_INVESTIGATION.md) rollout step 14

## Safari P1-2 (shipped)

- **Hub** custody panel: prominent `wallet_not_in_tab` row — `OWNERSHIP_NOT_IN_TAB_PROMPT` + **Restore control in this tab**
- **Landing** status dot glance: same Layer 2 headline (Flow B)
- **Wallet** (`/wallet/`): `#wallet-tab-hint` emphasis card with restore CTA (shown even when shell badge is present)
- **View-only `/created/`**: Live tab banner uses prompt + amber emphasis when wallet saved; CTA **Restore control in this tab**
- **Scan** actor band: primary **Restore control here** when wallet saved but tab empty (`scan-actor-band.mjs?v=2`)
- Shared restore: `device-ownership-restore-in-tab.mjs` (hub/wallet open card · scan activate)
- Tests: `npm run worker:test:ownership-not-in-tab`
