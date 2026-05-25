# Shop — Tier 0 curiosity drop (implementation)

**Status:** Checkout handoff wired (config-driven) · set `shop-config.json` when Shopify product exists  
**Canonical strategy:** `docs/MERCH_LED_V1.md` Phase B, `docs/FOUNDING_DROP_BRIEF.md` Tier 0  
**Copy:** `docs/LAUNCH_LANGUAGE_KIT.md` § Tier 0

---

## Shipped (site)

| Piece | Path |
|-------|------|
| Story-row drop page | `site/shop/index.html` |
| Checkout config | `site/data/shop-config.json` (see `shop-config.example.json`) |
| Shop UI | `site/js/shop.mjs` + `site/js/shop-config.mjs` — Buy vs interest by `checkout_open` |
| Drop interest (device-local) | `localStorage` `hc_shop_drop_interest` when checkout closed |
| Post-checkout page | `site/shop/thanks/index.html` — link from Shopify thank-you / order status URL |
| Hub shortcut | Landing **Shortcuts** → Founding sticker drop |
| Hero secondary CTA | Landing hero → `/shop/` |

The interest form records **optional email** on this browser only (no server upload). Operator exports from DevTools: `JSON.parse(localStorage.getItem('hc_shop_drop_interest'))`.

---

## Enable checkout (operator)

1. Create **Founding signal sticker** in Shopify (test or live store).
2. Copy a checkout URL — product page, cart permalink (`/cart/VARIANT_ID:1`), or Buy Button link.
3. Edit `site/data/shop-config.json`:

```json
{
  "tier0": {
    "price_display": "$12 + shipping",
    "checkout_url": "https://your-store.myshopify.com/cart/12345678:1",
    "checkout_open": true
  }
}
```

4. In Shopify checkout settings, set **Order status page** or post-purchase link to `https://humanity.llc/shop/thanks/` (optional).
5. Deploy Pages. `/shop/` shows **Buy** and hides the interest form.
6. Run `FOUNDING_DROP_BRIEF.md` gates before `checkout_open: true` on production.

---

## Not shipped yet

| Piece | Owner / doc |
|-------|-------------|
| Shopify store + live product URL in config | Operator — paste into `shop-config.json` |
| `shopify.order_paid` → Printify middleware | Worker / fulfillment track |
| Batch QR artwork + Printify product ID | `FOUNDING_DROP_BRIEF.md` |
| Scan→create analytics (aggregate, no PII) | Product / ops |
| Resolver waitlist API (optional) | Only if moving interest off localStorage |

---

## Wire-up checklist (checkout)

| Step | Status |
|------|--------|
| 1. Create Shopify product **Founding signal sticker** | Operator |
| 2. `site/data/shop-config.json` + example file | ✅ |
| 3. Buy CTA when `checkout_open` + valid `checkout_url` | ✅ (`shop.mjs`) |
| 4. Post-purchase page + Shopify email copy | ✅ thanks page · email in `LAUNCH_LANGUAGE_KIT.md` |
| 5. Pre-launch gates before live payments | Operator (`FOUNDING_DROP_BRIEF.md`) |

---

## Copy rules (always on page)

- **Buying this sticker does not verify you.**
- Bearer warning: QR does not prove the holder owns the card.
- Secondary CTA: **Create a free card** → `/create/`.

---

## Related

| Topic | Doc |
|-------|-----|
| Owner revoke from second device | `docs/M5_5_OWNER_KEY_PORTABILITY.md` (shipped in repo) |
| Device hub (save keys, inbox) | `docs/DEVICE_OS.md` |
| Drop ops checklist | `docs/FOUNDING_DROP_BRIEF.md` |
