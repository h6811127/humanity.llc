# V1 Adversarial Review

**Status:** Pre-rebuild hardening artifact  
**Purpose:** Stress-test the V1 docs from hostile or failure-prone perspectives before implementation.

---

## Executive Findings

| Severity | Finding | Required Action |
|---|---|---|
| Critical | Shopify artifact-intent metadata is a single point of failure for personalized fulfillment. | Validate with an integration spike before building broad Storefront features. |
| Critical | "Verified Human" can overclaim if vouching is socially weak. | Use `Vouched Human` for launch copy unless stronger language passes comprehension testing. Frame vouch as accountable attestation, not biometric personhood (`docs/VOUCH_TRUST_POSITIONING.md`). |
| High | Physical QR revocation is easy to misunderstand. | Show warnings before purchase and explicit status pages after revocation. |
| High | Duplicate webhooks/retries can create duplicate Printify orders. | Idempotency must be built before live orders. |
| High | Print QA failure after payment creates refunds/support pain. | Perform QR scan QA before checkout and again before Printify submission. |
| Medium | Live control proof can be misunderstood as legal identity or unique-human proof. | Label it as recent key-control evidence only and keep it separate from verification state. |
| Medium | The product may be admired but not urgently used. | Pick a beachhead and validate real use cases before broad launch. |
| Medium | Physical artifacts may become merch instead of a trust loop. | Launch one artifact tied to scanning, vouching, live proof, and revocation. |
| Medium | Bootstrap governance keys are undefined. | Define temporary signer authority and sunset criteria before launch. |
| High | Single-operator network becomes permanent honeypot and capture risk. | Publish federation strategy; ship open spec; milestone second operator per PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY. |
| Medium | Public launch abuse without rate limits overwhelms ops. | Rate limits + suspension policy before broad marketing; avoid permanent invite-only gate. |
| Medium | Support tooling is under-specified for failed/on-hold/refunded orders. | Add operator views or at least internal lookup contracts before launch. |

---

## Perspective 1: Abuser Trying To Fake Verification

**Deep dive:** `docs/VOUCH_THREAT_MODEL.md` (threat IDs, attack trees, operator playbook).

### Attack Paths

| Attack | Likelihood | Impact | Current Defense | Gap |
|---|---|---|---|---|
| Create many registered cards. | High | Medium | Rate limits, invite/waitlist controls. | Abuse-control policy is not fully specified. |
| **4-person clique** mutual vouch (all reach VH). | Medium | High | Threshold=3, quota, 90d wait. | No automated clique detection; manual triage. |
| **Rotating vouch cycle** (A→B→C→A). | Medium | High | Distinct vouchers per vouchee. | `closed_loop_only` flag does not catch; see **G-02**. |
| Collusive vouch ring (mutual-only). | Medium | High | 3-vouch threshold, 5/year quota, 90-day wait; `closed_loop_only`. | Steward review queue not shipped. |
| **Steward fast-path farm** (no 90d wait). | Medium | High | 5/year quota; audit burst flag. | No per-steward cap; bootstrap concentration. |
| Stolen voucher keys / backup. | Medium | High | User custody; signed POST. | No PIN before sign; auto-activate increases shared-device risk. |
| Remote vouch (never met in person). | High | Medium | UX checkbox only. | No liveness at vouch time (**V-06**). |
| Print QR artifact and imply it proves the wearer is verified. | High | High | Copy says artifacts do not grant verification. | Physical artifact design must avoid stale/mutable verification labels. |
| Replay or forge vouch payloads. | Medium | High | Ed25519 signatures and canonical payloads. | Enforced on vouch POST. |
| Integrator treats **Vouched Human** as KYC. | Medium | High | Trust model + limitations copy. | Integrator policy not enforceable in protocol. |
| Use someone else's QR on merchandise. | Medium | Medium | Personalization requires active QR and owner context. | Need authorization check tying `profile_id` to buyer/session before artifact intent. |
| Steal or copy someone's printed sticker and present it as proof of identity. | Medium | High | Scan page resolves current card status. | Printed-item QR must be individually revocable and scan page must warn that possession does not prove identity. |
| Continue using revoked printed QR. | High | Medium | Revoked status page. | Scanner UI must be unmistakable. |
| AI-scaled personas + stolen keys. | Medium | High | Same crypto/quota bar. | Indistinguishable from legitimate use if keys compromised. |

### Required Hardening

