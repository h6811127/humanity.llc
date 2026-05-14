**Version:** 1.0  
**Status:** Draft for Collective Ratification  
**Constitution Reference:** Article III (Revocation), Article VI (Prohibitions)  
**Dependencies:** QR Public Profile Feature Specification

---

## 1. Executive Summary

A progressive, privacy-preserving human verification system that enables sybil-resistant governance and trust signaling without requiring government ID, phone numbers, or central authority. Verification is earned through either device-based zero-knowledge proofs or social vouching, with fallback in-person ceremonies for excluded populations.

---

## 2. User Stories

|ID|Story|
|---|---|
|HV-01|As a new user, I want to join the collective without providing my phone number or email|
|HV-02|As a new user, I want to become verified so others trust my profile|
|HV-03|As a verified user, I want to vouch for someone I know personally|
|HV-04|As a verified user, I want to know that voting weight is fairly distributed (one human, one vote)|
|HV-05|As a steward, I want to prevent sybil attacks without excluding vulnerable people|
|HV-06|As a voter, I want confidence that election results reflect real human consensus|
|HV-07|As a privacy-conscious user, I want verification to reveal nothing about my identity|

---

## 3. Functional Requirements

### 3.1 Verification Levels

|ID|Requirement|Priority|
|---|---|---|
|VR-01|System MUST support four verification levels: 0 (Anonymous), 1 (Registered), 2 (Verified Human), 3 (Steward)|P0|
|VR-02|Level 0 MUST require no verification of any kind|P0|
|VR-03|Level 1 MUST require proof-of-work puzzle solved (time-locked, ~5 minutes on average hardware)|P0|
|VR-04|Level 2 MUST require either: (a) device-based unique personhood proof, or (b) 3 social vouches from existing Level 2+ members|P0|
|VR-05|Level 3 MUST require Level 2 status for ≥90 days + ratified contribution|P1|

### 3.2 Device-Based Verification (Zero-Knowledge Personhood Proof)

|ID|Requirement|Priority|
|---|---|---|
|DV-01|System MUST support personhood proofs using device secure enclave (Apple Private Access Tokens, Android Identity Credential, or WebAuthn)|P0|
|DV-02|Proof MUST be zero-knowledge: reveals only "unique human" not identity|P0|
|DV-03|Proof MUST be rate-limited to one credential per hardware device per 90 days|P0|
|DV-04|System MUST NOT store any biometric data|P0|
|DV-05|Device-based verification MUST work offline (proof generated locally, submitted later)|P1|
|DV-06|Fallback method MUST exist for devices without secure enclave|P0|

### 3.3 Social Vouching

|ID|Requirement|Priority|
|---|---|---|
|SV-01|Level 2+ members MUST be able to vouch for Level 1 members|P0|
|SV-02|Minimum vouchers required: 3|P0|
|SV-03|Maximum vouchers per member per year: 5|P0|
|SV-04|Vouching cooldown: 30 days after issuing a vouch|P0|
|SV-05|New Level 2 members MUST wait 90 days before they can vouch for others|P0|
|SV-06|Vouches MUST be revocable if the voucher loses Level 2 status|P0|
|SV-07|Vouch graph MUST be publicly auditable (identities hashed for privacy)|P1|

### 3.4 In-Person Verification Ceremonies

|ID|Requirement|Priority|
|---|---|---|
|IC-01|Collective MUST support offline verification ceremonies for users without compatible devices|P0|
|IC-02|Ceremony requires 3+ stewards present|P0|
|IC-03|Stewards MUST witness each attendee as a distinct human|P0|
|IC-04|Attendees MAY present government ID but MUST NOT be required to|P0|
|IC-05|Ceremony attendance MUST be recorded via signed statements from stewards|P0|
|IC-06|Certificates from ceremony MUST be submitted to the network via any internet connection (not necessarily at the venue)|P0|

### 3.5 Verification Status Display

|ID|Requirement|Priority|
|---|---|---|
|VS-01|Profile MUST display verification badge corresponding to level|P0|
|VS-02|Level 0: no badge|P0|
|VS-03|Level 1: "Unverified" (gray badge)|P0|
|VS-04|Level 2: "Verified Human" (green badge)|P0|
|VS-05|Level 3: "Steward" (gold badge)|P0|
|VS-06|Badge MUST include timestamp of verification|P1|
|VS-07|Badge MUST link to verification method description|P1|

### 3.6 Voting Weight Mapping

|ID|Requirement|Priority|
|---|---|---|
|VW-01|Level 0: 0 voting weight (cannot vote)|P0|
|VW-02|Level 1: 0.5 voting weight (half vote)|P0|
|VW-03|Level 2: 1.0 voting weight|P0|
|VW-04|Level 3: 1.0 voting weight (same as Level 2)|P0|
|VW-05|Voting weight MUST be capped at 1.0 (no super-votes)|P0|

