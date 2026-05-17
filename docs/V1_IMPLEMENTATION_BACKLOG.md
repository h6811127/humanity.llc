# V1 Implementation Backlog

**Status:** Build planning artifact  
**Purpose:** Convert the v1.0 contracts, flow audit, decision lock, and assumption register into an execution backlog.

---

## Operating Rule

Do not begin broad product buildout until the riskiest vertical slice is proven:

```text
Signed card -> HTTPS QR -> revoked status -> artifact intent -> unique printed-item QR -> Shopify paid webhook -> Printify order
```

This backlog assumes one engineer working 5-6 hours per day with Cursor as the primary development partner.

---

## Phase 0: Decisions To Lock Before Coding

These are not engineering tasks. They are short owner decisions needed to prevent rework.

### D-001: Choose First Physical Product

**Recommendation:** Start with one sticker and one flat card only if both pass Printify sample QA. Otherwise launch the strongest-scanning sticker first.

**Decision needed:**

- First product type: sticker, flat card, or both.
- Minimum QR physical size for the chosen template.
- Whether the printed artifact includes handle, manifesto line, badge label, or QR only.
- Whether any launch product may use batch QR, or whether every personalized physical item must use unique item QR.

**Exit criteria:**

- One launch template is chosen.
- Template constraints are written into the Printify catalog seed.

### D-002: Choose Shopify Implementation Style

**Recommendation:** Use a custom storefront with Shopify checkout handoff unless Hydrogen clearly reduces setup time.

**Decision needed:**

- Hydrogen, custom headless storefront, or Shopify theme checkout hybrid.
- Which Shopify environment will be used for test orders.
- Whether checkout returns to `humanity.llc` order status pages at launch.

**Exit criteria:**

- One Shopify path is selected.
- Test store credentials and webhook destination are available.

### D-003: Define Bootstrap Governance Keys

**Recommendation:** Use 3-of-5 named bootstrap operator/security keys with public fingerprints and sunset criteria.

**Decision needed:**

- Who can sign founding badges.
- Who can sign suspension records.
- What public policy page the card links to before formal governance exists.

**Exit criteria:**

- Bootstrap signer model is documented.
- V1 can issue badges and suspensions without pretending governance is complete.

### D-004: Lock Launch Copy Labels

**Recommendation:** Use `Registered`, `Vouched Human`, `Steward`, `Revoked`, and `Suspended` in early UI. Reserve `Verified Human` for protocol/docs or after copy testing.

**Decision needed:**

- Public labels for verification states.
- Product-page sentence explaining that buying merch does not grant verification.
- Revocation warning shown before physical orders.
- Bearer warning shown on scan pages: "This QR resolves to this Humanity Card. It does not prove the person holding this item is the card owner."

**Exit criteria:**

- Copy is approved for card, scan, product, checkout, and revoked pages.

### D-005: Publish Support And Revenue Policy

**Recommendation:** Keep it simple: price covers production, shipping/tax where applicable, platform/payment fees, support/reprint reserve, and Humanity Commons operating margin.

**Decision needed:**

- Refund/reprint promise for misprints, delayed shipments, bad QR print quality, and revoked QR.
- Manual production approval policy.
- Data retention policy for print order PII.

**Exit criteria:**

- Policies are ready before accepting real payment.

---

## Phase 1: Validation Spikes

These two spikes should start before app architecture expands. They answer whether the current v1 commerce/fulfillment design is viable.

### S-001: Shopify Metadata Survival Spike

**Question:** Can Shopify reliably preserve `artifact_intent_id` or equivalent cart/line metadata through checkout and paid order webhooks?

**Timebox:** 1-2 focused days.

**Build:**

- Create one test product and variant.
- Create a cart or checkout handoff with custom metadata containing:
  - `artifact_intent_id`
  - `profile_id`
  - `qr_id`
  - `product_id`
- Complete a test payment.
- Receive and persist the paid order webhook payload.
- Verify duplicate webhook handling with a replay fixture.

