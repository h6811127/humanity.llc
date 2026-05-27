# Localized object intelligence boundary

**Status:** Active — L0–L2 shipped; **L3 P1 shipped** (opt-in explain)  
**Parent:** `docs/MANIFESTO_STATUS_UPDATE.md` · `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md`  
**AI hub:** `docs/AI_FEATURE_DEVELOPMENT.md` · **L3 P1 spec:** `docs/AI_L3_EXPLAIN_SNAPSHOT.md`  
**Research (not shipping):** `docs/PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md`

---

## Claim

Humanity objects expose **bounded public state**, not global AI profiles. Intelligence attached to a place or object must stay:

- **Object-scoped** — one card / one QR handle
- **Signed** — steward keys publish `manifesto_line` and optional `object_streams`
- **Revocable** — same lifecycle as the card
- **Read-only at scan** — strangers consume resolver state; no scan analytics by default

This doc defines the **read-only assembly boundary** before any orchestration or model layer.

---

## Layers (today → later)

| Layer | What it is | Status |
|-------|------------|--------|
| **L0 Manifesto** | Headline + status line (`manifesto_line`) | Shipped |
| **L1 Object streams** | Up to 4 signed detail rows (`object_streams`) | Shipped |
| **L2 Public snapshot** | Deterministic read-only line + JSON from L0 + L1 | Shipped |
| **L3 Agent / orchestration** | Summarize or mediate **only** from L0–L2; no hidden telemetry | **P1 shipped** (explain) · rest research |

---

## L3 naming vs scan UI L3

Scan pages use a separate **L1 Site / L2 Object / L3 Actor** model for trust UI ([`SCAN_PAGE_TRUST_UI.md`](SCAN_PAGE_TRUST_UI.md)). The scan **actor band** is viewer actions (vouch, keys) — not this doc’s L3 agent layer. See [`AI_FEATURE_DEVELOPMENT.md`](AI_FEATURE_DEVELOPMENT.md) § Naming collision.

---

## Public snapshot contract

When `object_streams` are present on a **status plate** or **live object** scan:

- **Status JSON:** `scan.card.public_snapshot` with `{ text, fields[] }`
- **Scan HTML:** “Signed snapshot” block under detail cards
- **Limit copy:** `OBJECT_PUBLIC_SNAPSHOT_LIMIT` in `worker/src/resolver/trust-copy.ts`

Rules:

- Snapshot **repeats** signed fields only — no inference, ranking, or generative text
- Same inputs → same snapshot (deterministic)
- Lost-item relay and personal-card heroes omit snapshot (streams not on those pilots)

Future read-only agents must treat `public_snapshot` + `object_streams` + `manifesto_line` as the **only** public inputs from the resolver unless a separate signed document type ships.

**L3 P1 (shipped):** strangers may opt in to `POST /.well-known/hc/v1/ai/explain-snapshot` for plain-language summary — labeled **not signed network state**. See [`AI_L3_EXPLAIN_SNAPSHOT.md`](AI_L3_EXPLAIN_SNAPSHOT.md). Integrators: `GET …/status` → `scan.ai.agent_context`.

---

## Not in this boundary

- Scan trails, verifier identity, or geolocation
- Cross-object composition or city-scale game state
- Ephemeral event scopes (Commons Pass — Phase D+)
- Model-generated answers presented as resolver truth

---

## Related

| Path | Role |
|------|------|
| `worker/src/resolver/object-snapshot.ts` | Snapshot builder |
| `worker/src/resolver/trust-copy.ts` | Limit strings |
| `site/js/object-streams-core.mjs` | Owner/create validation |
| `docs/MANIFESTO_STATUS_UPDATE.md` | Update + stream exit checklist |
| `docs/AI_FEATURE_DEVELOPMENT.md` | AI hub — sequencing, backlog, risks |
| `worker/src/resolver/ai-explain-core.ts` | L3 P1 validation + agent context packet |
