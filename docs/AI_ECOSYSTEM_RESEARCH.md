# AI ecosystem research

**Status:** Strategic research — **not implementation**  
**Audience:** Product, protocol, frontend, operators, agents  
**Parent:** [`AI_FEATURE_DEVELOPMENT.md`](AI_FEATURE_DEVELOPMENT.md) · [`LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md`](LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md)  
**Related:** [`LAYER3_PERSONAL_AGENCY.md`](LAYER3_PERSONAL_AGENCY.md) · [`IDENTITY_DURABILITY_ONTOLOGY.md`](IDENTITY_DURABILITY_ONTOLOGY.md) · [`DISCOVERY_PROJECTION.md`](DISCOVERY_PROJECTION.md) · [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md)

> **Scope:** Architecture audit and role analysis for future AI integration. Does not propose shipped features. Assumes signed state remains authority; no centralized memory; no scan analytics; AI never becomes resolver truth.

---

## Executive summary

humanity.llc is a **signed public-state resolver** over physical QR entry points. AI’s native role is **legibility over public records**—not authorship, not resolver truth, not engagement optimization.

| Layer | Scope | Truth |
|-------|-------|-------|
| **L1 Object** | One endpoint (`object_id`, scan) | Signed, revocable, `public_snapshot` |
| **L2 Network** | Community campaign (`season_id`, graph) | Aggregate + governance + public canon |
| **L3 On-device** | Personal interest graph | User-owned; never operator telemetry |

**Canonical intelligence unit:** **Tiered Public Record Context (TPRC)**—anchor at Pattern, Network, Object, or Authority depending on question; never at Credential/State alone.

**Mature split:** L1/L2 are **federated public records**; L3 is a **private orchestrator** (attention, fetch strategy, preferences)—not a second resolver.

At scale (10k networks, 1M objects, many operators), AI becomes **necessary** for open-ended orientation and constitutional literacy—not for writing resolver state.

---

## Part 1 — Architecture audit (primitives)

### AI-ready primitives (existing)

- L0–L2: `manifesto_line`, `object_streams`, deterministic `public_snapshot`
- `scan.ai.agent_context` + `POST …/ai/explain-snapshot` (ephemeral, opt-in)
- `GET …/status`, `GET …/qr/{qr_id}`, `GET …/seasons/{id}/snapshot`
- `scan.capabilities[]`, trust `limits`, freshness/succession contracts
- Seasons index JSON, network graph config
- Device: `hc_wallet`, pins, inbox, activity log (steward path)

### Missing primitives (future, read-only unless noted)

- Network-level `network_agent_context` (derived from snapshot)
- Stateless steward `context-bundle` (optional poll reducer)
- Federated operator registry API
- Public handle/object directory (deferred by policy)
- Server-side agent memory (forbidden by policy)

### Maps produced in audit

- **Entity map:** Authority → Object → Credential; Network overlays objects; scan composes view model
- **Source of truth:** D1 signed docs; deterministic L2 snapshot; season snapshot cache; device cache not authoritative
- **Trust/authority:** Public read vs signed write vs operator Bearer vs keys client-only
- **Discovery:** QR → status; index → rules → board → snapshot; hub local search (device only)

---

## Part 2 — AI roles in the ecosystem

### Native roles (strengthen truth)

| Role | Primary tier | Notes |
|------|--------------|-------|
| Public records interpreter | Infrastructure | Epistemic stack: signed / aggregate / personal |
| Network cartographer | L2 | Board, unlock graph, chronicle from public diffs |
| Community guide | L2 + Authority | Voluntary verbs, governance literacy |
| Trust literacy tutor | L1 + Authority | Bearer warning, vouch limits |
| Protocol participant (reader) | All | Integrator on `hc/v1`; verifies signatures |
| Waypoint reader | L1 | Opt-in plain language on `public_snapshot` |

### Bolted-on roles (reject)

- AI as resolver or ghostwriter
- Engagement optimizer, scan analytics, player heatmaps
- Global AI profiles on objects/networks
- Autonomous sign / vouch / contribute
- Centralized cross-user memory

### Network-primary reframe

When **public networks** are dominant, the headline question is: *what is this network asserting, under whose authority, and how do I participate without surveillance?* Objects are **endpoints inside a network namespace**; AI center of gravity moves to L2 + infrastructure literacy.

