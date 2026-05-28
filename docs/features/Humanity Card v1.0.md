**Version:** 1.0
**Status:** Draft for Collective Ratification
**Constitution Reference:** Humanity Commons Constitution (Articles I-VII)
**Technical Standards Reference:** Technical Standards v1.0
**Product Trust Reference:** V1 Product Trust Model
**Dependencies:** Human Verification v1.0, QR Public Profile v1.0, Storefront v1.0, Printify Fulfillment Middleware v1.0

---

## 1. Executive Summary

Humanity Card v1.0 is the first public release of Humanity Commons. It is not a link aggregator and it is not a decorative QR profile. It is a portable, revocable, cryptographically signed root proof object that a person can show online, print, wear, scan, and use as the entry point into the commons.

The core social object is the **root Humanity Card**:

- A public profile card owned by a human.
- A signed QR credential that resolves to that card.
- A visible verification state.
- A freshness signal such as latest accepted vouch recency when available.
- A public badge trail showing how the person entered the commons.
- A revocation mechanism controlled by the owner.
- A live control proof path for situations where a scanner needs recent evidence that the person nearby controls the card key.
- A parent authority for child objects such as status plates, lost-item tags, printed items, stickers, hoodies, and demos.
- A print-ready physical artifact / child object that can be purchased through the Humanity Storefront and fulfilled through Printify Fulfillment Middleware.

The product promise is:

> I am a real human participating in an open, consent-based commons. Here is my signed card. You can scan it, verify it, and know what it claims without trusting a social platform.

Version 1.0 must feel like a passport stamp, membership card, and public proof object. The network, QR system, verification system, Storefront, Shopify checkout, and Printify integration are infrastructure behind that object.

---

## 2. Product Principles

| Principle | Requirement |
|---|---|
| Human-first identity | The system represents humans, not accounts, brands, bots, or marketing pages. |
| Visible proof | Verification state must be understandable at a glance and inspectable in detail. |
| Portable trust | A card must be exportable and resolvable outside a single app UI. |
| Revocable consent | Owners must be able to revoke public resolution and printed QR validity. |
| No fake decentralization | If only one network exists at launch, the product must say so; protocol design still supports multiple networks. |
| No surveillance default | Scan analytics and tracking are disabled unless explicit consent rules are satisfied. |
| Physical-digital bridge | Printing is a first-class system component, not an afterthought. |
| One root, many objects | Users should not manage a new private key for every public object they create. |
| Governance visible | Every card links to the constitution, technical standards, and governance process. |

---

## 3. User Stories

### 3.1 Card Owner

| ID | Story |
|---|---|
| HC-US-01 | As a person, I want to create a Humanity Card without giving a phone number, email address, or government ID. |
| HC-US-02 | As a card owner, I want my card to display my handle, manifesto line, verification status, member-since date, public badges, and QR code. |
| HC-US-03 | As a card owner, I want to prove that my card was generated from my device-held keypair. |
| HC-US-04 | As a card owner, I want to revoke my card at any time without requesting permission. |
| HC-US-05 | As a card owner, I want to export my identity bundle so I am not locked into humanity.llc. |
| HC-US-06 | As a card owner, I want to order physical stickers, cards, or apparel containing my signed QR code. |
| HC-US-07 | As a card owner, I want clear warnings before any printed artifact is produced because a printed QR can outlive my current web session. |
| HC-US-08 | As a card owner, I want to regenerate print artifacts after rotating keys or revoking a previous QR epoch. |
| HC-US-09 | As a card owner, I want to prove live control of my card key without exposing private identity data. |
| HC-US-09A | As a card owner, I want to create and edit child objects under my root card without managing a new key per object. |
| HC-US-09B | As a card owner with many child objects, I want backup and recovery to restore control of the whole tree. |

### 3.2 Scanner

| ID | Story |
|---|---|
| HC-US-10 | As a scanner, I want a scanned QR code to resolve quickly to the public Humanity Card. |
| HC-US-11 | As a scanner, I want to see whether the card is active, revoked, suspended, unverified, vouched, device-verified, or steward-level. |
| HC-US-12 | As a scanner, I want to verify that the card payload and network response are signed. |
| HC-US-13 | As a scanner, I want to know what data, if any, is being logged when I scan. |
| HC-US-14 | As a scanner, I want cached cards to clearly show that they may be stale. |
| HC-US-15 | As a scanner, I want to know that a printed QR resolves to a card but does not prove the holder is the card owner. |
| HC-US-15A | As a scanner, I want child-object scans to show which root card controls the object without implying the object is a separate verified human. |
| HC-US-16 | As a scanner, I want to ask the nearby card owner to prove live control of the card key. |
| HC-US-17 | As a scanner, I want to request deeper access only through explicit consent flows. |

