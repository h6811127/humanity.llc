# Humanity Object Model v1

**Status:** Canonical protocol + product ontology (target state)  
**Scope:** Physical Internet — every field, capability, authority, allocation, relationship, verb, and network rule an object may possess  
**Audience:** Protocol, product, resolver, discovery, operators, agents  
**Ignores:** MVP cut lines, pilot scope, implementation effort, migration status  

**Companions:** [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) · [`IDENTITY_DURABILITY_ONTOLOGY.md`](IDENTITY_DURABILITY_ONTOLOGY.md) · [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) · [`DISCOVERY_PROJECTION.md`](DISCOVERY_PROJECTION.md) · [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) · [`Technical Standards v1.0.md`](Technical%20Standards%20v1.0.md)

---

## 0. One sentence

> A **Humanity object** is a **signed identity document** reached through a **revocable address**, whose **public meaning** is composed by **interpretation rules** (protocol + charter + time + streams + network overlay) into a **representation** at scan time — without requiring scanner accounts or scan-trail surveillance.

---

## 1. Semantic primitives (non-reducible)

| Primitive | Storage? | Role |
|-----------|----------|------|
| **Identity** | Yes — signed documents (`profile_id`, `object_id`, …) | Durable truth bearer |
| **Address** | Yes — QR row, `/c/…?q=…`, scope | Stable pointer → identity context |
| **Interpretation** | Rules + charter bytes on identity | How truth is composed |
| **Representation** | **Never stored** | Scan HTML / status JSON at interaction time |

```text
Representation = Interpret( Address → Identity graph , Charter , Context , Now )
```

**Context** includes: scanner carrier (QR/NFC/mesh), locale, network membership filters, client cache age — never scanner identity by default.

**Out of resolver semantics (parallel planes):**

| Plane | IDs | Rule |
|-------|-----|------|
| **Discovery** | `pin_id`, geo sort keys | Projection index only; never changes scan proof |
| **Human language** | `@handle`, landmark names | Labels on identity; not proof |

---

## 2. Durability tiers

| Tier | Name | Examples | Stable URL? |
|------|------|----------|-------------|
| **T0** | Pattern | `status_plate`, `lost_item_relay`, `game_node` templates | Docs only |
| **T1** | Authority | Root `profile_id`, institution root, recovery key lineage | `/c/{profile_id}` |
| **T2** | Object | `object_id`, succession chain | Bound to object; QR rotates |
| **T3** | Network | `network_id`, season window, archived board | `/play/{slug}/`, archive |
| **T4** | Credential / moment | `qr_id`, quorum count, relay hold | Rotatable / ephemeral state |

**Ordering (referent persistence):** Pattern < State < Credential < Network < Object ≈ Authority

---

## 3. Entity catalog

### 3.1 Root Humanity Card (Authority)

The human or steward-controlled signing root. **All human trust attaches here.**

| Field group | Fields |
|-------------|--------|
| **Identity** | `profile_id`, `public_key`, `created_at`, `updated_at` |
| **Lifecycle** | `status`: `active` \| `suspended` \| `disabled` \| `revoked` |
| **Human trust** | `verification_summary`, vouch graph edges, steward/founding credentials |
| **Recovery** | `recovery_public_key` (optional), backup envelope refs |
| **Custody mode** | `custody_mode`: `device_unlock` \| `full_keys` (steward session only — not public scan) |
| **Presentation** | `manifesto_line` (legacy bridge), `object_streams[]` (card-scope streams) |
| **Charter bearer** | Optional embedded or referenced **Domain charter** when root operates a network |
| **Listing** | `public_listing` opt-in block for discovery / boards |
| **Limits** | `limits` — proves / does-not-prove template ids |

**Cascade rule:** Root `disabled` \| `revoked` → all child objects and QRs present as inactive; representations show lifecycle truth first.

### 3.2 Child Object (Object)

Nested public object controlled by root key (or delegated signer). **No separate human verification.**

| Field group | Fields |
|-------------|--------|
| **Identity** | `object_id`, `parent_profile_id`, `object_type`, `created_at`, `updated_at` |
| **Lifecycle** | `status`: `active` \| `disabled` \| `revoked` |
| **Public manifest** | `public_label`, `public_state` |
| **Streams** | `object_streams[]` — see §6 |
| **Time** | `time_policy` — see §7 |
| **Possession** | `custody` — see §8 |
| **Delegation refs** | `delegated_capability_ids[]` (active grants) |
| **Network overlay** | `network_memberships[]`, `network_state` — see §12 |
| **Succession** | `succession`: `predecessor_object_id`, `successor_object_id`, `succession_reason` |
| **Place hint** | `place_ref` (merge hint for discovery only) |
| **Geo publish** | `geo` (steward-published; never scan-inferred) |
| **Listing** | `public_listing` per-object opt-in |
| **Document** | `child_object_document_json` — canonical signed blob composing above |

