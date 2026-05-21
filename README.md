# Humanity Commons

**Democratic infrastructure** for real people and member-run communities: portable trust you can inspect, revoke, and export—without surveillance platforms, legal-ID pipelines, or a single company owning “who counts.”

The near-term build is the **Humanity Card** and a **live QR resolver** on `humanity.llc` (reference operator). **Commons Pass**—community membership, events, check-in, and signed stamps—comes after the card loop is proven. See `docs/DEMOCRATIC_INFRASTRUCTURE.md` for direction and `docs/V1_0_ARCHITECTURE_ROADMAP.md` for build order.

Physical **merch** is distribution (curiosity → create card), not the product definition. See `docs/MERCH_LED_V1.md`.

**Architecture:** open standards and **federated resolvers**—not a platform empire, not an invite-only gate, not blockchain identity. See `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`.

---

## Why a revocable QR is not “just a profile link”

A profile link is static. Humanity Commons is built for **current truth at scan time**:

- Signed public card data (inspectable, not “trust me bro”).
- **Per-QR and per-card revocation** (stolen sticker, lost item, compromised key).
- **Vouches** as accountable social trust—not follower counts or hidden scores.
- **Live control proof** when a static QR is not enough (recent key control, in person).
- Clear **what the scan does not prove** (no legal ID, no “holder owns this object” from QR alone).

Phase A MVP will look minimal on purpose (create → scan → revoke). If that is all we ever ship, the skeptics win. The roadmap adds vouches, live control, per-item printed QRs, Commons Pass for orgs, and federation. See `docs/DEMOCRATIC_INFRASTRUCTURE.md` §2.

---

## What this is not

- A social network or “democratic social empire” in one app
- Government ID, KYC, or global “verified human” oracle
- Surveillance analytics on scans
- Cryptocurrency, NFT identity, or public-chain trust core
- Phone-number or email **required** to exist on the protocol

Cryptography here means **signatures and published rules**, not coins.

---

## Product promise (phased)

**Humanity Card (Phase A–C):**

> Create a signed public card, share it by QR, receive vouches from real people, prove live control when needed, revoke credentials you no longer trust—and read honest scan pages that say what is and is not proved.

**Commons Pass (Phase D, on top of the card):**

> Run a community with mobile web passes, event check-in, and signed stamps—without ads, scan analytics, or platform lock-in.

V1 earns trust by being **honest about limits**:

- A static QR on a sticker is only a pointer; it does not prove the holder owns the card.
- A **current** scan shows card, QR, and trust status from the resolver.
- Vouches show social attestations under published rules.
- Live control shows recent key control when requested.
- Revocation and suspension are visible states, not silent failures.

See `docs/V1_PRODUCT_TRUST_MODEL.md`.

---

## V1 scope (summary)

**Phase A MVP** (build first):

1. Signed Humanity Card creation (browser-held keys).
2. HTTPS QR resolution with **live** status.
3. Trust-state scan UI (card, human trust, artifact/QR, limitations).
4. Revoke card and item-scoped QR credentials.
5. Stranger-tested create/scan/revoke loop.

**Then:** curiosity merch (Phase B), personalized artifacts (Phase C), **Commons Pass** (Phase D), **second operator** (Phase E).

**Explicitly out of scope for v1:**

- Native checkout (Shopify handoff when commerce ships).
- Device-based unique-personhood proof.
- Public search or verified-human directory.
- Marketplace behavior.
- Scan analytics.
- Blockchain, NFT, or ledger-based identity.

Deferred details: `docs/V1_DECISION_LOCK.md`.

---

## Trust labels (public UI)

Mechanism-revealing labels, not hype:

- `Registered`
- `Vouched Human`
- `Founding Human`
- `Early Builder`
- `Steward`
- `Revoked By Owner`
- `Suspended Under Public Rules`

Avoid legal identity, KYC, age verification, bot-proof, or guaranteed-unique humanity claims.

---

## Architecture direction

