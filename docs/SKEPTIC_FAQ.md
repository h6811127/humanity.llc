# Skeptic FAQ

**Status:** Strategic draft  
**Purpose:** Prepare clear answers to the objections people are likely to raise when Humanity Commons is shared publicly.

**Architecture:** `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`  
**Direction:** `docs/DEMOCRATIC_INFRASTRUCTURE.md`

---

## Why Should Anyone Care If It Is "Just A Card Page"?

Fair question. A static page that lists a handle **is** useless.

People care when the scan answers **operational trust questions** under **published rules**, without a surveillance platform in the middle:

| Question at the door | What helps |
|----------------------|------------|
| Is this printed QR still valid? | Live network status (active / revoked / suspended) |
| Is this person known in our network? | Vouches and credentials - not follower counts |
| Is the person here holding the key *now*? | Live control proof (short-lived) |
| Can we stop trusting this object tomorrow? | Owner revoke; per-sticker revoke |
| Can our org run this without one CEO? | Federated operators + export |

**Phase A** will look thin: create, scan status, revoke. That is the honest floor. **Phase D** adds Commons Pass (membership, events, check-in). **Phase E** proves you are not locked to one company.

If we never ship vouches, live control, org tools, or federation, stop the project - the skeptics are right. See `docs/DEMOCRATIC_INFRASTRUCTURE.md` §2 (value stack).

---

## Isn't This Just A QR Profile?

No - if we ship the full trust loop. Yes - if we stop at a pretty link.

A generic QR profile points to **content**. A Humanity Card points to **current signed state**:

- The card has signed public data anyone can inspect.
- The QR resolves to **live** status (not a cached bio).
- The owner can revoke the card or **specific printed-item** QR credentials.
- Vouches show accountable social trust under rules - not a hidden score.
- Live control proof can show recent control of the card key in person.
- The scan page states what the QR does and does not prove.

The QR is the doorway. The **trust grammar** (status + vouch + revoke + optional live control + org layer) is the product.

---

## Why Not Just Use Government ID?

Some contexts need government ID. Many do not.

Humanity Commons is for situations where a person or community needs some trust without collecting more identity than the situation requires.

Examples:

- Community membership.
- Event trust.
- Mutual-aid continuity.
- Online community participation.
- Public proof that is inspectable but not legal identity.

Humanity Commons does not replace legal ID, KYC, age verification, employment eligibility, or background checks.

---

## Isn't Vouching Easy To Game?

It can be if it is careless.

That is why vouching should be:

- Signed.
- Limited by quota.
- Delayed for newly vouched humans.
- Revocable.
- Visible enough to audit.
- Separated from private notes.
- Governed by public rules.

Vouching is not perfect proof. It is accountable social trust. The UI should say `Vouched Human`, not overclaim legal or universal verification.

---

## What If Someone Steals My Sticker?

A sticker is not identity proof.

If someone steals a sticker or printed card:

- The owner can revoke that printed-item QR.
- Future scans show revoked status.
- Sibling QR credentials can remain active.
- The physical object still exists.

The scan page must say:

> This QR resolves to a Humanity Card. It does not prove the person holding this item is the card owner.

---

## What Does Live Control Prove?

Live control proof means the card key signed a fresh challenge moments ago.

It proves:

- Recent control of the card key or accepted recovery/rotation key.

It does not prove:

- Legal identity.
- Age.
- KYC.
- Unique humanity.
- That the person was not coerced.
- That the physical item belongs to the person.

Live control proof should be short-lived and shown as recent evidence, not as a permanent badge.

---

## Is This A Social Credit System?

No.

Humanity Commons must not have:

- Hidden trust scores.
- Pay-to-rank.
- Follower counts.
- Algorithmic reputation scores.
- Secret visibility rules.
- Shadow bans.

The system uses explicit states and signed public records where appropriate: registered, vouched, revoked, suspended, active QR, revoked QR, and live control proof.

---

## Is This Political?

The product is practical: create a signed card, scan it, vouch, prove control, revoke it.

The institutional commitments are political in the sense that they protect users:

- No surveillance business model.
- No scan analytics by default.
- Export and exit.
- Public standards.
- Member governance over rights-affecting rules.
- Limits on capital control.

The card should not require agreement with a party or ideology. Participation should require respect for the rules and trust boundaries.

---

## Who Controls Humanity Commons Right Now?

At launch, the project is founder-built and bootstrap-operated.

That must be stated honestly.

The project should publish:

- What the founder controls now.
- What bootstrap operators can do.
- Who can issue founding badges.
- Who can suspend cards.
- What members should control later.
- What milestones trigger governance transition.