#### 3.2.1 Object types (`object_type` — profile labels)

Types are **interpretation profiles**, not separate storage species:

| `object_type` | Primary pattern (T0) | Default verb emphasis |
|---------------|----------------------|------------------------|
| `status_plate` | Place truth | read |
| `lost_item_relay` | Return path | read, offer |
| `game_node` | Network overlay node | read, contribute, archive |
| `menu_board` | Place + narrative | read |
| `capacity_board` | Place + aggregate | read, contribute |
| `permit_plaque` | Place + time | read |
| `relay_point` | Offer / handoff | read, offer |
| `queue_token` | Aggregate queue | read, contribute |
| `witness_station` | Vouch gate | read, contribute |
| `equipment_tag` | Custody + care | read, offer |
| `print_artifact` | Wear / carrier | read |
| `custom` | Charter-defined | capability-driven |

New types require: stream classes used, capability kinds, limits copy, charter compatibility.

### 3.3 QR Credential (Address)

| Field | Description |
|-------|-------------|
| `qr_id` | Opaque credential id |
| `scope` | `card` \| `child_object` \| `print_artifact` |
| `binds_to` | `profile_id` and/or `object_id` / `print_artifact_id` |
| `status` | `active` \| `revoked` |
| `issued_at`, `revoked_at` | Audit |
| `credential_code` | Optional fingerprint for scan limits (not identity) |
| `carrier` | `qr` \| `nfc` \| `sms` \| `mesh` — same URL semantics |

**Invariant:** Revoking one QR must not revoke sibling objects unless root cascade or explicit object revoke.

### 3.4 Print artifact

Fulfillment record for physical carrier (garment, sticker batch, node plate).

| Field | Description |
|-------|-------------|
| `print_artifact_id` | Identity |
| `parent_profile_id` | Controlling root |
| `sku`, `fulfillment_ref` | Commerce bridge (out of scan proof) |
| `lifecycle` | `active` \| `revoked` |
| `QR credentials` | `scope: print_artifact` |

### 3.5 Domain charter (Interpretation policy)

Signed constitution for a trust domain (season, institution, crisis board).

| Field | Description |
|-------|-------------|
| `charter_id` | Stable id |
| `bearer_profile_id` | Signing authority root |
| `title`, `definition` | Human charter |
| `signers[]` | `{ stream, who, may_sign }` roles |
| `precedence_rules` | Stream class order, care regex, lifecycle gates |
| `window` | Optional domain time bounds |
| `limits` | Domain-wide proves / does-not-prove |
| `network_id` | Bind to graph config |
| `succession_policy` | Organizer transfer rules |

### 3.6 Network (`network_id`)

Graph config + rules — **not** a geographic partition.

| Field group | Fields |
|-------------|--------|
| **Identity** | `network_id`, `slug`, `title`, `status` |
| **Charter** | Reference to domain charter |
| **Window** | `starts_at`, `ends_at`, `timezone` |
| **Graph** | `nodes[]`, `unlock_edges[]`, `automation` — see §12 |
| **Schedules** | `bulletin_schedule`, `route_window_schedule` |
| **Lens** | `network_lens` — presentation over member objects |
| **Listing** | `public_listing` for boards |
| **Metering** | `allocation_policy` — see §11 |

### 3.7 Discovery pin (projection only)

| Field | Description |
|-------|-------------|
| `pin_id` | Bookmark id — **not** scan target |
| `object_ids[]` | Resolver leaves at place |
| `network_ids[]` | Derived membership filter |
| `display_label`, `geo`, `district` | Browse geometry |
| `primary_object_id` | Default scan CTA when unambiguous |

---

## 4. Authority model

### 4.1 Signer roles

| Role | May sign | May not |
|------|----------|---------|
| **Root owner** | Root card, all children (default), charter if bearer | Impersonate separate human |
| **Recovery key** | Root + child lifecycle recovery | Day-to-day delegated ops (configurable) |
| **Delegated signer** | Scoped operations on `object_ids[]` until `expires_at` | Vouch, root revoke, delegation-of-delegation |
| **Stream signer** | Rows in assigned `object_streams[]` classes | Root trust, unrelated streams |
| **Network operator** | `network_state`, bulletins, game_meta overlays on member nodes | Owner manifesto, human vouch |
| **Maintainer** | `care` class streams on scoped objects | Game bulletins when care pause |
| **Stranger** | **Offer**, **Contribute**, **Request** only via capability gates | Direct document edit |

