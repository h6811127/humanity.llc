# Cedar Rapids city game — v1 implementation

**Status:** Active engineering brief (internal)  
**Target launch:** ~4 weeks after Glitch hoodie founding drop  
**Audience:** Product, resolver, frontend, operators, agents  
**Public narrative (unchanged until launch):**  
[`site/what-can-a-qr-do/physical-world-multiplayer/`](../site/what-can-a-qr-do/physical-world-multiplayer/) ·  
[`site/what-can-a-qr-do/combining-ideas/cedar-rapids-city-game/`](../site/what-can-a-qr-do/combining-ideas/cedar-rapids-city-game/) ·  
[`site/what-can-a-qr-do/living-street-infrastructure/`](../site/what-can-a-qr-do/living-street-infrastructure/)

**Research + privacy canon:** [`PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md`](PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md) · [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) · [`ORGANIZER_SIGNED_REVOKE_PILOT.md`](ORGANIZER_SIGNED_REVOKE_PILOT.md)

**Prerequisite wedge:** Tier 1 merch funnel live ([`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md)) — hoodies put live objects in the city before the season opens.

---

## One-sentence product

Over one weekend (stretchable to two weeks), Cedar Rapids becomes **programmable public space**: benches, river markers, relay arches, and café windows are **addressable live objects** whose signed state changes through play, stewardship, and care — without scan surveillance, player accounts, or a proprietary app.

This v1 **combines three research surfaces** into one shipped season:

| Research page | What v1 takes from it |
|---------------|----------------------|
| **Physical-world multiplayer** | Playable season, mythic roles on ordinary places, faction/territory/route/lore state, privacy-first design |
| **Cedar Rapids city game** | Full mechanic set (relay control, trust chains, cooperative unlocks, compromise, scarcity, coordination puzzles), concrete scan views, neighborhood footprint |
| **Living street infrastructure** | Addressable civic objects, care/maintenance truth, local belonging/landmark identity, guestbook-style narrative — the **persistent layer** beneath the weekend game |

The QR is not the game. The QR is the **physical handle** for live public object state.

---

## What players experience (full vision → v1 slice)

### Full vision (all three pages)

Players walk a city where:

- **Ordinary places have mythic roles** — bench as district gate, mural as lore archive, café window as sanctuary, trail marker as route splitter, alley arch as finale switch.
- **Public state changes in real time** — faction holds, truce windows, rotating bulletins, weather-only routes, temporary 48-hour drops, compromise notices, collective unlocks.
- **Cooperation beats exploitation** — public goods thresholds, anti-hoarding, vouch-gated paths, prisoner’s-dilemma choices, scarcity without dossiers, coordination fragments across neighborhoods.
- **Place stays honest** — maintainer/care streams publish repair, closure, flood, and safety truth; game copy never overrides care truth.
- **Infrastructure persists after the season** — benches keep landmark identity, guestbook notes, and civic state; game layers can sleep while objects remain addressable.

### v1 shipped slice (Season 1 — “Wake the city”)

Ship the **full scan UX model** for a **narrow footprint** (~15 nodes, 3 districts + river spine), with **manual operator control** for most state transitions and **automated rules** only where privacy-safe:

| Shipped in v1 | Phase 2 (same season, post-launch) |
|---------------|-------------------------------------|
| 15 signed game nodes + rules page | Expand to 25+ nodes |
| 5 node role templates on scan UI | Weather-mode automation |
| Game-operator signed state updates | Player-initiated faction capture (signed client action) |
| Time-windowed routes & event windows | Anonymous collective thresholds (policy-approved design) |
| Maintainer/care stream on every node | Issue-report → maintainer workflow |
| Trust/vouch display (read vouch graph) | Vouch-gated unlock automation |
| Compromise + rekey (operator flip) | Spy/compromise player actions |
| Revoke/pause any compromised marker | Prisoner’s-dilemma choice tokens |
| Mobile lore nodes (Glitch hoodies) | Full three-way fragment lattice auto-resolve |
| Living-infrastructure identity on 3 “permanent” benches | Public guestbook writes |

**Design rule:** v1 must **feel** like the Cedar Rapids demo pages on scan — even when operators flip state manually behind the scenes.

---

## Cedar Rapids Season 1 footprint

**Codename:** `cr_season_01_wake`  
**Window (target):** Fri 18:00 → Sun 22:00 local (extendable to 10 days)  
**Districts:** NewBo · Czech Village · Greene Square · River spine · Downtown core  
**Node count:** 15 primary + optional mobile hoodie nodes

### Node registry

| ID | Place (working label) | Role | Living-infra layer | Primary mechanics |
|----|----------------------|------|--------------------|-------------------|
| `node_01` | NewBo relay arch | **Relay / gate** | Landmark + event notice | District control, rotating bulletin, truce timer, compromise |
| `node_02` | NewBo café window | **Sanctuary** | Belonging (“ treaty bench”) | No capture, regroup point, rumors board |
| `node_03` | NewBo mural alley | **Lore archive** | Public history fragment | Chapter unlock, nightfall oath, artist note |
| `node_04` | Riverwalk River Lantern | **Temp drop** | Civic sensor (trail open) | 48h window, collective progress display, unlocks `node_07` |
| `node_05` | 16th Avenue bridge | **Relay / edge** | Care (physically open) | Compromise state, rekey, neutral capture while warning live |
| `node_06` | Skywalk note | **Route / weather** | Event nearby | Weather-only clue, sunset pass gate |
| `node_07` | Czech Village cabinet | **Lore / trust gate** | Hidden landmark | Vouch-required, private-vs-shared choice copy |
| `node_08` | Czech Village square bench | **Gate + belonging** | “Chess bench” identity | Faction hold, guestbook line, maintenance pause |
| `node_09` | Czech Village mural | **Lore archive** | Artist place stream | Fragment 1 of 3 coordination puzzle |
| `node_10` | CR Public Library witness | **Witness / trust issuer** | Institution hours | Scarcity passes, vouch for `node_07`, event expiry |
| `node_11` | Greene Square marker | **Route splitter** | Trail / plaza notice | Fragment 2 of 3, sunrise-only bonus copy |
| `node_12` | Greene Square bench | **Sanctuary / gate** | Grief or sunset bench | Soft capture rules, local belonging chip |
| `node_13` | Downtown alley arch | **Finale switch** | — | Dormant until 3 districts “healed” (operator flip) |
| `node_14` | River fountain / rain garden | **Care loop** | Maintenance discovery | Report path, repair reopens route (maintainer stream wins) |
| `node_15` | Downtown market steps | **Relay / gate** | Community notice | Lantern Ward reclaim narrative, route hint |

**Mobile nodes (optional, no new mint required):** Glitch hoodie `print_artifact` QRs enrolled in season config as **`role: mobile_lore`** — rotating pseudonym / status line visible on scan; can hold fragment 3 or courier-drop hints.

### Three roles (minimum taxonomy)

Every node maps to one **primary role** for scan layout and operator tooling:

| Role | Scan hero pattern | Example nodes |
|------|-------------------|---------------|
| **Gate / relay** | Controller · relay status · bulletin · capture/truce window | `node_01`, `node_05`, `node_15` |
| **Lore archive** | Chapter · message · fragment · unlock conditions | `node_03`, `node_07`, `node_09` |
| **Sanctuary** | Treaty zone · no capture · regroup / rumors | `node_02`, `node_12` |

Secondary tags (combine on any node): **witness**, **temp drop**, **route splitter**, **finale**, **care loop**, **mobile lore**.

---

## Authority model (four streams)

Different truths come from different signers. **Care/maintenance always wins** in scan copy when streams conflict ([`games-maintenance` demo](../site/what-can-a-qr-do/combining-ideas/games-maintenance/)).

| Stream | Signer (v1) | May publish | Must not claim |
|--------|-------------|-------------|----------------|
| **Game** | Game-operator key (`game_operator_public_key` on season root) | Faction hold, bulletins, route windows, lore, compromise, scarcity counters, unlock flags | Safety certification, legal identity, ownership proof |
| **Care / maintainer** | Place steward or game-operator acting as maintainer | Pause, repair verified, closure, flood, cleanup | Faction outcomes, player scores |
| **Place / artist** | Root owner of child object or delegated place steward | Landmark name, guestbook line, history note, local canon | Emergency readiness |
| **Lifecycle** | Root owner, recovery, or organizer revoke key | active · paused · revoked | Gameplay legitimacy beyond exposing state |

**v1 implementation:** extend the existing organizer key pattern ([`ORGANIZER_SIGNED_REVOKE_PILOT.md`](ORGANIZER_SIGNED_REVOKE_PILOT.md)) to **game-operator signed updates** on `game_node` child objects — not only `organizer_revoked`.

---

## Object state model

### Shipped fields (per node)

Each season node is a **`child_object`** with `object_type: "game_node"` and a signed document containing:

```json
{
  "type": "child_object",
  "object_type": "game_node",
  "object_id": "obj_cr_node_01",
  "profile_id": "<season_root_profile_id>",
  "public_label": "NewBo relay arch",
  "status": "active",
  "season_id": "cr_season_01_wake",
  "node_role": "relay_gate",
  "district": "newbo",
  "object_streams": [
    { "id": "territory", "class": "place", "label": "Controller", "value": "Red team" },
    { "id": "relay", "class": "route", "label": "Relay status", "value": "Open · 18 min" },
    { "id": "bulletin", "class": "narrative", "label": "Bulletin", "value": "Shift west…" },
    { "id": "care", "class": "care", "label": "Site", "value": "Clear · mural wall OK" }
  ],
  "game_meta": {
    "visible_until": "2026-06-14T22:00:00-05:00",
    "compromised": false,
    "collective_progress": null,
    "collective_target": null,
    "unlocked_by": [],
    "vouch_requires": [],
    "scarcity_remaining": null,
    "fragment_id": null
  }
}
```

**Note:** Today `object_streams` allows max **4** rows ([`object-streams-core.mjs`](../site/js/object-streams-core.mjs)). Season nodes need **display priority**, not more rows — map the Cedar Rapids “card chain” (district, relay, trust, scarcity, choice, sybil) into:

1. **`object_streams`** — the four lines strangers read first (territory, route, narrative, care).
2. **`game_meta`** — machine-readable rules state (operator-signed, not shown as raw JSON on scan).
3. **Season config** — cross-node unlock graph (which `object_id` unlocks which).

Engineering task: add `game_meta` to child object validation when `object_type === "game_node"`.

### State classes (full catalog → v1)

| Class | Example values | v1 |
|-------|----------------|-----|
| **Territory** | unclaimed, held_by_red, sanctuary_until_dawn | ✓ operator flip |
| **Narrative** | chapter_4_live, rumor_active, artist_note | ✓ |
| **Route** | open, rerouted, sunrise_only, weather_mode | ✓ time windows |
| **Lifecycle** | active, paused, revoked | ✓ existing primitive |
| **Care** | report_open, repair_verified, maintenance_pause | ✓ maintainer stream |
| **Trust** | vouch_active_for, witness_seal_live | ✓ read-only display v1 |
| **Scarcity** | N passes before sunset | ✓ operator decrement v1 |
| **Compromise** | relay_poisoned, rekey_pending | ✓ operator flip |
| **Collective** | 20/20 anonymous scans | ⚠ phase 2 — see privacy § |
| **Choice** | private reveal vs shared ending | Copy only v1; tokens phase 2 |

---

## Mechanics catalog (full functionality map)

From **Cedar Rapids** + **physical-world multiplayer** + **living street infrastructure**. Each mechanic lists v1 delivery mode.

| Mechanic | Source | v1 delivery |
|----------|--------|-------------|
| **Relay control + bulletins** | CR · NewBo arch | Game-operator updates `object_streams` + `game_meta.compromised` |
| **Sanctuary / treaty zones** | PWM · café window | Role template: capture disabled copy, rumors chip |
| **Temp 48h objects** | CR · Riverwalk | `game_meta.visible_until` + auto-hide scan hero when expired |
| **Faction territory** | PWM · LSI games §4 | `place` stream Controller field |
| **Rotating / weather-aware routes** | PWM · trail marker | `route` stream + operator schedule or manual flip |
| **Public goods threshold** | CR · River Lantern | Phase 2 — requires privacy design (§ below) |
| **Anti-hoarding** | CR rules | Copy + operator unlock when “shared enough” (honor system + manual) |
| **Trust / vouch chains** | CR · cabinet, library | Display `vouch_requires` / active vouches from existing vouch graph |
| **Compromise + rekey** | CR · bridge | Operator sets `compromised: true`; rekey clears + new bulletin |
| **Scarcity passes** | CR · library witness | `game_meta.scarcity_remaining` operator decrement |
| **Coordination fragments** | CR · 3 districts | Season config graph; operator flips finale when 3/3 met |
| **Prisoner’s dilemma choice** | CR rules | Scan copy presents choice; outcome operator-published |
| **Sybil resistance** | CR policy callout | Rate limits on any future token endpoints; device-local cooldown copy |
| **Care loop / repair unlock** | PWM · games-maintenance | `care` stream pause → repair → operator reopens route |
| **Discovery rewards attention** | PWM · maintenance combo | Lore for noticing fountain/trail/mural state |
| **Landmark belonging** | LSI §3 | Persistent `public_label` + narrative chip (“chess bench”) |
| **Civic sensor (non-surveillance)** | LSI §2 | `care` stream: clean / broken / needs maintenance / event nearby |
| **Guestbook / public memory** | LSI §1 | Phase 2 signed note append (or operator-curated line v1) |
| **Mobile hoodie lore nodes** | Merch wedge | Enroll `print_artifact` in season; owner updates status line |
| **Clean revoke compromised marker** | PWM · CR | Existing revoke + `paused` lifecycle |

---

## Game theory (first-class design constraint)

**Rule for Season 1:** every shipped mechanic must answer two questions before it lands in code or copy:

1. **Why is cooperation at least as rewarding as hoarding?** (anti-exploitation)
2. **What public object state changes — not who did what?** (privacy)

This is not gamification layered on scans. The Cedar Rapids season is a **coordination sandbox**: players change what the city *displays*, not a private scoreboard. Game theory from the research pages is **required in v1**, not deferred to “balance later.”

### Core principle

> The strongest move should help the city wake up together.

If hiding a clue, spam-scanning, or solo-farming gives a strictly better outcome than sharing, the mechanic does not ship — even as operator-manual v1.

### Mechanic → theory → node → implementation

| Game theory pattern | Player-facing behavior | Cedar Rapids node(s) | v1 implementation | Dominant-strategy check |
|---------------------|------------------------|----------------------|---------------------|-------------------------|
| **Public goods** | Object wakes only after collective contribution | `node_04` River Lantern | Operator verifies quorum → sets `unlocked_by` → unlocks `node_07` in season config | Hoarding delays **everyone’s** next chapter, including the first finder |
| **Anti-hoarding** | First finder gets seed clue; object **evolves** only after more scans/shares | `node_04`, `node_07` | Scan copy: seed vs evolved state; operator flips evolved bulletin when “shared enough” | Seed clue without evolution is incomplete; sharing completes the puzzle |
| **Trust / vouch gate** | Deeper path requires legitimacy from a place-linked object, not legal ID | `node_07` cabinet, `node_10` library witness | `game_meta.vouch_requires` + read vouch graph on scan; no account | Solo players hit a wall; cooperation with local institutions opens the path |
| **Prisoner’s dilemma** | Private small win now vs delayed shared better ending | `node_07` cabinet | Scan presents both outcomes in copy; operator publishes ending state on schedule | Shared ending is strictly richer in lore + route unlock (document in rules page) |
| **Scarcity without surveillance** | Limited passes / sunset dormancy — not “only you may scan” | `node_10` library witness | `game_meta.scarcity_remaining` decremented by operator; auto-dormant at 0 | Scarcity is on **object capacity**, not player identity |
| **Coordination game** | Fragments in three districts combine into finale | `node_09`, `node_11`, `node_13` | Season config `unlock_edges`; finale flip requires 3/3 fragments in `game_meta` | No single node completes the lattice; groups must coordinate |
| **Relay / territory (limited conflict)** | Faction holds public bulletin, not chat logs | `node_01`, `node_05`, `node_15` | `place` stream Controller + narrative bulletin; sanctuary nodes exempt | Capturing relays is visible; sanctuaries (`node_02`, `node_12`) reward regroup over endless PvP |
| **Compromise / rekey** | Poisoned relay state visible; recovery by rotation not dossiers | `node_05` bridge | `game_meta.compromised` + care stream still shows bridge physically open | Teams recover by **public rekey**, not by reading scan logs |
| **Sybil resistance** | Spam does not inflate collective progress | All token-gated mechanics (phase 2) | v1: operator quorum; phase 2: rate-limited tokens + device-local ceilings | Fake participation wastes time without moving shared state |
| **Care loop (stewardship)** | Discovery rewards attention; maintenance truth wins | `node_14` fountain | `care` stream pauses game; repair reopens route — maintenance stream overrides game | Exploiting “inspect AED” angles blocked; real stewards sign care |

### What we deliberately do **not** optimize

| Anti-pattern | Why it violates game theory here |
|--------------|----------------------------------|
| Individual XP / levels | Creates hoarding and grinds; no public goods |
| Leaderboards from scan counts | Surveillance + selfish optimization |
| “First to scan wins forever” | Anti-hoarding failure |
| Faction zerg without sanctuaries | No regroup or treaty space |
| Player-signed safety state | Wrong authority; breaks care-loop honesty |

### Season 1 game-theory acceptance tests

Before launch, each must pass with 5 un coached testers (extend [`FOUNDING_COPY_COMPREHENSION_RUNBOOK.md`](FOUNDING_COPY_COMPREHENSION_RUNBOOK.md) pattern):

- [ ] **GT-1 Public goods:** Testers describe River Lantern unlock as “we unlocked it together,” not “I won.”
- [ ] **GT-2 Anti-hoarding:** Testers say sharing the seed clue helps the group, not hurts them.
- [ ] **GT-3 Sanctuary:** Testers identify café/bench nodes as non-capture regroup zones.
- [ ] **GT-4 Dilemma:** Testers understand private vs shared ending tradeoff on cabinet scan without account signup.
- [ ] **GT-5 Care wins:** When care stream says paused, testers do not treat game bulletins as safety truth.
- [ ] **GT-6 No score anxiety:** Testers cannot name a personal rank, streak, or scan count displayed anywhere.

### Engineering implications (game theory → code)

| Layer | Game-theory requirement |
|-------|-------------------------|
| **`game_meta`** | Fields must support **shared** state (`collective_*`, `unlocked_by`, `fragment_id`, `scarcity_remaining`) — never `player_id` |
| **Scan copy** | Role templates explain **dominant cooperative move** (“share outward to evolve this node”) |
| **Season config** | `unlock_edges` encode coordination puzzles, not solo gates |
| **Operator UI (Phase B)** | Flips document *world* state (“quorum met”), not player rewards |
| **Rules page (launch)** | Plain-language payoff matrix for dilemma nodes + public-goods nodes |
| **Tests** | Add `city-game-game-theory.test.ts` — assert scan templates never render leaderboard/XP strings |

Phase 2 automated thresholds must pass the same dominant-strategy review before enabling `CITY_GAME_ENABLED` copy that promises automatic collective unlocks.

---

## Privacy and data policy (hard boundaries)

Non-negotiable per [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) and all three research pages.

### Must not ship (v1 or ever without governance)

- Per-scan trails, heatmaps, “42 players visited today” from hidden logs
- Location history, device fingerprinting, player profiles
- Phone/email required to scan or play
- Silent access logging expansion
- Players marking emergency or safety equipment “safe”
- Game rewards for inspecting safety-critical systems
- Scan notifications to stewards for passive scans

### Allowed public truth

- Which faction holds a node, whether a route/chapter/sanctuary is live
- Whether a marker is active, paused, revoked, compromised
- Aggregate collective progress **only if** implementable without per-scan identity storage (see phase 2 RFC below)
- Maintainer-signed care state

### Collective threshold — phase 2 RFC (do not naï-ship)

The Cedar Rapids demo assumes “20 anonymous scans unlock clue.” Options that preserve policy:

1. **Operator-published unlock** — stewards verify quorum physically, flip `unlocked_by` (v1 acceptable hack).
2. **Opt-in proof-of-scan token** — client requests short-lived HMAC token; resolver stores **count only**, rate-limited, no identity (engineering spike required).
3. **One-time physical code** at site — players enter code at scan; counts toward quorum without scan logging.

**v1 uses (1)** for River Lantern node. Spike (2) or (3) before advertising automatic thresholds publicly.

---

## Architecture

### Reuse (already shipped)

| Capability | Location |
|------------|----------|
| Child objects + QR mint | `worker/src/resolver/child-objects.ts`, `issue-child-object-qr.ts` |
| `object_streams` on scan | `worker/src/resolver/scan-status.ts`, `scan-html.ts` |
| Organizer signed revoke | `worker/src/resolver/revoke.ts`, `issuer_public_key` |
| Vouch graph (read) | verification / vouch surfaces on scan |
| Feature-flag pattern | `HOSTED_STEWARD_ENABLED` precedent in `worker/src/steward/` |
| Public research UX target | Cedar Rapids demo HTML (layout reference) |

### New (v1 engineering)

| Component | Description |
|-----------|-------------|
| **`CITY_GAME_ENABLED`** | Worker env + season gate on scan template |
| **`game_node` object type** | Validation, hub row meta, scan template branch |
| **`game_meta` on child document** | Season rules state (see schema above) |
| **`POST …/game-update`** | Game-operator signed update (extends issuer key) |
| **Season config** | `site/data/city-game-cr-season-01.json` (or D1 `seasons` table) — node list, unlock graph, dates, rules URL |
| **Scan template `game_node`** | Multi-stream layout matching CR demo scan views |
| **Operator UI** | `/game-operator/` — flip state, compromise, scarcity, unlock finale |
| **Public rules page** | `/play/cedar-rapids/` at launch — not before |
| **Tests** | Auth boundaries, care-wins-conflict, expired temp drop, revoke mid-season |

### Scan precedence (conflict resolution)

```text
1. Lifecycle revoked/paused → show revoke/pause truth (stop game copy)
2. Care stream maintenance_pause / closure → show care hero (game copy muted)
3. game_meta.visible_until past → object dormant copy
4. Game streams → role template (gate / lore / sanctuary)
5. Place/belonging chips → living infrastructure layer
```

---

## Engineering phases

Run **in parallel** with hoodie launch prep. Do not block merch on game work.

### Phase A — Protocol (week 1–2, pre-hoodie launch)

- [x] Season root card + game-operator keypair (operator custody doc) — [`CITY_GAME_OPERATOR_CUSTODY.md`](CITY_GAME_OPERATOR_CUSTODY.md) · `npm run city-game:season-root`
- [x] `game_node` child object create/mint script (`npm run city-game:mint-node`)
- [x] `game_meta` validation + `POST …/game-update` handler
- [x] `CITY_GAME_ENABLED=0` in prod; local/staging on
- [x] Unit tests: game-operator cannot owner-revoke; care conflict trumps bulletin *(game-update scope + flag tests in `city-game.test.ts`)*

### Phase B — Internal prototype (week 2–3)

- [x] Mint 3 test nodes (`node_01`, `node_04`, `node_07`) — templates in `worker/tests/fixtures/city-game-node-templates.json` · `npm run city-game:mint-node -- --all-test`
- [x] Scan template branch renders Cedar Rapids-style blocks (`worker/src/city-game/scan-view.ts`, `scan-html.ts`)
- [x] `/game-operator/` manual flip UI (session-only private key)
- [x] Season config JSON with unlock edge `node_04 → node_07`

### Phase C — Season pack (week 3–4, post-hoodie)

- [x] Mint full 15-node registry — `npm run city-game:mint-node -- --all` · object IDs in season JSON
- [ ] Enroll 5–10 Glitch hoodie QRs as mobile lore (optional) — `mobile_lore_enrollment[]` in season JSON
- [x] Public rules page draft — [`/play/cedar-rapids/`](../site/play/cedar-rapids/index.html) (noindex until launch)
- [ ] Physical install QA: scan ≥3 phones per node
- [x] Operator runbook — [`CITY_GAME_OPERATOR_RUNBOOK.md`](CITY_GAME_OPERATOR_RUNBOOK.md)

### Phase D — Launch (~month after hoodie)

- [ ] `CITY_GAME_ENABLED=1` + season dates active
- [ ] Remove “research demo” banner from Cedar Rapids pages; link to live rules
- [ ] Monitor: no scan logging enabled; support macros for revoked/clue nodes
- [ ] Post-season: objects revert to `paused` or living-infrastructure mode

---

## Launch gates (all required)

### Product / trust

- [ ] [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) — collective mechanic v1 path documented (operator flip OK)
- [ ] Rules page states what scans prove / do not prove
- [ ] Care stream present on every node with physical safety copy where needed
- [ ] Forbidden: leaderboard, XP, player accounts, heatmaps
- [ ] Copy comprehension ≥5 testers ([`FOUNDING_COPY_COMPREHENSION_RUNBOOK.md`](FOUNDING_COPY_COMPREHENSION_RUNBOOK.md) pattern)

### Engineering

- [ ] `npm run worker:test -- worker/tests/city-game*.test.ts` green
- [ ] Feature flag off by default in prod until launch checklist signed
- [ ] Compromised marker revoke tested end-to-end
- [ ] Temp drop expiry hides game hero without 404 on QR

### Operations

- [ ] Game-operator key in operator custody ([`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) pattern — separate brief)
- [ ] Node install map + steward contacts for `node_14` care loop
- [ ] Weekend operator schedule (manual bulletin rotation)

