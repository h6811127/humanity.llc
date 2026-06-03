# Live object architecture

**Status:** Canonical engineering companion — implementation map for expanded design space  
**Audience:** Product, resolver, frontend, operators, agents  
**Public catalog (research):** [`QR_DESIGN_SPACE.md`](QR_DESIGN_SPACE.md) · [`site/what-can-a-qr-do/design-space/`](../site/what-can-a-qr-do/design-space/index.html)  
**Trust boundaries:** [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) · [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md)  
**Object model:** [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) · [`V1_IMPLEMENTATION_CONTRACTS.md`](V1_IMPLEMENTATION_CONTRACTS.md)

---

## Purpose

[`QR_DESIGN_SPACE.md`](QR_DESIGN_SPACE.md) names **verbs**, **blind spots**, **network grammar**, and **open questions** for positioning and pilot selection. This doc names **how those concepts map onto the resolver and object model** without forking new products.

**Rule:** Every catalog item must still pass the [Use-Case Rule](V1_USE_CASES.md#use-case-rule) and a phase row in [`V1_USE_CASES.md`](V1_USE_CASES.md#examples-by-build-phase) before it becomes engineering work. See [Promotion path](#promotion-path-research--partial--shipped).

**Operating constraint:** [`PHASE_A_STRANGER_PATH_PRIORITIES.md`](PHASE_A_STRANGER_PATH_PRIORITIES.md) — one vertical on real printed QRs beats expanding the public hub faster than pilots.

---

## One-sentence model

> A **live object** is an HTTPS endpoint (usually reached via QR) that returns **current, revocable, signed public state** — composed from a root card, optional child object, streams, time policy, and optional network overlay.

The printed URL stays fixed. Resolver truth changes.

---

## Architecture spine (do not replace)

```text
                    ┌─────────────────────────────────────┐
                    │  QR credential (qr_id, scope)       │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │  Resolver context (D1 + signed docs)   │
                    │  root card · child object · QR row     │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │  buildScanViewModel (composition)    │
                    │  lifecycle → time → streams → game     │
                    └─────────────────┬───────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
    scan HTML (SSR)                              GET …/status JSON
    scan-html.ts                                 scan-status.ts
```

**Canonical composition entry:** `worker/src/resolver/scan-state.ts` → `buildScanViewModel()`.

New design-space capabilities extend this pipeline — they do not add parallel scan page products.

---

## Five layers

Evolve the stack **bottom-up**. Higher layers depend on lower layers; do not skip.

| Layer | Responsibility | Primary docs | Code today |
|-------|----------------|--------------|------------|
| **1. Object graph** | Root → child → QR; custody; types | [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) | `child-objects.ts`, `scan-state.ts` |
| **2. Verbs** | What scanners and owners may do | This doc § [Interaction verbs](#interaction-verbs) | Live proof, `game-contribute` (partial) |
| **3. Streams + precedence** | Multi-signer public fields | [`QR_DESIGN_SPACE.md`](QR_DESIGN_SPACE.md) § blind spot 5 | `object-streams.ts`, game care override |
| **4. Time policy** | Schedules, expiry, dormancy | § [Time policy](#time-policy) | `season-window.ts`, `route-window-schedule.ts`, manifesto |
| **5. Network graph** | Quorum, routes, season structure | [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) | `quorum-contribute.ts`, unlock evaluator, season config |

```mermaid
flowchart BT
  L5[Layer 5 — Network graph]
  L4[Layer 4 — Time policy]
  L3[Layer 3 — Streams + precedence]
  L2[Layer 2 — Verbs / capabilities]
  L1[Layer 1 — Object graph]
  L5 --> L4
  L4 --> L3
  L3 --> L2
  L2 --> L1
```

---

## Layer 1 — Object graph

### Target shape

```text
Root Humanity Card (profile_id, owner key, verification)
  │
  ├── child object: status_plate | lost_item_relay | game_node | …
  │     public_label, public_state, object_streams?, custody?, time_policy?
  │     │
  │     └── QR credential(s)  scope: child_object | print_artifact
  │
  └── root QR (optional)  scope: card
```

### Authority (unchanged)

From [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md):

- Human trust (vouch, verification) lives on the **root** only.
- Child objects inherit **control**, not separate human identity.
- Default edits are **parent-signed** until delegated capabilities ship.
- Per-QR revoke must not revoke sibling objects.

### Bridge today

| Pilot | Current storage | Target | Status |
|-------|-----------------|--------|--------|
| Status plate | Two-line `manifesto_line` on root card **or** child object | Child object `status_plate` | **Partial** — child path shipped; flat-card bridge retained for stranger create |
| Lost-item relay | `[relay]` prefix in `manifesto_line` **or** child object | Child object `lost_item_relay` | **Partial** — child path shipped; flat-card bridge retained |
| Game node | `game_node` child + `game_meta` JSON | **Shipped** — reference type | **Shipped** |
| Merch / print | `scope: print_artifact` | **Shipped** | **Shipped** |

Scan composition reads **`childPublicLabel` / `childPublicState`** on the view model when `scope: child_object` (see `resolveScanHeroDisplay` in `manifesto-display.ts`) — not manifesto parsing alone.

### Planned fields (not all routed yet)

| Field | Purpose | Design-space link |
|-------|---------|-------------------|
| `custody` | “Held by @handle until Friday” — possession, not ownership proof | Custody & handoff |
| `delegated_capability` | Time-boxed child edit without new root key | Delegate |
| `time_policy` | See [Time policy](#time-policy) | Time-bound objects |

**Do not** give every child object its own private key by default. Delegation is an explicit, signed, revocable capability document — not a second account.

---

## Layer 2 — Interaction verbs

Verbs are **capabilities the resolver advertises**, not marketing categories. Scan HTML and clients render from the capability list; handlers implement each verb.

### Verb registry

| Verb | Actor | Meaning | Shipped | Handler / surface |
|------|-------|---------|---------|-------------------|
| **read** | Scanner | Current signed state at scan time | ✅ | Default `GET /c/…`, `GET …/status` |
| **request** | Scanner → owner | Ask for action (live proof, permission, reply) | Partial | Live control (`scan-live-control*`) |
| **offer** | Scanner → object | Contribute message or signal **without identity trail** | Partial | Lost-item relay copy (`[relay]`); no separate offer API yet |
| **contribute** | Scanner → network | Append-only **aggregate** public effect | Partial | `POST …/game-contribute` · `scan.capabilities[]` on status JSON (game nodes) |
| **delegate** | Owner → holder | Temporary capability on object | Research | Future `delegated_capability` on child doc |
| **inherit** | Governance | Succession when signer/org ends | Research | Future stream signer rotation |
| **archive** | Owner / governance | Live → read-only canon; season end | Partial | Dormant copy · `scan.capabilities[]` `archive` state on game nodes |

**Product priority (Phase A):** optimize **read + owner update** first, then **contribute** (city game), then **offer** (lost-item). See [`PHASE_A_STRANGER_PATH_PRIORITIES.md`](PHASE_A_STRANGER_PATH_PRIORITIES.md).

### Target scan contract extension

Add to `GET …/status` (and derive scan blocks from) a capability list:

```json
{
  "scan": {
    "capabilities": [
      { "verb": "read", "available": true },
      { "verb": "request", "kind": "live_proof", "available": true },
      {
        "verb": "contribute",
        "kind": "game_fragment",
        "available": false,
        "reason": "season_not_open"
      }
    ]
  }
}
```

**Invariants when implementing:**

- Passive scan must not log scanner identity ([`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md)).
- **Request** verbs require explicit scanner action (tap, form submit) — never background beacons.
- **Contribute** updates aggregate fields only for game ([`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) § Cedar Rapids city game).
- Stranger-facing **delegate** / **inherit** are off by default.

**Implementation order:**

1. Document capabilities in JSON from existing flags (`liveControlAvailable`, game contribute gate, season phase). **Partial (2026-06-03):** game-node scans + card `read`/`request` on `GET …/status`; HTML still uses view-model flags.
2. Refactor `scan-html.ts` hero blocks to key off capabilities, not ad-hoc booleans.
3. Add new verbs as new capability kinds + one handler each.

---

## Layer 3 — Streams and precedence

### What streams are

Signed plain-text rows on the card or child document:

```json
"object_streams": [
  { "id": "tasks", "class": "care", "label": "Today's tasks", "value": "Water bed 3" }
]
```

Classes today: `place` | `care` | `narrative` | `route` (see `site/js/object-streams-core.mjs`).

Streams let **multiple signers** attach truth to one physical object without merging into unreadable soup — if precedence rules are explicit.

### Precedence grammar (target)

Extract from city-game-only logic into a shared resolver step:

```text
raw streams (owner + child + scheduled overlays)
        │
        ▼
  StreamPolicy.resolve(streams, context)
        │
        ├── lifecycle (revoked / paused) wins — no game hero override
        ├── care (maintenance pause / closure) mutes game bulletins
        ├── game (bulletin, route) when season open and not compromised
        └── narrative / place (default display)
```

**Shipped precedent:** care wins over game — [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) · `worker/src/city-game/scan-view.ts`.

**Target module (planned):** `worker/src/live-object/stream-precedence.ts` (name TBD) consumed by `buildScanViewModel` before HTML render.

### Multi-signer without new identity

| Signer role | Typical stream class | Example |
|-------------|---------------------|---------|
| Owner / root | `place`, `narrative` | Studio door name, artist note |
| Maintainer | `care` | “Closed for repair until Tue” |
| Game operator | `route`, game bulletin | Season window, district hold |
| Institution (future) | `care`, hours | Library witness hours |

Game-operator `game-update` remains scoped to **`game_node` only** — not owner manifesto or human vouch graph.

### Adversarial physical world

Not a separate API layer. Enforce via:

- Bearer / limits copy on every scan ([`SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md))
- `credential_code` fingerprint on scan ([`V1_IMPLEMENTATION_CONTRACTS.md`](V1_IMPLEMENTATION_CONTRACTS.md))
- Game trust chains and compromise propagation (city game)
- Anti-patterns documented in [`QR_DESIGN_SPACE.md`](QR_DESIGN_SPACE.md) § blind spot 6 — blocked in product policy, not engagement features

---

## Layer 4 — Time policy

Time-bound truth is a **core differentiator** vs static QR. Today it is split across manifesto updates (status plate), season window (game dormancy), and route/bulletin schedules (game-only).

### Target `ObjectTimePolicy` (child object or card)

| Field | Example | Status |
|-------|---------|--------|
| `valid_from` / `valid_until` | Flyer valid through Sunday | Planned |
| `schedule` | Open Thu–Sat (local TZ slots) | Partial — reuse route-window slot shape |
| `dormant_until` | Season start; object readable but game actions gated | Partial — `season-window.ts`, dormant scan note |
| `grace_period` | “Recall in 48h unless cleared” | Research |

### Application order in `buildScanViewModel`

```text
1. Lifecycle (revoked / suspended / QR revoked)
2. Time policy (not yet valid / expired / dormant)
3. Base manifesto + object_streams
4. Scheduled stream overlays (bulletin, route window)
5. Game overlay (if game_node and enabled)
```

**Status plate today:** owner updates `manifesto_line` via `POST …/cards/{id}/update` ([`MANIFESTO_STATUS_UPDATE.md`](MANIFESTO_STATUS_UPDATE.md)) — same QR, new line. Target: same mechanism on child object update endpoint.

**Generalization path:** move `resolveSeasonWindowPhase` / slot matching from `worker/src/city-game/` into `worker/src/live-object/time-policy.ts` (or equivalent) callable for any child type with a `time_policy` block.

---

## Layer 5 — Network graph

A **network** is not “many QRs.” It is a **graph of signed state with conflict rules** — one season config is the reference implementation.

### Three concepts (keep separate)

| Concept | Definition | Cedar Rapids |
|---------|------------|--------------|
| **Object** | One resolver endpoint (`/c/…?q=…`) | One bench, plate, arch |
| **Network / season** | Config + graph edges + quotas | `cr_season_01_wake` |
| **Network effects** | Quorum, route SM, compromise relay, unlock evaluator | Shipped in game code |

### Reference implementation

| Capability | Module / doc |
|------------|--------------|
| Quorum / threshold | `quorum-contribute.ts`, unlock evaluator |
| Route state machine | `route-window-schedule.ts` |
| Season / act structure | `season-config.ts`, `season-window.ts` |
| Read-only city board | [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) |
| Fair-use metering | [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) |

**After S1:** extract `NetworkGraph` + threshold rules so the next organizer loads JSON — do not fork resolver routes per city.

### Federation and carriers (research)

Alternate carriers (NFC, SMS, mesh relay) must preserve **same URL semantics and trust model** — see [`RESEARCH_DIRECTIONS_AND_NODES.md`](RESEARCH_DIRECTIONS_AND_NODES.md). Mesh/cache serves **signed blobs**; resolver remains source of truth unless a [staleness contract](#staleness-contract-research) says otherwise.

---

## Composition pipeline (implementation map)

Current `buildScanViewModel` flow for `game_node` child (simplified):

```text
load ScanContext (card, qr, child, verification)
  → if child_object && game_node:
       resolveGameNodeScanContext (game_meta, vouch witnesses)
       applyBulletinScheduleToStreams
       applyRouteWindowScheduleToStreams
       merge public_state / coop_hint
  → baseView → ScanViewModel
  → scan-html.ts / scan-status.ts
```

| Step to add | Layer | Touches |
|-------------|-------|---------|
| `resolveTimePolicy(child, now)` | 4 | Before stream overlays |
| `resolveStreamPrecedence(streams, policy)` | 3 | Replace ad-hoc care/game mute |
| `buildScanCapabilities(vm, policy)` | 2 | `scan-status.ts`, then HTML |
| Generic network hooks (non-game) | 5 | Post-S1 extraction from city-game |

---

## Blind spots → architecture responses

| Blind spot ([`QR_DESIGN_SPACE.md`](QR_DESIGN_SPACE.md)) | Architectural response | Layer |
|--------------------------------------------------------|-------------------------|-------|
| One-way interaction | Verb capability registry + scanner action endpoints | 2 |
| Time underplayed | `ObjectTimePolicy` on child objects | 4 |
| Custody / handoff | Child `custody` block; transfer = signed handoff event | 1 |
| Stale / offline truth | Staleness contract on cache + status JSON metadata | Future |
| Governance / succession | Stream signers + organizer revoke; inherit/archive lifecycle | 3, 1 |
| Adversarial physical | Scan limits, credential fingerprint, game trust chains | Policy + 3 |
| Accessibility | Same `/c/…` URL; NFC/SMS as alternate carriers | Research |
| Institutional operators | Multiple stream signers, not shared root password | 3 |
| Anti-patterns | Resolver policy + invariants — no scan analytics, streaks, dossiers | All |

---

## Staleness contract (research)

Before implementing offline/mesh cache broadly, specify:

| Field | Meaning |
|-------|---------|
| `status.fetched_at` | When resolver built this response |
| `status.max_age_seconds` | Client may show as “live” without re-fetch |
| `status.stale_disclosure` | Honest copy when serving cached or last-known-good |

Crisis cards, food tags, and protest coordination need **honest staleness** as much as live updates. Spec first in this doc’s § Future work; implement only after Phase A pilots prove read/update loop.

---

## Promotion path: research → partial → shipped

| Stage | QR_DESIGN_SPACE | Engineering |
|-------|-----------------|-------------|
| **Research** | Catalog + public design-space page | No resolver change; traceability row = Research |
| **Partial** | Unchanged public copy | One pilot or season demo on real QRs; tests for touched paths |
| **Shipped** | Optional “live today” walkthrough | Row in [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) + [`V1_IMPLEMENTATION_CONTRACTS.md`](V1_IMPLEMENTATION_CONTRACTS.md) |

**Traceability table:** [`QR_DESIGN_SPACE.md`](QR_DESIGN_SPACE.md) § Implementation traceability — update status when promoting.

**Do not** add new `*_INVESTIGATION.md` for routine promotion — per [`DOC_MAINTENANCE.md`](DOC_MAINTENANCE.md).

---

## Recommended build sequence

Aligned with [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md) and Phase A:

| Order | Work | Proves verb / blind spot |
|-------|------|--------------------------|
| **1** | Finish child-object model for status plate + lost-item relay | Read, time-bound, offer |

### Order 1 — exit criteria (Layer 1)

Engineering (**done** unless noted):

| Criterion | Surface | Status |
|-----------|---------|--------|
| Child object create / update / revoke API | `child-objects.ts`, D1 `child_objects` | Shipped |
| Issue `scope: child_object` QR | `POST …/objects/{id}/issue-qr` | Shipped |
| Scan reads `public_label` / `public_state` first-class | `ScanViewModel.childPublicLabel`, `childPublicState`, `resolveScanHeroDisplay` | Shipped |
| Child `object_streams` on scan | `objectStreamsFromChildDocumentJson` | Shipped |
| Owner UX: add + update under `/created/` | `created-child-object*.mjs` | Shipped |
| Flat-card bridge for stranger create | `/create/?template=status_plate\|lost_item_relay` | Shipped (bridge) |

Still open before **Partial → Shipped** promotion on traceability rows:

| Criterion | Surface | Status |
|-----------|---------|--------|
| Manual pilot sign-off on real printed QRs | [`STATUS_PLATE_PILOT.md`](STATUS_PLATE_PILOT.md), [`LOST_ITEM_RELAY_PILOT.md`](LOST_ITEM_RELAY_PILOT.md) | Open |
| `custody`, `delegated_capability`, `time_policy` on child doc | Layer 1 planned fields | Research (Order 6 / delegate) |

**Do not start Order 3** (`scan.capabilities[]`) until manual pilot rows above are signed off or explicitly waived in the workstream doc.

---
| **2** | Cedar Rapids S1 (in flight) | Contribute, network, archive/sleep |

### Order 2 — exit criteria (Cedar Rapids S1)

Engineering (**done** unless noted):

| Criterion | Surface | Status |
|-----------|---------|--------|
| Game node scan + contribute handler | `game-contribute.ts`, `scan-view.ts` | Shipped |
| Season window / dormancy (archive sleep) | `season-window.ts`, dormant scan copy | Shipped |
| Network snapshot + map board (M1–M3) | `season-snapshot.ts`, `/play/cedar-rapids/#city-state` | Shipped |
| `scan.capabilities[]` for game verbs (status JSON) | `live-object/scan-capabilities.ts`, `scan-status.ts` | Shipped |
| Production smoke (season-aware dormant OK) | `city-game:smoke-production` | Shipped |
| `verify:city-game` regression block | `npm run verify:city-game` | Shipped |

Still open before S1 launch sign-off:

| Criterion | Surface | Status |
|-----------|---------|--------|
| Physical install QA (≥3 phones × 15 nodes) | [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) **P2** | Open (human) |
| Operator install map complete | [`CITY_GAME_NODE_INSTALL_MAP.md`](CITY_GAME_NODE_INSTALL_MAP.md) **O2** | Open (ops) |
| Map board privacy review before “live city board” marketing | **B13** GT-7 | Open (human) |
| Production season root + 15 nodes minted | Launch checklist **E3** | Open (ops) |
| Refactor scan HTML from capabilities (Order 3 step 2) | `scan-html.ts` | Not started |

---
| **3** | `scan.capabilities[]` in status JSON; HTML from capabilities | Verbs explicit |
| **4** | Extract `StreamPolicy` + `ObjectTimePolicy` from game code | Multi-signer, time |
| **5** | Extract network graph config from city-game modules | Network grammar |
| **6** | Staleness contract + delegation + succession specs | Blind spots 4–5 |

---

## Open questions (product gates)

These from [`QR_DESIGN_SPACE.md`](QR_DESIGN_SPACE.md) are **decisions**, not backlog. Record answers here when resolved.

| Question | Working answer (2026-06) |
|----------|--------------------------|
| Which verb to optimize scan UX for first? | **Read + owner update** (Phase A); then contribute (game), then offer (lost-item) |
| When is a live object the wrong tool? | When static paper or a phone call suffices; when threat model needs anonymity beyond public card; when regulated domain needs jurisdiction we defer |
| Minimum network size before multiplayer beats solo objects? | Cedar Rapids S1 (15 nodes) is the first proof; revisit after comprehension + install QA |
| Staleness vs live menu sold out? | Spec § Staleness contract before mesh/offline ship |
| Can an object outlive its operator? | Export/migrate/archive — Phase D+; inherit verb |
| Stream stacking readability? | Stream precedence module + scan UI caps (max streams already validated) |

---

## Regression and touch surfaces

When changing live-object composition:

```bash
npm run worker:test -- worker/tests/scan.test.ts worker/tests/live-object-child-scan.test.ts worker/tests/live-object-scan-capabilities.test.ts worker/tests/city-game-scan.test.ts
npm run verify:city-game   # if game overlay touched
npm run worker:test -- worker/tests/update-card.test.ts worker/tests/create-card-object-streams.test.ts
```

**File ownership hints:**

| Area | Files |
|------|-------|
| Composition | `worker/src/resolver/scan-state.ts`, `scan-html.ts`, `scan-status.ts` |
| Child objects | `worker/src/db/child-objects.ts`, `worker/src/resolver/child-objects.ts` |
| Streams | `worker/src/validation/object-streams.ts`, `site/js/object-streams-core.mjs` |
| Time (game) | `worker/src/city-game/season-window.ts`, `route-window-schedule.ts`, `bulletin-schedule.ts` |
| Network (game) | `worker/src/city-game/*`, `worker/src/resolver/game-contribute.ts`, `game-update.ts` |
| Owner update | `worker/src/resolver/update-card.ts`, `site/js/created-manifesto-update.mjs` |

Bump `DEVICE_SHELL_ASSET_VERSION` only when adding imports to the device status module graph ([`AGENTS.md`](../AGENTS.md)).

---

## Related docs

| Doc | Role |
|-----|------|
| [`QR_DESIGN_SPACE.md`](QR_DESIGN_SPACE.md) | Public design catalog + traceability index |
| [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) | Layer 1 authority and UX maturity |
| [`MANIFESTO_STATUS_UPDATE.md`](MANIFESTO_STATUS_UPDATE.md) | Live copy bridge (Phase A) |
| [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) | Layer 5 reference network |
| [`V1_USE_CASES.md`](V1_USE_CASES.md) | Phase table + use-case rule |
| [`PHASE_A_STRANGER_PATH_PRIORITIES.md`](PHASE_A_STRANGER_PATH_PRIORITIES.md) | Pilot discipline |
| [`RESEARCH_DIRECTIONS_AND_NODES.md`](RESEARCH_DIRECTIONS_AND_NODES.md) | NFC, mesh, Humanity node |
| [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) | Rules that must stay true when layers ship |