**Success criteria:**

- Paid order webhook includes enough metadata to recover the artifact intent.
- Metadata is available at line-item or order scope without secrets.
- Duplicate paid webhooks can be detected idempotently.
- Missing metadata results in `held_for_review`, not automatic fulfillment.

**Failure response:**

- If metadata is unreliable, choose a different Shopify implementation style or move to a hosted checkout fallback before building the storefront.

**Deliverables:**

- `shopify.order_paid` fixture.
- Minimal webhook verifier.
- Notes on exact metadata fields and Shopify API objects used.

### S-002: Printify Unique QR Sample Spike

**Question:** Can Printify produce personalized sticker/card orders with distinct QR artwork per physical item?

**Timebox:** 2-5 focused days plus shipping time.

**Build:**

- Select one sticker or flat card blueprint/provider/variant.
- For a multi-quantity test, generate distinct item QR IDs and artwork files for each personalized item.
- Generate QR artwork using the v1 HTTPS fallback format:

```text
https://humanity.llc/c/{profile_id}?q={qr_id}
```

- Preserve quiet zone and minimum QR size.
- Upload artwork through Printify.
- Submit a sample order with manual production approval.
- Scan the physical samples across multiple phones, lighting conditions, angles, and distances.

**Success criteria:**

- Generated artwork uploads successfully.
- Printify accepts distinct QR artwork per item.
- Physical samples scan reliably.
- QR resolves to active, revoked, and unknown status pages in test data.
- Revoking one printed-item QR leaves sibling item QR credentials active.
- Template constraints are specific enough to encode in `Print Catalog Template`.

**Failure response:**

- If QR quality fails, change template/provider/size before building broader product support.
- If unique per-item artwork is impractical, use one QR per batch/order and disclose that revoking one stolen item revokes the batch.

**Deliverables:**

- Approved template candidate with blueprint/provider/variant IDs.
- Physical QA notes.
- Minimum QR size and safe-area constraints.
- Sample order timeline and provider status mapping.

---

## Phase 2: Contract Scaffolding

Goal: turn prose specs into code contracts before feature work spreads.

### C-001: Repository Architecture Decision

**Build:**

- Choose app framework and deployment target.
- Decide whether resolver, storefront, and middleware live in one app or separate services for v1.
- Define environment variable names for Shopify, Printify, signing, and persistence.

**Exit criteria:**

- Architecture note committed.
- Local dev command starts the whole v1 slice.

### C-002: Shared Types And Schemas

**Build:**

- Implement schemas for:
  - Humanity Card
  - Verification Summary
  - QR Credential
  - Printed-Item QR Binding
  - Artifact Intent
  - Commerce Order Link
  - Print Artifact
  - Print Order
  - Webhook Event
- Add explicit enums and transition validators for card, verification, artifact intent, commerce order, print artifact, and print order states.

**Exit criteria:**

- Invalid fixtures fail schema validation.
- State transitions reject illegal moves.

### C-003: Signature And Canonicalization Harness

**Build:**

- Implement RFC 8785 JSON canonicalization.
- Implement Ed25519 signing and verification.
- Require payload type, protocol version, timestamp, nonce or unique ID, and subject profile ID on signed payloads.

**Exit criteria:**

- Card creation, QR issuance, vouch, revocation, badge, suspension, and export manifest fixtures can be signed and verified.
- Replay/nonce tests exist for revocation and vouching.

---

## Phase 3: Card, QR, And Resolver

Goal: launch the identity core without commerce.

### R-001: Card Creation

**Build:**

- Browser-generated Ed25519 keypair.
- Handle and manifesto validation.
- Signed public card document creation.
- Resolver persistence for public card data.
- Registered/unverified initial state.

**Exit criteria:**

- User can create a signed card without phone, email, government ID, or social login.
- Private key never leaves device in plaintext.

### R-002: QR Credential And HTTPS Fallback

