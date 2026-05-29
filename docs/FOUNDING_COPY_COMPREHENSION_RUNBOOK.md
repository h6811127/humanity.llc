# Founding copy comprehension runbook (D9)

**Status:** Runbook ready; execution pending (≥5 testers)  
**Gate:** [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) § Product/trust · [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) § Comprehension gates · [`LAUNCH_LANGUAGE_KIT.md`](LAUNCH_LANGUAGE_KIT.md) § Sticker FAQ  
**Prerequisite:** Tier 0 founding sticker page live at `/shop/founding/` with full [`LAUNCH_LANGUAGE_KIT.md`](LAUNCH_LANGUAGE_KIT.md) § Sticker FAQ; automated guards pass (`npm run worker:test:comprehension`).  
**Companion:** M7 passed 2026-05-29 · M5 stranger path passed 2026-05-27.

---

## Core questions

After reading the **founding sticker** product page FAQ (or hearing you read the three key FAQs aloud), ask each tester:

> **1) Does buying this sticker verify you?**  
> **2) Does holding the sticker prove you own the card?**  
> **3) Will the sticker stop working after a year?**

Do not define “vouch,” “Registered,” or “live control” unless they are stuck after one neutral prompt.

---

## Who counts

- Not you, not someone who wrote the docs, not a co-founder who demoed merch this week.
- OK: friend-of-friend, meetup attendee, coworker on another team, someone curious about the drop.
- Each tester uses their **own phone** (Safari or Chrome).

Minimum **5** testers before marking founding copy comprehension passed (same bar as [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md)).

---

## Pre-flight (operator, ~5 minutes)

Run once before inviting strangers:

1. Open `https://humanity.llc/shop/founding/` — hero + **Before you buy** checkboxes + FAQ visible.
2. Confirm FAQ includes calendar expiry, buy ≠ verify, QR ≠ owner proof, revoke, campaign end, and misprint/reprint.
3. Automated copy guardrails: `npm run worker:test:comprehension` (founding + live-control guards).

---

## Per-tester scorecard

| # | Check | Pass? |
|---|--------|-------|
| F1 | Tester says buying the sticker **does not** verify them or grant vouched status | ☐ |
| F2 | Tester says holding / wearing the sticker **does not** prove they own the Humanity Card | ☐ |
| F3 | Tester says the sticker QR **does not** calendar-expire (link stays valid; status may change) | ☐ |
| F4 | Tester does **not** describe merch as “legal ID,” “KYC,” or “verified human badge” | ☐ |
| F5 | Tester understands revoke changes scan result, not the physical ink | ☐ |

**Pass bar:** F1–F3 required; at most one miss across F4–F5 per tester. **≥5/5** testers pass.

**Fail action:** Fix copy on `/shop/founding/` (and related shop surfaces); re-run `npm run worker:test:comprehension`; re-test with 3+ new strangers.

---

## What you send (copy-paste)

> Quick read (~3 min) on your phone:  
> **https://humanity.llc/shop/founding/**  
> Scroll to **FAQ** (or I’ll read the three questions below).  
>  
> Then tell me:  
> 1) Does buying this sticker **verify** you?  
> 2) Does **holding** the sticker prove you **own** the card?  
> 3) Will the sticker **stop working after a year**?

---

## Sign-off

| Field | Value |
|-------|--------|
| Date | `[YYYY-MM-DD]` |
| Testers (count) | `[≥5]` |
| Pass count | `[n/5]` |
| Result | `[ ] Pass · [ ] Fail — copy fix before founding drop money` |

When passed, update [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) copy comprehension checkbox and [`OWNERSHIP_AND_CONTROL_MODEL.md`](OWNERSHIP_AND_CONTROL_MODEL.md) D9 row.

---

## Related

| Doc | Role |
|-----|------|
| [`M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md`](M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md) | Live control (passed) |
| [`M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md) | Scan stranger path (passed) |
| [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md) | Sticker expiry policy |
| [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) | P1-FC manual spot check |
