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

**Feature page canon:** Every bullet on the public feature pages is tracked in [**§ Feature page traceability**](#feature-page-traceability-complete-catalog) below — nothing on those pages is omitted from the implementation plan. Page copy may read as “live today”; engineering status is the **Delivery** and **Rollout** columns in that table.

**Rollout footprint:** **S1** launch = 15 nodes · **S2** = 25 nodes · **S3** = **50 nodes** (product-approved expansion — same season config pattern, more places per mechanic).

**Build process:** Architecture alignment, risks **R-01–R-18**, and release gates **B1–B11** — [**§ Architecture**](#architecture) (subsections *Alignment*, *Risks*, *Build process*). Invariants: [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) § Cedar Rapids city game.

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

### Rollout phases (15 → 25 → 50 nodes)

The feature pages describe the **full city-game OS**. Season engineering rolls out in three footprints on the same protocol — see [**§ Feature page traceability**](#feature-page-traceability-complete-catalog) for every page bullet.

| Phase | Nodes | Goal |
|-------|-------|------|
| **S1 — Launch** | **15** | Spine + scan UX for every **S1** row in the traceability table; human gates in [`CITY_GAME_LAUNCH_CHECKLIST.md`](CITY_GAME_LAUNCH_CHECKLIST.md) |
| **S2 — Expand** | **25** | Density: second witnesses, extra sanctuaries, route-splitter pairs, operator bulletin schedule without adding new protocol |
| **S3 — Full footprint** | **50** | **≥1 dedicated node** (or mobile lore slot) per mechanic that needs place embodiment; policy-only rows stay platform-wide |

**Delivery legend (traceability table):**

| Code | Meaning |
|------|---------|
| **L** | Live resolver — automated (`game-contribute`, unlock evaluator, season window, care override) |
| **O** | Operator / game-operator signed `game-update` |
| **C** | Scan copy + streams only — no dedicated state machine yet |
| **P** | Platform policy / existing revoke primitive — not `game_node`-specific |

**Design rule:** At each rollout phase, scan must **feel** like the feature pages for mechanics marked **L** or **O** at that phase — honest banners until [`city-game:launch-surfaces`](CITY_GAME_LAUNCH_CHECKLIST.md) `--apply`.

**Autonomous spine:** [`CITY_GAME_AUTONOMOUS_V1.md`](CITY_GAME_AUTONOMOUS_V1.md) — smallest **L**-only weekend path (`node_04` → `node_07` → fragments → `node_13`). Rows marked **O** at S1 may move to **L** in S2/S3 without changing public page copy.

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
| **Scarcity** | N passes before sunset | ✓ **L** — contribute + device ceiling (CR-G05) |
| **Compromise** | relay_poisoned, rekey_pending | ✓ **O** — operator flip (CR-C01) |
| **Collective** | 20/20 anonymous scans | ✓ **L** — site-code contribute (CR-G01) |
| **Choice** | private reveal vs shared ending | **C** at S1; **L** target S3 (CR-G04) |

---

## Feature page traceability (complete catalog)

**Sources (public):**

- [`site/what-can-a-qr-do/combining-ideas/cedar-rapids-city-game/`](../site/what-can-a-qr-do/combining-ideas/cedar-rapids-city-game/) — **CR-***
- [`site/what-can-a-qr-do/physical-world-multiplayer/`](../site/what-can-a-qr-do/physical-world-multiplayer/) — **PWM-***

**Living street** bullets that appear only on the third research page remain in [`PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md`](PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md); overlapping rows are tagged **LSI** in the Notes column.

**How to use:** Product assigns **S1/S2/S3** per row before minting. Engineering implements **Delivery**; QA maps install QA + GT runbook to row IDs. Do not delete rows when deferring — change Delivery from **L**/**O** to **C** and move Rollout right.

### Cedar Rapids city game page

| ID | Page section | Feature (from public copy) | Delivery (target) | S1 | S2 | S3 | Primary nodes / proof |
|----|--------------|---------------------------|-------------------|----|----|-----|------------------------|
| CR-E01 | Evolving objects | Riverwalk QR wakes a **48h temporary object** | **L** | ✓ | ✓ | ✓ | `node_04` · `visible_until` · `city-game-launch-gates` |
| CR-E02 | Evolving objects | Objects **rotate messages, clues, or weather-aware states** | **O** → **L** | C | O | L | S1: operator bulletin; S3: schedule engine · `node_06` weather copy |
| CR-E03 | Evolving objects | Stewards **revoke or pause** when physical space changes | **P** + **L** care | ✓ | ✓ | ✓ | lifecycle revoke + care pause · `node_14` |
| CR-R01 | Relay control | Relay arches show **district control + rotating signed bulletins** | **O** | ✓ | ✓ | ✓ | `node_01`, `node_15` · `place` + `bulletin` streams |
| CR-R02 | Relay control | **Truce / meetup windows** on neutral zones | **O** | C | O | O | `node_02`, `node_12` sanctuary · stream copy |
| CR-R03 | Relay control | **Courier drops** on relays / mobile lore | **O** | C | O | ✓ | S3: mobile lore enrollment · `npm run city-game:enroll-mobile-lore` |
| CR-R04 | Relay control | Owning a node changes **public space, not private chat** | **P** | ✓ | ✓ | ✓ | rules page + scan foot · `city-game-game-theory.test.ts` |
| CR-T01 | Trust chains | **One object unlocks another** (e.g. river → cabinet) | **L** | ✓ | ✓ | ✓ | `unlock_edges` · `node_04`→`node_07` · `unlock-evaluator` |
| CR-T02 | Trust chains | **Voluntary contributions** with site code raise quorum | **L** | ✓ | ✓ | ✓ | `game-contribute` · `contribute_codes` |
| CR-T03 | Trust chains | Path requires **vouch** from witness, **business, or steward** | **L** partial | ✓ | ✓ | ✓ | S1: `node_10` witness · S3: add `node_02` café business vouch (Q6) |
| CR-C01 | Compromise | **Spy jam / poison** relay via signed compromise notice | **O** | ✓ | ✓ | ✓ | `game_meta.compromised` · `node_05` |
| CR-C02 | Compromise | Scan shows **trust state, not per-player access log** | **P** | ✓ | ✓ | ✓ | `REFERENCE_OPERATOR_DATA_POLICY` · no scan analytics |
| CR-C03 | Compromise | **Rekey or revoke** clears relay without scan history | **O** + **P** | ✓ | ✓ | ✓ | game-update rekey · organizer revoke |
| CR-G01 | Rule design | **Public goods** — shared threshold (e.g. 20 contributions) | **L** | ✓ | ✓ | ✓ | `node_04` collective_progress/target |
| CR-G02 | Rule design | **Anti-hoarding** — seed clue evolves after group shares | **O** → **L** | C | O | L | S1: copy on `node_04`/`node_07`; S3: auto “evolved” bulletin on quorum band |
| CR-G03 | Rule design | **Trust / vouch** without legal identity | **L** read + **L** issue | ✓ | ✓ | ✓ | `vouch-graph` · witness scarcity contribute |
| CR-G04 | Rule design | **Prisoner’s dilemma** — private now vs shared ending | **C** → **L** | C | C | L | S1: `node_07` choice stream copy; S3: choice tokens + branch state |
| CR-G05 | Rule design | **Scarcity** — expiring clues, sunset pass limits | **L** | ✓ | ✓ | ✓ | `node_10` · `scan-game-scarcity-ceiling-core` |
| CR-G06 | Rule design | **Sybil resistance** — codes, rate limits, tokens, vouches, device limits | **L** partial | ✓ | ✓ | ✓ | S1: site codes + IP limit + device ceiling; S3: optional one-time token spike |
| CR-G07 | Rule design | **Coordination fragments** across three districts | **L** | ✓ | ✓ | ✓ | `node_01`, `node_09`, `node_11` → `node_13` |
| CR-M01 | Live map flavor | Lantern hit quorum → next clue woke | **C** → **O** | C | C | O | S3: season bulletin feed or `/play/` ticker — not scan logging |
| CR-M02 | Live map flavor | Faction reclaimed relay + rotating bulletin | **O** | ✓ | ✓ | ✓ | operator narrative · `node_01` |
| CR-M03 | Live map flavor | Cabinet **evolved after first finder shared** | **O** | C | O | L | ties CR-G02 |
| CR-M04 | Live map flavor | Bridge **compromised until rekey** | **O** | ✓ | ✓ | ✓ | `node_05` |
| CR-M05 | Live map flavor | Skywalk **shared ending** unlocked | **C** | C | O | L | `node_06` · dilemma + route window |
| CR-M06 | Live map flavor | **Third fragment** completed lattice | **L** | ✓ | ✓ | ✓ | finale evaluator |
| CR-M07 | Live map flavor | Witness **final sunset pass** then closed | **L** | ✓ | ✓ | ✓ | scarcity depletion on `node_10` |
| CR-SV01 | Scan · NewBo | Scanner sees controller, relay window, bulletin | **L** + **O** | ✓ | ✓ | ✓ | relay_gate template · `node_01` |
| CR-SV02 | Scan · NewBo | Card chain: district, relay, **courier**, steward streams | **O** | ✓ | ✓ | ✓ | `object_streams` on templates |
| CR-SV03 | Scan · NewBo | **Safety / cleanup outranks** relay copy | **L** | ✓ | ✓ | ✓ | care pause regex · `scan-view.ts` |
| CR-SV04 | Scan · Riverwalk | Collective progress, unlock, steward trail note | **L** | ✓ | ✓ | ✓ | `node_04` |
| CR-SV05 | Scan · Riverwalk | **Anti-hoarding** + public-goods streams on card chain | **L** + **C** | ✓ | ✓ | ✓ | streams + contribute UI |
| CR-SV06 | Scan · Riverwalk | Threshold **anonymous**; stewards pause cleanly | **P** + **L** | ✓ | ✓ | ✓ | count-only bucket policy |
| CR-SV07 | Scan · Bridge | **Compromised** relay, neutral capture, rekey path | **O** | ✓ | ✓ | ✓ | `node_05` |
| CR-SV08 | Scan · Bridge | **Decoy clue** + immediate compromised visibility | **O** | ✓ | ✓ | ✓ | operator drill · compromise copy |
| CR-SV09 | Scan · Cabinet | Unlocked by river; **multi-vouch**; dilemma choice | **L** + **C** | ✓ | ✓ | ✓ | `node_07` |
| CR-SV10 | Scan · Cabinet | **Neighborhood lore** signed without social graphs | **C** | C | O | L | S3: guestbook append (LSI) |
| CR-SV11 | Scan · Witness | Active vouch, scarcity, **event expiry**, rain mode | **L** + **O** | ✓ | ✓ | ✓ | `node_10` |
| CR-SV12 | Scan · Witness | **Sybil stream** (tokens + device ceiling) on card chain | **L** partial | ✓ | ✓ | ✓ | device ceiling shipped; tokens S3 |
| CR-X01 | Additional ideas | **Resident-authored lore chains** | **C** | — | C | L | S3: moderated append pipeline |
| CR-X02 | Additional ideas | **Revocable clues** on posters / kiosks / river markers | **P** | ✓ | ✓ | ✓ | generic revoke · optional extra `game_node` mints at S3 |
| CR-X03 | Additional ideas | **Weather-only objects** (flood / snow) | **C** | C | O | L | S3: paired route nodes + external signal or manual mode |
| CR-X04 | Additional ideas | **Three-way fragment puzzle** (named on page) | **L** | ✓ | ✓ | ✓ | same as CR-G07 |
| CR-P01 | Data policy fit | No geo-tracking, heatmaps, engagement scoring | **P** | ✓ | ✓ | ✓ | policy + `CITY_GAME_ENABLED` gate |
| CR-P02 | Data policy fit | Resolver needs **object truth only** (faction, route, threshold, revoke, bulletin) | **P** + **L** | ✓ | ✓ | ✓ | signed `game_node` state |
| CR-P03 | Data policy fit | **Business-issued vouches** without dossiers | **O** | C | O | L | Q6 café enrollment |

### Physical-world multiplayer page

| ID | Page section | Feature (from public copy) | Delivery (target) | S1 | S2 | S3 | Primary nodes / proof |
|----|--------------|---------------------------|-------------------|----|----|-----|------------------------|
| PWM-S01 | Season in one city | **Month-long** game layer across neighborhoods | **O** | ✓ | ✓ | ✓ | season `window` JSON · S3 density |
| PWM-S02 | Season beats | River path **wakes after sunset** | **O** | C | O | L | S3: time-gated route nodes |
| PWM-S03 | Season beats | Mural district **secret chapter at midnight** | **O** | C | O | L | `node_03`, `node_09` lore_archive |
| PWM-S04 | Season beats | Café **neutral ground during storms** | **O** | ✓ | ✓ | ✓ | `node_02` sanctuary + care/event streams |
| PWM-S05 | Season beats | Shrine **silent when marker revoked** | **P** | ✓ | ✓ | ✓ | revoke display |
| PWM-ST01 | Sticker states | **Unclaimed** ward | **O** | ✓ | ✓ | ✓ | `place` stream Controller copy |
| PWM-ST02 | Sticker states | **Captured by faction** | **O** | ✓ | ✓ | ✓ | relay_gate nodes |
| PWM-ST03 | Sticker states | **Vulnerable after 8 PM** | **C** | C | O | L | S3: capture window schedule |
| PWM-ST04 | Sticker states | **Relay key rotated at noon** | **O** | ✓ | ✓ | ✓ | compromise/rekey narrative |
| PWM-ST05 | Sticker states | **Clue 3 of 7** progression | **C** | C | O | L | S3: multi-clue lore chains on murals |
| PWM-ST06 | Sticker states | **Revoked by creator** | **P** | ✓ | ✓ | ✓ | lifecycle |
| PWM-ST07 | Sticker states | **Part of tonight’s route** | **O** | ✓ | ✓ | ✓ | `route` stream + season window |
| PWM-ST08 | Sticker states | **Lore updated after last capture** | **O** | ✓ | ✓ | ✓ | operator bulletin after PvP beat |
| PWM-NR01 | Mythic roles | **Bench as district gate** | **L** + **O** | ✓ | ✓ | ✓ | `node_08`, `node_12` |
| PWM-NR02 | Mythic roles | **Mural as lore archive** | **L** + **O** | ✓ | ✓ | ✓ | `node_03`, `node_09` |
| PWM-NR03 | Mythic roles | **Café window as sanctuary** | **L** + **O** | ✓ | ✓ | ✓ | `node_02` |
| PWM-NR04 | Mythic roles | **Trail marker as route splitter** | **O** | ✓ | ✓ | ✓ | `node_06`, `node_11` |
| PWM-NR05 | Mythic roles | **Alley arch as finale switch** | **L** | ✓ | ✓ | ✓ | `node_13` |
| PWM-MS01 | Map states | **Unclaimed ward** | **O** | ✓ | ✓ | ✓ | place stream |
| PWM-MS02 | Map states | **Captured by faction** | **O** | ✓ | ✓ | ✓ | relay nodes |
| PWM-MS03 | Map states | **Sanctuary until dawn** | **O** | ✓ | ✓ | ✓ | sanctuary roles |
| PWM-MS04 | Map states | **Lore drop live** | **L** + **O** | ✓ | ✓ | ✓ | temp_drop `node_04` |
| PWM-MS05 | Map states | **Weather mode enabled** | **C** | C | O | L | CR-X03 · `node_06` |
| PWM-MS06 | Map states | **Repair quest open** | **O** | ✓ | ✓ | ✓ | `node_14` care_loop |
| PWM-MS07 | Map states | **Artist note published** | **O** | ✓ | ✓ | ✓ | lore streams · place steward |
| PWM-MS08 | Map states | **Revoked marker** | **P** | ✓ | ✓ | ✓ | revoke |
| PWM-MS09 | Map states | **Finale countdown** | **L** | ✓ | ✓ | ✓ | fragment lattice on `node_13` |
| PWM-MS10 | Map states | **Route rerouted** | **O** | ✓ | ✓ | ✓ | `route` stream |
| PWM-MS11 | Map states | **Hidden chapter active** | **O** | ✓ | ✓ | ✓ | lore_archive + unlock graph |
| PWM-MS12 | Map states | **Maintenance pause** | **L** | ✓ | ✓ | ✓ | care stream wins |
| PWM-P01 | Not location-tracking | **No movement analytics / heatmaps** | **P** | ✓ | ✓ | ✓ | policy |
| PWM-P02 | Not location-tracking | **Public object state** only | **P** + **L** | ✓ | ✓ | ✓ | game_node model |
| PWM-P03 | Privacy · May public | **Faction holds**, route/chapter/sanctuary live | **L** + **O** | ✓ | ✓ | ✓ | streams on scan |
| PWM-P04 | Privacy · May signed | **Artist / maintainer / lore** signed updates | **O** | ✓ | ✓ | ✓ | game-update + care |
| PWM-P05 | Privacy · Must not | **No per-scan trails**, fingerprinting, silent logging | **P** | ✓ | ✓ | ✓ | policy + tests |
| PWM-P06 | Privacy · Must not | **No account** required to read public game state | **P** | ✓ | ✓ | ✓ | scan template |
| PWM-W01 | Weekend beats | **Lantern Ward reclaimed** market steps | **O** | ✓ | ✓ | ✓ | `node_15` |
| PWM-W02 | Weekend beats | River **weather-only route** | **C** | C | O | L | `node_06` |
| PWM-W03 | Weekend beats | **Mural chapter after midnight** | **O** | C | O | L | lore nodes |
| PWM-W04 | Weekend beats | Node **compromised and revoked** | **P** + **O** | ✓ | ✓ | ✓ | `node_05` + revoke |
| PWM-W05 | Weekend beats | **Fountain repair** unlocked final passage | **O** | ✓ | ✓ | ✓ | `node_14` → finale edge (operator) |
| PWM-M01 | Play + upkeep · Discovery | Find rain-garden / fountain / mural / trail | **C** | ✓ | ✓ | ✓ | discovery copy on care_loop + lore |
| PWM-M02 | Play + upkeep · Discovery | Learn **correct object state** | **L** | ✓ | ✓ | ✓ | scan streams |
| PWM-M03 | Play + upkeep · Discovery | **Earn lore** for noticing | **C** | ✓ | ✓ | ✓ | narrative chips |
| PWM-M04 | Play + upkeep · Care | Report sign missing / light out / cracked | **C** | C | O | L | S3: issue-report → maintainer (deferred workflow) |
| PWM-M05 | Play + upkeep · Care | **Maintainer-signed pause** | **L** + **O** | ✓ | ✓ | ✓ | care pause |
| PWM-M06 | Play + upkeep · Care | **Repair reactivates route** + next chapter | **O** | ✓ | ✓ | ✓ | operator reopens after steward sign |
| PWM-M07 | Play + upkeep · Boundary | Players do **not** certify emergency equipment | **P** | ✓ | ✓ | ✓ | rules + care copy |
| PWM-M08 | Play + upkeep · Boundary | Game rewards discovery, **not risky shortcuts** | **P** | ✓ | ✓ | ✓ | rules page |
| PWM-M09 | Play + upkeep · Boundary | **Maintenance status** is public truth | **L** | ✓ | ✓ | ✓ | care overrides game |
| PWM-WH01 | Why this feels new | Bench / mural / alley / café **matter tonight** | **C** | ✓ | ✓ | ✓ | role templates + coop hints |
| PWM-WH02 | Why this feels new | **Hidden state without hidden tracking** | **P** | ✓ | ✓ | ✓ | policy positioning |

### S3 node budget (50 nodes)

Use this when expanding [`site/data/city-game-cr-season-01.json`](../site/data/city-game-cr-season-01.json) — **minimum dedicated nodes** so every non-**P** mechanic has a physical anchor:

| Mechanic family | Min nodes at S3 | Notes |
|---------------|-----------------|-------|
| Relay / faction | 8 | Arches, bridges, market steps, duplicate district gates |
| Sanctuary / treaty | 6 | Cafés, benches, plaza neutral zones |
| Lore archive | 8 | Murals, cabinets, alleys, artist notes |
| Temp drop / public goods | 4 | River + festival pop-ups |
| Witness / scarcity / vouch | 6 | Library, businesses (Q6), stewards |
| Route / weather / sunrise | 6 | Skywalk, trail markers, flood-only pair |
| Care loop | 4 | Fountain, rain garden, trail repair |
| Finale / fragments | 4 | Arch + fragment anchors (some overlap) |
| Mobile lore / courier | 4 | Hoodie enrollments (no new SKU) |

**Total ≥ 50** with intentional overlap (one node may cover two rows if streams differ).

### Mechanics catalog (summary)

Condensed index — full rows above. **Living street** guestbook + landmark identity: **LSI** rows in research spec; S1 uses operator-curated `public_label` + narrative chip on `node_08`, `node_12`, `node_14`.

| Mechanic | Traceability IDs |
|----------|------------------|
| Relay control + bulletins | CR-R01, CR-SV01–02, PWM-ST02/04/08 |
| Sanctuary / treaty | CR-R02, PWM-NR03, PWM-MS03 |
| Temp 48h + public goods | CR-E01, CR-G01, CR-SV04–06 |
| Faction territory | PWM-ST01–02, PWM-MS01–02 |
| Weather / sunrise routes | CR-E02, CR-X03, PWM-MS05, PWM-W02 |
| Trust / vouch | CR-T01–03, CR-G03, CR-SV09–11 |
| Compromise + rekey | CR-C01–03, CR-SV07–08 |
| Scarcity | CR-G05, CR-SV11–12 |
| Fragments + finale | CR-G07, CR-X04, PWM-NR05, PWM-MS09 |
| Prisoner’s dilemma | CR-G04, CR-M05, CR-SV09 |
| Anti-hoarding | CR-G02, CR-M03 |
| Sybil resistance | CR-G06, CR-SV12 |
| Care loop | CR-E03, PWM-M04–09, PWM-MS06/12 |
| Guestbook / public memory | CR-SV10, CR-X01 (S3) |
| Mobile lore | CR-R03, Merch wedge |
| Revoke compromised marker | CR-C03, PWM-ST06, PWM-W04 |
| Live map / ticker | CR-M01–07 (S3 editorial) |
| Privacy platform | CR-P01–02, PWM-P01–06 |
| **City state board (read-only)** | **PWM-MS01–12**, **CR-M01–07**, **PWM-P02–06** — [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) |

---

## Map dashboard (read-only city state board)

Players need orientation across 15–50 nodes without a personal scoreboard. The shipped surface is a **weekend board** on `/play/cedar-rapids/` — schematic districts, unlock graph, and (when live) the same **public object chips** as scan pages.

**Canonical plan:** [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md)

| Phase | Rollout | Engineering |
|-------|---------|-------------|
| **M1** | S1 optional | ☑ Static board — `/play/cedar-rapids/#city-state` · season `map_layout` · `city-game-map-board.mjs` |
| **M2** | S2 | ☑ `GET …/seasons/{season_id}/snapshot` + live chips · `map-node-snapshot.ts` |
| **M3** | S3 | ☑ Headline ticker from `bulletin_schedule` + unlock-state headlines (**CR-M01–07**) |

**Policy:** No GPS, visit logs, player IDs, or device-local scarcity on the server board. Internal [`CITY_GAME_NODE_INSTALL_MAP.md`](CITY_GAME_NODE_INSTALL_MAP.md) stays operator-only.

**Launch:** Map is **not** a Phase D blocker unless marketing promises a live board — then **B13–B15** in the map doc apply before `launch-surfaces` copy.

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
| **Scarcity without surveillance** | Limited passes / sunset dormancy — not “only you may scan” | `node_10` library witness | `game_meta.scarcity_remaining` via contribute; auto-dormant at 0; **device-local one-claim ceiling** on scan client ([`CITY_GAME_AUTONOMOUS_V1.md`](CITY_GAME_AUTONOMOUS_V1.md) § Witness scarcity) | Scarcity is on **object capacity**, not player identity; one pass per device per UTC day is UX-only |
| **Coordination game** | Fragments in three districts combine into finale | `node_09`, `node_11`, `node_13` | Season config `unlock_edges`; finale flip requires 3/3 fragments in `game_meta` | No single node completes the lattice; groups must coordinate |
| **Relay / territory (limited conflict)** | Faction holds public bulletin, not chat logs | `node_01`, `node_05`, `node_15` | `place` stream Controller + narrative bulletin; sanctuary nodes exempt | Capturing relays is visible; sanctuaries (`node_02`, `node_12`) reward regroup over endless PvP |
| **Compromise / rekey** | Poisoned relay state visible; recovery by rotation not dossiers | `node_05` bridge | `game_meta.compromised` + care stream still shows bridge physically open | Teams recover by **public rekey**, not by reading scan logs |
| **Sybil resistance** | Spam does not inflate collective progress | All token-gated mechanics | v1: site codes + IP rate limits + witness device-local ceiling; quorum/fragments unchanged | Fake participation wastes time without moving shared state |
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
- [ ] **GT-7 City board (when shipped):** Testers describe the map dashboard as **world state**, not personal visits or GPS — [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md) · **B13**

### Engineering implications (game theory → code)

| Layer | Game-theory requirement |
|-------|-------------------------|
| **`game_meta`** | Fields must support **shared** state (`collective_*`, `unlocked_by`, `fragment_id`, `scarcity_remaining`) — never `player_id` |
| **Scan copy** | Role templates explain **dominant cooperative move** (“share outward to evolve this node”) |
| **Season config** | `unlock_edges` encode coordination puzzles, not solo gates |
| **Operator UI (Phase B)** | Flips document *world* state (“quorum met”), not player rewards |
| **Rules page (launch)** | Plain-language payoff matrix for dilemma nodes + public-goods nodes |
| **Tests** | `city-game-game-theory.test.ts` — scan templates never render leaderboard/XP strings | **Shipped** — in `verify:city-game` |

Automated **L** rows (CR-G01, CR-G07, CR-G05) must pass the same dominant-strategy review before `CITY_GAME_ENABLED` copy promises automatic collective unlocks on production scans.

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

**Shipped (S1):** option **(3)** — site-code `POST …/game-contribute` with aggregate `collective_progress` ([`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) § Cedar Rapids). Option **(2)** remains an S3 spike only if product rejects site-code rotation ops. Option **(1)** is fallback when automation is off or drift repair is insufficient.

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
| **Season config** | `site/data/city-game-cr-season-01.json` (or D1 `seasons` table) — node list, unlock graph, dates, rules URL, `map_layout` |
| **Season snapshot API** | `GET …/seasons/{season_id}/snapshot` — read-only world board JSON (**M2**) — [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) |
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

### Alignment with existing stack

| Area | Verdict | Notes |
|------|---------|-------|
| **Root card + child objects** | **Aligned** | Season root holds all `game_node` children; per-QR revoke — [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) |
| **Game-operator authority** | **Aligned** | `issuer_public_key` on season root · same custody pattern as organizer revoke — [`ORGANIZER_SIGNED_REVOKE_PILOT.md`](ORGANIZER_SIGNED_REVOKE_PILOT.md) |
| **Scan resolver** | **Aligned** | `game_node` branch in `scan-state` / `scan-html`; `CITY_GAME_ENABLED` gate |
| **Collective mechanics** | **Aligned** | Passive `GET` scan not counted; contribute buckets in D1 — policy § Cedar Rapids |
| **Human trust vs game trust** | **Partial** | Two models coexist on scan (see **R-01** below) |
| **Delegated stewards** | **Gap** | Step 17 deferred — blocks business-owned node updates without operator/root key (**R-02**) |
| **Player-signed play actions** | **Gap** | Faction capture, spy compromise, dilemma branches need new signing surface (**R-08**) |
| **City-wide live board + ticker** | **Shipped (engineering)** | Snapshot API + rules-page board — human **B13–B14** before marketing “live city board” · [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) |
| **Guestbook / resident lore** | **Gap** | No moderated append API on `game_node` (**R-10**) |
| **Multi-season / multi-city** | **Partial (engineering)** | **R-11 shipped:** `season-loader.ts` registry — resolve by `season_id` / `season_root_profile_id`; worker paths take `CrSeasonConfig` · second city still needs JSON + mint, not a refactor |

**Feasibility summary:** **S1 (15 nodes)** — spine + operator + narrow **L** path is feasible on current architecture (proven by `verify:city-game`). **S3 (50 nodes)** — feasible as **more places + streams + operator narrative**; **not** feasible as “every traceability **L** row automated” without items in **Build process** below.

```text
Season root card (profile_id)
  └── game_node child_objects (signed JSON + object_streams + game_meta)
        ├── GET scan SSR (read-only hero)
        ├── POST game-contribute (quorum | fragment | scarcity)
        └── POST game-update (owner | game_operator)
```

### Risks and blind spots (must be explicit in build)

These are **not** missing from the feature traceability table — they are **architecture and operations** constraints that decide whether a row stays **O** vs **L**.

| ID | Risk | Impact | Mitigation / owner |
|----|------|--------|-------------------|
| **R-01** | **Dual vouch model** — Humanity **human trust** (root vouches, `showHumanTrustBlock`) vs **game trust** (`game_meta.vouch_*` on witness `game_node`s). Public copy says “library/café vouch.” | QA confusion; GT failures if testers expect Steward graph | Rules page glossary; scan copy distinguishes “witness seal” vs “Steward vouch”; GT scripts use game rows only |
| **R-02** | **Delegated child capabilities deferred** — [`DELEGATED_CHILD_CAPABILITIES_GATE.md`](DELEGATED_CHILD_CAPABILITIES_GATE.md) | CR-P03 café/business vouch cannot be steward-self-serve at S3 without operator flips or root-key handoff | Keep **O** until G1–G5 met; or enroll business as operator-published `vouch_active_for` |
| **R-03** | **Operations dominate engineering** — 15→50 mint/install, site-code rotation, weekend operator, custody | Launch slips even when tests green | [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md), [`CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md`](CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md), [`CITY_GAME_OPERATOR_CUSTODY.md`](CITY_GAME_OPERATOR_CUSTODY.md) on critical path |
| **R-04** | **Sybil fairness ceiling** — device-local scarcity (`localStorage`); site codes leak via photos; IP limits ≠ identity | Scarcity and quorum can be gamed; still policy-acceptable if documented | Do not claim “one-time signed tokens” on prod until shipped (**R-05**); rotate codes between seasons |
| **R-05** | **Page vs shipped sybil path** — feature pages list tokens + business vouches; **L** today = site codes + IP cap + device ceiling | Over-promise on marketing surfaces until S3 spike | Launch surfaces `--check` copy audit; traceability CR-G06 delivery column |
| **R-06** | **Contribute requires JS** — play loop is `scan-game-contribute.mjs`; read-only scan works without JS | “Scan-only” players cannot advance quorum | Rules page: “bring the site code”; optional SMS/print fallback is out of scope S1 |
| **R-07** | **Hot-node write contention** — many concurrent `game-contribute` on one `child_object` row (finale/quorum rush) | D1 write failures or lost increments | **Shipped:** optimistic `updated_at` CAS + retry (`quorum-contribute.ts`); B5 load test asserts final progress |
| **R-08** | **Player-initiated mechanics** — faction PvP, spy compromise, dilemma branches (**CR-G04**, CR-C01 player path) | **L** requires new signed action types + anti-grief + standards update | S1/S2: **O** only; S3: protocol RFC before code — do not imply player-signed in rules until shipped |
| **R-09** | **Live map / ticker** (CR-M01–07) | ~~No resolver feed~~ | Snapshot + ticker on rules board — still not scan logging · **B13** before marketing |
| **R-19** | **Snapshot poll load** at 50 nodes | D1 read amplification if every phone polls snapshot | **Shipped:** Worker cache 20s + ETag (**B14** monitor at S3) |
| **R-20** | **M1 board looks live** before M2 API | Players assume stale static chips are world truth | “Scan for live state” until snapshot ships; **B2** launch-surfaces honesty |
| **R-10** | **Guestbook / resident lore** (CR-X01, CR-SV10) | Moderation + privacy story undefined | S3 pipeline or stay **C**; never append without governance |
| **R-11** | **Hardcoded `CR_SEASON_01`** in worker | Second city/season is a refactor, not config toggle | **Shipped:** `worker/src/city-game/season-loader.ts` + `resolveSeasonForProfile` / `resolveSeasonById` · `city-game-season-loader.test.ts` (≥2 seasons via `registerSeasonConfig`) |
| **R-12** | **Dual deploy** — Pages `launch-surfaces` + Worker `CITY_GAME_ENABLED` | Public HTML says “live” while scans show research template | Launch checklist E4 + P3/P4 same change window; `launch-surfaces --expect-applied` |
| **R-13** | **Public copy lag** — feature pages still say “demo / not resolver yet” | Stranger distrust | `--apply` on launch day + banner removal in same deploy train |
| **R-14** | **Care loop incomplete** — pause works; **report → maintainer → auto-unlock route** (PWM-M04–06) is operator-only | Game copy may promise repair unlock automation falsely | Operator runbook beats; steward-signed care via `game-update` only |
| **R-15** | **Season root retention** — orphan purge cron ([`CARD_RETENTION_AND_ORPHAN_CLEANUP.md`](CARD_RETENTION_AND_ORPHAN_CLEANUP.md)) | Inactive season root with stale QRs could be purged if misconfigured | Season root must stay **active** with live QRs during play; post-season policy documents pause vs purge |
| **R-16** | **No `SYSTEM_INVARIANTS` § city game** | Regressions on scan/contribute/policy boundaries | See [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) § Cedar Rapids city game — required in PRs touching game paths |
| **R-17** | **Scan-side unlock repair** — `reconcileSeasonUnlockDrift` on season-root game scans | Extra D1 reads/writes on scan path (bounded to quorum + fragment node IDs, not all 50) | Monitor latency at launch; do not widen repair loop to all nodes without design |
| **R-18** | **Legal / insurance / liability** | 50 public play objects — outside engineering scope | Product/operator sign-off before S3 footprint |

### Build process — address in PRs and launch gates

Use this checklist in **Phase C/D PRs** and release review. Link risk **R-*** when closing an item.

| # | Gate | When | Proof |
|---|------|------|-------|
| B1 | Human vs game vouch copy reviewed on `node_07`, `node_10`, rules page | Before GT comprehension | **R-01** · GT runbook |
| B2 | Traceability **Delivery** audited vs launch surfaces copy (no token over-promise) | Before `launch-surfaces --apply` | **R-05**, **R-13** |
| B3 | `npm run verify:city-game` + policy § Cedar Rapids unchanged or versioned | Every game PR | **R-16** |
| B4 | `CITY_GAME_ENABLED` + Pages deploy in same release train | Launch day | **R-12** |
| B5 | Contribute load test on `node_04` (or busiest node) | Launch −1 week | **R-07** |
| B6 | Operator custody + weekend schedule signed | Launch −1 week | **R-03** |
| B7 | Install QA ≥3 phones × **current** node count (15, then 25, then 50) | Each rollout phase | **R-03** |
| B8 | Player-signed mechanics stay **O** in rules/marketing unless B8 RFC merged | S1/S2 default | **R-08** |
| B9 | Business vouch plan: operator flip vs delegation pilot | Before S3 CR-P03 | **R-02** |
| B10 | Post-season: season root **active/paused** vs orphan purge documented | Before S3 | **R-15** |
| B11 | Second season spike OR explicit “Cedar Rapids only” in roadmap | Before non-CR marketing | **R-11** |
| B12 | Phase E self-serve setup on `/created/` — no terminal for new organizers | Before “create your own game” marketing | Phase E **E3** |
| B13 | Map dashboard privacy review (snapshot JSON + GT-7) | Before marketing “live city board” | [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) · **R-09** |
| B14 | Snapshot API in `verify:city-game`; scan analytics still off | M2 deploy | **R-19**, **P5** — `city-game-scan-analytics-gate.test.ts` |
| B15 | Headline ticker copy — no visit/player language | M3 deploy | **CR-M01–07** |

**Widen rollout rule:** Do not add nodes to S2/S3 until **B7** passes at the **previous** footprint. Adding nodes does not close **R-08**, **R-09**, **R-10**, or map phases **M2–M3** without dedicated engineering.

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

**Phase C status (2026-06-02):** Engineering preflight **pass** (`npm run verify:city-game`). Local proof gate **pass** (`npm run city-game:proof-local`, full spine). Human gates **open** — physical install QA, GT comprehension (≥5 testers), operator custody sign-off, install map, weekend roster.

| Gate | Owner | Status |
|------|-------|--------|
| Season registry + launch-gates tests | Engineering | ☑ |
| `verify:city-game` bundle | Engineering | ☑ 2026-06-02 |
| Physical install QA (≥3 phones × 15) | Operator + QA | ☐ [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) |
| GT comprehension (≥5 testers) | Product + QA | ☐ [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md) |
| Operator key custody + season root mint | Operator | ☐ [`CITY_GAME_OPERATOR_CUSTODY.md`](CITY_GAME_OPERATOR_CUSTODY.md) |
| Install map + node_14 stewards | Operator | ☐ [`CITY_GAME_NODE_INSTALL_MAP.md`](CITY_GAME_NODE_INSTALL_MAP.md) |
| Weekend operator schedule | Operator | ☐ [`CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md`](CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md) |

- [x] Mint full 15-node registry — `npm run city-game:mint-node -- --all` · object IDs in season JSON
- [ ] Enroll 5–10 Glitch hoodie QRs as mobile lore (optional) — `npm run city-game:enroll-mobile-lore -- --write …`
- [x] Public rules page draft — [`/play/cedar-rapids/`](../site/play/cedar-rapids/index.html) (noindex until launch)
- [ ] Physical install QA: scan ≥3 phones per node — [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) · local proof first: [`CITY_GAME_LOCAL_DEV.md`](CITY_GAME_LOCAL_DEV.md) · engineering preflight ☑
- [x] Operator runbook — [`CITY_GAME_OPERATOR_RUNBOOK.md`](CITY_GAME_OPERATOR_RUNBOOK.md)

### Phase D — Launch (~month after hoodie)

**Phase D status (2026-06-02):** Public-surface tooling **ready** (`city-game:launch-surfaces`, `city-game:post-season`). Human-gate prep: **`city-game:comprehension-kit`** (tester URLs + scorecard), **`city-game:launch-preflight`** (single status report). **Do not `--apply`** until launch checklist human gates pass. Pre-launch `--check` confirms draft/noindex on rules + research pages.

| Step | Owner | Status | Command / doc |
|------|-------|--------|---------------|
| P1 GT comprehension | Product + QA | ☐ | `npm run city-game:comprehension-kit` · [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md) |
| Phase D preflight | Engineering | ☑ tooling | `npm run city-game:launch-preflight` |
| P3 + P4 public HTML surfaces | Engineering | ☐ Blocked on season root + dates + human gates | `npm run city-game:launch-surfaces -- --apply` · [`CITY_GAME_LAUNCH_CHECKLIST.md`](CITY_GAME_LAUNCH_CHECKLIST.md) |
| E4 resolver flag + deploy | Engineering | ☐ | `CITY_GAME_ENABLED=1` in `wrangler.toml` |
| Post-season close | Operator | ☐ | `npm run city-game:post-season -- --write` |

- [ ] `CITY_GAME_ENABLED=1` + season dates active
- [ ] Remove “research demo” banner from Cedar Rapids pages; link to live rules — **`city-game:launch-surfaces -- --apply`**
- [ ] Monitor: no scan logging enabled; support macros — [`CITY_GAME_SUPPORT_MACROS.md`](CITY_GAME_SUPPORT_MACROS.md)
- [ ] Post-season: objects revert to `paused` or living-infrastructure mode

### Phase E — Self-serve game network setup (post–Cedar Rapids pilot)

**Status:** **Planned — not in S1 scope.** Cedar Rapids Season 1 uses terminal scripts for season bootstrap ([`CITY_GAME_OPERATOR_CUSTODY.md`](CITY_GAME_OPERATOR_CUSTODY.md)). That is an **internal pilot shortcut**, not the intended organizer experience. After the pilot proves scan UX, privacy copy, and operator runbooks, third-party organizers must be able to stand up a game season **from the website** — no terminal, no repo access.

**Product promise:** Any steward who can create a Humanity Card today should be able to create and operate a city game season without running `npm run city-game:*`.

#### Organizer journey (target)

| Step | Surface | What the organizer does | Today (pilot) |
|------|---------|-------------------------|---------------|
| 1 | [`/create/`](../site/create/) | Create a **season root** card; register **game-operator public key** under Organizer / issuer | ☑ Browser |
| 2 | [`/created/`](../site/created/) **Live · Manage** | **Game season setup** — season id, dates, districts, add `game_node` children, issue scan QRs, export print pack | ☐ Terminal (`city-game:mint-node`, `city-game:seed-local`) |
| 3 | [`/created/`](../site/created/) or linked rules URL | Publish **rules page** draft (dates, privacy, what scans prove) | ☐ Hand-edited HTML + `city-game:launch-surfaces` |
| 4 | [`/game-operator/`](../site/game-operator/) | Flip world state during the season (session-only game-operator key) | ☑ Browser (prototype) |
| 5 | [`/organizer-revoke/`](../site/organizer-revoke/) · [`/created/`](../site/created/) | Emergency revoke / owner lifecycle | ☑ Browser |

**Runtime vs setup:** [`/game-operator/`](../site/game-operator/) is the **weekend console** for live play. Phase E adds the **setup cockpit** on `/created/` — mirroring how status plates and lost-item relays already register child objects in-browser ([`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) steps 6–16).

#### Phase E surfaces (implementation targets)

| Surface | Module area (planned) | Ships |
|---------|----------------------|-------|
| **Add game node** on `/created/` Live | `created-child-object-game-node.mjs` (name TBD) | Parent-signed `POST …/objects` with `object_type: game_node`; hub tree row; backup gate |
| **Issue node scan QR** | Reuse `child-object-register-issue.mjs` pattern | `POST …/objects/{object_id}/issue-qr`; download PNG + copy scan link |
| **Season metadata editor** | Season config bound to season root card or signed season doc | `season_id`, window dates, districts, `unlock_edges`, mobile lore slots |
| **Game-operator key helper** | Optional generate-in-browser + register public key at create | Same custody as cards — private key never uploaded except as signatures |
| **Rules page generator** | Static `/play/{season-slug}/` from season metadata | Privacy + payoff copy templates; noindex until organizer publishes |
| **Print / install pack** | Export node list + QR PNGs + install checklist | Replaces internal [`CITY_GAME_NODE_INSTALL_MAP.md`](CITY_GAME_NODE_INSTALL_MAP.md) spreadsheet for self-serve |

**Explicit non-goals for Phase E v1:** resolver-backed player accounts, scan analytics, geofence enforcement, delegated child keys ([`DELEGATED_CHILD_CAPABILITIES_GATE.md`](DELEGATED_CHILD_CAPABILITIES_GATE.md)), or requiring a Humanity Card to **read** public game state.

#### Engineering sequence (Phase E)

Build on shipped child-object primitives — do not fork a parallel mint path.

1. ~~**Season loader refactor** — resolve **R-11**~~ **Done (2026-06-02):** `season-loader.ts`; scan/contribute/snapshot/unlock paths keyed by season config + `season_root_profile_id`.
2. ~~**`game_node` register UI on `/created/`**~~ **Done:** register + QR issue; hub nested rows.
3. ~~**Bulk add from template**~~ **Done:** starter registry import in Live panel.
4. ~~**Rules + launch surfaces**~~ **Done (browser v1):** draft/publish panel on `/created/` — preview, download launch HTML, deploy checklist; Cedar Rapids pilot still uses `city-game:launch-surfaces`.
5. ~~**Comprehension + custody copy**~~ **Done:** setup checklist on `/created/` Live (custody ack, GT scorecard, runbook cards, comprehension brief); game-season backup gate copy; setup wizard notice for season roots.
6. **E2E + regression** — `e2e/city-game-self-serve-setup.spec.ts` (name TBD); keep `verify:city-game` green.

#### Phase E gates (before marketing “create your own game”)

| # | Gate | Blocks |
|---|------|--------|
| E1 | Cedar Rapids S1 launch gates **signed** (Phase D) | Pilot not proven |
| E2 | **R-11** season loader supports ≥2 seasons by config | **Engineering met** — `registerSeasonConfig` + loader tests; organizer self-serve still **E3** |
| E3 | Organizer completes full 15-node season in browser on staging — **no terminal** | Self-serve claim |
| E4 | GT comprehension + privacy review on **self-serve rules** template | Over-promising mechanics |
| E5 | `SYSTEM_INVARIANTS` § city game updated for self-serve paths | **R-16** |

#### Phase E checklist (engineering)

- [x] `/created/` **Add game node** — register + first QR in one action (parity with status plate)
- [x] Hub nested rows for `game_node` under season root
- [ ] Season metadata editor (dates, `unlock_edges`, districts) — window/status in rules panel; full JSON editor still open
- [x] Browser rules page draft + publish
- [ ] Deprecate terminal mint for **new** self-serve seasons (keep scripts for CI/fixtures)
- [ ] Document organizer path in [`CITY_GAME_OPERATOR_CUSTODY.md`](CITY_GAME_OPERATOR_CUSTODY.md) § Self-serve setup — custody + comprehension UI on `/created/` Live

---

## Launch gates (all required)

### Product / trust

- [x] [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) — collective mechanic v1 path documented (site-code contribute)
- [x] Rules page states what scans prove / do not prove
- [x] Care stream present on every node with physical safety copy where needed *(launch-gates test + node_14 template)*
- [x] Forbidden: leaderboard, XP, player accounts, heatmaps *(scan + rules guards)*
- [ ] Copy comprehension ≥5 testers — [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md)

### Engineering

- [x] `npm run verify:city-game` green — **2026-06-02** (109 tests)
- [x] `npm run worker:test -- worker/tests/city-game*.test.ts` green
- [x] Feature flag off by default in prod until launch checklist signed
- [x] Compromised marker revoke tested end-to-end — `city-game-launch-gates.test.ts`
- [x] Temp drop expiry hides game hero without 404 on QR — `city-game-launch-gates.test.ts`

### Operations

- [ ] Game-operator key in operator custody — [`CITY_GAME_OPERATOR_CUSTODY.md`](CITY_GAME_OPERATOR_CUSTODY.md)
- [ ] Node install map + steward contacts for `node_14` care loop — [`CITY_GAME_NODE_INSTALL_MAP.md`](CITY_GAME_NODE_INSTALL_MAP.md)
- [ ] Weekend operator schedule — [`CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md`](CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md)

### Architecture and build process (§ Risks and blind spots)

- [ ] **B1** — Human vs game vouch copy (rules + `node_07` / `node_10` scans)
- [ ] **B2** — Launch surfaces copy matches shipped sybil path (site codes, not tokens, unless built)
- [ ] **B4** — Dual deploy: Worker flag + Pages surfaces same train
- [ ] **B5** — Contribute load test on busiest quorum node
- [ ] **B6–B7** — Operator schedule + install QA at current node footprint
- [ ] **B8** — No player-signed faction/spy/dilemma promised in public rules until RFC shipped
- [ ] **R-16** — Game PRs update [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) when behavior changes

---

## Public surfaces (what goes on the website)

| When | URL / surface | Content |
|------|---------------|---------|
| **Now → hoodie launch** | Existing research pages | “In development” hints on PWM, Cedar Rapids demo, living street, and `what-can-a-qr-do.html` — honest teaser, not live gameplay |
| **Game launch** | `/play/cedar-rapids/` | Rules, dates, privacy, what scans prove; **M1+** city state board — [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) |
| **Game launch** | Live scan pages on `/c/…` | Real resolver-backed game template |
| **Game launch** | Research pages | Update banners → link to live season — `npm run city-game:launch-surfaces -- --apply` |
| **Never public** | Full operator node spreadsheet, keys, manual flip procedures | Internal / operator doc only |
| **Phase E (post-pilot)** | `/created/` game season setup | Self-serve node register, QR issue, season metadata, rules publish — [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) § Phase E |

**Launch surfaces patched by `--apply`:** [`site/play/cedar-rapids/index.html`](../site/play/cedar-rapids/index.html) · [`physical-world-multiplayer`](../site/what-can-a-qr-do/physical-world-multiplayer/) · [`cedar-rapids-city-game`](../site/what-can-a-qr-do/combining-ideas/cedar-rapids-city-game/) · [`living-street-infrastructure`](../site/what-can-a-qr-do/living-street-infrastructure/) · [`what-can-a-qr-do.html`](../site/what-can-a-qr-do.html).

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
| Q7 | Self-serve season config: JSON on season root card vs separate signed season document? | Protocol | Phase E start |
| Q8 | Minimum node count for self-serve launch (15 template vs bring-your-own count)? | Product | Phase E |
| Q9 | Game season capacity: `hosted_game_season_v1` on reference operator; federation later | **Metering + UI shipped** — enforce, `game_season` on entitlements, `/created/` Operator plan panel, checkout POST · **Open:** Stripe Dashboard prices + prod paid smoke | Phase E organizer UX consumes same API |
| Q10 | Rules page URL: `/play/{slug}/` on Pages vs operator-hosted static? | Engineering | Phase E |
| Q11 | Promote live city board at S1 launch or wait for M2 snapshot? | Product | Launch −1 week |
| Q12 | Snapshot cache TTL vs freshness for weekend peak? | Engineering | M2 build |

---

## Related

| Doc / path | Role |
|------------|------|
| [`PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md`](PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md) | Research canon + privacy |
| [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) | Hoodie wedge timeline |
| [`MANIFESTO_STATUS_UPDATE.md`](MANIFESTO_STATUS_UPDATE.md) | Owner-signed live state |
| [`ORGANIZER_SIGNED_REVOKE_PILOT.md`](ORGANIZER_SIGNED_REVOKE_PILOT.md) | Closest shipped authority primitive |
| [`site/what-can-a-qr-do/combining-ideas/games-maintenance/`](../site/what-can-a-qr-do/combining-ideas/games-maintenance/) | Care vs play conflict UX |
| [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) | Cedar Rapids city game invariants + `verify:city-game` regression |
| [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md) | Active work registry |
| [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) | Child-object UI pattern Phase E extends |
| [`DELEGATED_CHILD_CAPABILITIES_GATE.md`](DELEGATED_CHILD_CAPABILITIES_GATE.md) | Blocks steward-self-serve business vouch (**R-02**) |
| [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) | Read-only city state board — M1/M2/M3 plan, snapshot API, policy boundaries |

---

## Changelog

| Date | Event |
|------|-------|
| 2026-06-02 | **Map dashboard plan** — [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md); risks **R-19–R-20**, gates **B13–B15**; open questions Q11–Q12 |
| 2026-06-02 | **Phase E — self-serve game network setup** — post-pilot `/created/` season cockpit spec; terminal mint marked pilot-only; gates E1–E5 |
| 2026-06-02 | **Architecture risks + build process** — alignment table, R-01–R-18, B1–B11 gates; policy collective path corrected to site-code contribute |
| 2026-06-02 | **Feature page traceability** — complete CR-* / PWM-* catalog; rollout S1(15) → S2(25) → S3(50) node budget |
| 2026-06-02 | **S2 automation — route windows** — `route_window_schedule` sunset + midnight local-hour gates (PWM-S02/S03, CR-X03 partial) |
| 2026-06-02 | **S2 automation — bulletin schedule** — `bulletin_schedule` in season JSON · relay scan rotation (CR-E02 / CR-R01) |
| 2026-06-02 | **Anti-hoarding auto-evolve (CR-G02)** — quorum triggers evolved River Lantern + cabinet copy |
| 2026-06-02 | **Phase D prep** — `city-game:launch-surfaces` + `city-game:post-season`; launch checklist P3/P4 runbook · apply blocked until gates |
| 2026-06-02 | **Phase C engineering preflight** — `verify:city-game` pass (109 tests); install/comprehension/custody runbooks updated with human vs engineering gates |
| 2026-06-01 | Initial v1 implementation brief — combines PWM + Cedar Rapids + living street infrastructure |
| 2026-06-01 | Phase B prototype — game_node scan template, `/game-operator/` UI, test node mint templates |
| 2026-06-01 | Phase C season pack — 15-node registry, custody doc, operator runbook, rules page draft |
| 2026-06-01 | Launch-gates tests, install QA checklist, mobile lore enrollment helper, data policy § city game |
| 2026-06-01 | Phase D prep — verify:city-game, comprehension runbook, launch checklist, install map, support macros |
| 2026-06-01 | Local dev walkthrough + smoke-local (`.dev.vars` flag, E5 scan gate) |