### 3.3 Voucher

| ID | Story |
|---|---|
| HC-US-18 | As a verified human, I want to vouch for someone I know personally. |
| HC-US-19 | As a voucher, I want vouching to be meaningful, limited, and revocable if fraud or harm is discovered. |
| HC-US-20 | As a voucher, I want my public vouch trail to show that I participated in building the commons. |

### 3.4 Collective / Operators

| ID | Story |
|---|---|
| HC-US-21 | As an operator, I want network and Printify Fulfillment Middleware events to be auditable without exposing unnecessary personal data. |
| HC-US-22 | As a trust and safety steward, I want suspension to require documented cause, visible status, and appeal rights. |
| HC-US-23 | As the collective, I want physical merchandise to spread the system without weakening revocation, privacy, or identity claims. |

---

## 4. Functional Requirements

### 4.1 Card Creation

| ID | Requirement | Priority |
|---|---|---|
| HC-FR-01 | System MUST generate an Ed25519 root keypair on the user's device. | P0 |
| HC-FR-02 | Private keys MUST NOT be transmitted to any Humanity network or Printify Fulfillment Middleware. | P0 |
| HC-FR-03 | User MUST choose a unique handle matching protocol handle rules. | P0 |
| HC-FR-04 | User MUST provide a manifesto line of 1-280 characters. | P0 |
| HC-FR-05 | System MUST create a signed public profile document. | P0 |
| HC-FR-06 | System MUST create a stable `profile_id` that does not encode user metadata. | P0 |
| HC-FR-07 | System MUST issue a card version and QR epoch. | P0 |
| HC-FR-08 | System MUST display clear backup instructions for private key and export bundle; backup/recovery copy must become stronger before users create many child objects or paid printed artifacts. | P0 |

### 4.2 Humanity Card Display

| ID | Requirement | Priority |
|---|---|---|
| HC-FR-09 | Public card MUST display handle, manifesto line, verification badge, latest accepted vouch recency when available, card status, member-since date, QR code, and public badges. | P0 |
| HC-FR-10 | Public card MUST display constitution and governance links. | P0 |
| HC-FR-11 | Public card MUST display "No phone, no ads, no follower count" positioning or equivalent privacy copy. | P0 |
| HC-FR-12 | Public card MUST expose a machine-readable JSON representation. | P0 |
| HC-FR-13 | Public card MUST expose a human-readable HTML representation through content negotiation. | P0 |
| HC-FR-14 | Public card MUST not display private or semi-public data by default. | P0 |
| HC-FR-15 | Public card and printed-item scan pages MUST warn that possession of a printed QR artifact does not prove card ownership or identity. | P0 |
| HC-FR-16 | Public card SHOULD include visual design suitable for screenshots and sharing. | P1 |

### 4.3 Verification State

| ID | Requirement | Priority |
|---|---|---|
| HC-FR-17 | Card MUST display verification level: unverified, registered, verified human, steward, revoked, or suspended. | P0 |
| HC-FR-18 | Card MUST explain how verification was achieved: device proof, vouches, ceremony, or steward action. | P0 |
| HC-FR-19 | Card MUST display a public badge trail with issuer, issuance time, and signature reference. | P0 |
| HC-FR-20 | Card MUST display latest accepted vouch recency when active accepted vouches exist. | P0 |
| HC-FR-21 | System MUST support founding badges such as `founding_human` and `early_builder`. | P0 |
| HC-FR-22 | Founding badges MUST be governed by issuance rules, not arbitrary UI decoration. | P0 |
| HC-FR-22A | Public launch UI SHOULD label vouch-based level 2 cards as `Vouched Human` unless copy testing and governance approve stronger wording. | P0 |

### 4.4 Vouching