- Add explicit artifact-intent authorization: only the card owner or authorized session can create personalized artifacts for a `profile_id`.
- Add unique item-scoped QR credentials for personalized physical items.
- Add signed payload `type` and nonce to every vouch, QR rotation, revocation, and badge record.
- **Ship steward review queue** for `listVouchAuditFlags` (closed loop, burst, shared set).
- Add graph detection for **cliques and directed cycles** (see `VOUCH_THREAT_MODEL.md` §9 P1).
- Avoid printing "Verified Human" as static text on artifacts in V1.

---

## Perspective 2: Customer Support Handling Failed Orders

### Failure Cases

| Case | User Experience Risk | Required Internal State |
|---|---|---|
| Payment succeeds but artifact intent missing. | User paid but no fulfillment starts. | `held_for_review`, with Shopify order ID and safe support note. |
| Artifact intent expired after payment. | User paid for stale proof. | `held_for_review`, regenerate/reconfirm or refund. |
| Card suspended after payment before production. | User may expect fulfillment. | `held_for_review`; policy decision required. |
| Printify rejects address. | User sees vague failure. | `has_issues` with user-correctable address reason. |
| Source check failed. | User thinks order vanished. | `has_issues` with operator action. |
| Duplicate webhook received. | Duplicate product shipped/charged. | Idempotent no-op with audit event. |
| Order enters production before cancellation. | User expects cancellation. | Clear "cannot cancel after production starts" policy. |
| QR revoked after shipment. | User wants replacement or refund. | Support macro: revocation changes scan result, not physical recall. |

### Required Hardening

- Add an operator-only order lookup by Shopify order ID, commerce order ID, artifact intent ID, and Printify order ID.
- Keep user-facing statuses separate from provider raw statuses.
- Publish a refund/reprint policy before taking orders.
- Keep manual production approval for launch.

---

## Perspective 3: Privacy Reviewer Looking For PII Leaks

### Leak Paths

| Leak Path | Risk | Required Control |
|---|---|---|
| QR payload includes order or owner metadata. | Public QR leaks PII or commerce state. | QR payload contains only `profile_id`, `qr_id`, network URL. |
| Shopify metadata includes secrets. | Commerce provider stores identity secrets. | Cart metadata includes only `artifact_intent_id` and product refs. |
| Logs contain full shipping address. | Operator/log breach. | Redact logs; encrypt order PII. |
| Export bundle includes payment/shipping secrets by default. | Identity export leaks order data. | Split identity export from order data export. |
| Vouch private notes become public. | Social/private harm. | Private notes encrypted or omitted from public vouch records. |
| Scan analytics creep in through CDN/app logs. | Silent surveillance. | No scan analytics; IP anonymization; no tracking pixels. |

### Required Hardening

- Define a data retention policy for print order PII before launch.
- Define log redaction requirements in implementation tickets.
- Add "no secrets in Shopify metadata" test.

---

## Perspective 4: Scanner Trying To Understand The QR

### Confusion Risks

| Scanner Question | If Unclear | Required UI Answer |
|---|---|---|
| Is this person verified? | Artifact may be mistaken for verification. | Show current card verification state separately from product ownership or purchase. |
| Is the holder the card owner? | Stolen/copied sticker may be accepted as identity proof. | Say "This QR resolves to this Humanity Card. It does not prove the person holding it is the card owner." |
| Is this status current? | Stale cache can mislead. | Show stale/offline banner and last refreshed time. |
| What does revoked mean? | User assumes the person is banned or fake. | Explain "owner revoked this card/QR" vs suspension. |
| What data was logged? | Trust loss. | Show no scan analytics by default. |
| Why does a printed card say one thing but scan says another? | Printed mutable status becomes misleading. | Do not print mutable verification state in V1. |
| Did the nearby person prove control of this card? | Static QR may be overtrusted. | Offer live control proof, or state that live proof is not available. |
| Does live control proof mean legal identity? | Key control may be overclaimed. | Say "Control proven moments ago. This does not prove legal identity." |

### Required Hardening

- Public scan page needs three visually separate blocks:
  1. Card status.
  2. Human verification status.
  3. Printed-item QR status and bearer warning, when applicable.
- Revoked and suspended pages must look intentionally designed, not like errors.
- Public copy must say "Scan result is current; printed artifact may be old."
- Live control proof must be visually separate from card status, human trust status, and printed-item QR status.

---

## Perspective 5: Future Engineer Building Without The Founder

