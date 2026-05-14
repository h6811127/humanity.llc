**Version:** 1.0  
**Status:** Draft for Collective Ratification  
**Constitution Reference:** Architectural Constitution for QR Public Profile Feature (Articles I–VII)  
**Technical Standards Reference:** Technical Standards v1.0

---

## 1. Executive Summary

A system that allows individuals to publish a public-facing digital profile accessible via QR code stickers. When scanned by a passerby, the QR resolves to a profile page that respects three core principles:

- **Digital self-governance** – Users control their data and its visibility
- **Offline-first and low-bandwidth design** – Works anywhere, even with poor connectivity
- **Revocation and consent as first-class features** – Users can revoke access at any time, and consent is explicit at every layer

---

## 2. User Stories

### 2.1 Profile Owner

|ID|Story|
|---|---|
|US-01|As a profile owner, I want to create a public profile with a QR code that others can scan|
|US-02|As a profile owner, I want to control exactly what information is visible to a passerby who scans my QR|
|US-03|As a profile owner, I want to revoke my QR entirely at any time, without explanation|
|US-04|As a profile owner, I want to see who has requested deeper access to my profile (if I opt into logging)|
|US-05|As a profile owner, I want to export my entire profile and QR mapping to take elsewhere|
|US-06|As a profile owner, I want to regenerate my QR code without changing my underlying profile data|

### 2.2 Passerby (Scanner)

|ID|Story|
|---|---|
|US-07|As a passerby, I want to scan a QR and see a profile instantly, even with slow or no internet|
|US-08|As a passerby, I want to know what data is being shared with the profile owner when I scan|
|US-09|As a passerby, I want to request deeper access to the profile owner's information (e.g., contact, voting record)|
|US-10|As a passerby, I want to opt out of being tracked or logged by the scanner app|

### 2.3 Collective (Governance)

|ID|Story|
|---|---|
|US-11|As a member of the collective, I want to verify that the platform complies with the Architectural Constitution|
|US-12|As a member of the collective, I want to propose and vote on changes to the QR profile feature|
|US-13|As an elected trust & safety council member, I want to suspend a profile that violates collective rules, with due process|

---

## 3. Functional Requirements

### 3.1 QR Generation and Management

|ID|Requirement|Priority|
|---|---|---|
|FR-01|System MUST generate a unique QR code for each profile using the `hllc://`URI scheme|P0|
|FR-02|QR code MUST embed an Ed25519 signature that expires after 30 days (epoch-based nonce)|P0|
|FR-03|User MUST be able to regenerate QR code at any time (new signature for current epoch)|P0|
|FR-04|User MUST be able to download QR code as PNG (300dpi minimum for printing)|P0|
|FR-05|System MUST NOT store any analytics or scan logs unless both parties explicitly opt in|P0|
|FR-06|Old QR codes MUST stop working after epoch transition (grace period: 48 hours overlapping)|P1|

### 3.2 Profile Data Layers (Consent-Based)

|ID|Requirement|Priority|
|---|---|---|
|FR-07|Profile MUST have three distinct data layers: Public, Semi-Public, Private|P0|
|FR-08|Public layer MUST be visible to any QR scanner without any consent|P0|
|FR-09|Public layer MUST include: handle, manifesto line (≤280 chars), public badges, constitution link, governance link|P0|
|FR-10|Semi-Public layer MUST require profile owner opt-in per field before any data is visible|P0|
|FR-11|Semi-Public MAY include: contact methods (opaque handles only), region, membership level|P1|
|FR-12|Private layer MUST NOT be visible via QR scan. Access requires mutual consent flow|P0|
|FR-13|Private layer MUST be stored separately from resolvers (user device or encrypted blob)|P1|

### 3.3 Revocation and Suspension

|ID|Requirement|Priority|
|---|---|---|
|FR-14|User MUST be able to revoke their QR profile instantly, without explanation|P0|
|FR-15|Revocation MUST propagate to all resolvers within 1 hour|P0|
|FR-16|Revoked profiles MUST return HTTP 410 Gone for resolution requests|P0|
|FR-17|Collective may suspend profile only for verified cause (impersonation, harassment, illegal content)|P0|
|FR-18|Suspension MUST include: public notice to user, 7-day appeal window, council vote|P0|
|FR-19|Shadow suspensions (soft blocks) MUST NOT exist|P0|

### 3.4 Offline-First and Low-Bandwidth Design

|ID|Requirement|Priority|
|---|---|---|
|FR-20|Scanner client MUST cache resolved profiles locally for offline access|P0|
|FR-21|Client MUST attempt resolvers in user-controlled priority order|P0|
|FR-22|Client MUST support fallback resolution if primary resolver is unreachable|P0|
|FR-23|Profile data MUST be compressed (gzip/brotli) for transmission|P1|
|FR-24|QR payload MUST be under 120 characters to support low-resolution printing|P0|

### 3.5 Consent and Transparency

