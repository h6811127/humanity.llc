# V1 Decision Lock

**Status:** Pre-rebuild hardening artifact  
**Scope:** `docs/🧊 v1.0 Features` and `docs/Technical Standards v1.0.md`  
**Purpose:** Convert soft requirements into locked decisions, explicit deferrals, or owner decisions before implementation.

---

## Locked For V1

| Area | Decision | Source Specs | Implementation Consequence |
|---|---|---|---|
| Commerce stack | Use headless Shopify or Shopify-compatible headless checkout for cart, checkout, payment, tax, discounts, customer emails, refunds, and commerce order records. | Storefront, Printify Fulfillment Middleware | Do not build native checkout in the first rebuild. |
| Fulfillment stack | Use Printify only behind Printify Fulfillment Middleware. Users never browse, authenticate with, or check out on Printify. | Storefront, Printify Fulfillment Middleware | Build a server-side Printify adapter; never expose Printify tokens to clients. |
| Store UX | The Storefront is story-row first, not a faceted product grid. | Storefront | Build curated rows before search/filter infrastructure. |
| Launch catalog | Support approximately 50 product records, but only a small set of flagship personalized products in the first implementation slice. | Storefront | Seed product data should support breadth; implementation should validate one personalized sticker/card first. |
| Verification boundary | Buying merchandise or owning artifacts never grants or implies human verification. | Human Verification, Storefront | Product copy and scan pages must separate purchased artifacts from "verified human." |
| Verification paths | V1 verified-human status is earned through vouch threshold or ceremony credentials. Device proof is deferred until privacy/security review. | Human Verification, Technical Standards | Do not block rebuild on secure enclave / device proof integrations. |
| Vouch threshold | `verified_human` requires 3 active vouches by default. New verified humans wait 90 days before vouching. Voucher quota is 5 active vouches per year. | Human Verification | Encode as governance constants, not hardcoded magic values. |
| Baseline registration | Launch registration uses rate limits plus signed invite or waitlist controls. Proof-of-work is deferred until abuse pressure justifies it. | Human Verification | Avoid spending early implementation time on proof-of-work UX. |
| Government ID | Humanity v1.0 does not collect or store government ID. Ceremonies rely on steward attestations. | Human Verification | Do not design ID upload, review, or retention workflows. |
| QR print payload | Printed artifacts use HTTPS fallback URLs for phone-camera compatibility. Custom `hc://` remains canonical for app/native clients. | QR Public Profile, Technical Standards | Print artwork should encode `https://humanity.llc/c/{profile_id}?q={qr_id}`. |
| Printed item QR scope | Personalized physical items use unique item-scoped QR credentials by default. | QR Public Profile, Storefront, Printify Fulfillment Middleware | A stolen/lost sticker can be revoked without revoking every physical item tied to the same profile. |
| QR revocation | Revoked/expired/suspended printed QR codes resolve to explicit status pages, not silent failures. | QR Public Profile, Humanity Card, Technical Standards | Build status pages before physical artifact launch. |
| Bearer warning | A printed QR resolves to a Humanity Card but does not prove the person holding it is the card owner. | Humanity Card, QR Public Profile, Human Verification | Scan/card UI must include this warning before physical artifact launch. |
| Vouch freshness | Public card and scan views show latest accepted vouch recency when active accepted vouches exist. | Human Verification, Humanity Card | Treat recency as a trust signal, not proof of identity. |
| Fulfillment timing | Printify fulfillment order is created only after Shopify payment confirmation and internal artifact/order validation. | Storefront, Printify Fulfillment Middleware | Webhook handling and idempotency are core launch work. |
| Production approval | Printify orders use manual production approval by default unless a later operational policy explicitly enables auto-approval. | Printify Fulfillment Middleware | First implementation should keep a human/operator gate before production. |
| Scan analytics | Resolver and artifact scans collect no analytics by default. | QR Public Profile, Humanity Card, Technical Standards | Do not add analytics SDKs, scan counters, or location tracking to scan flows. |

