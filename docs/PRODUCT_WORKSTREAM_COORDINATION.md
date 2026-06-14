# Product workstream coordination

**Purpose:** Single reference for parallel agents and humans — active work, regression gates, file ownership.  
**Also read:** [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) (rules that must stay true) · [`DOC_MAINTENANCE.md`](DOC_MAINTENANCE.md) (doc policy)

**Last updated:** 2026-06-04

**Changelog (2026-06-04):** **Steward UX presentation target (step 20)** — canonical spec [`STEWARD_UX_PRESENTATION_TARGET.md`](STEWARD_UX_PRESENTATION_TARGET.md): **Q1 decided** (one root + dual skins + season-only fork), room switcher, client steward state model, presentation policy (add vs list), implementation slices, risks. Slice 1 shipped (add-hub filter). Next: room switcher (slice 2). Cross-links: [`PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md`](PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md) · [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) · [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) Phase E.

**Changelog (2026-06-04):** **Front-door strategy documented** — Option A landing doors + Option B create chooser + carrier split (shop vs BYOP) · [`PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md`](PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md) steps 10–15 · [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) steps 19–20 · invariants in [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md). **WS-QUALITY** owns presentation implementation (Q3); protocol unchanged.

**Changelog (2026-06-04):** **WS-LIVE opened** — umbrella MVP program: physical software objects + Cedar Rapids + [**five-layer evolving objects plan**](#ws-live--physical-software-objects--evolving-five-layer-stack) ([`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md)). Sub-tracks: **WS-QUALITY** (steward belt), **WS-CR** / **WS-SCALE** / **WS-SW** (field + network). **WS-NOTIF closed** (in-app) — **P0-N2 OS deferred**. **Desk belt** — `npm run verify:desk:fast` (CI) · `npm run verify:desk` (pre-merge).

**Changelog (2026-06-03):** **Engineering Phase 2** — summer program § [Engineering Phase 2](#engineering-phase-2--summer-2026-program) (**WS-SCALE**, **WS-SW**, **WS-CUSTODY** parallel with Phase 1 closeout). **WS-CUSTODY** — [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) + [`CUSTODY_PHASE0_RUNBOOK.md`](CUSTODY_PHASE0_RUNBOOK.md). **Summer footprint** — Cedar Rapids **40 at open → 60** · **Wake the city · Signal War** **SW-01–SW-15**. **Live object layer** — [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) five-layer map.

---

## Workstreams at a glance

| Stream | Canonical doc | Engineering tracker | Primary surfaces |
|--------|---------------|---------------------|------------------|
| **Live objects MVP (umbrella)** | [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) · § [WS-LIVE](#ws-live--physical-software-objects--evolving-five-layer-stack) | **WS-LIVE** — five-layer Orders **1–6** · PSO + Cedar Rapids field | `worker/src/live-object/**` · scan composition · child objects · city game on same resolver |
| **Steward scan handoff / PWA vouch** | [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md) | **S1–S7 shipped** · **`steward-scan-handoff:verify`** | § Incident history (dual-QR RC-1) |
| **Hub card Safari reliability** | [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md) | **Closed — monitoring** · **`hub-card-disappeared:verify`** | RC-1–RC-16 shipped |
| **Shell page load flash** | [`SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md`](SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md) | **RC-1–RC-17 shipped** · **RC-18 in progress** (landing hub pre-render v83) · **`worker:test:shell-boot`** · **`device-smooth:phase0`** | Nord N200 cold S1 re-verify after deploy |
| **Safari keys / ITP** | [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) | P0–P2 **shipped** (steps 1–22) | `device-quiet-tab-rehydrate*`, `scan-tab-keys`, `safari-itp-storage-notice*`, `safari-storage-persist-denied-notice*` |
| **Custody hybrid (easy + keys)** | [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) · [`CUSTODY_PHASE0_RUNBOOK.md`](CUSTODY_PHASE0_RUNBOOK.md) | **WS-CUSTODY C0 in progress** | Create setup UX, recovery copy, phase0 preflight |
| **Ownership restore UX** | [`OWNERSHIP_RESTORE_UX_PLAN.md`](OWNERSHIP_RESTORE_UX_PLAN.md) | Phases 1–4 + Safari cross-refs | `/created/` view mode, hub import, `device-ownership-*` |
| **H-12 printed live-control QA** | [`M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md`](M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md) | H-09–H-13 · sad-path S10–S12 | Scan live proof, `e2e/live-control-loop.spec.ts`, operator scripts |
| **Cedar Rapids city game** | [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) § Node scale · § Feature page traceability · § **Wake the city · Signal War** · [`CITY_GAME_AUTONOMOUS_V1.md`](CITY_GAME_AUTONOMOUS_V1.md) | Phase C human gates open · **Phase D surfaces ready** · **summer 40→60** (15-row JSON = scaffold) · **SW-*** Signal War rows · weekly GM cadence | Install QA at **~40 open**, comprehension, custody · extend season JSON + mint before field wave 1 |
| **Commercial + revenue (multi-agent)** | **This file § [Multi-agent program](#multi-agent-program-product--revenue--cedar-rapids)** · [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) · [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md) | **WS-DOC ☑** · **WS-REV / WS-CR / WS-E** — Phase 1 closeout · § [Phase 2](#engineering-phase-2--summer-2026-program) | Steward session, entitlements, game season caps, checkout |
| **Summer node scale (40→60)** | [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) § Node scale · [`CITY_GAME_NODE_INSTALL_MAP.md`](CITY_GAME_NODE_INSTALL_MAP.md) | **SC-1–SC-2b ☑ local** · **SC-3** prod seed · **SC-4–SC-5** · B7 physical open | Season JSON, mint waves, install QA at ~40 open |
| **Signal War (contest layer)** | [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) § Wake the city · Signal War · [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) | **WS-SW** — **SW-S1–S3** shipped · debrief/badge tail | `game-contribute`, snapshot, fog, faction totals |
| **Smooth mode (low-end mobile)** | [`DEVICE_LITE_MOBILE_PLAN.md`](DEVICE_LITE_MOBILE_PLAN.md) | **Phase 0 lab 3/3 ☑** · Phase 1 **deferred** (Nord cold boot → boot graph) · [`DEVICE_SMOOTH_MODE_PHASE0_GATE.md`](DEVICE_SMOOTH_MODE_PHASE0_GATE.md) | Boot graph investigation for Nord cold open |
| **Notifications v2 (tiered inbox)** | [`NOTIFICATION_SYSTEM_V2.md`](NOTIFICATION_SYSTEM_V2.md) | **WS-NOTIF closed** — N0–N5 ☑ · **P0-N2 OS deferred** · in-app N4 only | **No new notify engineering** — `notify:verify` guards only |
| **Core product loop (quality + UX)** | [`CORE_PRODUCT_LOOP.md`](CORE_PRODUCT_LOOP.md) | **WS-QUALITY** — WS-LIVE sub-track · Q0 ☑ · **Q2–Q3** | `npm run verify:desk` · P1-MOTO-* repair · L1–L8 |

---

## WS-LIVE — Physical software objects + evolving five-layer stack

**Workstream ID:** **WS-LIVE** (umbrella MVP program)  
**Canonical engineering map:** [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) — **evolving objects in five layers**, bottom-up; Orders **1–6** exit criteria in that doc § Recommended build sequence  
**Public category:** [`site/what-can-a-qr-do/physical-software-objects/`](../site/what-can-a-qr-do/physical-software-objects/) · Cedar Rapids [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) · design space [`QR_DESIGN_SPACE.md`](QR_DESIGN_SPACE.md)

**Mission:** Ship the integrated product — **physical software objects** as the foundation and **Cedar Rapids** as the network-layer proof on the **same resolver** — by completing the five-layer plan without forking parallel scan products.

> The QR is not the game. The QR is the **physical handle** for live public object state. City game nodes are Layer 5 deployments of the same primitive as door plates and lost-item relays.

**One-sentence model** ([`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md)):

> A **live object** is an HTTPS endpoint (usually reached via QR) that returns **current, revocable, signed public state** — composed from a root card, optional child object, streams, time policy, and optional network overlay.

### Five layers — evolve bottom-up (do not skip)

Higher layers depend on lower layers. Composition entry: `worker/src/resolver/scan-state.ts` → `buildScanViewModel()`.

| Layer | Responsibility | Primary modules | Build order |
|-------|----------------|-----------------|-------------|
| **L1 — Object graph** | Root → child → QR; types; custody | `child-objects.ts`, `live-object/custody.ts`, `created-child-object*` | Order **1** |
| **L2 — Verbs** | read · request · offer · contribute · archive | `scan-capabilities.ts`, `scan-live-control*`, `game-contribute.ts`, `lost-item-offer.ts` | Order **3** |
| **L3 — Streams + precedence** | Multi-signer public fields; care mutes game | `stream-policy.ts`, `object-streams.ts`, `compose-child-object-scan.ts` | Order **4** |
| **L4 — Time policy** | Schedules, expiry, dormancy, grace | `time-policy.ts`, `season-window.ts`, `/created/` editors | Order **4** |
| **L5 — Network graph** | Quorum, routes, season, Signal War | `network-graph.ts`, `season-config.ts`, `game-contribute*.ts` | Orders **2** + **5** |
| **L6 — Spec tail** (post-MVP defer) | Staleness, succession hints, delegation gates | `staleness-contract.ts`, `succession-spec.ts`, `delegation-spec.ts` | Order **6** |

```text
L1 Object graph  →  L2 Verbs  →  L3 Streams  →  L4 Time  →  L5 Network
     (printable endpoints)              (evolving state)      (city season)
```

**Evolving objects** (public combining-ideas / Cedar Rapids traceability **CR-E01–E03**): temporary 48h objects, rotating bulletins, weather-aware copy, steward revoke/pause when physical space changes — implemented via **L4 time policy** + **L3 care streams** + **L1 lifecycle**, not a separate product.

### WS-LIVE sub-tracks (assign one agent per ID)

| ID | Role under WS-LIVE | Mission | File ownership (typical) |
|----|-------------------|---------|--------------------------|
| **WS-QUALITY** | L1 steward path + belt | L1–L8 green; create/scan/revoke reliability on real devices | `site/create/**`, `site/created/**`, `device-hub*`, `device-status*` — **not** season JSON |
| **WS-CR** | Field launch (Order 2 ops) | C3–C5 · prod smoke · `launch-surfaces --apply` · install QA | `site/play/cedar-rapids/**`, `city-game-launch-*`, production season values |
| **WS-SCALE** | L5 footprint | SC-1–SC-5 · **40 open → ~60** · mint waves · B7 each wave | `site/data/city-game-cr-season-01.json`, mint scripts, `constants.ts` |
| **WS-SW** | L5 contest layer | SW-01–15 maintenance · comprehension when copy changes | `game-contribute*.ts`, `map-node-snapshot.ts`, `site/js/city-game-*` |

**Parallel — do not disturb:** **WS-REV** (Stripe), **WS-CUSTODY** (C0 comprehension), **WS-E** (self-serve after E1), shell-boot **RC-18**, **WS-NOTIF** (closed).

### Gating (revised)

| Rule | Detail |
|------|--------|
| **WS-QUALITY gates the steward path** | L1–L4, L6–L7 must stay green before marketing “create and manage live objects” broadly |
| **WS-LIVE game tracks proceed in parallel** | Work on `worker/src/city-game/**`, `site/data/city-game-*`, `site/play/**` when **`verify:city-game`** + **`verify:desk:fast`** stay green — not blocked by WS-QUALITY Q3 |
| **No cross-stream file fights** | Game agents do not touch `device-hub*.mjs` unless fixing a red **L*** row. Quality agents do not touch season JSON unless scan/revoke regression |
| **Layer discipline** | Do not ship Layer 5 marketing before Layer 1–4 composition is honest on scan (capabilities + time + streams) |

### WS-LIVE MVP exit criteria

Mark ☑ in [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) § Recommended build sequence when met.

| Gate | Proof | Owner |
|------|-------|-------|
| **LO-1** Order 1 pilot sign-off | Printed status plate + lost-item relay via **deploy wizard** (`?intent=deploy`) — [`STATUS_PLATE_PILOT.md`](STATUS_PLATE_PILOT.md), [`LOST_ITEM_RELAY_PILOT.md`](LOST_ITEM_RELAY_PILOT.md) · field kit: `npm run ws-live:lo1-kit` (Path A deploy · Path B legacy regression) | WS-QUALITY |
| **LO-2** Order 2 field launch | WS-CR **C5** signed · prod season mint · `city-game:smoke-production` | WS-CR |
| **LO-3** L5 opening footprint | **~40 nodes** installed · B7 at open · honest launch surfaces | WS-SCALE + WS-CR |
| **LO-4** Integrated stranger comprehension | Scan **game node** (contribute/read) + **non-game object** (status plate) — same primitive, &lt;30s trust read | WS-CR + WS-QUALITY |
| **LO-5** Public copy honesty | PSO + features pages reflect live vs research **after** LO-2 | WS-CR |

**Deferred post-MVP (Order 6 exposure):** mesh/cache `freshness.source`, public delegated child issue/list/revoke routes + `/created/` UI (G1–G5), `inherit` verb — keep delegation prep dormant until LO-1–LO-4 pass and product gates clear.

### WS-LIVE regression block

```bash
npm run verify:live:fast          # CI / daily — desk fast + live-object + city-game + LO-1 kit
npm run verify:live               # pre-merge — + scan/created/live-control e2e
npm run ws-live:preflight           # status report (LO-1–LO-5 engineering vs human)
npm run ws-live:preflight -- --strict
npm run ws-live:lo1-kit             # regenerate LO-1 field walk → site/dev/ws-live-lo1-comprehension.html
```

Pre-merge integrator: also run **`npm run verify:desk`** when touching steward shell or `/created/`.

**Composition ownership:** `worker/src/live-object/**`, `worker/src/resolver/scan-state.ts`, `scan-html.ts`, `scan-status.ts`, `worker/src/resolver/child-objects.ts` — coordinate in **Active branches**; one PR should not span live-object composition **and** hub wallet unless fixing a named red **L*** row.

---

## Multi-agent program: Product + revenue + Cedar Rapids

**Purpose:** One **dedicated agent per workstream** below. Shippable MVP = **[WS-LIVE](#ws-live--physical-software-objects--evolving-five-layer-stack)** — physical software objects (five-layer stack) **plus** Cedar Rapids on the same resolver. **Revenue gap** = paid plans not wired to checkout/UI. **Scale gap** = Phase E browser setup (post-pilot). This is **not an MVP cut** — server enforcement and entitlements already exist; remaining work is **layer exit criteria**, **field launch**, **money path**, then **self-serve**.

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
| **WS-CUSTODY** | Hybrid custody (easy + keys) | Phases C0–C4 per [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) | C0 metrics; optional before broad consumer launch |
| **WS-SCALE** | Summer 40→60 footprint | SC-1–SC-5 per § [Engineering Phase 2](#engineering-phase-2--summer-2026-program) | WS-CR C5; B7 at opening ~40 |
| **WS-SW** | Signal War mechanics | SW-S1–S3 · **SW-01–SW-15** | WS-SCALE relay registry; map B13–B15 if promised |
| **WS-LIVE** | Live objects MVP (umbrella) | Five-layer Orders **1–6** · **LO-1–LO-5** exit gates · PSO + Cedar Rapids | Sub-tracks below; [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) |
| **WS-QUALITY** | Core loop verify · fix · UX (WS-LIVE sub-track) | Q0 belt ☑ · Q1 loop inventory · Q2 P0 repair · Q3 polish · Q4 custody deprecation ☑ | Gates **steward path** (L1–L4, L6–L7) — see [WS-LIVE gating](#gating-revised) |
| **WS-NOTIF** | Unified notifications (TIF) | **Closed** — in-app shipped; **P0-N2 OS non-functional** | **No agent** — reopen only with explicit transport workstream |
| **WS-ONTOLOGY** | Semantic model canon | Identity + Address + Interpretation in [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) § Semantic model; durability companion [`IDENTITY_DURABILITY_ONTOLOGY.md`](IDENTITY_DURABILITY_ONTOLOGY.md) | **Doc-only · non-blocking** — informs WS-REALITY copy and product thesis |

**Do not duplicate:** city-game local dev bundle on branch `#109` / uncommitted WIP (`city-game:dev`, `launch-preflight`, comprehension kit) — coordinate in **Active branches** before overlapping scripts.

**Priority (2026-06-04):** **WS-LIVE** is the **active MVP program**. **WS-QUALITY** runs the steward belt in parallel. **WS-CR** / **WS-SCALE** / **WS-SW** advance Layer 5 field launch under WS-LIVE — not blocked by Q3 when `verify:city-game` + `verify:desk:fast` stay green and agents respect file ownership (§ [WS-LIVE](#ws-live--physical-software-objects--evolving-five-layer-stack)). **WS-NOTIF** is closed (background OS deferred).

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
| **Canonical docs to edit** | [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) · [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md) · [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) § city game + steward · [`CITY_GAME_LOCAL_DEV.md`](CITY_GAME_LOCAL_DEV.md) · [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) Q9 · [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) · [`QR_DESIGN_SPACE.md`](QR_DESIGN_SPACE.md) · this file |
| **In scope** | Change doc **Status** headers from “planning only / no implementation” where code shipped; **Implementation status** tables; verb glossary (above); three-sources-of-truth; steward 403 troubleshooting |
| **Out of scope** | New `*_INVESTIGATION.md` files; Stripe UI code; Phase E UI build |
| **Exit criteria** | Every API in HOSTED_TIER § HTTP API marked **implemented / partial / planned**; INVARIANTS lists metering + season-link gate; Q9 says metering **done**, checkout **open** |
| **Status** | **☑ 2026-06-03** — exit criteria met; hand off to WS-REV |
| **Regression** | `npm run build` (site) · spot-check links from [`AGENTS.md`](../AGENTS.md) |
| **Do not touch** | `worker/src/**` except comments pointing at docs (prefer zero code) |

---

### WS-ONTOLOGY — Semantic model (doc-only)

| | |
|--|--|
| **Canonical home** | [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) § [Semantic model — Identity + Address + Interpretation](LIVE_OBJECT_ARCHITECTURE.md#semantic-model--identity--address--interpretation) |
| **Companion** | [`IDENTITY_DURABILITY_ONTOLOGY.md`](IDENTITY_DURABILITY_ONTOLOGY.md) (durability tiers · discovery planes — defers semantic primitives to canon home) |
| **In scope** | Storage vs semantic tables · charter under Interpretation · implementation-artifact mapping · agent checklist · cross-links in DISCOVERY_PROJECTION · AI · DEMOCRATIC_INFRASTRUCTURE |
| **Out of scope** | Resolver code · season JSON · scan UI · discovery implementation · production mint |
| **Exit criteria** | Single canon home named · charter ≠ Identity taxonomy · pins/places outside resolver primitives · no mutex violations |
| **Status** | **☑ 2026-06-07** — Agent D tick; doc-only |
| **Regression** | `npm run build` (link spot-check) |
| **Blocks** | Nothing — informs WS-REALITY and product narrative only |

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
| **Status** | **R5 in progress** — `/created/` Usage & limits shipped. **Next (human/ops):** Stripe prices in Dashboard + wrangler secrets · test checkout · `hosted:rev:prod-smoke -- --paid` · `hosted:rev:rollout -- --post-deploy` |
| **Blocked by** | M4 pricing sign-off ([`HOSTED_TIER_PRICING_AND_SLA.md`](HOSTED_TIER_PRICING_AND_SLA.md)) for public USD copy |

---

### WS-CR — Cedar Rapids pilot launch (Phase D)

| | |
|--|--|
| **Canonical docs** | [`CITY_GAME_LAUNCH_CHECKLIST.md`](CITY_GAME_LAUNCH_CHECKLIST.md) · [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md) · [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) · [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) Phase D |
| **In scope** | `npm run city-game:launch-preflight` · human gates P1–P2, O1–O3 · `city-game:launch-surfaces --apply` + `npm run build` + pages deploy · worker deploy `CITY_GAME_ENABLED=1` · production season root custody (not local `CEen…` in committed JSON unless intentional) · map board gates B13–B14 if marketing promises live board |
| **Out of scope** | Stripe (WS-REV); Phase E browser mint (WS-E); rewriting metering |
| **Milestones** | **C1 ☑** · **C2** comprehension (human ≥5) · **C3** `city-game:install-qa-preflight` + physical sign-off · **C4** `city-game:smoke-production` · **C5** checklist signed |
| **Status** | **C3/C4 active** — E4/E5 engineering ☑ · **P2** install QA + **O1–O3** ops gates open |
| **Regression** | `npm run verify:city-game` · `npm run city-game:verify-season -- --require-launch` · `npm run city-game:launch-surfaces -- --check` |
| **File ownership** | `site/play/cedar-rapids/**` · `site/what-can-a-qr-do/**` (launch surfaces) · `site/data/city-game-cr-season-01.json` (production values only with ops sign-off) · `worker/scripts/city-game-launch-*` |
| **Parallel with WS-REV** | Pilot can run on **`reference_free`** game caps (15 nodes); paid tier is for **next** organizers |

---

### WS-E — Phase E self-serve game setup

| | |
|--|--|
| **Canonical docs** | [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) § Phase E · [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) · [`CITY_GAME_OPERATOR_CUSTODY.md`](CITY_GAME_OPERATOR_CUSTODY.md) § Self-serve setup |
| **In scope** | `/created/` **Add game node** (parity with status plate) · hub rows for `game_node` · season metadata editor · rules draft + publish · bulk template import · **`e2e/city-game-self-serve-setup.spec.ts` shipped** · deprecate terminal mint for **new** self-serve seasons (keep scripts for CI/fixtures) |
| **Out of scope** | Stripe checkout flow (WS-REV); Cedar Rapids launch apply (WS-CR); scan analytics; delegated child keys |
| **Gates (do not market “create your own game” until)** | **E1** Phase D signed · **E2** loader ≥2 seasons (**met**) · **E3** full 15-node season in browser on staging · **E4** comprehension on self-serve rules · **E5** INVARIANTS updated (**R-16**) |
| **Regression** | `npm run verify:city-game` · `npm run verify:city-game -- --e2e` · `npm run e2e:city-game-self-serve-setup` · `npm run worker:test -- worker/tests/city-game-season-loader.test.ts` |
| **File ownership** | `site/js/created-*game*` (new modules TBD) · `site/created/index.html` · `worker/src/city-game/season-loader.ts` (registerSeasonConfig only if needed) · **Do not** fork parallel mint API — use `POST …/objects` + `issue-qr` |
| **Status** | **E2E ☑** · **E5 INVARIANTS ☑** · **E3 tooling ☑** (`city-game:self-serve-staging-preflight`) · **Next:** human E3 walkthrough on staging (15 nodes, no terminal) |
| **Blocked by** | WS-CR **E1** (Phase D launch sign-off) before marketing self-serve |

---

### WS-CUSTODY — Hybrid custody (device unlock + full keys)

| | |
|--|--|
| **Canonical doc** | [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) |
| **Mission** | General-user accessibility **without** server key custody or feature fork on the network — one protocol, two unlock paths |
| **In scope** | Phase **C0** de-risk (comprehension metrics, mandatory recovery UX on keys model, consumer print → in-app scan default) · **C1** passkey-at-create + wrap + unlock → session · **C2** mode-aware quiet rehydrate · **C3** migration bridges · **C4** cross-device + P3-2 threat model · launch gates **G-C0–G-C5** |
| **Out of scope** | Server-side key custody · operator “reset my account” · replacing steward `full_keys` default for ops · delegated child keys (step 17) |
| **Depends on** | D6 / `vouch-sign-lock.mjs` (gate foundation) · D10 quiet rehydrate · `child-object-backup-gate` · D9 comprehension infrastructure |
| **Blocks** | Broad **consumer / paying** launch positioning until **G-C1–G-C3** pass — WS-REV checkout copy should reference non-recoverable operator |
| **File ownership (when coding)** | `create-card.mjs`, `device-wallet*.mjs`, `device-keys.mjs`, `device-quiet-tab-rehydrate*.mjs`, `scan-tab-keys.mjs`, `device-control-activation*.mjs`, `vouch-sign-lock.mjs`, new wrap module TBD, `device-ownership-copy-core.mjs` |
| **Regression (existing — must not break full_keys)** | `npm run e2e:key-loss-sad-path` · `npm run e2e:safari-keys-persistence` · `npm run ownership-restore:verify` · `worker/tests/device-quiet-tab-rehydrate.test.ts` |
| **Regression (C1–C4)** | `npm run custody:c1-preflight` · `npm run worker:test:custody-wrap` · `npm run worker:test:custody` · `npm run e2e:custody-device-unlock` |
| **Regression (C0)** | `npm run custody:phase0-preflight` · `npm run custody:phase0-kit` · `worker/tests/custody-phase0-*.test.ts` |
| **Human gate (C0-5/6)** | `npm run custody:phase0-kit` → ≥5 testers → `npm run custody:phase0-sign-off -- --pass --apply` |
| **Status** | **C1–C4 + G-C4 draft shipped (engineering)** — recovery re-enroll surfaces, K11 E2E, P3-2 documented · **G-C0** human comprehension open · **G-C3** WebAuthn fallback QA next |

**Do not duplicate:** Safari P0–P2 mitigations (shipped) — WS-CUSTODY **extends**, not replaces, [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md).

---

### WS-QUALITY — Core product loop (verify · fix · UX)

| | |
|--|--|
| **Parent program** | **[WS-LIVE](#ws-live--physical-software-objects--evolving-five-layer-stack)** — Layer **L1** steward path + **LO-1** pilot sign-off |
| **Canonical doc** | [`CORE_PRODUCT_LOOP.md`](CORE_PRODUCT_LOOP.md) |
| **Mission** | Make the **shipped** steward + stranger loop reliable and understandable — **WS-LIVE sub-track**; does not own city-game field launch |
| **In scope** | `verify:desk` belt; **L1–L8** loop inventory; **P0** rows in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md); sad-path fixes from [`SAD_PATH_COVERAGE_AND_BACKLOG.md`](SAD_PATH_COVERAGE_AND_BACKLOG.md); emphasis-card + ownership copy polish; status plate + lost-item **printed** pilots (**LO-1**) |
| **Out of scope** | 40→60 nodes (**WS-SCALE** under WS-LIVE); Signal War maintenance (**WS-SW**); device_unlock C1+ (**WS-CUSTODY**); Stripe (**WS-REV**); greenfield shell rewrite without Q4 gate; `worker/src/live-object/**` composition unless sad-path regression |
| **Milestones** | **Q0** belt ☑ · **Q1** loop table complete · **Q2** P0 green local · **Q3** comprehension (5 steward / 3 stranger) · **Q4** rearchitecture decision (default **no**) |
| **Regression** | `npm run verify:desk:fast` (CI) · `npm run verify:desk` (pre-merge) · per-row gates in [`CORE_PRODUCT_LOOP.md`](CORE_PRODUCT_LOOP.md) § Core loop inventory |
| **File ownership** | `site/create/**` · `site/created/**` · `site/js/device-{hub,status,wallet,ownership}*` · `site/js/create-*` · targeted `e2e/*` · resolver sad-path fixes |
| **Status** | **Q0 shipped** · **Q1–Q3 open** — rearchitecture **deferred** until measured friction |
| **Hub/inbox mutex** | **WS-NOTIF closed** — WS-QUALITY owns **P1-MOTO-06/10/21** and mutex hub/inbox/network files (see WS-NOTIF § Mutex) |
| **Blocks** | **Steward-path marketing** and **LO-1** until L1–L4, L6–L7 green — **not** WS-LIVE game field work when § [Gating (revised)](#gating-revised) rules hold |

### WS-NOTIF — Notifications v2 (tiered inbox-first)

| | |
|--|--|
| **Canonical doc** | [`NOTIFICATION_SYSTEM_V2.md`](NOTIFICATION_SYSTEM_V2.md) |
| **Selected approach** | **TIF** — one inbox queue with urgency tiers **U0–U3**; delivery router; **foreground strip** for U0 when tab visible; OS only for opt-in U0 when hidden |
| **Mission** | End fragmented notify paths (relay hub group, live-proof-only OS, duplicate polls); stewards get one ordered inbox and predictable away-tab behavior |
| **In scope** | `device-inbox-core.mjs` kinds/tiers · `device-notification-delivery*.mjs` · fold `relay_offer` into inbox · **N3** foreground strip · **P1-MOTO-06** hub network poll / RC-4 checking exit · **P1-MOTO-08/10/21** delivery + browser-aware copy · Android Chrome PWA **P0-N** QA |
| **Out of scope** | Scan/hoodie alerts · email/SMS · generic push platform · second SPA · re-litigating custody restore-in-tab UX (shipped) |
| **Milestones** | **N0–N5 ☑** · **N4 field pass** manual · hosted push TIF contract (`notify:hosted-push`) · **P1-MOTO-06** device re-verify |
| **Regression** | `npm run notify:verify` · `e2e/device-inbox.spec.ts` · `e2e/device-os-wallet.spec.ts` · `verify:desk:fast` |
| **File ownership** | See [`NOTIFICATION_SYSTEM_V2.md`](NOTIFICATION_SYSTEM_V2.md) § File ownership · **P1-MOTO-06:** `device-hub-ui.mjs`, `device-wallet-network*.mjs`, `device-hub-network-tools*.mjs` |
| **Status** | **☑ Closed (2026-06-04)** — N0–N5 in repo · **P0-N2 background OS deferred (non-functional)** |
| **Handoff** | **WS-QUALITY** owns **P1-MOTO-06/10/21** (foreground/in-app) and hub/network mutex files |
| **Mutex (WS-QUALITY hands off)** | `device-hub-ui.mjs` · `device-chrome-refresh.mjs` · `device-wallet-network*.mjs` · `device-live-control-inbox*.mjs` · `device-inbox*.mjs` · `device-browser-notifications*.mjs` · `device-hub-inbox-alerts.mjs` · `device-foreground-attention*.mjs` |

---

## Engineering Phase 2 — Summer 2026 program

**Parent:** **[WS-LIVE](#ws-live--physical-software-objects--evolving-five-layer-stack)** — Layer **L5** field launch + contest layer on the five-layer stack.

**Purpose:** Next engineering phase after the **Phase 1 multi-agent program** (WS-DOC / WS-REV / WS-CR / WS-E) — parallel tracks for **Cedar Rapids summer launch**, **Signal War**, **consumer custody de-risk**, and **revenue closeout**.  
**Doc audit (2026-06-03):** New canon — [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md), [`CUSTODY_PHASE0_RUNBOOK.md`](CUSTODY_PHASE0_RUNBOOK.md). Major updates — [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) (unified **Wake the city · Signal War**, **40→60** waves, **SW-01–SW-15**), [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) (fog **SW-08**), [`OWNERSHIP_AND_CONTROL_MODEL.md`](OWNERSHIP_AND_CONTROL_MODEL.md) (hybrid custody pointer), [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) (five-layer resolver map). Cross-links in Safari keys, key-loss matrix, steward roadmap, operator runbooks.

### Phase 1 exit (do not start Phase 2 field waves until)

| Gate | Owner | Proof |
|------|-------|-------|
| **WS-CR C5** | WS-CR | [`CITY_GAME_LAUNCH_CHECKLIST.md`](CITY_GAME_LAUNCH_CHECKLIST.md) signed · `city-game:launch-surfaces --apply` on production |
| **WS-REV R5** | WS-REV / ops | Stripe prices + secrets · `hosted:rev:rollout -- --post-deploy` · optional `hosted:rev:prod-smoke -- --paid` |
| **B7 at ~40** | WS-SCALE + WS-CR | Install QA + comprehension at **opening footprint**, not 15-node scaffold count |
| **G-C0** (parallel) | WS-CUSTODY | `custody:phase0-sign-off -- --pass` — **not** a city-game blocker; **is** a broad consumer-launch blocker |

Phase 1 human gates still open: **WS-CR C2** comprehension ≥5 · **WS-E E3** staging walkthrough (15-node scaffold OK for E3; summer open needs **SC-2**).

### Phase 2 critical path

```text
Phase 1 exit (C5 + B7 plan for ~40)
    ↓
WS-SCALE SC-1–SC-2 (JSON → ~40 nodes + mint wave 1) — blocks launch-surfaces honesty
    ↓ parallel at season open
WS-SW SW-S1 (copy + operator flips on relays; cooperative spine L)
WS-CR ops (install wave 1, GM cadence doc)
WS-CUSTODY C0 sign-off (parallel)
    ↓ mid-summer
WS-SCALE SC-3–SC-4 (+10–20 nodes, B7 per wave)
WS-SW SW-S2 (SW-03–SW-07 L: capture, reinforce, decay, faction totals) ☑
WS-SW SW-S3 (SW-08–SW-13: fog, artifacts, dual victory — map B13–B15) ☑
WS-SW SW-S3 tail (SW-14 debrief · SW-15 badge scan) ☑
    ↓ after E1
WS-E self-serve marketing (organizers; not Cedar Rapids field)
WS-CUSTODY C1+ only if G-C0 pass
```

### Phase 2 agent index

| ID | Workstream | Agent mission | Blocks |
|----|------------|---------------|--------|
| **WS-SCALE** | Summer node footprint | Extend season registry **15 → ~40 open → ~60 full**; `node_role` mix; mint/install waves; **B7** each wave | Public open · honest `verify:city-game` count |
| **WS-SW** | Signal War mechanics | **SW-01–SW-15** per delivery column in implementation brief; S1 = doc/copy/O; S2 = player **L** on relays | Faction contest truth on scan + board |
| **WS-CUSTODY** | Hybrid custody | C0 de-risk → C1 wrap (gated on **G-C0**) | Consumer + paid positioning |
| **WS-REV** | Revenue closeout | Finish R5 prod Stripe smoke (Phase 1 tail) | Paid organizer caps UI truth |
| **WS-CR** | Launch + GM ops | C2–C5, weekly bulletin/decay operator cadence | Summer “living city” ops |
| **WS-E** | Self-serve seasons | E3 human → E1 gate for marketing | New organizers (post-pilot) |

**Assign one agent per ID.** WS-SCALE and WS-SW may share `worker/src/city-game/**` — coordinate in **Active branches**; prefer WS-SCALE owns JSON/registry, WS-SW owns contribute evaluators + snapshot fields.

---

### WS-SCALE — Summer node footprint (40 → 60)

| | |
|--|--|
| **Canonical docs** | [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) § Node scale · § Rollout phases · [`CITY_GAME_NODE_INSTALL_MAP.md`](CITY_GAME_NODE_INSTALL_MAP.md) · [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) · [`CITY_GAME_OPERATOR_RUNBOOK.md`](CITY_GAME_OPERATOR_RUNBOOK.md) |
| **Product canon** | **~40 heterogeneous nodes at open** (not 15 clones): ~30 relays, 4 HQ, 5–10 resource/artifact, 1–3 world events · grow to **~60** in install waves |
| **In scope** | Clone spine rows to full mix · `node_role` extensions in [`worker/src/city-game/constants.ts`](../worker/src/city-game/constants.ts) · `/created/` picker (with WS-E) · mint batches · **B7** + `city-game:install-qa-preflight` at **40** before `--apply` · mid/late waves + bulletin for new installs |
| **Out of scope** | Signal War **L** logic (WS-SW) · Stripe · custody wrap · new investigation docs |
| **Milestones** | **SC-1 ☑** · **SC-2 ☑** · **SC-2b ☑** · **SC-3** local/C3 walk ☑ · prod seed 40/40 ☐ · **SC-4** mid wave (+10) · **SC-5** full ~60 |
| **Regression** | `npm run city-game:scale-sc1` · `scale-sc2` · `scale-sc2b` · `scale-sc3` · `npm run verify:city-game` · `npm run city-game:install-qa-preflight` |
| **File ownership** | `site/data/city-game-cr-season-01.json` · `worker/src/city-game/constants.ts` · `worker/scripts/city-game-*mint*` · install map doc · season registry codegen |
| **Status** | **SC-1–SC-2b ☑ local** · **Next:** B7 physical install · `city-game:seed-production-wave-open` for prod 40/40 |
| **Blocked by** | Phase 1 launch sign-off for public `--apply`; production mint for prod smoke |

**Honest default:** Do not market 40-node summer until production mint matches registry and B7 passes.

---

### WS-SW — Wake the city · Signal War

| | |
|--|--|
| **Canonical docs** | [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) § Wake the city · Signal War · **SW-*** table · [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) · [`CITY_GAME_AUTONOMOUS_V1.md`](CITY_GAME_AUTONOMOUS_V1.md) · game theory **GT-8–GT-10** |
| **Product sentence** | One season, two layers — **cooperative awakening** on lore nodes + **faction network contest** on relays (capture, reinforce, decay, fog, dual victory) |
| **In scope** | Traceability **SW-01–SW-15** · **SW-S1:** SW-02 pledge copy, relay **O** flips, season rules framing (**SW-01** doc ☑) · **SW-S2:** **SW-03–SW-07** `game-contribute` capture/reinforce/decay, `held_by_faction` / `held_until`, faction totals on snapshot · **SW-S3:** **SW-08** fog filter, **SW-09–SW-12** artifacts/overharvest, **SW-13–SW-15** finale + badge scan · map **B13–B15** when marketing promises live contest board |
| **Out of scope** | Node count / mint (WS-SCALE) · Player accounts / GPS · **SW-16** strategy votes (later) · B8 RFC unless product pulls S2 earlier |
| **S1 honest default** | Signal War **copy + operator flips** ship at open; player-initiated **SW-03–SW-05** target **S2 L** unless B8 merges earlier — cooperative **CR-G01/G07** stays **L** at S1 |
| **Regression** | `npm run verify:city-game` · `worker/tests/city-game-contribute*.test.ts` · `worker/tests/map-node-snapshot*.test.ts` · comprehension **GT-8–GT-10** when SW-S2 ships |
| **File ownership** | `worker/src/city-game/game-contribute*.ts` · `season-snapshot*` / `map-node-snapshot.ts` · `site/js/city-game-*` · scan templates for `relay_gate` · [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) fog section |
| **Status** | **SW-S3 tail shipped** — debrief page (**SW-14**), faction badge scan (**SW-15**) · WS-SW traceability **SW-01–SW-15** complete for pilot |
| **Parallel with** | WS-SCALE (registry must list relay roles before capture **L**) |

---

### Phase 2 regression block

```bash
npm run verify:city-game
npm run city-game:launch-preflight
npm run custody:phase0-preflight
npm run custody:c1-preflight
npm run e2e:custody-device-unlock
npm run worker:test -- worker/tests/city-game-contribute*.test.ts worker/tests/map-node-snapshot*.test.ts
npm run build
```

Add **WS-REV** multi-agent block when touching `/created/` or steward billing. Add **WS-CUSTODY** key-loss / Safari E2E when touching create/setup shell.

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
| **WS-CR** | Assign per [Multi-agent program](#multi-agent-program-product--revenue--cedar-rapids) | **C3** — LAN walk kit 15/15 ☑ · human P2 physical gate open | See stream file ownership; avoid `#109` overlap without merge plan |
| **WS-NOTIF** | `cursor/ws-notif-network-notify` | **In progress** — N3 foreground strip · P1-MOTO-06/08/10/21 | Mutex hub/inbox/network files; WS-QUALITY defers same rows |
| **main** | `main` | Safari steps 1–21 shipped · RC-18 v83 | Source of truth |

Update this table when new PRs open.

---

## Open engineering (not claimed)

| Priority | Item | Owner type | Command / proof |
|----------|------|------------|-----------------|
| P0b-1 prod WebKit | Card disabled since visit — **re-verify on humanity.llc** after Pages deploy | Human QA | Desk ☑ `card-disabled-since-visit:desk-gate` (2026-06-02) · manual **P1-P0b-1** · `card-disabled-since-visit:sign-off -- --pass --apply` |
| P1-PWA-V prod WebKit | Vouch from printed QR — **PWA + Camera on humanity.llc** | Human QA | Desk ☑ `steward-scan-handoff:verify` (2026-06-02) · manual **P1-PWA-V** · changelog line in this doc |
| H-12 human § A–C | ~~Printed QR camera QA on ≥3 phones~~ **Passed 2026-05-30** | Human QA | Sign-off: `live-control:printed-qa:sign-off -- --pass --apply` |
| P3-1 / P3-2 | Hybrid custody **C1–C4** — see WS-CUSTODY | Architecture | [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) — **C0** de-risk before wrap crypto |
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
| Live-object composition (L1–L4) | **WS-LIVE** · WS-QUALITY (sad-path only) | `worker/src/live-object/**`, `worker/src/resolver/scan-state.ts`, `scan-html.ts`, `scan-status.ts`, `worker/src/resolver/child-objects.ts`, `created-child-object*` |
| View-only `/created/` | Ownership restore | `created-view-mode.mjs`, `created-view-live-readonly*.mjs`, `site/created/index.html` |
| Hub restore / import | Ownership restore · steward handoff | `device-hub-import.mjs`, `device-hub-import-recovery.mjs`, `device-hub-open-scan.mjs`, `device-hub-qr-scanner.mjs`, `device-hub-stranger-empty*` |
| Wallet summary / corrupt | Safari P3-3 / P1-4 | `device-wallet-summary-core.mjs`, `device-wallet-parse-core.mjs` |
| Scan quiet rehydrate | Safari P0-1 | `scan-tab-keys.mjs`, `worker/src/resolver/scan-html.ts` |
| Live proof UX | H-12 | `scan-live-control*`, `e2e/live-control-loop.spec.ts`, `worker/scripts/live-control-printed-qa-*` |
| Steward session + entitlements API | WS-REV | `worker/src/resolver/steward-hosted.ts`, `worker/src/steward/**`, `site/js/device-steward-session*.mjs`, `site/js/device-steward-entitlements*.mjs` |
| Game season metering | WS-REV | `worker/src/city-game/season-entitlements*.ts`, `worker/src/city-game/season-quota.ts`, `worker/migrations/0031_*`, `site/js/city-game-season-entitlements-core.mjs` |
| Cedar Rapids launch surfaces | WS-CR | `worker/scripts/city-game-launch-surfaces*.mjs`, `site/play/cedar-rapids/`, `site/data/city-game-cr-season-01.json` |
| Summer season JSON + mint waves | WS-SCALE | `site/data/city-game-cr-season-01.json`, `worker/src/city-game/constants.ts`, mint/install scripts — coordinate with WS-SW |
| Signal War contribute + snapshot | WS-SW | `worker/src/city-game/game-contribute*.ts`, `map-node-snapshot.ts`, `site/js/city-game-*` |
| Custody C0 copy + setup | WS-CUSTODY | `device-ownership-copy-core.mjs`, `/created/` setup panel, `custody-phase0-*` scripts |
| Phase E `/created/` game setup | WS-E | `site/created/index.html`, `site/js/created-*.mjs` (new game modules), `site/play/*/index.html` generator paths |
| Doc status + verbs | WS-DOC | `docs/HOSTED_TIER_*.md`, `docs/PAID_TIER_*.md`, `docs/CITY_GAME_LOCAL_DEV.md`, `docs/LIVE_OBJECT_ARCHITECTURE.md`, `docs/QR_DESIGN_SPACE.md`, `docs/SYSTEM_INVARIANTS.md` |
| Notifications v2 + hub network status | WS-NOTIF | `device-inbox-core.mjs`, `device-notification-delivery*.mjs`, `device-hub-inbox-alerts.mjs`, `device-relay-offer-inbox*.mjs`, `device-browser-notifications*.mjs`, `device-foreground-attention*.mjs`, `device-hub-ui.mjs`, `device-wallet-network*.mjs`, `device-hub-network-tools*.mjs` |

---

## Changelog (coordination log)

| Date | Event |
|------|--------|
| 2026-06-04 | **WS-LIVE tooling** — `verify:live` / `verify:live:fast` belt · `ws-live:preflight` · `ws-live:lo1-kit` (LO-1 field walk) |
| 2026-06-04 | **WS-NOTIF N3 + P1-MOTO cluster** — foreground U0 strip · Check network refreshes resolver health first · Chrome-aware companion copy on Android PWA |
| 2026-06-04 | **WS-NOTIF** — notification v2 workstream (TIF) — [`NOTIFICATION_SYSTEM_V2.md`](NOTIFICATION_SYSTEM_V2.md) |
| 2026-06-04 | **WS-CR B13/P6** — `map-board-b13-preflight` + sign-off; P6 required when live board marketed; comprehension-sign-off enforces GT-7 |
| 2026-06-04 | **WS-CR C3** — install QA LAN walk kit lists all **15** season registry nodes (was 4 comprehension probes) · `install-qa-preflight` reports walk kit |
| 2026-06-04 | **WS-SCALE C3 walk fix** — `install-qa-walk` uses full seed (40 nodes, not comprehension probes) · `city-game:scale-sc3` · season JSON re-merged to 40 |
| 2026-06-04 | **WS-SCALE SC-2b ☑** — `city-game:smoke-local -- --all` (40 scans) · `city-game:scale-sc2b` · `seed-production-wave-open` script |
| 2026-06-04 | **WS-SCALE SC-2 ☑** — `city-game:seed-wave-open` (25 nodes) · local seed 40/40 · install map QR ☑ · `city-game:scale-sc2` exit 0 |
| 2026-06-03 | **WS-SCALE SC-1 ☑** — 40-node summer registry + `city-game:scale-sc1` preflight · next SC-2 mint/install |
| 2026-06-03 | **Engineering Phase 2** — summer program: **WS-SCALE** (40→60), **WS-SW** (Signal War SW-01–15), Phase 1 exit gates; doc audit of custody + city-game canon |
| 2026-06-03 | **WS-REV M5/E2.5** — hub monitoring line uses entitlements body (plan + auto-check usage / at-limit) |
| 2026-06-03 | **WS-REV R5** — `/created/` Usage & limits on Manage tab; production HTML smoke green |
| 2026-06-03 | **WS-REV R5** — rollout tooling + prod `0031` + worker deploy; API smoke green · `hosted:rev:step1-remote` · `hosted:rev:deploy` |
| 2026-06-03 | **Live object architecture** — [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md): five-layer resolver map (verbs, streams, time, network); cross-links from QR_DESIGN_SPACE, INVARIANTS, AGENTS |
| 2026-06-03 | **WS-CR E4/E5** — worker deploy `CITY_GAME_ENABLED=1`; production scan smoke green (pre-window dormant template) |
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
2. Confirm your **workstream ID** — **WS-LIVE** umbrella: sub-tracks **WS-QUALITY**, **WS-CR**, **WS-SCALE**, **WS-SW** (§ [WS-LIVE](#ws-live--physical-software-objects--evolving-five-layer-stack)) · Phase 1: WS-DOC, WS-REV, WS-E · parallel: **WS-CUSTODY** (§ [Engineering Phase 2](#engineering-phase-2--summer-2026-program)) — stay inside **In scope** / **Out of scope**.
3. `git fetch` and check **Active branches** — do not re-implement open PR scope.
4. Run the **Regression commands** for your stream (WS-LIVE integrator: § [WS-LIVE regression block](#ws-live-regression-block)).
5. Append one line to **Changelog** when you merge or ship.
6. Do **not** add new investigation docs — update invariants or canonical spec ([`DOC_MAINTENANCE.md`](DOC_MAINTENANCE.md)).
