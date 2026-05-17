# Humanity Commons

Humanity Commons is a signed, revocable public card for real people and democratic communities.

The v1 product is intentionally small: create a Humanity Card, share it by QR, receive vouches from real people, prove live control when needed, revoke old QR credentials, and carry the card into the physical world through stickers or cards.

This is not a social network, government ID system, KYC product, follower graph, crypto identity scheme, or surveillance analytics platform. It is a trust primitive designed to grow into member-governed digital infrastructure.

---

## Product Promise

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

The first implementation slice is:

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

Core product and trust:

- `docs/V1_PRODUCT_TRUST_MODEL.md`
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
- `docs/🧠 Organizing Documents/📜 Constitution.md`
- `docs/Technical Standards v1.0.md`

---

## Current Status

This repository is currently a planning and specification repo. The next practical work is to validate the riskiest provider assumptions and then build a narrow private alpha.

Recommended first steps:

1. Lock first artifact product, Shopify implementation style, bootstrap governance keys, launch labels, support/revenue policy, and live control proof scope.
2. Run the Shopify artifact metadata spike.
3. Run the Printify unique QR sample spike.
4. Scaffold schemas, state machines, signatures, and fixtures from `docs/V1_IMPLEMENTATION_CONTRACTS.md`.
5. Build the card, QR, revocation, and trust-state UI before broad storefront work.

---

## Launch Principle

Humanity Commons should make the strongest honest claim, not the strongest possible claim:

> This card is signed, current, revocable, socially vouched where shown, and able to prove live control when needed.