### 3.7 Revocation of Verification

|ID|Requirement|Priority|
|---|---|---|
|RV-01|Level 2 status MUST be revocable if user is suspended (Article III of constitution)|P0|
|RV-02|Device-based credentials MUST be revocable by the network (revocation list)|P0|
|RV-03|Social vouches MUST be revoked if the voucher is suspended|P0|
|RV-04|Revoked users MUST return to Level 1 (not Level 0)|P0|
|RV-05|Revoked users MUST be able to re-verify after appeal period (minimum 90 days)|P1|

---

## 4. Non-Functional Requirements

|ID|Requirement|Target|
|---|---|---|
|NFR-V01|Proof-of-work puzzle solution time (average hardware)|5 minutes ± 2 minutes|
|NFR-V02|Device-based verification time (including proof generation)|< 30 seconds|
|NFR-V03|Social vouch propagation delay|< 1 hour|
|NFR-V04|Vouch graph query time (for a single profile)|< 2 seconds|
|NFR-V05|Maximum number of verification levels|4|
|NFR-V06|Revocation list size limit|10,000 entries|
|NFR-V07|Minimum stewards required for ceremony|3|
|NFR-V08|Vouch cooldown|30 days|
|NFR-V09|New voucher waiting period|90 days|

---

## 5. User Flows

### 5.1 New User Onboarding (Device-Based)

text

START
  ↓
User opens app, clicks "Create Profile"
  ↓
User solves proof-of-work puzzle (Level 1 achieved)
  ↓
System detects device capability
  ↓
If secure enclave available:
    ↓
    User clicks "Verify as Human"
    ↓
    System generates zero-knowledge personhood proof
    ↓
    Proof submitted to verification network
    ↓
    Network checks proof against revocation list
    ↓
    If valid, issues anonymous credential
    ↓
    Profile upgraded to Level 2
    ↓
    END
  ↓
If no secure enclave:
    ↓
    System offers social vouching or ceremony
    ↓
    (see social vouching flow)

### 5.2 Social Vouching Flow

text

START
  ↓
Level 1 user requests vouches
  ↓
User shares their QR code with trusted contacts
  ↓
Contact (Level 2+) scans QR
  ↓
Contact clicks "Vouch for this human"
  ↓
System checks contact's remaining vouches (max 5/year)
  ↓
System checks cooldown (30 days since last vouch)
  ↓
If approved, vouch recorded on contact's device
  ↓
Vouch propagates to network
  ↓
User's profile counts vouches
  ↓
When count reaches 3: profile upgraded to Level 2
  ↓
END

### 5.3 In-Person Ceremony Flow

text

START
  ↓
Stewards schedule ceremony (public calendar)
  ↓
Attendees arrive in person
  ↓
Stewards verify each attendee is a distinct human
  ↓
(Optional: attendees present ID if they choose)
  ↓
Each steward signs a certificate for each attendee
  ↓
Certificates stored on stewards' devices
  ↓
Attendees leave with offline proof of attendance
  ↓
Later (when internet available), certificates sync
  ↓
System aggregates certificates by attendee
  ↓
When 3+ stewards have signed for same attendee:
    ↓
    Attendee's profile upgraded to Level 2
    ↓
END

---

## 6. Data Models

### 6.1 Verification Credential (Device-Based)

|Field|Type|Description|
|---|---|---|
|`credential_id`|string (256-bit hash)|Unique identifier (not linked to user)|
|`public_key`|Ed25519|Anonymous credential public key|
|`created_at`|datetime|Timestamp of issuance|
|`expires_at`|datetime|1 year from creation|
|`revoked`|boolean|If true, credential invalid|

### 6.2 Vouch Record

|Field|Type|Description|
|---|---|---|
|`vouch_id`|UUID|Unique identifier|
|`voucher_profile_id`|string|Level 2+ member who gave the vouch|
|`vouchee_profile_id`|string|Level 1 member receiving the vouch|
|`timestamp`|datetime|When vouch was created|
|`revoked`|boolean|If true, vouch no longer counts|

### 6.3 Ceremony Attendance Certificate

|Field|Type|Description|
|---|---|---|
|`certificate_id`|UUID|Unique identifier|
|`attendee_profile_id`|string|Profile being verified|
|`steward_profile_id`|string|Steward who signed|
|`ceremony_id`|string|Identifier for the event|
|`signature`|Ed25519|Steward's signature|
|`timestamp`|datetime|When signed|