---

## Public surfaces (what goes on the website)

| When | URL / surface | Content |
|------|---------------|---------|
| **Now → hoodie launch** | Existing research pages | “In development” hints on PWM, Cedar Rapids demo, living street, and `what-can-a-qr-do.html` — honest teaser, not live gameplay |
| **Game launch** | `/play/cedar-rapids/` | Rules, dates, privacy, what scans prove |
| **Game launch** | Live scan pages on `/c/…` | Real resolver-backed game template |
| **Game launch** | Research pages | Update banners → link to live season |
| **Never public** | Full operator node spreadsheet, keys, manual flip procedures | Internal / operator doc only |

---

## Explicitly disallowed in v1

Do not ship these in Season 1 even if tempting:

- City-wide saturation beyond 15 primary nodes
- Resolver-backed player inventory or persistent player IDs
- Automatic geofence enforcement (“prove you were here” beyond camera scan)
- Heatmaps, visit counts from access logs, streak systems
- Anti-cheat via device fingerprinting
- App-only economy or proprietary app requirement
- Delegated child signing keys ([`DELEGATED_CHILD_CAPABILITIES_GATE.md`](DELEGATED_CHILD_CAPABILITIES_GATE.md) — still deferred)
- Guestbook append without moderation story
- Players editing maintainer or safety streams
- Requiring Humanity Card create to read public game state

