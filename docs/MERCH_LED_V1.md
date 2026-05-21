# Merch-Led V1: Curiosity + Belonging

**Status:** Canonical wedge (v1 GTM)  
**Purpose:** Lead with physical artifacts as viral distribution while pairing **proof of curiosity** (spread) with **proof of belonging** (retention). Commons Pass and organizer tooling follow once people already wear the object.

**Architecture and launch gate:** `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md` — public card creation when Phase A ships; federated resolvers long-term; founding cohort is optional feedback only.

---

## Core Thesis

The wedge is not a sign-in sheet. The wedge is a **walking advertisement** that resolves to an honest, live trust object.

Two proofs, one loop:

| Proof | Job | Optimizes for |
|---|---|---|
| **Curiosity** | Stranger sees artifact → scans → understands hook → creates or requests next step | Virality, scans, orders, word of mouth |
| **Belonging** | Holder earns vouches / credentials under public rules → visible on scan → invites others | Retention, trust graph, repeat wear, invites |

Curiosity fills the top of the funnel. Belonging makes the funnel mean something beyond merch.

Neither proof claims legal identity, KYC, or “holder = owner” from a static QR alone. See `docs/V1_PRODUCT_TRUST_MODEL.md`.

---

## What Each Proof Means

### Proof of curiosity

**Question it answers:** “What is this, and why should I care?”

**What the scan may show:**

- Beautiful, fast mobile pass/card page.
- Current status (active, revoked, suspended, unknown).
- Plain-language limits: static QR is a pointer, not proof the nearby person controls the card.
- One clear next action: create a card or view the drop (no invite gate when Phase A is live).

**What it does not prove:**

- The wearer is vouched or “verified.”
- The wearer is the card owner.
- Membership in any community (unless explicitly shown and signed).

**Product surfaces:**

- Public scan page (resolver).
- Founding drop / story-row storefront (`docs/features/Storefront v1.0.md`).
- Shareable landing: “Get yours” / “Create yours.”

**Success signals:**

- Stranger scans (not only friends).
- Scan → card create or waitlist conversion.
- Unprompted “where’d you get that?” in the wild.
- Orders from people outside the founder’s direct network.

### Proof of belonging

**Question it answers:** “Who is in the room with me, under rules I can read?”

**What the scan may show:**

- Mechanism-revealing labels: `Registered`, `Vouched Human`, `Founding Human`, `Early Builder`, `Steward` (not overclaimed “verified forever”).
- Vouch recency and public badge trail where policy allows.
- Optional live control proof when context needs it (recent key control, not legal ID).
- Link to public rules: vouch quota, wait periods, revocation.

**What it does not prove:**

- Universal humanity or bot-proof identity.
- That buying merch granted status.
- Legal identity or background clearance.

**Product surfaces:**

- Humanity Card + vouch flow (`docs/features/Human Verification v1.0.md`).
- Optional early testers (`docs/FOUNDING_COHORT_PLAYBOOK.md`) for copy/ops—not a product gate.
- Artifact copy and packaging that never print mutable “verified” text on the object.

**Success signals:**

- Users vouch each other without founder nagging.
- Repeat wear after the first week (sticker stays on laptop/bottle).
- Invites: “you should get one before the drop closes.”
- At least one in-person ritual (event, dinner, office hours) where scans + vouches happen together.

---

## Single Loop: Object → Scan → Belong

```text
Curiosity path (anyone)
  See artifact → scan QR → fast page + limits → create card OR join waitlist OR shop drop

Belonging path (any card holder)
  Create card (public) → personalize artifact when ready →
  wear → get vouched at or after real contact → scan shows Vouched / credential state →
  invite next person

Bridge
  Curious scanner who creates a card enters waitlist or next cohort;
  belonging holder’s artifact is what strangers scan most often in public
```

**Rule:** Commerce must never imply that payment = belonging. Copy on every product and scan page: **buying merch does not make you vouched.**

Belonging is earned through cohort rules and vouches, not checkout.

---

## V1 Scope (Merch-Led, Solo-Founder Realistic)

Build in this order. Do not start with Commons Pass console or event check-in.

### Phase A — Digital trust slice (before money)

Prove the scan moment is worth a stranger’s attention:

1. Signed Humanity Card create (browser-held keys).
2. HTTPS QR resolver + trust-state UI (card, human trust, limitations).
3. Revoked / suspended / unknown status pages.
4. Optional waitlist for merch drops only—not for card creation gate.
5. Vouch issuance + display (`Vouched Human` public label).
6. Live control proof: private alpha minimum; public UI when copy-tested.

**Exit:** 10–25 founding humans can scan each other and explain what the page does and does not prove.

### Phase B — Curiosity drop (one SKU, one story)

Prove walking ads work:

1. One flagship artifact (sticker recommended first for scan QA; flat card second).
2. Story-row storefront — one narrative, not a 50-SKU grid.
3. Non-personalized or lightly personalized QR pointing at resolver (personalized per-item QR only after Printify spike passes — see `docs/V1_ASSUMPTION_REGISTER.md`).
4. Packaging / product page with bearer warning and “merch ≠ vouched” line.

**Exit:** Orders from outside founder network; scan→create conversion tracked; at least one organic reshare.

### Phase C — Belonging on the object (personalized line)

Connect artifact to card holders (not a protocol invite gate):

1. Personalized drop for active Humanity Card holders when print QA allows.
2. Personalized QR per item when provider QA supports it (`artifact_intent` → Shopify → Printify vertical slice).
3. Scan shows vouch/founding state for holders; curious scanners still see curiosity CTA, not fake status.

