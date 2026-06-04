# Key-loss sad-path matrix

**Status:** Active — product copy + gates audit (no operator key recovery)  
**Date:** 2026-05-29  
**Audience:** Product, engineering, QA  
**Related:** [`SAD_PATH_COVERAGE_AND_BACKLOG.md`](SAD_PATH_COVERAGE_AND_BACKLOG.md) § Key custody · [`HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md`](HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md) · [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) · [`M5_5_OWNER_KEY_PORTABILITY.md`](M5_5_OWNER_KEY_PORTABILITY.md) · [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) · [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md)

---

## Purpose

Key loss is **by design** — Humanity does not hold steward private keys. Sad-path work is **clearer first-run gates and copy**, not operator recovery.

This matrix inventories unhappy custody paths, expected UX, and automated regression.

---

## Product stance

| Principle | Implication |
|-----------|-------------|
| No operator recovery | Lost keys without backup/recovery = card may be unmanageable |
| Tab-local signing | `hc_created` in **this** tab; wallet labels ≠ signing keys |
| Steward responsibility | Setup wizard + Manage (recovery + encrypted backup) |

---

## Matrix

| ID | Sad path | User behavior | Expected UX / system | Automation | Manual |
|----|----------|---------------|----------------------|------------|--------|
| **K1** | Tab closed without save | Create → close tab → reopen URL | **View this card**; view-only banner; recovery/backup under Manage | `e2e/key-loss-sad-path.spec.ts` | Stranger emotional check |
| **K2** | Wrong backup passphrase | Import `.hcbackup` with typo | Plain **Wrong passphrase** message; no silent fail | Same E2E · `worker/tests/key-backup.test.ts` | — |
| **K3** | Corrupt / wrong backup file | Upload garbage JSON | Reject with Humanity Card backup error | `worker/tests/key-backup-import.test.ts` (S4) | — |
| **K4** | Keys in another tab | Hub Tab A; create Tab B | Cross-tab banner; Open controls here | `e2e/device-cross-tab-keys.spec.ts` (S3) | — |
| **K5** | Wallet label ≠ control | Saved name only; no keys in tab | View-only; **Ownership not loaded**; My objects CTA | `e2e/key-loss-sad-path.spec.ts` | — |
| **K6** | Revoke / live proof without keys | Deep link `#revoke` or `live_challenge` | View-only; disabled prove; unlock copy | `e2e/production-sad-path-created.spec.ts` (S6–S7) | — |
| **K7** | Setup protect skipped | `fresh=1` without recovery ack or backup export | Step **Protect** hard gate; block Live / **Open card controls** | `npm run worker:test:setup-protect` | P1 create QA |
| **K8** | PWA vs Safari tab | Standalone vs browser session | [`PWA_INSTALL.md`](PWA_INSTALL.md) semantics | `e2e/device-pwa-install.spec.ts` | P1-PWA |
| **K9** | Camera → Safari, keys in PWA | Steward scans print with Camera app | S1 handoff copy + hub Open scan link; **S3** in-app scanner | `npm run worker:test:steward-scan-handoff` | **P1-PWA-V** in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) |
| **K10** | device_unlock — WebAuthn canceled | Scan/shell with wrapped row, user dismisses Face ID | **Unlock to manage** retry; no silent fail to view-only without explanation | TBD `e2e:custody-device-unlock` | Comprehension: cancel ≠ wipe |
| **K11** | device_unlock — passkey lost (no sync) | New phone, no iCloud/Google passkey | Recovery import strips stale wrap → import backup → re-enroll passkey on Manage | `e2e:custody-device-unlock` (K11 block) · `device-custody-reenroll-core.test.ts` | **G-C2** gate |
| **K12** | device_unlock — WebAuthn unavailable | In-app browser or desktop without platform auth | Fallback create as **full_keys** with honest copy | TBD | Environment matrix |
| **K13** | Skipped recovery on easy path | User skipped Protect; passkey sync failed later | Same as K11 — card may be unmanageable; **block at create** when C0/C1 ships | Policy + gate tests | Worse sad path if recovery optional |

