**Version:** 1.0
**Status:** Draft for Collective Ratification
**Constitution Reference:** Humanity Commons Constitution (Articles I, II, III, VI)
**Dependencies:** Humanity Card v1.0, Storefront v1.0, QR Public Profile v1.0
**Commerce Dependency:** Headless Shopify
**Fulfillment Dependency:** Printify Public API

---

## 1. Executive Summary

Printify Fulfillment Middleware v1.0 defines the Humanity-controlled service that connects Humanity Cards and Storefront orders to physical print-on-demand artifacts through Printify.

This middleware exists because Humanity Cards are not only web pages. The public proof object must be printable, wearable, scannable, and socially visible. Stickers, cards, shirts, bags, posters, and other physical artifacts are part of the distribution loop.

The middleware must protect the integrity of the identity system:

- Humanity owns QR generation, card signing, artifact approval, order intent, and privacy rules.
- Shopify owns customer-facing checkout, payment, tax, discount, refund, and base commerce order records.
- Printify provides catalog, media uploads, product templates, order submission, fulfillment, shipping, and tracking.
- Printify must never receive private keys, verification secrets, vouch-private notes, or scanner analytics.
- Shipping data must be treated as order PII, separated from public identity data.

The middleware is therefore an adapter, policy engine, rendering pipeline, and fulfillment state machine between Humanity, Shopify orders, and Printify.

---

## 2. Integration Goals

| Goal | Description |
|---|---|
| Physical virality | Let card owners order beautiful QR artifacts that make Humanity visible in the real world. |
| Identity integrity | Ensure every printed QR points to a signed, revocable Humanity Card. |
| Item-level revocation | Ensure each personalized physical item can be revoked without revoking every other item owned by the same card owner. |
| Privacy preservation | Share only fulfillment-required data with Printify. |
| Provider abstraction | Keep Humanity product, order, and artifact concepts independent from Printify internals. |
| Operational safety | Avoid accidental auto-production, duplicate orders, invalid artwork, and uncontrolled publishing. |
| Auditability | Record enough internal state to debug orders and fulfill legal/support obligations. |

---

## 3. Commerce and Fulfillment Boundary

### 3.1 Customer-Facing Commerce

Customers MUST interact with `humanity.llc` and Shopify-powered checkout, not Printify.

Shopify handles:

- Cart and checkout.
- Payment authorization/capture.
- Taxes.
- Discounts.
- Customer order emails.
- Refunds.
- Base order administration.

Humanity handles:

- Storefront story rows.
- Product meaning and artifact policy.
- Personalized QR/card preview.
- Artifact intent creation.
- Print-ready artwork generation.
- Fulfillment orchestration.
- Order status page on `humanity.llc`.

Printify handles:

- Print catalog.
- Media uploads.
- Product/variant fulfillment.
- Shipping and tracking.
- Print production status.

### 3.2 Order Chain

```text
Storefront product selection
  -> Artifact intent / preview / proof approval
  -> Shopify cart and checkout
  -> Shopify paid order webhook
  -> Humanity commerce order link
  -> Printify Fulfillment Middleware fulfillment order
  -> Printify production and shipment
  -> Humanity order status page
```

Printify MUST NOT be presented as the storefront, cart, checkout, or customer account system.

---

## 4. Printify API Surface Used

The middleware integrates with the following Printify resources:

| Resource | Purpose |
|---|---|
| Shops | Determine the Printify shop ID used for products and orders. |
| Catalog | Discover approved blueprints, print providers, variants, print areas, and shipping profiles. |
| Uploads | Upload generated QR artwork and design assets to Printify media library. |
| Products | Create or manage reusable Humanity product templates when appropriate. |
| Orders | Submit orders, calculate shipping, send orders to production, cancel eligible orders. |
| Events | Inspect event history if needed for reconciliation. |
| Webhooks | Receive asynchronous updates about products, publishing, and order state. |

Key Printify endpoints referenced by this specification:

