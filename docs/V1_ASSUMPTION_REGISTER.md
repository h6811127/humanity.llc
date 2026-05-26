# V1 Assumption Register

**Status:** Pre-rebuild hardening artifact  
**Purpose:** Make hidden product, technical, legal, and operational assumptions explicit before implementation.

**Strategic architecture:** `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`

---

## Priority Scale

| Priority | Meaning |
|---|---|
| P0 | Can derail the rebuild or invalidate the architecture. Validate before or during the first implementation slice. |
| P1 | Can cause meaningful rework or product confusion. Validate before public launch. |
| P2 | Can be handled after the first slice if clearly deferred. |

---

## P0 Assumptions

| ID | Assumption | Owner | Confidence | Validation Method | If False |
|---|---|---|---|---|---|
| A-001 | Shopify checkout can preserve `artifact_intent_id` or equivalent cart/line metadata through checkout and paid order webhooks. | Engineering | High for capability, Medium until spike | Verified from Shopify Storefront API docs: cart lines support custom attributes, order line items expose custom attributes, and cart metafields can be copied to order metafields when configured. Still requires a live metadata spike because the risk is checkout/webhook behavior in the chosen Shopify setup. | Personalized fulfillment cannot be reliably linked after payment; architecture needs a different checkout/cart strategy. |
| A-002 | Shopify paid webhooks can be authenticated, deduplicated, and processed idempotently before Printify order creation. | Engineering | High for feasibility, Medium until harness | Verified as a standard Shopify integration pattern, but must be proven locally with signature verification, replay tests, duplicate webhook fixtures, and out-of-order event handling. | Duplicate or spoofed Printify orders become possible. |
| A-003 | Printify supports per-order custom artwork upload/order submission for the selected sticker/card template without forcing public Printify product browsing. | Engineering/Ops | High for API capability, Medium until sample order | Verified from Printify API docs/search: Printify exposes uploads/images and order/product APIs that can reference uploaded artwork. Still requires a real sticker/card proof because product-template and placeholder behavior are provider-specific. | Need another fulfillment provider or manual fulfillment for V1. |
| A-004 | Generated QR artwork remains scannable after Printify production constraints for chosen sticker/card sizes. | Design/Ops | Unverified, Medium risk | Not verifiable from API docs alone. Must order physical samples and scan-test across phones, lighting, distance, damage, and material finish. | Product template must change; apparel/bags stay deferred. |
| A-005 | Public HTTPS QR fallback is acceptable as the printed QR target, even though the protocol also defines `hc://`. | Product/Engineering | High | Verified by platform reality: consumer phone cameras reliably handle HTTPS URLs; custom URI schemes are app-dependent. Still test on iOS/Android with `https://humanity.llc/c/{profile_id}?q={qr_id}`. | Printed QR UX becomes app-dependent and less viral. |
| A-006 | Printify can support unique QR artwork per personalized physical item without making order creation impractical. | Engineering/Ops | High conceptually, Medium until sample order | Validate with a multi-quantity sample order that uploads distinct artwork/QR files per item or otherwise maps item QR IDs safely. | Use one QR per batch/order and disclose that revoking one stolen item revokes the batch. |
| A-007 | Vouch-based verification can feel meaningful without legal identity, phone, email, or device proof in the first release. | Product/Governance | Unverified, Medium/High product risk | Validate with public launch users and optional early testers. Recommended wording: avoid overclaiming "proof"; frame as "vouched human" until stronger governance exists. | The "verified human" claim may feel weak or confusing; launch copy must downshift to "vouched human." |
| A-008 | Artifact ownership and human verification can be explained clearly enough that merch does not appear to buy status. | Product/Design | Unverified, Medium/High product risk | Must be tested with product page and card page copy. Recommended rule: every commerce surface explicitly says "buying merch does not mean verified human." | Store may undermine trust by seeming pay-to-play. |
| A-009 | Scanner-visible warning can prevent people from treating a stolen sticker as proof of identity. | Product/Design | Unverified, Medium/High product risk | Copy test scan pages with the warning: "This QR resolves to this Humanity Card. It does not prove the person holding this item is the card owner." | Require live owner proof for higher-trust contexts sooner. |
| A-010 | A single Humanity-controlled Printify merchant account is sufficient for launch operations. | Ops | High for launch | Verified as the simpler launch model because Printify supports personal access tokens for a merchant account and OAuth can be deferred. Must still confirm account, scopes, shop ID, production approval workflow, and support ownership. | OAuth/multi-merchant scope moves earlier or provider choice changes. |
| A-011 | No-scan-analytics default is compatible with product goals and operational needs. | Product/Governance | Product decision, not externally verifiable | Verified against the trust thesis and Constitution. Operationally, rely on order/support events and network health, not scan analytics. If scan metrics become desired, they require a separate consent model. | Need consent model before launch, or analytics must remain excluded. |
| A-012 | Card and item QR revocation can be represented as network status without physically recalling artifacts. | Product/Support | High conceptually, needs copy test | Technically sound because printed QR resolves through Humanity status. Must validate user comprehension with warning/support copy. | Physical artifacts create false expectations or support disputes. |
| A-012A | `Vouched Human` is clearer and more trustworthy than `Verified Human` for early vouch-based status. | Product/Design | Unverified, Medium risk | Copy test `Registered`, `Vouched Human`, `Founding Human`, `Steward`, `Revoked By Owner`, and `Suspended Under Public Rules` with target users. | If users find `Vouched Human` weak or confusing, revise labels before launch rather than overclaiming. |
| A-012B | Live control proof materially improves in-person trust without being confused for legal identity. | Product/Security | Unverified, Medium risk | Prototype scanner challenge and owner signature flow; test whether users understand "recent key control" vs identity verification. | Defer public live proof UI or strengthen copy if users treat it as legal identity. |
| A-012C | A narrow beachhead such as events, meetups, or cooperative/member organizations will make the trust loop easier to understand than a generic identity launch. | Product/Growth | Unverified, High product risk | Run interviews and at least one pilot with an event, cooperative, club, or online community; pursue second-network-operator conversation. | Do not expand storefront or governance machinery until a real use case is found. |
| A-012D | Users will invite others because vouching/live proof creates value, not just because they like the mission. | Growth | Unverified, High product risk | Track public launch vouch requests, repeated scans, stranger create rate, and whether users can name a real use case. | Reposition around a sharper job-to-be-done or pause growth work. |
| A-012E | A minimal reference network plus published spec can grow institutional power without a public blockchain core. | Strategy/Engineering | Medium | Ship Phase A; document second-network-operator path; avoid positioning as crypto identity. | Reframe around federation or accept chain-based tradeoffs explicitly. |
| A-012F | Public launch without cohort gate will not cause unmanageable abuse before rate limits and suspension policy exist. | Security/Ops | Unverified, Medium risk | Monitor create rate (`/.well-known/hc/v1/operator/create-rate-monitor`), impersonation reports, and support load first 30 days. | Temporary stricter rate limits - not permanent invite-only product gate. |

