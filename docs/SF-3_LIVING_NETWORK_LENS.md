# SF-3 — Living Network Lens (production spec)

**Status:** Canonical implementation handoff · **engineering ☑ 2026-06-21** · **GT-8 human ☐**  
**Workstream:** WS-CR / WS-QUALITY (presentation) · **WS-LIVE** sub-track  
**Surface:** `/play/cedar-rapids/map/` (primary) · pattern reusable for future network seasons  
**Audience:** Implementation agents, frontend, QA, product

**Parent specs:** [`STATE_FIRST_UI_MODEL.md`](STATE_FIRST_UI_MODEL.md) · [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) · [`DISCOVERY_PROJECTION.md`](DISCOVERY_PROJECTION.md)  
**Regression:** `npm run city-game:network-lens-preflight` · `npm run verify:city-game` · `npm run e2e:city-game-map-board`

---

## Hard constraints (non-negotiable)

| Constraint | Rule |
|------------|------|
| **No new backend primitives** | Use existing child objects, streams, `game_meta`, season JSON, snapshot GET only |
| **No new persistence** | No `map_views`, player sessions, visit logs, analytics rows |
| **No new APIs** | `GET /.well-known/hc/v1/seasons/{season_id}/snapshot` + existing scan/contribute POST |
| **No accounts** | Identical world state for every viewer |
| **No visit logs** | Opening lens or re-scanning board is not tracked as gameplay |
| **No notifications** | No push, no inbox, no foreground strip for board changes |
| **No surveillance UI** | No heatmaps, “players nearby,” streaks, scan counts, fine-grained GPS on sketch |

**Allowed:** Presentation-only changes — HTML order, CSS, copy from season JSON, client poll, DOM diff on snapshot apply, fog styling (visual-only).

---

## 1. SF-3 Overview

### Goal

Deliver a **living network lens** — a read-only **between-scans instrument** where strangers immediately see that Cedar Rapids is a **shared, signed, changing public network**, then walk to a sticker for ground truth.

**North star:** *A live public network that plays like a game board and reads like ground truth.*

### User problem

| Problem | Without SF-3 | With SF-3 |
|---------|--------------|-----------|
| “Is this real or marketing?” | Static map + rules essay | Pins show **signed state** + **sync time** |
| “Where do I start?” | 40 equal nodes | **Express line** + **Next** stop (GT-8) |
| “Did anything change since yesterday?” | No diff surface | **Ticker**, lit **unlock edges**, quorum/fragment bands |
| “How do places connect?” | Hidden in rules | **Spine + graph** on sketch; chips name unlocks |
| “Why scan again?” | One-and-done QR | Board **teases** quorum, windows, bulletins; scan **acts** |

### Why this matters for the Physical Internet

Humanity’s Physical Internet promise is **live state on real objects** — not apps, accounts, or feeds. SF-3 proves the pattern at network scale:

- **Objects** (`game_node`, status plates) carry signed truth on scan.
- **Places** (DiscoveryPins) anchor objects in the city.
- **Networks** (`cr_season_01_wake`) filter places into one **weekend board**.
- **State** (snapshot chips, headlines, edges) composes **world** progress without identity.

The lens is the **utility layer** strangers expect from infrastructure: like checking transit status before riding — plan the walk, see system state, confirm on the sticker.

### Relationship to SF-1 and SF-2

| Slice | Surface | SF-3 dependency |
|-------|---------|-----------------|
| **SF-1** ☑ | Public network discovery cards on `/` | Cards promote **state hero** (“Live now · 40 places”) → primary CTA **Open board** lands on SF-3 lens |
| **SF-2** ☑ | City board **place list rows** | Row order: identity → **`[data-node-effect]` state hero** → Scan CTA. SF-3 **reuses** same row component for “All places” list |
| **SF-2b** | Pin + selection panel chips from snapshot | SF-3 **extends** SF-2 state-first to **sketch pins** and **`#city-game-map-selection-panel`**, not list-only |
| **SF-3** | Full lens choreography | Transit map + express spine + change visibility + relationship graph + repeat-scan loops |