| Printify Endpoint | Method | Middleware Usage |
|---|---|---|
| `/v1/shops.json` | GET | Discover available shops. |
| `/v1/catalog/blueprints.json` | GET | List catalog blueprints. |
| `/v1/catalog/blueprints/{blueprint_id}.json` | GET | Inspect a selected blueprint. |
| `/v1/catalog/blueprints/{blueprint_id}/print_providers.json` | GET | List print providers for a blueprint. |
| `/v1/catalog/blueprints/{blueprint_id}/print_providers/{print_provider_id}/variants.json` | GET | List variants and print placeholders. |
| `/v1/catalog/blueprints/{blueprint_id}/print_providers/{print_provider_id}/shipping.json` | GET | Inspect shipping profiles. |
| `/v1/uploads/images.json` | POST | Upload QR/artwork PNGs. |
| `/v1/uploads/{image_id}.json` | GET | Inspect uploaded image. |
| `/v1/uploads/{image_id}/archive.json` | POST | Archive unused/expired uploads when safe. |
| `/v1/shops/{shop_id}/products.json` | POST | Create product template or product-per-artifact if needed. |
| `/v1/shops/{shop_id}/products/{product_id}.json` | GET/PUT/DELETE | Retrieve, update, or delete managed products. |
| `/v1/shops/{shop_id}/orders/shipping.json` | POST | Calculate shipping quote. |
| `/v1/shops/{shop_id}/orders.json` | POST | Submit standard order. |
| `/v1/shops/{shop_id}/orders/express.json` | POST | Submit Printify Express order when eligible. |
| `/v1/shops/{shop_id}/orders/{order_id}.json` | GET | Retrieve order details. |
| `/v1/shops/{shop_id}/orders/{order_id}/send_to_production.json` | POST | Send manually approved order to production. |
| `/v1/shops/{shop_id}/orders/{order_id}/cancel.json` | POST | Cancel eligible order. |
| `/v1/shops/{shop_id}/webhooks.json` | GET/POST | List and create webhooks. |

Printify rate limits to respect:

- Global API limit: 600 requests per minute.
- Catalog API limit: 100 requests per minute per integration/account.
- Product publishing endpoint limit: 200 requests per 30 minutes.
- 429 responses must trigger retry/backoff rather than user-visible duplicate order creation.

---

## 5. Authentication Model

Printify supports:

- Personal access token for a single Printify merchant account.
- OAuth 2.0 for platforms managing multiple merchant accounts.

### 5.1 v1.0 Decision

Humanity v1.0 MUST use a server-side Printify credential stored only in the middleware environment. The client MUST never receive a Printify token.

For the first public launch, Humanity MUST use a Personal Access Token owned by the Humanity-controlled Printify merchant account. OAuth 2.0 is explicitly deferred until independent operators or merchants need to connect their own Printify accounts.

### 5.2 Required Access Scopes

Minimum scopes for a single Humanity-managed Printify shop:

| Scope | Needed For |
|---|---|
| `catalog.read` | Read blueprints, print providers, variants, shipping data. |
| `products.read` | Inspect managed products. |
| `products.write` | Create/update product templates if used. |
| `orders.read` | Reconcile order state. |
| `orders.write` | Submit/cancel/send orders to production. |
| `uploads.read` | Inspect uploaded QR/design assets. |
| `uploads.write` | Upload generated artwork. |
| `webhooks.read` | Inspect webhook registrations. |
| `webhooks.write` | Register/update webhook callbacks. |

---

## 6. User Stories

### 6.1 Card Owner

| ID | Story |
|---|---|
| PM-US-01 | As a card owner, I want to order stickers/cards/apparel with my Humanity QR code. |
| PM-US-02 | As a card owner, I want to see a proof before anything is sent to production. |
| PM-US-03 | As a card owner, I want to understand that revoking a card will not physically recall printed artifacts. |
| PM-US-04 | As a card owner, I want my shipping address used only for fulfillment and support. |
| PM-US-05 | As a card owner, I want order status and tracking visible in Humanity. |
| PM-US-06 | As a card owner, I want to reorder using a current QR credential, not accidentally print a revoked one. |

### 6.2 Operator

| ID | Story |
|---|---|
| PM-US-07 | As an operator, I want Printify products constrained to approved templates and variants. |
| PM-US-08 | As an operator, I want orders idempotent so payment retries do not duplicate fulfillment. |
| PM-US-09 | As an operator, I want failed or on-hold Printify orders surfaced with actionable reasons. |
| PM-US-10 | As an operator, I want to reconcile Printify order statuses against internal state. |
| PM-US-11 | As an operator, I want Printify outages to degrade only print ordering, not card resolution. |

### 6.3 Collective

| ID | Story |
|---|---|
| PM-US-12 | As the collective, I want physical Humanity marks used consistently. |
| PM-US-13 | As the collective, I want public revenue/cost rules for merchandise. |
| PM-US-14 | As the collective, I want artifact templates governed by public rules. |

