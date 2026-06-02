# Safari keys custody (WebKit / iOS)

**Status:** Canonical — P0–P2 **shipped** (rollout steps 1–22 on `main`) · P3-1 / P3-2 not scheduled  
**Audience:** Engineering, support, QA  
**Related:** [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) · [`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md) · [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md) · [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md) · [`PWA_INSTALL.md`](PWA_INSTALL.md) · [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md)

Full investigation (prod walkthrough, changelog): [`archive/SAFARI_KEYS_WIPE_INVESTIGATION.md`](archive/SAFARI_KEYS_WIPE_INVESTIGATION.md)

---

## Executive summary

Stewards on Safari often report “keys wiped.” Usually **keys still exist in `localStorage.hc_wallet`** but **this tab’s `sessionStorage.hc_created` is empty** — Camera QR and `window.open` constantly create fresh tabs. Sometimes **WebKit ITP or storage pressure** truly evicts data.

**Product sentence:** *Signing requires tab session keys. Saved wallet survives tab close when save succeeded. Recovery must be automatic on every entry surface — especially scan — or stewards read session loss as wipe.*

**Not fixable server-side** without breaking the no-custody trust model ([`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md)).

---

## Two local stores (do not conflate)

| Store | Key | Can sign? | Lifetime | Shared across tabs? |
|-------|-----|-----------|----------|---------------------|
| **Tab session** | `sessionStorage.hc_created` | **Yes** — when `owner_private_key_b58` present | Until tab closes | **No** |
| **Saved wallet** | `localStorage.hc_wallet` | **No** until copied into session | Until remove or browser evicts | **Yes** (same origin; PWA shares wallet, not session) |

```text
Create → hc_created (this tab) → save → hc_wallet (device)
New tab / Camera QR → hc_created empty → quiet rehydrate SHOULD copy from wallet
```

**PWA vs Safari:** Same origin shares `hc_wallet` but **not** `sessionStorage`. iPhone Camera opens Safari, not Home Screen PWA.

---

## Symptom → likely cause

| What user sees | Wallet has keys? | Tab session? | Likely cause |
|----------------|------------------|--------------|--------------|
| Cannot vouch on scan tab | Yes | No | R1 new tab — rehydrate skipped or failed |
| Hub row visible, need Open controls | Yes | No | R2 session loss (not hub loss) |
| Hub stranger-empty | No | No | R4 true wipe or R3 save never completed |
| Dot “saved” but cannot sign | Yes | No | R9 misleading chrome — **fixed P0-5** |
| “Disabled since visit” on new card | Yes | Any | R10 false positive — **fixed P0b-1** |
| My cards empty, corrupt coach | Parse error | Any | R7 corrupt `hc_wallet` — **fixed P1-4** |

---

## Root causes (reference IDs)

| ID | Mechanism | Mitigation (shipped) |
|----|-----------|----------------------|
| **R1** | Camera / `_blank` → empty `hc_created` | **P0-1** `scan-tab-keys.mjs` awaits `maybeQuietTabRehydrate()` before vouch |
| **R2** | Rehydrate gates: multi-card, PIN, toggle off | D10 tiers 1–3 · [`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md) |
| **R3** | Auto-save race / quota | **P0-2** sync save on create · **P0-3** `saveWallet` try/catch + `hc_auto_save_failed` |
| **R4** | ITP 7-day, storage pressure, clear data | **P0-4** backup gate · **P2-1** ITP notice · backup/recovery only path |
| **R5** | PWA vs browser separate sessions | **P1-3** same-tab scan in standalone · **P2-2** session mismatch chrome |
| **R6** | Intentional clear (remove device, stop managing) | By design — confirm dialogs |
| **R7** | Corrupt wallet parse → `[]` | **P1-4** corrupt wallet coach, not empty hub |
| **R8** | Cross-tab noise feels like loss | Coordinator + rebuild plan |
| **R9** | Scan dot used wallet count not tab keys | **P0-5** tab-honest dot + restore CTA |
| **R10** | Card disabled since visit false positive | **P0b-1** no in-visit baseline seed |
| **R11** | Keyless `hc_created` pollution | **P0-6** `setTabSession` rejects metadata-only writes |
| **R12** | Setup wizard auto-advance on `window.open` scan | **P0b-2** browser needs second Continue |
| **R13** | View-only copy wrong when wallet empty | **P0-7** branch on signing rows |

---

## Engineering invariants

These must stay true — also listed in [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md).

| # | Invariant |
|---|-----------|
| **P0-1** | Scan pages: `scan-tab-keys.mjs` **before** `vouch-issue.mjs` / live-control; top-level `await maybeQuietTabRehydrate()` |
| **P0-5** | Scan dot / actor band reflect **tab signing state**, not wallet count alone |
| **P0-6** | Never persist `hc_created` without `owner_private_key_b58` or recovery private key |
| **P0-3** | `saveWallet()` catches quota errors; surfaces `WALLET_SAVE_VERIFY_FAILED` |
| **P0b-3** | Exactly one signing wallet row on scan → sole-row vouch auto-activate when gates pass |
| **P1-2** | When wallet has keys but tab does not: **Restore control here** on hub, dot, wallet hint, scan actor band, view-only Live |
| **P3-3** | `hc_wallet_summary` allowlist — no raw private keys in summary paths |

### Quiet rehydrate gates (D10)

Evaluated in `shouldQuietTabRehydrate()` — full spec [`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md):