**State-first order (all three slices):** entity → **state hero** → action → governance → details ([`STATE_FIRST_UI_MODEL.md`](STATE_FIRST_UI_MODEL.md)).

---

## 2. Information Architecture

### URLs and surfaces

| Surface | URL | Job |
|---------|-----|-----|
| **Rules + charter** | `/play/cedar-rapids/` | Privacy, LO-4 teaching, full charter — **not** duplicated on lens |
| **Network lens** | `/play/cedar-rapids/map/` | **This spec** — instrument between scans |
| **Scan (ground truth)** | `/c/{profile_id}?q={qr_id}` | Signed object state, contribute, vouch |
| **Discovery browse** | `/discover/cedar-rapids-iowa/` | Near-me planning, pin bookmarks — **no geo on lens** |

### Page shell (outside board)

```text
[top chrome: humanity.llc · Create]
[hero-compact: Cedar Rapids · Wake the city · Rules link]
[season banner: window dates · status chip]
[#city-game-map-root → board inner HTML]
[footnote: Full rules · Share board · Discover near me · data policy]
```

### Component hierarchy (inside `#city-game-map-root`)

Board root: `.city-game-map-board.city-game-map-board--network-lens`  
Attributes: `data-pin-lens="1"`, `data-snapshot-path`, `data-active-list-lens`, `data-map-visibility`, `data-primary-node`

```text
city-game-map-board--network-lens
├── #city-game-map-sketch-hero          [1] Network map (primary)
│   ├── #city-game-map-contest-overlay  (Signal War fog lead — contest seasons)
│   └── SVG schematic
│       ├── unlock edge paths (express / satisfied styling)
│       └── pins .city-game-map-pin
│           ├── .city-game-map-pin--spine
│           ├── .city-game-map-pin--next
│           ├── .city-game-map-pin--fog-hidden
│           └── .city-game-map-pin-state (snapshot label)
├── #city-game-map-live-state           [2] City strip
│   ├── #city-game-map-start-callout    Express line · Next stop
│   ├── #city-game-map-hook             World hook (aria-live)
│   ├── #city-game-map-progress         Fragment / city progress (aria-live)
│   ├── #city-game-map-mission-world    Aggregate status line
│   └── details.city-game-map-mission-details (lore — collapsed)
├── #city-game-map-selection-panel      [3] Tier-4 panel (hidden until selection)
│   ├── #city-game-map-selection-title
│   ├── [data-selection-effect]         State hero
│   ├── [data-selection-chips]          Chip band
│   ├── [data-selection-scan]           Scan CTA
│   ├── [data-selection-maps]           Open in Maps
│   └── [data-selection-discovery]      Discovery pin link
├── .city-game-map-places               [4] Place list
│   ├── list lens toggle (data-list-lens: spine | all)
│   ├── type / state / district filters
│   └── rows .city-game-map-row (SF-2)
├── .city-game-map-network-drawer       [5] Collapsed advanced
│   ├── paths / unlock legend
│   ├── #city-game-map-dual-victory-mount
│   ├── #city-game-live-map-ticker (also in drawer variant when compact)
│   └── express station legend
└── #city-game-map-debrief-mount        (post-season — hidden until window ends)
```

**DOM order normative:** map → city strip → selection (when active) → list → drawer. Do **not** insert essay blocks above the sketch.

### Navigation model

