**Version:** 1.0
**Status:** Draft for Collective Ratification
**Constitution Reference:** Humanity Commons Constitution (Articles I, III, VI)
**Technical Standards Reference:** Technical Standards v1.0
**Dependencies:** Humanity Card v1.0, QR Public Profile v1.0
**Related Features:** Storefront v1.0, Printify Fulfillment Middleware v1.0

---

## 1. Executive Summary

Human Verification v1.0 defines how Humanity Commons represents trust that a card belongs to a real, distinct human without requiring government ID, phone numbers, email addresses, or centralized identity brokers.

Verification is expressed through the Humanity Card. The card may show a public verification state, badge trail, vouch count, ceremony credential, or steward status. Verification is never purchased, never inferred from buying merchandise, and never delegated to Shopify, Printify, or fulfillment providers.

The goal is sybil resistance and portable human trust, not surveillance. V1 should be honest about what it can prove:

- A card may be registered but unverified.
- A card may be verified through vouches, ceremony, or accepted device proof.
- A card may be suspended or revoked.
- A product may be authentic without proving the wearer is verified.
- Buying or owning an artifact does not make someone verified.

---

## 2. Product Principles

| Principle | Requirement |
|---|---|
| Verification is earned | Commerce cannot grant verification state. |
| Privacy first | Verification must minimize identity exposure. |
| Human legible | Badge labels must be understandable without cryptography knowledge. |
| Cryptographically inspectable | Credentials, vouches, and status changes must be signed. |
| Anti-exclusion | Non-phone and non-ID fallback paths must exist. |
| Revocable with due process | Verification can be revoked or suspended only under documented rules. |
| Card-centered | Public verification state is displayed through Humanity Card and QR resolution. |

---

## 3. User Stories

### 3.1 Card Owner

| ID | Story |
|---|---|
| HV-US-01 | As a new user, I want to create a Humanity Card without phone, email, or government ID. |
| HV-US-02 | As a card owner, I want to become verified so scanners can trust that I am a distinct human. |
| HV-US-03 | As a card owner, I want my verification method to be visible at the right level of detail. |
| HV-US-04 | As a card owner, I want verification to remain separate from what I buy in the Storefront. |
| HV-US-05 | As a privacy-conscious user, I want verification to reveal as little private identity data as possible. |

### 3.2 Voucher

| ID | Story |
|---|---|
| HV-US-06 | As a verified human, I want to vouch for another person I know is a distinct human. |
| HV-US-07 | As a voucher, I want vouching to be meaningful, quota-limited, and revocable. |
| HV-US-08 | As a voucher, I want my public vouch trail to avoid exposing private notes or sensitive context. |

### 3.3 Scanner / Public Viewer

| ID | Story |
|---|---|
| HV-US-09 | As a scanner, I want to understand whether a Humanity Card is unverified, registered, verified, steward, revoked, or suspended. |
| HV-US-10 | As a scanner, I want to inspect public evidence for the badge without seeing private identity documents. |
| HV-US-11 | As a scanner, I want to know that a shirt, sticker, or card artifact does not itself prove the wearer is verified. |

### 3.4 Steward / Operator

| ID | Story |
|---|---|
| HV-US-12 | As a steward, I want to prevent sybil attacks without excluding people who lack modern devices or official documents. |
| HV-US-13 | As a trust and safety steward, I want suspension or revocation to require documented cause and appeal rights. |
| HV-US-14 | As an operator, I want verification credentials to integrate with Humanity Card status and QR resolution. |

---

## 4. Functional Requirements

### 4.1 Verification States

| ID | Requirement | Priority |
|---|---|---|
| HV-FR-01 | System MUST support public states: `unverified`, `registered`, `verified_human`, `steward`, `revoked`, and `suspended`. | P0 |
| HV-FR-02 | `unverified` means a public card exists but has no accepted human verification. | P0 |
| HV-FR-03 | `registered` means baseline anti-abuse registration is complete. | P0 |
| HV-FR-04 | `verified_human` means the card has accepted vouch, ceremony, or device proof credentials. | P0 |
| HV-FR-05 | `steward` means verified human plus ratified steward authority. | P0 |
| HV-FR-06 | `revoked` and `suspended` MUST override positive verification display. | P0 |