### 4.2 Delegated capability document

| Field | Type |
|-------|------|
| `capability_id` | id |
| `parent_profile_id` | root |
| `delegated_public_key` | Ed25519 |
| `operations[]` | See §4.3 |
| `scope.object_ids[]`, `scope.print_artifact_ids[]` | bounds |
| `label` | steward-only |
| `expires_at` | ISO required |
| `status` | `active` \| `revoked` |
| `signature` | root-signed issuance |

### 4.3 Operation registry (write authority)

| Operation | Target |
|-----------|--------|
| `card.update` | Root manifesto, card streams |
| `card.revoke` | Root lifecycle |
| `child_object.create` | New object under root |
| `child_object.update` | Label, state, streams, time, custody |
| `child_object.revoke` | Object lifecycle |
| `child_object.issue_qr` | New address |
| `child_object.revoke_qr` | Address revoke |
| `print_artifact.issue_qr` | Carrier address |
| `network.update` | Operator overlays (scoped) |
| `charter.update` | Domain policy (bearer root) |
| `capability.grant` | **Forbidden** on delegated signers |
| `vouch.*` | Root only |
| `scan.log` | **Forbidden** — no product surface |

---

## 5. Interaction verbs (capabilities)

Advertised on every representation as `scan.capabilities[]`.

### 5.1 Core verbs

| Verb | Actor | Effect on world state |
|------|-------|------------------------|
| **read** | Stranger | None — passive representation |
| **request** | Stranger → authority | Prompts signed response (live proof, permission, refresh) |
| **offer** | Stranger → object | Append offer record; may trigger owner notification path |
| **contribute** | Stranger → aggregate | Mutate permitted counters / bands / queue tokens |
| **delegate** | Authority → holder | Issue scoped capability document |
| **inherit** | Governance | Succession transfer per charter |
| **archive** | Authority / time / care | Live → read-only canon; verbs gated |

### 5.2 Capability record shape

```json
{
  "verb": "contribute",
  "available": true,
  "kind": "aggregate_band",
  "reason": "season_not_open",
  "state": "live",
  "room": "doors",
  "trust_groups": ["card", "qr"]
}
```

| Field | Purpose |
|-------|---------|
| `verb` | Registry key |
| `available` | Scanner may invoke now |
| `kind` | Sub-profile (`live_proof`, `finder_relay`, `quorum`, `fragment`, `scarcity`, `band_low_med_empty`, …) |
| `reason` | Machine gate when `available: false` |
| `state` | Lifecycle hint (`live`, `care_pause`, `dormant`, `season_ended`, …) |
| `room` | Steward presentation (`doors`, `wear`, `season`, `card`) |
| `trust_groups` | On `read` only — which trust modules render |

### 5.3 Request kinds

| `kind` | Meaning |
|--------|---------|
| `live_proof` | Owner proves control now (challenge/response) |
| `permission_window` | Ask for temporary access state |
| `status_refresh` | Ask steward to re-sign stale object |
| `pickup_ready` | Owner toggles ready state (no stranger edit) |

### 5.4 Offer kinds

| `kind` | Meaning |
|--------|---------|
| `finder_relay` | Lost-item message pipeline |
| `maintenance_report` | Anonymous care input |
| `correction` | Suggested fix to public state |
| `witness_observation` | Input to threshold / operator review |

**Invariant:** Offer never stores scanner identity in public fields.

### 5.5 Contribute kinds

| `kind` | Meaning |
|--------|---------|
| `quorum` | Increment collective counter toward target |
| `fragment` | Register lattice / milestone |
| `scarcity` | Consume from capacity pool |
| `aggregate_band` | Discrete band (`empty` / `low` / `ok` / `full`) |
| `queue_take` | Take next public queue number |
| `poll_tally` | Add one to signed poll aggregate |
| `capture` | Contest overlay (domain-specific) |

**Invariant:** Contribute mutates **aggregate fields only** — no per-scanner ledger on object.

### 5.6 Archive states

| `state` | Meaning |
|---------|---------|
| `live` | Full verb set per policy |
| `care_pause` | Maintenance; game muted |
| `dormant` | Readable; contribute/request gated |
| `grace` | Past primary window; recall period |
| `season_not_open` / `season_ended` | Network window |
| `sunset` / `archived` | Succession canon |

---

## 6. Streams (multi-signer public fields)

### 6.1 Stream row

