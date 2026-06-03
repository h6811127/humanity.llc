# Product workstream coordination

**Purpose:** Single reference for parallel agents and humans — active work, regression gates, file ownership.  
**Also read:** [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) (rules that must stay true) · [`DOC_MAINTENANCE.md`](DOC_MAINTENANCE.md) (doc policy)

**Last updated:** 2026-06-03

---

## Workstreams at a glance

| Stream | Canonical doc | Engineering tracker | Primary surfaces |
|--------|---------------|---------------------|------------------|
| **Steward scan handoff / PWA vouch** | [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md) | **S1–S7 shipped** · **`steward-scan-handoff:verify`** | § Incident history (dual-QR RC-1) |
| **Hub card Safari reliability** | [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md) | **Closed — monitoring** · **`hub-card-disappeared:verify`** | RC-1–RC-16 shipped |
| **Shell page load flash** | [`SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md`](SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md) | **RC-1–RC-17 shipped** · **RC-18 in progress** (landing hub pre-render v83) · **`worker:test:shell-boot`** · **`device-smooth:phase0`** | Nord N200 cold S1 re-verify after deploy |
| **Safari keys / ITP** | [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) | P0–P2 **shipped** (steps 1–22) | `device-quiet-tab-rehydrate*`, `scan-tab-keys`, `safari-itp-storage-notice*`, `safari-storage-persist-denied-notice*` |
| **Ownership restore UX** | [`OWNERSHIP_RESTORE_UX_PLAN.md`](OWNERSHIP_RESTORE_UX_PLAN.md) | Phases 1–4 + Safari cross-refs | `/created/` view mode, hub import, `device-ownership-*` |
| **H-12 printed live-control QA** | [`M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md`](M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md) | H-09–H-13 · sad-path S10–S12 | Scan live proof, `e2e/live-control-loop.spec.ts`, operator scripts |
| **Cedar Rapids city game** | [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) § Feature page traceability · [`CITY_GAME_AUTONOMOUS_V1.md`](CITY_GAME_AUTONOMOUS_V1.md) | Phase C human gates open · **Phase D surfaces ready** · footprint **S1 15 → S3 50** · **Phase E self-serve setup** (post-pilot) | Install QA, GT comprehension, custody · launch `--apply` after gates |
| **Commercial + revenue (multi-agent)** | **This file § [Multi-agent program](#multi-agent-program-product--revenue--cedar-rapids)** · [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) · [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md) | **WS-DOC / WS-REV / WS-CR / WS-E** — metering shipped · Stripe + `/created/` UI open | Steward session, entitlements, game season caps, checkout |
| **Smooth mode (low-end mobile)** | [`DEVICE_LITE_MOBILE_PLAN.md`](DEVICE_LITE_MOBILE_PLAN.md) | **Phase 0 lab 3/3 ☑** · Phase 1 **deferred** (Nord cold boot → boot graph) · [`DEVICE_SMOOTH_MODE_PHASE0_GATE.md`](DEVICE_SMOOTH_MODE_PHASE0_GATE.md) | Boot graph investigation for Nord cold open |

---

## Multi-agent program: Product + revenue + Cedar Rapids

**Purpose:** One **dedicated agent per workstream** below. Shippable product today = **printable QR live objects** (cards, scan, live proof, child objects). **Revenue gap** = paid plans not wired to checkout/UI. **Scale gap** = Phase E browser setup (post-pilot). This is **not an MVP cut** — server enforcement and entitlements already exist; remaining work is **truth in docs**, **money path**, **pilot launch**, then **self-serve**.

### Strategic frame

| SKU (`plan_id`) | Sells | Audience |
|-----------------|-------|----------|
| **`hosted_steward_v1`** | Higher live-proof / wallet poll budgets (+ push later) | Stewards running many live objects |
| **`hosted_game_season_v1`** | Higher `game.season.*` caps (nodes, contribute, snapshot, game-update) | City-game organizers |
| **`reference_free`** | Default on reference operator — cards, scan, vouch, pilot-scale game | Everyone |

**Rules:** Stranger scan/play stays free. Caps bind **organizer resolver load**, not identity or public map read (fair-use 429 only). See [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) · Q9 in [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md).

### Critical path (cross-stream)

```text
WS-DOC (normative verbs + status headers)
    ↓
WS-REV (Stripe + /created/ entitlements UI + prod 0031)
    ↓ parallel
WS-CR (Cedar Rapids launch checklist — can use reference_free caps)
    ↓
WS-E (Phase E /created/ setup — needs WS-REV entitlements UI)
```

**Revenue is the gating commercial layer** for “full product” positioning. Cedar Rapids proves the game; live QR objects prove the steward SKU.

### Agent index (assign exactly one agent per ID)

| ID | Workstream | Agent mission | Blocks |
|----|------------|---------------|--------|
| **WS-DOC** | Documentation truth | Align canon with **implemented** verbs, APIs, local-dev traps | Nothing — start first |
| **WS-REV** | Revenue & metering UX | Stripe checkout + plan assignment + `/created/` shows caps/usage | WS-DOC for API vocabulary; M4 pricing sign-off for copy/prices |
| **WS-CR** | Cedar Rapids pilot launch | Phase D checklist, human QA, deploy, `launch-surfaces` | WS-DOC for runbook accuracy; deploy ops (Pages token) |
| **WS-E** | Phase E self-serve | Browser season setup on `/created/` (no terminal for new seasons) | WS-REV entitlements UI; WS-CR pilot signed (E1 gate) |

**Do not duplicate:** city-game local dev bundle on branch `#109` / uncommitted WIP (`city-game:dev`, `launch-preflight`, comprehension kit) — coordinate in **Active branches** before overlapping scripts.

### Normative verbs (all agents — implement in WS-DOC, consume elsewhere)

| Verb / artifact | HTTP / command | Notes |
|-----------------|----------------|-------|
| Steward link proof | Signed `steward_account_link_v1` | Owner key; not `acc_…` from checkout URL |
| Mint session | `POST /.well-known/hc/v1/steward/session` | Returns opaque `token` → `Authorization: Bearer` |
| Read entitlements | `GET /.well-known/hc/v1/steward/entitlements` | Optional `?season_id=`; optional auto `game_season` when one linked season |
| Game season block | JSON field `game_season` | Limits + UTC-day counters |
| Meter events (server) | `game.contribute`, `game.snapshot.get`, `game.game_update` | Uncached snapshot builds count; **304 does not** debit snapshot quota |
| Local session helper | `npm run hosted:steward-session-local` | Curl/debug only; reads `worker/.local/city-game-seed.json` keys |
| Align season JSON to seed | `npm run city-game:sync-season-root` | Updates **disk only** — **restart `worker:dev`** after |
| Local seed | `npm run city-game:seed-local` | `--write-season` only on full seed; use **sync** when field already set |

**Local dev trap (403 “season not linked”):** Three sources of truth — `city-game-seed.json`, `site/data/city-game-*.json`, **worker bundle** (`season-registry.generated.ts` imports JSON at load). Sync fixes disk; worker must reload. See [`CITY_GAME_LOCAL_DEV.md`](CITY_GAME_LOCAL_DEV.md).

---

### WS-DOC — Documentation truth

| | |
|--|--|
| **Canonical docs to edit** | [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) · [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md) · [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) § city game + steward · [`CITY_GAME_LOCAL_DEV.md`](CITY_GAME_LOCAL_DEV.md) · [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) Q9 · this file |
| **In scope** | Change doc **Status** headers from “planning only / no implementation” where code shipped; **Implementation status** tables; verb glossary (above); three-sources-of-truth; steward 403 troubleshooting |
| **Out of scope** | New `*_INVESTIGATION.md` files; Stripe UI code; Phase E UI build |
| **Exit criteria** | Every API in HOSTED_TIER § HTTP API marked **implemented / partial / planned**; INVARIANTS lists metering + season-link gate; Q9 says metering **done**, checkout **open** |
| **Status** | **☑ 2026-06-03** — exit criteria met; hand off to WS-REV |
| **Regression** | `npm run build` (site) · spot-check links from [`AGENTS.md`](../AGENTS.md) |
| **Do not touch** | `worker/src/**` except comments pointing at docs (prefer zero code) |

---

### WS-REV — Revenue & metering UX

| | |
|--|--|
| **Canonical docs** | [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) · [`HOSTED_TIER_PRICING_AND_SLA.md`](HOSTED_TIER_PRICING_AND_SLA.md) (M4) · [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md) |
| **Already shipped (do not re-build)** | Migration `0031` · `season-entitlements*.ts` · `season-quota.ts` · enforce on contribute/snapshot/game-update/node cap · `GET /steward/entitlements?season_id=` · `billing-lifecycle` `metadata.plan_id` for `hosted_game_season_v1` · `site/js/city-game-season-entitlements-core.mjs` (pure policy) |
| **In scope** | Stripe products/prices; checkout return + webhook → `steward_accounts.plan_id`; upgrade entry on `/created/` (or `/hosting/`); wire `device-steward-entitlements.mjs` + **season entitlements core** into Live UI (caps, usage, at-limit copy); prod deploy: `HOSTED_STEWARD_ENABLED=1`, migrate **0012 + 0031** |
| **Out of scope** | Phase E node registration UI (WS-E); Cedar Rapids marketing HTML bulk (WS-CR); new meter event types without M4 |
| **Milestones** | **R1–R4 ☑** · **R5** `hosted:rev:rollout` production playbook + post-deploy WS-REV API gate · close with `--paid` smoke after Stripe test checkout |
| **Regression** | `npm run worker:test -- worker/tests/city-game-season-entitlements*.test.ts worker/tests/steward-hosted.test.ts worker/tests/billing-lifecycle.test.ts` · `npm run verify:city-game` |
| **File ownership** | `worker/src/steward/**` · `worker/src/city-game/season-entitlements*.ts` · `worker/src/steward/billing-lifecycle.ts` · `site/js/device-steward-entitlements*.mjs` · `site/js/city-game-season-entitlements-core.mjs` · `site/created/**` (upgrade panel only — coordinate with ownership restore if touching view mode) |
| **Status** | **R2 complete** — `/created/` Operator plan panel + checkout buttons; entitlements fetch sends `?season_id=` for season-root cards (index `season_root_profile_id`). **Next (human/ops):** Stripe Dashboard prices + `hosted:rev:prod-smoke -- --paid` after test checkout |
| **Blocked by** | M4 pricing sign-off ([`HOSTED_TIER_PRICING_AND_SLA.md`](HOSTED_TIER_PRICING_AND_SLA.md)) for public USD copy |

---

### WS-CR — Cedar Rapids pilot launch (Phase D)

| | |
|--|--|
| **Canonical docs** | [`CITY_GAME_LAUNCH_CHECKLIST.md`](CITY_GAME_LAUNCH_CHECKLIST.md) · [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md) · [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) · [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) Phase D |
| **In scope** | `npm run city-game:launch-preflight` · human gates P1–P2, O1–O3 · `city-game:launch-surfaces --apply` + `npm run build` + pages deploy · worker deploy `CITY_GAME_ENABLED=1` · production season root custody (not local `CEen…` in committed JSON unless intentional) · map board gates B13–B14 if marketing promises live board |
| **Out of scope** | Stripe (WS-REV); Phase E browser mint (WS-E); rewriting metering |
| **Milestones** | **C1 ☑** · **C2** comprehension (human ≥5) · **C3** `city-game:install-qa-preflight` + physical sign-off · **C4** `city-game:smoke-production` · **C5** checklist signed |
| **Status** | **C3/C4 active** — install QA + prod scan smoke tooling shipped; human gates + `CITY_GAME_ENABLED` deploy |
| **Regression** | `npm run verify:city-game` · `npm run city-game:verify-season -- --require-launch` · `npm run city-game:launch-surfaces -- --check` |
| **File ownership** | `site/play/cedar-rapids/**` · `site/what-can-a-qr-do/**` (launch surfaces) · `site/data/city-game-cr-season-01.json` (production values only with ops sign-off) · `worker/scripts/city-game-launch-*` |
| **Parallel with WS-REV** | Pilot can run on **`reference_free`** game caps (15 nodes); paid tier is for **next** organizers |

---

### WS-E — Phase E self-serve game setup

| | |
|--|--|
| **Canonical docs** | [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) § Phase E · [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) · [`CITY_GAME_OPERATOR_CUSTODY.md`](CITY_GAME_OPERATOR_CUSTODY.md) (add § Self-serve when shipping) |
| **In scope** | `/created/` **Add game node** (parity with status plate) · hub rows for `game_node` · season metadata editor · rules draft + publish · bulk template import · `e2e/city-game-self-serve-setup.spec.ts` (name TBD) · deprecate terminal mint for **new** self-serve seasons (keep scripts for CI/fixtures) |
| **Out of scope** | Stripe checkout flow (WS-REV); Cedar Rapids launch apply (WS-CR); scan analytics; delegated child keys |
| **Gates (do not market “create your own game” until)** | **E1** Phase D signed · **E2** loader ≥2 seasons (**met**) · **E3** full 15-node season in browser on staging · **E4** comprehension on self-serve rules · **E5** INVARIANTS updated (**R-16**) |
| **Regression** | `npm run verify:city-game` · new E2E in WS-E milestone · `npm run worker:test -- worker/tests/city-game-season-loader.test.ts` |
| **File ownership** | `site/js/created-*game*` (new modules TBD) · `site/created/index.html` · `worker/src/city-game/season-loader.ts` (registerSeasonConfig only if needed) · **Do not** fork parallel mint API — use `POST …/objects` + `issue-qr` |
| **Blocked by** | WS-REV **`game_season` UI** on `/created/`; WS-CR **E1** |

---

### Multi-agent regression block (lead / integrator)

Before any cross-stream merge to `main`:

```bash
npm run verify:city-game
npm run worker:test -- worker/tests/steward-hosted.test.ts worker/tests/billing-lifecycle.test.ts worker/tests/city-game-season-entitlements-api.test.ts
npm run worker:test:hosted-rev
npm run build
```

**WS-REV production (R3, after deploy + D1 `0012`/`0013`/`0031`):**

```bash
npm run hosted:rev:r3
# After Stripe test checkout + session mint:
STEWARD_SESSION_TOKEN=… EXPECT_PLAN_ID=hosted_steward_v1 npm run hosted:rev:prod-smoke -- --paid
```

**WS-REV R4 (governance):**

```bash
npm run hosted:rev:m4:preflight
npm run hosted:rev:m4-sign-off -- --pass --apply
```

**WS-REV R5 (production rollout — after R4):**

```bash
npm run hosted:rev:rollout              # playbook
npm run hosted:rev:step1-remote         # D1 0012/0013/0031 on production + API verify
npm run hosted:rev:pages                # build + Pages deploy + /created/ panel smoke
npm run hosted:rev:r5                   # preflight + API smoke
npm run hosted:rev:rollout -- --post-deploy   # step 4b verify + revenue API
```

WS-REV or WS-E touching `/created/` shell: also run **Ownership restore** block (§ Regression commands above).

---

## Active branches / PRs (check before coding)

| ID | Branch | Status | Do not duplicate |
|----|--------|--------|------------------|
| **#107** | `cursor/ownership-restore-phase3-ab8a` / `pr-107-merge` | **Merged** to `main` | `/created/` view Live readonly, Protect setup memory chip, P1-RESTORE QA |
| **#108** | `cursor/cloud-agent-1780082490008-1q2uv` | Merged — P0-6/P0-7 + PWA | Consolidated onto `main` |
| **#109** | `cursor/city-game-local-dev` (local WIP) | **In progress** — uncommitted on disk | `city-game:dev`, `local-env`, `comprehension-kit`, `launch-preflight`, `sync-season-root`, `hosted:steward-session-local` · **do not duplicate** |
| **WS-CR** | Assign per [Multi-agent program](#multi-agent-program-product--revenue--cedar-rapids) | **C3/C4** — `install-qa-preflight`, `smoke-production`; C2 human + custody drift open | See stream file ownership; avoid `#109` overlap without merge plan |
| **main** | `main` | Safari steps 1–21 shipped · RC-18 v83 | Source of truth |

Update this table when new PRs open.

---

## Open engineering (not claimed)

| Priority | Item | Owner type | Command / proof |
|----------|------|------------|-----------------|
| P0b-1 prod WebKit | Card disabled since visit — **re-verify on humanity.llc** after Pages deploy | Human QA | Desk ☑ `card-disabled-since-visit:desk-gate` (2026-06-02) · manual **P1-P0b-1** · `card-disabled-since-visit:sign-off -- --pass --apply` |
| P1-PWA-V prod WebKit | Vouch from printed QR — **PWA + Camera on humanity.llc** | Human QA | Desk ☑ `steward-scan-handoff:verify` (2026-06-02) · manual **P1-PWA-V** · changelog line in this doc |
| H-12 human § A–C | ~~Printed QR camera QA on ≥3 phones~~ **Passed 2026-05-30** | Human QA | Sign-off: `live-control:printed-qa:sign-off -- --pass --apply` |
| P3-1 / P3-2 | WebAuthn / optional encrypted persistence | Architecture | Not scheduled |
| **Smooth mode Phase 0–1** | UX + quiet defaults on same bootstrap | **Phase 0 complete 3/3** · Phase 1 **deferred** — **RC-18** Nord cold hub | [`DEVICE_SMOOTH_MODE_PHASE0_GATE.md`](DEVICE_SMOOTH_MODE_PHASE0_GATE.md) · [`SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md`](SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md) § RC-18 |
| **RC-18 boot graph** | Nord cold first hub open (Smooth Phase 0 outlier) | **Desk fix shipped v83** · Nord S1 re-verify after deploy | § RC-18 · `device-smooth:phase0 -- --e2e` |
| **Pages deploy** | Production updates blocked | Ops | Fix `CLOUDFLARE_API_TOKEN` (Pages Edit) on Deploy Pages workflow |
| **S3** | In-app hub QR scanner (PWA vouch from print) | **Shipped** · desk ☑ 2026-06-02 | [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md) · **P1-PWA-V** prod WebKit pending |

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
| Steward session + entitlements API | WS-REV | `worker/src/resolver/steward-hosted.ts`, `worker/src/steward/**`, `site/js/device-steward-session*.mjs`, `site/js/device-steward-entitlements*.mjs` |
| Game season metering | WS-REV | `worker/src/city-game/season-entitlements*.ts`, `worker/src/city-game/season-quota.ts`, `worker/migrations/0031_*`, `site/js/city-game-season-entitlements-core.mjs` |
| Cedar Rapids launch surfaces | WS-CR | `worker/scripts/city-game-launch-surfaces*.mjs`, `site/play/cedar-rapids/`, `site/data/city-game-cr-season-01.json` |
| Phase E `/created/` game setup | WS-E | `site/created/index.html`, `site/js/created-*.mjs` (new game modules), `site/play/*/index.html` generator paths |
| Doc status + verbs | WS-DOC | `docs/HOSTED_TIER_*.md`, `docs/PAID_TIER_*.md`, `docs/CITY_GAME_LOCAL_DEV.md`, `docs/SYSTEM_INVARIANTS.md` |

---

## Changelog (coordination log)

| Date | Event |
|------|--------|
| 2026-06-03 | **WS-REV R5** — `hosted:rev:pages` deployed `/created/` Operator plan panel; production HTML smoke green |
| 2026-06-03 | **WS-REV R5** — rollout tooling + prod `0031` + worker deploy; API smoke green · `hosted:rev:step1-remote` · `hosted:rev:deploy` |
| 2026-06-03 | **WS-CR C3/C4** — `city-game:install-qa-preflight` + sign-off; `city-game:smoke-production` + preflight |
| 2026-06-03 | **WS-CR C2** — comprehension preflight uses production-seed custody; kit regen · human ≥5 testers next |
| 2026-06-03 | **WS-CR C1** — `verify:city-game --require-launch` green · season root + window dates in CR JSON · launch-preflight engineering gates (B1/B2/B14) pass |
| 2026-06-03 | **WS-REV R2** — entitlements `?season_id=` from seasons index + `season_root_profile_id` on index rows; `steward-entitlements-season-id-core` tests |
| 2026-06-03 | **WS-DOC complete** — HOSTED_TIER implementation status + verbs; PAID_TIER revenue SKUs; INVARIANTS hosted + game metering; CITY_GAME_LOCAL_DEV three sources; Q9 metering shipped |
| 2026-06-03 | **WS-REV R4** — M4 governance sign-off recorded (`hosted:rev:m4-sign-off`); G8 Stripe + G11–G13; Legal G7 still pending |
| 2026-06-03 | **WS-REV R3** — `hosted:rev:prod-smoke` API + paid-account smoke; rollout step1 includes `0031` · `npm run hosted:rev:r3` |
| 2026-06-03 | **WS-REV R2** — `/created/` Live shows steward caps + `game_season` usage/at-limit + upgrade checkout CTAs · `npm run worker:test:created-hosted-entitlements` |
| 2026-06-03 | **WS-REV R1** — `POST …/steward/billing/checkout` Stripe subscription session + `plan_id` metadata for `hosted_steward_v1` / `hosted_game_season_v1` · `npm run worker:test:steward-checkout` |
| 2026-06-03 | **Multi-agent program** — WS-DOC / WS-REV / WS-CR / WS-E charters for product + revenue + Cedar Rapids + Phase E · § [Multi-agent program](#multi-agent-program-product--revenue--cedar-rapids) |
| 2026-06-03 | **Game season metering shipped (local)** — `0031`, entitlements API `?season_id=`, enforce quotas · revenue UI + Stripe still WS-REV |
| 2026-06-02 | **Parallel WIP** — city-game local dev bundle (`city-game:dev`, comprehension kit, launch preflight) in flight on separate agent — do not duplicate |
| 2026-06-02 | **RC-18 test hook** — `shouldPrepareShellHubBootReveal` in hub-boot-core; Nord verify still pending |
| 2026-06-02 | **City game E1 local proof** — `city-game:proof-local` full spine pass; fragment idempotent fix + spine reset in proof gate |
| 2026-06-02 | **RC-18 landing hub pre-render** — `prepareShellHubBootReveal` on `/` before boot ready; shell v83 · Nord verify pending |
| 2026-06-02 | **City game Phase E** — self-serve game network setup on `/created/` (post-pilot); terminal mint pilot-only · [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) § Phase E |
| 2026-06-02 | **City game risks + build gates** — R-01–R-18, B1–B11 in implementation brief; `SYSTEM_INVARIANTS` § Cedar Rapids city game |
| 2026-06-02 | **City game feature traceability** — full CR-* / PWM-* catalog in implementation brief; rollout S1(15) → S3(50) |
| 2026-06-02 | **City game Phase D surfaces** — `city-game:launch-surfaces` + `city-game:post-season` tooling; P3/P4 runbook in launch checklist · `--apply` blocked until human gates |
| 2026-06-02 | **P0b-1 desk preflight** — `card-disabled-since-visit:desk-gate` pass (85 Vitest + 4 WebKit E2E); prod WebKit **P1-P0b-1** re-verify pending after deploy |
| 2026-06-02 | **P1-PWA-V desk preflight** — `steward-scan-handoff:verify` pass (98 Vitest + 14 E2E); prod WebKit **P1-PWA-V** pending · [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md) |
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
2. Confirm your **workstream ID** (WS-DOC, WS-REV, WS-CR, or WS-E) — stay inside § [Multi-agent program](#multi-agent-program-product--revenue--cedar-rapids) **In scope** / **Out of scope**.
3. `git fetch` and check **Active branches** — do not re-implement open PR scope.
4. Run the **Regression commands** for your stream (and **Multi-agent regression block** if touching shared surfaces).
5. Append one line to **Changelog** when you merge or ship.
6. Do **not** add new investigation docs — update invariants or canonical spec ([`DOC_MAINTENANCE.md`](DOC_MAINTENANCE.md)).
