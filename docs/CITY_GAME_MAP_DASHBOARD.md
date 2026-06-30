# Cedar Rapids city game — map dashboard (read-only)

**Status:** Canonical plan · **M1–M3 shipped** · primary URL **`/play/cedar-rapids/map/`** (rules page keeps `#city-state` anchor for backward compatibility)  
**Audience:** Product, frontend (Pages), resolver (Worker), operators, agents  
**Season:** `cr_season_01_wake` · registry [`site/data/city-game-cr-season-01.json`](../site/data/city-game-cr-season-01.json)

**Parent spec:** [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) · traceability **CR-M01–07**, **PWM-MS01–12**, **PWM-P01–06**  
**Policy:** [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) § Cedar Rapids · [`PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md`](PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md) § Privacy

---

## One-sentence product

Players need a **read-only city state board** on `/play/cedar-rapids/` that shows the same **public object truth** as scan pages — districts, unlock graph, collective quorum, fragments, care pauses — **without** accounts, GPS, visit logs, or personal progress.

The physical-world multiplayer pages already say: *“The map is not inside an app. The map is the city itself.”* This dashboard is that sentence made operational: a **schematic weekend board**, not a scavenger-hunt tracker.

---

## Policy alignment (non-negotiable)

| Requirement | How the dashboard satisfies it |
|-------------|----------------------------------|
| **No per-scan trails** | Dashboard reads **signed child documents** and season config only. Opening the board is not logged as gameplay analytics. |
| **No location history** | Pin positions are **fixed schematic coordinates** in season JSON (0–1 layout grid), not GPS, not browser geolocation, not “distance to node.” |
| **No player IDs** | No “your unlocks,” streaks, or visit checkmarks. Everyone sees identical world state. |
| **Passive scan unchanged** | `GET /c/…` scan SSR still does not increment quorum, fragments, or scarcity. |
| **Contribute stays voluntary** | Quorum advances only via `POST …/game-contribute` with site code — same as scan contribute UI. |
| **Device-local scarcity invisible** | Witness sunset pass ceiling (`localStorage`) **must not** appear on the server board — copy links to scan only. |
| **Care wins** | If care stream is pause/closure, map chip shows **maintenance** and mutes game bulletin chips for that node (same precedence as scan). |
| **Allowed public truth** | Faction hold, route/chapter live, collective `n/target`, `unlocked_by`, fragment lattice, revoked/compromised, operator bulletins — already on `game_node` documents. |

**Forbidden copy on the dashboard:** heatmap, “players nearby,” “you visited,” rank, streak, scan count, “42 people here today,” fine-grained coordinates marketed as tracking.

**Required copy:** link to [data policy](/data-policy.html) and rules page — *“Same city state for everyone. No account. No visit log.”*

---

## What this is not

Do not conflate these surfaces:

| Surface | Role |
|---------|------|
| **[`CITY_GAME_NODE_INSTALL_MAP.md`](CITY_GAME_NODE_INSTALL_MAP.md)** | Internal operator install checklist — steward contacts, QR issued — **never public** |
| **Map dashboard (this doc)** | Public **world state** board for players |
| **`/game-operator/`** | Signed **write** console for operators — not a player map |
| **Research demo HTML** | Layout reference only until resolver snapshot ships |

---

## Architecture

### Layering

```text
┌─────────────────────────────────────────────────────────────┐
│  Pages: /play/cedar-rapids/  (static shell + client poll) │
│    • district schematic SVG                                 │
│    • status chips per node (from snapshot)                  │
│    • unlock graph legend (from season config)               │
│    • optional headline ticker (bulletin_schedule + diffs)   │
└───────────────────────────┬─────────────────────────────────┘
                            │ GET (read-only, no auth)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Worker: season snapshot API (new)                          │
│    • CITY_GAME_ENABLED gate                                 │
│    • loads season config + active game_node child rows      │
│    • applies same precedence as scan-view (care > dormant)  │
│    • returns aggregate-safe JSON only                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  D1: child_object documents (existing)                      │
│    game_meta + object_streams + lifecycle status            │
└─────────────────────────────────────────────────────────────┘
```

**No new persistence for v1 dashboard:** do not add `map_views`, player sessions, or access-log rows for dashboard GETs.

### Shared semantics with scan

Map pin state MUST be derived from the same functions and precedence as scan SSR:

