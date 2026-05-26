# V1 Product Trust Model

**Status:** Pre-build product contract  
**Purpose:** Define what the v1 trust loop proves, what it does not prove, and how the product must explain those boundaries.

**Resolver role and federation:** `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`  -  the resolver serves signed public state; it is not legal identity infrastructure and should not collect scan analytics by default.

**Why scans matter (not a static profile):** `docs/DEMOCRATIC_INFRASTRUCTURE.md` §2  -  live status, revoke, vouches, live control, then Commons Pass.

**Vouch positioning (AI era):** `docs/VOUCH_TRUST_POSITIONING.md`  -  accountability over global biometric uniqueness; what vouch proves for integrators.  
**Vouch threat model:** `docs/VOUCH_THREAT_MODEL.md`  -  adversarial catalog and operator playbook.  
**Scanner UX (recognition, safety chrome, redirects):** `docs/SCANNER_EXPERIENCE.md`

---

## V1 Product Promise

Humanity Commons v1.0 should make one clear promise:

> Create a signed public Humanity Card, get vouched for by real people, prove live control when needed, and carry a QR that always resolves to current status.

V1 must not promise government identity, bot-proof uniqueness, legal identity, KYC, background checks, age verification, iris/biometric personhood registries, or absolute proof that a person is unique across the world.

The product is trustworthy when a normal scanner can understand, in under five seconds:

1. Whether the card or QR is active, revoked, suspended, expired, or unknown.
2. Whether the person has social trust evidence such as accepted vouches or steward/founding credentials.
3. Whether the person nearby has recently proven control of the card key.
4. Whether the physical object being scanned is merely a pointer to a card.
5. What the scan explicitly does not prove.

---

## Core Product Rule

The interface must never imply more trust than the system can actually prove.

V1 should prefer mechanism-revealing labels over broad identity claims. Public UI should say **Vouched Human** instead of **Verified Human** unless and until governance approves stronger launch copy after user testing.

Protocol fields may continue to use `verified_human` where needed for compatibility, but user-facing labels should explain how the state was earned.

---

## Trust Levels

### Level 0: Static Artifact Pointer

**Examples:**

- Sticker QR.
- Printed card QR.
- Poster QR.
- QR photographed from a physical item.

**What it proves:**

- The scanned QR resolves to a Humanity Card or artifact status page.
- The QR credential is active, revoked, expired, suspended, or unknown at scan time.
- The card has whatever current public status the resolver returns.

**What it does not prove:**

- The holder is the card owner.
- The holder controls the card key.
- The holder is a vouched human.
- The physical item is still owned by the person named on the card.

**Required copy:**

> This QR resolves to a Humanity Card. It does not prove the person holding this item is the card owner.

**Product constraint:**

Do not print mutable verification claims such as "Verified Human" on v1 artifacts. Current trust state belongs in the scan result, not on the object.

### Level 1: Current Card Resolution

**Examples:**

- Scanner opens `https://humanity.llc/c/{profile_id}?q={qr_id}`.
- Scanner opens the public card page directly.

**What it proves:**

- The resolver currently recognizes the card or QR.
- The card status is visible.
- The card document and QR credential can be checked against signed payloads.
- Public verification summary, vouch recency, and badges are visible when available.

**What it does not prove:**

- The person physically present controls the card.
- The person physically present is the card owner.
- The card represents legal identity.
- The card owner is globally unique.

**Required UI blocks:**

1. Card status.
2. Human trust status.
3. Artifact/QR status when the scan came from a printed item.
4. Data/logging disclosure.

### Level 2: Social Vouch Trust

**Strategic frame:** Vouch answers *who put their name on this profile under published rules—and can revoke it?* It does **not** answer *is this the only human body on Earth?* Biometric global-ID products and Humanity vouch solve different problems; see `docs/VOUCH_TRUST_POSITIONING.md`.

**Examples:**

- Three accepted vouches from eligible humans.
- Founding human credential under public bootstrap rules.
- Ceremony credential signed by stewards.

**What it proves:**

- Other accountable participants signed **public, revocable** attestations that this card belongs to a distinct human under published rules.
- Vouches or credentials are active, signed, replay-protected, and not revoked.
- The latest accepted vouch recency is visible when available.
- Enough independent vouchers met the threshold (default: 3) with quotas and wait rules applied.

