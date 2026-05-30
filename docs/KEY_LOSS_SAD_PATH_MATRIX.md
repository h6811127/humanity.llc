# Key-loss sad-path matrix

**Status:** Active — product copy + gates audit (no operator key recovery)  
**Date:** 2026-05-29  
**Audience:** Product, engineering, QA  
**Related:** [`SAD_PATH_COVERAGE_AND_BACKLOG.md`](SAD_PATH_COVERAGE_AND_BACKLOG.md) § Key custody · [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) · [`M5_5_OWNER_KEY_PORTABILITY.md`](M5_5_OWNER_KEY_PORTABILITY.md) · [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md)

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

---

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
| `BACKUP_INVALID_OWNERSHIP` | Invalid backup payload |
| `IMPORT_OWNERSHIP_LOADED_TAB` | Successful hub import |
| `HUB_RESTORE_IMPORT_HINT` / `HUB_RESTORE_IMPORT_SUMMARY` | Hub backup import form (Phase 4) |
| `WALLET_CORRUPT_*` | Corrupt `hc_wallet` hub + `/wallet/` tab hint (P1-4 · R7) |
| `PWA_MISMATCH_*` / `RESTORE_CONTROL_IN_THIS_APP` | PWA vs Safari session split (P2-2 · R5) |

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
| Copy | `npm run worker:test:key-loss-copy` |

---

## Changelog

| Date | Notes |
|------|-------|
| 2026-05-29 | Initial matrix; K1/K2/K5 E2E; copy guards |
