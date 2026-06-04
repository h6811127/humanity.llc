# Hybrid custody — recovery mandatory at create (G-C2)

**Status:** Engineering + desk proxy shipped · manual sad-path sign-off open  
**Audience:** QA, product  
**Related:** [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) · [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md) **K11** · **K13**

---

## Policy

**This device (Face ID / Touch ID)** at create **requires** a recovery method:

- Recovery checkbox is **checked and disabled** on `/create/` when device_unlock is selected.
- Submit rejects device_unlock without `wantRecovery`.
- Wallet save via `saveSessionToWalletWithCustody` rejects device_unlock sessions missing recovery material.

**Full control keys** keeps recovery optional (recommended).

Passkey platform sync (iCloud / Google) is **not** operator recovery — see setup Protect copy (`CUSTODY_RECOVERY_NOT_PLATFORM_SYNC`).

---

## Automated regression

| Check | Command |
|-------|---------|
| Recovery gate pure logic | `worker/tests/device-custody-recovery-gate-core.test.ts` |
| Create custody panel | `worker/tests/device-custody-create-core.test.ts` |
| Desk proxy | `npm run e2e:custody-create-recovery` |
| Block | `npm run worker:test:custody` |

---

## Manual matrix (G-C2 · ties to K11)

| # | Flow | Pass criteria |
|---|------|----------------|
| 1 | Create with This device → complete Protect on `/created/` | Recovery code saved; user can unlock + scan |
| 2 | Recovery import on new phone (no passkey sync) | K11 re-enroll path works after `.hcbackup` |
| 3 | Attempt to skip Protect after device_unlock create | Live / controls blocked until seatbelt |
| 4 | full_keys create with recovery unchecked | Allowed (if other gates pass) |

**Fail if:** user can complete device_unlock create with no recovery on card and no gate on Manage.

---

## Modules

| Module | Role |
|--------|------|
| `device-custody-recovery-gate-core.mjs` | Validation rules |
| `device-custody-create-core.mjs` | `recoveryMandatory` on panel state |
| `create-card.mjs` | UI lock + submit validation |
| `device-custody-save.mjs` | Wallet save guard |
