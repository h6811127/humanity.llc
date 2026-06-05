# Product positioning and loop strategy

**Status:** Active  
**Purpose:** Positioning synthesis, narrative sequencing, front-door entry strategy, and phased implementation plan.  
**Parent:** `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md` · `docs/STATUS_PLATE_PILOT.md`  
**Language policy:** [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md)  
**Object model (protocol):** [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md)  
**Last updated:** 2026-06-04 — Step 20 steward UX presentation target ([`STEWARD_UX_PRESENTATION_TARGET.md`](STEWARD_UX_PRESENTATION_TARGET.md))

---

## Narrative stack (canonical — do not collapse)

| Layer | Message | Where |
|-------|---------|--------|
| Hook | **The sticker stays. The status changes.** | Landing hero H1 ([`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) § Landing) |
| Mechanism | Print once · scanners read today’s signed state · update or revoke without reprint | Landing hero tagline · how-it-works |
| Category | Public programmable objects / **physical software objects** | Landing kicker · framing card · [`site/what-can-a-qr-do/physical-software-objects/`](../site/what-can-a-qr-do/physical-software-objects/) |
| Summer wedge | Hoodie (wear) · deploy on surfaces · Cedar Rapids (place) | `#launch-doors` · [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) · [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) |
| Catalog | Research, portfolio depth, internal way-finder — **not** the front door | `site/what-can-a-qr-do.html` · [`QR_DESIGN_SPACE.md`](QR_DESIGN_SPACE.md) § Catalog roles |

**Forbidden on `/`:** “Live state on real objects” as hero H1, single hero Create CTA, leading with lost-item relay as company identity ([`landing-copy-contract.mjs`](../site/js/landing-copy-contract.mjs)).

---

## Front door strategy (June 2026)

**Decision:** **Option A** — keep landing **Three ways in** as the primary public entry. **Option B** — top-nav **Create** opens the same three-door chooser (not a protocol form). Engineering targets: Steps 10–15 below.

### Three user jobs (not twelve catalog pages)

| Job | User question | Primary door | Protocol (unchanged) |
|-----|---------------|--------------|----------------------|
| **Wear live state** | “What I wear should mean something *today*.” | Door 2 → `/shop/customize/` | `scope: print_artifact` on garment; steward updates from `/created/` |
| **Deploy on something** | “Something in the world should stay *true*.” | Door 1 → create (BYOP) | Root + child object or flat pilot bridge; per [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) |
| **Activate a place** | “Many scan points should share one world.” | Door 3 → play; organizers → season setup | `game_node` children + Layer 5 season overlay · [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) |

Lost-item relay, status plate, menus, crisis cards, etc. are **catalog instances** of job #2 — field pilots and portfolio depth, **not** homepage nouns.

### Launch doors (Option A — shipped copy)

| Door | Title (user-facing) | Route | Role |
|------|---------------------|-------|------|
| 1 | Live status on something | `/create/?intent=deploy` (target) · today `/create/?template=status_plate` | Free deploy tool (BYOP) |
| 2 | Live status on you | `/shop/customize/?product=glitch_hoodie_v1` | Commerce + distribution |
| 3 | Play the city game | `/play/cedar-rapids/` | Player entry; network proof |

**Secondary (shipped):** “Organize a live season” → `/create/?intent=game` or `/created/?focus=game-season-setup` for stewards who run games (not players). Footer / studio — not a fourth hero row.

**Architecture alignment:** Doors are **routing and copy only**. Resolver composition (`buildScanViewModel`), custody, and child-object APIs do not fork per door. `verify:landing` + [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) § Landing lock hero + `#launch-doors` structure.

### Create vs buy hoodie (carrier split, not capability split)

| Path | User gets | Revenue | Primitive |
|------|-----------|---------|-----------|
| **Buy (door 2)** | Curated carrier — print quality, Glitch brand, fulfillment | Product margin | Same live object on fabric |
| **Create (door 1)** | BYOP — sign, print own sticker/sign | Free today; habit + upsell | Same signing + revoke stack |

**Rules:**

1. **Never paywall** the core primitive — sign, one live object, publish, revoke ([`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md)).
2. **Charge for carriers** — hoodie, sticker sheets, print packs ([`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md)).
3. **Create is step 4 of the merch funnel** — scan → want → **create card** → customize → checkout; not a competitor to commerce.
4. Under door 2 (shipped step 15): honest BYOP link — “Or print your own wear” → `/create/?intent=wear`.

**Architecture alignment:** Merch webhook mint path (`print_artifact`) and steward create path share resolver scan routes. Commerce does not grant vouch or bypass custody gates ([`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) rules). `personalize.checkout_open` gating unchanged.

### Top-nav Create (Option B — shipped)

Bare `/create/` is a **two-row steward chooser**: deploy on something + wear carrier (shop). **Not** a mirror of landing door 3 — **Play the city game** stays on `/` and `/play/`; **Organize a live season** is a footnote link (`?intent=game`). No **General / Status plate / Lost item** tabs as the first screen.

**Architecture alignment:** Chooser is static HTML/JS routing — no new Worker routes. Deep links (`?template=`, `?intent=`) remain for pilots, merch handoff (`hc_ref`), and E2E ([`e2e/create-flow-convergence.spec.ts`](../e2e/create-flow-convergence.spec.ts)).

### General Humanity Card (internal — not user-facing)

**General / root Humanity Card** = signing identity (`profile_id`, owner key, trust, cascade revoke). Users see **@handle**, **My objects**, and **what scanners read** — not “general card” or “root node.”

| Internal (protocol/docs) | User-facing (target) |
|------------------------|----------------------|
| Root Humanity Card | Your account · @handle |
| Child object | Tag · plate · scan point · hoodie QR |
| `hc_wallet` row | Account (one key controls many objects) |
| Object graph (L1) | My objects (nested management view) |
| Network graph (L5) | Live game · season · place |

Flat-card pilots (plate/relay **is** the root) remain valid for strangers and legacy; new surfaces prefer root + child without exposing topology ([`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) § Bridge vs target).

**Architecture alignment:** No rename of `profile_id`, `object_type`, or document types. UI copy migration only. `isGeneralRootWalletEntry` and child-object endpoints unchanged.

### Abstract create (door 1 target — planned)

Lead with **deployment + what scanners read**, not taxonomy tabs:

1. **What should scanners see right now?** (headline + optional detail)
2. System maps to `status_plate`, `lost_item_relay`, or future types behind the scenes.
3. Pilot presets (hours, return message, campaign line) live in collapsed **Examples** — not top-level create types.

**Architecture alignment:** Reuses `registerChildObjectAndIssueScanLink` ([`child-object-register-issue.mjs`](../site/js/child-object-register-issue.mjs)) and flat pilot POST for strangers. Optional bundled root+child wizard is sequential client calls — **no resolver fork required for v1 doc target**.

### Catalog role (portfolio + way-finder)

[`site/what-can-a-qr-do.html`](../site/what-can-a-qr-do.html) and walkthroughs are for **team prioritization**, **portfolio narrative**, and **curious builders** — linked from “More use cases,” not onboarding.

| Tag | Meaning | Front door? | Examples |
|-----|---------|-------------|----------|
| **wedge** | Summer program / revenue / proof | Yes (via doors) | Hoodie, Cedar Rapids, physical software objects |
| **pilot** | Field QA + LO gates | No | Status plate, lost-item relay |
| **research** | Design space / not shipped | No | Crisis cards, mesh, healthcare-adjacent |

See [`QR_DESIGN_SPACE.md`](QR_DESIGN_SPACE.md) § Catalog roles.

---

## Messaging matrix (canonical copy)

| Surface | Lead copy |
|---------|-----------|
| Landing hero H1 | **The sticker stays. The status changes.** |
| Landing hero kicker | Public programmable objects |
| Landing meta / OG | Public programmable objects. Live, revocable status on physical tags — browser-native. No scan tracking. |
| Launch door 1 | Live status on something — deploy on a plate, sticker, or sign |
| Launch door 2 | Live status on you — Glitch hoodie; your line, change from Live without reprinting |
| Launch door 3 | Play the city game — Cedar Rapids; scan stickers, shared world state |
| Top-nav Create (target) | Same three rows as launch doors — pick how you want to start |
| Create (deploy intent, target) | Deploy on something — what should scanners see right now? |
| Create chooser / deploy | Keys stay in this tab until you save on this device or add recovery |
| Scan (any object) | Object name + live state + honest limit |
| `/created/` (steward) | Publish updates on Live · same QR, no reprint |
| Pilot: status plate (field/catalog only) | One plate · one question · open or closed right now |
| Pilot: lost item (field/catalog only) | Return path for finders — not your phone number on the tag |
| Commons Pass (Phase D) | Membership infrastructure for communities that refuse surveillance |
| Federation pitch | Democratic trust grammar · portable · federated operators |

**Rule:** Hero hook and meta/OG must not contradict each other. Avoid leading public copy with “OS” — reserve device-shell language for stewards. **Do not** lead company positioning with lost-item relay or status-plate pilot vocabulary.

---

## Implementation plan

### Step 1 — Status plate habit loop scorecard ✅

**Shipped:**

- Local scorecard on `/created/` for `status_plate` pilots (`site/js/status-plate-loop-scorecard.mjs`)
- Tracks manifesto publish count and last update time per `profile_id` (localStorage — no scan analytics)
- Manual milestones: printed QR, scanned from second device (owner checkboxes; print auto-checks on QR PNG download)
- Surfaces progress toward pilot habit target: **≥2 status updates**

**Exit:** `worker/tests/status-plate-loop-scorecard.test.ts`; scorecard visible on status-plate `/created/` in control workspace.

**Related:** `docs/STATUS_PLATE_PILOT.md` § Habit loop scorecard

### Step 2 — Unlock live update for live-update pilots without first-revoke gate ✅

**Shipped:** `site/js/created-first-revoke-gate.mjs` — `status_plate` and `lost_item_relay` skip revoke-first gate via `isPilotUpdateUnlocked()`.

### Step 3 — Messaging matrix alignment ✅

**Shipped:**

- Landing meta + OG aligned with matrix (`site/index.html`)
- Landing hero kicker → “Public programmable objects” (H1 unchanged)
- Create template-specific hero lead (`site/create/index.html` · `site/js/create-card.mjs`)
- Status plate field hint corrected (Live updates without reprint)
- Vitest: `worker/tests/landing-messaging.test.ts`

### Step 4 — Status plate field pilot tooling ✅

**Founder-run (field, not engineering):** deploy 5–10 real plates; score strangers with `docs/M5_STRANGER_TEST_RUNBOOK.md` and `docs/STATUS_PLATE_PILOT.md` § Pilot checklist.

**Shipped tooling (device-local):**

- `habitLoopClosed()` — true when ≥2 Live publishes + printed + second-device scan milestones
- `/created/` scorecard shows closed state + **Copy pilot summary** (JSON export for founder aggregation; no scan analytics)

**Exit:** `worker/tests/status-plate-loop-scorecard.test.ts`; field notes from exported summaries.

### Step 5 — Terminology sequencing pass (scanner vs steward) ✅

**Shipped:**

- `site/js/pilot-steward-copy.mjs` — plain-language overlay per pilot template
- `/created/` Live + Manage labels sync on template (`syncCreatedPilotStewardCopy`)
- Hub card controls use pilot-aware labels (`applyHubControlPlainLabels`)
- Revoke summary + network hints simplified for status plate and lost-item pilots
- Vitest: `worker/tests/pilot-steward-copy.test.ts`

**Rule:** Precise terms (QR credential, card revoke) remain in Advanced panels and general cards.

**Canonical policy:** [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) — plain by default, precise on purpose; scanner ≠ steward ≠ engineer. Step 5 is the steward/pilot implementation of that policy.

### Step 6 — Lost-item scan → create hint (optional) ✅

Calm footer on lost-item relay scan template only — link to `/create/?template=lost_item`. Copy in `worker/src/resolver/scan-safety.ts`; render in `scan-html.ts` (`scan-create-hint`). Tests: `scan.test.ts`, `scan-m5-showcase-paths.test.ts`.

### Step 7 — Lost-item relay field pilot tooling ✅

**Founder-run (field):** deploy 5–10 real tags; score finders with `docs/M5_STRANGER_TEST_RUNBOOK.md` and `docs/LOST_ITEM_RELAY_PILOT.md` § Pilot checklist.

**Shipped tooling (device-local):**

- `site/js/lost-item-relay-loop-scorecard.mjs` — habit loop on `/created/` for `lost_item_relay` pilots
- Target: **≥1** return message update + printed + second-device scan; **Copy pilot summary** export (`humanity_lost_item_relay_pilot_summary_v1`)

**Exit:** `worker/tests/lost-item-relay-loop-scorecard.test.ts`; field notes from exported summaries.

### Step 8 — Manifesto showcase exit verification ✅

**Shipped (local / CI):**

- `worker/tests/manifesto-showcase-exit.test.ts` — showcase JSON ↔ M5 fixture alignment; status JSON `public_snapshot` for plate + live object
- `npm run worker:test:manifesto-showcase-exit` — bundles M5 showcase path tests + site data checks

**Ops (production resolver):**

- Re-seed both stream pilots: `API_ORIGIN=https://humanity.llc npm run site:refresh-showcase`
- After commit + Pages deploy: `API_ORIGIN=https://humanity.llc npm run site:verify-showcase` — live `GET …/status` checks for `object_streams` + `public_snapshot`
- Local exit bundle: `npm run site:verify-positioning-exit`

### Step 9 — Field pilot summary aggregation ✅

**Founder-run (field):** collect **Copy pilot summary** JSON from stewards after status plate / lost-item pilots.

**Shipped tooling:**

- `site/js/pilot-summary-aggregate.mjs` — parse + rollup exported summaries (no server analytics)
- `npm run site:aggregate-pilot-summaries -- path/to/*.json` — text rollup for founder field notes

**Exit:** `worker/tests/pilot-summary-aggregate.test.ts`

### Step 10 — Front-door doc alignment ✅

**Shipped (2026-06-04):** Canonical front-door strategy in this doc; cross-links in [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) steps 19–20, [`STEWARD_UX_PRESENTATION_TARGET.md`](STEWARD_UX_PRESENTATION_TARGET.md), [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md), [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md), [`QR_DESIGN_SPACE.md`](QR_DESIGN_SPACE.md), [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md), [`CORE_PRODUCT_LOOP.md`](CORE_PRODUCT_LOOP.md) Q3 targets.

### Step 11 — Create chooser (Option B) ✅

**Shipped (2026-06-04):** Bare `/create/` → steward chooser — **Your line on the network** (general), deploy, wear (`create-entry-chooser-core.mjs`, `create-entry-chooser.mjs`). Player play and organizer season are footnote links, not create rows. Deep links (`?template=`, `?intent=`, `hc_ref`) skip chooser. Template tabs moved to collapsed **Examples and object types** on the form panel (hidden for room intents including `?intent=general`).

**Exit:** `worker/tests/create-entry-chooser-core.test.ts` · `e2e/create-flow-convergence.spec.ts` § create entry chooser.

**Architecture guardrails:** Keep `?template=` and `create-flow-convergence.mjs` for pilots; `verify:desk:fast` + `e2e:create-flow-convergence` green.

### Step 12 — Deploy-intent create wizard ✅

**Shipped (2026-06-04):** `?intent=deploy` (landing door 1) shows object-first **What scanners should see** fields (`#create-deploy-wizard`). Submit: **root+child** when no saved general root (`create-deploy-submit.mjs`); **Continue on Live** when root exists; **flat legacy** when standalone disclosure is open.

**Exit:** `worker/tests/create-deploy-wizard-core.test.ts` · `e2e/create-flow-convergence.spec.ts` deploy wizard assertions.

**Architecture guardrails:** Same child-object API + backup gate ([`child-object-backup-gate-core.mjs`](../site/js/child-object-backup-gate-core.mjs)); no new `object_type` without [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) promotion path.

### Step 13 — Hub “My objects” presentation ✅

**Shipped (2026-06-04):** Object-first hub groups — child object rows lead, compact **Your account** line follows (not @handle as title). `/wallet/` section **My objects**. Game season limits on Manage collapse until multi-root wallet or explicit season context (`hub-objects-presentation-core.mjs`).

**Exit:** `worker/tests/hub-objects-presentation-core.test.ts` · `worker/tests/created-hosted-entitlements-core.test.ts` (game season collapse).

**Architecture guardrails:** Children stay out of `hc_wallet` ([`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md)); nested rows still reconcile from `GET …/objects`.

### Step 14 — Organizer season entry ✅

**Shipped (2026-06-04):** `/create/?intent=game` → season-root wizard (organizer key on by default). Submit: **Continue season setup on Live** when a saved general root exists, else **Create season root & continue** → `/created/?focus=game-season-setup` (opens Live object hub + game node panel). Modules: `create-organizer-season-core.mjs`, `create-organizer-season-wizard.mjs`, `create-organizer-season-submit.mjs`, `created-game-season-setup-focus.mjs`.

**Exit:** `worker/tests/create-organizer-season-core.test.ts` · `e2e/create-flow-convergence.spec.ts` § organizer season entry.

**Architecture guardrails:** Self-serve seasons use browser mint only; terminal `city-game:mint-node` stays pilot/CI ([`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) § Cedar Rapids).

### Step 15 — Wear BYOP honest link ✅

**Shipped (2026-06-04):** `/shop/customize/` **Or print your own wear** → `/create/?intent=wear` (BYOP carrier split). Wear wizard emphasizes print-your-own garment; submit **Create card & print QR** or **Continue on Live** when a general root exists → `/created/?focus=wear-print` (opens **Print & share QR** on Live). Modules: `create-wear-wizard-core.mjs`, `create-wear-wizard.mjs`, `create-wear-submit.mjs`, `created-wear-print-focus.mjs`.

**Exit:** `worker/tests/create-wear-wizard-core.test.ts` · `e2e/create-flow-convergence.spec.ts` § wear BYOP.

**Architecture guardrails:** Same general-root create + root QR download path as merch funnel step 4; commerce `print_artifact` webhook unchanged; never paywall sign/publish/revoke.

### Step 20 — Steward UX presentation target (in progress)

**Status (2026-06-04):** Canonical **target spec** — [`STEWARD_UX_PRESENTATION_TARGET.md`](STEWARD_UX_PRESENTATION_TARGET.md). Steps 11–15 shipped front-door **routing**; Step 20 defines **room-native control** (deploy · wear · season + field kit), **Q1 decided** (one root default + dual skins + season-only fork), **room switcher**, **control vs device**, **five entry states**, **client steward state** model, **presentation policy** (add UI by room; lists show all children), and **capability-driven scan** templates. Protocol unchanged.

**Shipped:** Slice 1 — deploy vs season add-hub filter (`steward-presentation-policy-core.mjs`).

**Next slices:** Room switcher on `/created/`; add-vs-list policy; season create fork + honest beat; five entry states; season checklist + wear track chooser; season id off create.

**Exit (target):** WS-QUALITY Q3 comprehension — 5 steward sessions without room / keys confusion · room switcher + policy in UI tests · [`CORE_PRODUCT_LOOP.md`](CORE_PRODUCT_LOOP.md).

**Architecture guardrails:** No resolver fork; flat pilots and `?template=` remain for field kits; delegation (step 17) stays deferred with honest copy.

---

## Related

| Doc | Role |
|-----|------|
| `docs/STEWARD_UX_PRESENTATION_TARGET.md` | **Step 20** — room-native steward UX target (canonical) |
| `docs/PRODUCT_LANGUAGE_STRATEGY.md` | Plain vs precise policy; object model vocabulary |
| `docs/ROOT_CARD_AND_CHILD_OBJECTS.md` | Protocol truth + steps 19–20 presentation |
| `docs/SYSTEM_INVARIANTS.md` | Landing + create entry invariants |
| `docs/QR_DESIGN_SPACE.md` | Catalog roles (wedge · pilot · research) |
| `docs/MERCH_FUNNEL_MVP.md` | Create vs buy (carrier split) |
| `docs/LIVE_OBJECT_ARCHITECTURE.md` | Five layers — engineering map, not front door |
| `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md` | Vertical priorities + narrative stack |
| `docs/STATUS_PLATE_PILOT.md` | Pilot #1 (field QA — not homepage positioning) |
| `docs/LOST_ITEM_RELAY_PILOT.md` | Pilot #2 (field QA — not homepage positioning) |
| `docs/M5_STRANGER_TEST_RUNBOOK.md` | Proof loop exit gate (**passed** 2026-05-27) |
