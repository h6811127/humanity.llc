**Version:** 1.0
**Status:** Draft for Collective Ratification
**Constitution Reference:** Humanity Commons Constitution (Articles I, II, III, VI)
**Dependencies:** Humanity Card v1.0, Printify Fulfillment Middleware v1.0
**Commerce Dependency:** Headless Shopify
**Fulfillment Dependency:** Printify

---

## 1. Executive Summary

Storefront v1.0 defines the commerce experience for Humanity Commons. The storefront is not a generic product grid and it is not a Printify storefront. It is a story-led shop on `humanity.llc` where people buy physical artifacts connected to the Humanity Commons idea: wearable signals, printed QR cards, stickers, bags, posters, gathering kits, and limited drops.

The storefront must feel like part of the commons, not like a merch plugin:

- Humanity controls the storefront UI, product story, artifact meaning, and personalization.
- Shopify provides mature commerce primitives: cart, checkout, payments, taxes, discounts, order records, customer notifications, refunds, and admin operations.
- Printify provides print-on-demand fulfillment through Printify Fulfillment Middleware.
- Users MUST NOT browse or interact with Printify directly.
- Users MAY pass through Shopify checkout if technically required, but the experience MUST be branded and framed as Humanity checkout.

The storefront MUST be shoppable by **story rows**, not by search/filter/category grids. Version 1.0 targets approximately 50 total products, organized as curated narrative rows.

---

## 2. Product Positioning

The Humanity Store is not primarily a merchandise store. It is the physical distribution layer for public proof, affiliation, and ritual.

The store sells:

- General Humanity Commons objects.
- Personalized Humanity Card / QR artifacts.
- Limited drops tied to founding moments, verification cohorts, gatherings, or governance milestones.

The store MUST NOT imply that buying an item makes someone verified. Verification status comes from Humanity Card and Human Verification systems, not commerce.

---

## 3. Commerce Architecture Decision

### 3.1 V1 Decision

Storefront v1.0 MUST use **headless Shopify** or a Shopify-compatible headless checkout implementation:

```text
humanity.llc Storefront UI
  -> Shopify cart / checkout / payment / order
  -> Humanity order webhook
  -> Printify Fulfillment Middleware
  -> Printify fulfillment
```

### 3.2 Why Shopify

Shopify MUST handle:

- Cart.
- Checkout.
- Payments.
- Tax calculation.
- Discount codes.
- Customer order emails.
- Refunds.
- Basic order administration.
- Fraud/risk tooling.
- Commerce reporting.

Humanity MUST handle:

- Storefront story-row UI.
- Product narrative and meaning.
- Product curation.
- Personalized QR/artifact generation.
- Verification-aware product eligibility.
- Print artifact rendering.
- Printify fulfillment orchestration.

### 3.3 Why Not Native Checkout First

Fully native checkout would require Humanity to build and maintain:

- Payment integration.
- Tax calculation.
- Order admin.
- Refund workflow.
- Discount/promo logic.
- Customer emails.
- Cart state.
- Fraud handling.
- Support tooling.

That is possible but would distract from the harder and more unique work: identity, cards, verification, and physical-digital proof objects.

---

## 4. User Stories

### 4.1 Shopper

| ID | Story |
|---|---|
| SF-US-01 | As a visitor, I want to browse the store through story rows instead of a generic product grid. |
| SF-US-02 | As a visitor, I want to understand what each product means in the Humanity Commons system. |
| SF-US-03 | As a shopper, I want to buy general Humanity merchandise without creating a card. |
| SF-US-04 | As a card owner, I want to personalize eligible products with my Humanity Card QR or artifact. |
| SF-US-05 | As a shopper, I want checkout to feel native to humanity.llc and not send me to Printify. |
| SF-US-06 | As a shopper, I want clear order status, shipping updates, and support paths. |
| SF-US-07 | As a shopper, I want to know if a product is personalized, limited, or purely decorative. |

### 4.2 Card Owner