| Concern | Reuse |
|---------|--------|
| Care pause detection | `scan-view.ts` care regex + stream scan |
| Dormant / `visible_until` | `resolveSeasonWindowPhase` + `game_meta.visible_until` |
| Collective quorum display | `isCollectiveQuorumComplete`, `collective_progress` / `target` |
| Fragment lattice | `fragmentLatticeProgress` on finale `game_meta` |
| Vouch gate (read-only) | `witness-gate.ts` → `resolveWitnessGate` — witness child `vouch_active_for`; board chip + fog use same helper as scan (**not** RelationshipEdge v1 yet) |
| Contribute mode | `gameNodeContributeMode` — show “quorum open” vs “fragment” vs “scarcity” labels only |

Extract a small **`city-game/map-node-snapshot.ts`** (name TBD) that both `scan-view` and the snapshot handler call — avoid duplicating precedence rules in Pages JS.

#### Witness gate evaluation (safety extraction)

**Status:** Single-source-of-truth in `worker/src/city-game/witness-gate.ts` — **not** RelationshipEdge v1 protocol storage yet.

Scan SSR, map snapshot chips, and signal-war fog all call `resolveWitnessGate`, which reads witness child documents (`vouch_active_for` on the witness node, not the target). Snapshot rows include precomputed `vouch_gate` when the handler batches `buildWitnessMetaByNodeId` across season child objects.

Removes the incorrect target-self check that caused board “Sealed” while scan showed “Witness vouch live.”

### API sketch (Worker)

**Route (proposed):**

`GET /.well-known/hc/v1/seasons/{season_id}/snapshot`

**Gates:**

- `CITY_GAME_ENABLED=1`
- `season_id` must match loaded season config (today: `cr_season_01_wake`)
- Rate limit: generous read cap per IP (abuse control only — **not** identity); no response personalization

**Response shape (illustrative):**

```json
{
  "season_id": "cr_season_01_wake",
  "title": "Wake the city",
  "window_phase": "open",
  "generated_at": "2026-06-02T18:00:00Z",
  "nodes": [
    {
      "node_id": "node_04",
      "label": "Riverwalk River Lantern",
      "district": "river_spine",
      "role": "temp_drop",
      "scan_url": "https://humanity.llc/c/…",
      "lifecycle": "active",
      "map_mode": "game",
      "chips": [
        { "kind": "collective", "label": "City progress", "value": "14 / 20" },
        { "kind": "unlock", "label": "Unlocks", "value": "Czech Village cabinet path" }
      ]
    }
  ],
  "unlock_edges": [
    { "from": "node_04", "to": "node_07", "label": "River Lantern unlocks Czech Village cabinet", "satisfied": false }
  ],
  "finale": {
    "node_id": "node_13",
    "fragments": { "claimed": 2, "required": 3, "complete": false },
    "open": false
  },
  "headlines": []
}
```

**Field rules:**

| Field | Source | Omit when |
|-------|--------|-----------|
| `chips` | Derived public scan hero + streams | Lifecycle revoked — show revoke chip only |
| `scan_url` | Issued QR on season root | Node not minted / no QR |
| `unlock_edges[].satisfied` | Target `game_meta.unlocked_by` contains edge outcome | — |
| `headlines` | Diff vs prior snapshot **or** `bulletin_schedule` slot | S1: empty; S2+: optional |
| `collective_progress` raw | Only aggregate integers | Never emit contributor ids |

**Explicitly omit from snapshot:** `profile_id` of scanners, IP hashes, D1 contribute bucket keys, site codes, game-operator keys, internal `object_id` unless needed for support (prefer `node_id` only in public JSON).

### Season config extensions

Add to [`site/data/city-game-cr-season-01.json`](../site/data/city-game-cr-season-01.json) when implementing **M1**:

```json
"map_layout": {
  "version": 1,
  "nodes": {
    "node_01": { "x": 0.72, "y": 0.38 },
    "node_04": { "x": 0.55, "y": 0.62 }
  }
}
```

| Rule | Detail |
|------|--------|
| **Coordinates** | Normalized `x`/`y` in `[0,1]` for SVG placement — **not** WGS84 |
| **District grouping** | Still driven by `nodes[].district`; layout is visual only |
| **Install GPS** | Stays in operator install map only |
| **Validation** | `verify:city-game` test: every registry `node_id` has layout entry at launch footprint |

