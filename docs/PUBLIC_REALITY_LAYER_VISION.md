# Public reality layer — composable architecture vision

**Status:** Research / public-safe vision — **not shipped**, not on the Phase A path  
**Purpose:** Describe how the physical internet (Humanity), structured disagreement (Negation Game), and stewardship funding (Index Wallets) could compose into a civic **public reality layer** for the AI era — without collapsing them into one product.  
**Audience:** Stewards, partners, integrators, public copy authors  
**Related (shipped L1):** [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) · [`DEMOCRATIC_INFRASTRUCTURE.md`](DEMOCRATIC_INFRASTRUCTURE.md) · [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md)  
**Related (external research):** [Negation Game](https://negationgame.com) · [Index Wallets](https://indexwallets.org)

---

## One-sentence thesis

> Physical pointers resolve to **steward-signed public state**; optional layers add **structured contestability** about claims referencing that state and **proportional stewardship funding** for maintenance — giving communities and future agents an inspectable ground-truth layer that does not depend on platform feeds, scan surveillance, or money-as-verdict.

---

## Three-layer model

Three layers, three jobs. They **compose**; none replaces another.

```text
┌─────────────────────────────────────────────────────────────┐
│  L3 · STEWARDSHIP FUNDING (Index Wallets — research)        │
│  Who materially supports upkeep of this network / resolver? │
└───────────────────────────┬─────────────────────────────────┘
                            │ funds operations — not verdicts
┌───────────────────────────▼─────────────────────────────────┐
│  L2 · CONTESTABILITY (Negation Game — research)             │
│  What claims about this state are disputed or under review? │
└───────────────────────────┬─────────────────────────────────┘
                            │ annotates claims — never overwrites L1
┌───────────────────────────▼─────────────────────────────────┐
│  L1 · PHYSICAL INTERNET (Humanity — core, partially shipped)│
│  What does this pointer say right now?                      │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Question | Authority | In humanity.llc today |
|-------|----------|-----------|------------------------|
| **L1 Physical internet** | What is the current signed public state of this object or network? | Steward key signs; resolver verifies; anyone can read | **Partially shipped** — resolver, revoke, public boards, city game nodes |
| **L2 Contestability** | What do participants support, negate, challenge, refine, or mark under review *about claims referencing L1*? | Structured graph beside signed state | **Not integrated** — external research (Negation Game) |
| **L3 Stewardship funding** | Who supports resolver hosting, audits, accessibility, emergency key rotation? | Proportional flows toward declared pools | **Not integrated** — external research (Index Wallets) |

**Binding rule:** L1 is authoritative for *what the steward published*. L2 is authoritative for *how the community disputes claims about that publication*. L3 is authoritative for *who is resourced to maintain L1*. Funding and dispute graphs are **signals**, not substitutes for signed state.

This aligns with the semantic model in [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md): **Identity** (what state attaches to) + **Address** (stable pointer) + **Interpretation** (protocol + domain charter → scan representation). L2 attaches to claims *about* interpretation or steward assertions. L3 attaches to **stewardship pools** tied to a network charter — not to individual scans.

---

## Why this matters for AI grounding

Large models and agents increasingly need **current, citeable facts about the physical world** — door status, event hours, resource availability, game node state. Today they mostly scrape the web: stale pages, SEO content, and engagement-optimized feeds.

A public reality layer would offer a different contract:

| Need | Layer | Mechanism |
|------|-------|-----------|
| Canonical current fact about a physical thing | L1 | Resolver returns signed, timestamped, revocable representation |
| Explicit uncertainty | L2 | Dispute graph shows active negations or *under review* on related claims — not consensus |
| Operational confidence (not truth) | L3 | Stewardship pool activity signals whether maintenance exists — not whether state is correct |

**Integrator posture (future, not product promise):** treat L1 as the steward’s published answer; treat L2 as structured uncertainty; never treat funding level as verification. Agents should cite `qr_id → resolver → signed document → steward identity`, not scan frequency or social rank.

Humanity’s resolver is **Ed25519-signed documents + operator-hosted state** ([`DEMOCRATIC_INFRASTRUCTURE.md`](DEMOCRATIC_INFRASTRUCTURE.md)) — not a public chain, not NFT identity, not wallet-based “humanity.” Any future agent integration would inherit the same trust boundaries as human scanners ([`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md)).

---

## Example — Cedar Rapids public board