---

## P1 Assumptions

| ID | Assumption | Owner | Confidence | Validation Method | If False |
|---|---|---|---|---|---|
| A-013 | Story-row storefront will be easier to understand than a conventional grid for approximately 50 products. | Product/Design | Unverified | Needs prototype test. Recommendation: story rows remain primary, but include a simple "all artifacts" fallback if users cannot find products. | Need secondary navigation or reduced catalog. |

### Vouch trust (see `docs/VOUCH_THREAT_MODEL.md`)

| ID | Assumption | Owner | Confidence | Validation Method | If False |
|---|---|---|---|---|---|
| VT-01 | Operators triage `listVouchAuditFlags` within days of launch traffic. | Ops/Steward | Unverified | Runbook + weekly review during founding cohort. | Cliques persist; lower trust in VH label. |
| VT-02 | Users and integrators understand **Vouched Human ≠ legal ID / KYC**. | Product | Unverified | Comprehension test + support macros. | Revise labels; tighten integrator docs. |
| VT-03 | 4-person mutual-vouch cliques are rare at early scale. | Security | Unverified | Monitor flags + creation velocity. | Add clique detection or raise threshold experiment. |
| VT-04 | Steward keys are few, guarded, and not shared across people. | Ops | Medium | Steward onboarding checklist. | Per-steward caps; faster suspend on burst. |
| VT-05 | Integrators adopt recency + possession policies when gating on VH. | Ecosystem | Unverified | Publish policy snippet; pilot one partner. | Misuse causes harm; public FAQ on integrator misuse. |
| A-014 | Approximately 50 products is operationally manageable while launching identity and fulfillment systems. | Ops/Product | Low | Recommendation: 50 may exist as planned product records, but launch should expose 10-20 products and only 1-2 personalized product types. | Cut catalog drastically for launch. |
| A-015 | Founding badges add legitimacy rather than creating status anxiety or governance politics. | Product/Governance | Low | Recommendation: allow `founding_human` and `early_builder` only as non-verification badges with public issuance rules. | Defer founding badges or make them non-verification badges. |
| A-016 | Manual production approval is operationally sustainable for early orders. | Ops | Medium | Recommendation: keep manual approval until order volume exceeds operator capacity; build automated QA gates first. | Need stronger automated proof gates before launch. |
| A-017 | Printify webhook topics/statuses are reliable enough with polling reconciliation. | Engineering/Ops | Medium | Verified as a standard provider pattern but not enough alone. Must run test order lifecycle and missed-webhook simulation. | Increase polling/reconciliation reliance and operator dashboard scope. |
| A-018 | Network cache policy can balance fast scans with revocation freshness. | Engineering/Security | High | Technically reasonable with short TTL for revoked/suspended status. Must test CDN/browser behavior. | Tighten cache and accept slower scans. |
| A-019 | A `410 Gone` card response plus HTML revoked page is usable for browsers and clients. | Engineering/Product | Medium | Recommendation: use machine-readable status endpoint; for browser-facing revoked pages, consider `200` HTML with visible revoked state plus canonical status JSON returning `410`. | Use 200 HTML status page for browsers with machine-readable status endpoint for clients. |
| A-020 | Export bundle can include print artifact metadata without exposing commerce secrets. | Engineering/Privacy | Medium | Recommendation: identity export includes artifact IDs/status only; separate order-data export includes shipping/payment records if user requests it. | Export scope must split identity export from order-data export. |
| A-021 | User support can handle failed/on-hold Printify orders using internal provider refs without exposing those refs publicly. | Support/Ops | Medium | Recommendation: build minimal operator lookup before launch by Shopify order, commerce order, artifact intent, and Printify order. | Need operator tooling before launch. |

