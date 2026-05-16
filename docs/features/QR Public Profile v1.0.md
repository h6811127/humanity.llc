**Version:** 1.0
**Status:** Draft for Collective Ratification
**Constitution Reference:** Humanity Commons Constitution (Articles I-VII)
**Technical Standards Reference:** Technical Standards v1.0
**Dependencies:** Humanity Card v1.0, Human Verification v1.0

---

## 1. Executive Summary

QR Public Profile v1.0 defines how public Humanity Card data is encoded, resolved, displayed, cached, revoked, and printed.

In earlier prototypes, the QR system was treated as a small public profile resolver. In v1.0, the QR system is a core verification surface for Humanity Cards and physical artifacts. A scanned QR should answer:

- Which Humanity Card or artifact is this?
- Is it active, revoked, suspended, expired, or unknown?
- Is the resolver response signed?
- What public information did the card owner choose to show?
- What verification state or badge trail is visible?

QR Public Profile v1.0 is not a link-in-bio system. It is the public resolution layer for signed, revocable proof objects.

---

## 2. Product Principles

| Principle | Requirement |
|---|---|
| Public by consent | Only the public card layer is visible to unauthenticated scanners. |
| Signed by default | QR credentials and card documents are signed. |
| Revocation visible | Revoked cards and artifacts resolve to clear revoked status. |
| Print-safe | QR payloads and artwork are designed for physical use. |
| Offline-aware | Cached cards are allowed only with stale-state disclosure. |
| No scan surveillance | Scan analytics are disabled by default. |
| Provider-independent | QR validity is controlled by Humanity resolvers, not Shopify or Printify. |

---

## 3. User Stories

### 3.1 Card Owner

| ID | Story |
|---|---|
| QR-US-01 | As a card owner, I want a QR credential that resolves to my Humanity Card. |
| QR-US-02 | As a card owner, I want to print or wear a QR without giving up revocation control. |
| QR-US-03 | As a card owner, I want QR-bearing products to use my current active QR credential. |
| QR-US-04 | As a card owner, I want old printed QR codes to show revoked or expired status when appropriate. |
| QR-US-05 | As a card owner, I want QR-bearing artifacts to resolve to current card status. |

### 3.2 Scanner

| ID | Story |
|---|---|
| QR-US-06 | As a scanner, I want a QR to resolve quickly on a normal phone camera. |
| QR-US-07 | As a scanner, I want to see the public Humanity Card without installing an app. |
| QR-US-08 | As a scanner, I want to know whether I am viewing cached or current data. |
| QR-US-09 | As a scanner, I want clear status for revoked, suspended, expired, or unknown QR credentials. |

### 3.3 Operator

| ID | Story |
|---|---|
| QR-US-11 | As an operator, I want QR payloads to be short, stable, and print-safe. |
| QR-US-12 | As an operator, I want QR generation to integrate with the Storefront and Printify Fulfillment Middleware. |
| QR-US-13 | As an operator, I want QR resolution to work even if Shopify or Printify is down. |
| QR-US-14 | As an operator, I want no default scan analytics to preserve trust. |

---

## 4. Functional Requirements

### 4.1 QR Credential Generation

| ID | Requirement | Priority |
|---|---|---|
| QR-FR-01 | System MUST generate a signed QR credential for each active Humanity Card. | P0 |
| QR-FR-02 | QR credential MUST include profile ID, QR ID, epoch, issued_at, expires_at, resolver hint, status, and signature. | P0 |
| QR-FR-03 | QR credential MUST be signed with the card owner's key or authorized recovery/rotation key. | P0 |
| QR-FR-04 | QR ID MUST be opaque and not encode personal data. | P0 |
| QR-FR-05 | QR payload MUST be short enough for reliable print scanning. | P0 |

### 4.2 URI and Fallback Resolution

| ID | Requirement | Priority |
|---|---|---|
| QR-FR-06 | Canonical custom URI MUST be `hc://card/{profile_id}?q={qr_id}` for app/native clients. | P0 |
| QR-FR-07 | HTTPS fallback MUST be supported for phone cameras: `https://humanity.llc/c/{profile_id}?q={qr_id}`. | P0 |
| QR-FR-08 | Printed artifacts MUST use HTTPS fallback for phone-camera compatibility. | P0 |
| QR-FR-09 | Resolver MUST reject malformed QR payloads and unknown QR IDs. | P0 |

### 4.3 Public Card Resolution

| ID | Requirement | Priority |
|---|---|---|
| QR-FR-10 | QR resolution MUST return a public Humanity Card view for active cards. | P0 |
| QR-FR-11 | Resolution MUST support HTML for browsers and JSON for clients. | P0 |
| QR-FR-12 | Public card view MUST include verification status and badge trail. | P0 |
| QR-FR-13 | Public card view MUST not expose private or semi-public profile layers. | P0 |
| QR-FR-14 | Public card view MUST link to constitution, governance, and technical standards. | P0 |

