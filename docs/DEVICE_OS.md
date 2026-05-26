# Device OS  -  browser shell + physical network

**Status:** Phase 8 shipped (device hub) · Phase 1 refresh coordinator shipped · **Active vertical:** merch Tier 0 shop (`/shop/`)  
**Audience:** Product, frontend, and anyone extending Pages without accounts

---

## What we mean by “device OS”

Two layers that must stay separate but feel like one product:

| Layer | Where it lives | Job |
|-------|----------------|-----|
| **Device (browser shell)** | `localStorage` / `sessionStorage`, hub UI | Custody and control: where are my keys, what can I do next, what happened here |
| **Network (physical software)** | Cloudflare Worker + D1, scan pages | Public truth: signed cards, live manifesto, revoke, vouch, live control |

This is **not** a crypto wallet app and **not** a social network. It is **Settings + launcher** for keys you already created, on top of a **minimal public resolver**.

---

## Placement rule (every new feature)

Before shipping UI, answer:

| Question | Put it here |
|----------|-------------|
| Save, search, relabel, import backup, activity log, collapsed glance | **Device hub** (`#device-hub`) + glance strip |
| Live proof **inbox** (pending challenges for saved cards) | **Device hub**  -  tap opens `/created/` to sign |
| Actionable **device inbox** (badge, alerts, glance) | **Chrome** + hub `#device-hub-alerts-top` — see [`DEVICE_INBOX.md`](DEVICE_INBOX.md) |
| **Background alerts** (OS notifications, opt-in) | Device-only; live proof when tab hidden — see [`DEVICE_INBOX.md`](DEVICE_INBOX.md) |
| Manifesto, revoke, QR, backup export | **Network object** + `/created/` **Advanced** tab |
| Live proof **signing** | **`/created/`** only (existing proof panel + poll) |
| What a stranger sees | **Scan page only**  -  never a second homepage demo |
| Protocol essays, threat models, case study walkthrough | **Reference** (full docs in intro mode; Help & protocol footer in focus mode) |

