# Device OS  -  browser shell + physical network

**Status:** Phase 8 shipped (device hub) · Phase 1 refresh coordinator shipped · **Active vertical:** merch Tier 0 shop (`/shop/`) · **PWA install:** spec shipped ([`PWA_INSTALL.md`](PWA_INSTALL.md))  
**Audience:** Product, frontend, and anyone extending Pages without accounts  
**Roadmap index:** [`STEWARD_DEVICE_ROADMAP.md`](STEWARD_DEVICE_ROADMAP.md) — custody, inbox, Browser alerts, hosted push, PWA (links only)

---

## What we mean by “device OS”

Two layers that must stay separate but feel like one product:

| Layer | Where it lives | Job |
|-------|----------------|-----|
| **Device (browser shell)** | `localStorage` / `sessionStorage`, hub UI | Custody and control: where is my root key, what child objects can it manage, what happened here |
| **Network (physical software)** | Cloudflare Worker + D1, scan pages | Public truth: root cards, child objects, live manifesto/state, revoke, vouch, live control |

This is **not** a crypto wallet app and **not** a social network. It is **Settings + launcher** for root keys you already created, on top of a **minimal public resolver**. Target model: one root key can control many child objects without adding a private key for each one ([`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md)).

---

## Placement rule (every new feature)

Before shipping UI, answer:

| Question | Put it here |
|----------|-------------|
| Save, search, relabel, import backup, activity log, collapsed glance | **Device hub** (`#device-hub`) + glance strip |
| Live proof **inbox** (pending challenges for saved root cards / supported child QR scopes) | **Device hub**  -  tap opens `/created/` to sign |
| Actionable **device inbox** (badge, alerts, glance) | **Chrome** + hub `#device-hub-alerts-top` - see [`DEVICE_INBOX.md`](DEVICE_INBOX.md) |
| **Background alerts** (OS notifications, opt-in) | Device-only; live proof when tab hidden - see [`DEVICE_INBOX.md`](DEVICE_INBOX.md) |
| Manifesto, child object state, revoke, QR, backup export | **Network object** + `/created/` **Advanced** tab |
| Live proof **signing** | **`/created/`** only (existing proof panel + poll) |
| What a stranger sees | **Scan page only**  -  never a second homepage demo |
| Protocol essays, threat models, case study walkthrough | **Reference** (full docs in intro mode; Help & protocol footer in focus mode) |
| Install app / Add to Home Screen (returning stewards) | **Device chrome** — shell pages only; never scan — [`PWA_INSTALL.md`](PWA_INSTALL.md) |

**Do not put on the landing hub:** per-pin revoke, child disable, QR disable, or any signed network mutation without **Open controls → /created/**. Pins are public bookmarks only.

---

## Immutable vs reference (returning users)

**Immutable** means “cannot miss because it is true *right now*”  -  not “always show five doc links.”

| Tier | What | Where |
|------|------|--------|
| **Glance** | Network live / limited / offline, saved · pinned · notice counts | Status line + brand dot sheet |
| **Inbox** | Action items: live proof, unsaved tab keys, cross-tab keys, card disabled since visit | `#shell-notif-badge`, hub alerts, glance rows - [`DEVICE_INBOX.md`](DEVICE_INBOX.md) |
| **Act** | Hub: root cards, child object shortcuts, pins, search, activity, shortcuts, import | `#device-hub` (expand to work) |
| **Glance (collapsed hub)** | Notice + up to 3 saved labels (+ “N more”) | `#device-hub-glance` (landing only) |
| **System** | Resolver degraded or offline (actionable) | `#device-system-banner` (landing only, hidden when ok) |
| **Reference** | Features map, studio, case study, architecture, data policy | Full **Documentation** disclosure card (intro mode) or **Help & protocol** list (focus mode) |

Documentation is **trust and onboarding**, not **state**. Returning users need what changed on **this device** and **network health**, not architecture every visit.

On `/`, **Design choices**, **Clear limits**, and **Documentation** are collapsed **icon cards** (`.landing-disclosure-card`) below the studio pilot - tap the row to expand; the chevron rotates like hub/settings disclosures.

---

## Landing story

1. **Header**  -  brand dot (network + device + Help link), **inbox badge** when action items exist, + Create  
2. **Status line**  -  segmented counts → tap expands hub  
3. **System banner**  -  only when network ≠ ok  
4. **On this device**  -  hub body when expanded  
5. **Hub glance**  -  compact rows when hub collapsed (landing)  
6. **Main column**  -  intro sections **or** focus-mode footer (see below)

**Removed (intentionally):** homepage pass-card demo; doc row “Create → scan → revoke.”

### Focus mode (`hc_landing_focus`)

Hides `[data-landing-tutorial]` (hero, **How it works**, One use, design choices, dock, help pill).

**Stays visible:**

- Status line (shield + chevron; search on the right), system banner (if any), hub, hub glance, contact  
- **Help & protocol**  -  compact list group (`#landing-docs-footer`); full Documentation hidden  
- Hub **Auto-save** toggle and **Show intro again**  

**Default:** on when wallet or pins exist (`landing-focus.mjs`). Entering focus mode expands the hub once.

**Removed from landing:** bottom Create dock, floating “New here?” pill, “Tap to manage keys” hint.

**Not the desktop:** a scroll of static documentation links. The desktop is **hub-first**; protocol links are secondary.

### Auto-save (`hc_auto_save_device`)

Hub toggle (**on by default** until set to `"0"`): after root-card create, write tab keys to `hc_wallet` without tapping **Save control key**. For returning users on a trusted browser  -  not a substitute for recovery key or encrypted backup. This matters more as one root key controls more child objects. See `docs/CARD_WORKSPACE_PHASE0.md`.

### Global information on the desktop (now vs later)

| Now | Later (careful) |
|-----|------------------|
| Network health in status line + banner | Resolver build / incident feed |
| Saved · pinned · notice counts |  -  |
| **Revoked since last visit** per saved row + hub glance hint |  -  |
| Hub glance when collapsed | Live proof + cross-tab keys rows when collapsed |
| Cross-tab keys banner (keys in another tab) |  -  |
| Recent activity on device |  -  |
| **Live proof waiting** inbox (hub group; prove on `/created/`) |  -  |

Do **not** add per-pin revoke on the homepage  -  pins have no keys; use **Open controls** or **Open card** (⋯ menu) → `/created/`.

---

## Shared device shell

Same chrome on **landing**, **`/created/`**, and **`/wallet/`**:

| Piece | Module | Notes |
|-------|--------|-------|
| Status line + dot + inbox badge | `device-status.mjs` | Dot → hub sheet; badge → inbox sheet (`openInboxFromChrome`). See [`DEVICE_INBOX.md`](DEVICE_INBOX.md) |
| Background alerts (live proof) | `device-browser-notifications.mjs` | Contextual opt-in strip + OS notify when tab hidden; click → `/created/` sign URL |
| Hub body | `device-hub-ui.mjs` | Saved, pins, notice, activity, search, import |
| Hub glance | `device-hub-glance.mjs` | Landing only; visible when hub collapsed |
| PWA install (Add to Home Screen) | `pwa-install.mjs` (lazy) | Returning stewards on shell pages only — [`PWA_INSTALL.md`](PWA_INSTALL.md) |
| Wallet / activity / keys | `device-wallet.mjs`, `device-activity.mjs`, `device-keys.mjs` | |

### `/wallet/` (saved page)

- Same status chrome as landing (shield, search, system banner, expandable hub  -  **expanded by default**).
- Shared `device-hub-ui.mjs`: saved rows with **live network chip** (`scan.kind`-aware: Card disabled / QR revoked / active), **card disabled since last visit** alert, **Last on device** from activity, **Manage** in ⋯ menu.
- Tab save strip, pin add form, auto-save toggle, activity, backup import.
- **How this works** hidden when any card is saved.

### `/created/` differences

- Hub above owner tabs; notice → `#created-keys-strip`; no focus toggle; no glance strip (hub + tabs are enough).

---

## Local activity log

**Storage:** `hc_device_activity`  -  max 40 entries.  
**Types:** `saved`, `use_keys`, `remove_card`, `pin_added`, `backup_import`, `live_control`  
**UI:** Hub group **Recent on this device**.

---

## Network layer (root + child contract)

- Signed root card + child object / QR + resolver status  
- **Status plate**  -  first dogfooded template  
- Scan = public truth  

See `docs/DEVICE_HUB_AND_LOCAL_SEARCH.md` for storage and search.

---

## Refresh coordinator (Phase 1 hardening)

Resolver health for the status dot is fetched in **`site/js/device-status.mjs`** (`fetchResolverHealth`). Wallet status polls and live-proof inbox refresh run from **`site/js/device-hub-ui.mjs`** when the hub is mounted. **`site/js/device-os-coordinator.mjs`** (300ms debounce) remains for tests and optional use but is not auto-started from the status bootstrap (see `docs/UI_UX_REVERT_PLAN.md` step 2).

| Event | Role |
|-------|------|
| `hc-device-os-refreshed` | Health + inbox cycle finished; status chrome updates |
| `hc-wallet-network-refreshed` | Saved-row chips / alerts after wallet poll (`device-wallet-network.mjs`) |

Manual regression: [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) (especially **P1-1** - no duplicate fetches on tab focus).

**Glance:** Landing uses `#device-hub-glance-popover` only. `/wallet/` scrolls to saved cards from the status dot; there is no separate wallet glance popover in HTML.

---

## Implementation checklist

| Step | Item | Status |
|------|------|--------|
| 1 | Doc  -  returning desktop + immutable vs reference | ✅ |
| 2 | Focus mode: hide full Documentation; show Help & protocol footer | ✅ |
| 3 | Brand dot sheet: **Help & protocol** row (landing) | ✅ |
| 4 | `#device-hub-glance` when hub collapsed | ✅ |
| 5 | `#device-system-banner` when network degraded/offline | ✅ |
| 6 | Auto-save toggle (`hc_auto_save_device`) | ✅ |
| 7 | Landing cleanup: no dock, no help float, no status hint | ✅ |
| 8 | Wallet shell parity + `device-wallet-network.mjs` status chips | ✅ |
| 9 | **Revoked since last visit** (`hc_wallet_last_seen_network`) | ✅ |
| 10 | Live-control inbox (`device-live-control-inbox.mjs`) | ✅ |
| 11 | Cross-tab keys banner (`device-tab-presence.mjs`) | ✅ |
| 12 | PWA install spec + contracts (`pwa-install-*-core.mjs`) | ✅ spec · Phases 1–3 pending — [`PWA_INSTALL.md`](PWA_INSTALL.md) |
| 13 | Deferred: resolver-wide search / directory |  -  |
|  -  | Deferred: per-card revoke on landing hub |  -  (use Manage) |

### Device inbox & chrome notifications

Full spec: [`DEVICE_INBOX.md`](DEVICE_INBOX.md).

| Piece | Shipped |
|-------|---------|
| Inbox badge (`#shell-notif-badge`) | Count, chroma, tap → inbox sheet |
| Hub / glance rows | `buildInboxItems()` + `buildGlanceRowPlan()`; hub groups via `device-hub-inbox-alerts.mjs` |
| Browser background alerts | v2 A–D: contextual opt-in, sign deep link, OS policy, live-proof service worker |
| Status dot | Overlays for proof / cross-tab; `open_notifications` action (no numeric count on dot) |

**Do not (free tier):** server push, OS alerts for resolver health, or permission prompt on first visit. **Hosted paid tier** may add optional server-mediated live-proof notify per [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md) — not shipped.

### Optional hub polish

Small TLC items that need **no new resolver APIs**:

| Item | Notes |
|------|--------|
| Browser notifications when live proof is waiting | ✅ v2 A–C - [`DEVICE_INBOX.md`](DEVICE_INBOX.md) |
| Unified device inbox + glance plan | ✅ phases 1–13 - [`DEVICE_INBOX.md`](DEVICE_INBOX.md) |
| Hub saved card row UX | ✅ phases 1–3 - [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md) |
| Glance on `/wallet/` | Landing popover only; wallet uses scroll-to-saved chrome |
| Light frontend tests | ✅ `npm run worker:test:device` + device shell E2E in CI |

### Owner key portability (shipped  -  see M5.5)

Revoke and manage from a **new device** without a duplicate root card is **in repo** (`docs/M5_5_OWNER_KEY_PORTABILITY.md`). In the child-object model, importing the root backup restores control over the child tree too:

- Encrypted backup export/import (`.hcbackup`, PBKDF2 + AES-GCM) on `/created/` and hub **Import backup**
- Recovery key at create + recovery-signed revoke on the Worker
- Remaining gaps: production deploy checks, second-device manual QA

Merch and stranger tests do **not** block on further M5.5 work unless QA finds a gap.

### Cross-tab keys (Phase 8)

**Presence:** `localStorage` `hc_tab_keys_presence`  -  each tab heartbeats every 5s **while that tab is visible** with `profile_id` / handle / label only (never private keys). Unchanged metadata skips redundant writes between keep-alive ticks. Rows age out of the UI after ~7s without a heartbeat and are pruned from storage after 10s. Cleared on `pagehide` (tab close/navigation away). Background tabs do not heartbeat but leave a recent row until stale.

**Count semantics (inbox badge / banner):** The shell badge number is the **total actionable inbox count** (live proof + cross-tab + unsaved-this-tab + card-disabled), not “number of create tabs.” For cross-tab only: the count is **other open tabs with keys that heartbeated while visible in the last ~7s** - not a historical total of tabs you opened or closed. Six create tabs in the background typically contribute **0–1** to cross-tab until you focus each tab; closing a tab removes it from presence immediately. See [`DEVICE_INBOX.md`](DEVICE_INBOX.md) counting rule 5.

**Banner:** `#device-cross-tab-banner` on landing and `/wallet/` when another tab holds keys **this device has not saved yet**, and this tab does not show the unsaved-keys notice row (`tabNoticeCount === 0`). Saved cards use **Open controls** from the hub/wallet instead. Presence rows must heartbeat within ~7s (ghost entries drop from UI sooner than the 10s storage prune).

**Removed from device:** Profiles in `localStorage` `hc_wallet_removed_profile_ids` (set on hub/wallet remove) do not use generic cross-tab copy. If another tab still heartbeats those keys, inbox shows **`orphan_keys_removed`** (“Keys still open in another tab · for a card you removed from this device”) with **Open that tab** and **Clear keys on this device** (broadcast to all tabs). Re-saving to `hc_wallet` clears the denylist. See [`CROSS_TAB_KEYS_FLASH_AFTER_CARD_DELETE_INVESTIGATION.md`](CROSS_TAB_KEYS_FLASH_AFTER_CARD_DELETE_INVESTIGATION.md).

**Canonical cross-tab notification spec + rebuild:** [`CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md`](CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md) · [`CROSS_TAB_KEYS_REBUILD_PLAN.md`](CROSS_TAB_KEYS_REBUILD_PLAN.md).

**Glance:** Collapsed hub shows inbox actionable rows (live proof, cross-tab, tab keys, card-disabled-since-visit) plus saved-card peek via `buildGlanceRowPlan()` - see [`DEVICE_INBOX.md`](DEVICE_INBOX.md).

### Live-control inbox (Phase 7)

**Scope:** Device hub only on **landing** and **`/wallet/`**  -  not duplicated on `/created/` (that page keeps the existing **Prove live control** panel for the open card).

**Product stance:** The device OS is **not** wallet monitoring SaaS. Resolver truth appears when users **look** (expand hub, tap refresh, sign on `/created/`). Automatic multi-card live-proof polling is **opt-in**, **scoped**, **leader-tab only**, and capped at **400 auto GETs per UTC day per device** (manual **Check for live proof** always works). Large wallets (≥10 saved) narrow auto live-proof to the active card + pending challenges and show hub guidance. See **[`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md)**.

**Poll (Phases 1–5 shipped):** `GET …/live-control/challenges` runs only when **Watch for live proof** is on (`hc_watch_live_proof === "1"`, **default off**) and scope is active: hub sheet **expanded** or **inbox sheet** open (not bare `/wallet/` with hub collapsed). Resolver health must be **`ok`**; **one card per tick** (round-robin); **60s** idle / **5s** when proof is waiting. **Check for live proof** on the hub runs one round-robin check when watch is off. Wallet status chips refresh on hub expand or `/wallet/` (not collapsed landing; **≥60s** debounce on `visibilitychange`). Modules: `device-live-control-poll-scheduler.mjs`, `device-live-control-inbox.mjs`, `device-hub-network-tools.mjs`.

**Hub network tools (Phase 5):** **Check network** (burst, up to N status GETs), **Check for live proof** (one round-robin GET), last-checked status line, **Watch for live proof** checkbox. Two different cost shapes — document together in UI copy but estimate separately in ops.

**UI:**

- Hub group **Live proof waiting**  -  one row per pending challenge (card label, “Someone is waiting”).
- Status line adds **`N proof waiting`** (highlighted) when N &gt; 0.
- Row tap → **Open controls** for that card → `/created/?profile_id&qr_id&live_challenge&return_url` (from resolver `owner_url`).

**Not in inbox:** Pins (no keys), saved rows without `qr_id`, signing (stays on `/created/`).

### Card disabled since last visit (Phase 6)

**Storage:** `localStorage` key `hc_wallet_last_seen_network`  -  map of `profile_id` → last recorded **alert baseline** (`active` or `card_revoked`). Legacy `revoked` values are treated as acknowledged `card_revoked`.

**When:** On fetch, if last seen ≠ `card_revoked` and resolver now reports **`scan.kind === card_revoked`**, show alert on the saved row and highlight in hub glance. Banner copy: **Card disabled on the network since your last visit.** Chip label: **Card disabled**. QR-only revoke (`qr_revoked`) updates the chip to **QR revoked** but does not trigger this alert.

**Cache:** Session cache (~5 min, `sessionStorage.hc_wallet_network_cache`, includes `scanKind`) is bypassed when it says `card_revoked` but the device baseline still says non-revoked - the hub re-fetches from the resolver before showing the alert. A fresh non-revoked fetch always updates the baseline (self-heal).

**Clear:** **Got it**, **Open controls**, or **Manage** records the current alert baseline (`active` or `card_revoked`) as seen and dispatches `hc-wallet-network-baseline-changed` so hub rows and glance re-apply from the **latest resolver-confirmed** poll (not session cache alone). Leaving the page (`pagehide` / tab hidden) snapshots resolver-confirmed alert states from this visit when a poll has completed. Returning to the tab re-fetches network status for saved rows so stale alerts can clear.

---

## Files

| Path | Role |
|------|------|
| `docs/DEVICE_OS.md` | This document |
| `docs/DEVICE_INBOX.md` | Inbox taxonomy, badge, background alerts roadmap |
| `docs/DEVICE_HUB_AND_LOCAL_SEARCH.md` | Storage, search, focus mode |
| `site/js/device-browser-notifications.mjs` | OS notifications v1 + settings toggle |
| `site/js/device-inbox-core.mjs` | Pure inbox model (badge count, overlay inputs, ARIA) |
| `site/js/device-inbox.mjs` | Browser facade for inbox items |
| `docs/DEVICE_OS_QA.md` | Manual QA runbook + bug triage |
| `site/js/device-os-coordinator.mjs` | Debounced device OS refresh pipeline |
| `site/js/device-network-health.mjs` | Shared resolver `/.well-known/hc/v1/health` fetch |
| `site/js/device-tab-presence.mjs` | Cross-tab signing-key heartbeat |
| `site/js/device-cross-tab-banner.mjs` | Cross-tab keys banner copy |
| `site/js/device-live-control-inbox.mjs` | Poll pending challenges for saved root cards / supported child QR scopes |
| `site/js/device-wallet-network.mjs` | Resolver status cache for saved rows |
| `site/js/wallet-page.mjs` | Wallet page init |
| `site/js/device-hub-glance.mjs` | Collapsed-hub summary (landing) |
| `site/wallet/index.html` | **My cards** device shell (`/wallet/`) - target copy should evolve toward root keys + objects |
| `site/js/device-status.mjs` | Status, banner, popover Help row |
| `site/css/device-shell.css` | Shell materials, motion, system status chrome |
| `docs/VISUAL_DEVICE_SHELL.md` | Visual / interaction philosophy + OSification roadmap |
| `site/js/device-hub-ui.mjs` | Shared hub |
| `site/js/landing-focus.mjs` | Focus mode toggle |
| `site/index.html` | Glance + banner + docs split |
