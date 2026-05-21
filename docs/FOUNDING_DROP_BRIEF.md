# Founding Drop Brief (Operational)

**Status:** Working checklist — fill in bracketed fields before launch  
**Canonical strategy:** `docs/MERCH_LED_V1.md`  
**Copy source:** `docs/LAUNCH_LANGUAGE_KIT.md` (Tier 0 / Tier 1 sections)

---

## Drop Overview

| Field | Tier 0 — Curiosity | Tier 1 — Belonging |
|---|---|---|
| **Codename** | `[e.g. Signal Sticker]` | `[e.g. Founding Human Line]` |
| **Purpose** | Walking ads + scan→create | Cohort trust + personalized artifact |
| **Who can buy** | Open / waitlist-approved | Founding cohort invite only |
| **Window** | `[start]` → `[end]` | `[start]` → `[end]` (after Tier 0 or overlap final week) |
| **Quantity cap** | `[e.g. 500]` or unlimited | `[e.g. 100]` |
| **SKU count** | 1 design | 1 design (+ personalization when QA ready) |
| **QR model** | Batch QR → landing OK | Unique item QR required when enabled |
| **Price** | `[e.g. $8–12 + ship]` | `[e.g. $15–25 + ship]` |
| **Status on scan** | Card may be `Registered` only | May show `Founding Human` / `Vouched Human` per policy |

**Hard rule:** Purchasing never grants vouch or “verified” status. Print never says Verified Human.

---

## Pre-Launch Gates

Check every box before taking money.

### Product / trust

- [ ] `V1_PRODUCT_TRUST_MODEL.md` published and linked from scan page
- [ ] Scan page: status + limits + bearer warning + dual CTAs (curiosity + belonging where applicable)
- [ ] Forbidden claims list on internal launch checklist (`LAUNCH_LANGUAGE_KIT.md`)
- [ ] Public labels locked: `Registered`, `Vouched Human`, `Founding Human`, etc.
- [ ] Copy comprehension test passed (≥5 testers): merch ≠ vouched; sticker ≠ owner proof

### Tier 0 (curiosity)

- [ ] One sticker (or card) passes physical scan QA on ≥3 phones
- [ ] Story-row product page live with Tier 0 copy
- [ ] Batch QR resolves to correct landing (no stale verification on print)
- [ ] Analytics: scan count + scan→card-create (no per-scan PII logging)

### Tier 1 (belonging)

- [ ] Founding cohort roster finalized (`[N]` members, max 25–100)
- [ ] Invite codes or allowlist wired to checkout
- [ ] Vouch rules published (3 vouch threshold, quotas, 90-day wait)
- [ ] Shopify metadata spike passed if personalized (`artifact_intent_id` on paid webhook)
- [ ] Printify sample order passed if per-item unique QR
- [ ] Support/reprint policy published (`V1_DECISION_LOCK` D-005)

### Ops

- [ ] Shopify test store + live webhooks + idempotency harness
- [ ] Manual production approval default on
- [ ] Operator lookup: Shopify order ↔ artifact intent ↔ Printify order
- [ ] Refund macro for misprint; separate macro for owner-revoked QR (no physical recall)

---

## Tier 0 Checklist — Curiosity Drop

### Offer

- [ ] Product: `[sticker | flat card]` size `[mm]`
- [ ] Design: front manifesto line + QR; **no** mutable trust text on print
- [ ] Back / insert: bearer warning (see language kit)
- [ ] Inventory / POD: Printify product ID `[ ]`

### Storefront

- [ ] Hero: curiosity headline (kit Tier 0)
- [ ] Subhead: scan hook, not verification promise
- [ ] Product bullets: what you get / what you do **not** get
- [ ] FAQ: “Does buying this verify me?” → No
- [ ] Secondary CTA: Create a card (free path)

### Fulfillment

- [ ] Batch QR artwork approved
- [ ] Shipping regions: `[ ]`
- [ ] Estimated delivery copy: `[ ]`
- [ ] Held-for-review path tested (payment without fulfillment)

### Launch day

- [ ] Founder post (kit Tier 0 social)
- [ ] Link: `[store URL]`
- [ ] Monitor: orders, scans, scan→create %, support inbox
- [ ] Day-7 review: any stranger orders? any confusion reports?

### Tier 0 exit criteria (proceed to Tier 1)

