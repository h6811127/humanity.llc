# Product workstream coordination

**Purpose:** Single reference for parallel agents and humans — active work, regression gates, file ownership.  
**Also read:** [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) (rules that must stay true) · [`DOC_MAINTENANCE.md`](DOC_MAINTENANCE.md) (doc policy)

**Last updated:** 2026-06-02

---

## Workstreams at a glance

| Stream | Canonical doc | Engineering tracker | Primary surfaces |
|--------|---------------|---------------------|------------------|
| **Steward scan handoff / PWA vouch** | [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md) | **S1–S7 shipped** · **`steward-scan-handoff:verify`** | § Incident history (dual-QR RC-1) |
| **Hub card Safari reliability** | [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md) | **Closed — monitoring** · **`hub-card-disappeared:verify`** | RC-1–RC-16 shipped |
| **Shell page load flash** | [`SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md`](SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md) | **RC-1–RC-17 shipped** · **`worker:test:shell-boot`** · **`worker:test:card-disabled-since-visit`** | RC-18+ future only |
| **Safari keys / ITP** | [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) | P0–P2 **shipped** (steps 1–22) | `device-quiet-tab-rehydrate*`, `scan-tab-keys`, `safari-itp-storage-notice*`, `safari-storage-persist-denied-notice*` |
| **Ownership restore UX** | [`OWNERSHIP_RESTORE_UX_PLAN.md`](OWNERSHIP_RESTORE_UX_PLAN.md) | Phases 1–4 + Safari cross-refs | `/created/` view mode, hub import, `device-ownership-*` |
| **H-12 printed live-control QA** | [`M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md`](M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md) | H-09–H-13 · sad-path S10–S12 | Scan live proof, `e2e/live-control-loop.spec.ts`, operator scripts |
| **Cedar Rapids city game** | [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) · [`CITY_GAME_AUTONOMOUS_V1.md`](CITY_GAME_AUTONOMOUS_V1.md) | Phase C prep · **`verify:city-game` ☑** · human gates open (install QA, GT comprehension, custody) | Autonomous spine, launch checklist, install map |
| **Smooth mode (low-end mobile)** | [`DEVICE_LITE_MOBILE_PLAN.md`](DEVICE_LITE_MOBILE_PLAN.md) | **Phase 0 lab 3/3 ☑** · Phase 1 **deferred** (Nord cold boot → boot graph) · [`DEVICE_SMOOTH_MODE_PHASE0_GATE.md`](DEVICE_SMOOTH_MODE_PHASE0_GATE.md) | Boot graph investigation for Nord cold open |

---

## Active branches / PRs (check before coding)

| ID | Branch | Status | Do not duplicate |
|----|--------|--------|------------------|
| **#107** | `cursor/ownership-restore-phase3-ab8a` / `pr-107-merge` | **Merged** to `main` | `/created/` view Live readonly, Protect setup memory chip, P1-RESTORE QA |
| **#108** | `cursor/cloud-agent-1780082490008-1q2uv` | Merged — P0-6/P0-7 + PWA | Consolidated onto `main` |
| **main** | `main` | Safari steps 1–21 shipped | Source of truth |

Update this table when new PRs open.

---

## Open engineering (not claimed)

| Priority | Item | Owner type | Command / proof |
|----------|------|------------|-----------------|
| P0b-1 step 2 sign-off | Card disabled since visit — **prod WebKit** re-verify on humanity.llc after deploy | Human QA | Desk gate: `npm run card-disabled-since-visit:desk-gate` · manual **P1-P0b-1** · sign-off: `card-disabled-since-visit:sign-off` |
| H-12 human § A–C | ~~Printed QR camera QA on ≥3 phones~~ **Passed 2026-05-30** | Human QA | Sign-off: `live-control:printed-qa:sign-off -- --pass --apply` |
| P3-1 / P3-2 | WebAuthn / optional encrypted persistence | Architecture | Not scheduled |
| **Smooth mode Phase 0–1** | UX + quiet defaults on same bootstrap | **Phase 0 complete 3/3** · Phase 1 **deferred** — Nord cold boot → boot graph | [`DEVICE_SMOOTH_MODE_PHASE0_GATE.md`](DEVICE_SMOOTH_MODE_PHASE0_GATE.md) · do not start `device-shell-tier.mjs` |
| **S3** | In-app hub QR scanner (PWA vouch from print) | **Shipped** | [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md) · `npm run e2e:steward-scan-handoff` (CI) · **P1-PWA-V** prod WebKit |