Optional `map_copy` block for board title, privacy footnote, and “how to read chips” — keeps marketing edits out of Worker code.

---

## Map pin vocabulary (PWM-MS01–12)

Pins show **world verbs**, not player verbs. Map one or more chips per node using existing streams + `game_meta`:

| Chip kind | Traceability | Signal |
|-----------|--------------|--------|
| `ward` | PWM-MS01 | Place stream “unclaimed” / default controller |
| `faction` | PWM-MS02 | Relay territory stream |
| `sanctuary` | PWM-MS03 | Sanctuary role + truce/dawn copy |
| `drop` | PWM-MS04 | Temp drop live / dormant |
| `weather_route` | PWM-MS05 | Route stream weather mode (S2+ schedule) |
| `repair` | PWM-MS06 | Care loop quest open |
| `artist` | PWM-MS07 | Lore / place artist note |
| `revoked` | PWM-MS08 | Lifecycle revoked |
| `finale` | PWM-MS09 | Fragment lattice on `node_13` |
| `route` | PWM-MS10 | Route rerouted stream |
| `chapter` | PWM-MS11 | Lore chapter active / `unlocked_by` |
| `maintenance` | PWM-MS12 | Care pause — **suppresses** game chips |

**Clues on the board:** only **city-visible** clue state (chapter live, fragment registered, cabinet evolved, quorum band). Anti-hoarding “seed vs evolved” is **object evolution** on `node_04`/`node_07`, not a private inventory (**CR-G02**, **CR-M03**).

---

## Headline ticker (CR-M01–07)

| Phase | Delivery | Source |
|-------|----------|--------|
| **M1** | None | Static board only |
| **M2** | Manual “weekend beats” list on rules page | Operator-curated HTML |
| **M3** | Auto headlines on dashboard | `bulletin_schedule` slots + snapshot diff when `unlocked_by` or `collective_progress` crosses threshold |

Headlines are **editorial world events** (“River Lantern quorum met → cabinet path live”), not analytics. Cap list length (e.g. 8), TTL optional in config, no timestamps that enable player correlation unless season window already public.

---

## Implementation phases

Align with rollout **S1 → S2 → S3** in the parent spec. Map work is **not** a launch blocker for 15-node S1 unless product explicitly promotes the board in launch marketing.

### M1 — Static city board (S1-friendly)

**Ship on Pages only** — no Worker snapshot yet.

| Item | Detail |
|------|--------|
| **URL** | `/play/cedar-rapids/#city-state` or dedicated `/play/cedar-rapids/map/` |
| **Content** | District columns, 15 nodes from season JSON, `unlock_edges` diagram, role legend |
| **Live state** | Link each node to scan URL when known; chips show “Scan for live state” |
| **Privacy** | Prominent footnote + link data policy |
| **Tests** | `verify:city-game` or `build` checks season JSON ↔ layout completeness |

**Traceability:** satisfies **PWM-P06** (read without account) for structure; **CR-M*** remain **C** until live chips ship.

### M2 — Live snapshot board (S2)

| Item | Detail |
|------|--------|
| **API** | `GET …/seasons/{season_id}/snapshot` |
| **Client** | `site/js/city-game-map-dashboard.mjs` — poll every 60–120s, no WebSocket |
| **UI** | SVG schematic + chips + edge `satisfied` styling |
| **Precedence** | Shared `map-node-snapshot` module with scan |
| **Tests** | `worker/tests/city-game-season-snapshot.test.ts` — care overrides game, revoked node, quorum display, fragment lattice |
| **Regression** | Add to `verify:city-game` |

**Do not** widen `reconcileSeasonUnlockDrift` to run on snapshot GET — repair stays on bounded scan paths (**R-17**).

### M3 — Headlines + density (S3)

| Item | Detail |
|------|--------|
| **Headlines** | `bulletin_schedule` + unlock diffs (**CR-M01–07**) |
| **50 nodes** | Layout validation + performance budget (single JSON &lt; 32KB) |
| **Optional** | Compact list view for low-end phones; reduced motion instant paint |

---

## UI / UX standards

### Network lens (presentation — canonical)

