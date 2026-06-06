# Merch production integration checklist — Tier 1 Glitch hoodie

**Status:** Operator runbook for one paid production proof (2026-06-06)  
**Scope:** Software / commerce / fulfillment integration only — **not** physical QR scan QA, contrast, or garment manufacturing (sourcer scan reliability validated separately).  
**Launch SKU:** `glitch_hoodie_v1` only. Skip Royal Blue until Shopify variant IDs are filled. Ignore purse/sticker config gaps unless they block Glitch checkout.  
**Parent:** [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) · [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md)

---

## Definition of done

A real **production** order produces a **sourcer-ready QR artwork file** whose scan URL was **planned before checkout** and becomes **live after mint**. Proof is end-to-end system integration, not physical scan testing.

---

## Preconditions

| Check | How |
|-------|-----|
| Card + keys on device | `/create/` complete; recovery seatbelt acknowledged if prompted on customize |
| Glitch checkout open | `site/data/shop-config.json` → `glitch_hoodie_v1.personalize.checkout_open: true` |
| Shopify variant IDs | Use **Black** or **Navy** (or other filled colors) — **not Royal Blue** until IDs exist |
| Worker + Pages deployed | Production `humanity.llc` with latest print artifact + customize download wiring |
| Manual sourcer path (optional) | Skip Printify submit; use **Download print file** SVG for handoff |

---

## Operator steps (one paid test)

Record timestamps, order id, `artifact_intent_id`, `profile_id`, and planned `qr_id` on every step.

### 1. Create / customize

1. Open [`/shop/customize/?product=glitch_hoodie_v1`](https://humanity.llc/shop/customize/?product=glitch_hoodie_v1).
2. Complete card gate if shown (existing card session).
3. Select **filled** color/size (not Royal Blue).
4. Wait for **planned QR preview** under the mockup (Glitch hoodie block).
5. Confirm preview note: URL is planned, not live until after checkout.

### 2. Artifact intent + pre-mint

1. Click **Continue to checkout** (or equivalent checkout CTA).
2. Confirm artifact intent created — note `artifact_intent_id`, `planned_item_qr_ids[0]`, `planned_print_artifact_ids[0]` from network tab (`POST /v1/artifact/intents` or attach).
3. Confirm pre-mint succeeded before Shopify redirect (`POST /v1/cards/pre-mint` or funnel belt equivalent).
4. Planned scan URL shape: `https://humanity.llc/c/{profile_id}?q={planned_qr_id}`.

### 3. Shopify checkout

1. Complete payment on Shopify (production store).
2. Confirm cart line attributes include at minimum: `artifact_intent_id`, `profile_id`, `planned_item_qr_id` (or equivalent keys from intent handoff).

### 4. Thanks-page mint fallback (if needed)

1. Land on `/shop/thanks/` with order token / query params.
2. If webhook mint lagging, confirm thanks-page mint fallback runs and succeeds.
3. If mint already completed via webhook, thanks page should show confirmed state (no duplicate mint error).

### 5. Confirm minted QR

1. Operator lookup: order status UI, commerce order row, or `GET /v1/operator/...` tooling per [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md).
2. Verify item QR is **minted** and bound to the same `qr_id` planned at customize.
3. Stranger scan of planned URL should now resolve **live** card state (not “not yet active”).

### 6. Download / export print asset

**Path A — customize (before or after pay, preview must be ready):**

1. On `/shop/customize/` with Glitch planned QR visible, click **Download print file**.
2. File saves as `{profile_id}-{qr_id}.svg`.

**Path B — API (operator):**

```http
POST /v1/print/artifacts
Content-Type: application/json

{
  "profile_id": "<profile_id>",
  "qr_id": "<planned_qr_id>",
  "template_id": "hc-glitch-hoodie-v1",
  "print_artifact_id": "<planned_print_artifact_id>",
  "print_variant_id": "<print_variant_id>",
  "print_frame_background": "full"
}
```

Response must include `artwork_svg` and `scan_url`.

### 7. Verify encoded URL

1. Decode QR from SVG (operator tool or sourcer preflight).
2. Assert URL equals `/c/{profile_id}?q={planned_qr_id}` (same as step 2 planned URL).

### 8. Stranger scan (integration)

1. Open planned/minted scan URL in **private** session (not owner wallet).
2. Confirm stranger pass renders honest limits (card visible per policy; item QR context if applicable).

### 9. Update status

1. As owner, open `/created/#update-status` (or device shell update flow).
2. Change public status line; save.

### 10. Re-scan

1. Stranger scan again — status reflects update.

### 11. Revoke item QR

1. Owner revokes the **item** QR (not whole card) per merch lifecycle policy.
2. Confirm revoke persisted server-side.

### 12. Re-scan revoked state

1. Stranger scan same URL — shows **revoked** / inactive item QR state honestly.

---

## Failure triage (integration-only)

| Symptom | Likely layer | First check |
|---------|--------------|-------------|
| No planned QR preview | Customize / intent | Network errors on artifact intent; variant selection |
| Checkout blocked | Pre-mint / recovery gate | Recovery seatbelt, proof consent |
| Paid but not minted | Shopify webhook | Worker logs; thanks-page fallback |
| Download empty / error | Print API | `POST /v1/print/artifacts` → `artwork_svg` present |
| URL mismatch | Intent vs mint | Compare `planned_item_qr_ids[0]` to minted `qr_id` |
| Printify path unused | Expected for manual sourcer | SVG handoff only; no Printify order required for this proof |

---

## Regression commands (engineering)

```bash
npm run worker:test -- print-handlers shop-customize-print-download-core
npm run merch-funnel:verify-exit:fast
```

---

## Out of scope for this checklist

- Physical scan reliability on fabric (validated by sourcer)
- Royal Blue variants until Shopify IDs configured
- Founding purse / sticker SKUs
- Printify auto-submit (optional; manual sourcer path is sufficient for integration proof)
