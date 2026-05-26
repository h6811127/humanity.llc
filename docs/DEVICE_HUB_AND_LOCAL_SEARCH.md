# Device hub and local search

**Status:** Phase 1–4 shipped · shared hub · activity log · returning-user desktop · **landing desktop layout**  
**Scope:** Browser-local personalization only  -  not resolver-wide discovery  
**Companion:** [`DEVICE_OS.md`](DEVICE_OS.md)  -  two-layer model, placement rule, landing story · [`LANDING_DESKTOP_LAYOUT.md`](LANDING_DESKTOP_LAYOUT.md) · [`LANDING_PROGRESS_STRIP.md`](LANDING_PROGRESS_STRIP.md)

---

## Product intent

The landing page, **`/created/`**, and **`/wallet/`** share an **“on this device”** hub: saved cards with signing keys, **pinned public scan links**, **recent activity**, and shortcuts. This mirrors a Settings-style surface (grouped inset lists) without accounts, sync, or operator storage of private keys.

**Not in scope:** searching the Humanity resolver, other people’s cards, or any server index.

---

## Hub UX refinement notes (May 2026)

These notes are captured as individual product refinements so implementation can happen in small slices without losing intent. **Authoritative row spec:** [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md).

1. **Reduce text density inside each card**
   - Collapse key preview, last saved, and metadata behind **Details** expansion.
   - Primary card view should stay focused on identity, live state, and quick actions.
2. **Rename “Use keys”**
   - Shipped as **Open controls** (hub/wallet/tests).
3. **Make cards feel alive**
   - Unified status line with **checked** recency (device resolver poll - not scan logging). See [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md) § Recency wording and data policy.
4. **Refine top status pills**
   - Hub **segmented status line** (landing/wallet chrome) uses **Network reachable** semantics; saved **rows** no longer duplicate network + liveliness pills (Phase 1 row consolidation).
5. **Strengthen object identity visuals**
   - Object type on **identity line** (`Live demo · Registered`); left accent bar per type (shipped).
6. **Push shell further toward iOS-native feel**
   - Frosted hub sheet, elevation cards (shipped); row typography pass shipped (Row Phase 3).
7. **Make object actions primary**
   - Object control pills grouped under ⋯ **QR & lifecycle** (Row Phase 2 shipped).

### Implementation slices from these notes

- **Step 1 (shipped):** progressive disclosure (**Details**).
- **Step 2 (shipped):** **Open controls** rename.
- **Step 3 (shipped):** unified status line + **checked** wording (`device-hub-card-row-core.mjs`).
- **Step 4 (shipped):** hub chrome status segments; row pills removed in Phase 1.
- **Step 5 (shipped):** object identity line + type accents.
- **Step 6 (shipped):** shell polish pass.
- **Step 7 (shipped):** action-forward controls → `openCardControlPage()`.
- **Row Phase 1 (shipped):** information consolidation per [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md).
- **Row Phase 2 (shipped):** steward actions in ⋯ **QR & lifecycle**; **Prove live** stays inline when pending ([`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md)).
- **Row Phase 3 (shipped):** typography ladder, status dot rings, tightened spacing ([`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md)).

---

## Personalization route (decision)

We kept the landing funnel (hero → device hub → long-form content) and **enriched** it rather than replacing it with a full dashboard.

**Landing story (shipped):** Hero one-liner + trust chips (no account · keys in browser · no scan tracking), **How it works** flow strip (print → scan → verify), then framing and studio example. **On this device** is the hub sheet below the status line (inline search, no floating help pill). **Shortcuts & settings** sit after the studio block so first scroll stays product narrative. Closing **Ready to try it?** CTA before documentation. Intro band uses a shared 22px section-title ladder for **How it works** / **Ready to try it?** Homepage pass-card demo removed; strangers see real scan pages and the case study.

**Landing progress strip:** Retired May 2026 (removed from `/`). Steward resume via hub + `/created/`; strangers via hero + **How it works**. History: [`LANDING_PROGRESS_STRIP.md`](LANDING_PROGRESS_STRIP.md).

**Landing layout:** Mobile-first single column only (no desktop widening grid). See [`LANDING_DESKTOP_LAYOUT.md`](LANDING_DESKTOP_LAYOUT.md) for retired desktop experiment notes.

**Status line (shipped):** Segmented grey text (`Network reachable · 2 saved · 0 pinned · 1 notice`). Hub open state in `sessionStorage`; first unsaved-tab notice auto-expands hub once. On **`/created/`**, hub auto-opens when this tab has signing keys and hub state was never set.

**`/created/` hub (shipped):** Same groups as landing except: notice links to **`#created-keys-strip`**; shortcuts are **Manage this card**, **All saved cards**, **Homepage** (no focus toggle).

