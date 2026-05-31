# Merch physical QA runbook (Tier 1 exit gate)

**Status:** Operator checklist — complete before first paid personalized drop ships  
**Parent:** [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) exit checklist · [`V1_ASSUMPTION_REGISTER.md`](V1_ASSUMPTION_REGISTER.md) A-004 · A-009  
**Visual choreography:** [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) § Beat 1 (physical recognition) — digital wow must not replace reliable ink scan  
**Automated regression:** `npm run worker:test:merch-print-qa`

---

## Purpose

Prove that **printed** personalized merch (hoodie or sticker) scans correctly on real phones and that strangers see **bearer limits** — not just that resolver HTML passes in Vitest.

Code regression covers scan copy and layout. This runbook covers **ink, material, distance, lighting, and wear**.

---

## Prerequisites

- [ ] Fulfillment mint completed: planned `print_artifact` QRs active in D1
- [ ] Printify sample received (or internal proof print using production artwork pipeline)
- [ ] Artwork path uses `renderPrintArtworkFromScanUrl` + template profile ([`QR_BRANDING.md`](QR_BRANDING.md) § Two registers) — record `template_id` and profile on sign-off
- [ ] At least **3 phones**: iOS Safari, Android Chrome, one older/slower device if available
- [ ] Staging or production scan URL from minted item: `https://humanity.llc/c/{profile_id}?q={qr_id}`

---

## A. Scan reliability (A-004)

Test each phone at **normal arm's length** and at **~2 m** (poster / across-room).

| # | Check | Pass? |
|---|--------|-------|
| A1 | Camera app opens scan URL without custom Humanity app | ☐ |
| A2 | Active item resolves in **&lt; 5 s** on LTE/Wi‑Fi (not offline cache) | ☐ |
| A3 | QR still scans under **indoor warm light** and **near window daylight** | ☐ |
| A4 | Hoodie: scan works on **flat chest print** (not only when garment is stretched) | ☐ |
| A5 | Sticker: scan works at **220 px display size** and on physical 2×2 in trim | ☐ |
| A6 | After light crease / edge lift (sticker) or one wash (hoodie if applicable), scan still works or failure is documented | ☐ |

**Fail action:** Adjust print template size/contrast (`docs/QR_BRANDING.md`) or Printify product; do not enable `personalize.checkout_open` until A1–A5 pass. If testing `qr_only` / `transparent` frame backgrounds, update `print-template-render.ts` only after a Charcoal (or target color) proof passes — do not change digital scan/created frame defaults.

---

## B. Stranger comprehension (A-009)

Use a **non-owner** tester who did not create the card.

| # | Check | Pass? |
|---|--------|-------|
| B1 | Tester finds **“What this scan does not prove”** without scrolling past hero | ☐ |
| B2 | Tester can paraphrase: **holding the item ≠ owning the card** | ☐ |
| B3 | Tester does **not** say “verified human” or “this proves identity” | ☐ |
| B4 | Active print shows **No calendar expiry** / revoke-only lifecycle (not “expired sticker”) | ☐ |
| B5 | Merch CTAs visible on live wear scan (`Get yours on wear` / customize path) | ☐ |

**Fail action:** Copy fix on scan page or customizer; re-run comprehension with 3+ strangers.

---

## C. Revoke drill (Tier 1 per-item)

Owner revokes **one** print_artifact QR; sibling item QRs (if any) stay active.

| # | Check | Pass? |
|---|--------|-------|
| C1 | Re-scan revoked item → status unmistakably **Revoked** (not “unknown” or “expired”) | ☐ |
| C2 | Bearer warning still visible on revoked scan | ☐ |
| C3 | Tester understands **physical ink remains** but network state changed | ☐ |
| C4 | Sibling print_artifact on same card still scans **Active** (multi-quantity order) | ☐ |

**Fail action:** See [`MERCH_SUPPORT_MACROS.md`](MERCH_SUPPORT_MACROS.md); fix resolver revoke display before launch.

---

## D. Owner live update (no reprint)

| # | Check | Pass? |
|---|--------|-------|
| D1 | Owner updates manifesto line from `/created/` or wallet | ☐ |
| D2 | Re-scan **same printed QR** shows new line within active cache TTL or hard refresh | ☐ |

---

## Sign-off

| Field | Value |
|-------|--------|
| Product tested | `[hoodie_live_object_v1 \| glitch_hoodie_v1 \| sticker_personalized_v1]` |
| Print template id | `[hc-glitch-hoodie-v1 \| …]` |
| Frame profile | `[full + tight \| full + default \| …]` |
| Printify placeholder | `[back for Glitch \| front for Live Object]` |
| Proof SVG | `npm run print:glitch-hoodie-proof` (optional reference file) |
| Print order id | `[po_…]` |
| Sample QR id | `[qr_…]` |
| Phones used | `[e.g. iPhone 15 Safari, Pixel 8 Chrome, …]` |
| Date | `[YYYY-MM-DD]` |
| Result | `[ ] Pass · [ ] Fail — block checkout` |

When signed off, mark **Printed item scans; bearer warning visible** in [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) and add one line to [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) Tier 1 gates.

---

## Related

| Doc | Role |
|-----|------|
| [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) | Funnel exit checklist |
| [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) | Shopify + Printify + headless architecture |
| [`QR_BRANDING.md`](QR_BRANDING.md) | Artwork size / contrast |
| [`M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md) | Digital stranger path (pre-print) |
| [`TIER0_CAMPAIGN_QR_RUNBOOK.md`](TIER0_CAMPAIGN_QR_RUNBOOK.md) | Tier 0 batch rotate drill |