### 4.2 Baseline Registration

| ID | Requirement | Priority |
|---|---|---|
| HV-FR-07 | Creating a card MUST NOT require phone number, email, or government ID. | P0 |
| HV-FR-08 | Baseline registration MUST use rate limits and signed invite or waitlist controls for launch; local proof-of-work is explicitly deferred until abuse pressure justifies it. | P0 |
| HV-FR-09 | Baseline registration MUST NOT be described as proof of unique humanity. | P0 |
| HV-FR-10 | Registration metadata MUST be minimized and separated from public card data. | P0 |

### 4.3 Social Vouching

| ID | Requirement | Priority |
|---|---|---|
| HV-FR-11 | Verified humans MUST be able to vouch for registered or unverified card owners. | P0 |
| HV-FR-12 | Minimum vouches for `verified_human` MUST be 3 unless governance changes the threshold. | P0 |
| HV-FR-13 | Voucher quota MUST be 5 active vouches per year by default. | P0 |
| HV-FR-14 | New verified humans MUST wait 90 days before issuing vouches. | P0 |
| HV-FR-15 | Vouches MUST be signed by the voucher key. | P0 |
| HV-FR-16 | Vouches MUST be revocable if fraud, mistake, or harm is discovered. | P0 |
| HV-FR-17 | Public vouch display MUST expose only approved public evidence, not private notes. | P0 |

### 4.4 Ceremony Verification

| ID | Requirement | Priority |
|---|---|---|
| HV-FR-18 | System MUST support in-person ceremony credentials as a fallback path. | P0 |
| HV-FR-19 | Ceremony credential MUST require at least 3 steward signatures. | P0 |
| HV-FR-20 | Government ID MUST NOT be collected or stored by Humanity v1.0; ceremonies rely on steward attestations, not identity documents. | P0 |
| HV-FR-21 | Ceremony attendance records MUST minimize sensitive personal data. | P0 |
| HV-FR-22 | Ceremony credentials MUST be submitted as signed statements. | P0 |

### 4.5 Device-Based Proof

| ID | Requirement | Priority |
|---|---|---|
| HV-FR-23 | Device-based unique personhood proof is deferred from the first rebuild slice and MAY be added only after a privacy/security review. | P1 |
| HV-FR-24 | Device proof MUST NOT store biometric data. | P0 |
| HV-FR-25 | Device proof MUST reveal only accepted proof status, not legal identity. | P0 |
| HV-FR-26 | Device proof MUST not be the only verification path. | P0 |

### 4.6 Verification Display

| ID | Requirement | Priority |
|---|---|---|
| HV-FR-27 | Humanity Card MUST display current verification state. | P0 |
| HV-FR-28 | QR resolution MUST display current verification state or stale/offline warning. | P0 |
| HV-FR-29 | Verification badge MUST include method summary where public: vouch, ceremony, device proof, or steward. | P0 |
| HV-FR-30 | Public badge trail MUST include issuer, timestamp, credential ID, and signature reference. | P0 |
| HV-FR-31 | Revoked or suspended cards MUST not continue showing active verified badges. | P0 |

### 4.7 Commerce and Artifact Boundary

| ID | Requirement | Priority |
|---|---|---|
| HV-FR-32 | Buying a product MUST NOT grant or imply verification. | P0 |
| HV-FR-33 | Owning a physical artifact MUST NOT grant or imply verification. | P0 |
| HV-FR-34 | Product copy MUST distinguish "authentic artifact" from "verified human." | P0 |
| HV-FR-35 | Personalized QR artifacts MUST NOT print mutable verification state in v1.0; scans resolve current verification state dynamically. | P0 |
| HV-FR-36 | Printed verification state MUST be treated as stale after production and QR scans MUST resolve current status. | P0 |

### 4.8 Revocation and Suspension

| ID | Requirement | Priority |
|---|---|---|
| HV-FR-37 | Verification credentials MUST support revocation. | P0 |
| HV-FR-38 | Revoked or suspended vouchers MUST stop counting toward downstream verification when rules require it. | P0 |
| HV-FR-39 | Suspension MUST require documented cause, public status, and appeal path. | P0 |
| HV-FR-40 | Shadow suspension MUST NOT exist. | P0 |
| HV-FR-41 | Re-verification after revocation MUST follow governance-defined appeal or waiting period. | P1 |

