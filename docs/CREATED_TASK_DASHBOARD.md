# `/created/` task dashboard UX

**Status:** Shipped layout contract (Tasks tab)  
**Page:** `site/created/index.html` · `site/js/created-dashboard.mjs` · `site/js/created.mjs`  
**Related:** `docs/M4_CREATED_REVOKE_UI.md`, `docs/DEVICE_OS.md`, `docs/M3_M4_EXECUTION_PLAN.md`, `docs/CARD_WORKSPACE_PHASE0.md`

---

## Product frame

After create, `/created/` is a **task dashboard**, not a settings dump. The user just made a **live object** (QR). The page should show that object immediately, then guide them through control setup.

**Verdict (target):** Portfolio-quality UI — intentional, usable, technically serious without overwhelming. The main remaining product risk is users who never **save the control key** and lose revoke/update ability when the tab closes.

---

## Page hierarchy (Tasks tab)

Top to bottom:

1. **Hero** — `@handle` · **Live QR ready** · status meta (`Card active · QR expires …`)
2. **Small QR preview** — tap scrolls to full QR block (emotional “here’s the thing you made”)
3. **Primary actions** (prominent)
   - **1. Save control key** — `Required` badge; first setup step
   - **Open scan page**
4. **More tasks** (grouped list)
   - Download QR → scrolls to full QR section (download button lives there)
   - Print instructions
   - Test scan
   - Update status
   - Revoke QR
5. **Keys strip** — custody notice + save form (revealed when saving)
6. **Network status & IDs** — collapsed `<details>` with icons
7. **Full QR section** — large QR, download, copy link, print steps

---

## Copy rules

| Area | Use | Avoid |
|------|-----|--------|
| Hero title | `Live QR ready` | `Card created` + `Your live QR is ready` (redundant) |
| Hero meta | `Card active · QR expires May 25, 2027 at 4:25 PM` | Splitting status across hero + dashboard title |
| Save control key | Step **1**, subtitle: *Keep update/revoke access in this browser.* | Generic “keep signing keys” without urgency |
| Save badge | `Required` until saved on device | Warning styling (keys present in tab is normal) |
| Vouch row | **Vouch status** / *No accepted vouches yet.* | **Registered** (sounds like account signup) |
| QR expiry row | **QR expires** / formatted datetime | **This QR valid until** |
| Download QR (task) | Scroll to `#created-qr-section` | Auto-triggering download (duplicates “Download QR image”) |

---

## Action behavior

| Action | Behavior | Done state |
|--------|----------|------------|
| Save control key | Run save to `hc_wallet`; reveal keys strip | Green tint when saved |
| Open scan page | `window.open(scanUrl)` | Green tint after use |
| Download QR | Smooth scroll to full QR | Green tint after scroll |
| Print instructions | Scroll to QR + open print `<details>` | Green tint |
| Test scan | Open scan URL (same as primary) | Green tint |
| Update status | Manage tab + open manifesto panel | Green tint |
| Revoke QR | Manage tab + open revoke `<details>` | No done tint (destructive) |
| QR preview tap | Scroll to full QR | — |

Done states persist per card in `sessionStorage` (`hc_created_task_done`).

---

## Visual notes

- **Save control key** uses setup styling (step number, `Required` badge, stronger border) — not error/warning colors.
- **Primary pair** (save + open scan) sits above the task list with larger tap targets.
- **Dark mode:** shell fill tokens for lists; advanced blocks use icon + chevron summaries (`created-advanced-summary`).
- **Hub sheet (mobile):** `var(--shell-fill)` — no hardcoded white sheet background.

---

## Bootstrap order (`created.mjs`)

Dashboard actions must wire **before** the top-level QR render so **Save control key** can call `runSave()` without waiting for `bootstrapOwnerTools()`. That ordering requires a declared tab handle:

1. `let createdTabs` — ES modules are strict; undeclared assignment throws and blocks QR render.
2. `createdTabs = initCreatedTabs()` + `setupCreatedDashboard()` + `initCreatedDeviceSave()`.
3. QR block (`renderQrToImage`, preview sync, copy/download handlers).
4. `void bootstrapOwnerTools()` (revoke, rotate, backup — async).

See `docs/CREATED_QR_BOOTSTRAP_FIX.md` for the 2026-05-25 regression (commit `69f4d6c` moved dashboard init up without adding the declaration).

---

## Files

| Path | Role |
|------|------|
| `site/created/index.html` | Hero, preview, primary + task lists, network labels |
| `site/js/created-dashboard.mjs` | Action wiring, done states |
| `site/js/created.mjs` | Hero meta, QR preview sync, vouch/expiry copy, bootstrap order |
| `site/js/created-device-save.mjs` | `runSave()` for dashboard |
| `site/styles.css` | Dashboard hierarchy styles |

---

## Manual QA

1. Create card → `/created/` shows `@handle`, **Live QR ready**, small QR preview, **Save control key** with **Required**.
2. Tap **Save control key** → saved to device, row turns green, badge clears.
3. **Download QR** scrolls to full QR; only the lower button downloads PNG.
4. Network **Vouch status** and **QR expires** labels readable in light + dark mode.
5. Collapsed **Network status & IDs** visible on black background (icon + chevron).
