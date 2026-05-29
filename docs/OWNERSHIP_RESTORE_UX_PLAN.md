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
