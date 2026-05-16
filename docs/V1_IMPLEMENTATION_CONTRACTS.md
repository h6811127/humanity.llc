# V1 Implementation Contracts

**Status:** Pre-rebuild hardening artifact  
**Purpose:** Extract buildable contracts from the v1.0 prose specs.

---

## Build Slice

The first rebuild slice MUST implement:

1. Signed public Humanity Card creation.
2. HTTPS QR resolution.
3. Revoked/suspended/expired status pages.
4. One personalized sticker/card artifact intent.
5. Shopify checkout handoff with artifact-intent metadata.
6. Paid Shopify webhook ingestion.
7. Printify Fulfillment Middleware order creation after payment.

Deferred from the first slice:

- Device proof.
- Transfer UI.
- Public search/discovery.
- Scan analytics.
- Native checkout.
- Apparel/bag personalized products.
- Multi-merchant Printify OAuth.

---

## Core Identifiers

| Identifier | Format | Owner | Public? | Notes |
|---|---|---|---|---|
| `profile_id` | 24 base58 chars | Resolver/Card service | Yes | Opaque; no user metadata. |
| `qr_id` | `qr_` + opaque random/ULID | Resolver/Card service | Yes | Referenced by QR payload. |
| `artifact_intent_id` | `ai_` + opaque random/ULID | Storefront API | No | Pre-checkout preview/proof record. |
| `print_artifact_id` | `pa_` + opaque random/ULID | Printify Fulfillment Middleware | No | Generated artwork/proof ID. |
| `commerce_order_id` | `co_` + opaque random/ULID | Commerce webhook service | No | Internal Shopify order link. |
| `print_order_id` | `po_` + opaque random/ULID | Printify Fulfillment Middleware | No | Internal fulfillment order. |
| `vouch_id` | `vouch_` + opaque random/ULID | Verification service | Public reference | Signed vouch credential. |
| `credential_id` | `cred_` + opaque random/ULID | Verification service | Maybe | Verification credential reference. |

---

## API Contracts

### Resolver API

| Endpoint | Method | Auth | Contract |
|---|---|---|---|
| `GET /.well-known/hc/v1/health` | GET | None | Returns resolver version and health. |
| `POST /.well-known/hc/v1/cards` | POST | Signed payload | Creates signed public card document. |
| `GET /.well-known/hc/v1/cards/{profile_id}` | GET | None | Returns HTML or JSON public card. |
| `GET /.well-known/hc/v1/cards/{profile_id}/status` | GET | None | Returns machine-readable card status. |
| `GET /.well-known/hc/v1/qr/{qr_id}` | GET | None | Returns QR credential metadata. |
| `POST /.well-known/hc/v1/cards/{profile_id}/qr` | POST | Owner signature | Creates/rotates QR credential. |
| `POST /.well-known/hc/v1/cards/{profile_id}/revoke` | POST | Owner/recovery signature | Revokes card or QR credential. |
| `POST /.well-known/hc/v1/cards/{profile_id}/export` | POST | Owner auth/signature | Requests export bundle. |

### Public Shortcut Routes

| Route | Contract |
|---|---|
| `GET /c/{profile_id}?q={qr_id}` | Phone-camera QR fallback. Must render public card or status page. |

### Verification API

| Endpoint | Method | Auth | Contract |
|---|---|---|---|
| `GET /v1/verification/status/{profile_id}` | GET | None | Returns public verification summary. |
| `POST /v1/verification/vouches` | POST | Voucher signature | Creates signed vouch. |
| `POST /v1/verification/vouches/{vouch_id}/revoke` | POST | Voucher or governance signature | Revokes vouch. |
| `POST /v1/verification/ceremonies/{ceremony_id}/credentials` | POST | Steward signatures | Submits ceremony credential bundle. |
| `GET /v1/verification/credentials/{credential_id}` | GET | None | Returns safe public credential evidence. |

### Storefront / Commerce API