---

## 5. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| HV-NFR-01 | Verification status lookup | < 500ms p95 |
| HV-NFR-02 | Vouch propagation | < 1 hour |
| HV-NFR-03 | Maximum public badge states | Small enough to understand at a glance |
| HV-NFR-04 | Default vouch threshold | 3 |
| HV-NFR-05 | Default voucher quota | 5 per year |
| HV-NFR-06 | New voucher waiting period | 90 days |
| HV-NFR-07 | Minimum ceremony steward signatures | 3 |

---

## 6. User Flows

### 6.1 Card Registration

```text
START
  |
User creates Humanity Card keypair
  |
User chooses handle and manifesto line
  |
System applies baseline anti-abuse control
  |
Card is published as registered or unverified
  |
User is offered verification paths
  |
END
```

### 6.2 Social Vouching

```text
START
  |
Registered card owner requests vouches
  |
Verified human scans or opens card
  |
Voucher confirms they know this is a distinct human
  |
Voucher signs vouch credential
  |
Credential is recorded and propagated
  |
When threshold is met, card becomes verified_human
  |
END
```

### 6.3 Ceremony Verification

```text
START
  |
Stewards schedule ceremony
  |
Attendee presents Humanity Card QR
  |
Stewards verify distinct human presence
  |
Stewards sign ceremony statements
  |
Credential bundle syncs to resolver
  |
Card becomes verified_human if threshold is met
  |
END
```

### 6.4 Storefront Boundary

```text
START
  |
Shopper buys artifact through Storefront
  |
Shopify processes checkout
  |
Verification state is unchanged
  |
QR scan shows current card status, not purchase status
  |
END
```

---

## 7. Data Models

### 7.1 Verification Credential

| Field | Type | Required | Description |
|---|---|---|---|
| `credential_id` | string | Yes | Unique credential ID. |
| `profile_id` | string | Yes | Card receiving credential. |
| `method` | enum | Yes | `vouch`, `ceremony`, `device_proof`, `steward`. |
| `level` | enum | Yes | Resulting state if active. |
| `issued_at` | datetime | Yes | Issuance time. |
| `expires_at` | datetime | No | Expiration if applicable. |
| `revoked_at` | datetime | No | Revocation time. |
| `issuer` | object | Yes | Issuer profile or authority reference. |
| `public_evidence` | object | No | Safe public proof summary. |
| `signature` | object | Yes | Signature over canonical payload. |

### 7.2 Vouch Record

| Field | Type | Required | Description |
|---|---|---|---|
| `vouch_id` | string | Yes | Unique vouch ID. |
| `voucher_profile_id` | string | Yes | Verified human issuing vouch. |
| `vouchee_profile_id` | string | Yes | Card owner receiving vouch. |
| `statement` | string | Yes | Standardized public vouch statement. |
| `private_note` | encrypted object | No | Optional private note, never public. |
| `issued_at` | datetime | Yes | Issuance time. |
| `revoked_at` | datetime | No | Revocation time. |
| `signature` | object | Yes | Voucher signature. |

### 7.3 Ceremony Credential

| Field | Type | Required | Description |
|---|---|---|---|
| `ceremony_id` | string | Yes | Ceremony reference. |
| `attendee_profile_id` | string | Yes | Card being verified. |
| `steward_profile_ids` | array | Yes | Steward signers. |
| `signed_statements` | array | Yes | Steward attestations. |
| `issued_at` | datetime | Yes | Issuance time. |
| `public_summary` | object | No | Safe public summary. |

### 7.4 Verification Summary

| Field | Type | Required | Description |
|---|---|---|---|
| `profile_id` | string | Yes | Humanity Card profile ID. |
| `state` | enum | Yes | Public verification state. |
| `method` | enum | No | Primary accepted verification method. |
| `vouch_count` | integer | No | Count of active accepted vouches. |
| `credential_ids` | array | Yes | Active public credential references. |
| `updated_at` | datetime | Yes | Summary update time. |
| `signature` | object | Yes | System or resolver signature. |

---

## 8. API Specifications