---

## Regression commands (run before closing a PR)

### Ownership restore + Safari keys (shell / created)

```bash
npm run worker:test -- worker/tests/created-view-live-readonly-core.test.ts worker/tests/created-view-mode-core.test.ts worker/tests/created-live-setup-memory.test.ts worker/tests/device-wallet-summary-core.test.ts
npm run e2e:key-loss-sad-path
npm run e2e:safari-keys-persistence
npm run e2e:scan-page-dot
```

### H-12 live-control

```bash
npm run worker:test -- worker/tests/live-control-printed-qa-print-prep.test.ts worker/tests/scan.test.ts
npm run e2e:live-control-loop
```

### Device shell (if touching status graph)

```bash
npm run worker:test -- worker/tests/device-status-shell-modules.test.ts
npm run worker:test:shell-boot
npm run e2e -- e2e/device-status-dot.spec.ts e2e/device-inbox.spec.ts
```

---

## File ownership hints (avoid edit collisions)

| Area | Likely owner stream | Files |
|------|---------------------|-------|
| View-only `/created/` | Ownership restore | `created-view-mode.mjs`, `created-view-live-readonly*.mjs`, `site/created/index.html` |
| Hub restore / import | Ownership restore · steward handoff | `device-hub-import.mjs`, `device-hub-import-recovery.mjs`, `device-hub-open-scan.mjs`, `device-hub-qr-scanner.mjs`, `device-hub-stranger-empty*` |
| Wallet summary / corrupt | Safari P3-3 / P1-4 | `device-wallet-summary-core.mjs`, `device-wallet-parse-core.mjs` |
| Scan quiet rehydrate | Safari P0-1 | `scan-tab-keys.mjs`, `worker/src/resolver/scan-html.ts` |
| Live proof UX | H-12 | `scan-live-control*`, `e2e/live-control-loop.spec.ts`, `worker/scripts/live-control-printed-qa-*` |

---

## Changelog (coordination log)