| Endpoint | Method | Auth | Contract |
|---|---|---|---|
| `GET /v1/store/rows` | GET | None | Returns ordered story rows. |
| `GET /v1/store/products/{product_id}` | GET | None | Returns Humanity product and personalization policy. |
| `POST /v1/store/artifact-intents` | POST | Card owner auth if personalized | Creates preview/proof intent for cart line. |
| `POST /v1/store/artifact-intents/{artifact_intent_id}/attach` | POST | Shopper session | Attaches intent to Shopify cart metadata. |
| `POST /v1/webhooks/shopify/orders` | POST | Shopify webhook auth | Converts paid/canceled/refunded events into commerce events. |

### Printify Fulfillment Middleware API

| Endpoint | Method | Auth | Contract |
|---|---|---|---|
| `GET /v1/print/catalog` | GET | Operator/storefront | Returns Humanity-approved templates only. |
| `POST /v1/print/artifacts` | POST | Storefront/internal | Generates print-ready QR artwork and preview. |
| `POST /v1/print/quotes` | POST | Storefront/internal | Estimates fulfillment cost before checkout. |
| `POST /v1/print/orders` | POST | Internal only | Creates Printify order after Shopify payment. |
| `GET /v1/print/orders/{order_id}` | GET | Owner/operator auth | Returns safe order timeline/tracking. |
| `POST /v1/print/orders/{order_id}/cancel` | POST | Owner/operator auth | Cancels only while state permits. |
| `POST /v1/print/webhooks/printify` | POST | Provider auth/allowlist | Processes Printify status events idempotently. |

---

## Data Model Contracts

### Humanity Card

Required fields:

```json
{
  "version": "1.0",
  "profile_id": "base58-profile-id",
  "public_key": "base58-ed25519-public-key",
  "handle": "human_handle",
  "manifesto_line": "Short public statement.",
  "created_at": "2026-05-16T17:00:00Z",
  "updated_at": "2026-05-16T17:00:00Z",
  "status": "active",
  "verification": {},
  "badges": [],
  "qr": {},
  "links": {},
  "signature": {}
}
```

Allowed `status`: `active`, `revoked`, `suspended`, `expired`.

### Verification Summary

```json
{
  "profile_id": "base58-profile-id",
  "state": "registered",
  "level": 1,
  "label": "Registered",
  "method": "registered",
  "vouch_count": 0,
  "credential_ids": [],
  "updated_at": "2026-05-16T17:00:00Z",
  "signature": {}
}
```

Allowed `state`: `unverified`, `registered`, `verified_human`, `steward`, `revoked`, `suspended`.

Allowed `method`: `none`, `registered`, `vouch`, `ceremony`, `device_proof`, `steward`.

### QR Credential

```json
{
  "qr_id": "qr_123",
  "profile_id": "base58-profile-id",
  "epoch": 1,
  "resolver_hint": "https://humanity.llc",
  "issued_at": "2026-05-16T17:00:00Z",
  "expires_at": "2026-06-15T17:00:00Z",
  "status": "active",
  "payload": "https://humanity.llc/c/base58-profile-id?q=qr_123",
  "signature": {}
}
```

Allowed `status`: `active`, `revoked`, `expired`, `replaced`.

### Artifact Intent

```json
{
  "artifact_intent_id": "ai_123",
  "profile_id": "base58-profile-id",
  "qr_id": "qr_123",
  "product_id": "prod_sticker_square",
  "shopify_variant_id": "gid://shopify/ProductVariant/123",
  "preview_url": "https://humanity.llc/print/previews/ai_123",
  "status": "proofed",
  "expires_at": "2026-05-16T18:00:00Z"
}
```

Allowed `status`: `draft`, `proofed`, `attached_to_cart`, `expired`, `converted`, `blocked`.

### Commerce Order Link

```json
{
  "commerce_order_id": "co_123",
  "shopify_order_id": "gid://shopify/Order/123",
  "shopify_checkout_id": "gid://shopify/Checkout/123",
  "profile_id": "base58-profile-id",
  "artifact_intent_ids": ["ai_123"],
  "print_order_ids": [],
  "status": "paid"
}
```

Allowed `status`: `paid`, `processing`, `fulfilled`, `partially_fulfilled`, `canceled`, `refunded`, `failed`, `held_for_review`.

### Print Order

