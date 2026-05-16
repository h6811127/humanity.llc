# Technical Standards v1.0 - Humanity Commons

**Version:** 1.0
**Status:** Draft for Collective Ratification
**Constitution Reference:** Humanity Commons Constitution (Articles I-VII)
**Feature References:** Humanity Card v1.0, Human Verification v1.0, Storefront v1.0, Printify Fulfillment Middleware v1.0

---

## 1. Scope

This document defines the v1.0 technical standards for Humanity Commons.

It covers:

- Humanity Card public profile documents.
- Profile IDs.
- Ed25519 keypairs and signatures.
- QR credentials.
- Resolver API behavior.
- Verification status and badge records.
- Revocation and suspension.
- Export bundles.
- Print artifact technical rules.
- Storefront identity boundaries.
- Printify Fulfillment Middleware integration boundaries.
- Security, privacy, and interoperability requirements.

Any resolver, client, scanner, Printify Fulfillment Middleware, or verification service claiming Humanity Commons v1.0 compatibility MUST conform to this standard.

---

## 2. Terminology

| Term | Definition |
|---|---|
| **Humanity Card** | Signed public profile object owned by a human. |
| **Card Owner** | Human controlling the private key for a card. |
| **Profile ID** | Opaque identifier for a Humanity Card. |
| **Resolver** | Service that resolves profile IDs and QR credentials. |
| **QR Credential** | Signed credential encoded in or referenced by a QR code. |
| **Verification Record** | Public or semi-public evidence contributing to verification status. |
| **Badge** | Signed public claim shown on a card. |
| **Vouch** | Signed statement by one verified human for another. |
| **Print Artifact** | Physical design containing a Humanity QR credential. |
| **Printify Fulfillment Middleware** | Humanity-controlled service integrating Shopify-paid orders and Printify fulfillment. |
| **Canonical JSON** | Deterministic JSON encoding used for signatures. |

---

## 3. Versioning

### 3.1 Protocol Version

The v1.0 protocol version string is:

```text
1.0
```

Fields that contain protocol version MUST use a string unless otherwise specified.

### 3.2 API Base

Resolvers MUST expose v1.0 APIs under:

```text
/.well-known/hc/v1/
```

### 3.3 Deprecation

When a breaking version is released:

- v1.0 MUST remain supported for at least 12 months after any breaking successor is launched.
- Deprecation MUST be announced at least 6 months before removal.
- Resolver responses MUST include deprecation metadata during the transition.

---

## 4. Profile ID

### 4.1 Requirements

Profile IDs MUST be:

- Opaque.
- Non-semantic.
- Generated with cryptographically secure randomness.
- Unique within a resolver.
- Portable across resolvers.
- Free of user-identifying metadata.

Profile IDs MUST NOT encode:

- Handle.
- Name.
- Timestamp.
- Region.
- Verification level.
- Resolver hostname.
- Print order data.

### 4.2 Format

The default profile ID format is:

```text
20-32 base58 characters
```

Allowed alphabet:

```text
123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
```

Excluded ambiguous characters:

```text
0 O I l
```

Resolvers MUST accept profile IDs of 20-32 base58 characters for v1.0. New IDs MUST be 24 base58 characters.

---

## 5. Keypairs and Signatures

### 5.1 Algorithm

All profile owner signatures MUST use Ed25519.

Required sizes:

| Item | Size |
|---|---|
| Public key | 32 bytes |
| Private key seed | 32 bytes |
| Signature | 64 bytes |

### 5.2 Encoding

Public keys and signatures MUST be encoded as base58 strings in JSON documents.

Private keys MUST NOT be transmitted to resolvers or Printify Fulfillment Middleware. If exported, private keys MUST be encrypted in the export bundle.

### 5.3 Signature Envelope

Signed records MUST use this envelope pattern:

```json
{
  "payload": {},
  "signature": {
    "alg": "Ed25519",
    "public_key": "base58-public-key",
    "signature": "base58-signature",
    "signed_at": "2026-05-16T17:00:00Z"
  }
}
```

### 5.4 Canonicalization

Before signing, JSON payloads MUST be canonicalized:

- UTF-8 encoding.
- No byte order mark.
- Lexicographic object key ordering.
- No insignificant whitespace.
- Deterministic number representation.
- Strings preserved exactly after validation.

Implementations MUST use RFC 8785 JSON Canonicalization Scheme for v1.0. All signed payloads MUST specify the canonicalization method as `JCS`.

