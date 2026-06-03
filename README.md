# humanity.llc · Humanity Commons

**Live links:** a physical object or public ID points at a URL; a scan returns **current state** from the resolver (active, revoked, suspended, unknown), not a frozen page.

```text
object or ID  →  scan (HTTPS QR)  →  live signed state
```

**humanity.llc** is the reference operator and product surface for that primitive. **Humanity Commons** is the open protocol and democratic-infrastructure project around it: portable trust you can inspect, revoke, and export - without surveillance platforms, legal-ID pipelines, or one company owning “who counts.”

You can aim to be **the link company** in that specific sense: not short redirects or link-in-bio, but **resolver-backed links whose meaning can change** (membership, trust, access, public claims, object status). Commons Pass (community membership, events, check-in, stamps) and federation sit on the same grammar once the scan loop is proven. See `docs/DEMOCRATIC_INFRASTRUCTURE.md` and `docs/V1_0_ARCHITECTURE_ROADMAP.md`.

Physical **merch** is distribution (curiosity → create), not the product definition. **Post-M5 focus:** Tier 1 personalized wear ([`docs/MERCH_FUNNEL_MVP.md`](docs/MERCH_FUNNEL_MVP.md)). Commerce stack: [`docs/MERCH_HEADLESS_COMMERCE.md`](docs/MERCH_HEADLESS_COMMERCE.md).

**Architecture:** open standards and **federated resolvers** - not a platform empire, not an invite-only gate, not blockchain identity. See `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`.

---

## What ships first vs what Commons adds

| Layer | What it is | Status |
|-------|------------|--------|
| **Live QR primitive** | QR/NFC URL → resolver → honest current status + limits copy | **Live** (create, scan, revoke, manifesto update); **M5.5** key export/recovery |
| **Humanity Card** | Signed public identity document (`profile_id`, handle, manifesto, keys on device) | **Shipped** (Phase A complete) |
| **Vouches & live control** | Social trust and optional in-person key proof | After MVP core |
| **Per-object / item QRs** | Revoke one sticker without killing the card | Phase B–C |
| **Commons Pass** | Org membership, events, check-in on same API | Phase D |
| **Federation** | Second operator, export, exit | Phase E |

The landing page speaks in **objects** (stickers, plates, wristbands) because that is how people encounter QRs. The v1 implementation path is still **card + QR credential IDs** under `hc/v1`; broader object types and use-case catalogs are documented, not all built yet. See `docs/V1_USE_CASES.md` (revocable QR primitive + phased examples).

---

## Why a revocable QR is not “just a profile link”

A profile link is static. This stack is built for **current truth at scan time**:

- Signed public card data (inspectable, not “trust me bro”).
- **Per-QR and per-card revocation** (stolen sticker, lost item, compromised key).
- **Vouches** as accountable social trust - not follower counts or hidden scores.
- **Live control proof** when a static QR is not enough (recent key control, in person).
- Clear **what the scan does not prove** (no legal ID, no “holder owns this object” from QR alone).

Phase A MVP will look minimal on purpose (create → scan → revoke). That is the honest floor, not the ceiling. See `docs/DEMOCRATIC_INFRASTRUCTURE.md` §2.

---

## What this is not

- A social network or “democratic social empire” in one app
- Government ID, KYC, or global “verified human” oracle
- Surveillance analytics on scans
- Cryptocurrency, NFT identity, or public-chain trust core
- Phone-number or email **required** to exist on the protocol
- A generic URL shortener or static link-in-bio product

Cryptography here means **signatures and published rules**, not coins.

---

## Product promise (phased)

**Live link / Humanity Card (Phase A–C):**

> Put a QR on something real or share a public ID; anyone who scans sees **current** signed status, honest limits, and revocation when you pull it back.

**Commons Pass (Phase D, on top of the card):**

> Run a community with mobile web passes, event check-in, and signed stamps - without ads, scan analytics, or platform lock-in.

V1 earns trust by being **honest about limits**:

- A static QR on a sticker is only a pointer; it does not prove the holder owns the card.
- A **current** scan shows card, QR, and trust status from the resolver.
- Vouches show social attestations under published rules.
- Live control shows recent key control when requested.
- Revocation and suspension are visible states, not silent failures.

See `docs/V1_PRODUCT_TRUST_MODEL.md`.

---

## V1 scope (summary)

**Phase A MVP** (shipped — M5 passed 2026-05-27):

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
- Documenting or shipping every conceivable QR use case on day one.

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
- **Reference resolver** (`humanity.llc`) stores public card, QR, status, vouch, and revocation data under a published **data-minimization policy** - no scan analytics by default.
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