```json
{
  "order_id": "po_123",
  "profile_id": "base58-profile-id",
  "print_artifact_id": "pa_123",
  "commerce_order_id": "co_123",
  "shopify_order_id": "gid://shopify/Order/123",
  "printify_order_id": null,
  "printify_shop_id": 123,
  "status": "submitted",
  "shipping_method": "standard",
  "address_to_encrypted": {},
  "tracking": null,
  "created_at": "2026-05-16T17:00:00Z",
  "updated_at": "2026-05-16T17:00:00Z"
}
```

Allowed `status`: `draft`, `awaiting_payment`, `payment_failed`, `paid`, `submitted`, `awaiting_production_approval`, `in_production`, `fulfilled`, `partially_fulfilled`, `on_hold`, `has_issues`, `unfulfillable`, `canceled`.

---

## State Machines

### Card Status

```text
active -> revoked
active -> suspended
suspended -> active
suspended -> revoked
active -> expired
expired -> active
```

### Verification State

```text
unverified -> registered
registered -> verified_human
verified_human -> steward
verified_human -> suspended
steward -> suspended
suspended -> registered
registered -> revoked
verified_human -> revoked
steward -> revoked
```

### Artifact Intent

```text
draft -> proofed
draft -> blocked
proofed -> attached_to_cart
proofed -> expired
attached_to_cart -> converted
attached_to_cart -> expired
attached_to_cart -> blocked
```

### Commerce Order

```text
paid -> processing
paid -> held_for_review
processing -> fulfilled
processing -> partially_fulfilled
processing -> failed
paid -> canceled
paid -> refunded
fulfilled -> refunded
```

### Print Order

```text
draft -> awaiting_payment
awaiting_payment -> payment_failed
awaiting_payment -> paid
paid -> submitted
submitted -> awaiting_production_approval
awaiting_production_approval -> in_production
in_production -> fulfilled
in_production -> partially_fulfilled
submitted -> on_hold
submitted -> has_issues
submitted -> unfulfillable
submitted -> canceled
on_hold -> submitted
has_issues -> submitted
```

---

## Event Names

### Internal Events

| Event | Producer | Consumer | Payload Must Include |
|---|---|---|---|
| `card.created` | Resolver | Verification, QR service | `profile_id`, `public_key`, `created_at` |
| `qr.issued` | QR service | Resolver, Storefront | `qr_id`, `profile_id`, `epoch`, `status` |
| `card.revoked` | Resolver | Storefront, Printify Fulfillment Middleware | `profile_id`, `revoked_at`, `reason` |
| `vouch.created` | Verification | Card service | `vouch_id`, `voucher_profile_id`, `vouchee_profile_id` |
| `verification.updated` | Verification | Resolver/Card service | `profile_id`, `state`, `credential_ids` |
| `artifact_intent.created` | Storefront | Shopify adapter | `artifact_intent_id`, `product_id`, `qr_id` |
| `shopify.order_paid` | Shopify webhook consumer | Commerce, Printify Fulfillment Middleware | `shopify_order_id`, `commerce_order_id`, `artifact_intent_ids` |
| `print_order.submitted` | Printify Fulfillment Middleware | Order timeline | `print_order_id`, `printify_order_id` |
| `print_order.updated` | Printify webhook/reconciler | Order timeline | `print_order_id`, `status` |

### Provider Events To Normalize

| Provider | Raw Event/Status | Internal Event |
|---|---|---|
| Shopify | Order paid | `shopify.order_paid` |
| Shopify | Order canceled | `shopify.order_canceled` |
| Shopify | Order refunded | `shopify.order_refunded` |
| Printify | `pending` | `print_order.submitted` |
| Printify | `on-hold` | `print_order.on_hold` |
| Printify | `sending-to-production` | `print_order.in_production` |
| Printify | `in-production` | `print_order.in_production` |
| Printify | `fulfilled` | `print_order.fulfilled` |
| Printify | `partially-fulfilled` | `print_order.partially_fulfilled` |
| Printify | `has-issues` | `print_order.has_issues` |
| Printify | `source-check-failed` | `print_order.has_issues` |
| Printify | `unfulfillable` | `print_order.unfulfillable` |
| Printify | `canceled` | `print_order.canceled` |

