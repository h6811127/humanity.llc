# AI feature development

**Status:** Active — L3 P1 + **P2 shipped** (explain + steward draft); broader L3 backlog in research  
**Parent:** [`LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md`](LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md) · [`PHASE_A_STRANGER_PATH_PRIORITIES.md`](PHASE_A_STRANGER_PATH_PRIORITIES.md)  
**Slices:** [`AI_L3_EXPLAIN_SNAPSHOT.md`](AI_L3_EXPLAIN_SNAPSHOT.md) · [`AI_L3_DRAFT_MANIFESTO.md`](AI_L3_DRAFT_MANIFESTO.md)

---

## Executive summary

Humanity Commons does **not** build global AI profiles or present model output as resolver truth. AI features consume **bounded, signed public state** (L0–L2) and must stay **object-scoped**, **opt-in**, and **visually separated** from signed network copy.

| Track | Status |
|-------|--------|
| **L0–L2** (manifesto, object streams, public snapshot) | **Shipped** |
| **L3 P1** — opt-in scan explainer | **Shipped** — `POST …/ai/explain-snapshot` + scan UI |
| **L3 P2** — steward authoring assistant | **Shipped** — `POST …/ai/draft-manifesto` + `/created/` UI |
| **L3 backlog** — conflict narrator, vouch nudge, inbox triage | Research / next |
| **LLM anti-abuse** (vouch spam, stolen-key bots) | Threat model + crypto controls — not semantic moderation v1 |

There is **no scan analytics** feeding AI. Strangers must **tap** to request an explanation; the resolver does not auto-generate scan copy.

---

## Architecture: Localized Object Intelligence

Canonical boundary: [`LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md`](LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md).

| Layer | What it is | Status |
|-------|------------|--------|
| **L0 Manifesto** | `manifesto_line` headline + status | Shipped |
| **L1 Object streams** | Up to 4 signed detail rows (`object_streams`) | Shipped |
| **L2 Public snapshot** | Deterministic `{ text, fields[] }` from L0 + L1 | Shipped |
| **L3 Agent / orchestration** | Summarize or mediate **only** from L0–L2 | **P1 + P2 shipped** (explain + draft); rest research |

### Design principles (locked)

- **Object-scoped** — one card / one QR handle
- **Signed** — stewards publish mutable copy with keys; AI never writes resolver state
- **Revocable** — same lifecycle as the card
- **Read-only at scan** — strangers consume resolver state by default
- **No generative resolver truth** — model text is never stored in D1 or shown without an explicit AI label

---

## Naming collision: two “L3” schemes

Do not merge these layer models:

| Scheme | Doc | L3 means |
|--------|-----|----------|
| **Scan UI layers** | [`SCAN_PAGE_TRUST_UI.md`](SCAN_PAGE_TRUST_UI.md) | **Actor** — viewer actions (vouch, keys) after live check settles |
| **Object intelligence layers** | This doc · [`LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md`](LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md) | **Agent / orchestration** — optional AI on top of signed snapshot |

The shipped **scan actor band** (`pass-v33`, `site/js/scan-actor-band.mjs`) is **scan UI L3**, not object-intelligence L3.

---

## Shipped implementation (L0–L2 + L3 P1 + P2)

### Data model

- `manifesto_line` — live updates ([`MANIFESTO_STATUS_UPDATE.md`](MANIFESTO_STATUS_UPDATE.md))
- `object_streams` — classes `place | care | narrative | route` ([`site/js/object-streams-core.mjs`](../site/js/object-streams-core.mjs))
- `public_snapshot` — [`worker/src/resolver/object-snapshot.ts`](../worker/src/resolver/object-snapshot.ts)

### Surfaces

- Scan HTML: “Signed snapshot” block + opt-in **Explain in plain language**
- `GET …/status` JSON: `card.public_snapshot`, `scan.ai.agent_context`, `scan.ai.explain`
- Limit copy: [`worker/src/resolver/trust-copy.ts`](../worker/src/resolver/trust-copy.ts)

### L3 P1: explain snapshot

See [`AI_L3_EXPLAIN_SNAPSHOT.md`](AI_L3_EXPLAIN_SNAPSHOT.md).

| Piece | Path |
|-------|------|
| Core (validation, prompt, deterministic fallback) | `worker/src/resolver/ai-explain-core.ts` |
| HTTP handler | `worker/src/resolver/ai-explain-snapshot.ts` |
| Scan client | `site/js/scan-ai-explain.mjs` |
| Rate limit | `worker/src/db/rate-limit.ts` (`checkAiExplainRateLimit`) |
| Workers AI binding | `worker/wrangler.toml` `[ai]` |

### L3 P2: steward draft manifesto

See [`AI_L3_DRAFT_MANIFESTO.md`](AI_L3_DRAFT_MANIFESTO.md).

| Piece | Path |
|-------|------|
| Core (validation, prompt, deterministic fallback) | `worker/src/resolver/ai-draft-core.ts` |
| HTTP handler | `worker/src/resolver/ai-draft-manifesto.ts` |
| Owner client | `site/js/created-ai-draft.mjs` |
| Rate limit | `worker/src/db/rate-limit.ts` (`checkAiDraftRateLimit`) |

---

## Agent context packet (integrators)

When `public_snapshot` is present, `GET …/status` includes:

```json
{
  "scan": {
    "ai": {
      "explain": {
        "available": true,
        "endpoint": "/.well-known/hc/v1/ai/explain-snapshot",
        "method": "POST",
        "opt_in": true
      },
      "agent_context": {
        "manifesto_line": "...",
        "object_streams": [],
        "public_snapshot": { "text": "...", "fields": [] },
        "limits": {
          "bearer_warning": "...",
          "object_snapshot_warning": "...",
          "ai_explain_warning": "..."
        }
      }
    }
  }
}
```

Third-party agents should treat **`agent_context` fields only** — no hidden telemetry, no scan history. See [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md).

---

## Not shipped / explicitly out of scope

| Item | Notes |
|------|--------|
| Auto-generated scan hero copy | Forbidden — L2 stays deterministic |
| Cross-object or city-scale AI state | [`PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md`](PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md) — research only |
| Scan analytics feeding models | Locked out — [`V1_DECISION_LOCK.md`](V1_DECISION_LOCK.md) |
| Semantic vouch moderation | [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) V-07 — crypto bar only v1 |
| Model output stored in D1 | Never |

---

## Related “intelligence” (non-LLM)

| Name | Doc | Meaning |
|------|-----|---------|
| **Trust Dot Intelligence** | [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md) | Deterministic shell state — Now / Why / Next |
| **AI as market problem** | [`V1_MARKET_AND_GROWTH_STRATEGY.md`](V1_MARKET_AND_GROWTH_STRATEGY.md) | Communities facing bot/AI spam — trust loop wedge |
| **AI-era threats** | [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) §5.7 | Synthetic personas, LLM spam, stolen-key agents |

---

## L3 backlog (brainstorm — aligned with boundary)

All items: **consume signed L0–L2 only**; **never write resolver truth**; **no scan analytics**.

| # | Idea | Surface | Phase |
|---|------|---------|-------|
| 1 | **Scan plain-language explainer** | Stranger opt-in on snapshot | **P1 shipped** |
| 2 | **Steward authoring assistant** | `/created/` — draft manifesto + streams; steward signs to publish | **P2 shipped** |
| 3 | **Multi-stream conflict narrator** | Explain game vs maintenance precedence ([`PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md`](PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md)) | P3 |
| 4 | **Integrator agent SDK** | Document + JSON schema for `agent_context` | **Partial** (status JSON) |
| 5 | **Vouch statement nudge** | Client flag for generic/LLM-like text before sign (V-07) | P2 |
| 6 | **Lost-item finder guidance** | Opt-in steps from signed relay copy only | P2 |
| 7 | **Hosted steward inbox triage** | Summarize device-local inbox — not scan logs | P3 |
| 8 | **Commons Pass check-in copilot** | Phase D+ event-scoped signed docs | D+ |
| 9 | **Federation operator onboarding agent** | Public standards + health endpoint only | E |
| 10 | **Memory-and-place narrative compiler** | Timeline from signed `narrative` streams | P3 |

---

## Recommended sequencing

| Phase | Work | Rationale |
|-------|------|-----------|
| **Now** | Status plate + lost-item field pilots | Proves L0–L2 in the real world |
| **Shipped** | L3 P1 explain + P2 steward draft + agent context in status JSON | Zero resolver contamination |
| **Next** | Vouch statement nudge (V-07) or lost-item finder guidance | Owner/stranger opt-in helpers |
| **Later** | Multi-stream narrator for multiplayer research | Needs more signed stream types + governance |
| **Much later** | Commons Pass / city-scale orchestration | Phase D+ |

---

## Risks

1. **Layer naming** — Scan UI L3 vs object-intelligence L3; always specify which scheme in PRs and UI copy.
2. **Trust erosion** — Any generative text near signed copy uses `AI_EXPLAIN_LIMIT` / separate panel styling.
3. **Stolen-key bots (A-02)** — Legitimate steward automation and malicious agents look identical if keys leak; AI does not fix custody.
4. **Scope creep** — Multiplayer + full L3 orchestration stay deferred until Phase A verticals succeed ([`PHASE_A_STRANGER_PATH_PRIORITIES.md`](PHASE_A_STRANGER_PATH_PRIORITIES.md)).

---

## Tests & commands

```bash
npm run worker:test -- worker/tests/ai-explain-core.test.ts worker/tests/ai-explain-snapshot.test.ts
npm run worker:test -- worker/tests/ai-draft-core.test.ts worker/tests/ai-draft-manifesto.test.ts
npm run worker:test -- worker/tests/object-snapshot.test.ts worker/tests/object-streams.test.ts
npm run worker:bundle-scan   # after site/scan-pass.css changes
```

Manual: scan a status plate or live object with `object_streams` → tap **Explain in plain language** → confirm AI panel shows disclaimer, not signed snapshot styling.

---

## Related

| Path | Role |
|------|------|
| [`AI_L3_EXPLAIN_SNAPSHOT.md`](AI_L3_EXPLAIN_SNAPSHOT.md) | P1 wire format + UX |
| [`LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md`](LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md) | L0–L3 boundary |
| [`MANIFESTO_STATUS_UPDATE.md`](MANIFESTO_STATUS_UPDATE.md) | L0–L1 owner updates |
| [`RESEARCH_DIRECTIONS_AND_NODES.md`](RESEARCH_DIRECTIONS_AND_NODES.md) | Carrier layers (NFC/mesh) — separate from AI |