- [ ] ≥`[50]` orders or ≥`[200]` scans (set your bar)
- [ ] Scan→card-create ≥`[5]%` or ≥`[25]` cards from non-cohort emails
- [ ] Zero “I thought I bought verification” support tickets unresolved
- [ ] Phase A digital slice stable 7 days (no P0 resolver bugs)

---

## Tier 1 Checklist — Belonging Drop

### Cohort

- [ ] Roster: `[names/count]` invited
- [ ] Playbook weeks 1–3 complete for ≥80% of cohort (`FOUNDING_COHORT_PLAYBOOK.md`)
- [ ] At least one in-person scan circle or scheduled video scan circle done
- [ ] ≥`[10]` mutual vouches among cohort without founder prompt

### Offer

- [ ] Founding-only product variant or gated collection
- [ ] Personalization: `[handle on print | QR only]` — per Printify QA
- [ ] Packaging insert: belonging + vouch responsibility copy
- [ ] Optional: ceremony / first-vouch circle event date `[ ]`

### Storefront

- [ ] Invite-only checkout (code or customer tag)
- [ ] Hero: belonging headline (kit Tier 1)
- [ ] Explicit: founding artifact ≠ legal ID ≠ platform account

### Fulfillment

- [ ] Unique item QR pipeline tested on ≥3 test orders
- [ ] Revoke-one-item test: sibling QRs stay active
- [ ] Production approval gate on

### Launch day

- [ ] Cohort email (kit Tier 1 invite)
- [ ] No public “verified” language in thread
- [ ] Track: vouch rate, invite rate, repeat-wear check (survey or spot check)

### Tier 1 exit criteria (consider Commons Pass pilot)

- [ ] ≥`[70]%` cohort created card + received artifact
- [ ] ≥`[40]%` cohort has ≥1 vouch given and ≥1 received
- [ ] ≥`[5]` unprompted invites to non-cohort humans
- [ ] ≥`[1]` community/org asks for “pass for our group” conversation

---

## Metrics Dashboard (Minimal)

Track weekly in a spreadsheet — no scan analytics product.

| Metric | Tier 0 target | Tier 1 target |
|---|---|---|
| Orders | `[ ]` | `[ ]` |
| Scans (aggregate) | `[ ]` | `[ ]` |
| Scan → card create | `[ ]%` | `[ ]%` |
| Cards from non-friend domains | `[ ]` | — |
| Vouches in cohort | — | `[ ]` |
| Invites attributed | `[ ]` | `[ ]` |
| Support tickets: verification confusion | 0 open | 0 open |
| Support tickets: misprint / ship | `<[ ]%` orders | same |

---

## Rollback / Pause Triggers

Pause sales and fix before continuing if:

- Printed QR fails scan QA on >20% of random sample
- Paid webhook duplicates fulfillment
- Multiple users believe purchase = `Vouched Human`
- Resolver shows wrong status >1% of scans in cohort test
- Printify orders stuck >`[7]` days with no operator path

---

## Owner Decisions (Fill Before Print)

| ID | Decision | Your call |
|---|---|---|
| FD-01 | Tier 0 price | `[ ]` |
| FD-02 | Tier 1 price | `[ ]` |
| FD-03 | Tier 0 cap | `[ ]` |
| FD-04 | Tier 1 cap | `[ ]` |
| FD-05 | Cohort size | `[ ]` |
| FD-06 | Tier 1 gate: invite only vs vouch-required before ship | `[ ]` |
| FD-07 | Overlap: Tier 0 open during Tier 1? | `[ ]` |
| FD-08 | Revenue/margin one-pager URL | `[ ]` |
| FD-09 | Support email / response SLA | `[ ]` |

---

## Day-of Launch Runbook (30 min)

1. Resolver health check (active + revoked test URLs).
2. Place test order Tier 0 → confirm webhook → confirm no duplicate Printify job.
3. Publish founder post + pin trust model link.
4. Cohort on standby for first-hour scan questions.
5. Log first 10 scans manually if analytics not wired.
6. End-of-day: orders, scans, confusion notes, ship blockers.

---

## Related Docs

- `docs/MERCH_LED_V1.md` — strategy and phase order
- `docs/LAUNCH_LANGUAGE_KIT.md` — all public strings
- `docs/FOUNDING_COHORT_PLAYBOOK.md` — cohort weeks and rituals
- `docs/V1_ASSUMPTION_REGISTER.md` — Shopify / Printify spikes
- `docs/V1_DECISION_LOCK.md` — locked technical decisions