| ID | Story |
|---|---|
| SF-US-08 | As a card owner, I want products that reflect my verification status without letting commerce fake verification. |
| SF-US-09 | As a card owner, I want to preview personalized products before ordering. |
| SF-US-10 | As a card owner, I want to understand whether a personalized product contains my QR credential. |
| SF-US-11 | As a card owner, I want old revoked QR artifacts to be clearly marked before I reorder. |

### 4.3 Operator

| ID | Story |
|---|---|
| SF-US-12 | As an operator, I want approximately 50 curated products organized into story rows. |
| SF-US-13 | As an operator, I want Shopify product/order state linked to Humanity print order state. |
| SF-US-14 | As an operator, I want Printify hidden behind middleware. |
| SF-US-15 | As an operator, I want failed personalization or fulfillment to block checkout before money is captured when possible. |

---

## 5. Storefront Layout

### 5.1 Storefront Model

The storefront is composed of story rows. Each row is a curated horizontal product narrative with copy, artifacts, and calls to action.

Rows are not final copy in this specification. The layout MUST support configurable row names and product membership.

Suggested row placeholders:

| Row Key | Purpose |
|---|---|
| `row_hero_drop` | Launch/founding collection or featured drop. |
| `row_wear` | Apparel and wearable signals. |
| `row_stick` | Stickers, QR labels, public markers. |
| `row_carry` | Bags, cards, notebooks, daily-carry items. |
| `row_gather` | Event, meetup, table, and ceremony kits. |
| `row_limited` | Numbered or time-limited drops. |

### 5.2 Page Structure

The store landing page MUST contain:

1. Store hero: short thesis, visual artifact, CTA.
2. Featured story row.
3. Personalized artifact explainer.
4. 4-6 story rows.
5. Limited drop / founding collection section.
6. Footer with constitution, governance, shipping, returns, privacy.

### 5.3 Product Card

Product cards MUST include:

- Product image.
- Short title.
- One-line meaning.
- Price.
- Personalization indicator:
  - `General`
  - `Personalized QR`
  - `Limited Drop`
- Availability status.
- Quick CTA.

Product cards MUST NOT include dense filter metadata, SKU codes, or Printify provider details.

### 5.4 Product Detail Page

Product detail pages MUST include:

- Story.
- Product images.
- Product options.
- Personalization options if applicable.
- Price.
- Shipping estimate entry point.
- Return/cancellation note.
- Artifact persistence warning if QR is printed.
- CTA to add to cart or personalize.

### 5.5 Search and Filters

V1 MUST NOT lead with a search/filter interface. If search exists, it MUST be secondary.

The primary discovery pattern is:

```text
Story row -> Product detail -> Personalization/proof -> Cart/checkout
```

---

## 6. Product Types

### 6.1 Product Classes

| Class | Description | Personalized |
|---|---|---|
| General merch | Humanity-branded objects with no buyer-specific QR. | No |
| Card artifact | Physical representation of a Humanity Card. | Yes |
| QR sticker | Sticker containing card or artifact QR. | Yes |
| Apparel | Shirts, hoodies, hats. | Mixed |
| Carry items | Bags, notebooks, pouches, cards. | Mixed |
| Gathering kit | Event or ceremony pack. | Mixed |
| Limited drop | Product tied to a moment. | Mixed |

### 6.2 Launch Mix

V1 MUST support a mixed catalog:

- Some products are general Humanity merch.
- Some products are personalized with a user's Humanity Card QR.
- Some products are limited drops or editions.

This avoids forcing every customer to create a card while still making the store part of the Humanity identity system.

### 6.3 Product Count

V1 target:

- Approximately 50 total products.
- 5-8 story rows.
- 4-10 products per row.
- No more than 3 flagship personalized product types at launch unless operations are proven.

---

## 7. Functional Requirements

### 7.1 Storefront UX