| ID | Requirement | Priority |
|---|---|---|
| HC-FR-23 | Verified humans MUST be able to vouch for other humans. | P0 |
| HC-FR-24 | Vouches MUST be signed by the voucher's private key. | P0 |
| HC-FR-25 | Vouches MUST include voucher profile ID, vouchee profile ID, timestamp, method, and statement. | P0 |
| HC-FR-26 | Vouches MUST be rate-limited and quota-limited per Human Verification v1.0. | P0 |
| HC-FR-27 | Vouch counts and latest accepted vouch recency MUST be visible on the card without exposing private notes. | P0 |
| HC-FR-28 | Revoked or suspended voucher status MUST invalidate dependent vouches according to verification rules. | P0 |

### 4.5 QR Credential

| ID | Requirement | Priority |
|---|---|---|
| HC-FR-29 | QR payload MUST be short enough for reliable printing and scanning. | P0 |
| HC-FR-30 | QR payload MUST include or reference a signed credential. | P0 |
| HC-FR-31 | QR credential MUST include profile ID, network hint, epoch, scope, issued_at, expires_at, and signature. | P0 |
| HC-FR-32 | QR codes MUST be regenerated when epoch changes or key material rotates. | P0 |
| HC-FR-33 | Each personalized printed item MUST receive a unique item-scoped QR credential so stolen/lost items can be revoked individually. | P0 |
| HC-FR-34 | Printed QR codes MUST resolve to a status page after expiration or revocation, not silently fail. | P0 |
| HC-FR-35 | QR PNG/SVG/PDF outputs MUST be generated at print-safe resolution. | P0 |

### 4.5B Child Objects

| ID | Requirement | Priority |
|---|---|---|
| HC-FR-35E | Root card owner MUST be able to control supported child objects without creating a separate private key for each child. | P0 |
| HC-FR-35F | Child objects MUST have separate lifecycle state from the root card where supported, including per-QR revoke/replace. | P0 |
| HC-FR-35G | Child objects MUST NOT receive independent human verification, vouching authority, or Steward status. | P0 |
| HC-FR-35H | Child-object public UI SHOULD show object state first and the root relationship second, e.g. **Controlled by @handle**. | P0 |

### 4.5A Live Control Proof

| ID | Requirement | Priority |
|---|---|---|
| HC-FR-35A | Scanner MUST be able to request a short-lived live control challenge from a public card or printed-item scan page. | P1 |
| HC-FR-35B | Card owner MUST be able to sign the challenge using active card key material or an accepted recovery/rotation key. | P1 |
| HC-FR-35C | Successful proof MUST be displayed as recent evidence only, not as permanent verification, legal identity, or artifact ownership. | P1 |
| HC-FR-35D | Failed or expired proof MUST leave the card status unchanged and explain that live control was not proven. | P1 |

### 4.6 Physical Artifact Ordering

| ID | Requirement | Priority |
|---|---|---|
| HC-FR-36 | Card owner MUST be able to order physical artifacts containing their signed QR code. | P0 |
| HC-FR-37 | System MUST support at minimum stickers and flat cards for v1.0. | P0 |
| HC-FR-38 | Apparel and bags SHOULD be supported if Printify product templates are validated. | P1 |
| HC-FR-39 | Physical artifact ordering MUST be mediated through Storefront, Shopify checkout, and Printify Fulfillment Middleware. | P0 |
| HC-FR-40 | Print orders MUST not give Printify access to private keys or verification secrets. | P0 |
| HC-FR-41 | Print files MUST use a signed item-scoped QR credential generated by Humanity systems. | P0 |
| HC-FR-42 | Card owner MUST approve final preview before order submission. | P0 |
| HC-FR-43 | Physical order status MUST be trackable inside Humanity without exposing scan data. | P0 |

### 4.7 Revocation

| ID | Requirement | Priority |
|---|---|---|
| HC-FR-44 | Card owner MUST be able to revoke the active card using device-held key material or exported recovery credentials. | P0 |
| HC-FR-45 | Card owner MUST be able to revoke an individual printed-item QR without revoking sibling printed-item QR credentials. | P0 |
| HC-FR-46 | Revocation MUST mark network responses as `410 Gone` for public card resolution. | P0 |
| HC-FR-47 | Revocation MUST mark printed QR artifacts as revoked in the network status response. | P0 |
| HC-FR-48 | Revocation MUST not attempt to recall already shipped physical products. | P0 |
| HC-FR-49 | Revocation page MUST explain that physical artifacts may still exist but will resolve as revoked. | P0 |

### 4.8 Export and Portability