- Browser/device generates and holds Humanity Card **private keys**.
- **Reference resolver** (`humanity.llc`) stores public card, QR, status, vouch, and revocation data under a published **data-minimization policy**—no scan analytics by default.
- **Protocol is portable:** `docs/Technical Standards v1.0.md`; other operators implement the same API (federation).
- Commerce (when live) stays in Shopify/Printify; **never** upgrades trust status from a purchase.
- Trust core is **signed documents + resolver state**, not a public blockchain.

Riskiest vertical slice (post–Phase A):

```text
Signed card → HTTPS QR → trust-state UI → artifact intent → per-item QR → paid order → print → revoke one item → scan shows revoked
```

---

## Documentation map

**Direction and skeptics:**

- `docs/DEMOCRATIC_INFRASTRUCTURE.md` — **canonical direction** (infrastructure vs empire; why scan matters)
- `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md` — federation, public launch, privacy boundaries
- `docs/SKEPTIC_FAQ.md` — objections (QR profile, blockchain, honeypot, etc.)

**Implementation (build step by step):**

- `docs/V1_0_ARCHITECTURE_ROADMAP.md` — **canonical build sequence** (M0–M10)

**V1 wedge and copy:**

- `docs/MERCH_LED_V1.md` — curiosity + belonging, phases
- `docs/FOUNDING_DROP_BRIEF.md`, `docs/LAUNCH_LANGUAGE_KIT.md`

**Trust and use cases:**

- `docs/V1_PRODUCT_TRUST_MODEL.md`
- `docs/V1_USE_CASES.md`
- `docs/V1_MARKET_AND_GROWTH_STRATEGY.md`
- `docs/features/Humanity Card v1.0.md`
- `docs/features/Human Verification v1.0.md`
- `docs/features/QR Public Profile v1.0.md`

**Commons Pass (Phase D):**

- `docs/commons/COMMONS_PASS_PRODUCT_STRATEGY.md`
- `docs/commons/COMMONS_PASS_V1_SPEC.md`
- `docs/commons/COMMONS_PASS_TECHNICAL_ARCHITECTURE.md`
- `docs/commons/COMMONS_PASS_SECURITY_AND_PRIVACY.md`
- `docs/commons/COMMONS_PASS_DESIGN_AND_UX.md`
- `docs/commons/COMMONS_ROADMAP.md`

**Commerce and fulfillment:**

- `docs/features/Storefront v1.0.md`
- `docs/features/Printify Fulfillment Middleware v1.0.md`

**Implementation planning:**

- `docs/V1_DECISION_LOCK.md`
- `docs/V1_IMPLEMENTATION_CONTRACTS.md`
- `docs/V1_IMPLEMENTATION_BACKLOG.md`
- `docs/V1_FLOW_AUDIT.md`
- `docs/V1_ASSUMPTION_REGISTER.md`
- `docs/V1_ADVERSARIAL_REVIEW.md`

**Governance and narrative:**

- `docs/PUBLIC_LAUNCH_AND_GOVERNANCE_PLAN.md`
- `docs/MOVEMENT_NARRATIVE.md`
- `docs/FOUNDING_COHORT_PLAYBOOK.md` — optional early testers (non-gating)
- `docs/VISUAL_IDENTITY_PRINCIPLES.md`
- `docs/🧠 Organizing Documents/📜 Constitution.md`
- `docs/Technical Standards v1.0.md`

---

## Landing page (Cloudflare Pages)

Static site in [`site/`](site/). Deploy with build output directory **`site`**.

```bash
npm run deploy
```

**Resolver (Worker):** `worker/` — `npm run worker:dev` for local health; production routes in roadmap step 1.4.

---

## Current status

Planning repo + deployable landing + Worker scaffold (M1 step 1.1). Next: **M1.2+** in `docs/V1_0_ARCHITECTURE_ROADMAP.md`.

**MVP** = Phase A through step **5.3**: open create, honest scan, revoke, stranger-tested.

---

## Launch principle

Make the strongest **honest** claim:

> This card is signed, current, revocable, socially vouched where shown, and able to prove live control when needed—and the scan page says what that does *not* mean.

Market proof is whether strangers and communities **use the loop** without hand-holding, and whether a **second operator** can adopt the same spec—not whether the first scan page looks flashy.
