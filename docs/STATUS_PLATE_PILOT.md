# Status plate pilot (Phase A vertical #1)

**Status:** Active pilot  
**Parent:** `docs/ROOT_CARD_AND_CHILD_OBJECTS.md` · `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md`  
**Prerequisite:** ~~M5 stranger loop~~ **Satisfied** — M5 passed 2026-05-27 (`docs/M5_STRANGER_TEST_RUNBOOK.md`)

---

## What it is

A **status plate** is a QR on a door, wall, or window that answers one question when scanned:

> What is the status of this place **right now**?

Not a bio link. Not legal ID. Object name + live network status.

---

## How to create one

**Current implementation (flat-card bridge):**

1. Go to **https://humanity.llc/create/**
2. Choose **Status plate** under “Start from”
3. Fill in:
   - **Handle**  -  your card id (e.g. `river_studio`)
   - **What is this plate on?**  -  headline on scan (e.g. `Studio door`)
   - **What should scanners see?**  -  status line (e.g. `Open · Thu–Sun until 9 PM`)
   - **Optional details**  -  up to two short rows (e.g. special hours, tasks) shown under the status on scan
4. Save recovery key on `/created/`, print QR, scan from another phone, **update the status line** on Live (no revoke required first), then revoke to test.

**Target model:** From an existing root Humanity Card, choose **Add object -> Status plate**. The root key signs the plate's public state; the plate gets its own object/QR lifecycle but no new private key or separate human verification.

Public showcase scan (homepage pilot): see `site/data/showcase-status-plate.json`  -  refresh with `npm run site:seed-showcase` (includes optional `object_streams` detail row on scan).

### Storage format (no new API field)

The resolver stores one `manifesto_line` with **two lines**:

```text
Studio door
Open · Thu–Sun until 9 PM
```

Line 1 = object label · Line 2 = status detail. The scan page detects this and renders **Status plate** layout (`worker/src/resolver/manifesto-display.ts`).

---

## What scanners see

- **pass-type:** Status plate  
- **Headline:** object name (line 1)  
- **Status line:** line 2 (emphasized)  
- **Handle:** smaller `@handle` under the status  
- **Badge:** Active / Revoked / etc. from network  
- **Foot:** “Scan shows current status for this place - not who owns the door.”

Deploy Worker with `X-HC-Scan-UI: pass-v7` for this layout.

---

## Pilot checklist (5–10 real plates)

| Step | Pass? |
|------|-------|
| Stranger creates status plate unassisted (current flat-card bridge) | ☐ |
| Existing card owner adds status plate as child object (target flow) | ☐ manual · **create + update UI shipped** on `/created/` Live (child scan QR later) |
| Scan answers “open or not?” in &lt;30s | ☐ |
| Stranger says scan does **not** prove who owns the door | ☐ |
| Print + second-device scan + revoke without founder present | ☐ |
| Notes captured for copy fixes (not new hub pages) | ☐ |

---

## Habit loop scorecard

**Strategy:** `docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md` § Step 1  
**Product:** `/created/` shows **Pilot habit loop** for status-plate templates (`site/js/status-plate-loop-scorecard.mjs`).

| Signal | Target | How measured |
|--------|--------|--------------|
| Status updates published | **≥2** per steward | Auto-count on successful Live publish (localStorage per `profile_id`) |
| Printed + mounted | 1 | Owner checkbox (or auto when QR PNG downloaded) |
| Second-device scan | 1 | Owner checkbox |
| Non-creator scans for real decisions | **≥5** across pilot | Founder field notes (no server analytics) |

**Habit loop closed (one steward):** ≥2 updates + printed + second-device scan confirmed. Scorecard headline switches to “Pilot habit loop closed on this device.” when all three are true.

**Field pilot export:** **Copy pilot summary** on `/created/` copies local JSON (`humanity_status_plate_pilot_summary_v1`) for founder aggregation across plates — no server analytics. Roll up exports: `npm run site:aggregate-pilot-summaries -- summaries/*.json`

**Privacy:** Scorecard is device-local only — aligns with no scan analytics by default.

---

## Not in this pilot

- Calendar / geofence auto-open  
- “Scans to restore” gamification (landing demo only)

**Status line edits:** shipped  -  `docs/MANIFESTO_STATUS_UPDATE.md`, **Update public line** on `/created/`.

---

## Related

| Doc / path | Use |
|------------|-----|
| `site/create/` | Status plate template |
| `docs/M3_SCAN_PAGE_UI.md` | Scan card contract |
| `docs/M4_CREATED_REVOKE_UI.md` | Owner revoke on `/created/` |
