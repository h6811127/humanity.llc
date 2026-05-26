# Card workspace UX (`/created/`)

**Status:** Phase 0–4 shipped  
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

## Phase 2 shipped

- **My cards** as primary home for multi-card users (`/created/` redirects contextless visits to `/wallet/` and points local hub home to `/wallet/`)
- Compact hub on `/created/` (switcher only)
- Single **Advanced** stack in control (collapsed Manage/Help surface)
- Vouch-ready keys on scan (see `docs/VOUCH_READY_KEYS_DESIGN.md` for shipped phases 1–5)

---

## Phase 3 shipped — My cards home (`/wallet/`)

- `/wallet/` page title and H1: **My cards on this device** (keys still local-only; URL unchanged)
- Landing path step 4 → **My cards** (`/wallet/`)
- Landing shortcut **My cards** (was “All saved cards”)
- Cross-links from `/created/` hub and error copy use **My cards** for `/wallet/`
- Active-session banner on wallet: **Open controls** (not “Open card page”)

---

## Phase 4 shipped — My cards naming consistency

- Scan/vouch and cross-tab banners link to `/wallet/` as **My cards** (not “Saved cards”)
- Landing status dot aria-label uses **My cards**
- `docs/CREATED_TASK_DASHBOARD.md` and `docs/DEVICE_OS.md` aligned with **Tasks · Advanced** (not Manage / More options)

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
7. Visit `/created/` with no query → lands on `/wallet/` with **My cards on this device**.

---

## Tests

- `worker/tests/created-mode.test.ts`
- `worker/tests/device-auto-save.test.ts`
- `e2e/device-os-wallet.spec.ts` — My cards home heading, contextless `/created/` redirect