| Condition | Rehydrate? |
|-----------|------------|
| Tab already has private key | No |
| Zero signing wallet rows | No |
| Exactly one signing row + unlock OK | **Yes** |
| Two+ rows, toggle `"0"` or no last-active | No |
| PIN / sign-lock required | No |

**Entry surfaces:** shell (`device-status.mjs` boot) · scan (`scan-tab-keys.mjs`).

### Scan script order

```text
scan-tab-keys.mjs     ← await maybeQuietTabRehydrate(); then presence
live-control …        ← blocked until above finishes
vouch-issue.mjs     ← sees populated hc_created when gates pass
```

---

## Custody-relevant storage keys

| Key | Store | Role |
|-----|-------|------|
| `hc_created` | session | Tab signing session |
| `hc_wallet` | local | Saved cards (may include private keys) |
| `hc_wallet_summary` | local | Hub summary cache (no private keys — P3-3) |
| `hc_last_active_profile_id` | local | Multi-card rehydrate target |
| `hc_quiet_tab_rehydrate` | local | `"0"` opts out of multi-card silent rehydrate |
| `hc_auto_save_failed` | session | Profile IDs where auto-save failed |
| `hc_last_signing_shell_mode` | local | PWA vs browser mismatch (P2-2) |
| `hc_storage_persist_requested_v1` | local | `"0"` when persist denied — triggers RC-2 notice |

---

## Recovery paths

| Path | Works when |
|------|------------|
| Quiet rehydrate (D10) | 1 card, or multi + last-active + toggle, no PIN |
| `/created/?profile_id=` activate | Deep link + wallet row with private key |
| Hub / scan **Restore control here** | Wallet has keys, session empty (P1-2) |
| Recovery code / `.hcbackup` | User exported before wipe |
| Server | **Never** — no key custody |

---

## Diagnostics (exact tab where signing failed)

| Check | Healthy | Wipe signal |
|-------|---------|-------------|
| `sessionStorage.hc_created` | Has `owner_private_key_b58` | Missing or no private field |
| `localStorage.hc_wallet` | Array with profile + private key | `[]`, missing profile, parse throws |
| `hc_auto_save_failed` | Absent or not your profile | Your profile listed |
| Context | Note PWA vs browser | Same wallet, different session |

---

## Regression commands

```bash
npm run e2e:safari-keys-persistence      # S2 scan rehydrate · S3 PWA mismatch (WebKit)
npm run e2e:scan-page-dot                # R9 wallet saved, tab empty
npm run e2e:key-loss-sad-path            # K1–K5
npm run e2e:vouch-scan-sole-signing        # P0b-3
npm run e2e:card-disabled-since-visit      # P0b-1 R10
npm run ownership-restore:verify
npm run worker:test -- worker/tests/device-quiet-tab-rehydrate.test.ts worker/tests/device-tab-session.test.ts worker/tests/device-wallet-save-core.test.ts
npm run worker:test:safari-itp-notice
npm run worker:test:pwa-session-mismatch
```

Manual QA: **P1-P0b-1**, **P1-PWA-V**, **P1-QTR**, **P0-W** in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md).

**P0b-1 sign-off (R10):** Desk gate ☑ 2026-06-02 · Prod WebKit re-verify pending after Pages deploy (prior pass 2026-05-30). Sign-off: `npm run card-disabled-since-visit:sign-off -- --pass --apply`.

---

## Open backlog (P3 only)

| Item | Notes |
|------|-------|
| **P3-1** | WebAuthn / Secure Enclave wrapping — reduce sessionStorage dependence |
| **P3-2** | Optional encrypted persistence outside ITP window (consent + threat model) |

---

## Steward guidance (support copy)

1. **Card still in hub** — keys likely on device; tap **Open controls** or **Restore control here** in this tab.
2. **Hub empty** — true wipe or save failed; need recovery code or encrypted backup.
3. **iPhone Camera** — new tab; one saved card should auto-restore on scan (P0-1). Multiple cards or PIN may need manual restore.
4. **Use Home Screen consistently** — reduces ITP split and PWA/Safari session mismatch.
5. **Export backup** before field use or printing QR.

---

## Shipped rollout index (steps 1–22)

| Steps | Items |
|-------|-------|
| 1–7 | P0-1 scan rehydrate · P0-5 dot honesty · P0-6 keyless session · P0-7 copy · P0-2 sync save · P0-3 quota · P0-4 backup gate |
| 8–10 | P0b-1 card disabled FP · P0b-2 setup scan tab · P0b-3 sole-row vouch |
| 11–13 | P1-2 restore CTA · P1-3 PWA same-tab scan · P1-4 corrupt wallet |
| 14–18 | P2-1 ITP notice · P2-2 session mismatch · P2-3 WebKit E2E · P2-3b · R9 E2E |
| 19–23 | P0b-1 WebKit desk · P0-1 runtime E2E · RC-2 persist denied · hub card RC close-out |

Detail per step: [`archive/SAFARI_KEYS_CUSTODY.md`](archive/SAFARI_KEYS_CUSTODY.md) § Implementation rollout tracker.
