# Ephemeral state on physical QR products

**Status:** Active — L0–L2 shipped; Tier 1 mint + owner update UX shipped (2026-05-28)  
**Parent:** [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) · [`AI_FEATURE_DEVELOPMENT.md`](AI_FEATURE_DEVELOPMENT.md) · [`MANIFESTO_STATUS_UPDATE.md`](MANIFESTO_STATUS_UPDATE.md)  
**Policy:** [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) · [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md)  
**Visual choreography:** [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) — Beat 5 (WEAR) closes the loop back to physical ink

---

## One-sentence claim

**Same ink, new meaning** — the QR on a hoodie or sticker is fixed; what strangers read at scan time is **signed resolver state** the owner can change from their phone without reprinting.

This is the product moat. It is **L0–L2 object intelligence**, not AI.

---

## Terminology (do not conflate)

| Term | Meaning |
|------|---------|
| **Product ephemeral state** | Mutable `manifesto_line` + optional `object_streams` behind a permanent print URL |
| **Printify ephemeral product** | Per-order temporary Printify SKU for custom artwork ([`printify-line-items.ts`](../worker/src/print/printify-line-items.ts)) — factory plumbing only |
| **L3 plain-language reader** | Optional stranger-facing summary of L2 snapshot — not signed truth ([`AI_L3_EXPLAIN_SNAPSHOT.md`](AI_L3_EXPLAIN_SNAPSHOT.md)) |
| **Live control (M7)** | Short-lived key proof at scan — possession, not copy editing |

---

## Funnel step 9 (WEAR)

From [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md):

```text
WEAR → Owner updates signed state from /created/ (or hub → Update status)
     → Strangers scan unchanged QR → resolver shows new manifesto / snapshot
     → Optional opt-in plain-language help for scanners (L3 P1)
```

| Actor | Surface | Role |
|-------|---------|------|
| **Owner** | `/created/#update-status` · hub **Update status** | Signs L0–L1 updates with root keys |
| **Stranger** | Scan page signed snapshot + optional **Plain language** button | Read-only; never writes state |
| **Customizer** | `/shop/customize/` | Deterministic QR preview — **no AI**; primary **belonging / imagination** surface ([`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) Beat 3) |

---

## Accessibility without AI

Enjoyment and usefulness for **all** stewards does not require LLMs:

1. **Structured fields** — status plate templates (`object` / `status` rows) and `object_streams` detail rows assemble deterministic L2 `public_snapshot`.
2. **Deterministic reader** — when Workers AI is absent, `deterministicExplainSnapshot()` still restates fields ([`ai-explain-core.ts`](../worker/src/resolver/ai-explain-core.ts)).
3. **Product decision (open)** — Priority 4 in merch stack: keep P1, **deterministic-only**, or remove scan reader ([`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) § Implementation priority stack).

Stewards **write and sign** copy themselves (L3 P2 ghostwriting UI retired 2026-05-27).

---

## Engineering: owning ephemeral state for Tier 1

### Shipped (before this doc)

- Resolver updates: `POST …/cards/{profile_id}/update` ([`MANIFESTO_STATUS_UPDATE.md`](MANIFESTO_STATUS_UPDATE.md))
- `print_artifact` QRs with no calendar expiry ([`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md))
- Per-item revoke; hub **Update status** deep link
- Phase A gate: **Update status** on `/created/` hidden for generic cards until first in-session revoke — pilots (`status_plate`, `lost_item_relay`) exempt

### Gap (Tier 1)

Tier 1 hoodie buyers typically use the **general** template. The revoke-first gate hid **What scanners see** / manifesto update until they revoked once — wrong for “change what my hoodie says” before or without revoke.

### Shipped fix (2026-05-28)

| Piece | Behavior |
|-------|----------|
| `markTier1EphemeralOwner(profileId)` | Set in `localStorage` when Tier 1 checkout handoff starts (`shop-customize.mjs`) |
| `isEphemeralStateUpdateUnlocked()` | Unlocks `/created/` update UI for Tier 1 merch refs + persisted flag |
| `/shop/thanks/` | Tier 0 vs Tier 1 copy from `hc_ref`; Tier 1 links to `/created/#update-status`; **Activate print QR** when mint still pending |
| Operator | Set Shopify post-purchase URL to `https://humanity.llc/shop/thanks/?hc_ref=customize_hoodie` (or `customize_shop`) |

Code: [`site/js/merch-funnel-core.mjs`](../site/js/merch-funnel-core.mjs) · [`site/js/created-first-revoke-gate.mjs`](../site/js/created-first-revoke-gate.mjs) · [`site/js/shop-thanks.mjs`](../site/js/shop-thanks.mjs) · [`site/js/shop-thanks-mint.mjs`](../site/js/shop-thanks-mint.mjs) · [`site/js/merch-backup-nudge.mjs`](../site/js/merch-backup-nudge.mjs) · [`worker/src/resolver/store-order-mint.ts`](../worker/src/resolver/store-order-mint.ts)

### Next (ordered)

| Step | Work | Type |
|------|------|------|
| 1 | Merch operator close-out — live payment, Printify submit, physical QA | Operator |
| 2 | Backup/recovery nudge before or after first Tier 1 checkout | Product + UI | **✅ Shipped** — `/shop/customize/` pre-checkout + `/shop/thanks/` post-checkout (`merch-backup-nudge-core.mjs`) |
| 3 | AI P1 decision — keep / deterministic-only / remove | Product |
| 4 | Guided live-object template at create (optional `object_streams` without AI) | Engineering |
| 5 | Gift mode · adopt batch QR · Commons Pass ephemeral scopes | Phase C / D |
| 6 | Owner-surface visual choreography (customize Settle, created live object card, publish pulse, thanks activation, stranger preview) | Product + design | **✅ V1–V4 shipped** — [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) |

---

## AI in this lane (brand-safe)

| Do | Don't |
|----|-------|
| Lead marketing with **live signed state on humans** | “AI profiles” or ghostwriting |
| Keep L3 P1 opt-in, visually separate from signed snapshot | Auto-run explain on scan |
| Expose `agent_context` for third-party integrators | Store model text in D1 |
| Use deterministic L2 for accessibility first | Present LLM output as resolver truth |

Hub: [`AI_FEATURE_DEVELOPMENT.md`](AI_FEATURE_DEVELOPMENT.md).

---

## Tests

```bash
npm run worker:test -- worker/tests/created-first-revoke-gate.test.ts worker/tests/merch-funnel-core.test.ts worker/tests/merch-backup-nudge-core.test.ts worker/tests/buyer-order-mint.test.ts worker/tests/store-order-mint.test.ts worker/tests/shop-thanks-mint-core.test.ts
npm run worker:test -- worker/tests/object-snapshot.test.ts worker/tests/update-card.test.ts
```

---

## Related

| Path | Role |
|------|------|
| [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) | Checkout → mint → Printify |
| [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) | Two registers, five beats, owner vs stranger motion |
| [`LAUNCH_LANGUAGE_KIT.md`](LAUNCH_LANGUAGE_KIT.md) | Tier 1 post-purchase copy |
| [`PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md`](PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md) | Research — city-scale ephemeral object state (not Phase A) |