---

## P2 Assumptions

| ID | Assumption | Owner | Confidence | Validation Method | If False |
|---|---|---|---|---|---|
| A-022 | Transfer records can be modeled now without implementing transfer UI. | Engineering/Governance | High | Verified as safe only if transfer records are inert and hidden from V1 UI. Keep schema append-only and unused in launch flows. | Remove transfer UI entirely and keep only future placeholder. |
| A-023 | Ceremony verification can be implemented after vouching without rewriting verification summaries. | Engineering/Governance | Medium | Likely safe if verification summary is credential-method agnostic. Keep ceremony as a credential type but do not launch ceremony UI until an actual ceremony exists. | Need verification model refactor before ceremonies. |
| A-024 | Device proof can be added later as another credential method. | Security/Engineering | Low | Not verified. Treat as speculative until privacy/security review proves a safe method. Do not let device proof shape the first rebuild. | Device proof becomes a separate feature or is abandoned. |
| A-025 | Apparel and bags can be safely added after sticker/card launch. | Ops/Design | Medium | Not verified for QR use. Requires physical QA by material and print area. Keep V1 physical artifacts to stickers/cards until samples pass. | Keep V1 physical artifacts to stickers/cards only. |

---

## Riskiest Unknowns

1. **Shopify metadata survival:** if artifact intents cannot reliably survive checkout, the entire personalized fulfillment path needs rework.
2. **Unique printed-item QR feasibility:** if Printify cannot support distinct QR artwork per personalized item cleanly, individual sticker revocation becomes harder.
3. **Physical QR quality:** if Printify output does not scan reliably, the physical artifact loop becomes embarrassing and support-heavy.
4. **Verification language:** if "verified human" overclaims what vouching proves, trust will degrade immediately.
5. **Bearer confusion:** if scanners treat possession of a sticker as proof of identity, the trust model fails socially.
6. **Live control confusion:** if users treat live control proof as legal identity or human uniqueness, a trust upgrade becomes another overclaim.
7. **No urgent use case:** if users admire the idea but cannot name where they would use it, the product becomes a manifesto instead of a tool.
8. **Vouch graph gaming:** if 4-cliques or steward farms outpace operator triage, **Vouched Human** degrades quickly (`docs/VOUCH_THREAT_MODEL.md` **R-02**, **R-03**).
8. **Weak growth loop:** if users do not invite others to vouch, scan, or pilot the card in a community, the network will not bootstrap.
9. **Operational support:** if on-hold, failed, duplicate, and refunded orders lack clear internal states, launch will become support-driven chaos.

---

## Validation Spikes Before Restart

