# Product workstream coordination

**Purpose:** Single reference for parallel agents and humans working **Safari keys**, **ownership restore**, and **H-12 live-control** without duplicating effort or leaving merge conflicts.

**Last updated:** 2026-05-29

---

## Workstreams at a glance

| Stream | Canonical doc | Engineering tracker | Primary surfaces |
|--------|---------------|---------------------|------------------|
| **Safari keys / ITP** | [`SAFARI_KEYS_WIPE_INVESTIGATION.md`](SAFARI_KEYS_WIPE_INVESTIGATION.md) | Rollout steps 1–17 (**shipped** on `main`) | `device-quiet-tab-rehydrate*`, `scan-tab-keys`, shell copy, `safari-itp-storage-notice*` |
| **Ownership restore UX** | [`OWNERSHIP_RESTORE_UX_PLAN.md`](OWNERSHIP_RESTORE_UX_PLAN.md) | Phases 1–4 + Safari cross-refs | `/created/` view mode, hub import, `device-ownership-*` |
| **H-12 printed live-control QA** | [`M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md`](M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md) | H-09–H-13 · sad-path S10–S12 | Scan live proof, `e2e/live-control-loop.spec.ts`, operator scripts |

---

## Active branches / PRs (check before coding)

| ID | Branch | Status | Do not duplicate |
|----|--------|--------|------------------|
| **#107** | `cursor/ownership-restore-phase3-ab8a` | Merged to `main` pending — conflicts resolved | `/created/` view Live readonly, Protect setup memory chip, P1-RESTORE QA |
| **#108** | `cursor/cloud-agent-1780082490008-1q2uv` | Open — merge `main` (P0-6/P0-7 + PWA) | Consolidated onto `device-tab-session-core` + `created-view-only-copy-core`; P1-PWA-N E2E kept |
| **main** | `main` | Safari steps 1–17 shipped | Source of truth for shipped Safari keys |

After **#107** / **#108** merge, update this table and delete closed rows.

---

## Open engineering (not claimed)

| Priority | Item | Owner type | Command / proof |
|----------|------|------------|-----------------|
| P0b-1 step 2 | Card disabled since visit — **prod WebKit** re-verify after deploy | Human QA | [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) · `npm run e2e:card-disabled-since-visit` |
| Scan R9 E2E | Wallet saved, tab empty — scan dot `walletKeysNotInTab` + restore glance | Engineering | Extend `e2e/scan-page-dot.spec.ts` · Vitest `device-dot-state` P0-5 |
| H-12 step 4+ | `camera-scorecard` operator script + comprehension gate | Engineering | `live-control:printed-qa:camera-scorecard` (WIP on disk — coordinate before push) |
| P3-1 / P3-2 | WebAuthn / optional encrypted persistence | Architecture | Not scheduled |

---

## Regression commands (run before closing a PR)

### Ownership restore + Safari keys (shell / created)

```bash
npm run worker:test -- worker/tests/created-view-live-readonly-core.test.ts worker/tests/created-view-mode-core.test.ts worker/tests/created-live-setup-memory.test.ts worker/tests/device-wallet-summary-core.test.ts
npm run e2e:key-loss-sad-path
npm run e2e:safari-keys-persistence
```

### H-12 live-control

```bash
npm run worker:test -- worker/tests/live-control-printed-qa-print-prep.test.ts worker/tests/scan.test.ts
npm run e2e:live-control-loop
```

### Device shell (if touching status graph)

```bash
npm run worker:test -- worker/tests/device-status-shell-modules.test.ts
npm run e2e -- e2e/device-status-dot.spec.ts e2e/device-inbox.spec.ts
```

---

## File ownership hints (avoid edit collisions)

| Area | Likely owner stream | Files |
|------|---------------------|-------|
| View-only `/created/` | Ownership restore | `created-view-mode.mjs`, `created-view-live-readonly*.mjs`, `site/created/index.html` |
| Hub restore / import | Ownership restore | `device-hub-import.mjs`, `device-hub-stranger-empty*` |
| Wallet summary / corrupt | Safari P3-3 / P1-4 | `device-wallet-summary-core.mjs`, `device-wallet-parse-core.mjs` |
| Scan quiet rehydrate | Safari P0-1 | `scan-tab-keys.mjs`, `worker/src/resolver/scan-html.ts` |
| Live proof UX | H-12 | `scan-live-control*`, `e2e/live-control-loop.spec.ts`, `worker/scripts/live-control-printed-qa-*` |

---

## Changelog (coordination log)

| Date | Event |
|------|--------|
| 2026-05-29 | **#107** merge conflicts resolved on `pr-107-merge`: combined Phase 3 readonly QR tasks with `main` Safari P3-3 + P1-2 view banner; added `#created-view-live-qr-tasks` HTML; restored `getSession`/`setSession` on setup |
| 2026-05-29 | Safari rollout **step 17** (P3-3 hub summary guard) shipped on `main` (`e9961c29`) |
| 2026-05-29 | Safari **P2-3** WebKit E2E shipped (`01c2e8b1`) |
| 2026-05-29 | **#108** merge: P0-6/P0-7 deduped to `main` paths; `created-session-core` aliases `device-tab-session-core`; P1-PWA-N standalone history-back E2E retained |
| 2026-05-29 | **#107** merge: Phase 3 QR tasks + `main` Safari/ownership shipped sections |

---

## Agent handoff checklist

1. Read this file + the stream’s canonical doc.
2. `git fetch` and check **Active branches** — do not re-implement open PR scope.
3. Run the **Regression commands** for your stream before push.
4. Append one line to **Changelog** when you merge or ship.
