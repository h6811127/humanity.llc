# Discovery projection

**Status:** Strategic spec — discovery plane · **P0 shipped** (WS-DISCOVER-P0, 2026-06-09) · P1+ not started  
**Audience:** Product, frontend, operators, agents  
**Scope:** Public browse, near-me planning, board map lenses — **no resolver, scan, or network-graph changes**

**Parent stack:** [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) (resolver L1–L5) · [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) · [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md)  
**Related:** [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) · [`V1_IMPLEMENTATION_CONTRACTS.md`](V1_IMPLEMENTATION_CONTRACTS.md) (public search deferred in v1 slice) · [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md)

---

## Purpose

At low object density, a listed **network board** can imply its place catalog. At city scale (many **Objects**, many overlapping **Networks**), strangers need a **human-facing browse index** that does not fork resolver truth.

This doc defines the **discovery plane**: how public listings, geo browse, and board maps **project** resolver state into browse rows — without new signed documents, without changing `/c/…` scan URLs, and without scan surveillance.

**Non-goals for this doc:** UI wireframes, API routes, database schema, or engineering tickets. Implementation follows separately.

---

## Boundary rule

```text
RESOLVER PLANE (unchanged)
  Authority · Object · Credential · Network graph (L5)
  Scan: GET /c/{profile_id}?q={qr_id}  →  buildScanViewModel()

DISCOVERY PLANE (this doc)
  DiscoveryPin projections  →  reference Object[] + Network[]
  Browse / near-me / map lens  →  read pins, not replace scans
```

Anything that changes **what a scan proves**, **who may sign**, or **network graph evaluation** is out of scope.

