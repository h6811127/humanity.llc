# Ownership restore and view-mode UX plan

**Status:** Phase 1 shipped (view-mode restore panel + hub import always visible)  
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
- **Restore ownership** panel at top of Manage (`#created-view-restore-panel`) with recovery import + link to encrypted backup
- Signing-only controls hidden via `data-created-signing-only` until keys restore in-tab
- Read-only network snapshot (`#revoke-details` open in view mode)
- Hub import group uses `data-hub-restore-always` (exempt from stranger-empty hide)
- Copy: `VIEW_ONLY_*` in `device-ownership-copy-core.mjs`
- Tests: `worker/tests/created-view-mode-core.test.ts` · `npm run worker:test:key-loss-copy` · `npm run e2e:key-loss-sad-path` (K1)

## Phase 2 (next)

- Setup wizard **hard gate**: acknowledge recovery or export encrypted backup before “You're live”
- See [`BACKUP_PASSPHRASE_PASSWORD_MANAGER_INVESTIGATION.md`](BACKUP_PASSPHRASE_PASSWORD_MANAGER_INVESTIGATION.md) for password-manager HTML fixes

## Phase 3–4

- Live tab read-only signage/QR tasks below card
- Hub/onboarding copy convergence; manual **P1-RESTORE** in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md)