**Build:**

- QR credential issuance and rotation.
- Item-scoped printed QR issuance and individual revocation.
- `GET /c/{profile_id}?q={qr_id}` public shortcut route.
- HTML and JSON card rendering.
- Cache headers for active, revoked, suspended, and expired states.

**Exit criteria:**

- Phone camera can open the HTTPS fallback route.
- Active QR renders the public card.
- Printed-item QR surfaces the bearer warning.
- Unknown QR and malformed QR show intentional status pages.

### R-003: Revocation And Suspension Status Pages

**Build:**

- Owner-signed revocation flow.
- Governance-signed suspension placeholder flow using bootstrap keys.
- Revoked, suspended, expired, unknown, and stale/offline UI states.

**Exit criteria:**

- Revoked QR resolves clearly instead of failing silently.
- New print artifact intents are blocked for revoked/suspended/expired QR.
- Revoking a printed-item QR does not revoke sibling printed-item QR credentials.

---

## Phase 4: Verification And Badges

Goal: make the card meaningful without overclaiming.

### V-001: Verification Summary

**Build:**

- Public states: `unverified`, `registered`, `verified_human`, `steward`, `revoked`, `suspended`.
- Numeric level plus string state for compatibility and logic.
- Latest accepted vouch recency.
- Public badge trail display.

**Exit criteria:**

- Card shows current verification summary.
- Card shows latest accepted vouch recency when active accepted vouches exist.
- Revoked and suspended states override positive badges.

### V-002: Vouching

**Build:**

- Signed vouch credential.
- Voucher eligibility checks.
- 3-vouch threshold.
- 5 active vouches per year quota.
- 90-day wait for newly verified humans before vouching.
- Vouch revocation.

**Exit criteria:**

- Three valid active vouches can upgrade a card.
- Revoked vouches stop counting.
- Private vouch notes never appear publicly.

### V-003: Founding Badges

**Build:**

- `founding_human` and `early_builder` badge records.
- Bootstrap issuer signature.
- Public issuance policy link.

**Exit criteria:**

- Founding badges are visible but not confused with paid products.

---

## Phase 5: Storefront And Artifact Intent

Goal: support one personalized product without overbuilding the store.

### SF-001: Story-Row Storefront Skeleton

**Build:**

- Store landing page.
- Product rows from seed data.
- Product detail page.
- General vs personalized product indicators.

**Exit criteria:**

- Store can represent approximately 50 product records but launch only exposes the small validated set.

### SF-002: Personalized Artifact Intent

**Build:**

- Create artifact intent from active QR.
- Allocate unique planned item QR IDs per personalized physical item.
- Generate preview/proof URL.
- Block revoked, suspended, or expired QR.
- Require card-owner authorization for personalized artifacts.
- Expire stale intents.

**Exit criteria:**

- Artifact intent can be attached to Shopify cart metadata.
- Intent contains no private keys, verification secrets, or private profile layers.
- Intent tracks item QR IDs for individualized revocation.

### SF-003: Proof And Consent UX

**Build:**

- Product preview.
- Printed QR persistence warning.
- Bearer warning that holding a printed QR does not prove card ownership or identity.
- Proof approval before checkout.
- Copy separating commerce from verification.

**Exit criteria:**

- User explicitly approves proof and persistence warning before payment.

---

## Phase 6: Shopify And Printify Fulfillment

Goal: complete one real paid order path safely.

### O-001: Shopify Webhook Consumer

**Build:**

- Verify Shopify webhook signatures.
- Normalize paid, canceled, and refunded events.
- Create commerce order link.
- Detect duplicate and out-of-order webhooks.
- Hold orders for review if artifact metadata is missing or invalid.

**Exit criteria:**

- Duplicate paid webhook never creates duplicate fulfillment.
- Missing metadata blocks Printify order submission.

### O-002: Printify Adapter

**Build:**