|ID|Requirement|Priority|
|---|---|---|
|FR-25|First-time scanner MUST see a clear notice: what data is visible, what is not, and how to request deeper access|P0|
|FR-26|Scanner MUST be able to opt out of any logging before scanning|P0|
|FR-27|Profile owner MAY opt into receiving scan notifications, but default MUST be off|P1|
|FR-28|Any scan logging MUST be symmetric — both parties must consent and both can see the log|P1|

### 3.6 Export and Portability

|ID|Requirement|Priority|
|---|---|---|
|FR-29|User MUST be able to export full profile (all layers, private key, resolver list, QR history)|P0|
|FR-30|Export MUST be available within 24 hours of request|P0|
|FR-31|Export format MUST be ZIP containing JSON schema, encrypted private key, and manifest signature|P0|
|FR-32|Any compliant resolver MUST accept export re-import for identity migration|P1|

---

## 4. Non-Functional Requirements

|ID|Requirement|Target|
|---|---|---|
|NFR-01|QR resolution time (first byte)|< 500ms on 3G connection|
|NFR-02|Offline cache availability|30 days after last resolution|
|NFR-03|Maximum QR payload length|120 characters|
|NFR-04|Resolver uptime (per region)|99.5% minimum|
|NFR-05|Minimum independent resolvers per region|3|
|NFR-06|Profile export generation time|< 24 hours|
|NFR-07|Revocation propagation time|< 1 hour to all resolvers|
|NFR-08|Epoch duration|30 days|
|NFR-09|Signature algorithm|Ed25519|
|NFR-10|Encryption for private layer|AES-256-GCM|

---

## 5. User Flows

### 5.1 Profile Creation Flow

START
  ↓
User requests profile creation
  ↓
System generates keypair (Ed25519)
  ↓
User sets public layer fields (required: handle, manifesto line)
  ↓
User optionally sets semi-public fields
  ↓
