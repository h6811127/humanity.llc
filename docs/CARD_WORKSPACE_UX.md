# Card workspace UX (`/created/`)

**Status:** Phase 0–4 shipped  
**Pages:** `site/created/index.html` · `site/wallet/` (My cards)  
**Related:** `docs/CARD_WORKSPACE_PHASE0.md`, `docs/KEYS_CARDS_AND_VERIFICATION.md`, `docs/DEVICE_OS.md`, [`LANDING_PROGRESS_STRIP.md`](LANDING_PROGRESS_STRIP.md)

---

## Modes

| Mode | When | UI |
|------|------|-----|
| **setup** | Keys in tab and first-session gate not cleared (`fresh=1`, not saved, no `hc_setup_done`, or no recovery seatbelt) | Linear wizard - no tabs |
| **control** | Keys in tab, saved on device, setup done or recovery seatbelt | **Live · Manage** ([`CREATED_TASKS_TAB_REDESIGN.md`](CREATED_TASKS_TAB_REDESIGN.md) T1 shipped) |
| **view** | No signing keys in this tab | Read-only notice + unlock paths |

Resolver: `site/js/created-mode.mjs` · `modeFromPage()`.

**Mode gate (P0-4):** **control** when this tab has signing keys, the card is **saved on this device**, and either the setup wizard finished (`hc_setup_done`) or a recovery seatbelt is present (recovery ack, encrypted backup export, or import). `?fresh=1` always stays in **setup** until Protect completes. `syncSetupDoneForSavedProfile` backfills `hc_setup_done` only when the wallet row already has seatbelt markers. Hub **Open controls** / `#revoke` deep-links require control mode - see `docs/HUB_REVOKE_AND_CONTROLS_NAVIGATION.md`.

Storage: `localStorage.hc_setup_done` - map of `profile_id → true` after wizard finish (with seatbelt) or legacy backfill with seatbelt on wallet row.

---

## Setup wizard (Phase 1)

Kicker copy in setup: **"Four steps · keys stay in this browser"** to reinforce local-first key custody.

| Step | User action | Gate |
|------|-------------|------|
| 1 Save | Save control key to this device | Cannot continue until `isWalletSaved(profile_id)` |
| 2 Print | Download QR PNG | - |
| 3 Test scan | Preview scan page (new tab in browser; tap Continue again before Protect) | - |
| 4 Live | **Open card controls** | Marks setup done, clears `fresh` from URL, enters **control** |

Modules: `created-setup.mjs`, `created-workspace.mjs`.

Keys strip is moved into the wizard for step 1, then restored to the Tasks panel in control mode.

Recovery disclosure label in setup now uses **"Recovery key (advanced, optional)"** (replacing "Break-glass recovery key") to keep the option discoverable without security-jargon friction.

On entering step 4, setup now includes a subtle "goes live" transition and confirmation copy ("Object now resolves live on the network.").

---

## Control mode (Live tab)

**T1-T4 shipped:** [`CREATED_TASKS_TAB_REDESIGN.md`](CREATED_TASKS_TAB_REDESIGN.md) - page hero **Your object is live**; **Live** tab has status strip, read-only **setup memory** chips (Save · Print · Test · Live), live object card with contextual primary CTA, **What scanners see**, deploy disclosures, custody keys, collapsed full-size QR. Revoke only on **Manage**.

**Manage** tab: revoke, rotate, backup, lifecycle notes, and doc links (icon + disclosure pattern). Public copy publishes on **Live** (**What scanners see**).

---

## Phase 0 recap

See `docs/CARD_WORKSPACE_PHASE0.md` - Open card loads keys, auto-save default on, `fresh=1` redirect.

---

## Phase 2 shipped

- **My cards** as primary home for multi-card users (`/created/` redirects contextless visits to `/wallet/` and points local hub home to `/wallet/`)
- Compact hub on `/created/` (switcher only)
- Single **Advanced** stack in control (collapsed Manage/Help surface)
- Vouch-ready keys on scan (see `docs/VOUCH_READY_KEYS_DESIGN.md` for shipped phases 1–5)

---

## Phase 3 shipped - My cards home (`/wallet/`)

- `/wallet/` page title and H1: **My cards on this device** (keys still local-only; URL unchanged)
- Landing **My cards** entry → `/wallet/` (homepage four-step progress strip retired — [`LANDING_PROGRESS_STRIP.md`](LANDING_PROGRESS_STRIP.md))
- Landing shortcut **My cards** (was “All saved cards”)
- Cross-links from `/created/` hub and error copy use **My cards** for `/wallet/`
- Active-session banner on wallet: **Open controls** (not “Open card page”); `.hc-emphasis-card--active` on `#wallet-active-banner` — [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) Phase 0

---

## Phase 4 shipped - My cards naming consistency

- Scan/vouch and cross-tab banners link to `/wallet/` as **My cards** (not “Saved cards”)
- Landing status dot aria-label uses **My cards**
- `docs/CREATED_TASK_DASHBOARD.md` and `docs/DEVICE_OS.md` aligned with **Tasks · Advanced** (not Manage / More options)

---

## Files

| Path | Role |
|------|------|
| `site/js/created-mode.mjs` | Mode resolution + setup done |
| `site/js/created-workspace.mjs` | Apply mode to DOM |
| `site/js/created-setup.mjs` | Wizard steps + protect gate |
| `site/js/created-setup-seatbelt.mjs` | Protect step recovery ack + backup export |
| `site/js/created-setup-hash.mjs` | Wizard hash → step index |
| `site/js/created-tabs.mjs` | Control tabs only |
| `site/js/created-dashboard.mjs` | Control task actions |
| `site/js/created.mjs` | Bootstrap + mode wiring |

---

## Manual QA

1. Create card → setup wizard, URL has `fresh=1`, hero says **Set up your live QR**.
2. Cannot skip step 1 without save (auto-save may complete step 1 immediately).
3. Download QR on step 2; step 3 **Test scan:** browser tab → new tab; installed PWA → same-tab preview with **← Back to setup** banner ([`PWA_STANDALONE_EXTERNAL_NAVIGATION.md`](PWA_STANDALONE_EXTERNAL_NAVIGATION.md) P1–P2).
4. **Open card controls** → tabs visible, `fresh` removed, hero **Live QR ready**.
5. Revisit `/created/?profile_id&qr_id` (no fresh) → control mode directly.
6. Hub **Open card** on saved row → control with revoke available.
7. Visit `/created/` with no query → lands on `/wallet/` with **My cards on this device**.

---

## Tests

- `worker/tests/created-mode.test.ts`
- `worker/tests/device-auto-save.test.ts`
- `e2e/device-os-wallet.spec.ts` - My cards home heading, contextless `/created/` redirect
