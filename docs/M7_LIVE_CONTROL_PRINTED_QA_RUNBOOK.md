# M7 — Live control printed QR camera QA

**Status:** Runbook ready; pre-flight steps 1–4 shipped — human § A–C camera QA pending (≥3 phones)  
**Gate:** `docs/M7_LIVE_CONTROL_ALPHA.md` Step 2 · `docs/V1_IMPLEMENTATION_BACKLOG.md` H-003 · `docs/V1_ASSUMPTION_REGISTER.md` A-005  
**Prerequisite:** Step 1 shipped; in-person layout + expiry UI shipped; comprehension runbook ready.

---

## Purpose

Prove the **full live proof loop** works when a stranger reaches the scan page through a **native camera app** on a **printed** HTTPS QR — not only via pasted URLs or in-app browsers.

Code regression covers resolver + scan HTML. This runbook covers **camera handoff, print size, lighting, and in-person UX on real devices**.

---

## Print artifact (alpha)

Any of these count for M7 Step 2:

| Source | Notes |
|--------|--------|
| **Paper print** from `/created/` QR PNG (recommended) | Laser or inkjet; ≥2 cm module size |
| **Sticker / merch sample** | See [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md) § A |
| **Pilot status plate / live object** | Showcase seed URLs OK if card is yours |

URL must be canonical HTTPS: `https://humanity.llc/c/{profile_id}?q={qr_id}` (not `hc://`).

---

## Prerequisites

- [ ] Active card + active QR credential in production (or staging with same scan UI)
- [ ] Owner keys on `/created/` in a second device/browser profile
- [ ] **≥3 phones:** iOS Safari (Camera app), Android Chrome (Camera or Google Lens), one older device if available
- [ ] Printed QR at **normal arm's length** readable under indoor light

---

## Pre-flight (operator, ~15 minutes)

Run once before printing and camera testing on **≥3 phones**. Mirrors comprehension pre-flight in [`M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md`](M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md).

1. **Desk regression** — `npm run live-control:printed-qa:desk-gate` (steps 1–4 chain) or `npm run live-control:printed-qa:preflight` alone (Vitest + Playwright full loop).
2. **Production smoke** (recommended before print) — `npm run live-control:printed-qa:production-smoke` (scan HTML H-01/H-03 markers + challenge JSON POST H-02 on showcase card). Or: `npm run live-control:printed-qa:preflight -- --production-smoke` (includes step 1 desk gates).
3. **Two-device loop** — `npm run live-control:printed-qa:two-device-loop` (Playwright proxy + copy-paste scan/created URLs for real keys). Confirm: Ask → owner link → **Prove control now** → scanner **Control proven**.
4. **Print artifact** — `npm run live-control:printed-qa:print-prep` (validates canonical HTTPS scan URL + print/phone checklists). Download QR PNG from `/created/`; verify printed URL is `https://humanity.llc/c/{profile_id}?q={qr_id}` (≥2 cm module; see [`QR_BRANDING.md`](QR_BRANDING.md)). Add `--verify-live` to confirm scan page loads before printing.
5. **Phones ready** — stock Camera app on iOS Safari path, Android Chrome path, third device if available.
6. **Camera scorecard** — `npm run live-control:printed-qa:camera-scorecard` (§ A–C checklists + sign-off template). Complete on ≥3 phones using the **printed QR** from step 4.

Fast desk-only (skip Playwright): `npm run live-control:printed-qa:preflight -- --skip-e2e`

**Automated pre-check (included in step 1):**

```bash
npm run live-control:printed-qa:preflight
```

Or run gates individually:

```bash
npm run worker:test:live-control-printed-qa
npm run e2e:live-control-loop
```

---

## A. Camera scan → scan page

Test each phone at arm's length. Use the **stock Camera app** (or system QR scanner), not a Humanity PWA.

| # | Check | Pass? |
|---|--------|-------|
| P1 | Camera opens **Safari/Chrome** to humanity.llc scan page (no custom app required) | ☐ |
| P2 | Scan page loads **pass-v33** UI: hero live check settles, **Live control** block visible | ☐ |
| P3 | Page usable without login, email, or app install prompt on scan route | ☐ |
| P4 | Scan completes in **< 5 s** on LTE/Wi‑Fi (not offline stub) | ☐ |
| P5 | Works under **warm indoor light** and **near window daylight** | ☐ |

**Fail action:** Fix QR print size/contrast (`docs/QR_BRANDING.md`); verify HTTPS URL on print matches active credential.

---

## B. Live proof loop (printed entry path)

Scanner phone = camera scan from **§ A**. Owner phone = keys on `/created/`.

| # | Check | Pass? |
|---|--------|-------|
| B1 | Scanner taps **Ask for live proof**; owner panel or side-by-side **Owner** pane appears | ☐ |
| B2 | **Expires in M:SS** countdown visible while waiting for signature | ☐ |
| B3 | Owner opens proof link → **Prove control now** → scanner shows **Control proven** | ☐ |
| B4 | Success copy includes **does not prove legal identity** (see comprehension runbook) | ☐ |
| B5 | After proof display window, scanner returns to **Ask for live proof** (not stuck success) | ☐ |
| B6 | Unsigned challenge past 120s → **The 2-minute window ended. You can ask again.** | ☐ |

**Fail action:** Fix `scan-html.ts` client script or Worker live-control routes; re-run on all three phones.

---

## C. In-person layout spot check

| # | Check | Pass? |
|---|--------|-------|
| C1 | On phone held portrait: scanner + owner panes **stack** legibly | ☐ |
| C2 | On tablet or wide browser ≥640px: **Scanner \| Owner** columns when waiting | ☐ |
| C3 | **Ask again** after success starts a fresh request without stale owner link | ☐ |

---

## Sign-off

| Field | Value |
|-------|--------|
| Date | `[YYYY-MM-DD]` |
| Print type | `[paper / sticker / merch / plate]` |
| QR id | `[qr_…]` |
| Phones | `[e.g. iPhone 15 Safari, Pixel 8 Chrome, …]` |
| Result | `[ ] Pass · [ ] Fail — block public live-control demo on print` |

When passed, run `npm run live-control:printed-qa:sign-off -- --pass --apply --date YYYY-MM-DD` (updates `docs/M7_LIVE_CONTROL_ALPHA.md`).

---

## Related

| Doc | Role |
|-----|------|
| [`M7_LIVE_CONTROL_ALPHA.md`](M7_LIVE_CONTROL_ALPHA.md) | Step 2 candidates |
| [`M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md`](M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md) | Stranger copy gate |
| [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md) | Merch print scan reliability |
| [`M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md) | Digital stranger path |
| [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) | P1-LCP manual checklist |
