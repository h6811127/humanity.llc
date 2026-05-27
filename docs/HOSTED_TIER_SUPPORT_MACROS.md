# Hosted steward support macros

**Status:** E6 support draft (staging)  
**Policy:** [`HOSTED_TIER_PRICING_AND_SLA.md`](HOSTED_TIER_PRICING_AND_SLA.md) · [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md)  
**Audience:** Support / operators replying to hosted steward questions

---

## Before you reply

- Hosted steward sells resolver capacity and steward-side notifications. It does **not** sell verification.
- Never ask for private keys, seed phrases, or a browser export file.
- Billing details stay in the payment provider. Do not paste payment metadata into resolver notes or public scan copy.
- Free cards, public scans, vouches, and revocation remain available without hosted steward.

---

## "Does hosted steward make me verified?"

**Subject:** Hosted steward and verification

No. Hosted steward does not change your Humanity Card trust label.

Hosted steward only gives your device higher automatic check limits and optional faster steward notifications. **Vouched Human** status still comes from peer vouches under the public rules shown on scan pages.

---

## "My hosted checks paused"

**Subject:** Automatic checks paused for today

Your card still works. Automatic hosted checks can pause when a device or account reaches the fair-use limit for the day.

You can still open your hub and use **Check for live proof** manually. Automatic checks resume after the UTC-day budget resets, unless your account is suspended for abuse.

Internal: check `steward_usage_counters` before promising a reset.

---

## "I canceled, why do I still see hosted status?"

**Subject:** Hosted steward after cancellation

If you canceled before the paid period ended, hosted capacity may continue until the current period expires. After that, your device returns to the free reference limits.

Your cards, saved wallet, public scan pages, and vouches are not deleted by cancellation.

---

## "Payment failed"

**Subject:** Hosted steward payment status

Your account may stay on hosted limits during the short grace period while payment is retried. If payment is not restored before the grace period ends, hosted limits and push notifications turn off automatically.

Your card still scans. Manual live-proof checks remain available on the free reference tier.

Internal: verify Stripe status, D1 `status`, and `effective_until` before replying.

---

## "Push notifications stopped"

**Subject:** Hosted steward notifications

Hosted push only works when **Watch for live proof** and browser alerts are enabled on a device with steward keys/session access.

If push is temporarily unavailable, the app falls back to scoped checks when the hub or inbox is active. You do not need to create a new card.

Try: open your hub, confirm **Watch for live proof** is on, and re-enable browser alerts if prompted.

---

## "Can my merch order activate hosted steward?"

**Subject:** Merch and hosted steward

No. Merch, founding stickers, donations, Shopify orders, and Printify fulfillment do not grant hosted steward.

Merch is a physical QR object. Hosted steward is optional infrastructure for stewards who want higher check limits or push notifications.

---

## "I want a refund"

**Subject:** Hosted steward refund request

We can review refunds under the hosted steward policy. Please send the account email or payment-provider receipt id. Do **not** send private keys or card export files.

If hosted capacity has been used heavily during the refund window, the refund may be prorated under the fair-use policy.

Internal: use payment-provider records for refund decisions; resolver logs are only infrastructure usage evidence.

---

## Related

| Doc | Use |
|-----|-----|
| [`HOSTED_TIER_OPS_RUNBOOK.md`](HOSTED_TIER_OPS_RUNBOOK.md) | Operator triage |
| [`HOSTED_TIER_PRICING_AND_SLA.md`](HOSTED_TIER_PRICING_AND_SLA.md) | Refund/grace/fair-use policy |
| [`SKEPTIC_FAQ.md`](SKEPTIC_FAQ.md) | Public paid-tier framing |
| [`MERCH_SUPPORT_MACROS.md`](MERCH_SUPPORT_MACROS.md) | Merch-specific support |