### 4.4 Printing

| ID | Requirement | Priority |
|---|---|---|
| QR-FR-15 | QR PNG/SVG/PDF outputs MUST be generated at print-safe resolution. | P0 |
| QR-FR-16 | QR artwork MUST preserve quiet zone and minimum physical size. | P0 |
| QR-FR-17 | QR artwork MUST pass scan QA before Printify order submission. | P0 |
| QR-FR-18 | QR-bearing storefront products MUST use active QR credentials only. | P0 |
| QR-FR-19 | Revoked, suspended, or expired QR credentials MUST block new print orders. | P0 |

### 4.5 Revocation and Expiration

| ID | Requirement | Priority |
|---|---|---|
| QR-FR-20 | Owner MUST be able to revoke active QR credentials. | P0 |
| QR-FR-21 | Revoked QR credentials MUST resolve to revoked status, not 404. | P0 |
| QR-FR-22 | Expired QR credentials MUST resolve to expired/replaced status. | P0 |
| QR-FR-23 | Revocation MUST not attempt to physically recall shipped artifacts. | P0 |
| QR-FR-24 | Public copy MUST explain that printed QR artifacts may still exist after revocation. | P0 |

### 4.6 Offline and Cache Behavior

| ID | Requirement | Priority |
|---|---|---|
| QR-FR-25 | Clients MUST NOT cache active card views for offline use unless the cached UI clearly shows stale/offline state. | P0 |
| QR-FR-26 | Cached views MUST show offline/stale status. | P0 |
| QR-FR-27 | Clients MUST attempt refresh when connectivity returns. | P0 |
| QR-FR-28 | Revoked/suspended status MUST use short cache lifetimes. | P0 |
| QR-FR-29 | Cached active cards MUST NOT claim current validity while offline. | P0 |

### 4.7 Privacy and Transparency

| ID | Requirement | Priority |
|---|---|---|
| QR-FR-30 | Resolver MUST NOT collect scan analytics by default. | P0 |
| QR-FR-31 | Resolver access logs MUST anonymize IP addresses. | P0 |
| QR-FR-32 | Scanner-visible page MUST disclose if any logging is active. | P0 |
| QR-FR-33 | Any future scan logging MUST require explicit consent policy. | P1 |

---

## 5. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| QR-NFR-01 | QR scan-to-first-render | < 2s p95 on LTE |
| QR-NFR-02 | QR payload length | <= 120 chars where possible |
| QR-NFR-03 | Card HTML first byte | < 500ms p95 |
| QR-NFR-04 | Card JSON first byte | < 300ms p95 |
| QR-NFR-05 | Printed QR scan QA pass rate | >= 99% in standard QA sample |
| QR-NFR-06 | Active card cache TTL | <= 5 minutes plus stale-while-revalidate |
| QR-NFR-07 | Revoked/suspended cache TTL | <= 60 seconds |
| QR-NFR-08 | Offline cache availability | 30 days maximum unless refreshed |

---

## 6. User Flows

### 6.1 Card QR Creation

```text
START
  |
User creates Humanity Card
  |
Client signs card document
  |
Resolver stores public card
  |
System issues signed QR credential
  |
User sees web QR and print options
  |
END
```

### 6.2 Scan Public Card QR

```text
START
  |
Scanner opens HTTPS QR URL
  |
Resolver validates profile_id and qr_id
  |
Resolver checks card and QR status
  |
If active: render Humanity Card
  |
If revoked/suspended/expired: render status page
  |
END
```

### 6.3 Order QR-Bearing Artifact

```text
START
  |
Card owner selects product in Storefront
  |
System checks active QR credential
  |
System renders print-safe QR artwork
  |
Artifact intent is attached to Shopify checkout
  |
Printify Fulfillment Middleware submits fulfillment order
  |
END
```

### 6.4 Revoke Printed QR

```text
START
  |
Owner signs revocation
  |
Resolver marks card or QR revoked
  |
Future scans of old printed QR show revoked status
  |
END
```

---

## 7. API Specifications

### 7.1 Resolver API Summary

| Endpoint | Method | Description |
|---|---|---|
| `GET /.well-known/hc/v1/health` | GET | Resolver health. |
| `GET /.well-known/hc/v1/cards/{profile_id}` | GET | Resolve public card as HTML/JSON. |
| `GET /.well-known/hc/v1/cards/{profile_id}/status` | GET | Resolve card status. |
| `GET /.well-known/hc/v1/qr/{qr_id}` | GET | Resolve QR credential metadata. |
| `POST /.well-known/hc/v1/cards/{profile_id}/qr` | POST | Rotate/create QR credential. |
| `POST /.well-known/hc/v1/cards/{profile_id}/revoke` | POST | Revoke card or QR credential. |