**Hub rows (shipped):** Saved cards show **Open controls** and **Open scan** on the row; **Prove live** inline when a challenge is waiting. Steward actions (**Update status**, **Revoke QR**, **New QR**, **Revoke options**) live under ⋯ → **QR & lifecycle** and call `openCardControlPage()` → `/created/#…` with keys loaded. **⋯** also has Open card, Relabel, vouch default, sign lock, Remove. **Open card** and **Open controls** both call `openCardNowPage()` when you need the full Tasks tab. See [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md). **Import backup file** decrypts `.hcbackup.json` into `hc_wallet`.

**Landing focus mode:** `localStorage.hc_landing_focus` hides intro (`[data-landing-tutorial]`). Keeps **hub**, **hub glance**, **system banner** (if unhealthy), **Help & protocol** list (not the full **Documentation** disclosure card), and **contact**. Trust sections (**Design choices**, **Clear limits**) are intro-only and hidden in focus mode. No bottom Create dock or “New here?” float. **Auto-save** on by default via `hc_auto_save_device` (opt out in hub shortcuts).

**Landing trust UI:** Intro mode shows **Design choices**, **Clear limits**, and **Documentation** as stacked `.landing-disclosure-card` rows (icon + title + subtitle + chevron). The status-plate **flow strip** (plate → scan → live state) uses `.flow-strip--model` and picks up dark surfaces from `site/css/theme-dark.css` when `hc_theme` is dark.

**Shortcuts & settings (shipped):** On the **homepage** (`/`) only - section after the studio example (unified list rows: Appearance, **Browser alerts** (background OS notifications for live proof), saved cards, manage, auto-save, focus). Hub sheet on all routes has **home icon** (left), status line (center), **Create +** (right); no shortcuts block in the hub.

**Chrome inbox (shipped):** Floating **inbox badge** next to the status dot when action items exist; hub `#device-hub-alerts-top` holds full rows. Spec and roadmap: [`DEVICE_INBOX.md`](DEVICE_INBOX.md). Status dot semantics: [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md).

**Hub intro coachmark (shipped):** First visit on `/`, `/create/`, and `/created/` points at the status dot; `hc_device_hub_intro_seen` prevents repeat on refresh, `hc_device_hub_intro_dismissed` after **Got it** or opening the hub. Not on `/wallet/`. Spec: [`DEVICE_HUB_INTRO_COACHMARK.md`](DEVICE_HUB_INTRO_COACHMARK.md).

**Hub glance (landing):** When the hub is collapsed, `#device-hub-glance` shows notice (if any) and up to three saved card labels; tap expands the hub. Quick-look popover rows use **semantic status tints** (`--surface-popover-notice-*`, `--surface-popover-crosstab-*`, `--surface-popover-warn-*` per [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md)). Glance **Card disabled since last visit** copy follows the latest resolver-confirmed alert state from the wallet network poll (not stale cache and not the persisted `hc_wallet[].status` field).

**`/wallet/` (Phase 5–6):** Uses the same hub renderer as landing. Each saved row shows **title**, **identity line**, **status line**, optional **card disabled since last visit** alert, **Details**, **Open controls / Open scan**, and steward actions under ⋯ **QR & lifecycle** (see [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md)). Row icon tone follows verification (green shield = Steward). Page is hub-expanded by default; help disclosure hides when cards exist.

**Card status line (Row Phase 1):** Single line replaces separate network + verification pills and the old liveliness row. Recency uses **checked** (this device’s last successful `GET …/status?q=…` poll), not **seen** - not a scan log. Full copy table: [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md).

**Object identity visuals (Step 5):** Object type appears on the identity line; left accent bar per type from `classifyObjectType()` (Membership, Status plate, Live demo, …).

**Shell polish (Step 6):** Hub sheet and glance popover use stronger frosted materials (higher blur, softer layered shadows, 20px top sheet radius). Saved cards drop grey outline borders in favor of elevation fills; spacing in hub sections and card rows is slightly tighter. See `site/css/device-shell.css` tokens (`--shell-blur`, `--shell-shadow-sheet`, `--shell-radius-card`).

**Keys vs verification:** See [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md). **Open controls** loads signing material into `hc_created`; verification on the identity line is read-only network state.