| Field | Constraint |
|-------|------------|
| `id` | Stable key within object |
| `class` | `place` \| `care` \| `narrative` \| `route` (+ charter extensions) |
| `label` | Short human label |
| `value` | Public text (bounded) |
| `signed_at` | ISO |
| `signer_ref` | `{ role, public_key, capability_id? }` |
| `expires_at` | Optional row TTL |

### 6.2 Stream classes (semantics)

| Class | Typical signer | Examples |
|-------|----------------|----------|
| **place** | Owner, venue | Name, hours line, capacity text |
| **care** | Maintainer | Closed, repair, safety — **overrides game** |
| **narrative** | Owner, artist | Special, event copy, correction |
| **route** | Operator | Path open, detour, mode |

### 6.3 Precedence compose (mandatory)

```text
1. Lifecycle (revoked / suspended) → terminal representation
2. Care pause (care class + pause regex) → suppress game/network hero
3. Network schedules (bulletin, route windows) when domain open
4. Time policy slot → may override public_state
5. Remaining streams by class order in charter
6. public_label / public_state fallback
```

Output: `StreamPolicyResult { streams[], phase, carePaused, publicStateOverride, coopHint }`

---

## 7. Time policy (`time_policy`)

| Field | Type | Role |
|-------|------|------|
| `valid_from` | ISO \| null | Absolute open |
| `valid_until` | ISO \| null | Absolute close |
| `dormant_until` | ISO \| null | Readable but verb-gated until |
| `grace_period_hours` | number \| null | Post-until recall canon |
| `timezone` | IANA | Schedule interpretation |
| `schedule[]` | slots | Recurring local truth |

### 7.1 Schedule slot

| Field | Role |
|-------|------|
| `day_of_week` | 0–6 optional |
| `local_hour_from`, `local_hour_until` | Local hours |
| `public_state` | Active slot hero override |

### 7.2 Phases (`ObjectTimePolicyPhase`)

`unset` \| `before` \| `active` \| `outside_schedule` \| `dormant` \| `grace` \| `after`

---

## 8. Custody (possession overlay)

Distinct from **signing authority** and **steward key custody**.

| Field | Type |
|-------|------|
| `holder_label` | string — public |
| `until` | ISO \| null |
| `note` | string \| null |

| Phase | Scan behavior |
|-------|---------------|
| `active` | Show scan line + disclaimer |
| `expired` | Hide or show expired canon per charter |

**Disclaimer (normative):** Holding does not prove ownership.

**Transfer:** Signed `custody_transfer` events append to object history; root or delegated signer with `child_object.update`.

---

## 9. Network overlay (`network_state` on member objects)

Optional when `network_memberships[]` includes a domain.

### 9.1 Graph node binding

| Field | Role |
|-------|------|
| `node_id` | Key in network graph |
| `role` | Domain role label (`relay_gate`, `finale`, …) |
| `district` | Schematic grouping |
| `automation_tags[]` | quorum, fragment, scarcity, capture, … |

### 9.2 Game / domain meta (profile example)

Charter may define `domain_meta` schema. Illustrative fields:

| Field | Role |
|-------|------|
| `collective_target`, `collective_progress` | Quorum |
| `fragment_id`, lattice refs | Finale |
| `scarcity_remaining` | Capacity |
| `held_by_faction`, `held_until`, `compromised` | Contest overlay |
| `vouch_requires[]`, `vouch_active_for[]` | Witness gates |
| `unlocked_by[]` | Conditional reveal inputs |
| `evolution_week`, `artifact_id` | Scheduled fiction / rarity |

**Rule:** Domain meta never overrides care pause or lifecycle revoke.

### 9.3 Unlock edges

| Field | Role |
|-------|------|
| `from`, `to` | `node_id` pair |
| `label` | Public relationship text |
| `satisfied` | Derived from member `network_state` |

### 9.4 Automation thresholds

| Key | Role |
|-----|------|
| `quorum_nodes[]` | Contribute-quorum set |
| `fragment_nodes[]` | Lattice registrars |
| `finale_node` | Terminal node |
| `witness_scarcity_node` | Scarcity gate |
| `relay_capture_nodes[]` | Contest mechanics |
| `relay_decay_hours` | Hold decay |

### 9.5 Network rules (evaluation)

| Rule type | Behavior |
|-----------|----------|
| **Window** | Outside window → archive verbs; read may persist |
| **Quorum side-effect** | Threshold → unlock evaluator patches member docs |
| **Compromise propagation** | Domain-defined relay trust degradation |
| **Sybil fair-use** | Rate limits, site codes, capacity pools — not identity |
| **Passive read** | Snapshot GET / scan GET never increments quorum |
| **Care supremacy** | Maintainer pause mutes domain bulletins on object |
| **Fog / visibility** | Presentation-only rumor states; pin stays tappable |