| Gesture | Result |
|---------|--------|
| **Land cold** | Full sketch visible; list filtered to **play spine**; no selection panel |
| **Tap pin on sketch** | Pin `--highlight`; selection panel populates; list row syncs scroll |
| **Tap list row** | Same as pin tap |
| **Tap Next callout** | Focus `network_lens.next_node_id` pin + open selection panel |
| **Toggle list lens** | `spine` ↔ `all` (`data-active-list-lens`) |
| **Scan CTA** | Navigate to `scan_url` from snapshot (external sticker truth) |
| **Open in Maps** | Pin `maps_query` / place label — walking layer, not sketch |
| **Discovery pin** | `/discover/{region}/pin/{pin_id}/` bookmark |
| **Rules / charter** | Leave lens → rules page |
| **Return visit** | Same URL; snapshot poll refreshes state (90s default) |

### Mobile-first layout

| Slot | Budget | Content |
|------|--------|---------|
| Page chrome | 2 lines | Brand + Create |
| Hero | 2 lines | City eyebrow + season title + Rules |
| **Network map** | **≥50vh** | Schematic SVG — never collapse below readable pin tap targets |
| **City strip** | 2–4 lines | Hook + progress + sync; start callout compact |
| Selection panel | 0–1 card | Only when pin selected — pushes list down, not overlay blocking map |
| Place list | below fold | Default spine (~5 stops); expand to 40 |
| Drawer | collapsed | “Network details” — ticker, dual victory, paths |

**Touch targets:** pins ≥44px effective; list rows full-width. **Reduced motion:** instant pin label updates, no mandatory edge animation.

---

## 3. First 10 Seconds

### Visual hierarchy (top → bottom, first paint)

1. **Schematic map** — colored districts, **spine stops larger**, one pin marked **Next**
2. **Express callout** (`#city-game-map-start-callout`) — kicker + title on recommended stop
3. **Progress line** (`#city-game-map-progress`) — e.g. *2 / 3 fragments* or quorum band on spine
4. **Sync line** (`#city-game-map-sync`) — *Updated · 2 min ago*
5. **Ticker** (if snapshot loaded) — one editorial headline in `#city-game-live-map-ticker`

### Exact copy recommendations

All strings from season JSON — **never hardcode Cedar Rapids in layout code**.

| Element | JSON source | Cedar Rapids default |
|---------|-------------|----------------------|
| Board title | `map_copy.title` or `title` | *Weekend city board* / *Wake the city* |
| Express kicker | `network_lens.copy.start_callout_kicker` | *Express line* |
| Next title | `network_lens.copy.start_callout_title_prefix` + node label | *Next · Riverwalk River Lantern* |
| Next why | `network_lens.copy.start_callout_why` | *Any listed stop is valid — the map marks a recommended first stop. Scan for live state.* |
| Hook | `launch.hook` / snapshot-driven `#city-game-map-hook` | *Find stickers. Scan them. Help unlock city goals.* |
| Progress | `#city-game-map-progress` from finale / collective | *Wake the city: 2 / 3 fragments* |
| Sync | `#city-game-map-sync` from `generated_at` | *Updated · just now* / *Updated · 3 min ago* |
| Ticker empty | static placeholder | *Waiting for city whispers…* |
| Figcaption | `map_copy.diagram_note` | *Tap a pin for live state and scan.* |
| Privacy (city strip) | `map_copy.privacy_footnote` | *Same city state for everyone. No account. No visit log.* |

### What the user notices first

1. **A map that looks like a transit system** — not a list, not a marketing hero
2. **One stop called “Next”** — orientation without forcing personal progression
3. **Numbers that look like city progress** — *14 / 20*, *2 / 3 fragments* — not “your level”
4. **A fresh timestamp** — truth is current

### “This network is alive” realization

Triggered when **three signals coincide** (GT-8 + living-network comprehension):

| Signal | Mechanism |
|--------|-----------|
| **Temporal** | `#city-game-map-sync` shows recent `generated_at` |
| **Editorial** | Ticker headline names a **world event** (quorum met, cabinet evolved, bridge compromised) |
| **Structural** | Spine pin state label ≠ generic placeholder — e.g. *14 / 20* or *Maintenance* |

**Not aliveness:** animation for its own sake, fake “live” pulsing without data, social activity counts.

