# M7 — Live control copy comprehension runbook

**Status:** Runbook ready; execution pending (≥5 testers)  
**Gate:** `docs/M7_LIVE_CONTROL_ALPHA.md` Step 2 · `docs/V1_IMPLEMENTATION_BACKLOG.md` H-002 · `docs/V1_ASSUMPTION_REGISTER.md` live control spike  
**Prerequisite:** Step 1 shipped; side-by-side + expiry UI shipped on scan page.

---

## Core question

After completing (or observing) a live proof loop, ask each tester:

> **What did live control prove?**

Follow-up if needed:

> **What did it *not* prove?**

Do not define “live control,” “key,” or “vouch” unless they are stuck after one neutral prompt.

---

## Who counts

- Not you, not someone who wrote the docs, not a co-founder who demoed the product this week.
- OK: friend-of-friend, meetup attendee, coworker on another team, event volunteer.
- Each tester should use their **own phone** (Safari or Chrome).

Minimum **5** testers before marking comprehension passed (same bar as `FOUNDING_DROP_BRIEF.md` copy gates).

---

## Pre-flight (operator, ~10 minutes)

Run once yourself before inviting strangers:

1. **Create** — `https://humanity.llc/create/` → land on `/created/` with keys in tab.
2. **Scan** — open scan URL on a second device (or second browser profile).
3. **Ask for live proof** — scanner taps **Ask for live proof**; owner opens proof link → **Prove control now** on `/created/`.
4. **Success** — scanner page shows green **Control proven** block with limitation copy (**does not prove legal identity**).
5. **Expiry** — wait for proof display window to end (or use stale `proof_expires_at` in dev); scanner returns to **Ask for live proof** with plain expired message.
6. **Challenge timeout** — start a new request; let 120s challenge expire without signing; scanner shows **Control was not proven. The request expired.**

Automated copy guardrails: `npm run worker:test -- worker/tests/scan.test.ts` (comprehension copy assertions).

---

## Per-tester scorecard

| # | Check | Pass? |
|---|--------|-------|
| L1 | Tester can paraphrase: **someone with the card key proved control recently** | ☐ |
| L2 | Tester does **not** say “legal ID,” “government verified,” or “this person *is* the human on the card” | ☐ |
| L3 | Tester does **not** treat live proof as a **vouch** or “Verified Human” upgrade | ☐ |
| L4 | Tester does **not** say holding the **physical QR/sticker** proves ownership | ☐ |
| L5 | Tester understands **card may still be active** when proof fails or expires | ☐ |
| L6 | After success, tester finds limitation copy without being told where to look | ☐ |

**Pass bar:** L1 + L2 required; at most one miss across L3–L6 per tester. **≥5/5** testers pass.

**Fail action:** Fix scan success/failure copy in `worker/src/resolver/scan-html.ts`; re-run with 3+ new strangers.

---

## What you send (copy-paste)

> Two-phone quick test (~5 min):  
> Phone A: open this scan link: `[SCAN_URL]`  
> Phone B: you have the card keys on `/created/`  
>  
> On Phone A tap **Ask for live proof**. On Phone B open the owner link and tap **Prove control now**.  
>  
> Then tell me:  
> 1) What did live control **prove**?  
> 2) What did it **not** prove?

---

## Sign-off

| Field | Value |
|-------|--------|
| Date | `[YYYY-MM-DD]` |
| Testers (count) | `[≥5]` |
| Pass count | `[n/5]` |
| Result | `[ ] Pass · [ ] Fail — copy fix before public live-control claims` |

When passed, update `docs/M7_LIVE_CONTROL_ALPHA.md` Step 2 comprehension line to **passed** with date.

---

## Related

| Doc | Role |
|-----|------|
| [`M7_LIVE_CONTROL_ALPHA.md`](M7_LIVE_CONTROL_ALPHA.md) | Step 2 candidates |
| [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) | Live control vs identity |
| [`M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md) | General scan stranger path |
| [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) | P1-LC manual spot check |