| Spike | Timebox | Success Criteria |
|---|---|---|
| Shopify metadata spike | 1-2 days | Paid webhook includes enough cart/line metadata to recover `artifact_intent_id`. |
| Printify QR sample spike | 2-5 days plus shipping time | Generated unique QR artwork can be uploaded, ordered, printed, and scanned on physical sample. |
| Copy comprehension test | 1 day | Users distinguish "printed item resolves to a card" from "holder is the vouched human/card owner" after reading product/card/scan pages. |
| Revocation UX test | 1 day | Users understand that item QR revocation changes one scan result but does not recall physical items or revoke sibling stickers/cards. |
| Live control proof comprehension test | 1 day | Users understand that live control proves recent card-key control, not legal identity, vouching, or unique humanity. |
| Beachhead use-case test | 2-5 days | At least 5 target users and 1 potential community/event/org can name a concrete situation where they would use Humanity Cards. |
| Founding growth-loop test | 30-60 days | Founding users invite others, request/give vouches, and scan cards without repeated founder prompting. |
| Webhook/idempotency harness | 1-2 days | Duplicate Shopify/Printify webhooks do not duplicate fulfillment or corrupt state. |

---

## External Verification Notes

These notes distinguish "API capability appears supported" from "safe for launch."

- Shopify metadata: Shopify Storefront API documentation exposes cart/cart-line attributes and order-line custom attributes. This supports the architecture in principle, but a live spike is still required because the actual implementation choice (Hydrogen, custom headless cart, Checkout UI extensions, Shopify plan constraints, webhook payload shape) can affect how reliably `artifact_intent_id` returns after payment.
- Shopify checkout vs native: Shopify checkout avoids most first-party responsibility for payment security, checkout uptime, tax primitives, refund/admin basics, customer order emails, and fraud/risk tooling. AI can accelerate glue code, but not remove live payment, tax, refund, dispute, and support edge cases.
- Printify custom artwork: Printify API documentation exposes image uploads and product/order APIs suitable for generated artwork workflows. This verifies feasibility in principle, but sample orders are still required because QR scan quality depends on product template, print provider, material, sizing, and placement.
- Printify operations: API support does not prove webhook reliability, production timing, cancellation windows, or support burden. Those remain operational assumptions until tested with real orders.
- Verification model: No external API can verify whether "vouched human" feels trustworthy. This remains a product/governance assumption that requires user research and public launch / optional early tester feedback.

---

## Checkout Development Time Estimate

Assumption: AI-assisted development helps generate code, tests, schemas, webhook handlers, and UI faster, but it does **not** remove provider constraints, tax/payment compliance, refund/dispute operations, fraud handling, or live integration testing.

| Checkout Approach | AI-Assisted Vertical Slice | Production-Hardened V1 | Ongoing Burden | Recommendation |
|---|---:|---:|---|---|
| Shopify checkout / headless Shopify | 1-2 weeks | 3-5 weeks | Low/medium: Shopify owns payment, tax primitives, checkout security, refunds/admin basics, order emails, and much of commerce ops. | Best V1 choice. Build identity/artifact differentiation instead of commodity checkout. |
| Shopify checkout plus heavily custom checkout extensions | 2-4 weeks | 5-8 weeks | Medium: customization is limited by Shopify plan/features and checkout extension constraints. | Only if branded checkout gaps are genuinely painful. |
| Stripe Checkout / hosted payment page, not fully native | 2-4 weeks | 5-8 weeks | Medium/high: easier than native, but still need tax, emails, refunds, order admin, support tooling, and fulfillment reconciliation. | A reasonable fallback if Shopify metadata/handoff fails. |
| Fully native checkout with Stripe PaymentIntents, tax, refunds, admin, fraud/disputes, emails, support tooling | 6-10 weeks | 12-20+ weeks | High: Humanity owns checkout reliability, edge cases, tax/refund/dispute workflows, customer emails, support tooling, and more compliance surface. | Do not choose for V1 unless checkout itself becomes the product. |

Estimated delta for V1:

- Shopify/headless path saves roughly **8-15 weeks** versus a truly native production checkout.
- AI likely compresses Shopify implementation by **30-40%** because much of the work is glue code and tests.
- AI likely compresses native checkout by only **15-25%** because the slow parts are compliance, operational edge cases, provider testing, support workflows, and financial correctness.
- The biggest hidden native-checkout cost is not the payment form; it is refunds, tax, fraud/risk, failed payments, email receipts, admin tooling, disputes, customer support, and reconciliation.

Conclusion: Shopify is still the correct default. Native checkout should remain deferred unless Shopify cannot preserve artifact metadata or the brand/UX compromise is unacceptable after a real spike.