**10-second pass criterion (GT-8):** Un coached tester points to a **first stop on the map** within 10s. Field kit: `npm run city-game:network-lens-gt8-kit -- --production`.

---

## 4. Visibility of Change

### Principle

Show **world state diffs**, not a **social feed**. Headlines are **editorial world events** derived from signed snapshot — cap 8, no contributor IDs, no timestamps that enable player correlation beyond public season window.

### State signals — complete inventory

Source: `buildMapNodeChips()` in `worker/src/city-game/map-node-snapshot.ts` (PWM-MS01–12). Max **4 chips** per pin on board.

| Priority | Chip kind | Label examples | When shown | Precedence |
|----------|-----------|----------------|------------|------------|
| **P0** | `maintenance` | Care · Maintenance pause | Care stream pause/closure | **Suppresses all game chips** |
| **P0** | `revoked` | Status · Revoked | Lifecycle revoked | Terminal |
| **P1** | `collective` | City progress · *14 / 20* | `collective_target` set | Co-op spine hero |
| **P1** | `finale` | Lattice · *2 / 3 fragments* | Finale node or `fragment_id` | City-level progress |
| **P2** | `drop` | Drop / Artifact / Passes | Temp drop, artifacts, scarcity | Object evolution |
| **P2** | `faction` | Hold / Relay / Compromised | Signal War relays | Contest layer |
| **P2** | `route` | Relay / Signal / Hold until | Bulletin + relay status | Scheduled beats |
| **P2** | `weather_route` | Route · Open tonight / Sealed | `route_window_schedule` | Time-gated paths |
| **P3** | `chapter` | Season / Evolution / Vouch / Unlocked by | Window phase, vouch gates, unlock graph | Relationship hints |
| **P3** | `sanctuary` | Zone · Sanctuary | Sanctuary role | Regroup |
| **P3** | `repair` | Care loop | Care-loop quest nodes | Discovery |
| **P3** | `artist` | Bulletin | `bulletin_schedule` active slot | Editorial |
| **P3** | `ward` | State | Fallback `public_state` | Default |

### Aggregate signals (board-level, not per-pin)

| Signal | DOM target | Source |
|--------|------------|--------|
| **Headlines** | `#city-game-live-map-ticker` | `buildLiveMapHeadlines()` — quorum, evolution, compromise, finale |
| **Unlock edges** | SVG path classes | `unlock_edges[].satisfied` from snapshot |
| **Finale footnote** | `#city-game-map-progress` | `snapshot.finale.fragments` |
| **Dual victory** | `#city-game-map-dual-victory-mount` | `snapshot.dualVictory` / paths |
| **Contest fog lead** | `#city-game-map-contest-overlay` | `data-map-visibility` rumor/signal_war |
| **Hook / consequence** | `#city-game-map-hook`, `#city-game-map-mission-consequence` | Snapshot apply updates on threshold cross |
| **Sync staleness** | `#city-game-map-sync` | `CITY_GAME_SNAPSHOT_STALE_MS` (180s) — copy degrades honestly |

### Display priority rules

1. **Care beats game** — maintenance chip only when care pause active (same as scan SSR).
2. **City progress before faction** — on spine pins, prefer `collective` / `finale` over faction hold in pin **state label** (short text on sketch).
3. **Ticker shows at most one hero headline** above fold; remainder in drawer list.
4. **Edge lighting** — satisfied edges use `--satisfied` class; unsatisfied express edges stay visible but muted.
5. **No feed mechanics** — no infinite scroll, no “new since your last visit”, no personal diff.

### Forbidden change UI

- “42 people contributed today”
- “You visited 3 stops”
- Heatmap or density shading
- Push notification prompts on lens
- Activity avatars or handles

---

## 5. Repeat Scan Loops

**Loop pattern:** Lens **teases** → walk → **scan confirms/acts** → return to lens **see diff**.

