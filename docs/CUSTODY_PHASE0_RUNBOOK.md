# Custody Phase 0 — de-risk runbook (WS-CUSTODY C0)

**Status:** Active — **C0 in progress** (no wrap crypto)  
**Audience:** Product, QA, support, engineering  
**Canonical spec:** [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) § Phase 0 · launch gate **G-C0**  
**Related:** [`M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md`](M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md) · [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md) · [`CARD_WORKSPACE_UX.md`](CARD_WORKSPACE_UX.md) · [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md)

| G-C0 result | `[ ] Pass · [ ] Fail — extend C0 copy/UX` |

---

## Purpose

Phase **C0** validates whether **mandatory recovery**, **in-app scan as print default**, and **comprehension fixes** reduce nontechnical user drops **before** building `device_unlock` wrap crypto (C1).

**C0 ships on the existing `full_keys` model** — no passkey-at-create yet.

---

## Product sentence

> Before we add Face ID custody, prove that **recovery is mandatory**, **scan starts in-app**, and **general users understand protect + test** on today’s keys model.

---

## C0 deliverables

| # | Deliverable | Status | Proof |
|---|-------------|--------|-------|
| C0-1 | Mandatory recovery UX strengthened (Protect step copy + platform-sync disclaimer) | Engineering | `device-ownership-copy-core.mjs` · setup wizard |
| C0-2 | In-app scan **primary** on setup Test step; Camera/tab preview secondary | Engineering | `/created/` setup panel · `openHubQrScanner` |
| C0-3 | Print step hint — test with in-app scanner after print | Engineering | setup QR panel hint |
| C0-4 | Support drop taxonomy (custody vs comprehension vs Safari vs commerce) | This doc § Taxonomy |
| C0-5 | Nontechnical comprehension study (≥5 testers) | Human | § Scorecard · **G-C0** |
| C0-6 | Funnel drop log — top 3 reasons documented | Human | § Funnel template · **G-C0** |
| C0-7 | Engineering preflight | CI | `npm run custody:phase0-preflight` |
| C0-8 | Comprehension kit + sign-off scripts | Engineering | `npm run custody:phase0-kit` · `npm run custody:phase0-sign-off` |

---

## Support drop taxonomy

When a user or tester gets stuck, classify **one primary** bucket (secondary tags OK):

| Bucket | Symptoms | Not this bucket |
|--------|----------|-----------------|
| **Custody** | “Lost control”, “can’t sign”, “restore”, tab vs saved, keys wiped | User never reached Protect |
| **Comprehension** | “What is vouch/live proof/revoke?”, wrong trust expectations | Unlock UI worked; user confused by meaning |
| **Safari / platform** | Camera → new tab, PWA vs Safari split, ITP eviction, storage full | User on desktop Chrome only |
| **Commerce** | Paid checkout, print fulfillment, refund expectation | Free create only |

Log every C0 study session with: `{ bucket, step, verbatim quote, device (iOS Safari / PWA / Android / desktop) }`.

---

## Funnel template (G-C0)

Track where **nontechnical** testers stop (first failure only):

| Step | Event | Drop? | Bucket | Notes |
|------|-------|-------|--------|-------|
| 1 | Land `/create/` → submit | | | |
| 2 | Auto-save / Save step clear | | | |
| 3 | Download QR | | | |
| 4 | Test scan (in-app vs browser tab) | | | |
| 5 | Protect — recovery saved | | | |
| 6 | Open card controls / Live | | | |
| 7 | Optional: scan printed QR with Camera (field realism) | | | |

**G-C0 pass:** ≥5 testers complete steps 1–6 **or** document top **3** drop steps with bucket counts.

---

## Comprehension scorecard (nontechnical testers)

**Who counts:** Same bar as M7 — not engineers, not doc authors. Own phone. Minimum **5** testers.

**Core questions** (do not define “keys”, “session”, or “recovery” unless stuck):

1. **After Protect:** “If you lose this phone, how would you get control back?”
2. **After Test scan:** “What did scanning the QR prove about the person holding the phone?”
3. **Optional after Live:** “What can you do from Manage if something goes wrong?”

| # | Check | Pass? |
|---|--------|-------|
| C0-A | Names **recovery code or backup file** — not “Apple” or “Humanity support” alone | ☐ |
| C0-B | Does **not** believe iCloud/Face ID alone replaces recovery save | ☐ |
| C0-C | Understands QR scan shows **object/card status**, not automatic proof they own the phone | ☐ |
| C0-D | Completed Protect (checkbox or backup download) without engineer coaching | ☐ |
| C0-E | Used **in-app scan** or can repeat why Camera-alone is risky on iPhone | ☐ |

**Pass bar:** C0-A + C0-D required; at most one miss across C0-B/C0-C/C0-E per tester. **≥5/5** testers pass.

**Fail action:** Fix copy in `device-ownership-copy-core.mjs` + setup panels; re-run 3+ new testers.

---

## Pre-flight (operator, ~15 minutes)

1. `npm run custody:phase0-preflight` — copy + setup surface checks.
2. `npm run custody:phase0-kit` — generate operator scorecard page (local).
3. Local: `npm run pages:dev` + `npm run worker:dev` → open `http://127.0.0.1:8788/dev/custody-phase0-comprehension.html`
4. Confirm Protect blocks Continue until recovery ack or backup export.
5. On Test step: **Scan with this app** opens hub scanner; **Preview in browser tab** is secondary.
6. iPhone (if available): confirm setup done copy mentions Home Screen + in-app scan for print.

Automated guards: `npm run worker:test:comprehension` · `npm run worker:test:setup-protect` · `npm run custody:phase0-preflight`.

---

## What you send testers (copy-paste)

> Quick test (~10 min) on your phone:  
> 1. Create a live object: `https://humanity.llc/create/`  
> 2. Follow the setup steps — **save the recovery code** when asked.  
> 3. On **Test your QR**, tap **Scan with this app** (not your Camera app first).  
> 4. When done, tell me:  
>    - If you lost this phone, how would you get control back?  
>    - What does scanning the QR prove about someone holding it?

---

## Sign-off (G-C0)

```bash
npm run custody:phase0-preflight
npm run custody:phase0-kit
# After ≥5 human testers:
npm run custody:phase0-sign-off -- --pass --apply --testers 5 --pass-count 5
# Optional funnel summary:
npm run custody:phase0-sign-off -- --pass --apply --testers 5 --pass-count 5 --drops "4:Safari,7:platform" --decision proceed-c1
```

Record in [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md) changelog:

- Date, tester count, top 3 funnel drops, pass/fail C0-A–E summary
- Decision: proceed to **C1** (wrap crypto) vs extend C0 UX-only iteration

---

## Explicitly out of C0 scope

- WebAuthn wrap / `device_unlock` storage (C1)
- Mode-aware quiet rehydrate (C2)
- Consumer vs steward create fork UI (C1 entry)
- Operator account recovery (never)

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-06-03 | C0 started — runbook + setup UX + preflight before C1 wrap crypto |
