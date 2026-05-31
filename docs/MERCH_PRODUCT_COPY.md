# Merch product copy — Glitch vs personalize

**Status:** Canonical (2026-05-30) — **launch direction locked** · copy wired on PDP/customizer pending Glitch Tier 1 rewire  
**Audience:** Product, shop PDP, customizer, launch kit  
**Policy:** [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) · [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) · [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md)  
**Visual choreography:** [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) — Beat 3 customizer copy; Beat 4–5 created / publish  
**Parent:** [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) · [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md)

---

## Launch decision (2026-05-30)

**Glitch LIVE QR hoodie launches as Tier 1 personalized wear** — fixed Glitch **artwork**, **unique QR per buyer** via `/shop/customize/`, buyer holds keys and updates what strangers read.

| | **Glitch hoodie (launch)** | **Founding sticker (Tier 0)** | **Live Object hoodie (generic Tier 1)** |
|--|---------------------------|-------------------------------|----------------------------------------|
| **Store id (target)** | `glitch_hoodie_v1` in `personalize.products` | `tier0_founding_sticker_v1` | `hoodie_live_object_v1` |
| **QR on ink** | **Unique** `print_artifact` per order | **Shared** campaign batch QR | **Unique** per order |
| **Customizer** | **Yes** — Glitch mock + branded QR preview | No | Yes — generic mock |
| **Who controls scan** | **Buyer** (their card, their keys) | Campaign stewards | Buyer |
| **Price signal (config)** | $88 + shipping | TBD / sticker tier | $48 + shipping |
| **Fulfillment** | Printify per order (artifact intent) | Batch or inventory | Printify per order |

**Superseded for launch:** `tier0_glitch_hoodie_v1` as a **shared-batch** Tier 0 PDP (`limited_drop`, `tier0_inventory`). That catalog entry may remain for smoke tests until engineering redirects the shop hub and rewrites store catalog — **do not** treat it as the launch checkout path.

**Origin alignment:** The founding Glitch prototype was a **personal card QR on fabric** ([`COMPANY_MERCH_AND_COMMUNITY_CAMPAIGN.md`](COMPANY_MERCH_AND_COMMUNITY_CAMPAIGN.md) § Key custody model A). Launch product matches that physics: fixed visual design, **your** live destination.

**Privacy alignment:** Do **not** sell the hoodie as scan analytics. Default experience: no scan notifications, no timestamps, no locations, no "37 scans." Optional future awareness must be coarse interaction state only. The cooler promise is a programmable object: same garment, changing resolver truth.

---

## One-line split (customer-facing)

| Lane | Buyer gets | Job |
|------|------------|-----|
| **Glitch hoodie** | Fixed founding art · **your** unique QR · **your** card | Belonging wear + movement aesthetic — you hold the pen |
| **Live Object hoodie** | Generic mock · your unique QR · your card | Lower-friction belonging wear (optional second SKU) |
| **Founding sticker** | Shared campaign QR · curiosity pointer | Top-of-funnel billboard — not your personal card |

---

## Three ideas (use on PDP / customizer)

| Idea | Plain language | Glitch hoodie | Live Object / sticker |
|------|----------------|---------------|------------------------|
| **Live** | Strangers scan ink; the network shows **current signed state** (until you change it). | **You** update your line from your phone — same Glitch ink, new meaning. | Same (Tier 1) · sticker = stewards update campaign card (Tier 0) |
| **Fossil** | Lose signing access without recovery → you **cannot edit**; scan may still show the **last published** state (honest tombstone if you revoke). | Optional framing: “record on fabric” — not a subscription hoodie. | Same |
| **Keys** | Commerce ≠ vouch. **Control** = browser keys + backup, not humanity.llc custody. | Your card, your QR, your responsibility before you wear it in public. | Sticker buyers do not control campaign card |

---

## Glitch LIVE QR hoodie (`glitch_hoodie_v1` — launch target)

**Surface:** `/shop/customize/` with Glitch product selected · story PDP TBD (shop hub or `/shop/products/glitch_hoodie_v1/` once catalog rewired)

### Hero (customizer + PDP)

- **Eyebrow:** Founding drop · personalized  
- **Title:** Glitch LIVE QR hoodie  
- **Meaning line:** Founding Glitch art on your chest — **your** unique QR, **your** live line.  
- **Story (body):** Fixed Glitch garment design with a **unique** revocable QR tied to **your** Humanity Card. Change what strangers read from your phone without reprinting. Commerce does not verify you or grant a vouch.

### “Your pen, not the page” (three bullets — same register as Tier 1)

