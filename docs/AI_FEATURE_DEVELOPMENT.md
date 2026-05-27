# Object state, readers, and the AI era

**Status:** Active — **L0–L2 shipped**; L3 P1 under review; **L3 P2 UI retired** (2026-05-27)  
**Parent:** [`LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md`](LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md) · [`PHASE_A_STRANGER_PATH_PRIORITIES.md`](PHASE_A_STRANGER_PATH_PRIORITIES.md)  
**Slices:** [`AI_L3_EXPLAIN_SNAPSHOT.md`](AI_L3_EXPLAIN_SNAPSHOT.md) · [`AI_L3_DRAFT_MANIFESTO.md`](AI_L3_DRAFT_MANIFESTO.md) (API only, UI retired)

> **Naming note:** This doc was titled “AI feature development.” The product is **not** an AI company. The core is **signed object state** (L0–L2). LLMs are optional **readers** on top of signed facts—or **adversaries** in the threat model—not ghostwriters for stewards.

---

## Brand direction (locked 2026-05-27)

Humanity Commons responds to the AI era by making **accountable, signed, revocable** participation expensive—not by shipping “AI helps you write.”

| We build | We do not build |
|----------|-----------------|
| Signed manifesto + object streams + public snapshot | Global AI profiles or resolver-stored model text |
| Humans write; humans sign; network shows current state | Ghostwriting assistants on `/created/` |
| `agent_context` for **third-party** integrators | “We have AI too” product marketing |
| Rate limits, graph flags, crypto bar vs synthetic spam | Semantic moderation presented as truth |

**Public line:** No AI profiles. No ghostwriting. Signed state only.

See [`VOUCH_TRUST_POSITIONING.md`](VOUCH_TRUST_POSITIONING.md) · [`DEMOCRATIC_INFRASTRUCTURE.md`](DEMOCRATIC_INFRASTRUCTURE.md) · [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md).

---

## Executive summary

| Track | Status |
|-------|--------|
| **L0–L2** (manifesto, object streams, public snapshot) | **Shipped — product core** |
| **Integrator `agent_context`** (status JSON) | **Shipped — protocol, no model required** |
| **L3 P1** — opt-in scan reader | **Shipped — under review** (step 2 below) |
| **L3 P2** — steward draft | **UI retired** · API kept deprecated for tests/integrators |
| **Anti-synthetic abuse** (V-07, A-01…) | Threat model + shipped crypto/rate controls |
| **Generative backlog** (copilots, compilers, narrators) | **Cancelled** for reference operator UI |

There is **no scan analytics** feeding models. Strangers must **opt in** to any reader UI; the resolver never auto-generates scan hero copy.

---

## Architecture: Localized object intelligence

Canonical boundary: [`LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md`](LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md).

| Layer | What it is | Status |
|-------|------------|--------|
| **L0 Manifesto** | `manifesto_line` headline + status | Shipped |
| **L1 Object streams** | Up to 4 signed detail rows (`object_streams`) | Shipped |
| **L2 Public snapshot** | Deterministic `{ text, fields[] }` from L0 + L1 | Shipped |
| **L3 Readers / orchestration** | Optional read-only layer on L0–L2 only | P1 shipped (review); P2 UI retired |

### Design principles (locked)

- **Object-scoped** — one root card controls one child object / QR handle at a time
- **Signed** — stewards publish mutable copy with root keys; models never write resolver state
- **Revocable** — root and child lifecycle stay explicit
- **Read-only at scan** — strangers consume resolver state by default
- **No generative resolver truth** — model text is never stored in D1 or shown without an explicit non-signed label

---

## Naming collision: two “L3” schemes

| Scheme | Doc | L3 means |
|--------|-----|----------|
| **Scan UI layers** | [`SCAN_PAGE_TRUST_UI.md`](SCAN_PAGE_TRUST_UI.md) | **Actor** — viewer actions (vouch, keys) after live check settles |
| **Object intelligence layers** | This doc · [`LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md`](LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md) | **Readers** — optional layer on signed snapshot (not scan actor band) |

---

## Shipped implementation

### L0–L2 (core)

- `manifesto_line` — [`MANIFESTO_STATUS_UPDATE.md`](MANIFESTO_STATUS_UPDATE.md)
- `object_streams` — [`site/js/object-streams-core.mjs`](../site/js/object-streams-core.mjs)
- `public_snapshot` — [`worker/src/resolver/object-snapshot.ts`](../worker/src/resolver/object-snapshot.ts)

### L3 P1: scan reader (explain snapshot)

See [`AI_L3_EXPLAIN_SNAPSHOT.md`](AI_L3_EXPLAIN_SNAPSHOT.md). **Step 2:** decide keep/rename/deterministic-only.

| Piece | Path |
|-------|------|
| Core | `worker/src/resolver/ai-explain-core.ts` |
| HTTP handler | `worker/src/resolver/ai-explain-snapshot.ts` |
| Scan client | `site/js/scan-ai-explain.mjs` |

### L3 P2: steward draft (UI retired)

