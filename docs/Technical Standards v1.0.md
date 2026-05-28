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
- Root cards and child-object authority.
- Live control proof challenges.
- Network API behavior.
- Verification status and badge records.
- Revocation and suspension.
- Export bundles.
- Print artifact technical rules.
- Storefront identity boundaries.
- Printify Fulfillment Middleware integration boundaries.
- Security, privacy, and interoperability requirements.

Any network, client, scanner, Printify Fulfillment Middleware, or verification service claiming Humanity Commons v1.0 compatibility MUST conform to this standard.

**Federation:** Multiple operators MAY implement this standard. See §9.6–9.7 and `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`.

**Optional hosted steward extensions (planning, not v1.0):** [`HOSTED_TIER_TECHNICAL_STANDARDS_DELTA.md`](HOSTED_TIER_TECHNICAL_STANDARDS_DELTA.md) — `steward_account_link_v1`, operator capabilities discovery; ratification target v1.1.

---

## 2. Terminology

| Term | Definition |
|---|---|
| **Root Humanity Card** | Signed public profile object owned by a human or steward-controlled root. It is the default signing authority for its child objects. |
| **Humanity Card** | Compatibility term for a root Humanity Card unless a section explicitly describes a child object. |
| **Card Owner** | Human or steward controlling the root card owner key. |
| **Profile ID** | Opaque identifier for a root Humanity Card. |
| **Child Object** | Public object nested under a root card. It has its own lifecycle and QR credentials but no default private key. |
| **Object ID** | Future opaque identifier for a child object. Until object endpoints ship, `print_artifact_id` and pilot template metadata are the v1 bridge. |
| **Network** | Service that resolves profile IDs and QR credentials. |
| **QR Credential** | Signed credential encoded in or referenced by a QR code. |
| **Printed-Item QR** | Item-scoped QR credential printed on one physical artifact and individually revocable; the first shipped child-object-like scope. |
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

Networks MUST expose v1.0 APIs under:

```text
/.well-known/hc/v1/
```

### 3.3 Deprecation

When a breaking version is released:

- v1.0 MUST remain supported for at least 12 months after any breaking successor is launched.
- Deprecation MUST be announced at least 6 months before removal.
- Network responses MUST include deprecation metadata during the transition.

---

## 4. Profile ID

### 4.1 Requirements

Profile IDs MUST be:

- Opaque.
- Non-semantic.
- Generated with cryptographically secure randomness.
- Unique within a network.
- Portable across networks.
- Free of user-identifying metadata.

Profile IDs MUST NOT encode:

- Handle.
- Name.
- Timestamp.
- Region.
- Verification level.
- Network hostname.
- Print order data.

Profile IDs identify root cards, not every public object the root controls. New child-object identifiers MUST be opaque, non-semantic, and free of user-identifying metadata by the same rules.

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

Networks MUST accept profile IDs of 20-32 base58 characters for v1.0. New IDs MUST be 24 base58 characters.

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

Private keys MUST NOT be transmitted to networks or Printify Fulfillment Middleware. If exported, private keys MUST be encrypted in the export bundle.

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
- Child object creation and updates.
- QR credential issuance.
- QR rotation.
- Live control proof challenge responses.
- Revocation.
- Vouches.
- Badge issuance.
- Export manifest.
- Suspension by governance keys.

Child-object mutations MUST be signed by the parent root owner key, accepted recovery key, or a future root-signed delegated child capability.

---

## 6. Humanity Card Document

