# humanity.llc · Humanity Commons

**Live links:** a physical object or public ID points at a URL; a scan returns **current state** from the resolver (active, revoked, suspended, unknown), not a frozen page.

```text
object or ID  →  scan (HTTPS QR)  →  live signed state
```

**humanity.llc** is the reference operator and product surface for that primitive. **Humanity Commons** is the open protocol and democratic-infrastructure project around it: portable trust you can inspect, revoke, and export—without surveillance platforms, legal-ID pipelines, or one company owning “who counts.”

You can aim to be **the link company** in that specific sense: not short redirects or link-in-bio, but **resolver-backed links whose meaning can change** (membership, trust, access, public claims, object status). Commons Pass (community membership, events, check-in, stamps) and federation sit on the same grammar once the scan loop is proven. See `docs/DEMOCRATIC_INFRASTRUCTURE.md` and `docs/V1_0_ARCHITECTURE_ROADMAP.md`.

Physical **merch** is distribution (curiosity → create), not the product definition. See `docs/MERCH_LED_V1.md`.

**Architecture:** open standards and **federated resolvers**—not a platform empire, not an invite-only gate, not blockchain identity. See `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`.

---

## What ships first vs what Commons adds

| Layer | What it is | Status |
|-------|------------|--------|
| **Live QR primitive** | QR/NFC URL → resolver → honest current status + limits copy | **Building now** (create live; public scan UI next) |
| **Humanity Card** | Signed public identity document (`profile_id`, handle, manifesto, keys on device) | Phase A MVP |
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
- **Vouches** as accountable social trust—not follower counts or hidden scores.
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
- `docs/M3_1_SCAN_PAGE_DECISIONS.md` — M3.1 scan HTML + `/created/` URL/QR decisions

**V1 wedge and copy:**

- `docs/MERCH_LED_V1.md` — curiosity + belonging, phases
- `docs/FOUNDING_DROP_BRIEF.md`, `docs/LAUNCH_LANGUAGE_KIT.md`

**Trust and use cases:**

- `docs/V1_PRODUCT_TRUST_MODEL.md`
- `docs/V1_USE_CASES.md` — primitive + phased examples (not all in v1 code)
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

## Repo layout

| Path | Role |
|------|------|
| `site/` | Cloudflare Pages: landing, `/create/`, `/created/`, policy |
| `worker/` | Cloudflare Worker + D1: `hc/v1` resolver API |
| `docs/` | Protocol, roadmap, Commons Pass (later), trust model |

---

## Deploy

**Production via git push to `main`:**

| Component | How it ships |
|-----------|----------------|
| **Pages** (`site/`) | Cloudflare Pages Git integration (output dir `site`) — see root `wrangler.toml` |
| **Worker** (`worker/`) | GitHub Action [`.github/workflows/deploy-production.yml`](.github/workflows/deploy-production.yml) — tests, D1 migrate, `wrangler deploy` |

One-time: add GitHub Actions secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Full checklist: **`docs/DEPLOY_PRODUCTION.md`**.

Pushing to a feature branch (e.g. `m3_scan`) updates nothing in prod until merged to **`main`**.

**Manual / local:**

```bash
npm run deploy                  # Pages only (CLI)
npm run worker:test
npm run worker:migrate:remote   # needs wrangler auth
npm run worker:deploy
npm run worker:dev              # local :8787
```

Health: `GET /.well-known/hc/v1/health` · Create: `POST /.well-known/hc/v1/cards` · Scan: `GET /c/{profile_id}?q={qr_id}`.

---

## Current status

| Milestone | State |
|-----------|--------|
| M1 Foundation | Health, D1 schema, signature harness |
| M2 Create card | API + `/create/` + `/created/` |
| **M3 Scan** | **3.1 done** — HTML at `/c/…`; 3.2–3.7 next |
| M4 Revoke | After scan |
| M5 Stranger-tested launch | After revoke |

**MVP** = Phase A through roadmap step **5.3** (honest create → scan → revoke). Commons Pass and federation are **not** required for that gate.

---

## Launch principle

Make the strongest **honest** claim:

> Scan this link and see **current** signed status—revocable, inspectable, with clear limits on what it does not prove.

Market proof is strangers using the loop without hand-holding, then a **second operator** on the same spec—not a laundry list of every QR idea on the homepage.
