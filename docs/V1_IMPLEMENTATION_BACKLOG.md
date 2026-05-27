# V1 Implementation Backlog

**Status:** Build planning artifact  
**Purpose:** Convert the v1.0 contracts, flow audit, decision lock, and assumption register into an execution backlog.

**Build order:** Follow `docs/V1_0_ARCHITECTURE_ROADMAP.md` (canonical milestones M0–M10 and master steps). **Direction:** `docs/DEMOCRATIC_INFRASTRUCTURE.md`. **GTM framing:** `docs/MERCH_LED_V1.md`. **Merch QR policy:** `docs/MERCH_QR_LIFECYCLE_POLICY.md` (fulfillment mint, no calendar expiry on `print_artifact`, creative roadmap). Task IDs below map to roadmap steps.

---

## Operating Rule

Do not begin broad product buildout until the riskiest vertical slice is proven:

```text
Signed card -> HTTPS QR -> trust-state UI -> revoked status -> artifact intent -> unique printed-item QR -> Shopify paid webhook -> Printify order
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
- Forbidden claims list for v1 public copy: no legal identity, KYC, age verification, bot-proof identity, background check, or merch-based status language.

**Exit criteria:**

- Copy is approved for card, scan, product, checkout, and revoked pages.
- Copy passes the V1 Product Trust Model comprehension gates before public launch.

### D-004A: Decide Live Control Proof Scope

**Recommendation:** Treat live control proof as the first major trust upgrade after static QR/card resolution. Build it for private alpha if time allows; otherwise show the affordance as "coming soon" only in internal demos, not public UI.

**Decision needed:**

- Whether live control proof is in v1.0, private alpha, or v1.1.
- Challenge UX: scanner-generated QR, short phrase, or both.
- Challenge expiry and success display window.
- Whether recovery/rotation keys may sign challenges.
- Exact success copy: "Control proven moments ago. This does not prove legal identity."

**Exit criteria:**

- Live control proof is either implemented with tests or explicitly deferred from public launch copy.

### D-005: Publish Support And Revenue Policy

**Recommendation:** Keep it simple: price covers production, shipping/tax where applicable, platform/payment fees, support/reprint reserve, and Humanity Commons operating margin.

**Decision needed:**

- Refund/reprint promise for misprints, delayed shipments, bad QR print quality, and revoked QR.
- Manual production approval policy.
- Data retention policy for print order PII.

**Exit criteria:**

- Policies are ready before accepting real payment.

### D-006: Choose First Beachhead Use Case

**Recommendation:** Start with founding events/meetups and adjacent cooperative or member-organization pilots. Do not launch as generic identity infrastructure.

**Decision needed:**

- First use context: event/meetup, cooperative/member organization, privacy/open-source community, online anti-bot community, or another explicit segment.
- Who the first 25-100 founding users are.
- What real-world moment the demo is designed around.
- Whether the first public story is "public card for real humans," "event trust card," "member card for democratic communities," or another sharper wedge.

**Exit criteria:**

- One beachhead is selected.
- At least 5 target users can name a real context where they would use the card.
- At least 1 event, community, club, cooperative, or organization agrees to a pilot conversation.
- Launch copy is written for that beachhead, not for "everyone."

### D-007: Separate Product, Trust, And Movement Layers

**Recommendation:** Keep the scan/card UI practical and fast. Put movement narrative, launch language, skeptic answers, and governance depth in supporting pages - not on the scan surface. See `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`.

**Decision needed:**

- Which movement lines are approved for homepage and artifacts.
- Which lines are allowed on the scan page.
- Which claims are forbidden everywhere.
- Which visual identity direction is used for the mobile Safari card.
- Which skeptic FAQ answers are public at launch.

**Exit criteria:**

- Movement narrative is published.
- Launch language kit is approved.
- Skeptic FAQ is published.
- Visual identity principles are approved.
- The scan page does not become a political flyer or generic link profile.

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

**Product spec:** `docs/REVOKE_AND_LIFECYCLE_V1.md`  -  Revoke QR vs Disable card, minimal scan pages, owner warnings, planned privacy modes.

**Build:**

- Owner-signed revocation flow (`target_kind: qr_credential` | `card`).
- Governance-signed suspension placeholder flow using bootstrap keys.
- Revoked, suspended, expired, unknown, and stale/offline UI states.
- **M4.5 (shipped):** Minimal revoke/disable scans, **Disable card** label, **Show link**, owner ID warnings, revoke rules on `/created/`.
- **M4.6 (shipped):** Validity at create (7–365 days); minimal **qr_expired** scan.

**Exit criteria:**

- Revoked QR resolves clearly instead of failing silently.
- Card-disabled scan hides handle/manifesto by default (when M4.5 ships).
- New print artifact intents are blocked for revoked/suspended/expired QR.
- Revoking a printed-item QR does not revoke sibling printed-item QR credentials.

### R-004: Live Control Proof

**Build:**

- Short-lived challenge creation from public card and printed-item scan pages.
- Owner challenge review screen on the key-holding device.
- Signed challenge response verification.
- Scanner-side success, expired, and failed states.
- Clear limitation copy separating live control from legal identity, vouching, and artifact ownership.

**Exit criteria:**

- Valid owner signature shows recent control proof for 2-5 minutes.
- Expired challenge cannot be reused.
- Invalid signature does not display success.
- Live control proof does not mutate verification state or issue a badge.
- Public scan UI keeps live control proof visually separate from card status, human trust status, and printed-item QR status.

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

**Design:** `docs/M6_VOUCHING_DESIGN.md` · **Positioning:** `docs/VOUCH_TRUST_POSITIONING.md` · **Threat model:** `docs/VOUCH_THREAT_MODEL.md`

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

Goal: make the vertical slice credible for public launch.

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
- Users understand live control proof means recent key control, not legal identity or unique humanity.
- Users understand item QR revocation changes that one scan result, not physical recall or sibling item QR credentials.
- Users understand owner revocation and governance suspension are different states.

### H-002A: Two-Minute Trust Loop Demo

**Must verify:**

- A tester can create a signed card.
- A tester can scan the QR and understand the card status.
- A tester can view or receive vouches and understand `Vouched Human`.
- A tester can request live control proof, or the product clearly marks live control proof as deferred.
- A tester can revoke a printed-item QR.
- A tester can scan the revoked QR and understand that the physical object still exists but no longer resolves as active.
- A tester can see that sibling printed-item QR credentials remain active.

### H-002B: Market Use-Case Validation

**Must verify:**

- Founding users can name a real situation where they would use their card.
- At least one event, cooperative, club, online community, or member organization wants to pilot the card.
- Users do not summarize the product as "just a QR profile."
- Users invite at least some other humans because vouching or live proof creates value.
- Positive feedback is not merely ideological agreement with the mission.

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
- Forbidden claims list is published internally for launch copy review.

### H-006: PWA Install (device shell)

**Spec:** [`PWA_INSTALL.md`](PWA_INSTALL.md) · **Implementation:** [`PWA_INSTALL_IMPLEMENTATION.md`](PWA_INSTALL_IMPLEMENTATION.md)

**Must verify (after Phases 1–3 ship):**

- Manifest and icons deploy on Pages; shell HTML links manifest on `/`, `/wallet/`, `/created/` only.
- Scan and create flows never show install UX.
- Returning stewards (≥1 saved card) may see dismissible install card when inbox is not urgent.
- Installed standalone mode: hub, dot, and inbox still pass **P0-3** and **P2-1**.
- No service worker registered (v1).
- Vitest + **P1-PWA** pass.

**Exit criteria:**

- Phase table in `PWA_INSTALL.md` marked Phases 1–3 shipped.
- `npm run worker:test:pwa-install` green.

### H-005: Growth Loop Readiness

**Must verify:**

- Founding card screenshots are attractive enough to share.
- Vouch requests create a natural invitation loop.
- Live control proof is memorable in an in-person demo.
- Physical artifacts cause scans rather than only acting as merch.
- The anti-platform line is simple enough to repeat: "No phone. No ID. No ads. No tracking."
- The movement narrative gives people a reason to share without making the card UI harder to understand.
- Skeptical users can defend the concept using the public FAQ.

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
- Product trust UI separating card, human trust, artifact, and live control states.
- Live control proof if scoped into private alpha.
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
- V1 Product Trust Model comprehension gates.
- PII separation and retention policy.
- Bootstrap governance keys.
- Founding cohort launch.
- Beachhead market validation.
- One concrete pilot context.

### Conservative Support-Ready Launch: 16-20 Weeks

Includes:

- More thorough QA.
- Better operator tooling.
- More robust fulfillment edge cases.
- Accessibility and performance pass.
- More realistic incident/support playbooks.
- Stronger evidence of retention and invitations beyond novelty.

---

## First Two Weeks

### Week 1

1. Lock D-001 through D-005.
2. Lock D-006 beachhead use case.
3. Lock D-007 product/trust/movement separation.
4. Start S-001 Shopify metadata spike.
5. Scaffold schemas, enums, fixtures, and signature harness.

### Week 2

1. Finish Shopify webhook fixture and metadata decision.
3. Build signed card creation and public card route.
4. Build initial HTTPS QR route, trust-state UI blocks, bearer warning, and revoked status page.
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
- Public live control proof claims unless the challenge flow is actually implemented.
- Generic "identity for everyone" launch positioning.
- Venture fundraising narrative before beachhead use, retention, and buyer/funder signals exist.