**Card-disabled-since-visit alert:** Only appears when this device previously recorded a **non-revoked** baseline and the resolver now reports **card disabled** (`scan.kind === card_revoked`). Copy is **“Card disabled on the network since your last visit.”** (not generic “revoked”) so it is not confused with QR-only revoke. The row **status line** uses the same `scan.kind`: **Disabled on network** for `card_revoked`, **QR revoked** for `qr_revoked`, **Reachable** when active. QR-only revoke does **not** trigger the since-visit alert. First sight of a disabled card shows the status line only, not “since your last visit.” Dismiss **Got it** stores acknowledged state; `hc-wallet-network-baseline-changed` re-applies hub/glance/inbox from the **latest resolver-confirmed** poll (not session cache alone). Leaving the tab (`pagehide` / hidden) snapshots resolver-confirmed alert states from this visit when a poll has completed. Returning to the tab (`visibilitychange` → visible) re-fetches resolver status for saved rows so alerts and status can clear without a full reload. Session cache (~5 min) is **not** used for alerts when it says `card_revoked` but the device baseline still says non-revoked - the hub re-fetches from the resolver first. A fresh fetch that returns non-revoked always updates the device baseline (self-heal after stale cache). Glance shows one card-disabled inbox row (not a duplicate suffix on the same saved card row).

**Copy alignment (shipped):** Shared strings live in `wallet-network-baseline.mjs`; row status uses `hubCardStatusLine()` in `device-hub-card-row-core.mjs` (prefers `scan.kind`). Verified: `npm run worker:test`; hub row shows matching **Disabled on network** status + banner only on real card-level transitions.

**Created keys strip:** On `/created/` **Now** tab, **Keys on this device** first; recovery in **Break-glass** `<details>` below.

**Naming:** UI says **Saved on this device**  -  not “wallet”. URL stays `/wallet/`.

---

## Local activity log (Phase 3)

| Key | `hc_device_activity` |
| Schema | `{ id, type, label, at, profile_id?, qr_id? }`  -  max 40 entries |
| Types | `saved`, `use_keys`, `remove_card`, `pin_added`, `backup_import`, `live_control` |
| UI | **Recent on this device** in hub  -  tap row → `/created/` **Now** (loads saved keys when available) |
| Glance (landing) | Saved card rows → **Now** (not expand hub only) |

---

## Local search  -  phases

### Phase 1 (shipped)

- **Data:** `hc_wallet` entries.
- **UI:** Filter at top of hub; status-line magnifier focuses search.
- **Wallet:** Inline search on saved-cards section.

### Phase 2 (shipped)

- **Storage:** `hc_device_pins`  -  public scan bookmarks only.
- **Add pin:** `/wallet/` form  -  `device-pins.mjs`.
- **Landing + created:** Injected pin group when pins exist.

### Phase 3 (shipped)

- Hub **Import backup file** → `device-hub-import.mjs`.
- Full export/import under **Manage** on `/created/`.
- Activity log (`device-activity.mjs`).

### Phase 4  -  live-control inbox (shipped)

- **`device-live-control-inbox.mjs`** polls pending challenges for saved cards with `qr_id`.
- Hub group **Live proof waiting** on landing and `/wallet/`; tap loads keys and opens `/created/` to sign.
- `/created/` keeps the existing proof panel (no duplicate inbox).

### Phase 5  -  cross-tab keys (shipped)

- **`device-tab-presence.mjs`** heartbeats which tabs hold signing keys (metadata only).
- **`device-cross-tab-banner.mjs`** on landing and `/wallet/` when keys live in another tab and this tab is not already showing the unsaved-keys notice.
- Hub glance rows for cross-tab keys and live proof when collapsed.

### Device inbox & background alerts

See [`DEVICE_INBOX.md`](DEVICE_INBOX.md).

| Item | Status |
|------|--------|
| Inbox badge + hub alert stack + glance rows | ✅ `device-inbox-core.mjs` + `device-hub-inbox-alerts.mjs` |
| Browser background alerts (live proof, tab hidden) | ✅ v2 A–C (`inboxKindAllowsOsNotification`) |
| Unified `device-inbox-core.mjs` | ✅ |
| Inbox sheet from badge tap | ✅ |
| Contextual opt-in + OS click deep link to `/created/` sign URL | ✅ |

### Optional hub polish

No backend required:

- ~~Browser notifications when a live proof is waiting~~ - ✅ v1 shipped; v2 in [`DEVICE_INBOX.md`](DEVICE_INBOX.md)
- ~~Hub glance on `/wallet/`~~ - landing popover only; wallet scrolls from dot
- ~~Light frontend tests for tab presence, live-control inbox, wallet network, and status counts~~ - ✅ `worker/tests/device-hub-frontend-pipeline.test.ts` + `npm run worker:test:device`; Playwright `e2e/device-{status-dot,inbox,os-wallet}.spec.ts` in CI
- ~~Inbox unification phases 1–10~~ - [`DEVICE_INBOX.md`](DEVICE_INBOX.md) (glance via `buildGlanceRowPlan()`)
- ~~Hub saved card row UX phases 1–3~~ - [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md)

### Deferred

- Resolver search API, directory of handles.

---

## Two storage layers