### Buildability Problems

| Problem | Why It Hurts | Required Fix |
|---|---|---|
| Duplicate model names across specs. | Engineers implement incompatible shapes. | Use `V1_IMPLEMENTATION_CONTRACTS.md` as build source. |
| Print artifact, printed-item QR, and print order naming confusion. | Artwork proofs, item QR revocation, and provider refs get mixed. | Enforce distinct print artifact, item QR, and fulfillment order definitions. |
| Verification level vs state ambiguity. | UI and auth checks drift. | Use both: numeric `level` for compatibility, string `state` for logic. |
| Shopify as source of truth vs Humanity as identity source. | Data ownership bugs. | Shopify owns commerce; Humanity owns identity/artifact semantics. |
| Printify order status mapping incomplete. | Support timelines inconsistent. | Normalize provider statuses into internal statuses. |
| Governance keys undefined. | Suspension/badge issuance blocked or insecure. | Define bootstrap signer records. |
| Export scope vague. | Accidentally exports PII/secrets. | Split identity export and order-data export. |

### Required Hardening

- Treat `docs/V1_IMPLEMENTATION_CONTRACTS.md` as the implementation source of truth.
- Convert contracts into test fixtures before writing full app code.
- Build state machines as explicit enums and transition validators.
- Add integration tests around every provider boundary.

---

## Perspective 6: Investor Or Growth Reviewer Looking For A Real Market

### Market Failure Cases

| Failure | Why It Hurts | Required Fix |
|---|---|---|
| Users call it "just a QR profile." | The trust primitive is not differentiated. | Center signed status, vouches, live control proof, and revocation in the first demo. |
| People like the mission but cannot name a use case. | Admiration does not create retention or revenue. | Pick one beachhead: events/meetups first, cooperative/member organization pilots second. |
| Founding users do not invite others. | The vouch network cannot bootstrap. | Track invitations, vouch requests, and repeated scans as product metrics. |
| Artifacts are bought as merch only. | Commerce distracts from trust infrastructure. | Keep one artifact tied directly to the trust loop and delay catalog expansion. |
| Organizations say "interesting" but do not pilot. | No buyer or institutional path exists. | Test concrete workflows: event check-in, member onboarding, consent-based directories, ceremony support. |
| Venture capital expects surveillance-scale growth. | Capital can pressure the product away from its trust commitments. | Prefer grants, customer revenue, donations, member loans, recoverable grants, capped revenue-based financing, or non-voting capital unless terms preserve user rights. |

### Required Hardening

- Add market validation gates before public launch.
- Write launch copy for a specific beachhead, not "identity for everyone."
- Measure whether users invite others without founder prompting.
- Treat "willing to pay for a sticker" as weaker evidence than repeated scans, vouches, and community pilots.
- Do not pitch this as venture-ready until there is a repeatable use case, buyer/funder signal, retention, and a growth loop consistent with the trust model.

---

## Questions You Were Not Asking But Should Be

1. What is the first physical product that proves the whole loop without overbuilding the store?
2. What exact phrase replaces "verified human" if early vouching feels too weak?
3. Is live control proof in v1.0, private alpha, or v1.1?
4. What is the first beachhead use case: event, cooperative, online community, or something else?
5. Who has authority to issue founding badges before governance exists?
6. Who can suspend a card on day one, and what proof must be public?
7. What happens when Shopify payment succeeds but Humanity refuses fulfillment?
8. What refund/reprint promise is made for misprints, revoked QR, and provider failures?
9. How will a scanner distinguish "authentic object" from "verified person" in 3 seconds?
10. What data must customer support see, and what data must it never see?
11. What launch scope still feels like V1 if we remove device proof, transfer UI, native checkout, marketplace, and search?
12. What are the first five things someone malicious will do to make the product look fake?
13. What will you refuse to build even if users ask for it because it weakens trust?
14. What evidence would prove this is more than a compelling manifesto?

---

## Adversarial Verdict

The V1 concept is strong, but the rebuild should not begin as a broad "build all docs" project. It should begin as a narrow, instrumented, test-heavy vertical slice that proves the riskiest boundary:

```text
Signed card -> HTTPS QR -> trust-state UI -> artifact intent -> unique item QR -> Shopify paid webhook -> Printify order -> revoked item QR status
```

Do not expand to device proof, marketplace behavior, public directories, transfer UI, or large catalogs until that loop survives real samples, duplicate webhooks, revocation, and support-state testing.
