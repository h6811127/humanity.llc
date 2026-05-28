# Tier 0 campaign QR runbook (batch sticker)

**Status:** Operator runbook (pre–first print run)  
**Policy:** [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) · Tier 0 batch  
**Audience:** Operator preparing founding sticker artwork and batch rotation drills

---

## What Tier 0 batch QR is

| Property | Value |
|----------|--------|
| **Scope** | `card` (one shared QR printed on many stickers) |
| **Profile** | Operator-owned **curiosity** card (e.g. `@founding_signal`) — not a buyer’s personal card |
| **Calendar expiry** | **`expires_at: null`** in signed credential (explicit JSON `null`) |
| **Buyer tie-in** | None — sticker is a **door** to create a card or visit `/shop/` |

Tier 1 personalized stickers use `POST …/print-artifact-qrs` per item instead.

---

## Before first print

1. Create or designate the **campaign profile** with owner keys stored offline (recovery recommended).
2. Sign the initial QR credential with **`expires_at: null`** and `scope: card`.
3. Register via `POST /.well-known/hc/v1/cards` (same as public create).
4. Confirm scan: no “Valid until …” in steward strip; limits explain bearer warning + merch ≠ vouched.
5. Physical scan QA on ≥3 phones ([`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md)).
6. Encode **`https://humanity.llc/c/{profile_id}?q={qr_id}`** in artwork only — no order IDs or emails in QR.

---

## Batch rotate drill (staging)

Run once before production print. Goal: old ink shows **replaced**, new batch QR is active.

### Prerequisites

- Campaign card **active** with owner signing keys in a secure session (or recovery key).
- Current active card-scoped `qr_id` noted as **Gen 1**.

### Steps

1. **Mint Gen 2 credential** — new `qr_id`, `epoch = previous + 1`, `scope: card`, **`expires_at: null`**, signed updated `card` document with `qr.active_qr_id` pointing at Gen 2.
2. **Rotate** — `POST /.well-known/hc/v1/cards/{profile_id}/qr` with `{ card, qr_credential }` (standard rotation API).
3. **Verify Gen 1** — scan old URL → `replaced` or inactive scan kind; copy includes curiosity CTA, not dead link.
4. **Verify Gen 2** — scan new URL → active; still no calendar expiry line.
5. **Revert drill only in staging** — do not rotate production batch without comms plan.

### Example (local dev)

```bash
# After owner signs rotation pair in browser or script:
curl -sS -X POST "http://127.0.0.1:8787/.well-known/hc/v1/cards/{PROFILE}/qr" \
  -H "Content-Type: application/json" \
  -d @rotation-payload.json | jq .
```

Checklist box: [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) launch gate “batch rotate drill”.

---

## When to rotate in production

| Trigger | Action |
|---------|--------|
| Campaign ended; Gen 2 sticker art ready | Rotate to Gen 2; Gen 1 → `replaced` |
| Misprint on **unshipped** art | Fix art before print; no resolver change |
| Misprint **after** ship | Refund/reprint macro ([`MERCH_SUPPORT_MACROS.md`](MERCH_SUPPORT_MACROS.md)); optional rotate if batch compromised |
| Security concern (leaked batch URL) | Rotate + optional public note on scan |

---

## Related

| Doc | Use |
|-----|-----|
| [`MERCH_SUPPORT_MACROS.md`](MERCH_SUPPORT_MACROS.md) | Support replies |
| [`LAUNCH_LANGUAGE_KIT.md`](LAUNCH_LANGUAGE_KIT.md) | § Sticker FAQ |
| [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md) | Interest-only shop until gates pass |