| ID | Requirement | Priority |
|---|---|---|
| HC-FR-50 | User MUST be able to export profile document, public badges, signed vouches, QR credential history, network operator list, and encrypted private key backup. | P0 |
| HC-FR-51 | Export MUST be downloadable within 24 hours. | P0 |
| HC-FR-52 | Export MUST include a manifest signature. | P0 |
| HC-FR-53 | Export MUST include print artifact metadata but MUST NOT include third-party payment secrets. | P0 |

### 4.9 Privacy and Logging

| ID | Requirement | Priority |
|---|---|---|
| HC-FR-54 | System MUST NOT collect scan analytics by default. | P0 |
| HC-FR-55 | Network access logs MUST anonymize IP addresses. | P0 |
| HC-FR-56 | Printify Fulfillment Middleware MUST store shipping data only as long as required for fulfillment, support, tax, fraud, and legal obligations. | P0 |
| HC-FR-57 | Printify Fulfillment Middleware MUST not share profile-private data with Printify. | P0 |
| HC-FR-58 | Scanner logging, if ever enabled, MUST require explicit scanner and card-owner consent. | P1 |

---

## 5. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| HC-NFR-01 | Card HTML first byte | < 500ms p95 from primary region |
| HC-NFR-02 | Card JSON first byte | < 300ms p95 from primary region |
| HC-NFR-03 | QR scan-to-render time | < 2s p95 on mobile LTE |
| HC-NFR-04 | Static card shell size | < 150KB compressed |
| HC-NFR-05 | QR payload length | <= 120 characters where possible |
| HC-NFR-06 | Network availability | 99.5% during v1.0 launch period |
| HC-NFR-07 | Print order creation latency | < 10s p95 excluding payment provider redirects |
| HC-NFR-08 | Print order webhook processing | < 60s from webhook receipt |
| HC-NFR-09 | Signature algorithm | Ed25519 |
| HC-NFR-10 | Hash algorithm | SHA-256 minimum; stronger hashes allowed for non-protocol internals |
| HC-NFR-11 | Export generation | < 24 hours |
| HC-NFR-12 | Accessibility | WCAG 2.2 AA for public card and ordering flow |
| HC-NFR-13 | Live control challenge expiry | 30-120 seconds |
| HC-NFR-14 | Live control success display | 2-5 minutes maximum |

---

## 6. System Architecture

### 6.1 Components

```text
User Device
  - Generates Ed25519 keys
  - Signs profile, vouches, revocations
  - Stores private key or encrypted export bundle

Humanity Web App
  - Card creation UX
  - Public card display
  - Verification/vouching UX
  - Print ordering UX

Network API
  - Stores public card documents
  - Resolves QR credentials
  - Returns HTML/JSON
  - Enforces revoked/suspended states

Verification Service
  - Device proof, vouch, and ceremony records
  - Badge issuance
  - Verification status aggregation

Printify Fulfillment Middleware
  - Renders print-ready QR artwork
  - Maps Humanity products to Printify templates
  - Creates Printify uploads/products/orders
  - Receives Printify webhooks
  - Stores fulfillment state and provider metadata

Shopify
  - Cart, checkout, payment, tax, refunds, and commerce order records

Printify
  - Catalog, products, uploads, orders, fulfillment, shipping, tracking
```

### 6.2 Trust Boundaries

| Boundary | Rule |
|---|---|
| Browser to Humanity | Private keys stay on device; signed payloads cross boundary. |
| Humanity to Shopify | Cart line metadata, checkout/order references, and payment state cross boundary; private keys and verification secrets do not. |
| Humanity to Printify | Only print artwork, product/order details, and shipping data required for fulfillment cross boundary. |
| Scanner to Network | Scanner receives public data only; scan analytics disabled by default. |
| Network to Verification | Network consumes signed public verification records; it does not invent status. |
| Printify webhook to Humanity | Webhook payloads are authenticated and mapped to internal order IDs. |

---

## 7. User Flows

### 7.1 Create Humanity Card

```text
START
  |
User opens Create Card
  |
Browser generates Ed25519 keypair
  |
User chooses handle and manifesto
  |
Client creates signed profile document
  |
Network validates and stores public card
  |
Verification service assigns registered or unverified status
  |
System displays card, QR, export prompt, and print options
  |
END
```

### 7.2 Verify As Human By Vouching

```text
START
  |
Unverified or registered user shares card
  |
Verified human opens Vouch action
  |
System checks voucher eligibility and quota
  |
Voucher signs vouch statement
  |
Verification service stores vouch record
  |
If threshold reached, profile becomes Vouched Human in public UI
  |
Card badge updates
  |
END
```

