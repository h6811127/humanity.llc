# Status plate pilot (Phase A vertical #1)

**Status:** Active pilot  
**Parent:** `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md`  
**Prerequisite:** M5 stranger loop (`docs/M5_STRANGER_TEST_RUNBOOK.md`)

---

## What it is

A **status plate** is a QR on a door, wall, or window that answers one question when scanned:

> What is the status of this place **right now**?

Not a bio link. Not legal ID. Object name + live network status.

---

## How to create one

1. Go to **https://humanity.llc/create/**
2. Choose **Status plate** under “Start from”
3. Fill in:
   - **Handle**  -  your card id (e.g. `river_studio`)
   - **What is this plate on?**  -  headline on scan (e.g. `Studio door`)
   - **What should scanners see?**  -  status line (e.g. `Open · Thu–Sun until 9 PM`)
4. Save recovery key on `/created/`, print QR, scan from another phone, **update the status line** on `/created/`, then revoke to test.

Public showcase scan (homepage pilot): see `site/data/showcase-status-plate.json`  -  refresh with `npm run site:seed-showcase`.

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
| Stranger creates status plate unassisted | ☐ |
| Scan answers “open or not?” in &lt;30s | ☐ |
| Stranger says scan does **not** prove who owns the door | ☐ |
| Print + second-device scan + revoke without founder present | ☐ |
| Notes captured for copy fixes (not new hub pages) | ☐ |

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