Humanity Card documents are root documents. Human verification, vouches, Steward status, and live-control authority attach to this root unless a future standard explicitly defines a narrower delegated capability.

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
    "vouch_count": 0,
    "latest_accepted_vouch_at": null
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
admin administrator host network system test example support help info root api www
hc humanity commons profile profiles card cards qr resolve revoked suspended null
undefined false true 0 1 print orders shop verify verification governance constitution
```

### 6.3 Manifesto Line

Manifesto line MUST:

- Be plain text.
- Be 1-280 characters after trimming.
- Not contain HTML markup.
- Be UTF-8 encoded.

Networks MUST reject or sanitize markup before storage. Clients MUST show exact final text before signing.

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

## 7A. Child Object Documents

### 7A.1 Authority

Child objects are controlled by a root Humanity Card. By default, child object create, update, rotate, revoke, replace, and disable operations MUST be signed by the root owner key or accepted recovery key.

Networks MUST NOT require a new private key for each child object. A future delegated capability MAY authorize limited child operations when it is:

- Signed by the root key.
- Scoped to one child object or operation class.
- Expiring.
- Revocable by the root key.
- Not valid for vouching, root disable, or human verification changes.

### 7A.2 Minimum document shape (target)

The future child object document SHOULD use this parent-signed shape:

```json
{
  "version": "1.0",
  "object_id": "obj_opaque-id",
  "parent_profile_id": "base58-profile-id",
  "object_type": "status_plate",
  "public_label": "Studio door",
  "public_state": "Open",
  "status": "active",
  "created_at": "2026-05-16T17:00:00Z",
  "updated_at": "2026-05-16T17:00:00Z",
  "signature": {
    "alg": "Ed25519",
    "public_key": "root-owner-public-key",
    "signature": "base58-signature",
    "signed_at": "2026-05-16T17:00:00Z",
    "canonicalization": "JCS"
  }
}
```

### 7A.3 V1 bridge

Until child object endpoints ship, `scope: "print_artifact"`, `print_artifact_id`, `pilot_template`, and object-forward manifesto layouts are compatibility bridges. They MUST be explained as child-object-like surfaces controlled by the parent root card, not as separate humans or separately keyed identities.

---

## 8. QR Credential Standard

### 8.1 QR Payload Goals

QR payloads MUST be:

- Short enough for reliable printing.
- Stable enough for physical artifacts.
- Revocable through network status.
- Verifiable by clients.
- Free of personal data beyond opaque IDs and network hints.

Personalized printed artifacts MUST use item-scoped QR credentials. A root card owner ordering multiple personalized physical items receives distinct `qr_id` values per item unless a product explicitly uses a disclosed batch QR policy. All item-scoped QR credentials resolve through the same parent root card and may identify a child object / printed item, but each item QR can be revoked independently.

### 8.2 URI Scheme

The canonical v1 URI scheme is:

```text
hc://card/{profile_id}?q={qr_id}
```

Printed artifacts MUST use this HTTPS fallback for consumer phone cameras:

```text
https://humanity.llc/c/{profile_id}?q={qr_id}
```

Networks MUST support HTTPS fallback for consumer phone cameras.

### 8.3 QR Credential Object

The QR payload references a network-stored QR credential:

```json
{
  "qr_id": "qr_123",
  "profile_id": "base58-profile-id",
  "epoch": 1,
  "scope": "print_artifact",
  "print_artifact_id": "pa_123",
  "resolver_hint": "https://humanity.llc",
  "issued_at": "2026-05-16T17:00:00Z",
  "expires_at": null,
  "status": "active",
  "signature": {
    "alg": "Ed25519",
    "public_key": "owner-public-key",
    "signature": "base58-signature",
    "signed_at": "2026-05-16T17:00:00Z"
  }
}
```

For `scope: "print_artifact"` (founding physical merch), `expires_at` SHOULD be `null` unless the SKU is an explicit timed-event product. Digital `scope: "card"` credentials MAY use `expires_at`. Product policy: [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md).

### 8.4 Printed QR Codes

Printed QR codes MUST resolve even after expiration or revocation. They MUST display a status page explaining:

- Active.
- Revoked by owner.
- Suspended by governance.
- Expired and replaced by newer credential.
- Unknown or invalid.

Printed QR codes MUST NOT encode shipping address, order ID, email, phone, or private profile data.

Printed-item QR scan pages MUST state that the QR resolves through a root Humanity Card or child object controlled by that root, but does not prove the person holding the physical item is the card owner or verified human.

### 8.5 QR Output Requirements

For print artifacts:

- Minimum error correction level: M (no center logo).
- **Shipped generator default:** error correction level **Q** with a module-masked two-tone mark on the top-left finder (dusty rose + warm ink, ~21% of QR width). See [`docs/QR_BRANDING.md`](QR_BRANDING.md).
- Recommended error correction level: Q for stickers and apparel (required when center logo is enabled).
- Quiet zone MUST be preserved.
- Minimum physical QR size MUST be defined per artifact template.
- QR MUST pass scan QA before print submission.
- Center logo MUST NOT obscure finder patterns; tints apply to dark modules only so whitespace stays scannable on white substrate.

### 8.6 Live Control Proof

Live control proof is an optional v1.1-compatible trust upgrade that proves recent control of the active Humanity Card key. It is not legal identity verification, human uniqueness proof, or a vouch.

The recommended flow is:

```text
Scanner opens card
  -> scanner requests challenge
  -> owner reviews challenge on key-holding device
  -> owner signs challenge
  -> scanner sees recent control proof