### 7.3 Scan Printed QR

```text
START
  |
Scanner scans physical QR
  |
Network parses credential and profile ID
  |
Network checks revocation/suspension/expiration
  |
If active, card HTML renders
  |
If revoked, revoked status page renders
  |
If suspended, suspension notice renders
  |
END
```

### 7.4 Order Physical Card Or Sticker

```text
START
  |
Card owner opens Storefront product page
  |
System verifies active card/QR status
  |
System issues unique printed-item QR credential
  |
System renders signed item QR artwork and artifact preview
  |
Artifact intent attaches to cart line
  |
User approves proof and printed QR persistence warning
  |
User pays through Shopify checkout
  |
Shopify paid order webhook returns to Humanity
  |
Printify Fulfillment Middleware submits Printify order
  |
Printify fulfills order
  |
Middleware receives webhooks and updates Humanity order status
  |
END
```

### 7.5 Revoke Card

```text
START
  |
Owner opens revoke flow
  |
Client signs revocation statement
  |
Network verifies signature
  |
Network marks card revoked
  |
QR resolution returns 410 or revoked HTML status
  |
Print order history remains visible but new orders are blocked
  |
END
```

### 7.6 Prove Live Control

```text
START
  |
Scanner opens card or printed-item QR page
  |
Scanner requests live control challenge
  |
Owner opens challenge on key-holding device
  |
Owner reviews and signs challenge
  |
Scanner sees recent control proof or failure
  |
END
```

---

## 8. API Specifications

### 8.1 Network API Summary

| Endpoint | Method | Description |
|---|---|---|
| `/.well-known/hc/v1/cards` | POST | Create signed card document |
| `/.well-known/hc/v1/cards/{profile_id}` | GET | Resolve card as JSON or HTML |
| `/.well-known/hc/v1/cards/{profile_id}/qr` | GET | Retrieve QR artifact metadata |
| `/.well-known/hc/v1/cards/{profile_id}/revoke` | POST | Revoke card using signed statement |
| `/.well-known/hc/v1/cards/{profile_id}/live-control/challenges` | POST | Create a short-lived live control challenge |
| `/.well-known/hc/v1/cards/{profile_id}/live-control/responses` | POST | Submit signed live control challenge response |
| `/.well-known/hc/v1/cards/{profile_id}/export` | POST | Request export bundle |
| `/.well-known/hc/v1/cards/{profile_id}/status` | GET | Retrieve active/revoked/suspended/expired status |

### 8.2 Verification API Summary

| Endpoint | Method | Description |
|---|---|---|
| `/v1/verification/status/{profile_id}` | GET | Get verification level and badge details |
| `/v1/verification/vouches` | POST | Submit signed vouch |
| `/v1/verification/vouches/{vouch_id}/revoke` | POST | Revoke signed vouch |
| `/v1/verification/badges/{profile_id}` | GET | Retrieve public badge trail |

### 8.3 Printify Fulfillment Middleware API Summary

| Endpoint | Method | Description |
|---|---|---|
| `/v1/print/catalog` | GET | List Humanity-approved printable products |
| `/v1/print/artifacts` | POST | Generate print-ready signed QR artwork |
| `/v1/print/quotes` | POST | Calculate pre-checkout fulfillment estimate when needed |
| `/v1/print/orders` | POST | Internal endpoint to create fulfillment order after Shopify payment |
| `/v1/print/orders/{order_id}` | GET | Retrieve print order status |
| `/v1/print/orders/{order_id}/cancel` | POST | Cancel eligible unpaid/on-hold order |
| `/v1/print/webhooks/printify` | POST | Receive Printify webhook callbacks |

Printify Fulfillment Middleware details are specified in `Printify Fulfillment Middleware v1.0.md`.

---

## 9. Data Models

### 9.1 Humanity Card

| Field | Type | Required | Description |
|---|---|---|---|
| `version` | string | Yes | Protocol version, `"1.0"`. |
| `profile_id` | string | Yes | Opaque base58 identifier. |
| `public_key` | string | Yes | Base58 Ed25519 public key. |
| `handle` | string | Yes | Public handle. |
| `manifesto_line` | string | Yes | Public statement, max 280 chars. |
| `created_at` | datetime | Yes | ISO timestamp. |
| `updated_at` | datetime | Yes | ISO timestamp. |
| `verification` | object | Yes | Public verification summary. |
| `badges` | array | Yes | Public badge records. |
| `qr` | object | Yes | Active QR credential metadata. |
| `links` | object | Yes | Constitution, governance, export docs. |
| `status` | enum | Yes | `active`, `revoked`, `suspended`, `expired`. |
| `signature` | string | Yes | Signature over canonical card document. |