### Repeat-scan reasons (ranked by user value)

| Rank | Reason | User value | Cedar Rapids mechanic | Lens tease | Scan action |
|------|--------|------------|-------------------------|------------|-------------|
| **1** | **Push collective quorum** | Shared city unlock | `node_04` collective + site code `CR-LANTERN-7K` | Pin *14 / 20*; ticker at threshold | POST contribute; object may evolve |
| **2** | **See unlock fire** | Cause → effect comprehension | `node_04` → `node_07` edge | Edge lights; cabinet chip changes | Scan shows evolved public_state |
| **3** | **Register finale fragment** | Endgame participation | `node_09`, `node_11`, `node_01` → `node_13` | Lattice *2 / 3* on progress strip | Fragment contribute on scan |
| **4** | **Catch bulletin beat** | Weekend live event | `bulletin_schedule` on anchors | Controller + bulletin chips; ticker | Read signed bulletin on scan |
| **5** | **Hit time window** | Return at right hour | `route_window_schedule` e.g. `node_06` skywalk | *Sealed* → *Open tonight* | Scan shows route stream |
| **6** | **Resolve contest fog** | Signal War clarity | Fog on relay pins | Rumor chip · contest overlay | Scan reveals hold / capture state |
| **7** | **Respond to compromise** | Trust repair narrative | `node_05` bridge compromised | Ticker + compromised chip | Rekey path on scan |
| **8** | **Witness / scarcity gate** | Alternate path to cabinet | `node_10` witness → `node_07` vouch | Vouch chip *Sealed* / *Path open* | Scarcity contribute (device-local ceiling on scan) |
| **9** | **Rare artifact window** | Discovery delight | `node_21`, `node_22` artifacts | Artifact chip on board | Scan confirms artifact meta |
| **10** | **Care overrides game** | Safety truth | Care stream on e.g. `node_14` | Maintenance suppresses game | Scan shows care notice |
| **11** | **Sanctuary regroup** | Contest relief | `node_02`, `node_12` | Sanctuary chip | Scan confirms no capture |
| **12** | **Finale live switch** | Climax | `node_13` alley arch | Ticker + finale chips | Scan shows finale public_state |

### Loop timing (operator + system)

| Cadence | Driver | Existing data |
|---------|--------|---------------|
| **Minutes** | Quorum contributes | Collective progress on spine |
| **Hours** | Bulletin schedule slots | `after_start_hours` in season JSON |
| **Hours** | Route windows | Local hour slots on route nodes |
| **Days** | Return visit | Snapshot diff on edges, fragments, fog |
| **Weekly** | Operator Friday beat | Lane C bulletin flip (no new API) |

---

## 6. Relationship Discovery

### Express spine (co-op story)

**Config:** `network_lens.play_spine[]` — default `["node_04","node_07","node_09","node_11","node_13"]`  
**Visual:** pins `.city-game-map-pin--spine`; edges between consecutive spine nodes emphasized  
**Next:** `network_lens.next_node_id` → `.city-game-map-pin--next` + `#city-game-map-start-callout`  
**Teaching:** `network_charter.spine_lessons` on rules page; legend intro from `network_lens.copy.legend_intro`

**List default:** `data-active-list-lens="spine"` — ~5 cooperative stops; toggle **All places (N)**.

### Unlock graph (cause → effect)

**Config:** `unlock_edges[]` in season JSON  
**Visual:** SVG paths; class when `satisfied: true`  
**Chips:** `chapter` · *Unlocked by* / `unlock` kind from snapshot  
**Interaction:**

| Action | Result |
|--------|--------|
| Tap pin | Selection panel shows unlock chips |
| Tap satisfied edge (future-safe) | Focus `from` and `to` pins sequentially |
| Drawer paths section | Text legend of edge labels |

**Key Cedar Rapids edges:**

