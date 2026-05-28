# Merch support macros

**Status:** Operator draft (pre-checkout)  
**Policy:** [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) § Revoke, reprint, and support  
**Audience:** Support / operator handling sticker orders and scan confusion

---

## Before you reply

- **Merch never grants vouch or verification.** Link [`LAUNCH_LANGUAGE_KIT.md`](LAUNCH_LANGUAGE_KIT.md) § Sticker FAQ when useful.
- **Revoke changes resolver status, not ink.** Old URLs still open an honest page.
- **Commerce PII lives in Shopify**, not the resolver — do not paste order emails into public scan copy.

---

## Misprint / unscannable QR

**Subject:** Reprint for your founding sticker

Thanks for reaching out. If the QR doesn’t scan on multiple phones in good light, we’ll **[reprint or refund]** per our policy (within 30 days of delivery).

Please reply with your order number and a photo of the sticker. We don’t need your signing keys.

---

## Owner revoked their sticker QR

**Subject:** Your sticker QR was revoked by the owner

If you bought a **personalized** sticker tied to someone’s card, only the **owner** can revoke that QR. We can’t “turn it back on” because the physical ink still contains the same URL.

If you need a new sticker for your own card, create a card at https://humanity.llc/create/ and order a new item when the drop allows.

---

## “Will my sticker stop working?”

**Subject:** Founding sticker — how long the QR works

Founding artifact QRs **don’t calendar-expire**. The link should always open a current status page. The owner (or operator, for batch campaign stickers) can **revoke or replace** a QR, which changes what scanners see but doesn’t erase the print.

See: https://humanity.llc/shop/ and the Sticker FAQ in our launch copy.

---

## Wrong QR on shipped order (fulfillment error)

**Subject:** We’re fixing your order QR

We confirmed the wrong QR was linked to your order. We’ve **[revoked the misprinted credential / issued a replacement]** and will ship a corrected sticker **[or refund]** — reply with order number if you haven’t heard from us in 48 hours.

Internal: link Shopify order ↔ `artifact_intent_id` ↔ `qr_id` before sending.

---

## Batch campaign ended (Tier 0 Gen 1)

**Subject:** Your founding sticker still scans

We released a new sticker design (Gen 2). Your original sticker **still opens a page** — it may show that the campaign QR was **replaced**. That’s normal; it isn’t broken. Create your own free card anytime at https://humanity.llc/create/.

---

## Buyer thought purchase = verified

**Subject:** Buying a sticker doesn’t verify you

Buying Humanity merch is a **curiosity object**, not verification. **Vouched Human** status comes from peer vouches under public rules, not checkout.

Happy to point you to create a free card: https://humanity.llc/create/

---

## Related

| Doc | Use |
|-----|-----|
| [`TIER0_CAMPAIGN_QR_RUNBOOK.md`](TIER0_CAMPAIGN_QR_RUNBOOK.md) | Batch rotate |
| [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) | Launch gates |