Do not claim member governance before members have real power.

---

## How Does Humanity Commons Make Money?

Allowed revenue:

- Physical artifacts.
- Founding memberships or supporter contributions.
- Grants.
- Donations.
- Cooperative/member organization tools.
- Support contracts.
- Event/community infrastructure.

Forbidden revenue:

- Selling scan analytics.
- Selling identity data.
- Selling verification.
- Pay-to-rank.
- Ads based on behavior tracking.
- Investor control over user rights.

Revenue should fund operations, development, support, security, accessibility, governance, and worker compensation.

---

## Why Not Use Worldcoin, LinkedIn, Passkeys, Or Microsoft Authenticator?

These solve different problems.

Worldcoin and biometric systems raise major privacy, coercion, and governance concerns.

LinkedIn is platform-owned reputation.

Passkeys are useful authentication primitives, but they do not by themselves create a public, vouched, revocable trust card.

Microsoft Authenticator proves access for a platform login. Humanity live control proof should prove recent control of a Humanity Card key to another person or community, without requiring a Microsoft/Google account.

Humanity Commons should use good cryptographic primitives without becoming dependent on platform identity.

---

## Can Someone Have Multiple Cards?

Yes, especially in early versions.

Humanity Commons v1 should not claim perfect uniqueness. Vouching, ceremonies, quotas, waiting periods, and steward review can reduce abuse, but they do not create global uniqueness guarantees.

The honest v1 claim is:

> This card has the public trust evidence shown here.

not:

> This is the only card this human could ever create.

---

## What Happens If I Lose My Key?

Key loss is a serious risk.

V1 should provide:

- Clear backup instructions.
- Encrypted export bundle where supported.
- Key rotation/recovery design if implemented.
- Honest warnings if recovery is not available yet.

If a user loses the only key and has no recovery path, they may not be able to prove control or revoke normally. The product must explain this before users rely on the card.

---

## Why Would This Go Viral?

It could spread if the card becomes a simple status object with moral clarity:

> Prove you're real without becoming a data product.

Likely loops:

- People share beautiful card screenshots.
- People invite others for vouches.
- Live control proof creates a memorable in-person demo.
- Stickers/cards spark scans.
- Communities adopt it for events or membership.
- The anti-platform line is easy to repeat: "No phone. No ID. No ads. No tracking."

Virality should come from usefulness plus meaning, not from misleading claims.

---

## What Would Make This Fail?

The project can fail if:

- People see it as a QR profile.
- People like the mission but do not use it.
- Vouching feels weak.
- Onboarding feels too heavy.
- The movement overwhelms the product.
- Physical artifacts become merch only.
- A trust incident happens before support rules exist.
- The project claims democracy before members have power.
- Funding pressure pushes the project toward surveillance or control.

The mitigation is to launch narrow, tell the truth, validate one beachhead, and keep the card useful before making the institution big.

---

## Isn't The Network A Honeypot?

It can be if built like a surveillance identity company.

The reference design is intentionally **minimal**:

- Pseudonymous `profile_id` and public key - not legal identity in the core loop.
- No scan analytics by default.
- Private keys stay on the user device.
- Commerce PII stays in Shopify/Printify, not the network.

A network is still a **target** (subpoenas, breaches, vouch graphs). Mitigations:

- Publish what is stored and for how long.
- Federate operators so one company does not own all trust state forever.
- Let users export and leave.

See `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md` §5.

---

## Why Not Blockchain?

Not part of this project’s trust model.

Public blockchains make many trust problems **more permanent and more traceable** (wallets, indexers, immutable graphs) - not less. Humanity Commons needs **live status at scan time** (revoked, suspended, active). That is a **network** job with **Ed25519-signed documents**, not chain gas or NFT identity.

Ledger anchoring is **out of v1 scope** and not a default roadmap bet. If it is ever reconsidered, it needs a concrete governance-approved use case that a minimal operator cannot meet honestly - see `docs/V1_DECISION_LOCK.md`.

---

## Do I Need To Join A Founding Cohort?

No.

**Public launch** means anyone can create a card when Phase A ships. An optional early tester pool may help stress-test copy and support - it is not a gate, paid tier, or fake democracy.

---

## How Does This Get "Power" Without Surveillance?

Power comes from **dependency and standards**, not from knowing everyone's legal name:

- Communities check the same trust grammar at the door.
- Multiple operators run compatible networks.
- Members govern rights-affecting rules.
- Commons Pass puts repeat use inside orgs.

That is closer to **infrastructure** (DNS, TLS) than to a platform profile. Stronger identity stays at the **edge** (a specific org's policy), not as the global default.

