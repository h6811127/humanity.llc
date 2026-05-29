# Ownership restore and view-mode UX plan

**Status:** Phase 3 shipped (view Live read-only QR tasks)  
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
- Hub import uses `data-hub-restore-always`
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

- View mode **Live** tab shows read-only **QR and signage** tasks below the object card (`created-view-live-readonly.mjs`)
- Signing-only Live blocks hidden (`data-created-live-signing-only`): publish form, deploy/custody, primary CTA
- Setup memory chips include **Protect** (five steps); visible read-only in view and control
- Restores Phase 1 wiring regressed in #105 merge (`created-view-mode`, restore panel, `createdControlRootVisibleForMode`)
- Tests: `created-view-live-readonly-core.test.ts` · `created-live-setup-memory.test.ts` · `e2e:key-loss-sad-path` (K1)

## Phase 4

- Manual **P1-RESTORE** in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md)