- `node_04` → `node_07` — River Lantern unlocks cabinet  
- `node_10` → `node_07` — Library witness opens cabinet path  
- Fragment nodes → `node_13` — finale lattice  

### Contest layer (second story, same pins)

**Config:** `network_lens.contest_layer: true`, `data-map-visibility`  
**Visual:** `#city-game-map-contest-overlay`, fog styling `.city-game-map-pin--fog-hidden`, faction hold chips  
**Dual victory:** `#city-game-map-dual-victory-mount` when snapshot includes paths  
**Rule:** Contest never overrides care maintenance; fog is **visual rumor**, pins stay tappable (M4).

### Place ↔ Object ↔ Network

```text
Network (cr_season_01_wake)
  └── filters DiscoveryPins (data-pin-lens="1")
        └── Place (pin_id, district, schematic x/y)
              └── Object(s) (game_node child docs → snapshot chips)
```

| Link | Lens UI |
|------|---------|
| Place → Object | Pin state from `object_id` snapshot row |
| Place → Network | Season title + window chip; board is network view |
| Place → Discovery catalog | **Discovery pin** link on row + selection panel |
| Object → Scan | **Scan sticker** CTA → `/c/…` |
| Place → Walking | **Open in Maps** (not sketch navigation) |

**LO-4 teaching:** Same primitive for game node + ordinary status plate — charter on rules page; lens shows game overlay only.

### Visual interaction model

```text
         [Ticker: world headline]
              │
    ┌─────────▼─────────┐
    │  Schematic map    │◄──── poll snapshot 90s
    │  spine ─── edges  │
    └─────────┬─────────┘
              │ tap pin
    ┌─────────▼─────────┐
    │ Selection panel   │
    │ entity → STATE    │
    │ Scan · Maps       │
    └─────────┬─────────┘
              │ Scan
    ┌─────────▼─────────┐
    │ /c/ scan page     │ contribute · vouch · read bulletin
    └─────────┬─────────┘
              │ return (bookmark)
    ┌─────────▼─────────┐
    │ Lens diff         │ edge lit · quorum up · new headline
    └───────────────────┘
```

---

## 7. Wireframe-Level Screens

### Empty state (snapshot loading / no live nodes yet)

```text
┌──────────────────────────────────────┐
│ humanity.llc              Create     │
├──────────────────────────────────────┤
│ Cedar Rapids                         │
│ Wake the city · Signal War           │
│ Rules                                │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │  [Schematic SVG — static layout]   │ │
│ │   pins: role hints only            │ │
│ │   "Scan for live state" on pins    │ │
│ └──────────────────────────────────┘ │
│ Tap a pin for live state and scan.   │
├──────────────────────────────────────┤
│ Express line                         │
│ Next · Riverwalk River Lantern       │
│ Any listed stop is valid…            │
├──────────────────────────────────────┤
│ Find stickers. Scan them…            │
│ Wake the city: — / 3 fragments       │
│ Syncing…                             │
│ • Waiting for city whispers…         │
├──────────────────────────────────────┤
│ ▼ Play spine (5) · All places (40)   │
│   River Lantern    Scan sticker there│
│   …                                  │
└──────────────────────────────────────┘
```

**Behavior:** `MAP_ROW_SCAN_HINT` on rows; no fake progress numbers.

### Active state (mid-season, snapshot live)

```text
┌──────────────────────────────────────┐
│ [Map ≥50vh — spine bold, NEXT badge] │
│  node_04 "14/20"  ─── edge lit ───►  │
│  node_07 "Evolved"      node_13 ★    │
├──────────────────────────────────────┤
│ Express line · Next · River Lantern  │
│ Find stickers. Scan them…            │
│ Wake the city: 2 / 3 fragments       │
│ Updated · 2 min ago                  │
│ • Riverwalk lantern hit 20 contrib…  │
├──────────────────────────────────────┤
│ SELECTED PLACE                       │
│ Riverwalk River Lantern              │
│ City progress · 14 / 20              │
│ [ Scan sticker ]  Open in Maps       │
├──────────────────────────────────────┤
│ ▼ Play spine                         │
│ ● River Lantern  14/20   Scan        │
│   Czech Village  Evolved Scan        │
│ …                                    │
│ ▶ Network details (paths · victory)  │
└──────────────────────────────────────┘
```