```

Live control challenges MUST include:

| Field | Requirement |
|---|---|
| `challenge_id` | Opaque unique ID. |
| `type` | `live_control_challenge`. |
| `version` | Protocol version string. |
| `profile_id` | Subject Humanity Card profile ID. |
| `qr_id` | QR credential ID when challenge originated from a QR scan. |
| `nonce` | Cryptographically random challenge nonce. |
| `issued_at` | Challenge creation time. |
| `expires_at` | 30-120 seconds after creation. |
| `verifier_session_id` | Opaque session reference for the scanner page. |

Challenge responses MUST be signed by the card owner's active key or an accepted recovery/rotation key.

```json
{
  "type": "live_control_response",
  "version": "1.0",
  "challenge_id": "lc_123",
  "profile_id": "base58-profile-id",
  "qr_id": "qr_123",
  "signed_at": "2026-05-16T17:00:00Z",
  "signature": {
    "alg": "Ed25519",
    "public_key": "base58-ed25519-public-key",
    "signature": "base58-signature",
    "signed_at": "2026-05-16T17:00:00Z",
    "canonicalization": "JCS"
  }
}
```

Live control proof MUST be:

- Single-use.
- Short-lived.
- Displayed as recent evidence only.
- Separated from vouch, verification, and artifact ownership states in the UI.
- Labeled with a plain-language limitation such as: "Control proven moments ago. This does not prove legal identity."

---

## 9. Network API

### 9.1 Required Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `GET /.well-known/hc/v1/health` | GET | Network health. |
| `POST /.well-known/hc/v1/cards` | POST | Create card. |
| `GET /.well-known/hc/v1/cards/{profile_id}` | GET | Resolve card JSON/HTML. |
| `GET /.well-known/hc/v1/cards/{profile_id}/status` | GET | Resolve card status. |
| `POST /.well-known/hc/v1/cards/{profile_id}/revoke` | POST | Submit signed revocation. |
| `GET /.well-known/hc/v1/qr/{qr_id}` | GET | Retrieve QR credential metadata. |
| `POST /.well-known/hc/v1/cards/{profile_id}/live-control/challenges` | POST | Create short-lived live control challenge. |
| `POST /.well-known/hc/v1/cards/{profile_id}/live-control/responses` | POST | Submit signed live control challenge response. |
| `POST /.well-known/hc/v1/cards/{profile_id}/export` | POST | Request export bundle. |

### 9.2 Headers

Network responses MUST include:

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

Networks MUST support:

- `Accept: application/json` for JSON.
- `Accept: text/html` for HTML.
- Browser default Accept headers for HTML.

Networks MUST implement proper HTTP Accept parsing instead of substring-only matching.

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
| 500 | Network error. |

### 9.6 Federated Operators

Humanity Commons v1.0 is designed for **multiple network operators** implementing the same API. humanity.llc MAY run the reference operator; it MUST NOT be the only compatible implementation in the long-term architecture.

#### 9.6.1 Operator identity

Network HTTP responses SHOULD include:

| Header | Description |
|---|---|
| `X-Resolver-Operator` | Stable operator identifier (e.g. `humanity.llc`, `union.example.org`). |
| `X-Resolver-Version` | Protocol version (`1.0`). |

JSON responses MAY include equivalent fields in a `network` object.

#### 9.6.2 Operator requirements

Operators claiming `/.well-known/hc/v1/` compatibility MUST:

- Implement required endpoints in §9.1.
- Publish operator name, abuse/legal process summary, and **data retention policy** (see `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md` §5).
- Default to **no scan analytics** unless a governance-approved consent model exists.
- Never require government ID, phone, or email for card creation in the reference profile.
- Keep commerce PII out of network storage.

#### 9.6.3 Reference operator

The humanity.llc reference operator is the default target for printed HTTPS fallback URLs in v1.0:

```text
https://humanity.llc/c/{profile_id}?q={qr_id}
```

Clients SHOULD support configurable network base URLs for portability and second-network-operator federation.

#### 9.6.4 Cross-operator behavior (v1.0)

v1.0 does NOT require automatic cross-operator vouch sync. Export bundles and documented card formats are the portability mechanism until federation sync is specified in a later version.

### 9.7 Network Data Minimization

Reference-operator normative limits (all operators SHOULD align):

| Category | Policy |
|---|---|
| Card creation | No legal ID, phone, or email required. |
| Private keys | MUST NOT be stored. |
| Scan analytics | MUST NOT be collected by default. |
| Access logs | MUST NOT exist by default; if enabled, requires published governance policy and retention cap. |
| Commerce PII | MUST NOT be stored in network tables. |

Suspension records MAY include public notice fields required for appeals.

---

## 10. Revocation

### 10.1 Revocation Statement

Revocation MUST be signed by the root card owner's private key, accepted recovery key, or a future delegated child capability when the target is limited to that child.

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
- Item-scoped printed QR revocation invalidates only that printed item QR unless the card or source credential is also revoked.
- Root card revocation or suspension cascades to child objects so no child continues presenting active human trust after the parent root is disabled.

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
- Child object metadata and parent/child relationship records when present.
- QR credential history.
- Badge records.
- Vouch records involving the profile.
- Network list.
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

Print artifacts MAY include a static warning or short URL copy, but mutable verification labels such as "Verified Human" MUST NOT be printed directly on v1.0 artifacts.

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
- Generate or consume a unique item-scoped QR credential for each personalized physical item.
- Verify active QR status before order submission.
- Validate scanability before order submission.
- Store print order PII separately from public profile data.
- Use server-side Printify credentials only.
- Process Printify webhooks idempotently.

### 13.3 Printify Integration

The Printify adapter MUST treat Printify as a fulfillment provider only. Printify is not an identity provider, network, verifier, badge issuer, or governance participant.

---

## 14. Privacy Requirements

| Requirement | Standard |
|---|---|
| Phone/email for card creation | MUST NOT be required. |
| Government ID for card creation | MUST NOT be required. |
| Scan analytics | Disabled by default. |
| Network logs | IP anonymization required. |
| Print order PII | Separate encrypted order domain. |
| Private keys | Device-only or encrypted export. |
| Public card data | Explicit owner-selected data only. |

---

## 15. Rate Limits

Networks MUST enforce:

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
- Individual printed-item QR revocation.
- Printify Fulfillment Middleware order idempotency.

---

## 17. Security Considerations

Implementations MUST consider:

- Private key loss.
- Replay attacks against signed payloads.
- Signature confusion between payload types.
- QR credential expiration.
- Revoked printed artifacts.
- Confusing live control proof with legal identity or human uniqueness.
- Vouch collusion.
- Network impersonation.
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
| 1.0-draft | 2026-05-26 | Pointer to hosted-tier planning annex (M6) — no normative v1.0 change. |

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