---

## 7. Functional Requirements

### 7.1 Product Catalog

| ID | Requirement | Priority |
|---|---|---|
| PM-FR-01 | Middleware MUST maintain a Humanity-approved catalog separate from the full Printify catalog. | P0 |
| PM-FR-02 | Approved catalog entries MUST map to Printify `blueprint_id`, `print_provider_id`, variant IDs, placeholders, print constraints, and shipping eligibility. | P0 |
| PM-FR-03 | v1.0 MUST support at least sticker and flat card artifacts. | P0 |
| PM-FR-04 | Apparel and bags are deferred from the first rebuild slice and MAY be enabled only after print area and QR scan tests pass. | P1 |
| PM-FR-05 | Catalog sync MUST respect Printify catalog rate limits. | P0 |
| PM-FR-06 | Catalog entries MUST include minimum printable QR size, safe area, bleed, margin, and color constraints. | P0 |

### 7.2 Artwork Generation

| ID | Requirement | Priority |
|---|---|---|
| PM-FR-07 | Middleware MUST generate print-ready artwork from signed item-scoped QR credentials for personalized physical items. | P0 |
| PM-FR-08 | Artwork MUST include only active QR credentials unless generating historical proofs for admin review. | P0 |
| PM-FR-09 | Artwork MUST include card owner handle only if the owner explicitly chooses that template. | P0 |
| PM-FR-10 | Artwork MUST be rendered at product-specific resolution and dimensions. | P0 |
| PM-FR-11 | Artwork MUST preserve QR scan reliability after expected print scaling. | P0 |
| PM-FR-12 | Generated artwork MUST be content-addressed or hash-addressed internally. | P0 |
| PM-FR-13 | Middleware MUST upload artwork to Printify using `/v1/uploads/images.json`. | P0 |
| PM-FR-14 | Multi-quantity personalized orders MUST generate distinct artwork/QR pairs per physical item unless a disclosed batch QR policy is explicitly selected. | P0 |

### 7.3 Proofing and Consent

| ID | Requirement | Priority |
|---|---|---|
| PM-FR-15 | User MUST see a preview/proof before payment and order submission. | P0 |
| PM-FR-16 | User MUST acknowledge printed QR persistence and bearer-limit warning before first physical order. | P0 |
| PM-FR-17 | User MUST approve product, variant, quantity, print preview, printed QR persistence warning, and Shopify checkout handoff before payment. | P0 |
| PM-FR-18 | Middleware MUST block ordering if the source QR credential is revoked, expired, or suspended. | P0 |
| PM-FR-19 | Middleware MUST block ordering if artwork scan validation fails. | P0 |

### 7.4 Fulfillment Estimates

| ID | Requirement | Priority |
|---|---|---|
| PM-FR-20 | Middleware MUST calculate fulfillment estimates before checkout for personalized products using Printify shipping endpoints or cached shipping profiles. | P0 |
| PM-FR-21 | Shopify remains the customer-facing authority for final checkout total, tax, payment, and order confirmation. | P0 |
| PM-FR-22 | Fulfillment estimate MUST expire after a short TTL. | P0 |
| PM-FR-23 | Fulfillment estimate MUST be recomputed if destination country/region, variant, quantity, or shipping method changes. | P0 |

### 7.5 Order Submission

| ID | Requirement | Priority |
|---|---|---|
| PM-FR-24 | Middleware MUST receive paid Shopify order events before creating Printify orders. | P0 |
| PM-FR-25 | Middleware MUST use idempotency keys to prevent duplicate Printify orders. | P0 |
| PM-FR-26 | Middleware MUST submit orders to `/v1/shops/{shop_id}/orders.json` or `/orders/express.json` only after Shopify payment succeeds. | P0 |
| PM-FR-27 | Middleware MUST use manual production approval unless operational policy explicitly enables auto-approval. | P0 |
| PM-FR-28 | Middleware MUST call `/send_to_production.json` only after internal order state permits production. | P0 |
| PM-FR-29 | Middleware MUST store Printify `order_id`, line item IDs, product IDs, variant IDs, item QR IDs, and status. | P0 |

### 7.6 Order Status and Webhooks