- `docs/DEMOCRATIC_INFRASTRUCTURE.md`  -  **canonical direction** (infrastructure vs empire; why scan matters)
- `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`  -  federation, public launch, privacy boundaries
- `docs/SKEPTIC_FAQ.md`  -  objections (QR profile, blockchain, honeypot, etc.)

**Implementation (build step by step):**

- `docs/V1_0_ARCHITECTURE_ROADMAP.md`  -  **canonical build sequence** (M0–M10)
- `docs/FEATURE_MAP_MAINTENANCE.md`  -  public `/features/*` map vs product specs vs steward index
- `docs/STEWARD_DEVICE_ROADMAP.md`  -  steward shell, inbox, hosted tier, PWA (engineering index)

**V1 wedge and copy:**

- `docs/MERCH_LED_V1.md`  -  curiosity + belonging, phases
- `docs/MERCH_HEADLESS_COMMERCE.md`  -  **Shopify + Printify + headless storefront** (operator wiring)
- `docs/MERCH_FUNNEL_MVP.md`  -  scan → customize → checkout funnel
- `docs/FOUNDING_DROP_BRIEF.md`, `docs/LAUNCH_LANGUAGE_KIT.md`

**Trust and use cases:**

- `docs/V1_PRODUCT_TRUST_MODEL.md`
- `docs/REVOKE_AND_LIFECYCLE_V1.md`  -  **Revoke QR vs Disable card**, scan privacy, lifecycle roadmap
- `docs/PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md`  -  city-scale play with privacy and authority boundaries
- `docs/V1_USE_CASES.md`  -  primitive + phased examples (not all in v1 code)
- `docs/QR_DESIGN_SPACE.md`  -  expanded design space: blind spots, verbs, network grammar, open questions
- `docs/LIVE_OBJECT_ARCHITECTURE.md`  -  five-layer resolver map (object graph, verbs, streams, time, network)
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

**Public feature pages (site):**

- `/features-available-now.html`  -  hub (regenerate: `npm run site:generate-features`)
- `/help/`  -  ownership, device shell, links to feature pages

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
- `docs/FOUNDING_COHORT_PLAYBOOK.md`  -  optional early testers (non-gating)
- `docs/VISUAL_IDENTITY_PRINCIPLES.md`
- `docs/🧠 Organizing Documents/📜 Constitution.md`
- `docs/Technical Standards v1.0.md`

---

## Repo layout

| Path | Role |
|------|------|
| `site/` | Cloudflare Pages: landing, `/create/`, `/created/`, policy |
| `worker/` | Cloudflare Worker + D1: `hc/v1` resolver API |
| `docs/` | Protocol, roadmap, Commons Pass (later), trust model |

---

## Deploy

**Pages (static site):** output directory **`site`**.

```bash
npm run deploy
```

**Resolver (Worker)**  -  required for `/c/…` scan pages (not Pages):

```bash
npm run worker:dev          # local :8787
npm run worker:deploy       # bundles pass-card CSS/JS, then wrangler deploy
npm run worker:migrate:remote
npm run worker:test
```

After deploy, scan responses include `X-HC-Scan-UI: pass-v4` and HTML with `pass-scene` (flippable card).  
Scanner experience: `docs/SCANNER_EXPERIENCE.md` · Scan UI implementation: `docs/M3_SCAN_PAGE_UI.md` (card QR = same payload as `/created/`).  
Pages-only deploy updates landing/create headers; **scan UI will not change until the Worker deploys.**

Health: `GET /.well-known/hc/v1/health` · Create: `POST /.well-known/hc/v1/cards` · Public scan: `GET /c/{profile_id}?q={qr_id}`.

---

## Current status

| Milestone | State |
|-----------|--------|
| M1 Foundation | Health, D1 schema, signature harness |
| M2 Create card | API + `/create/` + `/created/` |
| M3 Scan | Pass-card UI at `/c/…` |
| M4 Revoke | Owner revoke + item-scoped QR |
| **M5 Stranger-tested launch** | **Passed** (2026-05-27) — three strangers completed create → scan → revoke unassisted |

**Phase A MVP is complete.** Commons Pass and federation are **not** required for that gate.

**Current focus:** `docs/MERCH_FUNNEL_MVP.md` — **merch-led MVP**: custom LIVE OBJECT QR on wearables (`/shop/customize/`), ephemeral state updates from `/created/`, Shopify → Printify fulfillment. Status plate / lost-item pilots are optional field tests, not the GTM wedge (`docs/MERCH_LED_V1.md`).

---

## Launch principle

Make the strongest **honest** claim:

> Scan this link and see **current** signed status - revocable, inspectable, with clear limits on what it does not prove.

Market proof is strangers using the loop without hand-holding, then a **second operator** on the same spec - not a laundry list of every QR idea on the homepage.