---

## Explicitly Deferred

| Area | Deferred Item | Why Deferred | Revisit Trigger |
|---|---|---|---|
| Device proof | Secure-enclave / unique-personhood device proof. | High privacy/security complexity; not needed for first rebuild slice. | After vouching and ceremony model are working and reviewed. |
| Native checkout | Fully native Humanity checkout. | Payment, tax, refund, fraud, email, and support scope is too large for V1 rebuild. | If Shopify constraints block the core experience. |
| Multi-merchant Printify OAuth | Operator/merchant onboarding to their own Printify accounts. | One Humanity-controlled Printify shop is enough for launch. | Independent operators need fulfillment autonomy. |
| Transfer UI | Artifact transfer functionality. | Legal/governance semantics are unresolved. | Transfer policy ratified. |
| Public search/discovery | Public profile or verified-human directory. | Increases harassment, privacy, moderation, and scraping risk. | Separate discovery/privacy spec. |
| Marketplace | Third-party seller marketplace. | Distracts from proof objects and first-party artifacts. | Storefront operations are stable. |
| Blockchain/NFT ownership | Tokenized artifact ownership. | Conflicts with provenance-not-speculation positioning. | Separate governance/legal decision. |
| Scan analytics | Any scan logging or analytics. | Violates trust unless consent model is explicit. | Governance-approved consent model. |
| Apparel/bags | Apparel and bags for personalized QR artifacts. | Print area and QR scan reliability must be tested. | Template QA passes. |

---

## Requires Owner Decision Before Build

| Decision | Options | Recommendation | Why It Matters |
|---|---|---|---|
| First artifact product | Sticker, flat card, or both. | Build one sticker and one flat card template. | Determines Printify templates, QA fixtures, and first purchase path. |
| Shopify implementation style | Hydrogen, custom headless, or theme checkout hybrid. | Custom storefront with Shopify checkout handoff unless Hydrogen accelerates. | Affects routing, cart metadata, and order-webhook integration. |
| Founding badges | Which founding badges exist and who receives them. | Limit to `founding_human` and `early_builder` with public issuance policy. | Badges can become status politics if vague. |
| Governance bootstrap | Who can sign suspension, badge, and template-approval records before formal governance exists. | Use named bootstrap operator keys with public sunset criteria. | V1 needs keys before the full collective exists. |
| Revenue/margin policy | Whether public before launch and how detailed. | Publish simple margin/revenue-use policy before taking orders. | Store revenue touches trust and governance. |
| Ceremony readiness | Whether ceremony verification is launch-critical or staged after vouching. | Model now; launch after vouching unless there is a real event. | Ceremony ops are social, not just technical. |

---

## Known Spec Corrections Applied

- Locked headless Shopify as the V1 commerce backend.
- Locked Printify behind Printify Fulfillment Middleware.
- Replaced old generic fulfillment-middleware wording with Printify Fulfillment Middleware where it affected implementation.
- Replaced proof-of-work as default registration with invite/waitlist/rate-limit controls.
- Deferred device proof from the first rebuild slice.
- Locked printed QR codes to HTTPS fallback.
- Removed the option to print mutable verification state directly onto artifacts in V1.

---

## Non-Negotiables

1. Private keys never leave user-controlled device/export contexts.
2. Shopify and Printify never receive verification secrets, private profile data, vouch-private notes, or scanner analytics.
3. Buying something never makes someone verified.
4. Physical artifact status is separate from card activity and human verification.
5. Holding a printed QR artifact does not prove identity or card ownership.
6. Revoked printed QR codes still resolve, but resolve to revoked status.
7. Revoking one printed-item QR does not revoke sibling printed-item QR credentials unless the card or source QR is revoked.
8. Every paid Printify order is idempotent and traceable to a Shopify paid order plus Humanity artifact intent.