**Status:** Spec signed for implementation · replaces interim “map-first” layout notes  
**Handoff spec:** [`SF-3_LIVING_NETWORK_LENS.md`](SF-3_LIVING_NETWORK_LENS.md) — living network, wireframes, repeat-scan loops, success metrics  
**Architecture:** [`DISCOVERY_PROJECTION.md`](DISCOVERY_PROJECTION.md) § Board maps reading pins through a network lens · [`STATE_FIRST_UI_MODEL.md`](STATE_FIRST_UI_MODEL.md) § SF-3  
**Presentation only** — snapshot API, fog rules, contribute POST, and DOM ids snapshot JS depends on change only via explicit migration + tests.

#### Product noun

| Audience | Term |
|----------|------|
| **Spec / engineering** | **Network lens** — read-only view over DiscoveryPins filtered by `season_id` (`data-pin-lens="1"`) |
| **Players (Cedar Rapids)** | **Weekend board** or season title (`Wake the city`) — avoid “Your map”, “dashboard”, L1–L5 labels |
| **Rules / charter** | **Public network** — definition and signers live on [`/play/cedar-rapids/`](../site/play/cedar-rapids/), not repeated as essays on the lens |

**North star:** *A live public network that plays like a game board and reads like ground truth.*

**Visual metaphor:** **Transit map** — full schematic network visible; **express spine** emphasized; **unlock edges** as lines that light when satisfied; **ticker / care** as service alerts; pin stops show **readable state** (not anonymous dots).

#### Two surfaces (do not merge)

| Surface | URL | Job |
|---------|-----|-----|
| **Rules + charter** | `/play/cedar-rapids/` | What scanning proves, privacy, LO-4 teaching, link to lens |
| **Network lens** | `/play/cedar-rapids/map/` | **Instrument** — where things are, what changed, where to go next, then **scan** for ground truth |

The lens is a **between-scans scoreboard**, not the game client. Stickers resolve to `/c/…`; the lens plans walks and shows **city** progress.

#### Two-map contract

1. **Network map (lens)** — schematic 0–1 layout in season JSON; shows signed **world** state; not turn-by-turn.  
2. **Walking** — **Open in Maps** on the selected pin panel; never imply pin distance matches real-world meters.

Copy: [`player_guide`](../../site/data/city-game-cr-season-01.json) already states the sketch is not directions — keep that honest.

#### Discovery cross-links (shipped · WS-DISCOVER-P1-4)

The network lens and discovery browse are **complementary surfaces** ([`DISCOVERY_PROJECTION.md`](DISCOVERY_PROJECTION.md)):

| Surface | URL | Job |
|---------|-----|-----|
| **Network lens** | `/play/cedar-rapids/map/` | Schematic **world state** — snapshot chips, express spine, scan CTAs |
| **Discovery browse** | `/discover/cedar-rapids-iowa/` | **Near-me planning** — alphabetical or client-sorted pin list; bookmark URLs |

**Cross-links on the lens (shipped):**

- Place list header: **Browse places near me** → discovery region browse (client-side near-me sort; privacy copy on discover page).
- Each place row (when pin lens + `pin_id`): **Discovery pin** → `/discover/{region}/pin/{pin_id}/` (human bookmark, not a scan URL).
- Selection panel mirrors row links (Scan · Open in Maps · Discovery pin).
- Map page footnote links to discovery browse.

**Do not** add geolocation to the lens sketch — near-me stays on `/discover/*` only.

#### Default view: full map + express spine

| Layer | Default |
|-------|---------|
| **Sketch** | **All** listed pins visible (fog hides per Signal War rules — ghost/rumor styling, not broken UI) |
| **Express emphasis** | Spine stops larger / labeled; spine `unlock_edges` drawn as the **active line**; one stop marked **Next** (`comprehension_kit.primary_scan_node`, today `node_04`) |
| **Place list** | Default filter **Play spine** (~5–8 cooperative stops); one tap to **All places (N)** for faction / full registry |
| **Selection** | Tap any pin → **one** tier-4 panel (scan-hero shape): entity → state → Scan CTA → Open in Maps — **no** parallel spotlight card + row + mission duplicate |

**Spine sources (until `network_lens` ships in JSON):** derive express stops from `comprehension_kit.primary_scan_node`, autonomous unlock chain (`node_04` → `node_07` → fragment nodes → finale), and optional sanctuary regroup (`node_02` / `node_12` per GT-3). Consolidate into **`network_lens.play_spine[]`** in season JSON before next presentation PR.

#### Two game layers on one lens