**What it does not prove:**

- Legal name.
- Government identity.
- Age.
- Immigration, employment, or financial eligibility.
- Absolute sybil resistance or global uniqueness.
- That every voucher was correct or honest.
- Real-time liveness at vouch time (use live control when possession or fresh key proof matters).
- That the person holding a printed QR is the card owner.

**Required copy pattern:**

> Vouched by 3 humans under Humanity Commons rules.

or:

> Founding credential issued under bootstrap rules.

Avoid vague claims such as "real person verified" or "bot-proof" unless the mechanism is shown next to the claim. Prefer **Vouched Human** and show count + recency.

**Integrator note:** Gate **accountable participation** (e.g. comments, cohort access) with policy on `vouch_count`, card status, recency, and live-control requirements for high-risk actions - not a single outsourced biometric boolean. Use `docs/VOUCH_INTEGRATOR_POLICY_GUIDE.md`.

### Level 3: Live Control Proof

**Alpha implementation:** `docs/M7_LIVE_CONTROL_ALPHA.md`.

**Examples:**

- Scanner requests a short-lived challenge from the card page.
- Card owner signs the challenge with the Humanity Card key.
- Scanner sees a fresh success state.

**What it proves:**

- A person nearby, or a device they control, could sign a short-lived challenge using the card's active key or authorized recovery key.
- The proof happened recently.

**What it does not prove:**

- Legal identity.
- Permanent ownership.
- Unique humanity.
- That the person is not being coerced.
- That the same person received earlier vouches.

**Required success copy:**

> Control proven moments ago. This means the card key signed a fresh challenge. It does not prove legal identity.

**Required failure copy:**

> Control was not proven. The card may still be active, but this person has not shown live control of it.

### Level 4: Steward Or Ceremony Proof

**Examples:**

- In-person ceremony credential.
- Steward credential.
- Appeal or suspension decision by bootstrap/steward authority.

**What it proves:**

- A published governance process or steward group made a signed claim.
- The claim can be inspected through public evidence appropriate for privacy.

**What it does not prove:**

- That governance is perfectly decentralized.
- That the person has no other cards.
- That the card is a legal identity document.

**Product constraint:**

Founder/bootstrap authority must be labeled as bootstrap authority until member governance is real.

---

## Live Control Proof Flow

### Recommended V1.1 Flow

1. Scanner opens a Humanity Card or printed-item scan page.
2. Scanner taps **Ask owner to prove control**.
3. Resolver creates a short-lived challenge with:
   - `challenge_id`
   - `profile_id`
   - `qr_id` when relevant
   - `issued_at`
   - `expires_at`
   - random nonce
   - verifier session reference
4. Scanner shows a challenge QR or short phrase.
5. Card owner opens the challenge on the device holding the Humanity Card key.
6. Owner reviews the request and signs the challenge.
7. Scanner page updates to show success or failure.

### Challenge Requirements

- Challenge expiry: 30-120 seconds.
- Proof display expiry: 2-5 minutes.
- Challenge must be single-use.
- Challenge must include payload type and protocol version.
- Challenge must not reveal scanner identity beyond what is necessary for the session.
- Challenge must not require phone number, email, Microsoft/Google account, or social login.

### Anti-Confusion Rules

- Live control proof is not login.
- Live control proof is not legal ID.
- Live control proof is not a vouch.
- Live control proof does not grant verification.
- Live control proof should be shown as recent evidence, not as a permanent badge.

---

## Owner lifecycle: Revoke QR vs Disable card

**Canonical spec:** `docs/REVOKE_AND_LIFECYCLE_V1.md`

Scanners must distinguish:

| Action | Who | Typical scan headline (target UX) |
|--------|-----|-----------------------------------|
| **Revoke QR** | Owner | “This QR is no longer valid”  -  minimal by default |
| **Disable card** | Owner | “This card has been disabled”  -  card details hidden by default |
| **Suspend** | Governance | “Suspended under public rules”  -  public notice required |

**Physical limit:** Printed QRs always contain `profile_id` and `qr_id` in the URL. Revoke/disable changes resolver state, not ink. Copy must warn owners.

