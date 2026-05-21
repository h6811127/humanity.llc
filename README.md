# Humanity Commons

Humanity Commons is infrastructure for real people and democratic communities.

The product direction is **Commons Pass**: a mobile web membership pass for communities that want trust, belonging, events, credentials, and governance without surveillance platforms.

The Humanity Card remains the personal credential primitive: create a signed card, share it by QR, receive vouches from real people, prove live control when needed, and revoke old QR credentials.

This is not a social network, government ID system, KYC product, follower graph, crypto identity scheme, or surveillance analytics platform. It is a trust primitive designed to grow into member-governed digital infrastructure.

The near-term market wedge is **merch-led distribution**: physical artifacts as walking advertisements that resolve to an honest trust object. That pairs **proof of curiosity** (strangers scan and create) with **proof of belonging** (founding cohort, vouches, repeat wear). Community passes and organizer check-in follow once people already wear the QR. See `docs/MERCH_LED_V1.md`.

---

## Product Promise

Commons Pass:

> Create a community, invite members, issue mobile web passes, scan QR codes for current membership status, check people into events, and issue signed community stamps without phone numbers, ads, or scan analytics.

Humanity Card:

> Create a signed public Humanity Card, get vouched for by real people, prove live control when needed, and carry a QR that always resolves to current status.

V1 should be trustworthy because it is honest about what it proves:

- A static QR points to a card; it does not prove the holder owns the card.
- A current scan shows card, QR, and trust status.
- Vouches show social attestations under published rules.
- Live control proof shows recent control of the card key.
- Revocation and suspension are visible states, not silent failures.

See `docs/V1_PRODUCT_TRUST_MODEL.md` for the full trust model.

---

## V1 Scope

The Commons Pass first implementation slice is:

1. Community creation.
2. Member invitation.
3. Mobile web pass issuance.
4. HTTPS QR pass resolution.
5. Active/revoked/suspended pass status.
6. Event creation.
7. Organizer check-in.
8. Signed community stamp issuance.
9. Live control integration where scoped.

The Humanity Card foundational slice remains:

1. Signed public Humanity Card creation.
2. HTTPS QR resolution.
3. Trust-state UI separating card status, human trust status, artifact status, and live control proof.
4. Revoked, suspended, expired, and unknown status pages.
5. One personalized sticker/card artifact intent.
6. Shopify checkout handoff with artifact-intent metadata.
7. Paid Shopify webhook ingestion.
8. Printify Fulfillment Middleware order creation after payment.

Deferred from the first slice:

- Native checkout.
- Device-based unique-personhood proof.
- Public search or verified-human directory.
- Marketplace behavior.
- Scan analytics.
- Apparel or bags with personalized QR.
- Multi-merchant Printify OAuth.
- Blockchain/NFT ownership.

---

## Trust Labels

Public launch UI should use mechanism-revealing labels:

- `Registered`
- `Vouched Human`
- `Founding Human`
- `Early Builder`
- `Steward`
- `Revoked By Owner`
- `Suspended Under Public Rules`

The project should avoid broad public claims like legal identity, KYC, age verification, bot-proof identity, fraud-proof identity, background checks, or guaranteed unique humanity.

---

## Architecture Direction

V1 is designed around these boundaries:

- Browser/device generates and holds Humanity Card private keys.
- Humanity resolver stores public card, QR, status, vouch, badge, and revocation data.
- Shopify owns checkout, payment, tax, refunds, customer emails, and commerce order records.
- Printify handles print-on-demand fulfillment behind Humanity-controlled middleware.
- Printify and Shopify never receive private keys, verification secrets, vouch-private notes, private profile layers, or scan analytics.

The riskiest vertical slice is:

```text
Signed card -> HTTPS QR -> trust-state UI -> artifact intent -> unique printed-item QR -> Shopify paid webhook -> Printify order -> revoked item QR status
```

---

## Documentation Map

**V1 wedge (start here):**

- `docs/MERCH_LED_V1.md` — curiosity + belonging, build order, founding drop tiers
- `docs/FOUNDING_DROP_BRIEF.md` — Tier 0/1 launch checklist (fill brackets before print)
- `docs/LAUNCH_LANGUAGE_KIT.md` — Tier 0/1 storefront, scan, email, social copy

Core product and trust:

- `docs/COMMONS_PASS_PRODUCT_STRATEGY.md`
- `docs/COMMONS_PASS_V1_SPEC.md`
- `docs/COMMONS_PASS_TECHNICAL_ARCHITECTURE.md`
- `docs/COMMONS_PASS_SECURITY_AND_PRIVACY.md`
- `docs/COMMONS_PASS_DESIGN_AND_UX.md`
- `docs/V1_PRODUCT_TRUST_MODEL.md`
- `docs/V1_MARKET_AND_GROWTH_STRATEGY.md`
- `docs/V1_USE_CASES.md`
- `docs/features/Humanity Card v1.0.md`
- `docs/features/Human Verification v1.0.md`
- `docs/features/QR Public Profile v1.0.md`

Commerce and fulfillment:

- `docs/features/Storefront v1.0.md`
- `docs/features/Printify Fulfillment Middleware v1.0.md`

Implementation planning:

- `docs/V1_DECISION_LOCK.md`
- `docs/V1_IMPLEMENTATION_CONTRACTS.md`
- `docs/V1_IMPLEMENTATION_BACKLOG.md`
- `docs/V1_FLOW_AUDIT.md`
- `docs/V1_ASSUMPTION_REGISTER.md`
- `docs/V1_ADVERSARIAL_REVIEW.md`

Governance and enterprise direction:

- `docs/PUBLIC_LAUNCH_AND_GOVERNANCE_PLAN.md`
- `docs/COMMONS_ROADMAP.md`
- `docs/MOVEMENT_NARRATIVE.md`
- `docs/LAUNCH_LANGUAGE_KIT.md`
- `docs/FOUNDING_COHORT_PLAYBOOK.md`
- `docs/VISUAL_IDENTITY_PRINCIPLES.md`
- `docs/SKEPTIC_FAQ.md`
- `docs/🧠 Organizing Documents/📜 Constitution.md`
- `docs/Technical Standards v1.0.md`

---

## Landing page (Cloudflare Pages)

Static site in [`site/`](site/). Deploy with build output directory **`site`** (no build command). See [`site/README.md`](site/README.md).

```bash
npm run deploy
# or: npx wrangler pages deploy site --project-name=humanity-llc
```

**Cloudflare dashboard:** build output directory = `site`, deploy command = *(empty)*. Do not use `npx wrangler deploy` (Workers).

---

## Current Status

This repository is a planning and specification repo with a deployable landing page. The next practical work is to validate the riskiest provider assumptions and then build a narrow private alpha.

Recommended first steps (see `docs/MERCH_LED_V1.md`):

1. Lock founding drop tiers: open curiosity SKU vs closed belonging cohort; first artifact (sticker first).
2. Build Phase A digital slice: card, HTTPS QR, trust-state UI, vouch display, revocation pages.
3. Run founding cohort (10–25) until in-person scans and vouches work without overclaiming.
4. Ship Tier 0 curiosity drop (one story, one SKU); measure scan→create and stranger orders.
5. Ship Tier 1 personalized founding artifacts after Printify/Shopify spikes pass.
6. Defer Commons Pass (community console, check-in, stamps) until Phase A–C metrics hit.

---

## Launch Principle

Humanity Commons should make the strongest honest claim, not the strongest possible claim:

> This card is signed, current, revocable, socially vouched where shown, and able to prove live control when needed.

The first market proof is not technical. It is whether 25-100 people understand where they would use the card and invite others because the trust loop creates real value.