---

## Part 3 — Scale pressures (10k / 1M / federation)

| Human capacity | Manual fate | AI necessity |
|----------------|-------------|--------------|
| Navigate open intent | Fails | High (intent routing over curated index) |
| Understand constitutions | Fails | High (comparative policy literacy) |
| Discover listed networks | Partial (index) | Helpful |
| Discover arbitrary objects/people | Deferred | Non-AI curation better |
| Govern volume | Fails | Institutions, not models |
| Trust verification | Fails for lay users | Explain crypto; clients verify |

**Irreplaceable AI roles at scale:** epistemic interpreter, intent router (curated), comparative constitution reader, aggregate chronicle narrator (from signed diffs only).

---

## Part 4 — Durability ontology

Ranked persistence of **referent identity** (not live state):

```text
Tier 0  Pattern     — template (immortal concept)
Tier 1  Authority   — profile_id, org (years+)
Tier 2  Object      — object_id (months–years)
Tier 3  Network     — season_id (campaign + archive)
Tier 4  Credential / State — qr_id, composed moment (ephemeral)

Place/Site — discovery projection only; not a durable primitive
```

**Intelligence attachment by durability:**

| Tier | Natural AI attachment |
|------|------------------------|
| Pattern | Educator, deploy router |
| Authority | Trust/governance literacy |
| Object | Waypoint reader (scan) |
| Network | Cartographer, chronicle |
| Credential/State | Avoid persistent AI memory |

See [`IDENTITY_DURABILITY_ONTOLOGY.md`](IDENTITY_DURABILITY_ONTOLOGY.md).

---

## Part 5 — Three-layer intelligence architecture

### Information flow

- **Downflow:** pull public L1/L2 into device; never push-on-scan to operator
- **Upflow:** signed POST only; L3 orchestrator routes, does not sign
- **Watch:** poll public endpoints user already **related** to (wallet, follow, pin)—not scan analytics

### Authority boundaries

- L3 cannot override L1/L2 in UI without stale/unsigned labeling
- L2 cannot override L1 care precedence
- AI at any layer reads; never becomes authority

### Federation

L3 is the **federation client**: per-origin `resolver_hint`, policy cache, user denylist. No federated L3 server.

### On-device orchestrator

- **Primary for stewards:** briefing, multi-fetch, sign handoff
- **Primary for participants:** follow network, brief, pin, plan (no keys)
- **Not required for strangers:** scan + L1 (+ optional explain) must remain complete

---

## Part 6 — Participant vs steward L3

Assume **95% never hold keys**. L3 must not be wallet-only.

| Primitive | Steward | Participant |
|-----------|---------|-------------|
| RELATE | wallet, objects | follow network, pin scan/board |
| WATCH | saved cards, live-control | followed snapshots |
| ORIENT | sign queue, child tree | weekend plan, rules literacy |
| DRAFT | manifesto scratch | local notes, itinerary |
| CONFIRM | before sign | before voluntary POST / egress |
| PORT | `.hcbackup` keys | export follows/pins |

**Verdict:** L3 is a **universal personal layer**; steward tooling is an **extension pack**. Full device hub is steward-primary; participants need a thin **“my networks”** shelf on play surfaces.

See [`LAYER3_PERSONAL_AGENCY.md`](LAYER3_PERSONAL_AGENCY.md).

---

## Part 7 — Minimal safe demonstration surfaces

**Steward slice:** agency panel in hub—relate, watch toggle, briefing, confirm-at-sign, policy compare (read-only).

**Participant slice:** follow + brief + pin + charter on network pages—no wallet, no create.

---

## Non-goals (locked)

- Autonomous writes
- Operator-hosted AI memory or behavioral profiles
- Scan trails or steward “someone scanned you” alerts
- Model text stored in D1 or shown as signed state
- Global semantic search over people/objects
- Player profiles, streaks, leaderboards from device history

---

## Related commands (existing product)

```bash
npm run worker:test:ai-explain
npm run worker:test -- worker/tests/object-snapshot.test.ts
```

---

## Document history

| Date | Change |
|------|--------|
| 2026-06-07 | Initial research consolidation from architecture audit series |