1. **Live:** After fulfillment, your unit’s QR resolves to **your** card. Update status from `/created/` (or hub → Update status) — same ink, new meaning.  
2. **Fossil:** If you lose signing access without recovery or backup, you may not be able to edit again; scans can still show the **last thing you published** until you revoke the item.  
3. **Keys:** Keys stay in your browser; save ownership on this device and set recovery before you rely on the shirt in public.

### Why $88 (internal / optional PDP line)

Luxury drop positioning — art + myth + limited founding run. Converts on **desire** and **agency** (live object on your body), not on shared campaign witness.

### What changes over time (preferred feature frame)

- New artwork or messages unlock on the resolver.
- Pseudonyms, status lines, event access, and seasonal copy can rotate without reprinting.
- Authenticity, revoke, replace, and limited-time status remain inspectable at scan.
- Interaction awareness, if introduced, stays log-free: **active recently**, not **who scanned at 2:14 PM**.

### What this is not

- Not a scan dashboard.
- Not hoodie engagement metrics.
- Not alerts whenever someone scans.
- Not a social-media analytics product on fabric.

### Post-purchase

- **Thanks URL (target):** `https://humanity.llc/shop/thanks/?hc_ref=customize_glitch`  
- **Merch ref:** `customize_glitch` when Glitch hoodie selected in customizer  
- Tier 1 thanks flow → `/created/#update-status` · **Activate print QR** when mint pending

---

## Customize + Live Object hoodie (`hoodie_live_object_v1`, `/shop/customize/`)

Generic Tier 1 belonging wear — same honesty register as Glitch, without founding art positioning.

### Hero (customizer)

- **Title:** Customize your live object  
- **Lead:** Your unique QR on the garment. Change what strangers read from your phone; the ink stays the same.

### “Your pen, not the page” (three bullets)

1. **Live:** After fulfillment, each unit’s QR resolves to **your** card. Update status from `/created/` (or hub → Update status) — same ink, new meaning.  
2. **Fossil:** If you lose signing access without recovery or backup, you may not be able to edit again; scans can still show the **last thing you published** until you revoke the item or disable the card with keys.  
3. **Keys:** Keys stay in your browser; save ownership on this device and set recovery before you rely on the shirt in public.

### Consent (checkout checkbox — persistence)

> Printed ink persists. I can revoke this item’s QR while I have signing access; if I lose keys without recovery, strangers may still read the last published scan until I revoke.

---

## Shared (all surfaces)

- **Commerce ≠ verification:** Buying merch does not verify you or grant a vouch.  
- **Bearer:** Printed QR is a pointer — holding the object does not prove you own the Humanity Card.
- **No scan analytics:** Merch copy must emphasize programmable resolver state, not scan notifications, scan counts, scanner identity, or scan history.

---

## Engineering rewire checklist (docs-only gate)

Before `personalize.checkout_open: true` for Glitch:

| Step | Work |
|------|------|
| 1 | Add `glitch_hoodie_v1` to `personalize.products[]` in `shop-config.json` with Glitch `print_template_id` + Shopify variant |
| 2 | Glitch mock silhouette in `/shop/customize/` (distinct from generic hoodie preview) |
| 3 | Store catalog: Glitch as `product_class: personalized` · remove or redirect `tier0_glitch_hoodie_v1` shared-batch story |
| 4 | Merch ref `customize_glitch` in `merch-funnel-core` + thanks copy (`shop-thanks.mjs`) |
| 5 | Update `shop-merch-copy-core.mjs` honesty blocks for new product id |
| 6 | Physical QA on printed Glitch + unique QR — [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md) |
| 7 | `npm run merch-funnel:verify-config -- --require-checkout` (Tier 1 block, not `--require-tier0`) |

---

## Code map

| Surface | Module / file |
|---------|----------------|
| API `meaning_line` / `story` | `worker/src/store/store-catalog.ts` (**pending** Glitch Tier 1 row) |
| PDP honesty bullets | `site/js/shop-merch-copy-core.mjs` · `#product-honesty` in `site/shop/product-detail/index.html` |
| Customizer hero + bullets | `site/shop/customize/index.html` · `site/js/shop-customize.mjs` |
| Legacy shared-batch PDP | `tier0_glitch_hoodie_v1` — **do not use for launch** |
| Tests | `worker/tests/shop-merch-copy-core.test.ts` · E2E customize + checkout handoff |

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-29 | Initial Glitch vs personalize split (shared-batch Glitch — **superseded**) |
| 2026-05-30 | **Launch lock:** Glitch hoodie = Tier 1 customizable (`glitch_hoodie_v1`); shared `tier0_glitch_hoodie_v1` deprecated for launch |
