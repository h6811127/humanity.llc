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
| Vouch gate (read-only) | `resolveGameVouchGate` — show “path sealed / open” chip, not who vouched |
| Contribute mode | `gameNodeContributeMode` — show “quorum open” vs “fragment” vs “scarcity” labels only |

Extract a small **`city-game/map-node-snapshot.ts`** (name TBD) that both `scan-view` and the snapshot handler call — avoid duplicating precedence rules in Pages JS.

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

| Standard | Application |
|----------|-------------|
| **Device shell** | Dashboard is a **Pages** surface, not status-module graph — no `DEVICE_SHELL_ASSET_VERSION` bump unless importing shell modules |
| **Naming** | Page title **“City state”** or **“Weekend board”** — avoid “Your map” |
| **Accessibility** | SVG `role="img"` + tabular fallback list of nodes with same chips |
| **Offline** | Show last snapshot timestamp; stale banner after 2× poll interval |
| **Launch surfaces** | `city-game:launch-surfaces` adds link from rules hero when **M2** ships — not before snapshot API is live |
| **Comprehension GT** | Add GT-7: “Does the board show what the **city** knows, not what **I** did?” |

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
| B13 privacy review (snapshot JSON shape + no visit/player fields) | ☐ Pending | |

**Engineering:** `npm run city-game:map-board-b13-preflight` (B14 + GT-7 log + row above)  
**Record:** `npm run city-game:map-board-b13-sign-off -- --pass --apply --reviewer "Name"`

---

## Changelog

| Date | Event |
|------|-------|
| 2026-06-02 | **M2–M3 shipped** — snapshot API, live chips, headline ticker, launch-surfaces board links, GT-7 comprehension kit |
| 2026-06-02 | **M1 shipped** — `map_layout` + `map_copy` in season JSON; `/play/cedar-rapids/#city-state`; `site/js/city-game-map-board*.mjs`; `verify:city-game` layout tests |
| 2026-06-10 | **SF-2 visually complete** — state-first node rows + dark-theme contrast; ready for B13 human sign-off (`city-game:map-board-b13-preflight`) |
| 2026-06-02 | Initial canonical plan — M1 static / M2 snapshot / M3 headlines; policy boundaries; API sketch; risks R-19–R-20, gates B13–B15 |