**Exit:** Holders vouch and invite; stolen-QR revocation tested on a real item.

### Phase D — Commons Pass (organizer upsell)

When the same room has many cards/stickers:

- Community pass, check-in, stamps (`docs/COMMONS_PASS_V1_SPEC.md`).
- Pitch: “Your members already wear the QR — now issue the community pass.”

**Defer until Phase A–C show repeat scans and vouches.**

---

## Founding Drop Design (Both Proofs at Once)

### Tier 0 — Curiosity (open or wide waitlist)

- **Offer:** Standard founding sticker/card design, same landing QR or batch QR.
- **Story:** Movement line + honest trust limits (`docs/LAUNCH_LANGUAGE_KIT.md`).
- **Goal:** Volume, scans, narrative spread.
- **Risk control:** No “verified human” on print; scan page carries all mutable trust state.

### Tier 1 — Belonging (personalized, not gated)

- **Offer:** Personalized artifact for card holders when print QA allows; may be time-limited drop, not invite-only access to the protocol.
- **Story:** Vouched humans and credentials under public rules—export and revoke rights.
- **Goal:** Trust graph, repeat wear, peer invites.
- **Risk control:** 3-vouch threshold, quotas, 90-day vouch wait — per `docs/V1_DECISION_LOCK.md`.

### Same brand, two doors

| | Curiosity drop | Belonging drop |
|---|---|---|
| Who | Anyone curious | Card holders ready to personalize |
| Scan CTA | Create card · Read trust model | See vouch state · Request vouch · Prove live control |
| Artifact | Mass founding design | Personalized handle/QR where QA allows |
| Revenue | Funds ops + production | Funds ops + signals commitment (not status) |

---

## Scan Page Layout (Five Seconds)

Required blocks, visually separated:

1. **Status** — card/QR active, revoked, suspended, unknown.
2. **Human trust** — `Registered` / `Vouched Human` / founding badges, or “not vouched” (no shame language; factual).
3. **Curiosity CTA** — always visible for non-holders: create card, get the drop, read what this is.
4. **Belonging CTA** — for holders: prove live control, export, revoke; vouch request where policy allows.
5. **Limits** — bearer warning + what scan does not prove.

Curiosity and belonging share one URL pattern; content adapts by resolver state, not by separate products.

---

## Metrics (Merch-Led)

| Metric | Curiosity | Belonging |
|---|---|---|
| Leading | Scans per artifact, scan→create %, orders from non-friends | Vouches per founding member, invite rate, repeat wear (self-report + spot checks) |
| Lagging | CAC from organic vs paid, reorder / second SKU | Cohort retention at 30/60 days, live proof uses in person |
| Anti-metrics | Merch buyers who never create a card | Vouch rings, “verified” printed on artifacts, scan analytics added for “growth” |

**V1 is working when:**

- Curiosity: strangers scan and a meaningful % create a card or join waitlist without a founder present.
- Belonging: ≥10 distinct users vouch without prompting and can explain limits to a skeptic.
- Bridge: at least one person moves from curiosity create → vouch → personalized artifact.

---

## Decisions To Lock (Owner)

| ID | Decision | Recommendation |
|---|---|---|
| M-01 | First artifact | One sticker; add flat card after scan QA |
| M-02 | Drop order | Phase A digital → Tier 0 curiosity drop → Tier 1 belonging personalize |
| M-03 | Open vs closed Tier 0 | Open curiosity drop; Tier 1 personalized for card holders (no protocol invite gate) |
| M-04 | Batch vs unique QR on Tier 0 | Batch QR acceptable for Tier 0; unique item QR for Tier 1 |
| M-05 | Public labels | `Vouched Human` not `Verified Human` on UI and print |
| M-06 | Live control | Private alpha in Phase A; public when comprehension test passes |

---

## Relationship To Other Docs

| Topic | Canonical doc |
|---|---|
| **Implementation order and architecture** | `docs/V1_0_ARCHITECTURE_ROADMAP.md` |
| Trust limits, labels | `docs/V1_PRODUCT_TRUST_MODEL.md` |
| Shopify / Printify, spikes | `docs/V1_ASSUMPTION_REGISTER.md`, `docs/V1_DECISION_LOCK.md` |
| Implementation shapes | `docs/V1_IMPLEMENTATION_CONTRACTS.md`, `docs/V1_IMPLEMENTATION_BACKLOG.md` (reorder phases to match this doc) |
| Copy and slogans | `docs/LAUNCH_LANGUAGE_KIT.md`, `docs/SKEPTIC_FAQ.md` |
| Founding drop ops | `docs/FOUNDING_DROP_BRIEF.md` |
| Optional early testers | `docs/FOUNDING_COHORT_PLAYBOOK.md` (non-gating) |
| Protocol / federation | `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md` |
| Community pass (later) | `docs/COMMONS_PASS_V1_SPEC.md` |
| Enterprise / governance (later) | `docs/COMMONS_ROADMAP.md`, `docs/PUBLIC_LAUNCH_AND_GOVERNANCE_PLAN.md` |

This doc **supersedes** “Commons Pass first” ordering in README and backlog until Phase D gates are met.

---

## Launch Principle (Dual Proof)

Make the strongest **honest** claims on the object and the scan page:

- **Curiosity:** “Scan it — you’ll see what we actually prove.”
- **Belonging:** “Signed, vouched where shown, revocable, live control when needed — not surveillance, not legal ID.”

Institutional gravity grows when walking ads point at **federated** trust infrastructure people keep using after the sticker arrives—and when a second operator runs the same spec.
