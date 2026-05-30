# Merch product copy — Glitch vs personalize

**Status:** Canonical (2026-05-29) — **wired** on Glitch/Live Object PDPs and `/shop/customize/`  
**Audience:** Product, shop PDP, customizer, launch kit  
**Policy:** [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) · [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) · [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md)  
**Visual choreography:** [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) — Beat 3 customizer copy; Beat 4–5 created / publish

---

## One-line split

| Lane | Buyer gets | Price signal (config) |
|------|------------|------------------------|
| **Glitch hoodie** (Tier 0) | Fixed art · **shared** live scan destination | $88 + shipping — art object + movement billboard |
| **Live Object hoodie** (Tier 1) | **Your** unique QR · **your** card · you hold the pen | $48 + shipping — belonging wear |

---

## Three ideas (use on PDP / customizer)

| Idea | Plain language | Glitch | Personalize |
|------|----------------|--------|-------------|
| **Live** | Strangers scan ink; the network shows **current signed state** (until you change it). | Campaign stewards update what the shared QR shows. | You update your line from your phone — same QR on the shirt, new meaning. |
| **Fossil** | Lose signing access without recovery → you **cannot edit**; scan may still show the **last published** state (honest tombstone if you revoke). | Usually N/A for buyers (you do not control the campaign card). | Optional framing: “record on fabric” — not a subscription hoodie. |
| **Keys** | Commerce ≠ vouch. **Control** = browser keys + backup, not humanity.llc custody. | Buying does not grant control of the live destination. | Your card, your QR, your responsibility to protect access. |

---

## Glitch LIVE QR hoodie (`tier0_glitch_hoodie_v1`)

### Hero (PDP)

- **Eyebrow:** Company drop · Tier 0  
- **Title:** Glitch LIVE QR hoodie  
- **Meaning line:** A live network on your chest — same scan for every unit, not your personal card.  
- **Story (body):** Fixed founding garment with a shared campaign QR. Every hoodie points at one live Humanity destination that stewards can update; strangers see honest limits when they scan. You are buying **witness and wear**, not control of the feed and not a vouch.

### “How the scan behaves” (three bullets)

1. **Live:** The QR always opens humanity.llc; campaign stewards can change what strangers read without reprinting the batch.  
2. **Not yours:** Purchase does not give you signing keys or a verified-human label — holding the hoodie does not prove you own the card behind the scan.  
3. **Object, not app:** This is curiosity merch for the commons; personalize your own QR on the [Live Object hoodie](/shop/products/hoodie_live_object_v1/).

### Why $88 (internal / optional PDP line)

Luxury drop positioning — art + myth + limited founding run, not “hoodie with account login.” Cold traffic converts on **desire**, not utility.

---

## Customize + Live Object hoodie (`hoodie_live_object_v1`, `/shop/customize/`)

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

## Shared (both surfaces)

- **Commerce ≠ verification:** Buying merch does not verify you or grant a vouch.  
- **Bearer:** Printed QR is a pointer — holding the object does not prove you own the Humanity Card.

---

## Code map

| Surface | Module / file |
|---------|----------------|
| API `meaning_line` / `story` | `worker/src/store/store-catalog.ts` |
| PDP honesty bullets | `site/js/shop-merch-copy-core.mjs` · `#product-honesty` in `site/shop/product-detail/index.html` |
| Customizer hero + bullets | `site/shop/customize/index.html` |
| Tests | `worker/tests/shop-merch-copy-core.test.ts` · update e2e stubs if meaning_line changes |