---

## Assumptions I Made That Could Lead Things Astray

- I assumed Shopify is better than native checkout for V1 because commerce operations are not the differentiator. If brand-continuity or metadata constraints are worse than expected, this could be wrong.
- I assumed Printify can act as pure fulfillment while Humanity owns QR/artifact semantics. If Printify's product/order model fights per-order custom proofs, this could create major friction.
- I assumed "portable human trust" is stronger than "public profile page." If early users mostly want expressive pages, the product may feel too austere.
- I assumed vouching is acceptable as an early verification basis. If the audience expects stronger proof, "verified human" should be renamed or gated.
- I assumed a physical product loop is worth the operational cost because it gives the system social visibility. If operations overwhelm the team, physical fulfillment should narrow to one product.
- I assumed revocation-by-resolution is socially understandable. Some users may expect physical recall or replacement; support copy must be explicit.
- I assumed events, cooperatives, and member organizations (including as second network operators) are better first markets than a generic consumer identity launch. If those communities do not feel urgency, the project needs a different wedge.
- I assumed viral growth can come from vouching, live control proof, physical artifacts, and anti-platform narrative. If users like the politics but do not invite others, the growth model is weak.

---

## Questions The Current Docs Still Force

| Question | Recommended Answer For V1 | Rationale |
|---|---|---|
| What exact product is first: sticker, flat card, or both? | Start with both one sticker and one flat card **if** Printify sample QA passes; otherwise launch only the strongest-scanning sticker. | Stickers prove real-world QR spread; flat cards prove the "membership/passport" metaphor. Do not start with apparel. |
| Who can create a card at launch, and who is allowed to vouch? | **Public launch:** anyone when Phase A is stable. Vouching per `V1_DECISION_LOCK` (3 vouch threshold, quotas, 90-day wait). Optional 10–25 early testers for ops/copy - not a protocol gate. | Federation strategy requires open create; abuse handled by rate limits, not permanent invite-only product. |
| What exact words can the product use without overclaiming "verified human"? | Use `Registered`, `Vouched Human`, `Steward`, `Revoked`, and `Suspended` in early UI. Reserve `Verified Human` for docs/protocol or after copy testing. | "Vouched Human" is more honest for an early social-trust system. |
| Who holds bootstrap governance keys before there is real governance? | Use 3-of-5 bootstrap signer keys held by named founder/operator/security roles, with public key fingerprints and a sunset rule after governance launch. | Suspension, badge issuance, and template approval need authority before formal governance exists. |
| What is the public revenue/margin policy for store purchases? | Publish a simple policy: price covers production, shipping/tax where applicable, platform/payment fees, support/reprint reserve, and a transparent Humanity Commons operating margin. | Trust product plus merch revenue needs plain-language transparency. |
| What support promise is made for failed, delayed, misprinted, or revoked QR artifacts? | Failed/delayed/misprinted orders are eligible for support/reprint/refund under a published policy. Revoked QR artifacts are **not** recalled or refunded solely because the owner revoked the card. | Separates fulfillment quality from identity lifecycle. |
| What happens if a printed sticker/card is stolen? | Owner revokes that printed item's QR credential. Other printed-item QR credentials remain active unless the owner revokes the card or source QR. | Makes physical artifacts usable without making one stolen sticker invalidate everything. |
| What happens if a customer checks out, pays, and then the artifact intent fails conversion? | Order enters `held_for_review`; no Printify order is submitted. User gets either regenerated proof approval, equivalent replacement, or refund. | Prevents bad automatic fulfillment and duplicate orders. |
| What happens if a card is suspended after payment but before Printify production approval? | Order enters `held_for_review`. Default: do not send Humanity-branded identity artifact to production while suspended; offer refund unless suspension is resolved quickly. | Avoids producing artifacts that undermine governance/safety rules. |
| What is the minimum launch experience that still feels like V1 rather than a dressed-up QR profile? | Signed card, public HTTPS QR, visible status/badge trail, vouch or founding trust state, revocation page, and one physical QR artifact via Shopify/Printify. | The physical artifact plus current-status network is what makes it more than a profile page. |
| What is the first beachhead market? | Start with founding events/meetups and adjacent cooperative/member organization pilots. | In-person scanning makes the trust loop easier to understand than a generic identity launch. |
| What makes this more than a nice idea? | 25 people create cards, 10 participate in vouching, 5 name real use cases, and at least one community/event/org wants a pilot. | Market proof matters more than technical completion. |
