# Identity durability ontology

**Status:** Strategic research — informs discovery and L3; **not protocol law**  
**Audience:** Product, protocol, discovery plane, agents  
**Parent:** [`AI_ECOSYSTEM_RESEARCH.md`](AI_ECOSYSTEM_RESEARCH.md) · [`DISCOVERY_PROJECTION.md`](DISCOVERY_PROJECTION.md) · [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md)

> **Method:** For each scenario, what still means something after season ends, QR rotates, steward changes, or physical replacement. The **long-lived identity** is what you would cite in a link or archive a year later.

---

## Durability hierarchy

```text
Tier 0 — Pattern          lost_item_relay, status_plate, “city game” (concept)
Tier 1 — Authority        profile_id, org root, institution
Tier 2 — Object           object_id (+ optional succession/archive)
Tier 3 — Network          season_id, festival run, crisis board edition
Tier 4 — Credential/State qr_id, open/paused/quorum (pointer/moment)

Place/Site — discovery projection only when multi-object geo dedupe required
```

**Product ordering (persistence of referent):**

```text
Pattern < State < Credential < Network < Object ≈ Authority
```

Site does **not** form its own tier. Place durability is carried by Object (`public_label`, place streams), Authority (institution), or Network (season-bound registry).

---

## Three identity planes

| Plane | Question | IDs |
|-------|----------|-----|
| **Resolver** | What does this URL resolve to? | `profile_id`, `object_id`, `qr_id`, `season_id` |
| **Human** | What do people mean in language? | `@handle`, landmark label, org name |
| **Discovery** | What row do I browse before scan? | Projection / index entry (not yet protocol) |

Resolver = truth. Human = language. Discovery = index geometry.

---

## Scenario summary (20 representative cases)

| Long-lived winner | Example scenarios |
|-------------------|-------------------|
| **Object** | status plate, lost-item relay, game node, AED, menu, mobile hoodie |
| **Authority** | root card, library institution, co-op membership, vouch edge |
| **Network** | Wake the City season, festival weekend, cooling center board |
| **Pattern** | never instance identity—underlies all deploy templates |
| **Site** | 0 as primary—geo mediated by Object or Authority |

**Cross-cutting:** witness vouch = network-scoped state on object, gated by authority—not a sixth entity.

---

## Stable URLs

| Entity | Deserves stable URL? | Form |
|--------|---------------------|------|
| Authority | Yes | `/c/{profile_id}`, card JSON |
| Object | Yes | scan bound to `object_id`; QR rotates |
| Network | Yes (archive) | `/play/{slug}/`, `season_id` |
| Pattern | Docs only | `/what-can-a-qr-do/…` |
| Site | Conditional | Only if multi-object dedupe required |

Stable URLs attach to **signed document identity**—not composed State.

---

## Public discovery index

| Entity | Index when |
|--------|------------|
| Object | `public_listing` opt-in |
| Network | listed season/board |
| Authority | rarely—orgs operating public boards |
| Pattern | catalog only |
| Site | join key only—not user-facing identity unless proven necessary |

**Rule:** durability ≠ discoverability (e.g. lost-item relay is object-durable but must not be geo-indexed).

---

## AI attachment by tier

| Tier | Natural AI role | Avoid |
|------|-----------------|-------|
| Pattern | Educator, template router | Presenting template as live truth |
| Authority | Trust/governance literacy | Persona, reputation score |
| Object | Waypoint reader at scan | Engagement analytics |
| Network | Cartographer, chronicle | Player modeling, heatmaps |
| Credential/State | — | Persistent memory |

**Canonical intelligence unit:** **Tiered Public Record Context (TPRC)**—lowest tier that fully answers the question, plus optional upward composition.

---

## Place / Site decision gate

Add **PlaceRef** (index join only) only when all are true:

1. ≥2 independent objects at one geo point with different authorities
2. Object-first or Authority-first index produces duplicate/confusing rows
3. Succession across object replacement needs explicit lineage beyond single-object `succession`

Until then: **Object + Authority + Network** carry identity; Site is optimization, not primitive.

---

## Cedar Rapids stress (500 objects, 10 networks)

- **Resolver identity** does not change
- **Human identity** uses landmark language (“library,” “Czech Village bench”)
- **Discovery identity** needs projection rows merging object + overlapping network lenses
- Object remains resolver truth; place emerges as **human-facing projection**, not new signed primitive

---

## Related

- [`DISCOVERY_PROJECTION.md`](DISCOVERY_PROJECTION.md) — discovery plane spec
- [`LAYER3_PERSONAL_AGENCY.md`](LAYER3_PERSONAL_AGENCY.md) — participant follows/pins