| ID | Requirement | Priority |
|---|---|---|
| PM-FR-30 | Middleware MUST register Printify webhooks for relevant order/product events. | P0 |
| PM-FR-31 | Webhook receiver MUST authenticate or verify incoming events according to Printify's supported mechanism and internal allowlist controls. | P0 |
| PM-FR-32 | Middleware MUST map Printify statuses to Humanity order statuses. | P0 |
| PM-FR-33 | Middleware MUST reconcile periodically by polling Printify orders when webhooks are missed. | P0 |
| PM-FR-34 | Middleware MUST expose tracking links when Printify returns shipment data. | P0 |
| PM-FR-35 | Middleware MUST notify users of `on_hold`, `has_issues`, `source_check_failed`, `unfulfillable`, and `canceled` states. | P0 |

### 7.7 Cancellation and Failure

| ID | Requirement | Priority |
|---|---|---|
| PM-FR-36 | Middleware MUST allow cancellation only while Printify state permits cancellation. | P0 |
| PM-FR-37 | Middleware MUST avoid promising cancellation after production begins. | P0 |
| PM-FR-38 | Middleware MUST keep failed orders attached to the card owner for support. | P0 |
| PM-FR-39 | Middleware MUST support refund workflow handoff to the payment processor and support tooling. | P1 |

### 7.8 Privacy and Data Separation

| ID | Requirement | Priority |
|---|---|---|
| PM-FR-40 | Public card tables MUST NOT store shipping addresses. | P0 |
| PM-FR-41 | Print order PII MUST live in a separate order domain with stricter access controls. | P0 |
| PM-FR-42 | Middleware MUST send Printify only the address and contact fields required for fulfillment. | P0 |
| PM-FR-43 | Middleware MUST NOT send verification method details to Printify. | P0 |
| PM-FR-44 | Middleware MUST NOT send vouch graph data to Printify. | P0 |
| PM-FR-45 | Middleware MUST NOT send private profile layers to Printify. | P0 |

---

## 8. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| PM-NFR-01 | Artwork render time | < 5s p95 for standard templates |
| PM-NFR-02 | Shipping quote latency | < 8s p95 excluding Printify outage |
| PM-NFR-03 | Order submission latency | < 10s p95 excluding payment redirect |
| PM-NFR-04 | Webhook processing latency | < 60s from receipt |
| PM-NFR-05 | Order state reconciliation | At least every 30 minutes for active orders |
| PM-NFR-06 | QR scan success after print | >= 99% in QA sample under normal lighting |
| PM-NFR-07 | Catalog sync frequency | Daily, plus manual refresh |
| PM-NFR-08 | Printify API backoff | Exponential backoff on 429/5xx |
| PM-NFR-09 | PII retention | Minimum needed for support/legal/tax/fraud, documented in retention policy |
| PM-NFR-10 | Availability isolation | Resolver remains available if Printify is down |

---

## 9. Architecture

```text
Humanity Storefront
  |
  | artifact intent, product metadata
  v
Shopify Checkout
  |
  | paid order webhook
  v
Humanity Order Orchestrator
  |
  | signed QR/artifact metadata
  v
Humanity Card Service
  |
  | signed QR credential
  v
Print Artifact Renderer
  |
  | print-ready PNG/SVG/PDF
  v
Printify Adapter
  |
  | uploads/products/orders/webhooks
  v
Printify API
```

### 9.1 Internal Services

| Service | Responsibility |
|---|---|
| Catalog Sync | Pull Printify blueprints/providers/variants and maintain approved Humanity catalog. |
| Artifact Renderer | Generate QR artwork and product-specific print files. |
| Upload Manager | Upload and deduplicate artwork in Printify media library. |
| Product Template Manager | Create/update reusable Printify products where needed. |
| Quote Service | Calculate shipping and total order cost. |
| Shopify Webhook Consumer | Convert paid/canceled/refunded Shopify events into Humanity commerce events. |
| Order Orchestrator | Manage internal order state, Printify order creation, production approval, cancellation, and status. |
| Webhook Receiver | Accept Printify events and update internal order/product states. |
| Reconciler | Poll Printify for active order status to recover missed webhooks. |

### 9.2 Provider Boundary

The Printify Adapter MUST be the only code allowed to call Printify. Product and order code MUST depend on Humanity interfaces, not direct Printify request shapes.

---

## 10. User Flows

### 10.1 Catalog Approval Flow

```text
START
  |
Operator syncs Printify catalog
  |
System imports blueprints/providers/variants
  |
Operator selects candidate product
  |
System validates print area and QR size constraints
  |
Operator creates Humanity catalog template
  |
Template is reviewed and approved
  |
Template becomes visible in card owner's print options
  |
END
```