### 7.2 Public Shortcut Routes

| Route | Description |
|---|---|
| `/c/{profile_id}?q={qr_id}` | HTTPS card QR fallback. |

### 7.3 Resolve Response

Public JSON response MUST follow the Humanity Card v1.0 model:

```json
{
  "version": "1.0",
  "profile_id": "base58-profile-id",
  "handle": "human_handle",
  "manifesto_line": "Short public statement.",
  "status": "active",
  "verification": {
    "level": 2,
    "label": "Verified Human",
    "method": "vouch",
    "vouch_count": 3
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
  "signature": {}
}
```

---

## 8. Data Models

### 8.1 QR Credential

| Field | Type | Required | Description |
|---|---|---|---|
| `qr_id` | string | Yes | Opaque QR credential ID. |
| `profile_id` | string | Yes | Linked Humanity Card. |
| `epoch` | integer | Yes | Credential epoch. |
| `resolver_hint` | string | Yes | Primary resolver base URL. |
| `issued_at` | datetime | Yes | Issuance time. |
| `expires_at` | datetime | Yes | Expiration time. |
| `status` | enum | Yes | `active`, `revoked`, `expired`, `replaced`. |
| `payload` | string | Yes | QR payload or fallback URL. |
| `signature` | object | Yes | Owner signature. |

### 8.2 QR Artifact Binding

| Field | Type | Required | Description |
|---|---|---|---|
| `binding_id` | string | Yes | Binding ID. |
| `qr_id` | string | Yes | QR credential. |
| `artifact_id` | string | No | Artifact design/proof ID. |
| `print_order_id` | string | No | Internal print order reference. |
| `status` | enum | Yes | `draft`, `proofed`, `ordered`, `fulfilled`, `revoked_qr`. |

---

## 9. Security and Privacy Requirements

| ID | Requirement |
|---|---|
| QR-SEC-01 | QR credentials MUST be signed. |
| QR-SEC-02 | Resolver MUST verify signatures before accepting QR rotations or revocations. |
| QR-SEC-03 | QR payloads MUST NOT include private data, shipping data, or order IDs. |
| QR-SEC-04 | Printed artifact QR codes MUST resolve through Humanity-controlled status checks. |
| QR-SEC-05 | Resolver MUST not collect scan analytics by default. |
| QR-SEC-06 | Offline cache MUST label stale data. |

---

## 10. Governance Integration

| ID | Requirement |
|---|---|
| QR-GOV-01 | QR status meanings MUST be public and stable. |
| QR-GOV-02 | Suspension status requires governance authority and public process. |
| QR-GOV-03 | Scan analytics cannot be enabled without explicit governance-approved consent model. |
| QR-GOV-04 | Printed QR artifact policy must explain revocation limits clearly. |
| QR-GOV-05 | QR standards changes affecting user rights require ratification. |

---

## 11. Acceptance Criteria

### 11.1 QR System Complete

- Humanity Card generates signed QR credential.
- HTTPS fallback QR works from phone camera.
- Active QR renders public Humanity Card.
- Revoked QR renders revoked status.
- Suspended card renders suspension status.
- Printed QR artwork passes scan QA.
- Storefront can generate artifact intent from active QR.
- Resolver collects no scan analytics by default.

### 11.2 Offline Complete

- Active card can be cached.
- Cached view shows stale/offline banner.
- Client refreshes when online.
- Revoked/suspended statuses use short cache TTL.

---

## 12. Out of Scope for v1.0

- Location-based scan analytics.
- Follower counts.
- Public search directory.
- Arbitrary profile rich media.
- QR codes that directly encode private profile layers.
- Shopify or Printify-controlled QR identity.
- Blockchain/NFT QR ownership.

---

## 13. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Printed QR remains in world after revocation | High | Medium | Revoked status page and clear purchase warning. |
| QR feels like link-in-bio | Medium | High | Center signed card, verification, badge trail, and revocable physical artifacts. |
| Offline cache shows stale active card | Medium | Medium | Strong stale banner and refresh on reconnect. |
| Phone cameras do not support custom scheme | High | High | Use HTTPS fallback for printed artifacts. |
| Artifact QR leaks order data | Low | High | QR payload contains only profile and QR IDs. |

---

## 14. Glossary

| Term | Definition |
|---|---|
| **QR Credential** | Signed resolver object referenced by a QR code. |
| **HTTPS Fallback** | Web URL used for normal phone camera scanning. |
| **Humanity Card** | Signed public profile card resolved by QR. |
| **Artifact Binding** | Link between QR credential and internal print order metadata. |
| **Stale View** | Cached view that may not reflect current resolver status. |

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

1. Finalize QR credential canonical signature payload.
2. Build HTTPS fallback route.
3. Implement QR scan QA for Storefront print artifacts.
4. Integrate QR bindings with Printify Fulfillment Middleware order metadata.