---

## Success criteria

From [`PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md`](PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md) plus combined vision:

- [ ] Stranger understands public-state model in &lt;30s without app tutorial
- [ ] Privacy review explains design without hand-waving (no hidden scan analytics)
- [ ] Compromised sticker revoked cleanly; scan shows paused/revoked truth
- [ ] Maintenance pause on fountain node suppresses game bulletins
- [ ] At least one coordination beat completes (river → cabinet unlock via operator or configured graph)
- [ ] At least 3 “living infrastructure” benches retain landmark copy after game ends
- [ ] Glitch hoodie scans participate in season without separate product SKU

---

## Open questions

| # | Question | Owner | Decision by |
|---|----------|-------|-------------|
| Q1 | Season root: dedicated `profile_id` vs founder root card? | Product | Phase A start |
| Q2 | Collective threshold: operator-only v1 vs token spike? | Product + privacy | Phase B |
| Q3 | Guestbook: operator-curated line v1 vs signed append v2? | Product | Phase C |
| Q4 | Faction capture: pure operator vs client-signed capture action? | Protocol | Phase 2 |
| Q5 | Post-season: pause all nodes vs leave living-infra subset active? | Product | Launch −1 week |
| Q6 | Business vouch: manual enrollment for Czech Village café? | Ops | Phase C |

---

## Related

| Doc / path | Role |
|------------|------|
| [`PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md`](PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md) | Research canon + privacy |
| [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) | Hoodie wedge timeline |
| [`MANIFESTO_STATUS_UPDATE.md`](MANIFESTO_STATUS_UPDATE.md) | Owner-signed live state |
| [`ORGANIZER_SIGNED_REVOKE_PILOT.md`](ORGANIZER_SIGNED_REVOKE_PILOT.md) | Closest shipped authority primitive |
| [`site/what-can-a-qr-do/combining-ideas/games-maintenance/`](../site/what-can-a-qr-do/combining-ideas/games-maintenance/) | Care vs play conflict UX |
| [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md) | Active work registry — add city-game stream when Phase A starts |

---

## Changelog

| Date | Event |
|------|-------|
| 2026-06-01 | Initial v1 implementation brief — combines PWM + Cedar Rapids + living street infrastructure |
| 2026-06-01 | Phase B prototype — game_node scan template, `/game-operator/` UI, test node mint templates |
| 2026-06-01 | Phase C season pack — 15-node registry, custody doc, operator runbook, rules page draft |
