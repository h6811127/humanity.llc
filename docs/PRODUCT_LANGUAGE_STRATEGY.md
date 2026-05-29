# Product language strategy

**Status:** Active  
**Audience:** Product, design, engineering, support, launch copy  
**Purpose:** Canonical policy for when to use plain language vs precise protocol terms across UI, public copy, and internal docs.

**Companion (ownership vocabulary):** [`OWNERSHIP_AND_CONTROL_MODEL.md`](OWNERSHIP_AND_CONTROL_MODEL.md) — three-layer model and terminology map for steward/device surfaces.  
**Trust boundaries:** [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) · **Scanner contract:** [`SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) · **Public launch lines:** [`LAUNCH_LANGUAGE_KIT.md`](LAUNCH_LANGUAGE_KIT.md)

---

## One-line policy

> **Plain by default, precise on purpose — never precise in the hero unless the user opted into protocol mode.**

- **Plain by default** — first screens speak in outcomes (“Reachable,” “Turn off this tag,” “What finders see”), not internals (`resolver`, `qr_credential`, `sessionStorage`).
- **Precise on purpose** — mechanism appears where someone asked for depth: Advanced panels, Help & protocol, governance docs, threat models, engineer runbooks.
- **Never precise in the hero** — scan pages, landing hooks, and primary CTAs do not lead with crypto or storage vocabulary.

This is **progressive disclosure**, not hiding. Humanity is a trust product; scanners and stewards must understand limits honestly. The goal is to **translate and stage** mechanism — not to remove it from the system or from docs that auditors and builders need.

---

## Why not “hide jargon everywhere”

| Risk of over-sanitizing | What we do instead |
|-------------------------|-------------------|
| Scans feel like generic QR profiles | Say **live check**, **revoked**, **does not prove the holder owns the card** — outcome language that still reveals mechanism |
| Stewards cannot act safely | Default to task copy; put **QR credential**, **export**, **recovery** under Advanced |
| Skeptics assume marketing spin | Public FAQ and launch kit may name vouch, live control, revoke — then explain what each proves and does *not* prove |
| Engineers lose a single source of truth | Layer 1 docs (`KEYS_CARDS_AND_VERIFICATION.md`, `Technical Standards v1.0.md`, investigations) stay precise |

**Anti-patterns (do not ship):**

- Euphemisms that imply more trust than the system proves (“verified,” “identity confirmed,” “always secure”).
- Burying honest limits below marketing chips.
- Replacing protocol terms in APIs, storage keys, tests, or migration SQL without a dedicated protocol PR.

---

## Audience layers

Write for the reader’s job, not one global reading level.

| Audience | Primary surfaces | Language posture | Canonical examples |
|----------|------------------|------------------|-------------------|
| **Scanner (stranger)** | Scan page, safety header, optional Plain language reader | Calm, utility-first; one honest limit above the fold | “Live check on `humanity.llc`” · “Does not prove the person holding this item owns the card” |
| **Steward (owner)** | `/create/`, `/created/`, hub, wallet, inbox | Task-oriented Layer 2; pilot templates may simplify further | “Publish status update” · “Open controls” · “Save ownership on this device” |
| **Curious / integrator** | Help & protocol, Documentation disclosure, Advanced, constitution | Mechanism-revealing; link to standards | “Signed public state” · “Revocable attestation” · export formats |
| **Engineer / operator** | `AGENTS.md`, runbooks, investigations, feature specs | Full protocol vocabulary | `hc_created`, Ed25519, D1, resolver poll maps |

**Scanner ≠ steward ≠ engineer.** Do not collapse copy across these roles. See [`PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md`](PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md) § Step 5 (terminology sequencing).

---

## Relationship to the three-layer ownership model

[`OWNERSHIP_AND_CONTROL_MODEL.md`](OWNERSHIP_AND_CONTROL_MODEL.md) defines Layers 1–3 for **custody and control** copy:

| Layer | User-facing goal | Default UI |
|-------|------------------|------------|
| **3 — Vision** | “This tag belongs to me.” | Marketing, physical object education |
| **2 — Product** | Own · share · revoke · recover · prove control | All default steward and scan outcomes |
| **1 — Engineering** | Keys, signatures, storage keys | Advanced, engineer docs, APIs |

**Rule for new UI:** Default surfaces use Layer 2–3. Layer 1 appears only in Help, data policy, optional **Advanced / for developers**, and internal docs.

The **terminology map** in [`OWNERSHIP_AND_CONTROL_MODEL.md`](OWNERSHIP_AND_CONTROL_MODEL.md) § Terminology map is the migration checklist for steward/device strings. This doc is the **cross-cutting policy**; that doc is the **word-by-word table**.

---

## Surface rules

### Scan page (stranger)

- Lead with **what is true right now** and **what it does not prove** ([`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) five-second gate).
- Prefer **live check**, **active / revoked**, **vouched** (with limits), **control proven** over **resolver**, **credential**, **signed payload** in hero modules.
- Optional **Plain language** reader ([`AI_L3_EXPLAIN_SNAPSHOT.md`](AI_L3_EXPLAIN_SNAPSHOT.md)) restates signed snapshot — labeled **not signed network state**; stable API fields may keep `ai` names.

### Landing and movement copy

- Hero hook: category and outcome (“Live state on real objects”) — avoid leading with “OS” or wallet jargon ([`PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md`](PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md) messaging matrix).
- Movement energy may be louder; **scan page stays calm** ([`VISUAL_IDENTITY_PRINCIPLES.md`](VISUAL_IDENTITY_PRINCIPLES.md)).