**L1 (shipped concept; reference network):** A public board lists an intentional set of live places for Cedar Rapids — city game nodes, resource status plates, season overlay. Each QR resolves to current signed state: node active/paused, bulletin text, open/closed resource status. The printed URL stays fixed; resolver truth changes. Opening a link is **not logged by default**.

**L2 (research — not live on humanity.llc):** An organizer claim: *“Node 12’s clue can be solved without crossing private property.”* Players **challenge**; a cartographer **refines** boundary language; the claim is marked **under review** until a steward re-signs L1 copy. Gameplay and scan pages continue to show whatever L1 last published; the dispute layer documents *why* some scanners may distrust the claim today.

**L3 (research — not live on humanity.llc):** A *Cedar Rapids resolver stewardship* pool receives proportional support from participants whose wallets (Index Wallets model) include that entry. Funds might cover print packs, bilingual signage, quarterly accessibility review, backup resolver hosting — **not** declaring a node “officially correct.”

---

## Guardrails

These are **non-negotiable** for any composition of the three layers on humanity.llc infrastructure:

| Guardrail | Rule |
|-----------|------|
| **No scan surveillance** | Opening a QR is not logged by default. Public boards are intentionally listed — not inferred from traffic. |
| **No GPS** | Address means stable pointer → identity context. Location is not a resolver semantic primitive. |
| **No visit logs** | Participation is not proven by “you were here.” No behavioral dossiers from scan patterns. |
| **Funding ≠ truth** | Stewardship support pays for maintenance, accessibility, audits, and ops — not credibility or signing rights. |
| **Disputes ≠ signed state** | L2 never auto-writes L1. Only steward keyholders publish resolver state. *Under review* is a label, not a verdict. |

**Also out of scope for this vision doc:** opaque reputation scores, leaderboards, social-feed mechanics, GPS discovery, treating dispute winners as governance capture, or marketing crypto/tax/legal readiness before implementation exists.

---

## Future protocol hooks (not implemented)

Optional references on L1 objects or network charters — **declarative links only**, no merge of layers in the resolver:

| Field | Points to | Semantics |
|-------|-----------|-----------|
| `dispute_ref` | External or federated contestability graph (e.g. Negation Game board URI) | “Claims about this object’s state may be disputed here.” Scan UI may surface link; resolver bytes unchanged. |
| `stewardship_pool_ref` | Declared maintenance pool (e.g. Index Wallets pool identifier or human-readable charter) | “This network accepts proportional stewardship support for listed ops.” Does not affect trust labels on scan. |

Both fields would be **optional**, **revocable**, and **unsigned-by-third-parties** in the sense that they do not grant L2 or L3 write access to L1. Federation operators choose whether to display them ([`PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`](PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md)).

---

## Shipped today vs research

| Capability | Status |
|------------|--------|
| Signed public state, revoke, resolver scan representation | **Shipped** (reference operator) |
| Public boards (intentionally listed, not visit-derived) | **Shipped** |
| City game season overlay, `game_node` child objects | **Shipped** (feature-flagged / pilot) |
| No default scan analytics | **Shipped policy** — [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) |
| Vouch graph, live control proof | **Partial** — see [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) |
| Negation Game integration, `dispute_ref` | **Research** — external project; not in resolver |
| Index Wallets integration, `stewardship_pool_ref` | **Research** — external project; not in resolver |
| AI agent APIs or agent-specific scan modes | **Not shipped** — integrators may read public resolver responses today under same limits as browsers |
| Crypto payments, token governance of signing keys | **Out of scope** — not part of humanity.llc core loop |

---

## Short manifesto version

*(Public-safe; suitable for site footer, partner one-pager, or LinkedIn.)*

> **The sticker stays. The status changes.**
>
> We build democratic infrastructure for the physical world: pointers on real objects that resolve to **current, signed, revocable public state** — without scan surveillance by default.
>
> Disagreement belongs in structure, not in feeds. When communities contest a claim, they deserve support, negation, challenge, and review — not another comments section and not a popularity contest. That layer sits **beside** signed state; it does not replace it.
>
> Public networks deserve public maintenance. Proportional stewardship funding — still research for us — could help communities pay for resolvers, audits, and accessibility without buying the verdict.
>
> Three layers. Three jobs. One direction: a **public reality layer** humans can trust and future systems can cite — grounded in what a steward signed today, honest about what is disputed, clear about what money does and does not prove.

---

*This document is vision and composition grammar only. It does not authorize engineering work, imply partnerships, or change [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md). For active shipping scope, see [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md).*
