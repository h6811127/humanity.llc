# Hub card Safari reliability

**Status:** Closed — monitoring only (May 2026)  
**Audience:** Engineering, support, QA  
**Related:** [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) § Wallet and hub card rows · [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) · [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md)

Full investigation history: [`archive/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md`](archive/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md)

---

## Core truth

**A hub saved-card row always reflects `localStorage.hc_wallet`.** There is no timer, poll, or hub logic that removes saved cards after N minutes. If the hub shows stranger-empty, `hc_wallet` is missing, `[]`, or unreadable.

The server orphan purge (90 days) affects resolver data only — not browser wallet storage.

---

## Symptom disambiguation

| What you see | Likely cause |
|--------------|--------------|
| Hub stranger-empty | True hub disappearance — wallet wipe, failed save, corrupt JSON |
| Hub urgent corrupt card | Bad `hc_wallet` JSON |
| Hub row visible, cannot sign | Tab session loss only (`hc_created` empty) — not hub loss |
| Row + “disabled since visit” banner | Trust UI — row still present; see inbox contract in [`DEVICE_INBOX.md`](DEVICE_INBOX.md) |
| Dot says ownership saved, scan cannot vouch | Session loss with wallet intact (R9 partial fix) |

---

## Shipped mitigations (RC-1–RC-16)

| RC | Issue | Fix |
|----|-------|-----|
| RC-1 | No post-save read-back | `verifyWalletStorageWrite()` in `device-wallet-save-core.mjs` |
| RC-2 | `storage.persist()` denied silently | `safari-storage-persist-denied-notice.mjs` when flag `"0"` |
| RC-3 | WebKit ITP eviction | ITP notice + setup custody copy + PWA handoff on Done |
| RC-4 | Save never completed | Setup wallet save gate + `canCompleteSetupWizard` |
| RC-6 | Private browsing | `private-browsing-detect-core` blocks create/save |
| RC-13 | www vs apex split | Canonical origin redirect |
| RC-14 | Hub search false-empty | Stranger transition clear + no-match copy |
| RC-15 | Summary drift | Wallet summary integrity heartbeat on hub open |
| RC-16 | Monitoring | Hub debug wallet snapshot when `hc_debug=1` |

RC-3 (platform eviction) remains possible without backup — by design.

---

## Engineering gate

```bash
npm run hub-card-disappeared:verify        # Vitest + E2E
npm run hub-card-disappeared:verify:fast   # Vitest only (CI)
```

Manual monitoring: **P2-RC-MON** in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md).

---

## Diagnostic checklist (new reports)

1. Hub **Copy build info** with `?hc_debug=1` — check `walletCount` vs hub UI.
2. Web Inspector: `localStorage.getItem("hc_wallet")` — parseable array with expected `profile_id`?
3. Same for `sessionStorage.getItem("hc_created")` — tab session vs saved row.
4. `hc_storage_persist_requested_v1` — `"0"` means persist denied (RC-2 notice should show on iOS).
5. Confirm apex origin (`humanity.llc`, not `www`).
6. If `walletCount ≥ 1` but hub is stranger-empty → **file immediately** (regression).
