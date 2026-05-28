# PR #80 merge conflict investigation

**Date:** 2026-05-28  
**Branch:** `cursor/next-doc-implementation-e79e` (also `origin/pr/80`)  
**Base at investigation:** merge-base `176689d6` (PR #77) · `main` @ `8ff5c831` · **104 commits behind `main`**, **2 commits ahead**

This doc records why PR #80 conflicts with `main`, which source wins for each area, and the step-by-step resolution order. Pattern matches [`PR_93_94_MERGE_CONFLICT_INVESTIGATION.md`](PR_93_94_MERGE_CONFLICT_INVESTIGATION.md).

---

## Summary

| PR | Commits | Root cause | Resolution strategy |
|----|---------|------------|---------------------|
| **#80** | `19c4cba7` Add wallet index for shell hot paths · `45b0d329` Avoid wallet key material in index fingerprint | `main` shipped a **superset** on parallel large-wallet branches (merged via #85, #89, large-wallet-hot-path, expanded-hub-visible-rows): `hc_wallet_summary` (v3) replaces PR’s `hc_wallet_index` (v1), plus S8–S12 (DOM caps, lazy hydration, viewport windowing) | **Keep `main` for all code and docs.** PR #80 is an earlier iteration of the same product goal; no unique behavior to port after merge. Close or reset branch to `main`. |

PR #80’s second commit (hash fingerprint instead of prefix/suffix) is **already satisfied on `main`** via `walletRawFingerprint()` — full-string FNV hash with no key-material slices in persisted metadata.

---

## What PR #80 added

### Product goal

Avoid parsing the full `hc_wallet` JSON (which contains `owner_private_key_b58`) on shell hot paths — status dot, hub glance, inbox, counts, live-control poll targets, presence, network refresh, service worker.

### Implementation (2 commits)

1. **`hc_wallet_index` sidecar** — persisted in `localStorage` beside `hc_wallet`:
   - Key: `WALLET_INDEX_STORAGE_KEY = "hc_wallet_index"`
   - Version: `WALLET_INDEX_VERSION = 1`
   - Display-safe row shape via `walletIndexEntry()` (profile_id, label, handle, qr_id, scan_url — no keys)
   - API: `loadWalletIndex()`, `walletIndexCount()`, `persistWalletIndex()` on every `saveWallet()`

2. **Fingerprint hardening** — replace prefix/suffix of raw wallet JSON with FNV-1a `walletHash` so index invalidation metadata cannot leak key-adjacent string fragments.

### Hot-path rewiring (13 modules)

PR replaces full-wallet reads with `loadWalletIndex()` / `walletIndexCount()` in:

| Module | PR change |
|--------|-----------|
| `device-status.mjs` | Live-proof poll targets from index |
| `device-counts.mjs` | Saved count from `walletIndexCount()` |
| `device-hub-glance.mjs` | Glance rows from index |
| `device-hub-keys-custody.mjs` | Custody count from index |
| `device-hub-ui.mjs` | Hub saved rows from index |
| `device-inbox-card-disabled.mjs` | Disabled-card lookup from index |
| `device-live-control-inbox.mjs` | Poll targets from index |
| `device-os-coordinator.mjs` | Coordinator entries from index |
| `device-tab-presence.mjs` | Profile IDs from index |
| `device-wallet-network.mjs` | Network scope entries from index |
| `device-browser-notifications-sw.mjs` | SW poll entries from index |
| `wallet-page.mjs` / `wallet-page-chrome.mjs` | Page chrome counts from index |

### Tests

`worker/tests/device-wallet-save.test.ts` — new `wallet sidecar index` describe block: index written on save, no private keys in index JSON, fingerprint uses hash not prefix/suffix.

### Docs (stale vs `main`)

| Doc | PR #80 claim | `main` reality |
|-----|--------------|----------------|
| `DEVICE_OS_REQUEST_BUDGET.md` | S8–S12 **not shipped**; documents `hc_wallet_index` | S8–S12 **shipped**; documents `hc_wallet_summary` |
| `KEYS_CARDS_AND_VERIFICATION.md` | Shell perf via `hc_wallet_index` | Shell perf via `hc_wallet_summary` + S10/S11 DOM caps |
| `MERCH_FUNNEL_MVP.md` priority 5 | Shipped via `hc_wallet_index` | Shipped via S6–S12 + `hc_wallet_summary` |

PR docs also roll back unrelated shipped work (hosted rollout status, O2 rate limits, shipping quotes, steward roadmap links).

---

## What `main` already has (superset)

Canonical references:

- [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) § Shell performance — **S8–S12 shipped**
- [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) § Shell performance
- [`SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md`](SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md) § persistence table
- [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) priority **5** — large-wallet shell performance ✅

Merged PRs that supersede #80 (partial list):

- #85 `cursor/hub-lazy-wallet-hydration-dd98` — lazy hub hydration from summary
- #89 `cursor/expanded-hub-visible-rows-9f90` — S12 viewport summary windowing
- `cursor/large-wallet-hot-path-*` — S8–S11, network cache bound, presence debounce

### Architecture comparison (do not mix)

| Surface | PR #80 | `main` (canonical) |
|---------|--------|---------------------|
| Sidecar key | `hc_wallet_index` | `hc_wallet_summary` |
| Version | `1` | `3` |
| Primary loader | `loadWalletIndex()` | `loadWalletSummary()` |
| Count API | `walletIndexCount()` | `getWalletCount()` → `loadWalletSummary().count` |
| Row API | index entries (flat array) | `getWalletEntrySummaries()` / `loadWalletSummary().rows` |
| Pollable API | filter index in each caller | `listPollableWalletEntries()` / `getWalletPollableCount()` |
| Aggregate metadata | count only (implicit) | `signingKeyCount`, `pollableCount`, `stewardReady`, `profileIds` |
| QR scope on rows | not in PR index | `qr_scope` on `WalletSummaryRow` (child-object hub rows) |
| Fingerprint | FNV-1a hash (`walletHash`) | FNV-style hash over full raw string (`walletRawFingerprint`) — **no prefix/suffix leak** |
| Hub large-wallet UX | none | S10 DOM cap, S12 viewport window, lazy full-row hydration on action |
| Test helper | inline stub in describe | `resetWalletCachesForTests()` + shared beforeEach |

**Rule:** Never reintroduce `hc_wallet_index` or `loadWalletIndex()` alongside `hc_wallet_summary`. One sidecar only.

---

## Conflicting files (18) and resolution

Simulated merge (`git merge-tree`) reports **18 `changed in both`** hunks — every PR touch overlaps `main`.

| File | Conflict nature | Pick |
|------|-----------------|------|
| `site/js/device-wallet.mjs` | Index vs summary implementation | **`main`** |
| `site/js/device-status.mjs` | `listPollableWalletEntries()` vs `loadWalletIndex()` | **`main`** |
| `site/js/device-counts.mjs` | `getWalletCount()` vs `walletIndexCount()` | **`main`** |
| `site/js/device-hub-glance.mjs` | `getWalletEntrySummaries()` vs `loadWalletIndex()` | **`main`** |
| `site/js/device-hub-keys-custody.mjs` | `getWalletCount()` vs index | **`main`** |
| `site/js/device-hub-ui.mjs` | `loadWalletSummary()` + S12 windowing vs index | **`main`** |
| `site/js/device-inbox-card-disabled.mjs` | `getWalletEntrySummariesByProfileIds()` vs index | **`main`** |
| `site/js/device-live-control-inbox.mjs` | poll targets API | **`main`** |
| `site/js/device-os-coordinator.mjs` | entries source | **`main`** |
| `site/js/device-tab-presence.mjs` | `loadWalletSummary().profileIds` vs index | **`main`** |
| `site/js/device-wallet-network.mjs` | network scope entries | **`main`** |
| `site/js/device-browser-notifications-sw.mjs` | SW poll entries | **`main`** |
| `site/js/wallet-page.mjs` | count API | **`main`** |
| `site/js/wallet-page-chrome.mjs` | count API | **`main`** |
| `worker/tests/device-wallet-save.test.ts` | summary tests vs index tests | **`main`** (+ ensure fingerprint/no-key tests still pass) |
| `docs/DEVICE_OS_REQUEST_BUDGET.md` | S8–S12 status, index naming | **`main`** |
| `docs/KEYS_CARDS_AND_VERIFICATION.md` | shell perf wording | **`main`** |
| `docs/MERCH_FUNNEL_MVP.md` | priority 5 + unrelated rows | **`main`** |

---

## Security note (PR commit 2)

PR #80 fixed a real issue in its **own** design: early index fingerprints stored `walletPrefix` / `walletSuffix` slices of the raw wallet JSON, which could expose fragments near key fields.

`main` never shipped that design. `walletRawFingerprint()` hashes the entire raw string:

```99:106:site/js/device-wallet.mjs
function walletRawFingerprint(raw) {
  if (!raw) return "0:0";
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash = Math.imul(hash ^ raw.charCodeAt(i), 16777619) >>> 0;
  }
  return `${raw.length}:${hash.toString(36)}`;
}
```

No port required from PR #80 for security.

---

## Resolution steps

1. Merge or rebase `main` into `cursor/next-doc-implementation-e79e` (or checkout `pr-80`).
2. For each row in the conflict table, apply **`main`** (`git checkout --theirs` when merging `main` into the PR branch).
3. Confirm no `hc_wallet_index` / `loadWalletIndex` references remain (`rg 'hc_wallet_index|loadWalletIndex'` → empty).
4. Run regression suite:

```bash
npm run worker:test -- worker/tests/device-wallet-save.test.ts worker/tests/device-hub-wallet-summary.test.ts worker/tests/device-hub-visible-rows-core.test.ts
npm run e2e -- e2e/device-hub-large-wallet-summary.spec.ts
```

5. Expected outcome: PR diff vs `main` is **empty** — close as superseded or merge as no-op.

**Fast path (if history cleanup acceptable):** `git reset --hard main` on the PR branch and force-push (same approach as PR #93 after investigation).

---

## Relationship to other open work

| Item | Notes |
|------|-------|
| `cursor/large-wallet-hot-path-1a2d` / `04bc` | Local branches; largely merged to `main` via #85/#89 track |
| `cursor/hub-lazy-wallet-hydration-dd98` | Merged conceptually into S9 lazy hydration |
| `cursor/wallet-hot-path-parse-255f` | Same product area; check for duplicate before new PRs |
| [`PR_93_94_MERGE_CONFLICT_INVESTIGATION.md`](PR_93_94_MERGE_CONFLICT_INVESTIGATION.md) | Same supersession pattern — parallel branch vs faster `main` track |

---

## Verification commands

```bash
git fetch origin pull/80/head:pr-80
git merge-tree $(git merge-base main pr-80) main pr-80 | grep -c 'changed in both'  # expect 18 before fix, 0 after align
npm run worker:test -- worker/tests/device-wallet-save.test.ts
npm run worker:test:device  # broader shell module coverage
```

---

## Related docs

- [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) § Shell performance (S1–S12)
- [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) § Realistic scale
- [`SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md`](SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md)
- [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P1-LW** — large-wallet hub summary E2E
