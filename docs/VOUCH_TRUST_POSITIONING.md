# Vouch trust positioning

**Status:** Canonical product + trust framing (May 2026)  
**Audience:** Product, engineering, integrators, public copy authors  
**Implementation:** [`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md), [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md)  
**Threat model:** [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) (full catalog, gaps, playbook)  
**Trust levels:** [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) § Level 2

---

## One-line promise

> **Vouch** means accountable humans signed a public, revocable attestation under published rules-not a biometric proof that you are the only human on Earth.

Humanity Commons optimizes for **accountability at interaction time**, not a central **uniqueness registry**. In an age of cheap synthetic agents, deepfakes, and bot farms, that is the right trade for most community and high-trust workflows.

---

## Two different questions (do not conflate)

| Question | Typical answer | Humanity approach |
|----------|----------------|-------------------|
| **Is this body globally unique?** | Iris / palm / government ID at enrollment | **Out of scope for v1.** We do not claim one-human-one-slot worldwide. |
| **Who put their name on this profile, under what rules, and can we still hold them to it?** | Signed receipts + revocable state + thresholds | **This is what vouch owns.** |

Biometric “proof of personhood” products (e.g. iris scanning at scale) roughly claim: *at least once, a unique biological person stood in front of this hardware.* That can help Sybil resistance at signup, but it does **not** cleanly provide:

- That **this account** is that person *right now*
- That **this action** was chosen by a human who accepts responsibility
- That anyone **knows** the person in a socially meaningful way
- That the attestation is **revocable** without a central appeals desk

Vouching answers a different question: *which already-trusted humans signed a public statement that they know this card as a distinct human-and can take it back?*

---

## What vouch proves (and does not)

### Proves

| Claim | Mechanism |
|-------|-----------|
| Eligible humans issued **signed** vouch documents for this `profile_id` | Ed25519 + canonical payload + `type: vouch` |
| **Active** vouches meet the published threshold (default: **3**) | `verification_summaries` recalc |
| Each vouch is **public** (statement ≤ 280 chars), **replay-protected** (nonce), **revocable** | Resolver + revoke flow |
| **Recency** of latest accepted vouch is visible on scan | `latest_accepted_vouch_at` |
| Vouchers had **skin in the game** (quota, wait, eligibility) | 5/year, 90-day wait, steward path |

### Does not prove

| Claim | Why |
|-------|-----|
| Vouchers were honest or correct | Policy + reputation, not physics |
| Legal identity, age, employment, KYC | Explicit non-goal |
| Global uniqueness (one human, one card) | Multiple cards possible; honest copy required |
| Person holding a **printed QR** is the owner | Pair with **live control** (M7) when possession matters |
| Real-time **liveness** at vouch time | Checkbox + in-person ritual; not a lab scan |
| “Bot-proof internet” or “verified human forever” | Overclaim; use **Vouched Human** + mechanism |

**Scanner-facing sentence (default):**

> Three humans on this network vouched for this card under published rules.

Do not lead with “bot-proof,” “sybil solved,” or graph-theory on the first screen. Those belong in adversarial review and operator docs.

---

## Threat model (summary)

Full analysis: [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) - adversaries, 40+ threats with controls/gaps, attack trees, audit flags, steward playbook, integrator misuse.

**Core insight (AI era):** Cheap synthetic personas raise the cost of **accountable, signed, revocable** attestations-they do not replace the need for biometrics at every interaction. The protocol’s job is to make **gaming Vouched Human** expensive and visible, not to prove global uniqueness. Product AI stance: [`AI_FEATURE_DEVELOPMENT.md`](AI_FEATURE_DEVELOPMENT.md) (L3 explain on signed snapshot only; no AI profiles).

| Class | Examples | Primary v1 response |
|-------|----------|---------------------|
| **Sybil / graph** | 4-person clique mutual vouch, steward farm | Threshold, quota, 90d wait; operator flags; steward review API + runbook |
| **Crypto** | Forged/replayed vouch | Signatures, nonces, pair uniqueness |
| **Device** | Stolen keys / backup | User custody; optional future PIN before sign |
| **Social** | Remote vouch, coercion, defamation | In-person ritual; revoke; governance |
| **Integrator** | VH treated as KYC | Policy docs + recency + live control |
| **Possession** | Stolen sticker | Limitations + M7 live control |

**Known gaps (honest):** No liveness at vouch time; rotating 3-cycles evade `closed_loop_only`; steward bypasses 90-day wait; no per-steward vouch cap. See threat IDs **G-02**, **V-06**, **R-03** in the threat model.

Vouching is **sufficient** for **accountable participation** gates. It is **not sufficient** for session liveness every click or platform-wide bot eradication.

---

## How Humanity owns “vouch”

Own the category by making the **verb**, **artifact**, and **policy** precise-not by claiming to out-biometric Worldcoin.

### 1. Own the verb

**Vouch** = sign and publish a revocable human attestation with eligibility rules. Not “verified account,” not “follow,” not “KYC passed.”

Public states stay mechanism-visible: **Registered** → progress toward **Vouched Human** → optional **Steward** bootstrap path.

### 2. Own the artifact

A vouch is a **verifiable document** (`vouch_id`, voucher/vouchee `profile_id`, `nonce`, `statement`, `signature`, …). Third parties should integrate against **documents + summary state**, not a proprietary “trust score.”

See `worker/tests/fixtures/vouch.json` and POST `/.well-known/hc/v1/verification/vouches`.

### 3. Own the trust-policy layer

Integrators need knobs, not one bit:

- Minimum active vouches (e.g. 3)
- Maximum age of latest vouch
- Require active card / active QR
- Exclude revoked or suspended
- Optional steward-only path for high-risk actions
- Show scan **limitations** (honesty, not legal ID, not possession)

**Example policy (conceptual):**

```text
acceptVouchedHuman({
  minActiveVouches: 3,
  maxLatestVouchAgeDays: 365,
  requireCardStatus: "active",
})
```

Ship explicit integrator guidance in a future SDK; until then, document fields on `scan.verification` and `scan.human_trust` in status JSON.

### 4. Own revocation

Mistakes and coercion matter as much as fakes. **Revocable by voucher** is a moral and product advantage over immutable biometric enrollment narratives.

### 5. Own the in-person ritual

Worldcoin owns the Orb line. Humanity owns **meet → load signing key → sign → network updates**:

- Scan explainer: network status ≠ keys in this tab
- **Sign as…** / default for vouching / clear keys from tab
- Technical, non-mystical copy on the vouch card

### 6. Own the anti-surveillance story (without naivety)

- No iris warehouse, no phone/email/government ID required to create a card.
- Trust from **humans willing to sign their name** (cryptographically) when they mean it.
- Closer to how communities already work-with better receipts.

---

## Positioning vs biometric global ID (fair comparison)

| Dimension | Biometric uniqueness (e.g. iris at scale) | Humanity vouch |
|-----------|------------------------------------------|----------------|
| Primary claim | One person, one slot | N humans staked attestations on this profile |
| Data | Central biometric graph | Public signed statements + aggregate counts |
| Revocation | Policy-heavy / contentious | Voucher-signed revoke + summary recalc |
| Consent model | Enrollment event | Repeated, voluntary in-person attestation |
| Best for | Global Sybil gates at signup | Communities, stewards, accountable gates |
| Weak on | Ongoing accountability, social meaning | Global uniqueness, liveness-at-vouch-time |

**Do not fight on their turf.** Do not claim vouches replace iris for every platform. Claim vouches are the standard for **“who backed this profile, and can we audit it?”**

---

## Copy kit (aligned with scan UI, May 2026)

**Default public statement (textarea):**

> I know this person as a distinct human. This vouch is public, revocable, and not legal identity proof.

**Vouch card (interactive):**

- Title: **Issue vouch**
- Lead: Publish a signed statement… Not government ID; visible on this network and revocable by you.
- Submit: **Sign and submit**
- Confirm: I met them in person. This vouch is public, revocable, and not legal identity proof.

**Vouched Human (scan subtitle):**

> {n} humans vouched for this card on this network. Latest vouch {recency}. This does not prove legal identity.

**Below threshold:**

> {n} of 3 vouches accepted. This card is not yet a Vouched Human.

**What scan does not prove:**

> That vouches were honest, that this person is globally unique, or that the holder of a printed QR is the card owner.

---

## Honest limits (say out loud)

1. **No liveness at vouch time** - Policy and ritual; not a lab scan.
2. **Cold start** - Early network needs stewards and founding vouches.
3. **Sybil at scale** - Corruptible steward/vouch rings require audit and governance, not biometrics alone.
4. **Trust ≠ character** - Vouch means humans backed the profile under rules, not “good actor.”

---

## Related docs

| Doc | Role |
|-----|------|
| [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) | Deep threats, controls, gaps, operator playbook |
| [`VOUCH_STEWARD_REVIEW_RUNBOOK.md`](VOUCH_STEWARD_REVIEW_RUNBOOK.md) | Operator triage cadence and API |
| [`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md) | Rules, quotas, UX, abuse hooks, implementation map |
| [`VOUCH_INTEGRATOR_POLICY_GUIDE.md`](VOUCH_INTEGRATOR_POLICY_GUIDE.md) | Integrator policy knobs: recency, live control, anti-KYC framing |
| [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) | Network vs device keys; Sign as… on scan |
| [`VOUCH_READY_KEYS_DESIGN.md`](VOUCH_READY_KEYS_DESIGN.md) | Default for vouching, auto-load, Stop |
| [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) | Levels 0–4; scan blocks |
| [`SKEPTIC_FAQ.md`](SKEPTIC_FAQ.md) | Public objections (gaming, Worldcoin, multi-card) |
| [`features/Human Verification v1.0.md`](features/Human%20Verification%20v1.0.md) | Ratification requirements |
| [`V1_ADVERSARIAL_REVIEW.md`](V1_ADVERSARIAL_REVIEW.md) | Perspective 1 (fake verification) |