### Steward hub and `/created/`

- **Semantic copy** — operational language, not cryptographic jargon ([`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md)).
- **Progressive depth** — keys, profile id, vouch default in collapsed **Details**; revoke precision in Advanced or pilot-specific confirm strings.
- **Pilot overlays** — `site/js/pilot-steward-copy.mjs` supplies plain labels per template (`status_plate` → “tag,” `lost_item_relay` → “relay”). Precise terms stay in Advanced / resolver panels.

### Errors and sad paths

- Map resolver and client errors to **plain-language user messages** ([`LIVE_CONTROL_USABILITY_HARDENING.md`](LIVE_CONTROL_USABILITY_HARDENING.md), `resolver-user-error-core.mjs`). Prefer “Couldn’t reach the network” over raw `INVALID_SIGNATURE` in default UI.

### Public launch and FAQ

- Follow [`LAUNCH_LANGUAGE_KIT.md`](LAUNCH_LANGUAGE_KIT.md) message hierarchy and **lines to avoid**.
- [`SKEPTIC_FAQ.md`](SKEPTIC_FAQ.md) may use mechanism terms when answering technical objections — pair each term with **what it proves / does not prove**.

---

## Mechanism-revealing, not crypto-coded

Public UI should **explain how trust was earned** without sounding like a wallet or government ID.

| Do | Don’t |
|----|-------|
| **Vouched Human** (accountable attestation under rules) | **Verified Human** (unless governance approves after user testing) |
| “Control proven moments ago” + limitation line | “Cryptographically verified identity” |
| “Live check on humanity.llc” | “On-chain proof” / “Web3 identity” |
| “You can manage this object in this tab” | “Signing key in sessionStorage” |

Visual tone: professional and trustworthy; **not** bureaucratic, **not** crypto-coded, **not** Linktree-like ([`VISUAL_IDENTITY_PRINCIPLES.md`](VISUAL_IDENTITY_PRINCIPLES.md)).

---

## Rename, don’t erase

When user-facing labels change, **keep stable technical identifiers** for integrators and tests.

| Pattern | Example |
|---------|---------|
| Friendly UI label | **Plain language** button on scan |
| Stable API / JSON | `POST …/ai/explain-snapshot`, `scan.ai.explain` |
| User-visible error | Plain sentence |
| Log / test assertion | Protocol error code |

Do not rename storage keys, document types, or resolver fields in a copy-only PR.

---

## Where precise jargon belongs

**Keep full protocol vocabulary in:**

- [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md), [`Technical Standards v1.0.md`](Technical Standards v1.0.md), [`features/`](features/)
- Threat models, data policy, postmortems, `AGENTS.md`, QA runbooks
- Optional **Advanced** on `/created/`, **Help & protocol** footer, Documentation disclosure cards
- API responses and test fixtures

**Migrate to Layer 2 in default UI:**

- Hero lines on `/create/`, landing trust chips, hub custody panel, inbox cross-tab strings, scan vouch explainer (see gap table in [`OWNERSHIP_AND_CONTROL_MODEL.md`](OWNERSHIP_AND_CONTROL_MODEL.md) § Where the UI still exposes Layer 1).

---

## Comprehension gates

Copy changes that affect trust claims should be validated with strangers **without** defining jargon first:

- Live control: [`M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md`](M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md)
- Founding / launch: [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) copy gates
- Stranger path: [`M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md)

**Pass signal:** testers paraphrase outcomes (“someone with control proved it recently”), not protocol nouns they were taught.

---

## Checklist for new copy (PR review)

1. **Who is reading?** Scanner, steward, or engineer?
2. **Is this the default path or Advanced?** If default, use Layer 2 table.
3. **Does it overclaim?** Cross-check [`LAUNCH_LANGUAGE_KIT.md`](LAUNCH_LANGUAGE_KIT.md) § Lines to avoid and trust model limits.
4. **Is an honest limit visible** on trust surfaces without scrolling?
5. **Did we rename UI only?** APIs, storage, and tests unchanged unless protocol PR.
6. **Pilot template?** Consider extending `pilot-steward-copy.mjs` instead of one-off strings.

---

## Related docs

| Doc | Role |
|-----|------|
| [`OWNERSHIP_AND_CONTROL_MODEL.md`](OWNERSHIP_AND_CONTROL_MODEL.md) | Terminology map + custody Layer 2 migration |
| [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) | What scans prove; mechanism-revealing labels |
| [`SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) | Stranger-facing product contract |
| [`VISUAL_IDENTITY_PRINCIPLES.md`](VISUAL_IDENTITY_PRINCIPLES.md) | Tone; anti crypto-coded |
| [`PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md`](PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md) | Messaging matrix; Step 5 sequencing |
| [`LAUNCH_LANGUAGE_KIT.md`](LAUNCH_LANGUAGE_KIT.md) | Approved public lines |
| [`SKEPTIC_FAQ.md`](SKEPTIC_FAQ.md) | Objection handling with honest mechanism |
| [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md) | Hub semantic copy |
| [`AI_L3_EXPLAIN_SNAPSHOT.md`](AI_L3_EXPLAIN_SNAPSHOT.md) | Rename-don’t-erase example |
| [`DEVICE_OS.md`](DEVICE_OS.md) | Placement: reference vs immutable glance |

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-05-29 | Adopt canonical product language strategy: progressive disclosure, plain default, precise on purpose |
| 2026-05-29 | “Hide jargon” rejected as global policy; stratify by audience and surface instead |
