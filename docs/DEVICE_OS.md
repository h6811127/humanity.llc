# Device OS — browser shell + physical network

**Status:** Phase 4 shipped (returning-user desktop on landing)  
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
| Manifesto, revoke, QR, backup export | **Network object** + `/created/` Manage tab |
| What a stranger sees | **Scan page only** — never a second homepage demo |
| Protocol essays, threat models, case study walkthrough | **Reference** (full docs in intro mode; Help & protocol footer in focus mode) |

**Do not put on the landing hub:** per-pin revoke, disable QR, or any signed network mutation without **Use keys → /created/**. Pins are public bookmarks only.

---

## Immutable vs reference (returning users)

**Immutable** means “cannot miss because it is true *right now*” — not “always show five doc links.”

| Tier | What | Where |
|------|------|--------|
| **Glance** | Network live / limited / offline, saved · pinned · notice counts | Status line + brand dot sheet |
| **Act** | Hub: cards, pins, search, activity, shortcuts, import | `#device-hub` (expand to work) |
| **Glance (collapsed hub)** | Notice + up to 3 saved labels (+ “N more”) | `#device-hub-glance` (landing only) |
| **System** | Resolver degraded or offline (actionable) | `#device-system-banner` (landing only, hidden when ok) |
| **Reference** | Features map, studio, case study, architecture, data policy | Full **Documentation** section (intro mode) or **Help & protocol** `<details>` (focus mode) |

Documentation is **trust and onboarding**, not **state**. Returning users need what changed on **this device** and **network health**, not architecture every visit.

---

## Landing story

1. **Header** — brand dot (network + device + Help link) + Create  
2. **Status line** — segmented counts → tap expands hub  
3. **System banner** — only when network ≠ ok  
4. **On this device** — hub body when expanded  
5. **Hub glance** — compact rows when hub collapsed (landing)  
6. **Main column** — intro sections **or** focus-mode footer (see below)

**Removed (intentionally):** homepage pass-card demo; doc row “Create → scan → revoke.”

### Focus mode (`hc_landing_focus`)

Hides `[data-landing-tutorial]` (hero, progress, One use, design choices, dock, help pill).

**Stays visible:**

- Status line (shield + chevron; search on the right), system banner (if any), hub, hub glance, contact  
- **Help & protocol** — compact list group (`#landing-docs-footer`); full Documentation hidden  
- Hub **Auto-save** toggle and **Show intro again**  

**Default:** on when wallet or pins exist (`landing-focus.mjs`). Entering focus mode expands the hub once.

**Removed from landing:** bottom Create dock, floating “New here?” pill, “Tap to manage keys” hint.

**Not the desktop:** a scroll of static documentation links. The desktop is **hub-first**; protocol links are secondary.

### Auto-save (`hc_auto_save_device`)

Optional hub toggle (off by default): after create, write tab keys to `hc_wallet` without tapping **Save on this device**. For returning users on a trusted browser — not a substitute for recovery key or encrypted backup.

### Global information on the desktop (now vs later)

| Now | Later (careful) |
|-----|------------------|
| Network health in status line + banner | Resolver build / incident feed |
| Saved · pinned · notice counts | “Card revoked since last visit” per saved row |
| Hub glance when collapsed | Cross-tab “keys in another tab” banner |
| Recent activity on device | Live-control inbox (signed actions only on `/created/`) |

Do **not** add per-pin revoke on the homepage — pins have no keys; use **Use keys → Manage**.

---

## Shared device shell

Same chrome on **landing**, **`/created/`**, and **`/wallet/`**:

| Piece | Module | Notes |
|-------|--------|-------|
| Status line + dot sheet | `device-status.mjs` | Hub expand; system banner + Help row on landing |
| Hub body | `device-hub-ui.mjs` | Saved, pins, notice, activity, search, import |
| Hub glance | `device-hub-glance.mjs` | Landing only; visible when hub collapsed |
| Wallet / activity / keys | `device-wallet.mjs`, `device-activity.mjs`, `device-keys.mjs` | |

### `/created/` differences

- Hub above owner tabs; notice → `#created-keys-strip`; no focus toggle; no glance strip (hub + tabs are enough).

---

## Local activity log

**Storage:** `hc_device_activity` — max 40 entries.  
**Types:** `saved`, `use_keys`, `remove_card`, `pin_added`, `backup_import`, `live_control`  
**UI:** Hub group **Recent on this device**.

---

## Network layer (unchanged contract)

- Signed card + QR + resolver status  
- **Status plate** — first dogfooded template  
- Scan = public truth  

See `docs/DEVICE_HUB_AND_LOCAL_SEARCH.md` for storage and search.

---

## Implementation checklist

| Step | Item | Status |
|------|------|--------|
| 1 | Doc — returning desktop + immutable vs reference | ✅ |
| 2 | Focus mode: hide full Documentation; show Help & protocol footer | ✅ |
| 3 | Brand dot sheet: **Help & protocol** row (landing) | ✅ |
| 4 | `#device-hub-glance` when hub collapsed | ✅ |
| 5 | `#device-system-banner` when network degraded/offline | ✅ |
| 6 | Auto-save toggle (`hc_auto_save_device`) | ✅ |
| 7 | Landing cleanup: no dock, no help float, no status hint | ✅ |
| 8 | Deferred: live-control inbox queue | — |
| 7 | Deferred: cross-tab keys banner beyond notice row | — |
| 8 | Deferred: resolver-wide search / directory | — |
| 9 | Deferred: per-card revoke chips on landing hub | — (use Manage) |

---

## Files

| Path | Role |
|------|------|
| `docs/DEVICE_OS.md` | This document |
| `docs/DEVICE_HUB_AND_LOCAL_SEARCH.md` | Storage, search, focus mode |
| `site/js/device-hub-glance.mjs` | Collapsed-hub summary (landing) |
| `site/js/device-status.mjs` | Status, banner, popover Help row |
| `site/js/device-hub-ui.mjs` | Shared hub |
| `site/js/landing-focus.mjs` | Focus mode toggle |
| `site/index.html` | Glance + banner + docs split |