**Semantic boundary (WS-ONTOLOGY):** Discovery pins, places, and geo browse live in the **discovery plane** — they are **not** resolver semantic primitives (Identity, Address, Interpretation). Pins **project** Identity rows for human planning; they do not compose scan meaning. Canonical model: [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) § [Semantic model — Identity + Address + Interpretation](LIVE_OBJECT_ARCHITECTURE.md#semantic-model--identity--address--interpretation). Durability tiers: [`IDENTITY_DURABILITY_ONTOLOGY.md`](IDENTITY_DURABILITY_ONTOLOGY.md).

---

## Three identity planes

| Plane | Question | Canonical identifiers | Mutable surface | Storage owner |
|-------|----------|---------------------|-----------------|---------------|
| **Resolver** | What does this URL resolve to now, and who signed it? | `profile_id`, `object_id`, `qr_id`, `season_id` | Object lifecycle, streams, time policy, game overlay | D1 + signed documents · resolver |
| **Human** | What do people call this steward, place, or campaign? | `@handle`, org name, landmark label, vouch relationships | Labels, handles, institutional roles | Language + steward edits on resolver fields |
| **Discovery** | What row do I browse before I scan? | `pin_id` (projection only) | Geo facet, merged headline, membership list, sort keys | **Index projection** — derived, rebuildable |

**Do not collapse planes.**

- Resolver identity = **truth at scan time**.
- Human identity = **shared names** (often copied into `public_label`, season node labels, `@handle`).
- Discovery identity = **index geometry** for planning and maps — optional, opt-in, discardable without deleting Objects.

```text
Human:     "Riverwalk River Lantern"
Resolver:  object_id obj_cr_node_04_river  (+ qr_id, season overlays)
Discovery: pin_id pin_cr_river_lantern_01  →  object_ids[] + network_ids[]
```

---

## DiscoveryPin (projection, not a signed object)

A **DiscoveryPin** is a **derived index row**. It is **not**:

- a child object type,
- a scannable endpoint,
- a signing authority,
- a network container that owns graph truth.

### Shape (logical)

| Field | Required | Meaning |
|-------|----------|---------|
| `pin_id` | yes | Opaque stable id for **discovery URLs and bookmarks only** |
| `region` | yes | City / region slug (e.g. `cedar-rapids-iowa`) |
| `display_label` | yes | Human-facing title (landmark, doorway, stall row) |
| `geo` | if listed for near-me | Steward-published coordinates; see [Geo precision](#geo-precision) |
| `object_ids` | yes (≥1) | Resolver leaves at this pin |
| `network_ids` | no | Networks that **reference** those objects (lenses, not ownership) |
| `primary_object_id` | if unambiguous policy applies | Default scan target when pin has one clear job |
| `facets` | derived | Pattern kinds, composed state summary, listing category — for sort/filter |
| `operators` | derived | `@handle` badges from controlling authorities (display only) |
| `listing` | yes | Opt-in metadata mirroring object/network listing policy |
| `index_version` | yes | Projection generation stamp (rebuildable) |

Pins are **rebuilt** from resolver documents + season config + listing flags. Losing or rewriting the index must not revoke Objects or alter scan HTML.

### Optional join hint (not a primitive)

Objects may later carry an optional `place_ref` string **only** to help the projection job cluster rows. `place_ref` is a **merge hint**, not resolver identity. If absent, clustering uses geo + normalized label heuristics.

**Site / PlaceRef is not a peer entity in the resolver ontology.** It may exist solely as this optional join field and as `pin_id` in the discovery plane.

---

## How pins reference Object[] and Network[]

### Object[] (hard references)

- Every pin lists one or more **`object_id`** values that already exist in the resolver.
- Each object must be **listed for discovery** (see [Opt-in listing](#opt-in-listing-rules)) to appear on a public pin.
- Scan CTAs on pin detail **always** resolve to existing **`/c/…?q=…`** URLs for a chosen object — never to `pin_id`.

**Cardinality:**

| Physical situation | Typical `object_ids[]` |
|--------------------|-------------------------|
| Single door plate | 1 |
| Doorway with plate + menu | 2 |
| Game node + maintainer plate at same bench | 2–3 |
| Festival info + game node (temporary) | 2+; festival object may drop from pin when delisted |

### Network[] (soft references / lenses)

- `network_ids[]` lists **seasons/boards** whose config **includes** those objects (e.g. season node registry, public listing).
- Networks **do not own** pins. Membership is **derived**: if `season.nodes[].object_id` matches, the season id appears on the pin.
- Standalone listed objects (status plate with no season) have **empty** `network_ids[]` or omit the field.

**Network is a filter lens on pins**, not a geographic partition:

```text
Query: network_id = cr_season_01_wake  AND  geo near client
  → pins where network_ids contains cr_season_01_wake
  → each pin still shows full object_ids[]; lens may dim non-game objects in UI
```

Graph edges, quorum, unlock evaluation remain **entirely on the resolver network layer** ([`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) L5).

---

## Opt-in listing rules

Discovery is **never** implied by creating an object. Listing is explicit, same honesty bar as season `public_listing` today.

### Object-level listing

An object appears in the public pin index only when **all** apply:

1. **`public_listing.listed === true`** on the object (or equivalent steward opt-in when implemented).
2. Object **`status`** is discoverable-eligible: `active` or policy-defined paused states that should still show (e.g. “closed now” plate). **`revoked` / `disabled`** objects are removed from pins on next index rebuild.
3. Object **`object_type`** is in the **indexable allowlist** (see [Excluded types](#excluded-from-universal-indexing)).
4. If geo near-me is requested: steward-published **`geo`** on the object or on the pin projection row — never inferred from scans.

### Network-level listing

A network contributes **`network_ids[]`** on pins only when:

1. Season **`public_listing.listed === true`**.
2. Network is **active or honestly labeled** (e.g. “ended” badge allowed; silent 404 boards are not listed).

Network listing **does not** auto-list every child object. Each object still needs its own opt-in unless a future governed **org bulk-list** policy ships with explicit steward consent.

### Delisting

- Steward sets `public_listing.listed = false` → object drops from pins on rebuild; resolver scan URL unchanged for anyone holding the QR.
- Organizer ends season → network id may remain for archive lens; live map defaults follow season window phase.

---

## Excluded from universal indexing

These resolver objects **must not** appear on public DiscoveryPins unless a **separate, explicit product policy** overrides (none today):

| Type / pattern | Reason |
|----------------|--------|
| **`lost_item_relay`** | Finder/owner privacy; not a public venue |
| **`print_artifact` / wearables** | Moves with person; not place-anchored |
| **Mobile lore** | Mobile enrollment; not fixed geo |
| **Unlisted / revoked / disabled** | Opt-out or lifecycle |
| **Child objects without geo + without venue label** | Avoid junk rows |

**Default deny.** Index builders skip excluded types even if geo is present.

---

## Privacy rules for “near me”

Aligned with [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) and [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md).

### Allowed

| Mechanism | Rule |
|-----------|------|
| **Steward-published geo** | Opt-in on listing; coarse precision tiers |
| **Client-side distance sort** | Browser geolocation used **only in the client** to sort/filter pin results |
| **Static index fetch** | Client downloads pin list for region; no user coordinates sent to operator for ranking |
| **Aggregate state on pin** | Headline from composed object state (“Open”, “Paused”, “Live game”) — not scan counts |

### Forbidden

| Mechanism | Rule |
|-----------|------|
| **GPS / geolocation logging on scan** | Passive `GET /c/…` never records user location |
| **Server-side “user near pin X” trails** | No stored query location history |
| **Scan-derived coordinates** | Never infer pin geo from who scanned |
| **Heatmaps, visit counts, “players nearby”** | Forbidden on discovery surfaces |
| **Fine geo for sensitive resources** | Shelters/cooling centers use **district or block** precision unless steward opts into pin-level |

### Geo precision

| Tier | Use |
|------|-----|
| **District** | Sensitive resources; index row searchable by neighborhood name |
| **Block ~200m** | Default public browse |
| **Entrance** | Cafés, libraries — steward opt-in |
| **Exact** | Discouraged; never required for listing |

### Copy requirement

Near-me UI must state: **location is used on your device to sort results; scans are not tracked.** Link to [`data-policy.html`](../site/data-policy.html).

---

## Merge and split behavior

Pins are **index maintenance**, not custody events. Merge/split never revokes Objects or changes `object_id`.

### Merge (many objects → one pin)

**Triggers (projection job):**

- Same `place_ref` join hint on multiple listed objects, or
- Geo cluster under distance threshold **and** normalized label similarity, or
- Manual operator merge tool (future) with steward confirmation

**Effect:**

- One `pin_id` retained (or new id); `object_ids[]` unions
- `display_label` chosen by precedence: institution name > longest stable label > season node label
- Primary-object policy runs after merge ([below](#primary-object-selection-policy))

### Split (one pin → many)

**Triggers:**

- Objects diverge in geo beyond threshold
- Conflicting stewards request separate listings (governance)
- Manual operator split
- One object delisted while siblings remain

**Effect:**

- New `pin_id`s issued; old bookmark URL may **410** or redirect with “this place has multiple pins now” — product choice at implementation
- Resolver objects unchanged

### Rebuild idempotency

Given the same resolver inputs, the projection job should produce the same pin clustering **except** when merge/split rules or steward listing flags change. `index_version` bumps on rebuild.

---

## Primary-object selection policy

When a pin has **one** object, that object is primary. When **multiple**, pick **at most one** default scan for ambiguous tap — user can always expand to all objects.

**Precedence (first match wins):**

| Priority | Condition | Primary |
|----------|-----------|---------|
| 1 | **Active network lens** in user context (e.g. viewing Wake the City map) | Object on pin that is **`game_node`** in that `network_id` |
| 2 | **Care / resource emergency facet** active (composed care pause or resource board lens) | Object with **`status_plate`** or resource pattern + care stream winning |
| 3 | **Single indexable object** on pin | That object |
| 4 | **Pattern precedence** | `status_plate` > menu-type > `game_node` > other allowlisted types |
| 5 | **Ambiguous** | **No primary** — pin detail requires explicit object choice |

**Never primary:**

- `lost_item_relay` (not indexed)
- Revoked/disabled objects
- Objects excluded from allowlist

Game bulletin state **must not** override care/maintenance primary when care stream shows pause/closure on another object at the same pin (matches stream precedence on scan — [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) L3).

---

## Board maps reading pins through a network lens

Today: season board reads season JSON nodes + resolver snapshot per node.

**Future (doc target):** board map is a **view** over DiscoveryPins, not a second place registry.

```text
Season board (network lens = cr_season_01_wake)
  1. Load listed pins for region cedar-rapids-iowa
  2. Filter: pin.network_ids contains cr_season_01_wake
  3. For each pin: attach schematic coords from season node layout (if node_id map exists)
     OR pin.geo projected into district sketch (0–1 grid) — layout policy unchanged from CITY_GAME_MAP_DASHBOARD
  4. Snapshot chips: still from composeChildObjectScanState per object_id (same pipeline as today)
  5. Type/state filters: apply to pin’s game object role + composed board states (existing filter cores)
```

**Invariants preserved from [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md):**

- Read-only world truth; no player IDs; no visit log
- Schematic layout may remain season-specific; geo is for **near-me**, not turn-by-turn on board
- Passive snapshot `GET` does not increment quorum
- Pin projection supplies **deduped place rows**; snapshot still per **`object_id`**

**Multi-network board (future):** overlay lenses (festival + game) = union/intersection of pin filters — not duplicate node registries per network.

---

## Discovery URLs (not scan URLs)

| URL kind | Example | Resolves to |
|----------|---------|-------------|
| **Scan (resolver)** | `/c/{profile_id}?q={qr_id}` | Signed scan view model |
| **Pin (discovery)** | `/discover/{region}/pin/{pin_id}` | Browse/detail; CTAs → scan URLs |
| **Region browse** | `/discover/{region}/` | Pin list; client-side near-me sort |
| **Network lens** | `/play/cedar-rapids/map/` (unchanged path) | Board view; filtered pins + snapshots |

`pin_id` URLs are **bookmarks for humans**, not credentials. They may go stale if all objects delist; scan URLs may still work for holders of QRs.

---

## Explicit non-goals

This discovery plane **does not**:

| Non-goal | Note |
|----------|------|
| **GPS scan logging** | Scans never write user location |
| **Passive scanner tracking** | No per-scan trails, heatmaps, or engagement dashboards |
| **Pin as resolver identity** | Pins are not in D1 signed documents; not scannable |
| **Replacement for `/c/…`** | All truth and revoke semantics stay on Object + Credential |
| **Universal indexing of lost-item relays** | Excluded by default |
| **Universal indexing of wearables** | `print_artifact` excluded; moves with wearer |
| **New network graph semantics** | Quorum, unlocks, edges unchanged |
| **Site as durable resolver primitive** | Optional `place_ref` hint only |
| **Operator storage of client geolocation** | Near-me sorting is client-side |
| **Implying holder = owner** | Bearer limits unchanged on scan |

---

## Cedar Rapids scale check (design review)

**Stress:** ~500 listed objects, ~10 overlapping listed networks, ~120 physical venues.

| Approach | Result |
|----------|--------|
| Object-first browse | ~480 rows; duplicate geo; wrong default scan |
| Pin-first projection | ~120 rows; 1–5 objects each; networks as lenses |

Discovery plane targets the second without changing resolver cardinality.

---

## Promotion path (research → implementation)

**WS-DISCOVER-P0 (☑ shipped):** DiscoveryPin projection + Cedar Rapids board reads pins through the `cr_season_01_wake` network lens (`data-pin-lens="1"` on board context). Committed pin index at `site/data/discovery-cedar-rapids-iowa.json` — **40 pins / 40 season nodes** after GcP3 wave-open JSON. Regenerate: `npm run discover:rebuild-pins`. **CI:** `npm run verify:city-game` runs `discover:rebuild-pins -- --check` via [`verify-city-game-exit.mjs`](../worker/scripts/verify-city-game-exit.mjs) — fails on pin drift. No geo, no `/discover/` routes, no resolver scan changes in P0.

**P1+ (not started):** object-level `public_listing`, geo near-me, `/discover/` routes — escalate only after INTEGRATOR confirms LO-4 human gate plan.

Before P1 engineering:

1. Object-level `public_listing` schema aligned with season listing ([`public-networks-portal-core.mjs`](../site/js/public-networks-portal-core.mjs) pattern).
2. Privacy review against [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md).
3. Map dashboard spec updated to reference pin lens ([`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md)) — when implementation starts, not before.
4. Tests: index rebuild idempotency, excluded types, delisting, no scan logging hooks.

**Until P1+ ships:** pin projection is index-only; resolver and scan behavior remain as shipped.

---

## Cross-reference summary

| Topic | Doc |
|-------|-----|
| Resolver layers L1–L5 | [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) |
| Object graph | [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) |
| No scan analytics | [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) · [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) |
| City board policy | [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) |
| Public search deferred in v1 slice | [`V1_IMPLEMENTATION_CONTRACTS.md`](V1_IMPLEMENTATION_CONTRACTS.md) |
| Identity durability (Site falsified) | [`IDENTITY_DURABILITY_ONTOLOGY.md`](IDENTITY_DURABILITY_ONTOLOGY.md) — pins implement **discovery** only |
| Semantic model (Identity + Address + Interpretation) | [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) § [Semantic model](LIVE_OBJECT_ARCHITECTURE.md#semantic-model--identity--address--interpretation) |