### Finale state (fragments complete / finale open)

```text
┌──────────────────────────────────────┐
│ [Map — finale pin largest on spine]  │
│  all fragment edges SATISFIED        │
│  node_13 "3/3 · LIVE"                │
├──────────────────────────────────────┤
│ Wake the city: 3 / 3 fragments ✓     │
│ Updated · just now                   │
│ • Downtown alley arch switched live  │
├──────────────────────────────────────┤
│ Dual victory (drawer open)           │
│ Awakening path · Faction path        │
├──────────────────────────────────────┤
│ Next · Downtown alley arch           │
│ [ Scan sticker ]                     │
└──────────────────────────────────────┘
```

**Post-season:** `#city-game-map-debrief-mount` surfaces debrief CTA from `debrief_path` when window closed.

---

## 8. Implementation Plan

### Exact files (presentation layer)

| File | Role |
|------|------|
| `site/js/city-game-map-board-core.mjs` | Board HTML, DOM order, callout, selection panel, drawer |
| `site/js/city-game-map-snapshot-core.mjs` | Snapshot apply — pins, ticker, progress, dual victory, sync |
| `site/js/city-game-map-snapshot.mjs` | Poll loop (`CITY_GAME_SNAPSHOT_POLL_MS`) |
| `site/js/city-game-network-lens-core.mjs` | `network_lens` config, spine, copy resolution |
| `site/js/city-game-map-node-card-core.mjs` | SF-2 list rows |
| `site/js/city-game-map-interaction.mjs` | Pin/list selection sync |
| `site/js/city-game-map-interaction-core.mjs` | Selection state machine |
| `site/js/city-game-map-filter-core.mjs` | Spine/all lens + filters |
| `site/js/city-game-map-page-scaffold-core.mjs` | Static page shell |
| `site/js/city-game-dual-victory-board-core.mjs` | Dual victory panel HTML |
| `site/styles.css` | `.city-game-map-board--network-lens`, pin/spine/next styles |
| `site/data/city-game-cr-season-01.json` | `network_lens`, `unlock_edges`, schedules, `map_copy` |
| `worker/src/city-game/map-node-snapshot.ts` | Chip derivation (do not duplicate in Pages) |
| `worker/src/city-game/live-map-ticker.ts` | Headline candidates |
| `worker/src/resolver/season-snapshot.ts` | Snapshot handler (read-only GET) |

### Tests and gates

| Command | Covers |
|---------|--------|
| `npm run city-game:network-lens-preflight` | SF-3 engineering + GT-8 status |
| `npm run worker:test -- worker/tests/city-game-network-lens-core.test.ts` | Lens config |
| `npm run worker:test -- worker/tests/city-game-map-board-core.test.ts` | DOM contract |
| `npm run worker:test -- worker/tests/city-game-map-snapshot-core.test.ts` | Snapshot apply |
| `npm run worker:test -- worker/tests/city-game-network-lens-sf3-core.test.ts` | Preflight gates |
| `npm run e2e:city-game-map-board` | Playwright board smoke |
| `npm run verify:city-game` | Full belt |

### Minimal implementation path (phases)

| Phase | Scope | Status |
|-------|-------|--------|
| **0** | Spec + season `network_lens` JSON + preflight | ☑ 2026-06-21 |
| **1** | SF-2b — chips on pins + selection panel from snapshot | ☑ Engineering |
| **2** | Express spine, Next callout, default spine list, selection-only panel | ☑ Engineering |
| **3** | Ticker, edge satisfaction, dual victory mount, drawer consolidation | ☑ Engineering |
| **4** | **GT-8 human** — ≥4/5 testers, &lt;10s orientation | ☐ Open |
| **5** | **B13** centerpiece sign-off after GT-8 | ☐ Blocked on Phase 4 |

