# Ownership restore and view-mode UX plan

**Status:** Phase 4 step 5 shipped (scan page owner restore CTA); Phase 4 step 4 shipped (hub recovery import + PWA scan link handoff); Phase 4 step 3 shipped (CI regression gate + landing/create stranger-empty import E2E); Phase 4 step 2 shipped (hub import copy convergence); Phase 4 step 1 shipped (hub restore always visible); **Phase 3 shipped** (view Live read-only QR tasks + banner); Phase 2 shipped (setup wizard hard gate); Phase 1 shipped (restore panel wiring)  
**Audience:** Product, design, engineering, QA  
**Related:** [`OWNERSHIP_AND_CONTROL_MODEL.md`](OWNERSHIP_AND_CONTROL_MODEL.md) · [`CARD_WORKSPACE_UX.md`](CARD_WORKSPACE_UX.md) · [`M5_5_OWNER_KEY_PORTABILITY.md`](M5_5_OWNER_KEY_PORTABILITY.md) · [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md) · [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md)

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

## Phase 3 (shipped)

- **Live tab** default on view-only `/created/` (Manage when `#recovery` / `#backup` / `#restore`)
- Read-only banner `#created-view-live-banner` + **Restore ownership** → Manage restore panel (P1-2 wallet-saved branch)
- View-mode **QR and signage** section `#created-view-live-qr-tasks` below object card (`created-view-live-readonly.mjs`)
- Signing-only Live blocks hidden via `data-created-signing-only` + `CREATED_VIEW_LIVE_SIGNING_ONLY_IDS` (publish form, custody, primary CTA, live proof, setup memory)
- Setup memory chips include **Protect** (five steps); visible read-only in view and control
- P0-7 wallet-branch copy on `#no-session-detail` and Manage restore leads (`created-view-only-copy-core.mjs`)
- `bootstrapViewRestoreTools` hydrates public copy from resolver when session is partial
- Modules: `created-view-live-core.mjs` · `created-view-live-readonly.mjs` · `created-view-mode.mjs` · `created-view-only-copy-core.mjs`
- Tests: `npm run worker:test:view-only-restore` · `worker/tests/created-view-live-readonly-core.test.ts` · `e2e:key-loss-sad-path` (K1)
- Manual: [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P1-RESTORE**

## Phase 4 (step 1 shipped)

- Hub backup import group uses **`data-hub-restore-always`** — stays visible in stranger-empty mode (locked decision: hub always shows restore / import)
- CSS exempts `[data-hub-restore-always]` from `.device-hub--stranger-empty` hide rules
- Converged copy constant `HUB_RESTORE_IMPORT_HINT` in `device-ownership-copy-core.mjs`
- Modules: `device-hub-stranger-empty-core.mjs` (`HUB_RESTORE_ALWAYS_ATTR`)
- Tests: `npm run worker:test:hub-restore-always` · `e2e:key-loss-sad-path` (K2 stranger-empty import visible)
- Manual: [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P1-HE** step 1 (import form visible when empty)

## Phase 4 (step 3 shipped)

- **CI gate** in `.github/workflows/test-site.yml`: `worker:test:view-only-restore` + `worker:test:hub-restore-always` + `e2e:key-loss-sad-path` (K1, K5, K2 wallet + **K2-landing** + **K2-create** stranger-empty import visible)
- Local bundle: `npm run ownership-restore:verify`
- E2E fix: K1 asserts **QR and signage** on **Live** tab before switching to Manage (tab pane hides `#created-view-live-qr-tasks`)
- Manual: [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P1-HE** step 1 on `/` and `/create/` (import group visible when empty)

## Phase 4 (step 4 shipped)

- Hub **Import recovery code** — paste scan link + recovery code without `.hcbackup` file transfer; works across Safari and Home Screen PWA (`device-hub-import-recovery*.mjs`)
- Hub **Open scan link** — paste camera-opened Safari scan URL to open in PWA (`device-hub-open-scan*.mjs`)
- Scan vouch **camera handoff** explainer when iOS Safari lands from Camera with empty wallet (`scan-pwa-camera-handoff-core.mjs` · `vouch-issue.mjs`)
- Copy: `HUB_RESTORE_RECOVERY_*`, `HUB_OPEN_SCAN_*`, `VOUCH_PWA_CAMERA_HANDOFF_*` in `device-ownership-copy-core.mjs`
- Always visible under `data-hub-restore-always` import group on `/`, `/create/`, `/wallet/`
- Tests: `npm run worker:test:hub-restore-always` · `e2e/device-pwa-scan-handoff.spec.ts` (Open scan link form)

## Phase 4 (step 5 shipped)

- **Scan page owner restore CTA** — active `print_artifact` scans show **Restore control** → `/created/?profile_id=…#restore` for empty-wallet owners (hoodie / sticker on new phone PWA) — [`SCAN_PAGE_OWNER_RESTORE_CTA.md`](SCAN_PAGE_OWNER_RESTORE_CTA.md)
- Modules: `scan-owner-restore-cta-core.mjs` · `scan-owner-restore-cta.mjs` · `scan-html.ts` · `SCAN_OWNER_RESTORE_CTA_*` copy
- Tests: `worker/tests/scan-owner-restore-cta-core.test.ts` · `worker/tests/scan.test.ts`

## Phase 4 (step 2 shipped)

- Hub import **form hint** and **summary** converge on `HUB_RESTORE_IMPORT_HINT` / `HUB_RESTORE_IMPORT_SUMMARY` — hydrated by `applyHubRestoreImportCopy()` in `device-hub-import.mjs` (no divergent inline HTML on `/`, `/create/`, `/wallet/`)
- Placeholders: `#hub-import-form-hint`, `.hub-import-list-sub`
- Tests: `npm run worker:test:hub-restore-always`

## Steward scan handoff (S1–S3)

- **S1 shipped:** Safari iOS vouch explainer + hub **Open scan link** — [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md)
- **S2 shipped:** Hub **Import recovery code** (scan link + recovery code)
- **S3 shipped:** Hub **Scan QR to vouch** (in-app camera · `device-hub-qr-scanner.mjs`)

## P0-4 first-session backup gate (shipped)

- **Control workspace** blocked until setup wizard completes or `ownershipBackupSeatbeltSatisfied` (recovery ack, backup export, or import) — `created-first-session-gate-core.mjs` + `created-mode.mjs`
- Wallet rows persist seatbelt markers via `mergeOwnershipSeatbeltFields` on save (`device-wallet.mjs`)
- Legacy `hc_setup_done` backfill only when wallet row already has seatbelt
- Tests: `npm run worker:test:first-session-gate` · `npm run worker:test:setup-protect`
- Tracker: [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) rollout step 7

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
- Tracker: [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) rollout step 17

## Safari P2-3 (shipped)

- WebKit regression for matrix **S2** (sole-card scan tab rehydrates vouch signing) and **S3** (browser `/wallet/` after standalone signing shows home-screen guidance)
- `e2e/safari-keys-persistence.spec.ts` · `npm run e2e:safari-keys-persistence`
- Tracker: [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) rollout step 16

## Safari P1-4 (shipped)

- On `hc_wallet` parse failure, hub shows urgent **`#device-hub-wallet-corrupt`** emphasis card (not stranger-empty hub)
- Hub **Import backup** + **Backup help** via `device-wallet-corrupt-core.mjs`; saved-cards empty hint hidden while corrupt
- **`/wallet/`** `#wallet-tab-hint` uses shared corrupt copy + import/help CTAs
- Modules: `device-wallet-parse-core.mjs` · `device-hub-wallet-corrupt.mjs` · `device-wallet-corrupt-core.mjs` · `wallet-page-chrome.mjs`
- Tests: `npm run worker:test:wallet-corrupt`
- Tracker: [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) rollout step 13

## Safari P2-1 (shipped)

- **iOS shell pages** (`/`, `/wallet/`, `/created/`): dismissible info card when the device has saved cards — explains ~7-day Safari storage eviction and that **Add to Home Screen** / regular opens reset the timer (R4)
- Browser vs standalone copy branches in `device-ownership-copy-core.mjs`
- Modules: `safari-itp-storage-notice-core.mjs` · `safari-itp-storage-notice.mjs` (lazy after status bootstrap)
- Tests: `npm run worker:test:safari-itp-notice`
- Tracker: [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) rollout step 14

## Safari P1-2 (shipped)

- **Hub** custody panel: prominent `wallet_not_in_tab` row — `OWNERSHIP_NOT_IN_TAB_PROMPT` + **Restore control in this tab**
- **Landing** status dot glance: same Layer 2 headline (Flow B)
- **Wallet** (`/wallet/`): `#wallet-tab-hint` emphasis card with restore CTA (shown even when shell badge is present)
- **View-only `/created/`**: Live tab banner uses prompt + amber emphasis when wallet saved; CTA **Restore control in this tab**
- **Scan** actor band: primary **Restore control here** when wallet saved but tab empty (`scan-actor-band.mjs?v=2`)
- Shared restore: `device-ownership-restore-in-tab.mjs` (hub/wallet open card · scan activate)
- Tests: `npm run worker:test:ownership-not-in-tab`