| Date | Event |
|------|--------|
| 2026-06-02 | **Smooth mode Phase 0 lab 3/3** — iPhone SE class + Android Go pass; Nord cold hub only outlier · Phase 1 still deferred · [`DEVICE_SMOOTH_MODE_PHASE0_GATE.md`](DEVICE_SMOOTH_MODE_PHASE0_GATE.md) |
| 2026-06-02 | **Smooth mode Phase 0 lab matrix** — rows 2–3 pending (iPhone SE + Android Go); automated preflight + desk E2E proxy recorded · [`DEVICE_SMOOTH_MODE_PHASE0_GATE.md`](DEVICE_SMOOTH_MODE_PHASE0_GATE.md) |
| 2026-06-02 | **City game Phase C preflight** — `verify:city-game` pass; install QA, comprehension, and custody runbooks split engineering vs human gates · [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) |
| 2026-06-02 | **Smooth mode Phase 0 doc bundle** — gate doc, P0-SMOOTH QA matrix, Nord N200 follow-up pass (7-card scroll, PWA standalone); Phase 1 **deferred** · [`DEVICE_SMOOTH_MODE_PHASE0_GATE.md`](DEVICE_SMOOTH_MODE_PHASE0_GATE.md) |
| 2026-06-01 | **Smooth mode Phase 0 lab row 1** — OnePlus Nord N200 5G (4 GB, Android 12): cold hub jumpy, steady-state pass @ 4 cards; Phase 1 **deferred** · [`DEVICE_SMOOTH_MODE_PHASE0_GATE.md`](DEVICE_SMOOTH_MODE_PHASE0_GATE.md) |
| 2026-06-01 | **Smooth mode Phase 0** — shell transfer baseline script, snapshot fixture, P0-SMOOTH QA matrix, gate doc · `npm run device-smooth:phase0` |
| 2026-05-30 | **Shell page load flash RC-11** — since-visit gate waits for wallet poll after health ok · [`SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md`](SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md) · `npm run worker:test:card-disabled-since-visit` |
| 2026-05-30 | **Shell page load flash RC-10** — shared quiet rehydrate bootstrap; `/created/` + `/wallet/` await before session read · shell v76 · [`SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md`](SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md) |
| 2026-05-30 | **Shell page load flash RC-9** — defer /created/ human-trust + steward queue until resolver status poll · `created-verification-boot-core.mjs` |
| 2026-05-30 | **Shell page load flash RC-8** — scan arrive SSR fast path · `npm run worker:test:scan-live-check-arrive` · `6f75da62` |
| 2026-05-30 | **Steward scan handoff CI** — `e2e:steward-scan-handoff` in `test-site.yml` (P1-PWA-V desk) · [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md) |
| 2026-05-30 | **Shell page load flash RC-7** — defer hub innerHTML until `data-boot=ready`; `hc-device-boot-ready` triggers first hub/glance render · [`SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md`](SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md) · `npm run worker:test:shell-boot` |
| 2026-05-30 | **Shell page load flash RC-5–RC-6** — wallet summary reconcile on first load; cross-tab chrome suppressed until `data-boot=ready` · [`SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md`](SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md) · `npm run worker:test:shell-boot` · `8747c2a9` |
| 2026-05-30 | **Doc policy layer** — `SYSTEM_INVARIANTS.md`, `DOC_MAINTENANCE.md`, `HUB_CARD_SAFARI_RELIABILITY.md`, `SAFARI_KEYS_CUSTODY.md`; redirect stubs at archived investigation paths · `72ae7354` |
| 2026-05-30 | **Archive closed investigations** — 17 `*_INVESTIGATION.md` files → [`archive/`](archive/) (+ Safari keys wipe follow-up `8402762e`) · [`archive/README.md`](archive/README.md) · `0cf44eb1` |
| 2026-05-30 | **Shell page load flash RC-1–RC-4** — `data-boot` gate, dot boot deferral, `/created/` workspace race fix, hub **checking** chips until resolver confirms · [`SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md`](SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md) · `8851f47e` |
| 2026-05-30 | **PWA Phase 10 CI** — `pwa-browser-tab-shortcuts` in `worker:test:pwa-install`; `e2e:device-resolver-sync` in `test-site.yml` (P1-1) · [`PWA_INSTALL.md`](PWA_INSTALL.md) · `7f2e9a16` |
| 2026-05-30 | **Wallet pinned scans dark mode** — reporter surface is **`/wallet/`**, not hub sheet; `6f904c1f` `.device-hub` selector gap + `.wallet-add-details` `#fafafa` · [`HUB_DARK_MODE_WHITE_DROPDOWN_INVESTIGATION.md`](HUB_DARK_MODE_WHITE_DROPDOWN_INVESTIGATION.md) |
| 2026-05-30 | **Steward handoff fallback E2E (S1/S5/S6)** — `e2e/steward-scan-handoff-fallback.spec.ts` · P1-PWA-V desk steps 4–7 · gate in `steward-scan-handoff:verify` |
| 2026-05-30 | **Hub in-app QR scanner E2E (S3)** — `e2e/hub-in-app-qr-scanner.spec.ts` · `npm run e2e:hub-in-app-qr-scanner` · gate in `steward-scan-handoff:verify` |
| 2026-05-30 | **Steward dual-QR setup E2E** — `#setup-qr` steward preview · `e2e/steward-dual-qr-created.spec.ts` |
| 2026-05-30 | **Investigation closed** — `steward-scan-handoff:verify` gate · [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md) · [`archive/STEWARD_HANDOFF_QR_NOT_DISPLAYING_INVESTIGATION.md`](archive/STEWARD_HANDOFF_QR_NOT_DISPLAYING_INVESTIGATION.md) |
| 2026-05-30 | **Steward handoff QR P2 E2E** — `e2e/steward-dual-qr-created.spec.ts` · `npm run e2e:steward-dual-qr` |
| 2026-05-30 | **Steward handoff QR P2 RC-2** — Print & share discovery + Full-size QR CTA · [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md) § Incident history |
| 2026-05-30 | **Steward handoff QR RC-1 + P1** — encode guard unified (`qr-encode-url-core.mjs`); `created.mjs?v=70` · [`archive/STEWARD_HANDOFF_QR_NOT_DISPLAYING_INVESTIGATION.md`](archive/STEWARD_HANDOFF_QR_NOT_DISPLAYING_INVESTIGATION.md) |
| 2026-05-30 | **Steward handoff QR not displaying** — RC-1 confirmed (`qr-branding` vs `qr-render` guard split) · [`archive/STEWARD_HANDOFF_QR_NOT_DISPLAYING_INVESTIGATION.md`](archive/STEWARD_HANDOFF_QR_NOT_DISPLAYING_INVESTIGATION.md) |
| 2026-05-30 | **Steward scan handoff S1–S3** — canonical doc + hub QR scanner + clipboard handoff · [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md) |
| 2026-05-30 | **PWA camera handoff** — hub recovery import + Open scan link + vouch Safari explainer |
| 2026-05-30 | **H-12 passed** — printed QR camera QA (multi-device); M7 Step 2 printed QA closed |
| 2026-05-30 | Create flow convergence — emphasis nudge UX + E2E regression (`e2e/create-flow-convergence.spec.ts`) |
| 2026-05-30 | Hub card disappeared Safari — **P2-RC-MON E2E** + CI verify gate · [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md) |
| 2026-05-30 | P0b-1 — **desk gate + sign-off scripts** for prod WebKit R10 re-verify |
| 2026-05-30 | Hub card disappeared Safari — **closed monitoring only** + `hub-card-disappeared:verify` + hub debug wallet snapshot · [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md) |
| 2026-05-30 | Hub card disappeared Safari — **RC-3 slice 2** setup Done → PWA install handoff · [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md) |
| 2026-05-30 | Hub card disappeared Safari — **RC-15** wallet summary integrity heartbeat on hub open · [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md) |
| 2026-05-29 | Hub card disappeared Safari — **RC-14** hub search false-empty fix (stranger transition clear + no-match copy) · [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md) |
| 2026-05-29 | Hub card disappeared Safari — **RC-3** setup iOS custody + Home Screen notices on Protect/Done · [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md) |
| 2026-05-29 | Hub card disappeared Safari — **RC-6** private browsing gate shipped (`private-browsing-detect-core`, create + save block) · [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md) |
| 2026-05-29 | Hub card disappeared Safari — **RC-4** setup wallet save gate shipped (`canCompleteSetupWizard`, `markSetupDone` guard, done-step confirmation) · [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md) |
| 2026-05-29 | Hub card disappeared Safari — **RC-2** persist-denied notice shipped (`safari-storage-persist-denied-notice*`, `worker:test:safari-persist-denied-notice`, **P2-RC2** QA) · [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md) |
| 2026-05-29 | Hub card disappeared Safari catalog — [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md) · [`archive/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md`](archive/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md); **RC-1** read-back gate |
| 2026-05-29 | Safari rollout steps **18–21** shipped on `main` — R9 scan-dot E2E, P0-1 runtime WebKit, P0b-1 WebKit desk proxy, P2-3b scan actor band |
| 2026-05-29 | **#107** / `pr-107-merge` merged — Phase 3 readonly QR tasks on Live tab; K1 E2E aligned |
| 2026-05-29 | **#108** merge: P0-6/P0-7 + PWA standalone track |
| 2026-05-29 | Safari rollout **step 17** (P3-3 hub summary guard) shipped on `main` (`e9961c29`) |
| 2026-05-29 | Safari **P2-3** WebKit E2E shipped (`01c2e8b1`) |

---

## Agent handoff checklist

1. Read [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) + this file + the stream's canonical doc.
2. `git fetch` and check **Active branches** — do not re-implement open PR scope.
3. Run the **Regression commands** for your stream before push.
4. Append one line to **Changelog** when you merge or ship.
5. Do **not** add new investigation docs — update invariants or canonical spec ([`DOC_MAINTENANCE.md`](DOC_MAINTENANCE.md)).
