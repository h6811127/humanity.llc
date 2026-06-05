# Card workspace UX (`/created/`)

**Status:** Phase 0–4 shipped · **target evolution:** [`STEWARD_UX_PRESENTATION_TARGET.md`](STEWARD_UX_PRESENTATION_TARGET.md) (step 20)  
**Pages:** `site/created/index.html` · `site/wallet/` (My cards)  
**Related:** `docs/CARD_WORKSPACE_PHASE0.md`, `docs/KEYS_CARDS_AND_VERIFICATION.md`, `docs/DEVICE_OS.md`, [`LANDING_PROGRESS_STRIP.md`](LANDING_PROGRESS_STRIP.md)

**Current vs target:** Today `/created/` is a **single control workspace** (setup · Live · Manage) for all root kinds. Step 20 adds a **room switcher** (Doors · Wear · Season), **one root default + dual skins** (Q1), and filters **add** UI by active room while **lists** still show all children. Slices 1–3 shipped: inference-based add filter, room switcher, add-vs-list (lists always visible with room badges). This doc describes **shipped behavior**; [`STEWARD_UX_PRESENTATION_TARGET.md`](STEWARD_UX_PRESENTATION_TARGET.md) describes **where control should go**.

---

## Modes

| Mode | When | UI |
|------|------|-----|
| **setup** | Keys in tab and first-session gate not cleared (`fresh=1`, not saved, no `hc_setup_done`, or no recovery seatbelt) | Linear wizard - no tabs |
| **control** | Keys in tab, saved on device, setup done or recovery seatbelt | **Live · Manage** ([`CREATED_TASKS_TAB_REDESIGN.md`](CREATED_TASKS_TAB_REDESIGN.md) T1 shipped) |
| **view** | No signing keys in this tab | Read-only notice + unlock paths |

Resolver: `site/js/created-mode.mjs` · `modeFromPage()`.

**Mode gate (P0-4):** **control** when this tab has signing keys and the card is **saved on this device**, unless `?fresh=1` (post-create wizard, including Protect). Returning stewards skip setup even when `hc_setup_done` is unset — hub/wallet **Open controls** and wallet **Open workspace** land on Live · Manage, not setup step 2 (Download QR). First-time `?fresh=1` still requires the full wizard and seatbelt before **Open card controls**. `syncSetupDoneForSavedProfile` backfills `hc_setup_done` when the wallet row already has seatbelt markers. Steward `#revoke` hashes — see `docs/HUB_REVOKE_AND_CONTROLS_NAVIGATION.md`.

Storage: `localStorage.hc_setup_done` - map of `profile_id → true` after wizard finish (with seatbelt) or legacy backfill with seatbelt on wallet row.

---

## Setup wizard (Phase 1)

Kicker copy in setup: **"Four steps · keys stay in this browser"** to reinforce local-first key custody.

**Planned (WS-CUSTODY):** Consumer create defaults to **This device** (`device_unlock`); setup kicker becomes Layer 2 unlock language — see [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md). Steward/operator create keeps **Full control keys**.

| Step | User action | Gate |
|------|-------------|------|
| 1 Save | Save control key to this device | Cannot continue until `isWalletSaved(profile_id)` |
| 2 Print | Download QR PNG | - |
| 3 Test scan | Optional **Open scan page** preview; **Continue** advances to Protect (panel hint explains both) | - |
| 4 Live | **Open card controls** | Marks setup done, clears `fresh` from URL, enters **control** |

Modules: `created-setup.mjs`, `created-workspace.mjs`.

Keys strip is moved into the wizard for step 1, then restored to the Tasks panel in control mode.

Recovery disclosure label in setup now uses **"Recovery key (advanced, optional)"** (replacing "Break-glass recovery key") to keep the option discoverable without security-jargon friction.

On entering step 4, setup now includes a subtle "goes live" transition and confirmation copy ("Object now resolves live on the network.").

---


### View mode (Phase 1 + 3)

| Mode | Live tab | Manage tab |
|------|----------|------------|
| **view** | Read-only status + object card + **QR and signage** tasks (open scan, copy link, full QR); no publish or custody | **Restore ownership** panel first; network inspect read-only |

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
- Active-session banner on wallet: **Open workspace** → card controls (Live · Manage), not setup Download QR; uses `openCardNowPage()` like row **Open controls** — `.hc-emphasis-card--active` on `#wallet-active-banner` — [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) Phase 0

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
3. Download QR on step 2; step 3 **Test scan:** **Continue** goes to Protect without opening scan; optional **Open scan page** → browser tab opens new tab, installed PWA same-tab with **← Back to setup** banner ([`PWA_STANDALONE_EXTERNAL_NAVIGATION.md`](PWA_STANDALONE_EXTERNAL_NAVIGATION.md) P1–P2, P1b).
4. **Open card controls** → tabs visible, `fresh` removed, hero **Live QR ready**.
5. Revisit `/created/?profile_id&qr_id` (no fresh) → control mode directly.
6. Hub **Open card** on saved row → control with revoke available.
7. Visit `/created/` with no query → lands on `/wallet/` with **My cards on this device**.

---

## Tests

- `worker/tests/created-mode.test.ts`
- `worker/tests/device-auto-save.test.ts`
- `e2e/device-os-wallet.spec.ts` - My cards home heading, contextless `/created/` redirect