### 9.2 Verification Summary

| Field | Type | Required | Description |
|---|---|---|---|
| `level` | integer | Yes | 0, 1, 2, or 3. |
| `label` | string | Yes | Human-readable label. |
| `method` | enum | Yes | `none`, `registered`, `device_proof`, `vouch`, `ceremony`, `steward`. |
| `verified_at` | datetime | No | When current level was achieved. |
| `vouch_count` | integer | Yes | Count of active valid vouches. |
| `latest_accepted_vouch_at` | datetime | No | Most recent active accepted vouch timestamp. |
| `badge_id` | string | No | Current primary verification badge. |

### 9.3 Badge Record

| Field | Type | Required | Description |
|---|---|---|---|
| `badge_id` | string | Yes | Stable badge identifier. |
| `type` | string | Yes | `founding_human`, `early_builder`, `verified_human`, etc. |
| `label` | string | Yes | Display label. |
| `issuer` | string | Yes | Issuer profile, council, or system key. |
| `issued_at` | datetime | Yes | Issuance timestamp. |
| `evidence_uri` | string | No | Link to public evidence or policy. |
| `signature` | string | Yes | Issuer signature. |

### 9.4 QR Credential

| Field | Type | Required | Description |
|---|---|---|---|
| `qr_id` | string | Yes | Stable ID for this QR artifact. |
| `profile_id` | string | Yes | Card profile ID. |
| `epoch` | integer | Yes | QR epoch number. |
| `scope` | enum | Yes | `card` or `print_artifact`. |
| `resolver_hint` | string | Yes | Primary network base URL or domain hint. |
| `issued_at` | datetime | Yes | Creation time. |
| `expires_at` | datetime | Yes | Expiration time. |
| `payload` | string | Yes | Encoded QR payload. |
| `signature` | string | Yes | Owner signature over credential fields. |
| `print_artifact_ids` | array | No | Physical artifacts using this credential. |

### 9.5 Print Artifact Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `artifact_id` | string | Yes | Humanity print artifact ID. |
| `profile_id` | string | Yes | Card owner. |
| `qr_id` | string | Yes | QR credential used in artwork. |
| `artifact_type` | enum | Yes | `sticker`, `card`, `apparel`, `bag`, `poster`. |
| `status` | enum | Yes | `draft`, `proofed`, `ordered`, `fulfilled`, `blocked`, `revoked_qr`. |
| `print_order_id` | string | No | Internal Humanity print order ID. |

---

## 10. Security and Privacy Requirements

| ID | Requirement |
|---|---|
| HC-SEC-01 | Private keys MUST remain on user devices or encrypted exports. |
| HC-SEC-02 | Profile documents MUST be canonicalized before signing. |
| HC-SEC-03 | Network MUST verify owner signatures before accepting profile creation, update, revocation, or QR rotation. |
| HC-SEC-04 | Printify Fulfillment Middleware MUST NOT receive private keys. |
| HC-SEC-05 | Printify Fulfillment Middleware MUST NOT expose Printify API tokens to clients. |
| HC-SEC-06 | Commerce and print order PII MUST be separated from public card data. |
| HC-SEC-07 | Network MUST avoid scan analytics by default. |
| HC-SEC-08 | Suspensions MUST be signed by authorized governance keys. |
| HC-SEC-09 | Revocation MUST be visible and machine-readable. |
| HC-SEC-10 | QR artwork MUST include only public network data and signed credentials. |
| HC-SEC-11 | Live control proof MUST be short-lived, single-use, and labeled as key-control evidence only. |

---

## 11. Governance Integration

| ID | Requirement |
|---|---|
| HC-GOV-01 | Badge issuance rules MUST be public. |
| HC-GOV-02 | Changes to verification thresholds require collective ratification. |
| HC-GOV-03 | Suspension rules require documented cause and appeal process. |
| HC-GOV-04 | Print artifact categories using Humanity marks require governance-approved templates. |
| HC-GOV-05 | Any paid merchandise revenue split must be public before launch. |
| HC-GOV-06 | Emergency security changes must be retroactively ratified within 30 days. |

