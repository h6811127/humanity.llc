# Card workspace UX (`/created/`)

**Status:** Phase 0–1 shipped · Phase 2 in progress (compact hub + Advanced tab)  
**Pages:** `site/created/index.html` · `site/wallet/` (My cards)  
**Related:** `docs/CARD_WORKSPACE_PHASE0.md`, `docs/KEYS_CARDS_AND_VERIFICATION.md`, `docs/DEVICE_OS.md`

---

## Modes

| Mode | When | UI |
|------|------|-----|
| **setup** | Keys in tab and (`fresh=1` or setup not done or not saved to device) | Linear wizard — no tabs |
| **control** | Keys in tab, setup complete, saved on device | Tasks · Advanced |
| **view** | No signing keys in this tab | Read-only notice + unlock paths |

Resolver: `site/js/created-mode.mjs` · `modeFromPage()`.

Storage: `localStorage.hc_setup_done` — map of `profile_id → true` after wizard finish.

---

## Setup wizard (Phase 1)

Kicker copy in setup: **"Four steps · keys stay in this browser"** to reinforce local-first key custody.

| Step | User action | Gate |
|------|-------------|------|
| 1 Save | Save control key to this device | Cannot continue until `isWalletSaved(profile_id)` |
| 2 Print | Download QR PNG | — |
| 3 Test scan | Preview what anyone scanning the QR sees (another device) | — |
| 4 Live | **Open card controls** | Marks setup done, clears `fresh` from URL, enters **control** |

Modules: `created-setup.mjs`, `created-workspace.mjs`.

Keys strip is moved into the wizard for step 1, then restored to the Tasks panel in control mode.

Recovery disclosure label in setup now uses **"Recovery key (advanced, optional)"** (replacing "Break-glass recovery key") to keep the option discoverable without security-jargon friction.

On entering step 4, setup now includes a subtle "goes live" transition and confirmation copy ("Object now resolves live on the network.").

---

## Control mode (Tasks tab)

Post-setup hierarchy (unchanged intent from `docs/CREATED_TASK_DASHBOARD.md`):

1. Hero — `@handle` · **Live QR ready**
2. Primary: Save (if needed) · Open scan
3. **More tasks** — download, print, test scan, update, revoke (advanced entry)
4. Network status (collapsed) · full QR block

**Advanced** tab (formerly Manage/Help): revoke, rotate, backup, manifesto update, lifecycle notes, and doc links.

---

## Phase 0 recap

See `docs/CARD_WORKSPACE_PHASE0.md` — Open card loads keys, auto-save default on, `fresh=1` redirect.

---

## Planned (Phase 2+)

- **My cards** as primary home for multi-card users
- Compact hub on `/created/` (switcher only) — in progress
- Single **Advanced** stack in control (collapse Manage panels) — in progress
- Vouch-ready keys on scan (`docs/VOUCH_READY_KEYS_DESIGN.md`)

---

## Files

| Path | Role |
|------|------|
| `site/js/created-mode.mjs` | Mode resolution + setup done |
| `site/js/created-workspace.mjs` | Apply mode to DOM |
| `site/js/created-setup.mjs` | Wizard steps |
| `site/js/created-tabs.mjs` | Control tabs only |
| `site/js/created-dashboard.mjs` | Control task actions |
| `site/js/created.mjs` | Bootstrap + mode wiring |

---

## Manual QA

1. Create card → setup wizard, URL has `fresh=1`, hero says **Set up your live QR**.
2. Cannot skip step 1 without save (auto-save may complete step 1 immediately).
3. Download QR on step 2; step 3 copy reads "Preview what anyone scanning this QR will see," and test scan opens new tab.
4. **Open card controls** → tabs visible, `fresh` removed, hero **Live QR ready**.
5. Revisit `/created/?profile_id&qr_id` (no fresh) → control mode directly.
6. Hub **Open card** on saved row → control with revoke available.

---

## Tests

- `worker/tests/created-mode.test.ts`
- `worker/tests/device-auto-save.test.ts`
