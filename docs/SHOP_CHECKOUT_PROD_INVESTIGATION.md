# Shop Buy button — production investigation (2026-05-27)

**Question:** Why do all devices/browsers show “Notify when checkout opens” instead of Buy on https://humanity.llc/shop/?

**Short answer:** Production is serving **`checkout_open: false`** with an **empty `checkout_url`**. That is intentional interest-only mode. It is **not** a stale-cache or “old app version” problem across devices. The Shopify store setup on iPad does **not** connect to humanity.llc until you edit `shop-config.json` and **deploy Pages**.

---

## Evidence (checked 2026-05-27)

### Production config (source of truth for Buy vs interest)

```bash
curl -sS https://humanity.llc/data/shop-config.json
```

```json
{
  "version": 1,
  "tier0": {
    "product_title": "Founding signal sticker",
    "price_display": null,
    "checkout_url": "",
    "checkout_open": false
  },
  "thanks_path": "/shop/thanks/"
}
```

### Repo on disk (matches production)

`site/data/shop-config.json` is **identical** — checkout has never been enabled in git or on the deployed site.

### Production shop UI behavior

With the config above, `shop.mjs` correctly runs **interest-only** mode on every device:

| Element | What users see |
|---------|----------------|
| Hero primary | “Notify when checkout opens” (after JS runs) |
| Product price | “Checkout opening soon” |
| Buy buttons (`#shop-buy-btn`, footer) | `hidden` |
| Interest form | Visible |

`/shop/thanks/` loads on all devices because it is **static HTML** — it does not depend on `checkout_open`.

### Production code version (Pages is current)

| Signal | Value | Meaning |
|--------|-------|---------|
| `https://humanity.llc/js/build-meta.mjs` → `gitSha` | `c9b1083` | Last Pages deploy included recent site work |
| `builtAt` | `2026-05-27T18:40:10Z` | Deployed same day as investigation |
| `/shop/` → `shop.mjs?v=4` | Present | Shop JS with checkout-open/closed logic is live |
| `/shop/` → `styles.css?v=78` | Present | Shop layout polish (commit `4ea0e2d`) is included |

Cache headers on `/shop/` and `/data/shop-config.json`: `cache-control: public, max-age=0, must-revalidate` — browsers should revalidate; config fetch uses `cache: "no-store"` in JS.

### Worker (separate deploy; not required for Buy button)

```bash
curl -sS https://humanity.llc/.well-known/hc/v1/health | jq .build
```

Example: `gitSha: "4ea0e2d"` — Worker and Pages can differ slightly; **Buy button does not use the Worker**.

---

## How Buy is supposed to work

```
shop-config.json (deployed on Pages)
        │
        ▼
shop.mjs fetches /data/shop-config.json
        │
        ├── checkout_open === true  AND  checkout_url non-empty valid URL
        │         └── showCheckout() → Buy buttons visible → link to Shopify
        │
        └── otherwise
                  └── showInterestPending() → “Notify when checkout opens”
```

**Both** fields are required:

- `"checkout_open": true` (boolean, not string `"true"`)
- `"checkout_url": "https://humanity-llc.myshopify.com/products/…"` (or `/cart/VARIANT_ID:1`)

Setting only `checkout_open: true` leaves interest UI.

Shopify Admin on iPad **only** creates the product and URL. humanity.llc **never** reads Shopify automatically — you paste the URL into `shop-config.json` and deploy.

---

## Why it felt like “no device has the latest version”

| Assumption | Reality |
|------------|---------|
| Shopify product live ⇒ Buy on humanity.llc | False — config + Pages deploy required |
| Changed config locally ⇒ prod updates | False — must commit (optional) + `npm run pages:deploy` |
| Thanks page works ⇒ checkout enabled | False — thanks is always served |
| Backend / Printify needed for Buy | False — Buy is static config + Shopify handoff only |
| Different browsers show different modes | False — all hit same `shop-config.json` on prod |

---

## Fix checklist (enable Buy on production)

### 1. Shopify (done)

- Store: `humanity-llc.myshopify.com`
- Product: **Active**
- Product URL example: `https://humanity-llc.myshopify.com/products/<handle>`

### 2. Edit config (repo)

Update `site/data/shop-config.json`:

```json
{
  "version": 1,
  "tier0": {
    "product_title": "Founding signal sticker",
    "price_display": "$12 + shipping",
    "checkout_url": "https://humanity-llc.myshopify.com/products/YOUR-PRODUCT-HANDLE",
    "checkout_open": true
  },
  "thanks_path": "/shop/thanks/"
}
```

Replace `YOUR-PRODUCT-HANDLE` with the slug from the product page URL.

### 3. Deploy Pages (required)

From the repo on a machine with Wrangler auth:

```bash
npm run pages:deploy
```

This runs `site:build-meta` then uploads `site/` to Cloudflare Pages project `humanity-llc`.

### 4. Verify (any device)

```bash
curl -sS https://humanity.llc/data/shop-config.json
```

Must show `"checkout_open": true` and non-empty `checkout_url`.

Then open https://humanity.llc/shop/ (hard refresh). Expect:

- Hero: **“Buy the founding sticker”**
- Visible **Buy** button linking to Shopify

### 5. Optional — thank-you redirect

In Shopify Admin → **Settings** → **Checkout** → order status / post-purchase link →  
`https://humanity.llc/shop/thanks/`

---

## Verify “which build am I on?” (debugging future deploys)

| Layer | Command / action |
|-------|------------------|
| Site SHA | `curl -sS https://humanity.llc/js/build-meta.mjs` |
| Worker SHA | `curl -sS https://humanity.llc/.well-known/hc/v1/health \| jq .build` |
| Shop mode | `curl -sS https://humanity.llc/data/shop-config.json` |
| Browser | DevTools → Network → `shop-config.json` on `/shop/` reload |

See [`SITE_BUILD_VERSIONING.md`](SITE_BUILD_VERSIONING.md).

---

## Policy note (not a technical blocker)

Docs recommend running launch gates before `checkout_open: true` on production ([`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md), [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md)). For a **private test checkout** with Shopify test payments, config + deploy is still the only technical step for the Buy UI.

Fulfillment automation (Shopify webhook → Printify) is **after** payment and is **not** required to walk through checkout.

---

## Related

| Doc | Use |
|-----|-----|
| [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md) | Operator enable-checkout steps |
| [`site/data/shop-config.example.json`](../site/data/shop-config.example.json) | Template with both fields set |
| [`PRODUCTION_SAD_PATH_QA_2026-05-26.md`](PRODUCTION_SAD_PATH_QA_2026-05-26.md) | Prior shop messaging QA (interest mode) |