Cedar Rapids runs **cooperative awakening** + **Signal War** contest on the same resolver ([`CITY_GAME_SUMMER_MOMENTUM.md`](CITY_GAME_SUMMER_MOMENTUM.md)):

| Layer | Lens treatment |
|-------|----------------|
| **Co-op express** | Spine line + fragment/finale progress strip |
| **Contest overlay** | Relay hold / fog on full map (district tint or pin state — no heatmap); **dual victory** panel from snapshot when `dualVictory` present |

**Instrument audit (wire before polish):** `#city-game-map-dual-victory-mount`, snapshot apply for dual victory, SF-2b state on **pins** (not only list rows). See § Launch sign-off.

#### LO-4 reference spine

LO-4 comprehension path includes **board reference spine** ([`city-game-reference-network-core.mjs`](../site/js/city-game-reference-network-core.mjs)). Do **not** delete — **refactor** into transit **legend + express station list** on the lens (same probes, less essay). Full charter remains on rules page.

#### Copy reconcile

Season `player_guide` currently says **“No required first stop”** while `comprehension_kit` and launch copy emphasize River Lantern. Align to transit framing: *any listed stop is valid; the express line recommends where to start* — update `player_guide` / `launch` in the same PR as spine config when presentation ships.

#### Above-the-fold budget (mobile)

| Slot | Max | Content |
|------|-----|---------|
| Page chrome | 2 lines | City + season title |
| Season chip | 1 line | Window dates |
| **Network map** | ≥50% viewport | Schematic SVG — primary surface |
| **City strip** | 2 lines | Hook · progress · `generated_at` / sync |
| Selection panel | 0–1 node | Only when pin selected |
| List | below fold | Default spine lens |

#### Target DOM order (inside `#city-game-map-root`)

1. **Network map** (schematic SVG; pins carry snapshot state labels)  
2. **City strip** (world progress; quest lore in `<details>`)  
3. **Selection panel** (replaces always-visible spotlight)  
4. **Place list** (default spine; expand to all)  
5. **Drawer** — events · paths · dual victory · advanced (single collapsible band, not six open sections)

Rules copy, wake-loop essays, and full charter → rules page anchors only.

#### Label dictionary (game ↔ reusable network)

| Game (Cedar Rapids) | Generic network season |
|---------------------|-------------------------|
| Playable node / place | Member object |
| Path / route | Unlock edge |
| Quest / city goal | Collective goal |
| Game event / activity | Network headline |

All player-facing strings from season `map_copy` / `launch` / `network_lens` — never hardcode CR in layout code.

#### Proposed season config (`network_lens`)

Document before implementation; validate in `verify:city-game`:

```json
"network_lens": {
  "play_spine": ["node_04", "node_07", "node_09", "node_11", "node_13"],
  "default_list": "spine",
  "contest_layer": true,
  "next_node_id": "node_04"
}
```

`default_list`: `"spine"` | `"all"`. Optional `express_edges`: subset of `unlock_edges` ids for line drawing.

#### Anti-patterns (do not ship)

- Status essay before the map  
- Duplicate sketch in list + hero  
- Spotlight card **and** selection panel **and** highlighted row for the same node  
- New CSS frameworks (`pnl-*`, etc.) — extend `city-game-map-*` only  
- “State first” as prose first — **state first = pins and selection panel show truth** ([`STATE_FIRST_UI_MODEL.md`](STATE_FIRST_UI_MODEL.md))  
- Personal progress, GPS, visit counts, heatmaps (policy § above)  
- Treating lens layout experiments as canonical before this section is updated  

#### Comprehension gates

| ID | Question | When |
|----|----------|------|
| **GT-7** | Does the lens show what the **city** knows, not what **I** did? | B13 / live board marketing |
| **GT-8** | Can you point to where you would go first **within 10s** of opening the lens (un coached)? | Network lens v2 sign-off |
| **RN-1–RN-3** | Public network definition + signers + season end (rules-first path) | LO-4 · [`city-game-reference-network-core.mjs`](../site/js/city-game-reference-network-core.mjs) |

E2E green ≠ GT-8 pass. Record human probes in [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md).

#### Implementation phases (doc → code)