| Layer | API | Scope | Used for |
|-------|-----|--------|----------|
| **This tab** | `sessionStorage` (`hc_created`) | Single tab | Create, revoke, vouch in that tab |
| **This device** | `localStorage` (`hc_wallet`) | Whole origin | Saved cards, hub, search |
| **Activity** | `localStorage` (`hc_device_activity`) | Whole origin | Hub recent list |
| **Pins** | `localStorage` (`hc_device_pins`) | Whole origin | Public scan bookmarks only |

**Common confusion:** Create in tab B → open homepage in tab A → no keys until **Save on this device** in tab B.

---

## Security and data policy

- Wallet, pins, and activity stay in **browser storage**.
- Search and activity run entirely in the client.
- Pins are bookmarks only; vouching needs saved keys (**Open controls**).
- Saved row **checked … ago** is **this device’s resolver poll time** (`hc_wallet_network_cache`), not stranger scan activity. See [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md) and [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md).

---

## Files

| Path | Role |
|------|------|
| `docs/DEVICE_OS.md` | Device OS vision + checklist |
| `docs/DEVICE_INBOX.md` | Inbox badge, alerts, background alerts roadmap |
| `site/js/device-browser-notifications.mjs` | OS notifications v1 |
| `site/index.html` | Landing hub + intro (`data-landing-tutorial`) |
| `docs/LANDING_PROGRESS_STRIP.md` | Retired progress strip spec (May 2026) |
| `site/js/created-setup-hash.mjs` | Setup wizard hash → step (`#setup`, `#setup-qr`) |
| `site/created/index.html` | Created hub shell |
| `docs/HUB_CARD_ROW_UX.md` | Saved row IA, status copy, data-policy wording |
| `site/js/device-hub-card-row-core.mjs` | Row title, identity line, status line (pure helpers) |
| `site/js/device-hub-ui.mjs` | Shared hub render + init |
| `site/js/device-activity.mjs` | Activity log API |
| `site/js/device-live-control-inbox.mjs` | Live proof inbox poll + open |
| `site/js/device-hub-intro-coachmark.mjs` | First-visit status-dot coachmark |
| `site/js/device-hub-glance.mjs` | Collapsed-hub summary (landing) |
| `docs/DEVICE_HUB_INTRO_COACHMARK.md` | Coachmark show/dismiss/seen contract |
| `site/js/landing-device-hub.mjs` | Landing init wrapper |
| `site/js/created-hub.mjs` | Created init wrapper |
| `site/js/landing-focus.mjs` | Focus mode + intro toggle |
| `site/js/device-status.mjs` | Status line, dot sheet, hub expand |
| `site/js/device-theme.mjs` | Appearance toggle (`hc_theme`) |
| `site/css/theme-dark.css` | Pure-black dark palette |

### Dark mode · notice contrast (`hc-notice`)

Inline notices (hub **Your browser holds the private key**, system/cross-tab banners, form warnings) use shared tokens `--hc-notice-fg`, `--hc-notice-title-fg`, etc. defined on **`:root`** in `site/styles.css` and overridden on `html[data-theme="dark"]` in `site/css/theme-dark.css`.

The private-key notice on landing hub + `/wallet/` includes a small **Acknowledge** button. Dismissing stores `hc_keys_custody_notice_dismissed` in `localStorage` and keeps the notice hidden until you clear site data. For consolidated guides, use `/help/` (not scattered per-feature warnings).

**Do not** redefine those variables on `.hc-notice` itself - each notice box would pin light-mode greys and body copy becomes unreadable on tinted dark backgrounds (especially `.hc-notice--info`).

Dark mode sets base tokens on `html[data-theme="dark"]`, then **per-variant** tokens on `.hc-notice--info` / `--warning` / `--error` so title and body stay high-contrast on blue, amber, and red fills. Titles use `--hc-notice-title-fg` (white on tinted banners); body uses `--hc-notice-fg` (slightly softer off-white).

**Create flow (`/create/`):** Field groups use `.flow-inset-fields` with a visible `border: 0.5px solid var(--shell-separator)` and bordered inputs (not borderless grey-on-grey). The pre-submit custody warning is a structured `.hc-notice--warning` (icon + title + body) so it inherits the same tokens - avoid pairing `.form-warning` hardcoded greys with `.hc-notice`.

| `site/js/device-hub-search.mjs` | Shared filter |
| `site/js/device-hub-import.mjs` | Hub backup import |
| `site/wallet/index.html` | Saved cards device shell |
| `site/js/wallet-page.mjs` | Wallet page + tab save + pins |
| `worker/tests/device-hub-frontend-pipeline.test.ts` | Cross-module hub pipeline Vitest (presence, live proof, network, counts) |
| `site/js/device-wallet-network.mjs` | Network status chips |