**Do not put on the landing hub:** per-pin revoke, disable QR, or any signed network mutation without **Open controls → /created/**. Pins are public bookmarks only.

---

## Immutable vs reference (returning users)

**Immutable** means “cannot miss because it is true *right now*”  -  not “always show five doc links.”

| Tier | What | Where |
|------|------|--------|
| **Glance** | Network live / limited / offline, saved · pinned · notice counts | Status line + brand dot sheet |
| **Inbox** | Action items: live proof, unsaved tab keys, cross-tab keys (+ planned: card disabled since visit in badge) | `#shell-notif-badge`, hub alerts, glance rows — [`DEVICE_INBOX.md`](DEVICE_INBOX.md) |
| **Act** | Hub: cards, pins, search, activity, shortcuts, import | `#device-hub` (expand to work) |
| **Glance (collapsed hub)** | Notice + up to 3 saved labels (+ “N more”) | `#device-hub-glance` (landing only) |
| **System** | Resolver degraded or offline (actionable) | `#device-system-banner` (landing only, hidden when ok) |
| **Reference** | Features map, studio, case study, architecture, data policy | Full **Documentation** section (intro mode) or **Help & protocol** `<details>` (focus mode) |

Documentation is **trust and onboarding**, not **state**. Returning users need what changed on **this device** and **network health**, not architecture every visit.

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

Hides `[data-landing-tutorial]` (hero, progress, One use, design choices, dock, help pill).

**Stays visible:**

- Status line (shield + chevron; search on the right), system banner (if any), hub, hub glance, contact  
- **Help & protocol**  -  compact list group (`#landing-docs-footer`); full Documentation hidden  
- Hub **Auto-save** toggle and **Show intro again**  

**Default:** on when wallet or pins exist (`landing-focus.mjs`). Entering focus mode expands the hub once.

**Removed from landing:** bottom Create dock, floating “New here?” pill, “Tap to manage keys” hint.

**Not the desktop:** a scroll of static documentation links. The desktop is **hub-first**; protocol links are secondary.

### Auto-save (`hc_auto_save_device`)

Hub toggle (**on by default** until set to `"0"`): after create, write tab keys to `hc_wallet` without tapping **Save control key**. For returning users on a trusted browser  -  not a substitute for recovery key or encrypted backup. See `docs/CARD_WORKSPACE_PHASE0.md`.

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
| Status line + dot + inbox badge | `device-status.mjs` | Dot → hub; badge → alerts (planned: inbox sheet). See [`DEVICE_INBOX.md`](DEVICE_INBOX.md) |
| Background alerts (live proof) | `device-browser-notifications.mjs` | Opt-in `hc_browser_notif`; OS notify when tab hidden |
| Hub body | `device-hub-ui.mjs` | Saved, pins, notice, activity, search, import |
| Hub glance | `device-hub-glance.mjs` | Landing only; visible when hub collapsed |
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

## Network layer (unchanged contract)

- Signed card + QR + resolver status  
- **Status plate**  -  first dogfooded template  
- Scan = public truth  

See `docs/DEVICE_HUB_AND_LOCAL_SEARCH.md` for storage and search.

---

## Refresh coordinator (Phase 1 hardening)

Resolver health, wallet status polls, tab presence sync, and live-proof inbox refresh are batched in **`site/js/device-os-coordinator.mjs`** (300ms debounce). Pages with device chrome import it via `device-status.mjs`.

| Event | Role |
|-------|------|
| `hc-device-os-refreshed` | Health + inbox cycle finished; status chrome updates |
| `hc-wallet-network-refreshed` | Saved-row chips / alerts after wallet poll (`device-wallet-network.mjs`) |

Manual regression: [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) (especially **P1-1** — no duplicate fetches on tab focus).

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
| 12 | Deferred: resolver-wide search / directory |  -  |
|  -  | Deferred: per-card revoke on landing hub |  -  (use Manage) |

### Device inbox & chrome notifications

Full spec: [`DEVICE_INBOX.md`](DEVICE_INBOX.md).

| Piece | Shipped | Planned |
|-------|---------|---------|
| Inbox badge (`#shell-notif-badge`) | Aggregate count; tap → hub alerts scroll | Inbox sheet; rich ARIA; chroma sync with dot overlay |
| Hub / glance rows | Live proof, cross-tab, tab keys, card-disabled in glance | Single `buildInboxItems()` source |
| Browser background alerts | Live proof only; toggle on landing settings | Contextual opt-in; deep link to `/created/` sign URL |
| Status dot | Overlays for proof / cross-tab; `open_notifications` action | — (dot stays non-numeric) |

**Do not:** server push, OS alerts for resolver health, or permission prompt on first visit.

### Optional hub polish

Small TLC items that need **no new resolver APIs**:

| Item | Notes |
|------|--------|
| Browser notifications when live proof is waiting | ✅ Shipped v1 — see [`DEVICE_INBOX.md`](DEVICE_INBOX.md) for v2 roadmap |
| Unified device inbox core + inbox sheet | Planned — [`DEVICE_INBOX.md`](DEVICE_INBOX.md) phases 1–3 |
| Glance on `/wallet/` | Landing popover only; wallet uses scroll-to-saved chrome |
| Light frontend tests | Vitest (`worker/tests/device-*`) + Playwright smoke (`e2e/device-os-wallet.spec.ts`) |

### Owner key portability (shipped  -  see M5.5)

Revoke and manage from a **new device** without a duplicate card is **in repo** (`docs/M5_5_OWNER_KEY_PORTABILITY.md`):

- Encrypted backup export/import (`.hcbackup`, PBKDF2 + AES-GCM) on `/created/` and hub **Import backup**
- Recovery key at create + recovery-signed revoke on the Worker
- Remaining gaps: production deploy checks, second-device manual QA

Merch and stranger tests do **not** block on further M5.5 work unless QA finds a gap.

### Cross-tab keys (Phase 8)

**Presence:** `localStorage` `hc_tab_keys_presence`  -  each tab heartbeats every 4s **while that tab is visible** with `profile_id` / handle / label only (never private keys). Rows age out of the UI after ~6s without a heartbeat and are pruned from storage after 10s. Cleared on `pagehide` (tab close/navigation away). Background tabs do not heartbeat but leave a recent row until stale.

**Banner:** `#device-cross-tab-banner` on landing and `/wallet/` when another tab holds keys **this device has not saved yet**, and this tab does not show the unsaved-keys notice row (`tabNoticeCount === 0`). Saved cards use **Open controls** from the hub/wallet instead. Presence rows must heartbeat within ~6s (ghost entries drop from UI sooner than the 10s storage prune).

**Glance:** Collapsed hub shows **Keys in another tab** and **N live proof waiting** rows (same items as inbox badge when counts &gt; 0; unification planned in [`DEVICE_INBOX.md`](DEVICE_INBOX.md)).

### Live-control inbox (Phase 7)

**Scope:** Device hub only on **landing** and **`/wallet/`**  -  not duplicated on `/created/` (that page keeps the existing **Prove live control** panel for the open card).

**Poll:** Every 5s while the tab is visible, `GET /.well-known/hc/v1/cards/{profile_id}/live-control/challenges?qr_id=…` for each **saved** wallet row that has a `qr_id`.

**UI:**

- Hub group **Live proof waiting**  -  one row per pending challenge (card label, “Someone is waiting”).
- Status line adds **`N proof waiting`** (highlighted) when N &gt; 0.
- Row tap → **Open controls** for that card → `/created/?profile_id&qr_id&live_challenge&return_url` (from resolver `owner_url`).

**Not in inbox:** Pins (no keys), saved rows without `qr_id`, signing (stays on `/created/`).

### Card disabled since last visit (Phase 6)

**Storage:** `localStorage` key `hc_wallet_last_seen_network`  -  map of `profile_id` → last recorded **alert baseline** (`active` or `card_revoked`). Legacy `revoked` values are treated as acknowledged `card_revoked`.

**When:** On fetch, if last seen ≠ `card_revoked` and resolver now reports **`scan.kind === card_revoked`**, show alert on the saved row and highlight in hub glance. Banner copy: **Card disabled on the network since your last visit.** Chip label: **Card disabled**. QR-only revoke (`qr_revoked`) updates the chip to **QR revoked** but does not trigger this alert.

**Cache:** Session cache (~5 min, `sessionStorage.hc_wallet_network_cache`, includes `scanKind`) is bypassed when it says `card_revoked` but the device baseline still says non-revoked — the hub re-fetches from the resolver before showing the alert. A fresh non-revoked fetch always updates the baseline (self-heal).

**Clear:** **Got it**, **Open controls**, or **Manage** records the current alert baseline (`active` or `card_revoked`) as seen and dispatches `hc-wallet-network-baseline-changed` so hub rows and glance re-apply without a full re-render. Leaving the page (`pagehide` / tab hidden) snapshots all cached alert states for the next visit. Returning to the tab re-fetches network status for saved rows so stale alerts can clear.

---

## Files

| Path | Role |
|------|------|
| `docs/DEVICE_OS.md` | This document |
| `docs/DEVICE_INBOX.md` | Inbox taxonomy, badge, background alerts roadmap |
| `docs/DEVICE_HUB_AND_LOCAL_SEARCH.md` | Storage, search, focus mode |
| `site/js/device-browser-notifications.mjs` | OS notifications v1 + settings toggle |
| `docs/DEVICE_OS_QA.md` | Manual QA runbook + bug triage |
| `site/js/device-os-coordinator.mjs` | Debounced device OS refresh pipeline |
| `site/js/device-network-health.mjs` | Shared resolver `/.well-known/hc/v1/health` fetch |
| `site/js/device-tab-presence.mjs` | Cross-tab signing-key heartbeat |
| `site/js/device-cross-tab-banner.mjs` | Cross-tab keys banner copy |
| `site/js/device-live-control-inbox.mjs` | Poll pending challenges for saved cards |
| `site/js/device-wallet-network.mjs` | Resolver status cache for saved rows |
| `site/js/wallet-page.mjs` | Wallet page init |
| `site/js/device-hub-glance.mjs` | Collapsed-hub summary (landing) |
| `site/wallet/index.html` | **My cards** device shell (`/wallet/`) |
| `site/js/device-status.mjs` | Status, banner, popover Help row |
| `site/css/device-shell.css` | Shell materials, motion, system status chrome |
| `docs/VISUAL_DEVICE_SHELL.md` | Visual / interaction philosophy + OSification roadmap |
| `site/js/device-hub-ui.mjs` | Shared hub |
| `site/js/landing-focus.mjs` | Focus mode toggle |
| `site/index.html` | Glance + banner + docs split |