| Phase | Scope | Exit |
|-------|--------|------|
| **0** | This section + SF-3 in state-first doc + GT-8 / install QA rows | Doc merged |
| **1** | Pin state labels, selection panel, spine list default, dual-victory mount | GT-8 ≥4/5 on staging |
| **2** | Express edge styling, contest overlay, drawer collapse | Photo-ready screenshot (Lane C) |
| **3** | Page shell trim, `network_lens` in season JSON, copy reconcile | B13 human sign-off |

Do **not** deploy presentation changes to production as “done” until Phase 1 exit unless hotfix.

#### Visual dialect (emphasis plates — 2026-06)

Presentation-only refresh aligned with [`hc-emphasis-card.css`](../site/css/hc-emphasis-card.css) (legacy landing privacy/framing cards). Red reserved for **Next pin**, **express edges**, and **scan CTAs** — not selection chrome.

| Phase | Surface | Status |
|-------|---------|--------|
| **C1** | Lens panels (live state, express callout, selection, sketch hero) | ☑ Shipped |
| **B** | Public network cards on `/` and `/play/season/` | ☑ Shipped |
| **C2** | Map list/selection/filter chrome → info tint | ☑ Shipped |
| **D** | Rules page player guide + privacy + board CTA plates | ☑ Shipped |

**Engineering preflight:** `npm run city-game:network-lens-preflight` (board + rules surfaces + `network_lens` JSON). **Human:** GT-8 orientation (≥4/5 testers) — [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md) · field walk [`gt8-field-walk.html`](../site/play/cedar-rapids/comprehension/gt8-field-walk.html) (`npm run city-game:network-lens-gt8-kit -- --production`).