### Lowest-risk MVP (if regressions found)

Ship only these — still satisfies living-network comprehension:

1. `#city-game-map-sketch-hero` with `--next` pin + spine styling  
2. `#city-game-map-start-callout` wired to `next_node_id`  
3. `#city-game-map-sync` + `#city-game-map-progress` from snapshot  
4. Selection panel with `[data-selection-effect]` + Scan CTA  
5. Default list lens = spine  

Defer: dual victory polish, edge tap interaction, drawer animation.

### What can ship first (human-facing)

1. **GT-8 field walk** on production map URL — no code required  
2. **Copy-only** tweaks in `network_lens.copy` / `map_copy` if probe fails  
3. **Operator Friday bulletin** — changes ticker via existing schedule (Lane C)

### Agent checklist before merge

1. No new API routes or D1 tables  
2. `data-pin-lens="1"` preserved on board root  
3. DOM ids in §2 unchanged without migration test update  
4. Care pause still suppresses game chips on apply  
5. `npm run city-game:network-lens-preflight` green  
6. `DEVICE_SHELL_ASSET_VERSION` unchanged (no device shell imports)  
7. Privacy copy present — no visit log language  

---

## 9. Success Metrics

### Human comprehension (required gates)

| ID | Metric | Pass bar | Runbook |
|----|--------|----------|---------|
| **GT-8** | Points to first map stop &lt;10s un coached | ≥4/5 testers | [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md) |
| **GT-1** | Explains collective unlock after scan | Required per tester | Comprehension kit |
| **GT-2** | States no visit log / no account | Required per tester | Comprehension kit |
| **GT-7** | Live board comprehension when marketing B13 | 5/5 if centerpiece marketed | Install QA |
| **B13** | Board field scenarios B1–B6 | Photos + sign-off | [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) |

**Sign-off:** `npm run city-game:network-lens-sign-off -- --pass --apply` after GT-8 met.

### Repeat engagement (observable proxies — no new analytics)

| Proxy | How to measure | Target signal |
|-------|----------------|---------------|
| **Mid-walk board check** | GT field notes: tester reopens lens URL during walk | Voluntary return without prompt |
| **Quorum contribution** | Collective progress moves on `node_04` during event | World state changes correlate with scans |
| **Spine completion** | Testers visit ≥3 spine stops in one session | Relationship path followed |
| **Relationship articulation** | Post-session: name one unlock (*river → cabinet*) | Graph comprehension |

**Do not instrument:** per-user board views, scan funnels, or identity-linked metrics.

### “Network feels alive” evidence

| Evidence type | Example |
|---------------|---------|
| **Sync + ticker** | Tester quotes headline or progress number unprompted |
| **Diff on return** | Second lens open in same day — tester notices edge or quorum change |
| **Scan motivation** | Tester scans because board showed *14/20* or *Sealed until sunset*, not because operator told them |
| **Anti-feed** | Zero testers ask “where is my profile” or “did it save my visit” |

### Engineering health (continuous)

| Check | Command |
|-------|---------|
| SF-3 DOM contract | `city-game:network-lens-preflight` |
| Snapshot semantics | `worker/tests/city-game-season-snapshot.test.ts` |
| Privacy | `city-game:map-board-privacy-preflight` |

---

## Changelog

| Date | Note |
|------|------|
| 2026-06-21 | Canonical SF-3 Living Network Lens spec — handoff doc for implementation agents |

---

## Related commands

```bash
npm run city-game:network-lens-preflight
npm run city-game:network-lens-gt8-kit -- --production
npm run city-game:comprehension-kit -- --production --apply-runbook
npm run verify:city-game
npm run e2e:city-game-map-board
```