### 10.2 Print Artifact Generation Flow

```text
START
  |
Card owner chooses product template
  |
System checks card status and QR credential status
  |
QR service issues one item-scoped QR credential per physical item
  |
Renderer creates print file with signed item QR
  |
System validates dimensions and QR scanability
  |
Upload Manager uploads image to Printify
  |
Middleware stores upload_id and artifact metadata
  |
Preview is displayed to user
  |
END
```

### 10.3 Order Flow

```text
START
  |
User approves preview and printed QR persistence warning
  |
Storefront attaches artifact intent to Shopify checkout
  |
Shopify collects shipping address and calculates checkout totals
  |
User pays through Shopify checkout
  |
Shopify sends paid order webhook to Humanity
  |
Order Orchestrator creates internal fulfillment order
  |
Printify Adapter submits order
  |
If manual approval, adapter sends order to production after policy checks
  |
Order status updates through webhooks and reconciliation
  |
User sees tracking when available
  |
END
```

### 10.4 Webhook Flow

```text
START
  |
Printify sends webhook to /v1/print/webhooks/printify
  |
Middleware authenticates request
  |
Middleware records raw event envelope
  |
Middleware maps event to internal order/product/artifact
  |
State transition is applied if valid
  |
User-visible order timeline updates
  |
END
```

---

## 11. Humanity Middleware API

### 11.1 Approved Catalog

`GET /v1/print/catalog`

Returns Humanity-approved products, not the raw Printify catalog.

Response:

```json
{
  "products": [
    {
      "template_id": "hc-sticker-square-v1",
      "type": "sticker",
      "title": "Humanity QR Sticker",
      "description": "Square sticker with signed Humanity QR",
      "variants": [
        {
          "variant_id": "2x2-white",
          "label": "2 x 2 in / White",
          "enabled": true
        }
      ]
    }
  ]
}
```

### 11.2 Generate Artifact

`POST /v1/print/artifacts`

Request:

```json
{
  "profile_id": "HcProfileId",
  "qr_id": "qr_123",
  "quantity": 1,
  "template_id": "hc-sticker-square-v1",
  "variant_id": "2x2-white",
  "artwork_options": {
    "show_handle": true,
    "theme": "black_on_white"
  }
}
```

Response:

```json
{
  "artifact_id": "pa_123",
  "item_qr_id": "qr_item_123",
  "status": "proofed",
  "preview_url": "https://humanity.llc/print/previews/pa_123",
  "qr_scan_status": "passed",
  "expires_at": "2026-05-17T17:00:00Z"
}
```

### 11.3 Estimate Fulfillment

`POST /v1/print/quotes`

Request:

```json
{
  "artifact_id": "pa_123",
  "quantity": 10,
  "shipping_method": "standard",
  "destination": {
    "country": "US",
    "region": "NY",
    "city": "Brooklyn",
    "zip": "11221"
  }
}
```

Response:

```json
{
  "quote_id": "pq_123",
  "artifact_id": "pa_123",
  "currency": "USD",
  "fulfillment_cost": 700,
  "shipping_cost": 399,
  "platform_fee": 0,
  "estimated_tax": null,
  "total": 1099,
  "expires_at": "2026-05-16T18:00:00Z"
}
```

### 11.4 Create Fulfillment Order

`POST /v1/print/orders`

This endpoint is internal/server-side. It is called after Shopify confirms payment. It MUST NOT be exposed as a public unauthenticated checkout endpoint.

Request:

```json
{
  "shopify_order_id": "gid://shopify/Order/123",
  "shopify_order_number": "1001",
  "commerce_order_id": "co_123",
  "artifact_id": "pa_123",
  "shipping_method": "standard",
  "address_to": {
    "first_name": "Ada",
    "last_name": "Lovelace",
    "email": "ada@example.com",
    "phone": "+15555550123",
    "country": "US",
    "region": "NY",
    "address1": "123 Example St",
    "address2": "Apt 1",
    "city": "Brooklyn",
    "zip": "11221"
  }
}
```

Response:

```json
{
  "order_id": "po_123",
  "status": "submitted",
  "printify_order_id": "5a96f649b2439217d070f507",
  "timeline": [
    {
      "status": "submitted",
      "at": "2026-05-16T17:00:00Z"
    }
  ]
}
```

### 11.5 Get Order

`GET /v1/print/orders/{order_id}`

Response:

```json
{
  "order_id": "po_123",
  "profile_id": "HcProfileId",
  "artifact_id": "pa_123",
  "status": "in_production",
  "shipping": {
    "carrier": null,
    "tracking_number": null,
    "tracking_url": null
  },
  "timeline": []
}
```

### 11.6 Cancel Order

`POST /v1/print/orders/{order_id}/cancel`

Behavior:

- Only allowed if internal state and Printify state allow cancellation.
- Maps to Printify `/v1/shops/{shop_id}/orders/{order_id}/cancel.json`.
- Must not claim cancellation after production begins.

### 11.7 Printify Webhook

`POST /v1/print/webhooks/printify`

Behavior:

- Authenticate request.
- Store raw event envelope.
- Map to internal state.
- Apply transition idempotently.
- Return `2xx` only after event is persisted.

---

## 12. Data Models

### 12.1 Print Catalog Template

| Field | Type | Required | Description |
|---|---|---|---|
| `template_id` | string | Yes | Humanity product template ID. |
| `type` | enum | Yes | `sticker`, `card`, `apparel`, `bag`, `poster`. |
| `title` | string | Yes | Public product title. |
| `printify_blueprint_id` | integer | Yes | Printify blueprint ID. |
| `printify_provider_id` | integer | Yes | Printify print provider ID. |
| `allowed_variant_ids` | array | Yes | Printify variant IDs allowed for this template. |
| `placeholder_position` | string | Yes | Print area placeholder, such as `front`. |
| `min_qr_physical_size_mm` | integer | Yes | Minimum printed QR size. |
| `safe_area` | object | Yes | Template-specific safe area. |
| `status` | enum | Yes | `draft`, `approved`, `disabled`. |

### 12.2 Print Artifact

| Field | Type | Required | Description |
|---|---|---|---|
| `artifact_id` | string | Yes | Internal artifact ID. |
| `profile_id` | string | Yes | Card owner profile ID. |
| `qr_id` | string | Yes | Item-scoped QR credential used. |
| `source_qr_id` | string | No | Card/source QR credential used to authorize personalization. |
| `template_id` | string | Yes | Humanity catalog template. |
| `variant_id` | string | Yes | Humanity variant ID. |
| `printify_upload_id` | string | No | Printify image upload ID. |
| `artwork_hash` | string | Yes | Hash of rendered artwork. |
| `preview_url` | string | Yes | Internal preview URL. |
| `qr_scan_status` | enum | Yes | `pending`, `passed`, `failed`. |
| `status` | enum | Yes | `draft`, `proofed`, `ordered`, `blocked`, `revoked_qr`. |
| `created_at` | datetime | Yes | Creation timestamp. |

### 12.3 Print Fulfillment Estimate

| Field | Type | Required | Description |
|---|---|---|---|
| `quote_id` | string | Yes | Quote ID. |
| `artifact_id` | string | Yes | Artifact being ordered. |
| `quantity` | integer | Yes | Quantity. |
| `shipping_method` | enum | Yes | `standard`, `priority`, `printify_express`, `economy`. |
| `currency` | string | Yes | Currency code. |
| `fulfillment_cost` | integer | Yes | Cents. |
| `shipping_cost` | integer | Yes | Cents. |
| `estimated_tax` | integer | No | Cents when known. |
| `platform_fee` | integer | Yes | Cents. |
| `total` | integer | Yes | Cents. |
| `expires_at` | datetime | Yes | Quote expiration. |

### 12.4 Print Order

| Field | Type | Required | Description |
|---|---|---|---|
| `order_id` | string | Yes | Internal order ID. |
| `profile_id` | string | Yes | Card owner. |
| `artifact_id` | string | Yes | Print artifact. |
| `quote_id` | string | Yes | Quote used. |
| `commerce_order_id` | string | Yes | Humanity commerce order link. |
| `shopify_order_id` | string | Yes | Shopify order reference. |
| `printify_order_id` | string | No | Printify order ID after submission. |
| `printify_shop_id` | integer | Yes | Printify shop ID. |
| `status` | enum | Yes | Internal order status. |
| `shipping_method` | enum | Yes | Selected shipping method. |
| `address_to_encrypted` | object | Yes | Encrypted shipping address. |
| `tracking` | object | No | Carrier/tracking/url. |
| `created_at` | datetime | Yes | Creation timestamp. |
| `updated_at` | datetime | Yes | Last update timestamp. |

### 12.5 Webhook Event