| Standard | Application |
|----------|-------------|
| **Device shell** | Lens is a **Pages** surface — no `DEVICE_SHELL_ASSET_VERSION` bump unless importing shell modules |
| **Naming** | Page title **“City state”** or **“Weekend board”** — avoid “Your map” |
| **Accessibility** | SVG `role="img"` + list fallback; pin targets sized for outdoor tap; `prefers-reduced-motion` for edge pulse |
| **Offline** | Last snapshot timestamp; stale banner after 2× poll interval |
| **Poll budget** | 60–120s poll; passive `GET` snapshot — not a realtime app ([`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md)) |
| **Launch surfaces** | Site links to lens are OK; **B13** before treating lens as field-launch **centerpiece** ([`CITY_GAME_LAUNCH_CHECKLIST.md`](CITY_GAME_LAUNCH_CHECKLIST.md) P6) |
| **Reuse** | Same presentation module for [`example-city`](../site/play/example-city/map/) — CR is instance, not fork |

---

## Engineering checklist

### Worker

- [x] `map-node-snapshot.ts` — derive `MapNodeSnapshot` from child row + season config
- [x] `handleSeasonSnapshot` in router — `CITY_GAME_ENABLED` gate, season id validation
- [x] Rate limiter (read-only, IP bucket)
- [x] Tests: care pause, revoked, quorum, fragments, compromised, season window closed

### Pages

- [x] `map_layout` in season JSON + validation script
- [x] Schematic SVG (district backgrounds, pin components)
- [x] `city-game-map-board.mjs` + `city-game-map-snapshot.mjs` — fetch snapshot, render chips, poll
- [x] Rules page section linking board + privacy
- [ ] `npm run build` includes new static assets (verify on deploy)

### Docs / ops

- [x] Update [`CITY_GAME_SUPPORT_MACROS.md`](CITY_GAME_SUPPORT_MACROS.md) — “where is the city board?”
- [x] [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md) — GT-7 row
- [x] Launch checklist **P6** wired — `city-game:map-board-b13-preflight` when live board marketed

### Explicit non-goals (all phases)

- Browser geolocation API
- Personal localStorage progress on the board (except optional “last visited scan URL” bookmark — **defer**, risks feeling like tracking)
- WebSocket push / steward notifications on board views
- Embedding third-party map tiles (Google/OSM) — invites location-tracking expectations
- Requiring Humanity Card create to view board

---

## Risks and gates

| ID | Risk | Mitigation |
|----|------|------------|
| **R-09** (parent) | Map confused with surveillance product | This doc + GT-7 + forbidden copy lint in snapshot tests |
| **R-17** (parent) | Snapshot GET triggers heavy D1 repair | Snapshot is **read-only**; no `reconcileSeasonUnlockDrift` on dashboard path |
| **R-19** (new) | Snapshot polling amplifies D1 read load at 50 nodes | **Shipped:** cache snapshot 20s in Worker memory per colo + ETag; monitor at S3 |
| **R-20** (new) | M1 static board implies live chips | Label “Scan for live state” until M2; launch-surfaces honesty (**B2**) |

| Gate | When | Proof |
|------|------|-------|
| **B13** | Before marketing “live city board” | Privacy review sign-off on snapshot JSON shape + GT-7 pass |
| **B14** | M2 deploy | `verify:city-game` includes snapshot + scan-analytics gate tests; P5 policy/source audit |
| **B15** | M3 headlines | Headlines contain no per-player or visit-count language — copy test |

---

## Traceability delivery updates (target)

When each phase ships, update [**§ Feature page traceability**](CITY_GAME_V1_IMPLEMENTATION.md#feature-page-traceability-complete-catalog) **Delivery** column:

| ID | After M1 | After M2 | After M3 |
|----|----------|----------|----------|
| **CR-M01–07** | **C** (structure only) | **L** partial (live chips) | **L** + headlines |
| **PWM-MS01–12** | **C** | **L** (chips from snapshot) | **L** |
| **PWM-P02–03** | **P** + board copy | **P** + **L** snapshot | unchanged |

---

## Related commands

```bash
npm run verify:city-game          # after Worker snapshot tests land
npm run e2e:city-game-map-board   # rules page board + snapshot poll (mock API)
npm run city-game:launch-preflight
npm run build                     # Pages board assets
```

---

## Launch sign-off (B13 / P6)

When launch surfaces market a **live** city board (`#city-state` + live chips copy), complete before `launch-checklist-sign-off -- --pass`:

| Gate | Status | Date |
|------|--------|------|
| SF-2 state-first node rows (engineering + visual QA) | ☑ Complete | 2026-06-10 |
| SF-3 network lens — spec | ☑ Doc | 2026-06-21 |
| SF-3 network lens — implementation (phases 1–3 + visual C1–D) | ☑ Engineering | 2026-06-21 |
| SF-3 GT-8 human orientation (≥4/5 testers, &lt;10s) | ☐ Pending | |
| B13 privacy engineering (snapshot JSON + public surface copy) | ☑ Complete | 2026-06-21 |
| B13 privacy review (human sign-off) | ☐ Pending | |

**Engineering:** `npm run city-game:network-lens-preflight` (SF-3) · `npm run city-game:map-board-privacy-preflight` (B13 engineering) · `npm run city-game:map-board-b13-preflight` (B14 + GT-7 + privacy sign-off)  
**Record GT-8:** `npm run city-game:network-lens-sign-off -- --pass --apply --reviewer "Name"` (after ≥4/5 testers in runbook)  
**Record B13:** `npm run city-game:map-board-b13-sign-off -- --pass --apply --reviewer "Name"`

---

## Changelog

| Date | Event |
|------|-------|
| 2026-06-02 | **M2–M3 shipped** — snapshot API, live chips, headline ticker, launch-surfaces board links, GT-7 comprehension kit |
| 2026-06-02 | **M1 shipped** — `map_layout` + `map_copy` in season JSON; `/play/cedar-rapids/#city-state`; `site/js/city-game-map-board*.mjs`; `verify:city-game` layout tests |
| 2026-06-21 | **Network lens v2 spec** — transit map metaphor, express spine, two-map contract, `network_lens` JSON sketch, phases 0–3; replaces interim map-first notes |
| 2026-06-21 | **SF-3 engineering + visual C1–D** — network lens phases 1–3, emphasis plates on lens/rules/portal; GT-8 human gate tooling (`city-game:network-lens-preflight`) |
| 2026-06-21 | **B13 privacy engineering** — snapshot JSON key audit + negation-aware public surface copy (`city-game:map-board-privacy-preflight`) |
| 2026-06-21 | **GT-8 field walk kit** — outdoor B1–B7 scenarios + 10s timer at `/play/cedar-rapids/comprehension/gt8-field-walk.html` |
| 2026-06-10 | **SF-2 visually complete** — state-first node rows + dark-theme contrast; ready for B13 human sign-off (`city-game:map-board-b13-preflight`) |
| 2026-06-02 | Initial canonical plan — M1 static / M2 snapshot / M3 headlines; policy boundaries; API sketch; risks R-19–R-20, gates B13–B15 |
