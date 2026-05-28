# Shopify Tier 0 post-purchase setup (step 4)

**Status:** Operator runbook  
**Canonical:** [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md) § Enable checkout step 4  
**Thanks page:** [`site/shop/thanks/index.html`](../site/shop/thanks/index.html) · copy in [`LAUNCH_LANGUAGE_KIT.md`](LAUNCH_LANGUAGE_KIT.md) § Email — post-purchase (Tier 0)

---

## Goal

After a buyer pays on Shopify, send them to humanity.llc guidance — not a dead end on Shopify’s default order status alone.

**Target URL (production):**

```text
https://humanity.llc/shop/thanks/
```

This is derived in repo from `site/data/shop-config.json`:

- `site_origin`: `https://humanity.llc`
- `thanks_path`: `/shop/thanks/`

When checkout is open, `/shop/founding/` shows this URL in the **Checkout** section under “Post-purchase page” for copy-paste into Shopify Admin.

---

## Shopify Admin (iPad or Safari)

Shopify moves UI labels between versions. Use search in Admin if a menu name differs.

### Option A — Order status page link (recommended)

1. Open [admin.shopify.com](https://admin.shopify.com) → store **humanity-llc**.
2. **Settings** → **Checkout**.
3. Find **Order status page** (or **Additional scripts** / **Post-purchase** area depending on plan).
4. Set **Link** or **Additional content** so buyers can reach:
   `https://humanity.llc/shop/thanks/`
5. Save.

### Option B — Order confirmation email

1. **Settings** → **Notifications** → **Order confirmation**.
2. Add a line after payment (adapt from language kit):

   > When your sticker ships, read what to expect: https://humanity.llc/shop/thanks/

3. Save.

### Option C — Thank-you / checkout extensibility (if available on your plan)

Some stores expose a custom redirect after payment. If Shopify offers a **post-purchase URL** field, paste the same thanks URL.

---

## Verify

1. Place a **test order** (Shopify test mode or Bogus Gateway if enabled).
2. Complete checkout.
3. Confirm you can open **https://humanity.llc/shop/thanks/** and see post-purchase copy plus the **Track your order** form.
4. Optional: follow **Create a free card** — should carry `hc_ref=tier0_shop` when arriving from shop/thanks flow.

### Order status lookup

Buyers can track production on the thanks page:

- **Personalized orders:** paste `artifact_intent_id` from Shopify line item properties (also in confirmation email).
- **Any order:** paste Shopify order number.

API (same data): `GET /v1/store/orders/status?artifact_intent_id=ai_…` or `?shopify_order_id=…`

---

## Not in this step

| Piece | When |
|-------|------|
| Shopify **paid webhook** → Worker print queue | After first real order test; needs `SHOPIFY_WEBHOOK_SECRET` + `TIER0_*` on Worker |
| Printify submit | Operator API after webhook queues print order |
| Campaign batch QR on sticker | [`TIER0_CAMPAIGN_QR_RUNBOOK.md`](TIER0_CAMPAIGN_QR_RUNBOOK.md) before print run |

---

## Related

| Doc | Use |
|-----|-----|
| [`SHOP_CHECKOUT_PROD_INVESTIGATION.md`](SHOP_CHECKOUT_PROD_INVESTIGATION.md) | Buy button vs config debugging |
| [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) | Launch-day test order checklist |