| ID | Requirement | Priority |
|---|---|---|
| SF-FR-01 | Storefront MUST be hosted under `humanity.llc`. | P0 |
| SF-FR-02 | Storefront MUST use story rows as the primary browse model. | P0 |
| SF-FR-03 | Storefront MUST NOT require users to visit Printify. | P0 |
| SF-FR-04 | Storefront MUST keep Shopify visually subordinate to Humanity branding wherever Shopify's checkout constraints allow. | P0 |
| SF-FR-05 | Storefront MUST distinguish general, personalized, and limited products. | P0 |
| SF-FR-06 | Storefront MUST show product meaning, not only product specifications. | P0 |

### 7.2 Shopify Integration

| ID | Requirement | Priority |
|---|---|---|
| SF-FR-07 | Shopify MUST be the system of record for commerce checkout and payment in v1.0. | P0 |
| SF-FR-08 | Shopify product IDs and variant IDs MUST map to Humanity product template IDs. | P0 |
| SF-FR-09 | Shopify orders MUST map to Humanity print orders. | P0 |
| SF-FR-10 | Shopify webhooks MUST be consumed for order creation, payment, cancellation, refund, and fulfillment events. | P0 |
| SF-FR-11 | Shopify checkout MUST carry metadata needed to link cart lines to artifact intents. | P0 |
| SF-FR-12 | Shopify admin MUST NOT be the canonical store for identity data or print artwork. | P0 |

### 7.3 Personalization

| ID | Requirement | Priority |
|---|---|---|
| SF-FR-13 | Personalized products MUST be generated from active Humanity Card or QR data. | P0 |
| SF-FR-14 | User MUST preview personalized products before checkout. | P0 |
| SF-FR-15 | User MUST acknowledge printed QR persistence before buying QR-bearing products. | P0 |
| SF-FR-16 | Storefront MUST block personalization with revoked, suspended, or expired QR credentials. | P0 |
| SF-FR-17 | Personalization state MUST be represented as an artifact intent before checkout. | P0 |

### 7.4 Cart and Checkout

| ID | Requirement | Priority |
|---|---|---|
| SF-FR-18 | Storefront MUST support adding general and personalized products to cart. | P0 |
| SF-FR-19 | Checkout MUST happen through Shopify or Shopify-compatible headless checkout. | P0 |
| SF-FR-20 | User MUST not be sent to Printify checkout. | P0 |
| SF-FR-21 | Payment success MUST trigger internal order/artifact processing. | P0 |
| SF-FR-22 | Payment failure MUST not create Printify fulfillment orders. | P0 |
| SF-FR-23 | Order confirmation page MUST live on or return to humanity.llc. | P0 |

### 7.5 Fulfillment

| ID | Requirement | Priority |
|---|---|---|
| SF-FR-24 | Printify fulfillment MUST be mediated through Printify Fulfillment Middleware. | P0 |
| SF-FR-25 | Printify order IDs MUST be stored as provider references, not public canonical IDs. | P0 |
| SF-FR-26 | Fulfillment errors MUST sync back to Humanity order status. | P0 |
| SF-FR-27 | Tracking links MUST be shown when available. | P0 |

---

## 8. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| SF-NFR-01 | Store landing page LCP | < 2.5s p75 |
| SF-NFR-02 | Product detail LCP | < 2.5s p75 |
| SF-NFR-03 | Personalization preview generation | < 5s p95 |
| SF-NFR-04 | Shopify checkout handoff | < 2s p95 |
| SF-NFR-05 | Product count | ~50 total at V1 |
| SF-NFR-06 | Accessibility | WCAG 2.2 AA |
| SF-NFR-07 | Mobile-first | Required |
| SF-NFR-08 | Print provider outage isolation | Store can browse even if fulfillment is degraded |

---

## 9. Architecture

```text
Humanity Storefront UI
  |
  | product rows, product pages, personalization
  v
Humanity Storefront API
  |
  | artifact intent, Shopify cart metadata
  v
Shopify
  |
  | checkout, payment, order, tax, refund
  v
Humanity Commerce Webhooks
  |
  | paid order -> fulfillment order
  v
Printify Fulfillment Middleware
  |
  | print files, uploads, orders, fulfillment status
  v
Printify
```