See [`AI_L3_DRAFT_MANIFESTO.md`](AI_L3_DRAFT_MANIFESTO.md). **Step 1 done:** no `/created/` UI. API remains for tests; not linked from product surfaces.

| Piece | Path |
|-------|------|
| Core | `worker/src/resolver/ai-draft-core.ts` |
| HTTP handler | `worker/src/resolver/ai-draft-manifesto.ts` |
| ~~Owner client~~ | ~~`site/js/created-ai-draft.mjs`~~ **removed** |

### Integrator read API

When `public_snapshot` is present, `GET …/status` includes `scan.ai.agent_context` and optional `scan.ai.explain` metadata. Third parties may run their own models **outside** humanity.llc using signed fields only. See [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md).

---

## Not in scope (reference operator)

| Item | Status |
|------|--------|
| Steward ghostwriting / “help me write” UI | **Retired** |
| Auto-generated scan hero copy | Forbidden |
| Narrative compiler, copilots, inbox LLM triage | Cancelled for v1 UI |
| Cross-object or city-scale model state | Research only |
| Scan analytics feeding models | Locked out — [`V1_DECISION_LOCK.md`](V1_DECISION_LOCK.md) |
| Model output stored in D1 | Never |

### Anti-AI (on-brand, future)

Optional **adversary** tooling only—never pro-AI product features:

- Client-side templated-vouch nudge before sign (V-07) — friction for bots, not writing help
- Steward ops flags (already shipped) — graph/rate, not semantic truth

---

## Concrete next steps

Ordered plan from brand review (2026-05-27). Update this table as steps complete.

| Step | Action | Status | Owner doc / code |
|------|--------|--------|------------------|
| **1** | **Remove P2 steward draft UI** from `/created/`. Keep `POST …/ai/draft-manifesto` deprecated (tests only; no product links). Stewards type manifesto copy themselves. | ✅ Done | [`AI_L3_DRAFT_MANIFESTO.md`](AI_L3_DRAFT_MANIFESTO.md) · `site/created/` |
| **2** | **Decide P1 scan reader** — (a) keep opt-in with rename (“Plain language”, de-emphasize AI), (b) deterministic template only (no Workers AI), or (c) remove button and rely on signed snapshot text. | ☐ Pending | [`AI_L3_EXPLAIN_SNAPSHOT.md`](AI_L3_EXPLAIN_SNAPSHOT.md) |
| **3** | **Rewrite doc hub** — this file splits object state vs external readers vs anti-synthetic abuse (this revision). Optionally rename file to `OBJECT_STATE_AND_READERS.md` in a follow-up. | ✅ Done | This doc |
| **4** | **Re-align sequencing** with Phase A pilots — no new L3 user features until strangers complete create → scan → update → revoke without hand-holding. | ✅ Noted | [`PHASE_A_STRANGER_PATH_PRIORITIES.md`](PHASE_A_STRANGER_PATH_PRIORITIES.md) |
| **5** | **Marketing clarity** — public copy leads with accountable humans and signed state, not “we have AI.” Audit landing, create, scan limit strings. | ☐ Pending | [`PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md`](PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md) · [`LAUNCH_LANGUAGE_KIT.md`](LAUNCH_LANGUAGE_KIT.md) |

---

## Recommended sequencing (updated)

| Phase | Work | Rationale |
|-------|------|-----------|
| **Now** | Status plate + lost-item field pilots · **merch funnel** (scan → `/shop/customize/`) | Proves L0–L2 + commerce path — [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) |
| **Hold** | New L3 user-facing features | Until Phase A stranger loop proven |
| **Review** | P1 scan reader (step 2) | Accessibility vs brand |
| **Keep** | `agent_context` JSON | Protocol for external integrators |
| **Later** | Anti-synthetic nudges (V-07) | Adversary lane, not author assist |
| **Much later** | Commons Pass, federation | Phase D–E |

---

## Risks

1. **Brand drift** — Any “AI helps you write” surface conflicts with humanity.llc naming and trust model.
2. **Layer naming** — Scan UI L3 (actor band) vs object L3 (readers).
3. **Trust erosion** — Generative text near signed copy must stay visually and semantically separate.
4. **Scope creep** — L3 readers before Phase A pilots succeed.

---

## Tests & commands

```bash
npm run worker:test -- worker/tests/object-snapshot.test.ts worker/tests/object-streams.test.ts
npm run worker:test:ai-explain
npm run worker:test:ai-draft   # API only; UI retired
npm run worker:bundle-scan     # after site/scan-pass.css changes
```

---

## Related

| Path | Role |
|------|------|
| [`AI_L3_EXPLAIN_SNAPSHOT.md`](AI_L3_EXPLAIN_SNAPSHOT.md) | P1 reader spec |
| [`AI_L3_DRAFT_MANIFESTO.md`](AI_L3_DRAFT_MANIFESTO.md) | P2 API spec (UI retired) |
| [`LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md`](LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md) | L0–L3 boundary |
| [`MANIFESTO_STATUS_UPDATE.md`](MANIFESTO_STATUS_UPDATE.md) | L0–L1 owner updates |
| [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) | AI-era adversaries |