| Field | Type | Required | Description |
|---|---|---|---|
| `event_id` | string | Yes | Internal event ID. |
| `provider` | string | Yes | `printify`. |
| `provider_event_id` | string | No | Event ID if supplied by Printify. |
| `topic` | string | Yes | Printify event topic. |
| `raw_payload_hash` | string | Yes | Hash of raw payload. |
| `received_at` | datetime | Yes | Receipt timestamp. |
| `processed_at` | datetime | No | Processing timestamp. |
| `status` | enum | Yes | `received`, `processed`, `ignored`, `failed`. |

---

## 13. State Machines

### 13.1 Artifact Status

```text
draft -> proofed -> ordered
draft -> blocked
proofed -> blocked
proofed -> revoked_qr
ordered -> revoked_qr
```

### 13.2 Internal Order Status

```text
draft
  -> awaiting_payment
  -> payment_failed
  -> paid
  -> submitted
  -> awaiting_production_approval
  -> in_production
  -> fulfilled
  -> partially_fulfilled
  -> on_hold
  -> has_issues
  -> unfulfillable
  -> canceled
```

### 13.3 Printify Status Mapping

| Printify Status | Humanity Status |
|---|---|
| `pending` | `submitted` or `awaiting_production_approval` |
| `on-hold` | `on_hold` |
| `sending-to-production` | `in_production` |
| `in-production` | `in_production` |
| `fulfilled` | `fulfilled` |
| `partially-fulfilled` | `partially_fulfilled` |
| `payment-not-received` | `on_hold` |
| `has-issues` | `has_issues` |
| `cost-calculation` | `submitted` |
| `unfulfillable` | `unfulfillable` |
| `source-check-failed` | `has_issues` |
| `canceled` | `canceled` |

---

## 14. Security and Privacy Requirements

| ID | Requirement |
|---|---|
| PM-SEC-01 | Printify API tokens MUST be stored server-side only. |
| PM-SEC-02 | Printify API tokens MUST be encrypted at rest. |
| PM-SEC-03 | Middleware MUST use least-privilege Printify scopes. |
| PM-SEC-04 | Clients MUST authenticate to Humanity, never to Printify. |
| PM-SEC-05 | Shipping PII MUST be encrypted at rest. |
| PM-SEC-06 | Shipping PII MUST not be joined into public card documents. |
| PM-SEC-07 | Print artifacts MUST contain only public QR/card data chosen by owner. |
| PM-SEC-08 | Webhook receiver MUST reject unauthenticated or malformed requests. |
| PM-SEC-09 | Webhook processing MUST be idempotent. |
| PM-SEC-10 | Raw webhook payload access MUST be restricted to operators. |
| PM-SEC-11 | Order creation MUST be idempotent by payment intent and artifact ID. |
| PM-SEC-12 | Middleware MUST not log full shipping addresses in plain text. |
| PM-SEC-13 | Revoked/suspended QR credentials MUST block new print orders. |
| PM-SEC-14 | Middleware MUST preserve audit trails for financial and support actions. |
| PM-SEC-15 | Unique printed-item QR credentials MUST not be reused as scan analytics, location tracking, or proof that the holder is the card owner. |

---

## 15. Error Handling

### 15.1 User-Facing Errors

| Condition | User Message |
|---|---|
| QR revoked | This card has been revoked. Generate a new active card before ordering. |
| QR expired | This QR credential has expired. Rotate your QR before ordering. |
| Artwork scan failed | The printed QR may not scan reliably. Choose another template or try again. |
| Printify rate limited | Print ordering is busy right now. Your order was not duplicated. Try again shortly. |
| Shipping quote failed | We could not calculate shipping for this address yet. |
| Address invalid | Check the shipping address and try again. |
| Order on hold | Printify needs action before this order can continue. |
| Order cannot be canceled | This order is already in production or fulfilled. |

### 15.2 Provider Error Mapping

| Printify/Provider Condition | Internal Handling |
|---|---|
| `429 Too Many Requests` | Retry with exponential backoff and user-safe pending state. |
| `400 Validation failed` | Mark quote/order actionable with provider reason when safe. |
| Image low quality | Block artifact and ask user/operator to regenerate. |
| Unsupported file format | Block upload and alert renderer pipeline. |
| Invalid address | Return user-correctable address error. |
| 5xx or timeout | Retry if idempotent; otherwise reconcile before retry. |

---

## 16. Governance Integration