**Planned custody modes:** [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) · K10–K13 apply when **WS-CUSTODY** Phase 1+ ships. Until then, all rows behave as **full_keys** (K1–K9).

## Copy module (Layer 2)

Central strings: `site/js/device-ownership-copy-core.mjs`

| Constant | Use |
|----------|-----|
| `OWNERSHIP_NOT_LOADED_TAB` | Revoke / save / wallet errors |
| `VIEW_ONLY_CARD_TITLE` | `/created/` view mode hero |
| `VIEW_ONLY_NO_SESSION_WALLET_EMPTY` | `#no-session-detail` when wallet has no signing rows (Flow C) |
| `VIEW_ONLY_NO_SESSION_WALLET_SAVED` | `#no-session-detail` when wallet has keys but tab does not |
| `viewOnlyNoSessionDetailHtml(signingKeyCount)` | Runtime branch for `#no-session-detail` (P0-7) |
| `WALLET_SAVE_STORAGE_FULL` / `WALLET_SAVE_FAILED` | Quota or generic wallet save failure (P0-3) |
| `WALLET_SAVE_VERIFY_FAILED` | Save write did not round-trip on read-back (RC-1) |
| `STORAGE_PERSIST_DENIED_*` | iOS warn card when durable storage denied (RC-2) |
| `SETUP_WALLET_SAVE_REQUIRED` / `SETUP_WALLET_SAVED_*` | Setup wizard wallet save gate (RC-4 · K7) |
| `BACKUP_INVALID_OWNERSHIP` | Invalid backup payload |
| `IMPORT_OWNERSHIP_LOADED_TAB` | Successful hub import |
| `HUB_RESTORE_RECOVERY_*` / `HUB_OPEN_SCAN_*` / `VOUCH_PWA_CAMERA_HANDOFF_*` | Steward scan handoff S1–S2 · [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md) |
| `HUB_SCAN_QR_*` | In-app hub QR scanner S3 |
| `WALLET_CORRUPT_*` | Corrupt `hc_wallet` hub + `/wallet/` tab hint (P1-4 · R7) |
| `CUSTODY_RECOVERY_NOT_PLATFORM_SYNC` | Protect step — platform sync ≠ recovery (C0) |
| `SETUP_PRINT_IN_APP_HINT` / `SETUP_TEST_SCAN_*` | Setup wizard print + test scan (C0) |
| `UNLOCK_TO_MANAGE` (C1/C2) | device_unlock — primary CTA replacing restore jargon on scan/shell |
| `DEVICE_UNLOCK_REENROLL_*` (C4) | New phone — recovery imported, passkey re-enroll pending (K11) |

Automated guards: `npm run worker:test:key-loss-copy`

---

## Automated regression index (key loss)

| ID | Command |
|----|---------|
| K1, K5 | `npm run e2e:key-loss-sad-path` |
| K2 | Same · `worker/tests/key-backup.test.ts` · regen fixture: `npm run e2e:generate-key-loss-fixture` |
| K3 | `worker/tests/key-backup-import.test.ts` |
| K4 | `e2e/device-cross-tab-keys.spec.ts` |
| K6 | `e2e/production-sad-path-created.spec.ts` |
| K7 | `npm run worker:test:setup-protect` |
| S2, S3 (Safari keys) | `npm run e2e:safari-keys-persistence` |
| Copy | `npm run worker:test:key-loss-copy` |
| Hub card disappeared (RC-1–RC-16) | `npm run hub-card-disappeared:verify` · `npm run e2e:hub-wallet-debug-monitor` (P2-RC-MON) |
| K10–K13 (device_unlock) | `npm run worker:test:custody` · `npm run e2e:custody-device-unlock` — [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) |

---

## Changelog

| Date | Notes |
|------|-------|
| 2026-05-29 | S2/S3 WebKit regression — `e2e:safari-keys-persistence` (P2-3) |
| 2026-05-29 | Initial matrix; K1/K2/K5 E2E; copy guards |