- Server-side Printify credential handling.
- Approved catalog endpoint.
- Upload generated QR artwork.
- Create Printify order after payment.
- Manual production approval gate.
- Cancel eligible orders.

**Exit criteria:**

- Printify token never reaches browser.
- Printify order is created only after paid Shopify webhook and internal validation.

### O-003: Order Timeline And Reconciliation

**Build:**

- Printify webhook receiver.
- Provider status normalization.
- Reconciliation polling for active orders.
- User-safe order timeline.
- Operator lookup by Shopify order, commerce order, artifact intent, and Printify order.

**Exit criteria:**

- On-hold, has-issues, source-check-failed, unfulfillable, fulfilled, partially fulfilled, and canceled states are actionable.
- Full shipping address is encrypted and not logged in normal logs.

---

## Phase 7: Launch Hardening

Goal: make the vertical slice credible for a founding cohort.

### H-001: Security Review Checklist

**Must verify:**

- Private keys stay device-held or encrypted in export bundles.
- Shopify and Printify never receive verification secrets.
- QR payload includes only profile ID, QR ID, and resolver URL.
- Unique printed-item QR IDs are not used for scan analytics, location tracking, or bearer identity claims.
- Signed payloads include type, version, timestamp, nonce/unique ID, and subject profile ID.
- Resolver does not collect scan analytics by default.

### H-002: Copy Comprehension Test

**Must verify:**

- Users understand `Registered` vs `Vouched Human`.
- Users understand buying merchandise does not grant verification.
- Users understand holding a sticker/card does not prove they are the card owner.
- Users understand item QR revocation changes that one scan result, not physical recall or sibling item QR credentials.

### H-003: Physical QA

**Must verify:**

- Printed QR scans across common phones.
- Multi-quantity personalized samples use distinct QR credentials.
- QR still scans under normal wear/lighting.
- Revoked QR page is unmistakable.

### H-004: Operational Readiness

**Must verify:**

- Refund/reprint/support policy is published.
- Manual production approval process is documented.
- Data retention policy for print order PII is published.
- Bootstrap governance key fingerprints and sunset criteria are public.

---

## Estimated Timeline

These estimates assume focused execution, fast owner decisions, and no major provider surprises.

### Private Technical Alpha: 4-6 Weeks

Includes:

- Contract scaffolding.
- Signed card creation.
- QR resolver and revoked status pages.
- Basic vouching model.
- Shopify and Printify spikes started or complete.

### End-To-End Private Alpha: 6-9 Weeks

Includes:

- One personalized sticker/card purchase path.
- Unique QR per personalized physical item.
- Shopify paid webhook ingestion.
- Printify order creation.
- Manual production approval.
- Basic order timeline.
- First physical sample QA.

### Credible V1 Public Launch: 12-16 Weeks

Includes:

- Hardened provider integrations.
- Reconciliation and support states.
- Copy testing.
- PII separation and retention policy.
- Bootstrap governance keys.
- Founding cohort launch.

### Conservative Support-Ready Launch: 16-20 Weeks

Includes:

- More thorough QA.
- Better operator tooling.
- More robust fulfillment edge cases.
- Accessibility and performance pass.
- More realistic incident/support playbooks.

---

## First Two Weeks

### Week 1

1. Lock D-001 through D-005.
2. Start S-001 Shopify metadata spike.
3. Scaffold schemas, enums, fixtures, and signature harness.

### Week 2

1. Finish Shopify webhook fixture and metadata decision.
3. Build signed card creation and public card route.
4. Build initial HTTPS QR route, bearer warning, and revoked status page.
5. Decide whether architecture stays Shopify + Printify or needs adjustment.

---

## Do Not Build Yet

- Device proof.
- Native checkout.
- Public search/discovery.
- Marketplace.
- Transfer UI.
- Apparel or bags with personalized QR.
- Scan analytics.
- Full multi-operator resolver network.
- Broad product catalog polish.
- Public claims stronger than the verification model can support.
