# V1 Adversarial Review

**Status:** Pre-rebuild hardening artifact  
**Purpose:** Stress-test the V1 docs from hostile or failure-prone perspectives before implementation.

---

## Executive Findings

| Severity | Finding | Required Action |
|---|---|---|
| Critical | Shopify artifact-intent metadata is a single point of failure for personalized fulfillment. | Validate with an integration spike before building broad Storefront features. |
| Critical | "Verified Human" can overclaim if vouching is socially weak. | Use `Vouched Human` for launch copy unless stronger language passes comprehension testing. |
| High | Physical QR revocation is easy to misunderstand. | Show warnings before purchase and explicit status pages after revocation. |
| High | Duplicate webhooks/retries can create duplicate Printify orders. | Idempotency must be built before live orders. |
| High | Print QA failure after payment creates refunds/support pain. | Perform QR scan QA before checkout and again before Printify submission. |
| Medium | Live control proof can be misunderstood as legal identity or unique-human proof. | Label it as recent key-control evidence only and keep it separate from verification state. |
| Medium | Bootstrap governance keys are undefined. | Define temporary signer authority and sunset criteria before launch. |
| Medium | Support tooling is under-specified for failed/on-hold/refunded orders. | Add operator views or at least internal lookup contracts before launch. |

---

## Perspective 1: Abuser Trying To Fake Verification

### Attack Paths

| Attack | Likelihood | Impact | Current Defense | Gap |
|---|---|---|---|---|
| Create many registered cards. | High | Medium | Rate limits, invite/waitlist controls. | Abuse-control policy is not fully specified. |
| Collusive vouch ring. | Medium | High | 3-vouch threshold, 5/year quota, 90-day wait. | Graph audit rules and steward response process need more detail. |
| Print QR artifact and imply it proves the wearer is verified. | High | High | Copy says artifacts do not grant verification. | Physical artifact design must avoid stale/mutable verification labels. |
| Replay or forge vouch payloads. | Medium | High | Ed25519 signatures and canonical payloads. | Payload type/nonce requirements must be enforced everywhere. |
| Use someone else's QR on merchandise. | Medium | Medium | Personalization requires active QR and owner context. | Need authorization check tying `profile_id` to buyer/session before artifact intent. |
| Steal or copy someone's printed sticker and present it as proof of identity. | Medium | High | Scan page resolves current card status. | Printed-item QR must be individually revocable and scan page must warn that possession does not prove identity. |
| Continue using revoked printed QR. | High | Medium | Revoked status page. | Scanner UI must be unmistakable. |

### Required Hardening

- Add explicit artifact-intent authorization: only the card owner or authorized session can create personalized artifacts for a `profile_id`.
- Add unique item-scoped QR credentials for personalized physical items.
- Add signed payload `type` and nonce to every vouch, QR rotation, revocation, and badge record.
- Add vouch abuse audit hooks without publicizing private social graph details.
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
| QR payload includes order or owner metadata. | Public QR leaks PII or commerce state. | QR payload contains only `profile_id`, `qr_id`, resolver URL. |
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

## Questions You Were Not Asking But Should Be

1. What is the first physical product that proves the whole loop without overbuilding the store?
2. What exact phrase replaces "verified human" if early vouching feels too weak?
3. Is live control proof in v1.0, private alpha, or v1.1?
4. Who has authority to issue founding badges before governance exists?
5. Who can suspend a card on day one, and what proof must be public?
6. What happens when Shopify payment succeeds but Humanity refuses fulfillment?
7. What refund/reprint promise is made for misprints, revoked QR, and provider failures?
8. How will a scanner distinguish "authentic object" from "verified person" in 3 seconds?
9. What data must customer support see, and what data must it never see?
10. What launch scope still feels like V1 if we remove device proof, transfer UI, native checkout, marketplace, and search?
11. What are the first five things someone malicious will do to make the product look fake?
12. What will you refuse to build even if users ask for it because it weakens trust?

---

## Adversarial Verdict

The V1 concept is strong, but the rebuild should not begin as a broad "build all docs" project. It should begin as a narrow, instrumented, test-heavy vertical slice that proves the riskiest boundary:

```text
Signed card -> HTTPS QR -> trust-state UI -> artifact intent -> unique item QR -> Shopify paid webhook -> Printify order -> revoked item QR status
```

Do not expand to device proof, marketplace behavior, public directories, transfer UI, or large catalogs until that loop survives real samples, duplicate webhooks, revocation, and support-state testing.
