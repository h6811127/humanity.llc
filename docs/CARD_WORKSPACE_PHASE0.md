# Card workspace — Phase 0 (footguns)

**Status:** Shipped  
**Next:** Card workspace Phase 0–3 complete — see `docs/CARD_WORKSPACE_UX.md` · product verticals in `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md`  
**Related:** `docs/DEVICE_HUB_AND_LOCAL_SEARCH.md`, `docs/DEVICE_OS.md`, `docs/REVOKE_UI_INVESTIGATION.md`, `docs/KEYS_CARDS_AND_VERIFICATION.md`

---

## Shipped changes

| Change | Behavior | Files |
|--------|----------|-------|
| **Open card = load keys** | Hub ⋯ **Open card** calls `openCardNowPage()` (same as **Use keys** when keys are saved). No more dead link to `/created/` without `hc_created`. | `site/js/device-hub-ui.mjs` |
| **Auto-save default on** | `isAutoSaveEnabled()` is true unless `localStorage.hc_auto_save_device === "0"`. User can turn off in hub shortcuts. | `site/js/device-auto-save.mjs`, `site/js/created-device-save.mjs` |
| **Post-create `fresh=1`** | Create redirect adds `?fresh=1` for Phase 1 setup mode detection. | `site/js/create-card.mjs` |
| **User-facing copy** | Prefer **card page** / **Saved cards** over raw `/created/` in hints (URLs unchanged). | `site/index.html`, `site/wallet/index.html`, `site/create/index.html`, `site/created/index.html`, `site/js/created-dashboard.mjs`, `site/js/device-hub-import.mjs` |

---

## Auto-save contract

```text
hc_auto_save_device unset  →  ON (new visitors)
hc_auto_save_device = "1"  →  ON
hc_auto_save_device = "0"  →  OFF (explicit opt-out)
```

After create, `initCreatedDeviceSave` runs `runSave()` in a microtask when auto-save is on and keys are in tab.

---

## Hub row actions (updated)

| Control | Action |
|---------|--------|
| **Use keys** | `openCardNowPage(entry)` |
| **Open scan** | Public scan URL (new tab) |
| **⋯ Open card** | `openCardNowPage(entry)` — loads keys when saved |

**Deprecated footgun:** ⋯ **Manage** as plain `<a href="/created/?profile_id&qr_id">` without `activateWalletEntry`.

---

## Manual QA

1. Create card → lands on `/created/?profile_id=…&qr_id=…&fresh=1` with keys in tab.
2. With default auto-save, card appears in hub / wallet without tapping Save (toggle off → must save manually).
3. From hub, ⋯ **Open card** on a saved row → revoke/update UI available (not “unlock backup only”).
4. Turn auto-save off → create another card → must tap Save control key.

---

## Tests

`worker/tests/device-auto-save.test.ts` — `autoSaveEnabledFromStorage()` (default on / explicit off).