**Not v1:** Delete card, revoke-on-next-scan with encrypted QR payload, geofence/calendar/social revoke chains.

---

## Public Label Policy

### Preferred V1 Labels

| Internal State | Public Label | Notes |
|---|---|---|
| `unverified` | Unverified | Public card exists with no unique-human claim. |
| `registered` | Registered | Baseline registration, not proof of humanity. |
| `verified_human` via vouch | Vouched Human | Preferred public label for launch. |
| `verified_human` via ceremony | Ceremony-Vouched Human | Use only if a real ceremony process exists. |
| `steward` | Steward | Must link to public authority rules. |
| `revoked` (QR credential) | QR no longer valid | Prefer over “Revoked By Owner” on item scans; see `REVOKE_AND_LIFECYCLE_V1.md`. |
| `revoked` (whole card) | Disabled by owner | UI: **Disable card**; distinguish from QR revoke. |
| `suspended` | Suspended Under Public Rules | Distinguish from owner disable. |

### Forbidden Or Restricted Claims

Do not use these claims in v1 public copy:

- Government verified.
- Legally verified.
- KYC verified.
- Age verified.
- Bot-proof.
- Fraud-proof.
- Unique human guaranteed.
- Background checked.
- Employment eligible.
- Identity confirmed.
- This sticker proves identity.
- Buying this verifies you.

If the phrase **Verified Human** appears in public UI, it must be adjacent to mechanism copy such as "by vouches" or "by ceremony" and must pass copy comprehension testing before launch.

---

## Founding Trust Bootstrap

The first vouch network has a bootstrapping problem. V1 must not hide it.

### Recommended Rule

- Launch with 10-25 founding humans or bootstrap stewards personally selected by the founder and/or named bootstrap operators.
- Label their authority as **bootstrap** until member governance exists.
- Publish who can issue founding credentials, what they mean, and when the authority sunsets or is reviewed.
- Founding credentials must not be purchasable.
- Founding humans may vouch only after accepting public vouching rules.
- New vouched humans still wait 90 days before vouching unless governance explicitly grants bootstrap exceptions.

### Required Public Copy

> Humanity Commons is founder-built today. Founding credentials are issued under temporary bootstrap rules so the first trust network can exist. These powers are public, limited, and subject to transition once members can govern the system.

---

## First Demo Path

The v1 demo should be understandable in two minutes:

1. Create a signed Humanity Card.
2. Scan the QR and see the card.
3. See `Registered`, not an overclaim.
4. Receive or view vouches.
5. Ask the owner to prove live control.
6. Revoke a printed-item QR.
7. Scan the old QR and see a designed revoked state.
8. See that a sibling printed-item QR still works.

If this demo cannot be understood by a non-technical person, the product is not launch-ready.

---

## Copy Comprehension Launch Gates

Before public launch, at least 10 target users should correctly answer:

1. Does buying a sticker verify someone? Expected answer: no.
2. Does holding a sticker prove the holder owns the card? Expected answer: no.
3. What does `Vouched Human` mean? Expected answer: other eligible humans vouched under public rules.
4. What does `Control proven moments ago` mean? Expected answer: the card key signed a recent challenge.
5. What happens when a QR is revoked? Expected answer: future scans show revoked status; the physical object still exists.
6. What is the difference between revoked and suspended? Expected answer: revoked is owner action; suspended is governance action.

Launch copy fails if users consistently describe the product as legal ID, a merch-based status system, or a generic QR profile.

---

## Thirty To Sixty Day Validation Metrics

Continue investing after the first validation window only if there is evidence that the trust loop is legible and wanted.

Suggested signals:

- 25 people create cards.
- 10 people successfully participate in vouching.
- 5 people use live control proof or say they would use it in a real context.
- 10 people correctly understand that stickers do not prove identity.
- At least a few people are willing to pay for a founding card/sticker without believing it buys verification.
- Users do not summarize the product as "just a QR profile."

---

## Product Verdict

Trustworthy v1 product design is not about making the strongest possible claim. It is about making the strongest honest claim:

> This card is signed, current, revocable, socially vouched where shown, and able to prove live control when needed.

