# Company merch & community campaign QR

**Status:** Canonical product spec (2026-05-28) — **Tier 0 batch primitive** · Glitch **launch** moved to Tier 1 (2026-05-30)  
**Audience:** Founder, ops, engineering, future governance  
**Glitch launch copy:** [`MERCH_PRODUCT_COPY.md`](MERCH_PRODUCT_COPY.md) · [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md)  
**Not the same as:** Tier 1 personalized wear — except **Glitch founding hoodie**, which **is** Tier 1 personalized wear at launch

---

## One-sentence product (Tier 0 batch lane)

**Company / community batch merch** is physical ink with a **shared HTTPS QR** that resolves to a **single live Humanity Card** (campaign profile). Strangers see **current signed state**; buyers do **not** get control of that card. The **community** influences what the scan shows only through an explicit **governance + key-custody** process—not by purchasing the garment.

**Examples today:** founding signal sticker (`tier0_founding_sticker_v1`). **Not** the Glitch hoodie at launch — see § Glitch launch decision.

---

## Glitch launch decision (2026-05-30)

The **Glitch LIVE QR hoodie** is the **founding garment drop** but launches on the **Tier 1 personalize path**, not Tier 0 shared batch:

| Property | Glitch at launch |
|----------|------------------|
| Visual | Fixed Glitch artwork (same design language on every unit) |
| QR | **Unique** `print_artifact` per buyer — minted after paid order |
| Checkout | `/shop/customize/` → artifact intent → Shopify → Printify |
| Control | **Buyer** updates scan content from their card (keys + backup) |
| Target store id | `glitch_hoodie_v1` in `personalize.products` (engineering pending) |
| Price signal | $88 + shipping (config) |

**Why:** Founding prototype was personal card QR on fabric; launch wedge is **same ink, new meaning** on **your** object ([`EPHEMERAL_STATE_AND_MERCH.md`](EPHEMERAL_STATE_AND_MERCH.md)), not witness-only shared campaign ink.

**Superseded:** `tier0_glitch_hoodie_v1` as shared-batch `limited_drop` / `tier0_inventory` — retained in repo temporarily for catalog smoke; **not** launch checkout. Do not paste `TIER0_SHOPIFY_INVENTORY_VARIANT_IDS` for Glitch launch.

---

## Why this doc exists

Founding conversations (including outside Cursor) described:

- A **fixed-design** sweatshirt (e.g. “Glitch” aesthetic from a one-off QR render).
- Early notes also described a **generalized QR** on every unit pointing at one live destination (Tier 0 batch) — **that model applies to stickers and future campaign series**, not Glitch hoodie launch.
- A hope that **what a campaign destination says** could eventually be something “we democratically decide.”

This file owns the **Tier 0 batch / community campaign** lane. Glitch hoodie launch is documented in [`MERCH_PRODUCT_COPY.md`](MERCH_PRODUCT_COPY.md).

---

## How we “own it” (product ownership)

| Layer | Owner | What “own” means |
|-------|--------|------------------|
| **Tier 0 batch definition** | This doc + [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) | Shared QR rules, no calendar expiry, commerce firewall |
| **Glitch hoodie launch** | [`MERCH_PRODUCT_COPY.md`](MERCH_PRODUCT_COPY.md) + [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) | Tier 1 customizer, unique QR, owner keys |
| **Merch GTM** | [`MERCH_LED_V1.md`](MERCH_LED_V1.md) Phase B | Curiosity (sticker / scan) + belonging (personalized wear incl. Glitch) |
| **Shop UX — Tier 0** | [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md) | Founding sticker · no customizer |
| **Shop UX — Tier 1** | [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) | `/shop/customize/` · Glitch + Live Object hoodies |
| **Campaign QR ops (batch only)** | [`TIER0_CAMPAIGN_QR_RUNBOOK.md`](TIER0_CAMPAIGN_QR_RUNBOOK.md) | Mint, rotate, physical QA for **shared** batch QRs |
| **Launch checklist** | [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) | Tier 0 sticker + Tier 1 Glitch gates |
| **Democratic *process*** (future) | [`DEMOCRATIC_INFRASTRUCTURE.md`](DEMOCRATIC_INFRASTRUCTURE.md) | Not merch MVP |

**Rule:** New **shared-batch** SKUs (Series B sticker, etc.) are instances of § Tier 0 batch below. **Glitch hoodie** is **not** a Tier 0 batch instance at launch.

---

## Tier 0 batch (canonical architecture)

Community merch **primitive** for shared campaign ink:

| Property | Value |
|----------|--------|
| QR model | One (or few) **`qr_id`s** printed on many units |
| Credential scope | Usually `card` on a **campaign profile** (see § Key custody) |
| `expires_at` | **`null`** — ink does not calendar-expire ([`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md)) |
| Buyer | Does **not** own signing keys; does **not** get vouch |
| Scan copy | Bearer warning · merch ≠ verified · curiosity CTAs |
| Commerce | Shopify checkout; optional Printify batch or **pre-printed stock** (operator choice) |
| Rotation | Operator (or future governance) may **`replaced`** batch QR; old ink still resolves honestly |

```text
Many stickers / garments (batch lane only)
    → same printed URL (?q=qr_campaign_…)
    → one profile_id (campaign card)
    → manifesto / status / limits updated by whoever holds signing keys
```

---

## Glitch aesthetic (visual brand — not a protocol type)

**Glitch** is a **marketing name** for founding garment art, not a separate protocol type.

| Field | Guidance |
|-------|----------|
| **Visual** | QR artwork may look “glitched”; trust is still **HTTPS + signed resolver state**, not the bitmap aesthetic |
| **Origin story** | Started as a **personal card** QR on a sweatshirt — aligns with Tier 1 launch |
| **Launch checkout** | `/shop/customize/` with `glitch_hoodie_v1` (target) — **not** pre-printed shared batch |
| **Scan destination (launch)** | Each buyer’s **`print_artifact`** on **their** `profile_id` |

---

## Key custody — who controls what scanners see

### Tier 0 batch (sticker, future series)

**“Community controls the sticker”** means governance of **campaign card** key holders — not buyer editing.

| Model | Custody | Use |
|-------|---------|-----|
| **B. Dedicated campaign card** (recommended) | New `profile_id` for the batch | Founding sticker production |
| **C. Multi-steward / governance** (future) | 2-of-3 or elected stewards | Commons Pass era |

See [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) D-M2.

### Tier 1 Glitch hoodie (launch)

**Buyer controls what strangers read** on **their** printed QR while they hold signing keys (+ recovery). Same custody model as any `print_artifact` — [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md).

---

## “Democratically decide” — v1 vs later

| Phase | What strangers get | How “we” decide content |
|-------|-------------------|-------------------------|
| **v1 batch (sticker)** | Live scan of **one campaign card** | Steward signs agreed campaign copy |
| **v1 Glitch hoodie** | Live scan of **buyer’s card** | **Buyer** signs their manifesto/status |
| **v2 (product)** | Same ink | Multi-steward or org-issued updates ([`commons/COMMONS_ROADMAP.md`](commons/COMMONS_ROADMAP.md)) |

**Anti-pattern:** Implying purchase of a **personalized** Glitch hoodie grants membership in **campaign** governance.

---

## Company merch line (how multiple drops fit)

| Drop | Tier | Customizer | Store id |
|------|------|------------|----------|
| Founding signal sticker | Tier 0 batch | No | `tier0_founding_sticker_v1` |
| **Glitch LIVE QR hoodie (launch)** | **Tier 1** | **Yes** | **`glitch_hoodie_v1`** (target) |
| Live Object hoodie (generic) | Tier 1 | Yes | `hoodie_live_object_v1` |
| ~~Glitch shared-batch PDP~~ | ~~Tier 0~~ | ~~No~~ | ~~`tier0_glitch_hoodie_v1`~~ — **deprecated for launch** |

---

## Implementation map (repo today)

| Capability | Status | Notes |
|------------|--------|-------|
| Tier 0 policy + runbook | Shipped (docs) | Sticker batch |
| `/shop/customize/` + artifact intent | Shipped | **Launch path for Glitch** |
| `tier0_glitch_hoodie_v1` shared-batch PDP | Shipped (legacy) | **Superseded** — rewire catalog + shop hub |
| `glitch_hoodie_v1` in `personalize.products` | **Pending** | See [`MERCH_PRODUCT_COPY.md`](MERCH_PRODUCT_COPY.md) § Engineering rewire |
| `TIER0_SHOPIFY_INVENTORY_VARIANT_IDS` for Glitch | **Do not use** | Was shared-batch experiment |
| Paid webhook Tier 1 mint + Printify | Shipped | Use for Glitch launch |
| Paid webhook `tier0_batch` | Shipped | Founding sticker only |

**Shop honesty copy:** [`MERCH_PRODUCT_COPY.md`](MERCH_PRODUCT_COPY.md) · `site/js/shop-merch-copy-core.mjs`

**Operator sequence (Glitch launch):** [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) § Operator close-out — paste **`personalize.products`** Shopify variants · `merch-funnel:verify-config -- --require-checkout` · physical QA · `personalize.checkout_open: true` · post-purchase `hc_ref=customize_glitch`.

---

## Operator checklist (Tier 0 batch — sticker only)

- [ ] Record printed `profile_id`, `qr_id`, and HTTPS URL on ink.
- [ ] Confirm signing key access for **campaign card** — [`M5_5_OWNER_KEY_PORTABILITY.md`](M5_5_OWNER_KEY_PORTABILITY.md).
- [ ] Scan copy: bearer limits · buying ≠ vouch · batch pointer (not buyer’s card).
- [ ] Shopify variant + `shop-config` tier0 founding sticker + optional `TIER0_SHOPIFY_VARIANT_IDS`.
- [ ] Physical QA — [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md).

**Glitch hoodie launch checklist:** [`MERCH_PRODUCT_COPY.md`](MERCH_PRODUCT_COPY.md) § Engineering rewire + [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) operator close-out.

---

## Related

| Doc | Use |
|-----|-----|
| [`MERCH_PRODUCT_COPY.md`](MERCH_PRODUCT_COPY.md) | Glitch launch copy + rewire checklist |
| [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) | Tier 0 / Tier 1 rules |
| [`TIER0_CAMPAIGN_QR_RUNBOOK.md`](TIER0_CAMPAIGN_QR_RUNBOOK.md) | Mint & rotate **batch** QR |
| [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) | Shopify vs Printify vs humanity.llc |
| [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) | Launch gates |
| [`EPHEMERAL_STATE_AND_MERCH.md`](EPHEMERAL_STATE_AND_MERCH.md) | Same ink, new meaning (Glitch launch moat) |

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-28 | Initial spec — company/community merch lane, Glitch instance, key custody |
| 2026-05-30 | **Glitch launch → Tier 1 customizable**; this doc scoped to Tier 0 batch primitive; `tier0_glitch_hoodie_v1` shared-batch deprecated for launch |