| Endpoint | Method | Description |
|---|---|---|
| `/v1/verification/status/{profile_id}` | GET | Get public verification summary. |
| `/v1/verification/vouches` | POST | Issue signed vouch. |
| `/v1/verification/vouches/{vouch_id}/revoke` | POST | Revoke signed vouch. |
| `/v1/verification/ceremonies/{ceremony_id}/credentials` | POST | Submit ceremony credential bundle. |
| `/v1/verification/device-proofs` | POST | Submit optional device proof. |
| `/v1/verification/credentials/{credential_id}` | GET | Inspect public credential evidence. |

---

## 9. Security and Privacy Requirements

| ID | Requirement |
|---|---|
| HV-SEC-01 | Verification credentials MUST be signed. |
| HV-SEC-02 | Private keys MUST remain device-held or encrypted in export bundles. |
| HV-SEC-03 | Vouch private notes MUST never appear on public cards. |
| HV-SEC-04 | Device proof MUST not store biometrics or legal identity. |
| HV-SEC-05 | Ceremony records MUST minimize sensitive personal data. |
| HV-SEC-06 | Shopify, Printify, and payment processors MUST NOT receive verification secrets. |
| HV-SEC-07 | Public artifact authenticity MUST be separate from human verification state. |
| HV-SEC-08 | Suspended/revoked state MUST override cached verified display after refresh. |

---

## 10. Governance Integration

| ID | Requirement |
|---|---|
| HV-GOV-01 | Verification thresholds are governance-controlled constants. |
| HV-GOV-02 | Steward status requires ratified contribution or election process. |
| HV-GOV-03 | Verification revocation requires documented rules and appeal path. |
| HV-GOV-04 | Changes to verification methods require ratification. |
| HV-GOV-05 | Transparency reports must publish aggregate counts without exposing private identities. |

---

## 11. Acceptance Criteria

### 11.1 V1 Complete

- User can create a Humanity Card without phone, email, or government ID.
- Card can show registered/unverified state.
- Verified humans can issue signed vouches.
- Threshold vouches upgrade card to `verified_human`.
- Ceremony credentials can upgrade card to `verified_human`.
- Public card shows verification summary and badge trail.
- Revocation/suspension overrides verified display.
- Storefront purchases do not affect verification state.
- Product and scan pages distinguish purchased artifacts from verified human status.

### 11.2 Governance Ready

- Verification thresholds are configurable by governance constants.
- Steward status and suspension process are documented.
- Transparency report can count credentials, revocations, and ceremonies.

---

## 12. Out of Scope for v1.0

- Government-ID-required verification.
- Buying verification.
- Phone-number-required verification.
- Biometric storage.
- Public directory of verified humans.
- Legal identity verification.
- Securities, equity, or cap table claims.
- Blockchain/NFT personhood credentials.

---

## 13. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Users think merch equals verification | Medium | High | Product copy and scan pages explicitly separate purchases from verification. |
| Social vouch collusion | Medium | High | Quotas, waiting periods, auditability, revocation. |
| Device proof excludes users | Medium | High | Keep vouching and ceremonies as first-class paths. |
| Steward capture | Medium | High | Governance controls, transparency, term limits if adopted. |
| Public badge leaks private context | Low | High | Public evidence schema and encrypted private notes. |

---

## 14. Glossary

| Term | Definition |
|---|---|
| **Registered** | Card has baseline anti-abuse registration but not proof of unique humanity. |
| **Verified Human** | Card has accepted vouch, ceremony, or device proof credentials. |
| **Steward** | Verified human with ratified operational/governance authority. |
| **Vouch** | Signed attestation from one verified human for another. |
| **Ceremony** | In-person verification event signed by stewards. |
| **Authentic Artifact** | Humanity-produced object; does not itself verify the human who holds it. |

---

## 15. Document Approval

| Role | Signature | Date |
|---|---|---|
| Technical Architect | _____________ | _____ |
| Governance Lead | _____________ | _____ |
| Security Auditor | _____________ | _____ |
| Collective Representative | _____________ | _____ |

---

**Next Steps After Ratification:**

1. Finalize vouch credential canonical payload.
2. Define governance constants for thresholds and quotas.
3. Implement verification summary in Humanity Card resolver.
4. Add storefront copy checks separating artifacts from verification.
