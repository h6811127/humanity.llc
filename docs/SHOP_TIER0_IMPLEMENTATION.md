# Shop — Tier 0 curiosity drop (implementation)

**Status:** Pages story shop live · Shopify checkout not wired  
**Canonical strategy:** `docs/MERCH_LED_V1.md` Phase B, `docs/FOUNDING_DROP_BRIEF.md` Tier 0  
**Copy:** `docs/LAUNCH_LANGUAGE_KIT.md` § Tier 0

---

## Shipped (site)

| Piece | Path |
|-------|------|
| Story-row drop page | `site/shop/index.html` |
| Drop interest (device-local) | `site/js/shop-drop.mjs` → `localStorage` `hc_shop_drop_interest` |
| Hub shortcut | Landing **Shortcuts** → Founding sticker drop |
| Hero secondary CTA | Landing hero → `/shop/` |

The interest form records **optional email** on this browser only (no server upload). Operator exports from DevTools: `JSON.parse(localStorage.getItem('hc_shop_drop_interest'))`.

---

## Not shipped yet

| Piece | Owner / doc |
|-------|-------------|
| Shopify test store + cart/checkout URL | `docs/features/Storefront v1.0.md`, `V1_IMPLEMENTATION_BACKLOG.md` |
| `shopify.order_paid` → Printify middleware | Worker / fulfillment track |
| Batch QR artwork + Printify product ID | `FOUNDING_DROP_BRIEF.md` |
| Scan→create analytics (aggregate, no PII) | Product / ops |
| Resolver waitlist API (optional) | Only if moving interest off localStorage |

---

## Wire-up checklist (checkout)

1. Create Shopify product **Founding signal sticker** (Tier 0).
2. Add checkout URL or Storefront API token to site config (env or `site/data/shop-config.json` — TBD).
3. Replace **Notify when checkout opens** primary CTA with **Buy** when `checkout_url` is set.
4. Post-purchase email copy: `LAUNCH_LANGUAGE_KIT.md` Tier 0 email block.
5. Run `FOUNDING_DROP_BRIEF.md` pre-launch gates before taking live payments.

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