### 9.1 Responsibility Matrix

| Responsibility | Humanity | Shopify | Printify |
|---|---|---|---|
| Story-row storefront | Yes | No | No |
| Product narrative | Yes | No | No |
| Product catalog display | Yes | Source data optional | No |
| Cart | Optional UI | Yes backend | No |
| Checkout/payment | Branded handoff | Yes | No |
| Taxes/discounts/refunds | No or minimal | Yes | No |
| QR personalization | Yes | No | No |
| Print files | Yes | No | Receives files |
| Fulfillment | Orchestrates | No | Yes |
| Tracking | Displays | Order reference | Source data |

---

## 10. User Flows

### 10.1 General Product Purchase

```text
START
  |
User opens Store
  |
User browses story rows
  |
User opens general product
  |
User selects variant and quantity
  |
User adds to cart
  |
User checks out through Shopify-powered checkout
  |
Payment succeeds
  |
Humanity receives order webhook
  |
Humanity routes fulfillment through Printify Fulfillment Middleware
  |
User sees order status on humanity.llc
  |
END
```

### 10.2 Personalized QR Product Purchase

```text
START
  |
Card owner opens personalized product
  |
System verifies active card/QR status
  |
System generates artifact intent and preview
  |
User approves proof and persistence warning
  |
Artifact intent attaches to cart line
  |
User checks out
  |
Payment succeeds
  |
Humanity creates fulfillment order
  |
Printify fulfills item
  |
END
```

### 10.3 Limited Drop Purchase

```text
START
  |
User opens limited story row
  |
System shows availability
  |
User selects product
  |
User completes checkout
  |
Fulfillment begins
  |
END
```

---

## 11. Data Models

### 11.1 Storefront Row

| Field | Type | Required | Description |
|---|---|---|---|
| `row_id` | string | Yes | Stable row ID. |
| `title` | string | Yes | Row display title. |
| `subtitle` | string | No | Supporting copy. |
| `story` | string | No | Longer narrative. |
| `product_handles` | array | Yes | Ordered product references. |
| `sort_order` | integer | Yes | Display order. |
| `status` | enum | Yes | `draft`, `published`, `hidden`. |

### 11.2 Humanity Product

| Field | Type | Required | Description |
|---|---|---|---|
| `product_id` | string | Yes | Humanity product ID. |
| `shopify_product_id` | string | Yes | Shopify product reference. |
| `title` | string | Yes | Product title. |
| `story` | string | Yes | Product meaning/story. |
| `product_class` | enum | Yes | `general`, `personalized`, `limited_drop`. |
| `requires_card` | boolean | Yes | Whether Humanity Card is required. |
| `supports_personalization` | boolean | Yes | Whether product can include QR/card data. |
| `fulfillment_provider` | enum | Yes | `printify`, `manual`, `digital`, `none`. |

### 11.3 Artifact Intent

| Field | Type | Required | Description |
|---|---|---|---|
| `artifact_intent_id` | string | Yes | Pre-checkout artifact intent. |
| `profile_id` | string | No | Card owner for personalized products. |
| `qr_id` | string | No | QR credential used. |
| `product_id` | string | Yes | Humanity product. |
| `shopify_variant_id` | string | Yes | Shopify variant. |
| `preview_url` | string | No | Proof preview. |
| `status` | enum | Yes | `draft`, `proofed`, `attached_to_cart`, `expired`, `converted`. |

### 11.4 Commerce Order Link

| Field | Type | Required | Description |
|---|---|---|---|
| `commerce_order_id` | string | Yes | Internal link ID. |
| `shopify_order_id` | string | Yes | Shopify order ID. |
| `shopify_checkout_id` | string | No | Checkout reference. |
| `profile_id` | string | No | Buyer/card owner if linked. |
| `artifact_intent_ids` | array | No | Artifact intents included. |
| `print_order_ids` | array | No | Fulfillment orders. |
| `status` | enum | Yes | `paid`, `processing`, `fulfilled`, `partially_fulfilled`, `canceled`, `refunded`, `failed`. |