System generates QR code (hllc:// scheme + signature)
  ↓
User downloads QR code as PNG
  ↓
Profile published to resolvers
  ↓
END

### 5.2 Scanner Flow (Passerby)

START
  ↓
Passerby scans QR with camera/app
  ↓
App parses hllc:// URI
  ↓
App checks local cache for profile
  ↓
If cached and not expired → display cached version
  ↓
If not cached → query resolvers in priority order
  ↓
Resolver returns profile (public layer only)
  ↓
App displays public profile
  ↓
App shows notice: "Want to see more? Request access."
  ↓
Passerby may request deeper access (semi-public/private)
  ↓
END

### 5.3 Revocation Flow

START
  ↓
User opens profile management
  ↓
User clicks "Revoke QR Profile"
  ↓
System confirms: "This will make your QR stop working. Continue?"
  ↓
User confirms
  ↓
System sends revocation to primary resolver
  ↓
Revocation propagates to all peer resolvers (<1 hour)
  ↓
QR returns 410 Gone for all future scans
  ↓
User may re-enable profile later (new QR generated)
  ↓
END

### 5.4 Mutual Consent Flow (Accessing Private Layer)

START
  ↓
Passerby clicks "Request Access" on profile
  ↓
System generates signed request (passerby's public key + timestamp)
  ↓
Profile owner receives notification (if opted in)
  ↓
Profile owner reviews request (sees passerby's public profile)
  ↓
Profile owner grants or denies access
  ↓
If granted: encrypted private layer data shared via peer-to-peer channel
  ↓
If denied: passerby notified, no data shared
  ↓
END

---

## 6. API Specifications

### 6.1 Resolver API (OpenAPI 3.0 Summary)

|Endpoint|Method|Description|
|---|---|---|
|`/.well-known/hllc/resolve/{profile_id}`|GET|Return profile data (public + semi-public based on auth)|
|`/.well-known/hllc/revoke/{profile_id}`|POST|Revoke profile (requires proof of key ownership)|
|`/.well-known/hllc/suspend/{profile_id}`|POST|Suspend profile (requires council multisig)|
|`/.well-known/hllc/export/{profile_id}`|GET|Request export (async, returns job ID)|

### 6.2 Request/Response Examples

**Resolve Request:**

http

GET /.well-known/hllc/resolve/a1b2c3d4e5f6?signature=sig_7x9k2m4n6p8q

**Resolve Response (Public Layer Only):**

json

{
  "version": 1,
  "profile_id": "a1b2c3d4e5f6",
  "public_key": "ed25519_base58_public",
  "last_updated": "2026-05-14T10:30:00Z",
  "layers": {
    "public": {
      "handle": "anarcho_socialist",
      "manifesto_line": "Another world is possible. Let's build it.",
      "public_badges": [
        {"id": "founding_member", "issuer": "humanity.llc", "issued_at": "2026-05-01T00:00:00Z"}
      ],
      "constitution_link": "https://humanity.llc/constitution",
      "governance_link": "https://humanity.llc/proposals"
    }
  },
  "signature": "signature_of_document"
}

---

## 7. Data Models

### 7.1 Profile Entity

|Field|Type|Required|Description|
|---|---|---|---|
|`profile_id`|string (20-40 chars, base58)|Yes|Unique identifier|
|`public_key`|string (Ed25519 base58)|Yes|User's public key|
|`private_key`|encrypted string|No|Never stored on resolvers|
|`layers`|object|Yes|Public, semi-public, private containers|
|`epoch_nonce`|integer|Yes|Current epoch (days since 2026-01-01)|
|`revoked`|boolean|Yes|If true, returns 410|
|`suspended`|object|Yes|Contains reason, council sigs, appeal deadline|

### 7.2 Consent Request Entity

|Field|Type|Description|
|---|---|---|
|`request_id`|UUID|Unique identifier for this request|
|`requester_profile_id`|string|Passerby's profile (if they have one)|
|`target_profile_id`|string|Profile owner being requested|
|`requested_layer`|enum|"semipublic" or "private"|
|`timestamp`|datetime|When request was made|
|`status`|enum|pending, granted, denied, expired|
|`granted_data`|encrypted string|Only populated if granted|

---

## 8. Security & Privacy Requirements

|ID|Requirement|
|---|---|
|SEC-01|Private keys never leave user device|
|SEC-02|All profile data transmitted over HTTPS with modern TLS|
|SEC-03|Resolvers must support certificate pinning|
|SEC-04|No tracking pixels or analytics without explicit dual consent|
|SEC-05|Phone number and email never required for profile creation|
|SEC-06|Rate limiting on resolution endpoints (100 requests per minute per IP)|
|SEC-07|Suspension council keys require 3-of-5 multisig|
|SEC-08|Audit logs for suspension/revocation only (not for scans)|

---

## 9. Governance Integration

|ID|Requirement|
|---|---|
|GOV-01|Every profile page footer must link to constitution and current proposals|
|GOV-02|Changes to consent layering require simple majority user vote|
|GOV-03|Changes to revocation/suspension rules require 60% supermajority|
|GOV-04|Emergency security patches must be retroactively ratified within 30 days|
|GOV-05|Trust & safety council elected annually via ranked-choice vote|

---

## 10. Acceptance Criteria

### 10.1 Feature Complete (MVP)

- User can create a profile and download a QR code PNG
    
- QR resolves to a public profile page when scanned
    
- Public profile shows handle and manifesto line
    
- User can revoke profile instantly
    
- Revoked profile returns 410 error
    
- Scanner works offline (cached profiles)
    
- Profile footer includes constitution and governance links
    

### 10.2 Full Release (Post-MVP)

- All three data layers implemented
    
- Mutual consent flow for private layer access
    
- Collective suspension with council multisig
    
- Full export/import functionality
    
- Three independent resolvers deployed
    
- Client can prioritize resolvers
    
- Epoch rotation with 48-hour grace period
    

### 10.3 Governance Ready

- Voting mechanism for feature changes implemented
    
- Trust & safety council elected
    
- Amendment process documented and live
    
- Transparency report published quarterly
    

---

## 11. Out of Scope (Version 1.0)

The following features are explicitly excluded from v1.0:

- Profile search or discovery (no directory)
    
- Messaging between profile owner and scanner
    
- Blockchain-based resolver (deferred to v2.0)
    
- Video or rich media in profiles
    
- Automated content moderation (human council only)
    
- Anonymous profiles (handles required)
    

---

## 12. Risks and Mitigations

|Risk|Probability|Impact|Mitigation|
|---|---|---|---|
|Resolver centralization|Medium|High|Mandate 3+ independent resolvers per region|
|User loses private key|Medium|High|Export backup + encrypted key in export ZIP|
|QR forgery/spoofing|Low|High|Ed25519 signatures + epoch nonces|
|Council capture|Low|High|Annual elections + 60% supermajority for suspension|
|Offline cache staleness|Medium|Medium|30-day cache expiry + explicit refresh button|
|Low-bandwidth failure|Low|Medium|Compressed responses + priority ordering|

---

## 13. Glossary

|Term|Definition|
|---|---|
|**Resolver**|A server that stores and serves profile data|
|**Epoch**|A 30-day period used for QR signature rotation|
|**Profile Owner**|The person whose QR code is being scanned|
|**Passerby**|The person scanning the QR code|
|**Public Layer**|Visible to anyone who scans the QR|
|**Semi-Public Layer**|Visible only if profile owner opts in per field|
|**Private Layer**|Not visible via QR; requires mutual consent|
|**Mutual Consent**|Both parties explicitly agree to share data|
|**Trust & Safety Council**|Elected body that can suspend profiles with due process|

---

## 14. Document Approval

|Role|Signature|Date|
|---|---|---|
|Technical Architect|_____________|_____|
|Governance Lead|_____________|_____|
|Security Auditor|_____________|_____|
|Collective Representative|_____________|_____|

---

**Next Steps After Ratification:**

1. Technical Standards v1.1 (update based on spec)
    
2. Reference implementation (backend resolver)
    
3. Reference client (mobile/web scanner)
    
4. Deployment plan for 3+ resolvers
    
5. Governance documentation for voting