---

## 10. Relationships (graph edges)

| Relationship | Endpoints | Stored on |
|--------------|-----------|-----------|
| **parent_of** | root → child object | D1 foreign keys |
| **binds** | QR → card \| object \| artifact | QR row |
| **member_of** | object → network | `network_memberships[]` |
| **unlock_edge** | node → node | network config |
| **vouch** | root → root | vouch documents (human trust) |
| **witness_gate** | object A satisfies object B | `vouch_requires` / `vouch_active_for` |
| **succession** | object → object | succession block |
| **place_cluster** | objects → pin | discovery projection |
| **delegates_to** | root → delegated key | capability doc |
| **custody_holder** | label → object | custody overlay (non-signer) |

---

## 11. Allocation & metering

| Policy | Applies to | Fields |
|--------|------------|--------|
| **Hosted tier** | Operator account | object count, network size, API quotas |
| **Contribute rate** | Per object / network | IP + object-scoped limits |
| **Scarcity pool** | Domain meta | `scarcity_remaining`, daily reset policy |
| **Offer inbox** | Per object | max pending offers, TTL |
| **Snapshot read** | Network board | generous read cap; no personalization |
| **Fair-use ceiling** | Client-only scarcity UX | device-local markers (honest, non-authoritative) |

**Invariant:** Allocation never exposes per-scanner identity to stewards by default.

---

## 12. Trust, limits, freshness, succession

### 12.1 Limits (every representation)

| Field | Role |
|-------|------|
| `proves[]` | Bullet list |
| `does_not_prove[]` | Bullet list |
| `charter_ref` | Link to domain rules |

### 12.2 Freshness (representation metadata)

| Field | Role |
|-------|------|
| `fetched_at` | Resolver build time |
| `max_age_seconds` | Client live window |
| `stale_disclosure` | Honest copy |
| `source` | `resolver` \| `cache` \| `mesh` |

### 12.3 Succession (representation hint)

| `scan.succession.phase` | Meaning |
|-------------------------|---------|
| `live` | Active domain |
| `sunset` | Grace / winding down |
| `archived` | Read-only canon |

---

## 13. Composition pipeline (normative order)

```text
1. Load Identity graph (root, child, QR, verification, vouch)
2. Lifecycle gate
3. Load signed document + streams (per signer authority)
4. Apply network overlay context (memberships, domain meta)
5. StreamPolicy.resolve (precedence + schedules)
6. TimePolicy.resolve
7. Custody overlay
8. Derive unlock satisfaction + graph-derived fields
9. buildScanCapabilities (verbs)
10. Attach limits + freshness + succession
11. Render Representation (HTML / JSON)
```

Map snapshot and discovery pin detail **must** call steps 3–8 — never parallel precedence.

---

## 14. Scanner action endpoints (verb handlers)

| Verb | Method pattern | Auth |
|------|----------------|------|
| read | GET `/c/…`, GET `…/status` | None |
| request | POST `…/live-control/*`, POST `…/request/*` | Session + challenge rules |
| offer | POST `…/objects/{id}/offer` | None; rate limited |
| contribute | POST `…/objects/{id}/contribute`, POST `…/game-contribute` | Site code / domain gates |
| delegate | POST `…/capabilities` | Root-signed |
| inherit | POST `…/succession/*` | Charter + root |
| archive | Implicit via lifecycle updates | Authority signers |

---

## 15. Anti-patterns (forbidden object properties)

| Forbidden | Why |
|-----------|-----|
| Scanner identity on object | Surveillance |
| Visit log / scan count on representation | Surveillance |
| Heatmap / players nearby | Surveillance |
| Personal progress / streaks | Engagement loop |
| Reputation score on object | Opaque trust |
| Server-side steward private keys | Operator custody |
| Domain meta overriding care pause | Safety |
| Pin as scan URL | Forks address plane |
| Representation stored as truth | Stale canon |

---

## 16. Object capability composition (25 primitives)

Every `object_type` is a **profile** stacking:

**Identity & trust:** stable address, revocable binding, public manifest, lifecycle gate, honest limits  

**Verbs:** read, request, offer, contribute, archive (+ delegate, inherit governance)  

**Streams:** place, care, narrative, route + precedence compose  

**Time:** validity window, recurring schedule, grace canon, dormant mode, timed overlay  

**Network:** threshold aggregate, conditional reveal, capacity quota, witness gate, network overlay  

---

## 17. Changelog

| Date | Note |
|------|------|
| 2026-06-21 | Humanity Object Model v1 — target-state ontology for Physical Internet |