---

## 12. Privacy Requirements

| ID | Requirement |
|---|---|
| SF-SEC-01 | Storefront MUST NOT expose Printify provider details to users unless needed for support/legal disclosures. |
| SF-SEC-02 | Shipping address data MUST live in Shopify and/or protected Humanity order records, not public card records. |
| SF-SEC-03 | General merch purchases MUST NOT require Humanity Card creation. |
| SF-SEC-04 | Personalized product purchase MUST not leak private key or private profile layer data. |
| SF-SEC-05 | Shopify webhooks MUST be authenticated. |
| SF-SEC-06 | Checkout metadata MUST not include secrets. |

---

## 13. Governance Requirements

| ID | Requirement |
|---|---|
| SF-GOV-01 | Store revenue policy MUST be public before launch. |
| SF-GOV-02 | Limited drops using governance or verification language MUST be approved. |
| SF-GOV-03 | Product copy MUST not imply paid verification. |
| SF-GOV-04 | Products using Humanity marks MUST follow approved templates. |

---

## 14. Acceptance Criteria

### 14.1 Storefront Complete

- Store landing page uses story rows.
- Approximately 50 products can be represented.
- Store supports general and personalized products.
- Product detail pages disclose personalization behavior.
- Users never browse or check out on Printify.
- Shopify checkout works for payment.
- Shopify order webhooks create internal Humanity order links.
- Paid orders route to Printify Fulfillment Middleware when fulfillment is required.
- Order status page is available from humanity.llc.

### 14.2 Personalization Complete

- Active card owner can generate preview for QR-bearing product.
- Revoked/suspended/expired QR blocks purchase.
- User approves proof before checkout.
- Artifact intent survives checkout handoff.

---

## 15. Out of Scope for v1.0

- Traditional faceted search/filter storefront.
- Marketplace for third-party sellers.
- Arbitrary user-uploaded designs.
- Native payment/tax/refund stack without Shopify.
- Full NFT/blockchain ownership.
- Scan analytics for physical items.
- More than approximately 50 launch products.

---

## 16. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Store feels like generic merch | Medium | High | Story rows, artifact meaning, and card personalization. |
| Shopify breaks brand continuity | Medium | Medium | Use headless storefront and branded checkout where possible. |
| Personalized product flow fails after checkout | Medium | High | Artifact intent validation before checkout and webhook reconciliation. |
| Paid merch appears to buy status | Medium | High | Strict copy and product eligibility rules. |
| Operational complexity grows too quickly | Medium | Medium | Limit launch catalog and flagship personalized items. |

---

## 17. Glossary

| Term | Definition |
|---|---|
| **Story Row** | Curated horizontal product section organized around meaning rather than filters. |
| **Humanity Product** | Product record controlled by Humanity and mapped to Shopify/Printify records. |
| **Artifact Intent** | Pre-checkout record representing a personalized artifact. |
| **Headless Shopify** | Shopify used for commerce backend while Humanity controls frontend UI. |
| **General Merch** | Product not tied to a specific Humanity Card. |
| **Personalized Product** | Product containing buyer/card-specific QR or card data. |
| **Limited Drop** | Editioned product collection tied to a moment or cohort. |

---

## 18. Document Approval

| Role | Signature | Date |
|---|---|---|
| Product Lead | _____________ | _____ |
| Technical Architect | _____________ | _____ |
| Commerce/Ops Lead | _____________ | _____ |
| Governance Lead | _____________ | _____ |

---

**Next Steps After Ratification:**

1. Finalize actual story row names and launch collection.
2. Choose Shopify setup: Hydrogen, custom headless, or themed checkout hybrid.
3. Define product template mappings to Printify Fulfillment Middleware.
4. Build first end-to-end purchase path for one personalized sticker/card.