| ID | Requirement |
|---|---|
| PM-GOV-01 | Humanity-branded print templates MUST be approved before public sale. |
| PM-GOV-02 | Revenue split, margins, and any collective funding contribution MUST be public. |
| PM-GOV-03 | Product categories that imply verification status MUST require accurate card status. |
| PM-GOV-04 | Suspended profiles MUST be blocked from ordering new Humanity-branded artifacts. |
| PM-GOV-05 | Operators MUST publish a data retention policy for print order PII. |
| PM-GOV-06 | Print provider changes that materially affect quality or privacy MUST be disclosed before new orders use the changed provider. |

---

## 17. Acceptance Criteria

### 17.1 Middleware Complete

- Approved Humanity catalog returns at least one sticker and one card template.
- Middleware generates print-ready QR artwork from active signed QR credentials.
- Middleware generates unique QR artwork per personalized physical item.
- QR artwork passes automated and manual scan tests.
- Middleware uploads artwork to Printify.
- Middleware calculates shipping quotes.
- Middleware creates Printify orders only after user proof approval and payment success.
- Order creation is idempotent.
- Middleware receives and processes Printify webhooks.
- User can view order status and tracking when available.
- Revoked or expired QR credentials block new orders.
- Revoking one printed-item QR leaves sibling printed-item QR credentials active.

### 17.2 Security Complete

- Printify token never reaches browser.
- Shipping PII is encrypted and separated from public card data.
- Webhook receiver verifies/authenticates requests.
- Duplicate webhook events are safe.
- Full shipping addresses are not written to normal application logs.
- Printify receives no private key, vouch-private, scanner analytics, or private profile data.

### 17.3 Operational Complete

- Catalog sync respects Printify rate limits.
- 429 and 5xx responses retry safely.
- Reconciliation job repairs missed webhooks.
- Manual production approval policy is documented.
- On-hold and failed orders surface actionable operator/user states.

---

## 18. Out of Scope for v1.0

- Building a full storefront marketplace.
- Letting arbitrary users design arbitrary merchandise.
- Exposing raw Printify catalog to card owners.
- Multi-merchant OAuth onboarding, unless needed before launch.
- Automatic refunds.
- Warehousing or inventory management outside Printify.
- Guaranteed cancellation after production starts.
- Using Printify as an identity or verification authority.

---

## 19. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Duplicate order submitted | Medium | High | Idempotency keys, payment-intent locking, reconcile before retry. |
| Printed QR too small to scan | Medium | High | Template safe areas, automated QR scan QA, minimum physical QR size. |
| Printify outage blocks ordering | Medium | Medium | Queue, clear user state, isolate resolver from Printify Fulfillment Middleware. |
| Shipping PII leak | Low | High | Separate encrypted order domain, log redaction, access controls. |
| Auto-approval sends bad orders to production | Medium | High | Manual approval by default and proof gates. |
| Product template drift | Medium | Medium | Approved catalog snapshots and periodic validation. |
| Revoked QR printed on merchandise | High over time | Medium | Resolver shows revoked status; block new orders using revoked credentials. |
| Provider rate limiting | Medium | Medium | Cache catalog, throttle writes, exponential backoff. |

---

## 20. Glossary

| Term | Definition |
|---|---|
| **Print Artifact** | Humanity-generated physical design containing a signed QR credential. |
| **Template** | Humanity-approved mapping from product type to Printify blueprint/provider/variant/placeholder. |
| **Blueprint** | Printify catalog product type before user artwork is added. |
| **Print Provider** | Printify fulfillment partner for a blueprint. |
| **Variant** | Specific size/color/material option for a blueprint/provider. |
| **Upload** | Image asset stored in Printify media library. |
| **Order Intent** | Internal Humanity record created before external order submission. |
| **Production Approval** | Step that sends an order to fulfillment after payment/proof checks. |
| **Webhook** | Provider callback that updates product or order state. |
| **Reconciliation** | Polling process that repairs missed webhook state changes. |

---

## 21. Document Approval

| Role | Signature | Date |
|---|---|---|
| Technical Architect | _____________ | _____ |
| Operations Lead | _____________ | _____ |
| Governance Lead | _____________ | _____ |
| Security Auditor | _____________ | _____ |
| Collective Representative | _____________ | _____ |

---

**Next Steps After Ratification:**

1. Choose launch Printify shop and authentication mode.
2. Approve first sticker/card product templates.
3. Build QR artwork renderer and scan QA pipeline.
4. Build Printify adapter and order state machine.
5. Run live test order before public launch.