### 5.5 Signature Use Cases

Signatures are REQUIRED for:

- Card creation.
- Card updates.
- QR credential issuance.
- QR rotation.
- Revocation.
- Vouches.
- Badge issuance.
- Export manifest.
- Suspension by governance keys.

---

## 6. Humanity Card Document

### 6.1 JSON Schema

A public Humanity Card JSON document MUST include:

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
  "verification": {
    "level": 1,
    "label": "Registered",
    "method": "registered",
    "verified_at": "2026-05-16T17:00:00Z",
    "vouch_count": 0
  },
  "badges": [],
  "qr": {
    "active_qr_id": "qr_123",
    "epoch": 1
  },
  "links": {
    "constitution": "https://humanity.llc/constitution",
    "governance": "https://humanity.llc/governance",
    "standards": "https://humanity.llc/standards/v1"
  },
  "signature": {
    "alg": "Ed25519",
    "public_key": "base58-ed25519-public-key",
    "signature": "base58-signature",
    "signed_at": "2026-05-16T17:00:00Z",
    "canonicalization": "JCS"
  }
}
```

### 6.2 Handle Rules

Handles MUST:

- Be 3-32 characters.
- Match `^[a-z][a-z0-9_]{2,31}$`.
- Start with a lowercase ASCII letter.
- Contain only lowercase ASCII letters, digits, and underscores.
- Not be a reserved handle.

Reserved handles include:

```text
admin administrator host resolver system test example support help info root api www
hc humanity commons profile profiles card cards qr resolve revoked suspended null
undefined false true 0 1 print orders shop verify verification governance constitution
```

### 6.3 Manifesto Line

Manifesto line MUST:

- Be plain text.
- Be 1-280 characters after trimming.
- Not contain HTML markup.
- Be UTF-8 encoded.

Resolvers MUST reject or sanitize markup before storage. Clients MUST show exact final text before signing.

### 6.4 Status

Allowed card statuses:

| Status | Meaning |
|---|---|
| `active` | Card resolves normally. |
| `revoked` | Owner revoked card. |
| `suspended` | Governance suspension is active. |
| `expired` | QR credential or card epoch expired. |

---

## 7. Verification and Badges

### 7.1 Verification Levels

| Level | Label | Meaning |
|---|---|---|
| 0 | Unverified | Public card exists but no verification is claimed. |
| 1 | Registered | Card owner passed baseline anti-abuse registration, not proof of unique humanity. |
| 2 | Verified Human | Card owner passed vouch threshold or ceremony requirements. Device proof is deferred until separately reviewed. |
| 3 | Steward | Verified human with ratified steward status. |

### 7.2 Verification Methods

Allowed methods:

```text
none
registered
device_proof
vouch
ceremony
steward
```

### 7.3 Badge Record

Badge records MUST be signed by an issuer key.

```json
{
  "badge_id": "badge_123",
  "type": "founding_human",
  "label": "Founding Human",
  "issuer": "humanity.llc",
  "issued_to": "profile_id",
  "issued_at": "2026-05-16T17:00:00Z",
  "evidence_uri": "https://humanity.llc/badges/founding-human",
  "signature": {
    "alg": "Ed25519",
    "public_key": "issuer-public-key",
    "signature": "base58-signature",
    "signed_at": "2026-05-16T17:00:00Z"
  }
}
```

### 7.4 Vouch Record

```json
{
  "vouch_id": "vouch_123",
  "voucher_profile_id": "profile_a",
  "vouchee_profile_id": "profile_b",
  "statement": "I attest that this is a distinct human I know.",
  "method": "in_person",
  "created_at": "2026-05-16T17:00:00Z",
  "revoked": false,
  "signature": {
    "alg": "Ed25519",
    "public_key": "voucher-public-key",
    "signature": "base58-signature",
    "signed_at": "2026-05-16T17:00:00Z"
  }
}
```

Vouches MUST NOT contain private notes in the public record.

---

## 8. QR Credential Standard

### 8.1 QR Payload Goals

QR payloads MUST be:

- Short enough for reliable printing.
- Stable enough for physical artifacts.
- Revocable through resolver status.
- Verifiable by clients.
- Free of personal data beyond opaque IDs and resolver hints.

### 8.2 URI Scheme

The canonical v1 URI scheme is:

```text
hc://card/{profile_id}?q={qr_id}
```

Printed artifacts MUST use this HTTPS fallback for consumer phone cameras:

```text
https://humanity.llc/c/{profile_id}?q={qr_id}
```

Resolvers MUST support HTTPS fallback for consumer phone cameras.

### 8.3 QR Credential Object

The QR payload references a resolver-stored QR credential:

```json
{
  "qr_id": "qr_123",
  "profile_id": "base58-profile-id",
  "epoch": 1,
  "resolver_hint": "https://humanity.llc",
  "issued_at": "2026-05-16T17:00:00Z",
  "expires_at": "2026-06-15T17:00:00Z",
  "status": "active",
  "signature": {
    "alg": "Ed25519",
    "public_key": "owner-public-key",
    "signature": "base58-signature",
    "signed_at": "2026-05-16T17:00:00Z"
  }
}
```

### 8.4 Printed QR Codes

Printed QR codes MUST resolve even after expiration or revocation. They MUST display a status page explaining:

- Active.
- Revoked by owner.
- Suspended by governance.
- Expired and replaced by newer credential.
- Unknown or invalid.

Printed QR codes MUST NOT encode shipping address, order ID, email, phone, or private profile data.

### 8.5 QR Output Requirements

For print artifacts:

- Minimum error correction level: M.
- Recommended error correction level: Q for stickers and apparel.
- Quiet zone MUST be preserved.
- Minimum physical QR size MUST be defined per artifact template.
- QR MUST pass scan QA before order submission.

---

## 9. Resolver API

### 9.1 Required Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `GET /.well-known/hc/v1/health` | GET | Resolver health. |
| `POST /.well-known/hc/v1/cards` | POST | Create card. |
| `GET /.well-known/hc/v1/cards/{profile_id}` | GET | Resolve card JSON/HTML. |
| `GET /.well-known/hc/v1/cards/{profile_id}/status` | GET | Resolve card status. |
| `POST /.well-known/hc/v1/cards/{profile_id}/revoke` | POST | Submit signed revocation. |
| `GET /.well-known/hc/v1/qr/{qr_id}` | GET | Retrieve QR credential metadata. |
| `POST /.well-known/hc/v1/cards/{profile_id}/export` | POST | Request export bundle. |

### 9.2 Headers

Resolver responses MUST include:

| Header | Value |
|---|---|
| `X-Resolver-Version` | `1.0` |
| `Content-Type` | `application/json` or `text/html` |
| `Cache-Control` | As specified per status. |

### 9.3 Cache Control

| Response Type | Cache-Control |
|---|---|
| Active card JSON | `public, max-age=300, stale-while-revalidate=3600` |
| Active card HTML | `public, max-age=300, stale-while-revalidate=3600` |
| Revoked status | `public, max-age=60` |
| Suspended status | `public, max-age=60` |
| QR credential active | `public, max-age=300` |
| QR credential revoked/expired | `public, max-age=60` |

### 9.4 Content Negotiation

Resolvers MUST support:

- `Accept: application/json` for JSON.
- `Accept: text/html` for HTML.
- Browser default Accept headers for HTML.

Resolvers MUST implement proper HTTP Accept parsing instead of substring-only matching.

### 9.5 Status Codes

| Status | Meaning |
|---|---|
| 200 | Success. |
| 201 | Created. |
| 202 | Accepted async job. |
| 400 | Malformed request or validation failure. |
| 401 | Missing or invalid signature/authentication. |
| 403 | Suspended or forbidden action. |
| 404 | Unknown card or QR credential. |
| 409 | Conflict such as handle already taken. |
| 410 | Revoked card. |
| 422 | Semantically invalid signed payload. |
| 429 | Rate limited. |
| 500 | Resolver error. |

---

## 10. Revocation

### 10.1 Revocation Statement

Revocation MUST be signed by the card owner's private key or accepted recovery key.

```json
{
  "profile_id": "base58-profile-id",
  "reason": "owner_revoked",
  "revoked_at": "2026-05-16T17:00:00Z",
  "nonce": "base58-random-nonce",
  "signature": {
    "alg": "Ed25519",
    "public_key": "owner-public-key",
    "signature": "base58-signature",
    "signed_at": "2026-05-16T17:00:00Z"
  }
}
```

### 10.2 Revoked Behavior

After revocation:

- Card JSON returns `410` unless requesting historical export.
- Card HTML displays a clear revoked notice.
- QR credential status returns revoked.
- New print orders are blocked.
- Existing physical artifacts are not recalled.
- Printed QR codes resolve to revoked status.

---

## 11. Suspension

Suspension is a governance action, not an owner action.

Suspension records MUST include:

- Profile ID.
- Cause category.
- Public notice.
- Issuing governance key(s).
- Appeal deadline.
- Signature.

No shadow suspension is allowed. A card must resolve as active, revoked, suspended, expired, unknown, or invalid.

---

## 12. Export Bundle

### 12.1 Required Contents

Export bundle MUST include:

- Public card document.
- QR credential history.
- Badge records.
- Vouch records involving the profile.
- Resolver list.
- Print artifact metadata.
- Encrypted private key backup if user opts in.
- Manifest file.
- Manifest signature.

### 12.2 Excluded Contents

Export bundle MUST NOT include:

- Raw Printify API tokens.
- Payment processor secrets.
- Full shipping address history unless user explicitly requests order data export.
- Scanner analytics unless explicit scan logging was enabled.

---

## 13. Print Artifact Standards

### 13.1 Artifact Data Boundary

Print artifacts MUST include only owner-approved fields from this allowed set:

- QR code.
- Public handle.
- Public badge label.
- Humanity wordmark.
- Short public phrase approved by the owner.

Print artifacts MUST NOT include:

- Private keys.
- Recovery codes.
- Shipping details.
- Vouch-private notes.
- Private profile layer data.
- Hidden tracking pixels.

### 13.2 Printify Fulfillment Middleware Requirements

Printify Fulfillment Middleware MUST:

- Generate print-ready QR artwork.
- Verify active QR status before order submission.
- Validate scanability before order submission.
- Store print order PII separately from public profile data.
- Use server-side Printify credentials only.
- Process Printify webhooks idempotently.

### 13.3 Printify Integration

The Printify adapter MUST treat Printify as a fulfillment provider only. Printify is not an identity provider, resolver, verifier, badge issuer, or governance participant.

---

## 14. Privacy Requirements

| Requirement | Standard |
|---|---|
| Phone/email for card creation | MUST NOT be required. |
| Government ID for card creation | MUST NOT be required. |
| Scan analytics | Disabled by default. |
| Resolver logs | IP anonymization required. |
| Print order PII | Separate encrypted order domain. |
| Private keys | Device-only or encrypted export. |
| Public card data | Explicit owner-selected data only. |

---

## 15. Rate Limits

Resolvers MUST enforce:

| Endpoint Class | Limit |
|---|---|
| Card resolution | 300 requests/IP/minute |
| Card creation | 10 requests/IP/hour |
| Revocation | 10 requests/profile/hour |
| Vouch creation | Per Human Verification v1.0 quota |
| Print quotes | 60 requests/user/hour |
| Print order creation | 10 requests/user/hour |

Printify Fulfillment Middleware MUST additionally respect Printify provider limits.

---

## 16. Interoperability Tests

A v1.0 implementation is compliant if it passes tests for:

- Profile ID generation.
- Handle validation.
- Manifesto validation.
- Canonical JSON signing and verification.
- Card creation.
- Card JSON resolution.
- Card HTML resolution.
- QR credential creation.
- QR scan fallback.
- Revocation.
- Suspension status.
- Badge signature verification.
- Vouch signature verification.
- Export manifest verification.
- Print artifact QR scanability.
- Printify Fulfillment Middleware order idempotency.

---

## 17. Security Considerations

Implementations MUST consider:

- Private key loss.
- Replay attacks against signed payloads.
- Signature confusion between payload types.
- QR credential expiration.
- Revoked printed artifacts.
- Vouch collusion.
- Resolver impersonation.
- Webhook spoofing.
- Print order duplication.
- Shipping PII leakage.
- Cache staleness after revocation.

All signed payloads MUST include:

- Payload type.
- Protocol version.
- Timestamp.
- Nonce or unique ID.
- Subject profile ID.

---

## 18. Change Log

| Version | Date | Changes |
|---|---|---|
| 1.0-draft | 2026-05-16 | Initial v1.0 technical standards draft. |

---

## 19. Document Approval

| Role | Signature | Date |
|---|---|---|
| Technical Lead | _____________ | _____ |
| Standards Editor | _____________ | _____ |
| Security Auditor | _____________ | _____ |
| Governance Representative | _____________ | _____ |

---

This document is intended for collective ratification before implementation is considered v1.0 compliant.