---

## Error Contracts

| Code | Domain | Meaning | Required Behavior |
|---|---|---|---|
| `CARD_INVALID_SIGNATURE` | Resolver | Card payload signature invalid. | Reject; do not store. |
| `HANDLE_TAKEN` | Resolver | Handle already exists. | Return conflict. |
| `QR_REVOKED` | QR/Storefront | QR credential revoked. | Block new print orders; render revoked page. |
| `QR_EXPIRED` | QR/Storefront | QR credential expired. | Block new print orders; request rotation. |
| `CARD_SUSPENDED` | Resolver/Storefront | Governance suspension active. | Block new print orders; render suspended page. |
| `VOUCH_QUOTA_EXCEEDED` | Verification | Voucher exceeded quota. | Block vouch. |
| `VOUCHER_TOO_NEW` | Verification | Voucher within 90-day wait. | Block vouch. |
| `ARTIFACT_INTENT_EXPIRED` | Storefront | Intent expired before checkout/webhook. | Regenerate preview; hold paid order if already paid. |
| `CHECKOUT_METADATA_MISSING` | Commerce | Shopify order lacks artifact intent refs. | Hold for operator review; do not submit Printify order. |
| `LIMITED_DROP_SOLD_OUT` | Storefront | No inventory remains. | Do not fulfill; trigger refund/support path. |
| `PRINT_QR_SCAN_FAILED` | Printify Fulfillment Middleware | QR artwork failed QA. | Block order submission. |
| `PRINTIFY_RATE_LIMITED` | Printify Fulfillment Middleware | Provider returned 429. | Retry with backoff; no duplicate order. |
| `PRINTIFY_INVALID_ADDRESS` | Printify Fulfillment Middleware | Address rejected. | User-correctable fulfillment issue. |
| `PRINTIFY_SOURCE_CHECK_FAILED` | Printify Fulfillment Middleware | Artwork/source issue. | Operator actionable state. |
| `ORDER_ALREADY_IN_PRODUCTION` | Printify Fulfillment Middleware | Cancellation no longer allowed. | Do not promise cancellation. |

---

## Acceptance Tests

### Card and QR

- Creating a card with a valid signature stores and resolves public JSON/HTML.
- Creating a card with invalid canonicalization or invalid signature is rejected.
- Private key is never sent to resolver, Shopify, or Printify middleware.
- `GET /c/{profile_id}?q={qr_id}` renders active public card.
- Revoked card renders revoked status and returns machine-readable revoked state.
- Suspended card renders suspended status.
- QR payload contains no private profile fields, order IDs, shipping fields, email, or phone.
- Active card cache shows stale/offline banner when offline.

### Verification

- Registered/unverified card shows no unique-human claim.
- Three valid vouches upgrade state to `verified_human`.
- Voucher with exceeded quota is rejected.
- Voucher issued before 90-day wait is rejected.
- Revoked voucher no longer counts.
- Storefront purchase does not change verification state.
- Product and scan pages distinguish purchased artifacts from verified human status.

### Storefront and Shopify

- Store landing page renders story rows.
- Product detail discloses personalization behavior and QR persistence warning.
- Personalized product requires active QR credential.
- Revoked/suspended/expired QR blocks personalization.
- Artifact intent attaches to Shopify cart/checkout metadata.
- Paid Shopify webhook creates exactly one commerce order link.
- Duplicate paid webhook does not duplicate a Printify order.
- Missing artifact intent metadata holds order for review.

### Printify Fulfillment Middleware

- Approved catalog returns at least one sticker and one flat card template.
- QR artwork preserves quiet zone and passes scan QA before order submission.
- Printify token never reaches the browser.
- Printify order is created only after Shopify paid webhook and internal artifact/order validation.
- Order creation idempotency prevents duplicate Printify orders.
- Printify webhook is authenticated, persisted, and idempotent.
- Missed webhook is repaired by reconciliation.
- Full shipping address is encrypted at rest and not logged in normal logs.
- On-hold, has-issues, source-check-failed, unfulfillable, and canceled states produce actionable order timeline entries.
