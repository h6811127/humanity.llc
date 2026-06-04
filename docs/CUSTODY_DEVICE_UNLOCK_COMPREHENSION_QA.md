# device_unlock comprehension QA (WS-CUSTODY G-C1)

**Status:** Engineering + desk proxy shipped · manual sign-off open  
**Gate:** [`CUSTODY_LAUNCH_READINESS.md`](CUSTODY_LAUNCH_READINESS.md) **G-C1** · [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md)  
**Related:** [`CUSTODY_PHASE0_RUNBOOK.md`](CUSTODY_PHASE0_RUNBOOK.md) (full_keys C0) · [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md) K10 · [`M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md`](M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md)

| G-C1 result | `[ ] Pass · [ ] Fail — extend G-C1 copy/UX` |

---

## Purpose

Validate that **nontechnical** users understand **This device (Face ID / Touch ID)** custody on:

1. **Create** — recovery mandatory; canceling Face ID ≠ delete  
2. **Unlock** — “Unlock to manage” on scan / shell / wallet  
3. **Scan** — QR shows object status; unlock is separate  

Engineering surfaces: `device-custody-comprehension-core.mjs`, setup wizard copy, `DEVICE_UNLOCK_WEBAUTHN_CANCELED_HINT`.

---

## Who counts

- Not engineers or doc authors. Own phone (Safari iOS preferred).  
- Minimum **5** testers (same bar as C0 / M7).

---

## Pre-flight (operator, ~20 minutes)

1. `npm run custody:c1-preflight`  
2. `npm run custody:g-c1-kit` → open kit page (requires `npm run pages:dev`)  
3. Self-walk: create with **This device** → setup through Protect → in-app test scan → open scan URL in second context → dismiss Face ID once → confirm cancel copy  

Automated: `npm run worker:test:custody` (G-C1 filter) · `npm run e2e:custody-device-unlock`

---

## Per-tester scorecard

**Core questions** (do not define “keys”, “session”, or “WebAuthn” unless stuck):

1. **After create + Protect:** “If you lose this phone, how would you get control back?”  
2. **After dismiss Face ID on scan:** “Did that wipe your object?”  
3. **After test scan:** “What does scanning the QR prove about the person holding the phone?”  
4. **Optional:** “What does Unlock to manage mean?”

| # | Check | Pass? |
|---|--------|-------|
| **G1-A** | Names **recovery code or backup** — not Apple/support alone | ☐ |
| **G1-B** | Does **not** believe Face ID / iCloud alone replaces recovery save | ☐ |
| **G1-C** | Knows **canceling Face ID** does not delete the object | ☐ |
| **G1-D** | **Unlock to manage** = prove on this phone — not “Humanity restored it” | ☐ |
| **G1-E** | QR scan shows **status** — not automatic proof they own the phone | ☐ |
| **G1-F** | Used **in-app scan** on setup or explains Camera-alone risk | ☐ |

**Pass bar:** G1-A + G1-C + G1-D required; at most one miss across G1-B/G1-E/G1-F per tester. **≥5/5** testers pass.

**Fail action:** Fix copy in `device-ownership-copy-core.mjs` + setup bundle; re-run 3+ new testers.

---

## Device matrix (spot-check)

| # | Context | Check |
|---|---------|--------|
| 1 | iOS Safari create | This device default; recovery locked on |
| 2 | Setup Protect | device_unlock lead + platform-sync disclaimer |
| 3 | Scan, wallet empty tab | Unlock to manage → cancel → G1-C copy |
| 4 | New tab after unlock | Unlock prompt again (or window if within 30 min) |

---

## Sign-off

```bash
npm run custody:g-c1-kit
# ≥5 testers → record in kit funnel table
# Update G-C1 result line in this doc when passed
```
