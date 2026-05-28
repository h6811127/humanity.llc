# Company merch & community campaign QR

**Status:** Canonical product spec (2026-05-28) — captures founder intent from pre-repo conversations (e.g. Glitch founding sweatshirt)  
**Audience:** Founder, ops, engineering, future governance  
**Not the same as:** Tier 1 personalized wear ([`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md)) · per-buyer `/shop/customize/`

---

## One-sentence product

**Company / community merch** is physical ink with a **shared HTTPS QR** that resolves to a **single live Humanity Card** (campaign profile). Strangers see **current signed state**; buyers do **not** get control of that card. The **community** influences what the scan shows only through an explicit **governance + key-custody** process—not by purchasing the garment.

---

## Why this doc exists

Founding conversations (including outside Cursor) described:

- A **fixed-design** sweatshirt (e.g. “Glitch” aesthetic from a one-off QR render) sold as **company merch**, not customizable.
- A **generalized QR** on every unit pointing at one live destination.
- A hope that **what that destination says** could eventually be something “we democratically decide.”

That intent overlaps existing **Tier 0 batch** policy but was never named or owned in `docs/`. This file is the **owner doc** for that lane.

---

## How we “own it” (product ownership)

| Layer | Owner | What “own” means |
|-------|--------|------------------|
| **Product definition** | This doc + [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) Tier 0 | Batch QR rules, no calendar expiry, commerce firewall |
| **Merch GTM** | [`MERCH_LED_V1.md`](MERCH_LED_V1.md) Phase B | Curiosity drop before personalized line |
| **Shop UX** | [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md) · [`features/Storefront v1.0.md`](features/Storefront%20v1.0.md) | Story-row **Founding objects**; no customizer |
| **Campaign QR ops** | [`TIER0_CAMPAIGN_QR_RUNBOOK.md`](TIER0_CAMPAIGN_QR_RUNBOOK.md) | Mint, rotate, physical QA |
| **Launch checklist** | [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) Tier 0 | Gates before taking money |
| **Democratic *process*** (future) | [`DEMOCRATIC_INFRASTRUCTURE.md`](DEMOCRATIC_INFRASTRUCTURE.md) · [`commons/COMMONS_ROADMAP.md`](commons/COMMONS_ROADMAP.md) | **Not** merch MVP—governance for *who may sign updates* |
| **Engineering** | `tier0_*` env · `store-catalog` `limited_drop` · Shopify webhook `tier0_batch` | See § Implementation map |

**Rule:** New SKUs (Glitch hoodie, Series B sticker, etc.) are **instances** of this doc. Do not fold them into Tier 1 `print_artifact` or `/shop/customize/` unless explicitly launching a **second product class**.

---

## Tier 0 batch (canonical architecture)

Already specified elsewhere; summarized here as the **community merch primitive**:

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
Many garments / stickers
    → same printed URL (?q=qr_campaign_…)
    → one profile_id (campaign card)
    → manifesto / status / limits updated by whoever holds signing keys
```

---

## Glitch founding drop (first instance — optional SKU)

**Glitch** is a **marketing name** for the first company-merch experiment, not a separate protocol type.

| Field | Guidance |
|-------|----------|
| **Visual** | QR artwork may look “glitched”; trust is still **HTTPS + signed resolver state**, not the bitmap aesthetic |
| **Origin story** | Often started as a **personal card** QR the founder controlled, then printed on a sweatshirt |
| **Shopify** | Static product (e.g. `glitch-live-qr-hoodie`) — payment SKU only; story lives on humanity.llc |
| **Fulfillment** | Pre-printed inventory **or** Printify batch — pick one; do not run Tier 1 per-order artwork upload for this SKU |
| **Scan destination** | Whatever **campaign profile** owns the printed `qr_id` at ship time |

When the drop is formalized, add a row to [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) and `site/data/shop-config.json` (see § Shop wiring gap).

---

## Key custody — who controls what scanners see

**“Community controls the sweatshirt”** is only true in product terms if we separate:

1. **What the network shows** — signed fields on the **campaign card** (manifesto line, status, limits).
2. **Who can sign changes** — whoever holds the **Ed25519 private key** for that `profile_id` (browser / backup / recovery).

There is **no** v1 “all buyers edit the scan page” feature. Democratic participation is **governance of key holders and published updates**, not Shopify order metadata.

### v1 options (pick explicitly)

| Model | Custody | Pros | Cons |
|-------|---------|------|------|
| **A. Founder personal card** (Glitch prototype) | Your existing card keys on one or more devices | Fastest; keys you already created | Scan looks like **your** handle; conflates person and movement; bad if you revoke/disable personally |
| **B. Dedicated campaign card** (recommended in D-M2) | New `profile_id` (e.g. `@founding_signal` / `@humanity_commons`) — keys in steward vault + backup | Clear “not a passport”; rotation without touching personal card | Requires new create + reprint if QR URL changes |
| **C. Multi-steward / governance** (future) | 2-of-3 or elected stewards; published changelog of manifesto updates | Matches “democratically decide” | Needs process + tooling (Commons Pass era) |

**Open decision D-M2** in [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) recommends **B** for production runs. **A** is acceptable for a **small pilot** if scan copy says it is a **founding experiment**, not “every holder controls this.”

### If keys are on another device

Use shipped portability ([`M5_5_OWNER_KEY_PORTABILITY.md`](M5_5_OWNER_KEY_PORTABILITY.md)):

1. On the device that created the card: export encrypted backup **or** display recovery key (if set).
2. On the device you use now: `/created/?profile_id=…` → import backup / recovery → update manifesto or revoke.
3. If no backup exists: you **cannot** sign updates from a new device; you can still **scan** (read-only). Plan migration to campaign card **B** before a large print run.

**Do not** print more units until you know which `profile_id` + `qr_id` are on the ink and you have a **recovery path** for that profile.

---

## “Democratically decide” — v1 vs later

| Phase | What strangers get | How “we” decide content |
|-------|-------------------|-------------------------|
| **v1 (now)** | Live scan of **one campaign card** | Founder/steward updates manifesto/status with signing keys; optional public note on scan (“Founding artifact · not a person”) |
| **v1b (ops)** | Same | Documented votes / forum / meeting minutes → **one steward** signs the agreed text (process outside app) |
| **v2 (product)** | Same ink | Multi-steward signing or org-issued updates ([`commons/COMMONS_ROADMAP.md`](commons/COMMONS_ROADMAP.md)) |
| **Anti-pattern** | — | Letting Shopify buyers edit scan content · implying purchase = membership in governance |

Creative experiments (rotation, Series A/B, sunset copy) live in [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) § Creative ideas — link them here when prioritized.

---

## Company merch line (how multiple drops fit)

A **line** is a sequence of **limited drops**, each with:

- Fixed artwork (may include a fixed QR bitmap),
- One batch `qr_id` (or a defined small set),
- Optional Shopify SKU,
- Published **governance note** for what the campaign card represents for that series.

| Drop | Tier | Customizer | Example store id (when wired) |
|------|------|------------|-------------------------------|
| Founding signal sticker | Tier 0 | No | `tier0_founding_sticker_v1` (shipped in catalog) |
| Glitch LIVE QR hoodie | Tier 0 | No | `tier0_glitch_hoodie_v1` (shipped in catalog) |
| Personalized hoodie | Tier 1 | Yes | `hoodie_live_object_v1` |

**Luxury / high price** on company merch is a **positioning** choice (FOUNDING_DROP_BRIEF), not a protocol feature.

---

## Implementation map (repo today)

| Capability | Status | Notes |
|------------|--------|-------|
| Tier 0 policy + runbook | Shipped (docs) | |
| `/shop/` founding row + `/shop/founding/` | Shipped (sticker) | Glitch hoodie on **Founding objects** row → `/shop/products/tier0_glitch_hoodie_v1/` |
| `GET /v1/store/rows` · `GET /v1/store/products/{id}` | Shipped (Worker) | SF-001 catalog API — `worker/src/index.ts` · verify: `merch-funnel:rollout:step3 -- --verify` |
| `TIER0_SHOPIFY_VARIANT_IDS` + `TIER0_CAMPAIGN_PROFILE_ID` | Operator env | Batch Printify SKUs (e.g. founding sticker) |
| `TIER0_SHOPIFY_INVENTORY_VARIANT_IDS` | Operator env | Pre-printed inventory SKUs (e.g. Glitch hoodie) — webhook `tier0_inventory`, no Printify queue |
| Paid webhook `tier0_batch` | Shipped | Queues batch Printify template |
| Paid webhook `tier0_inventory` | Shipped | Processing commerce order only — Shopify fulfills from stock |
| Democratic voting on scan text | **Not shipped** | |
| `tier0.products[]` in `shop-config.json` | **Shipped** | `site/js/shop-tier0-core.mjs` · legacy `tier0` block still maps to founding sticker |

**Engineering follow-ups** (when Glitch or Series B ships): see [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) § Operator setup; paste Shopify variant ids into Worker env (`TIER0_SHOPIFY_*`) and `shop-config.json`; run `npm run merch-funnel:verify-config -- --require-tier0=tier0_glitch_hoodie_v1` before `checkout_open: true`; physical QA per [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md). **Post-purchase URL (Glitch):** `https://humanity.llc/shop/thanks/?hc_ref=tier0_glitch` — shown on `/shop/products/tier0_glitch_hoodie_v1/` when checkout is open.

---

## Operator checklist (own the first drop)

- [ ] Record printed `profile_id`, `qr_id`, and HTTPS URL on ink.
- [ ] Confirm signing key access (this device, backup, or recovery) — [`M5_5_OWNER_KEY_PORTABILITY.md`](M5_5_OWNER_KEY_PORTABILITY.md).
- [ ] Decide custody model **A** (pilot) vs **B** (campaign card) before scaling print quantity.
- [ ] Scan copy: bearer limits · buying ≠ vouch · batch pointer (not buyer’s card).
- [ ] Shopify variant + `shop-config` + optional `TIER0_SHOPIFY_VARIANT_IDS`.
- [ ] Physical QA — [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md).
- [ ] If using personal card for pilot: plan migration to campaign card before drop #2.

---

## Related

| Doc | Use |
|-----|-----|
| [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) | Tier 0 / Tier 1 rules · D-M2 campaign ownership |
| [`TIER0_CAMPAIGN_QR_RUNBOOK.md`](TIER0_CAMPAIGN_QR_RUNBOOK.md) | Mint & rotate batch QR |
| [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) | Shopify vs Printify vs humanity.llc |
| [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) | Launch gates |
| [`MANIFESTO_STATUS_UPDATE.md`](MANIFESTO_STATUS_UPDATE.md) | Changing live copy without reprinting |
| [`DEMOCRATIC_INFRASTRUCTURE.md`](DEMOCRATIC_INFRASTRUCTURE.md) | Long-term democratic ownership of infrastructure |

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-28 | Initial spec — company/community merch lane, Glitch instance, key custody, democratic roadmap |