### 6.4 Proof-of-Work Puzzle

|Field|Type|Description|
|---|---|---|
|`puzzle_id`|UUID|Unique identifier|
|`challenge`|string|Random challenge string|
|`difficulty`|integer|Target leading zeros (adjustable)|
|`solution`|string|User's solution (verified server-side)|
|`solved_at`|datetime|Timestamp of solution|

---

## 7. API Specifications

|Endpoint|Method|Description|
|---|---|---|
|`/v1/verification/puzzle`|GET|Request new proof-of-work puzzle|
|`/v1/verification/puzzle/verify`|POST|Submit puzzle solution|
|`/v1/verification/device-proof`|POST|Submit zero-knowledge personhood proof|
|`/v1/verification/vouch`|POST|Issue a vouch for another user|
|`/v1/verification/vouch/revoke`|POST|Revoke a vouch|
|`/v1/verification/ceremony/submit`|POST|Submit ceremony certificate|
|`/v1/verification/status/{profile_id}`|GET|Get verification level and badge info|

---

## 8. Security & Privacy Requirements

|ID|Requirement|
|---|---|
|SEC-V01|Personhood proofs must be unlinkable across verification events|
|SEC-V02|Revocation list must be publicly auditable but not reveal who was revoked|
|SEC-V03|Vouch graph must be accessible to stewards for audit, but hashed for public|
|SEC-V04|Proof-of-work puzzles must be unique per request to prevent replay|
|SEC-V05|Device-based verification must fail if secure enclave reports tampering|
|SEC-V06|Ceremony certificates must be signed by stewards' private keys (not centralized)|
|SEC-V07|No central database of "verified users" may exist (only distributed, encrypted records)|

---

## 9. Governance Integration

|ID|Requirement|
|---|---|
|GOV-V01|Verification level thresholds (vouches needed, waiting periods) must be configurable via collective vote|
|GOV-V02|Trust & safety council may revoke verification with due process (Article III)|
|GOV-V03|Changes to verification methods require 60% supermajority|
|GOV-V04|Annual transparency report must include: number of verified users, number of revocations, number of ceremonies held|

---

## 10. Acceptance Criteria

### 10.1 MVP (Levels 0, 1, and basic Level 2 via device)

- User can create Level 1 profile with proof-of-work puzzle
    
- Device-based verification works on modern iOS/Android
    
- Verified profiles show green badge
    
- Unverified profiles show gray badge
    
- No phone/email required at any step
    

### 10.2 Full Release (Adds social vouching + ceremonies)

- Social vouching implemented with all constraints (3 min, 5/year, cooldown)
    
- In-person ceremonies supported
    
- Vouch graph queryable by stewards
    
- Revocation of verification works via trust & safety council
    

### 10.3 Governance Ready

- Voting weight mapping implemented
    
- Level thresholds configurable by vote
    
- Transparency report generated automatically
    

---

## 11. Risks and Mitigations

|Risk|Probability|Impact|Mitigation|
|---|---|---|---|
|Device-based verification excludes users without modern phones|Medium|High|Social vouching + ceremonies as fallback|
|Social vouching collusion (groups vouching for each other)|Medium|Medium|Voucher limits + cooldown + revocability|
|Proof-of-work puzzles bypassed by specialized hardware|Low|Medium|Adjust difficulty + rate-limit puzzles|
|Revocation list grows too large|Low|Low|Prune entries after 2 years, use bloom filters|
|Stewards become gatekeeping elite|Medium|Medium|Annual elections + term limits + transparency|

---

## 12. Open Questions for Collective Discussion

|Question|Options|
|---|---|
|Should Level 1 (registered) have any voting weight?|0, 0.25, 0.5|
|Should social vouches expire after a fixed time?|1 year, 2 years, never|
|Should device-based verification require a small fee (to prevent abuse)?|Yes / No (if no, how to prevent massive sybil?)|
|How should we handle people with no smartphone AND no local collective?|Remote video verification? Mail-based?|
|Should stewards be elected or appointed by contribution?|Elected / Merit-based / Hybrid|

---

## 13. Glossary

|Term|Definition|
|---|---|
|**Level 0**|Anonymous viewer, no profile, no verification|
|**Level 1**|Registered participant, solved puzzle, unverified|
|**Level 2**|Verified human, device-proof or 3 vouches|
|**Level 3**|Steward, Level 2 + contribution|
|**Zero-knowledge proof**|Cryptographic proof that reveals nothing beyond its validity|
|**Secure enclave**|Hardware-isolated area on a device for cryptographic operations|
|**Social vouch**|One member attesting that another is a distinct human|
|**Ceremony**|In-person meeting where stewards verify attendees|