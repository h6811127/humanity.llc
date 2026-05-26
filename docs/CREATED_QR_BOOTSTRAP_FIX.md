# `/created/` QR render regression (2026-05-25)

**Symptom:** After commit `69f4d6c`, the scan QR image and preview on `/created/` stopped rendering. Copy/download controls for the scan link also failed to initialize.

**Fix:** Declare `createdTabs` with `let` before assignment in `site/js/created.mjs`.

**Related:** `docs/CREATED_TASK_DASHBOARD.md` (dashboard bootstrap contract)

---

## Root cause

Commit `69f4d6c` moved dashboard wiring **before** the top-level QR render block so **Save control key** could call `runSave()` immediately (without waiting for `bootstrapOwnerTools()`).

That reorder surfaced a latent bug: `createdTabs` was assigned without a declaration:

```javascript
createdTabs = initCreatedTabs(); // ReferenceError in ES modules
```

ES module scripts run in **strict mode**. Assigning to an undeclared binding throws `ReferenceError: createdTabs is not defined` and **stops the entire module**, including:

- `await renderQrToImage(qrImg, activeScanUrl)` (hero QR + preview)
- Scan link copy / download handlers
- `void bootstrapOwnerTools()` (revoke, live proof, etc.)

Previously, the same bad assignment ran **after** the QR block. Top-level `await` on the QR import meant the QR path executed first; the script only crashed at the end when tabs initialized - so the QR still appeared.

---

## Correct bootstrap order

`site/js/created.mjs` must initialize in this order:

| Step | What | Why |
|------|------|-----|
| 1 | Session + DOM refs | `profileId`, `activeQrId`, `activeScanUrl` |
| 2 | `let createdTabs` | Strict-mode binding before assignment |
| 3 | `createdTabs = initCreatedTabs()` | Tab panels; may read URL hash |
| 4 | `setupCreatedDashboard()` | Task actions need `selectTab` + `runSave` |
| 5 | `initCreatedDeviceSave()` | When `profileId` + `activeQrId` exist |
| 6 | QR block (`renderQrToImage`, preview sync) | Must not be blocked by step 3–5 |
| 7 | `void bootstrapOwnerTools()` | Async owner tools (revoke, rotate, backup) |

Dashboard wiring (steps 3–5) belongs **before** QR render (step 6) so **Save control key** works without scrolling. Step 2 is mandatory whenever step 3 runs before the QR block.

---

## Fix (code)

```javascript
let deviceSaveCtl = null;
let createdTabs;

// … later …
createdTabs = initCreatedTabs();
setupCreatedDashboard();
```

Do **not** revert dashboard-before-QR ordering; only add the declaration.

---

## Verification

1. Create a card → `/created/` shows the small QR preview and full **Your scan QR** image.
2. Browser console: no `ReferenceError: createdTabs is not defined`.
3. **Save control key** still saves without scrolling (regression from `69f4d6c` intent).
4. **Download QR image** and **Copy scan link** work when a scan URL is present.

---

## Files

| Path | Role |
|------|------|
| `site/js/created.mjs` | Bootstrap order; `let createdTabs` |
| `site/js/created-dashboard.mjs` | Task dashboard actions |
| `docs/CREATED_TASK_DASHBOARD.md` | UX contract for Tasks tab |