---

## 12. Acceptance Criteria

### 12.1 V1 Public Launch

- User can create a signed Humanity Card.
- User can view HTML and JSON card representations.
- User can scan a QR code and see an active card.
- User can see verification status and badge trail.
- User can see latest accepted vouch recency when active accepted vouches exist.
- Scanner can request live control proof, or the UI explicitly labels live control proof as deferred.
- User can vouch for another human if eligible.
- User can revoke active card resolution.
- User can export identity bundle.
- User can order at least one physical QR artifact through Storefront, Shopify checkout, and Printify Fulfillment Middleware.
- Print order status updates from Printify are visible.
- No phone number, email address, government ID, or social login is required for card creation.
- Scan analytics are disabled by default.

### 12.2 Security Complete

- Profile creation, update, vouching, QR rotation, and revocation require signatures.
- Private key never leaves device in plaintext.
- Printify token is server-side only.
- Webhook endpoint authenticates or verifies Printify callbacks according to the middleware spec.
- Public card data is separated from Shopify/print order PII.
- Revoked cards return revoked status for old printed QR codes.
- Revoked printed-item QR credentials do not revoke other printed-item QR credentials for the same card.

### 12.3 Physical Artifact Complete

- Print-ready QR artwork passes scanner tests at expected printed sizes.
- Personalized physical items receive unique QR credentials per item.
- User sees and approves proof before order submission.
- Order creation is idempotent.
- Printify order status is mapped to Humanity order status.
- Failed/on-hold orders produce actionable user-facing states.

---

## 13. Out of Scope for v1.0

- Algorithmic trust scores.
- Follower counts.
- Public profile search directory.
- Messaging inbox.
- Blockchain network.
- Fully decentralized multi-operator production network.
- Automated content moderation.
- Rich media profile pages.
- Anonymous Humanity Cards.
- Any claims of legal identity verification.
- Treating live control proof as proof of legal identity or unique humanity.

---

## 14. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Looks like link-in-bio | Medium | High | Center card, proof, badge trail, vouching, and physical artifact ritual instead of links. |
| Printed QR persists after revocation | High | Medium | Printed QR resolves to revoked status; UI explains physical persistence before ordering. |
| Stolen sticker is treated as identity proof | Medium | High | Scan page warns that possession does not prove card ownership or identity; each item QR is individually revocable. |
| Printify dependency outage | Medium | Medium | Queue orders, show clear status, keep identity system independent from fulfillment. |
| User loses private key | Medium | High | Encrypted export bundle and recovery credentials. |
| Vouching collusion | Medium | High | Quotas, cooldowns, public audit trail, revocable vouches. |
| Overclaiming verification | Medium | High | Use precise labels: verified by device, vouches, ceremony, or steward. |
| PII leakage through print orders | Medium | High | Strict data separation, retention limits, and no shipping data on public profile records. |

---

## 15. Glossary

| Term | Definition |
|---|---|
| **Humanity Card** | Public signed identity card for a person in Humanity Commons. |
| **Card Owner** | Person controlling the private key for a card. |
| **QR Credential** | Signed object encoded in or referenced by a QR code. |
| **Network** | Service that resolves card IDs and QR credentials to public card data. |
| **Vouch** | Signed statement from one verified human about another human. |
| **Badge Trail** | Public list of badges and issuance evidence on a card. |
| **Print Artifact** | Physical object containing a Humanity QR code, such as sticker, card, shirt, or bag. |
| **Printify Fulfillment Middleware** | Humanity-controlled service that integrates Shopify-paid orders and Printify fulfillment. |
| **Revocation** | Owner action that invalidates active public resolution. |
| **Suspension** | Governance action that prevents normal resolution under documented rules. |

---

## 16. Document Approval

| Role | Signature | Date |
|---|---|---|
| Technical Architect | _____________ | _____ |
| Governance Lead | _____________ | _____ |
| Security Auditor | _____________ | _____ |
| Product Lead | _____________ | _____ |
| Collective Representative | _____________ | _____ |

---

**Next Steps After Ratification:**

1. Finalize Technical Standards v1.0 canonical payload and signature format.
2. Finalize Printify Fulfillment Middleware v1.0 templates and order lifecycle.
3. Build reference network and card web app.
4. Build verification/vouching service.
5. Launch founding Humanity Card cohort.
