# Device OS — browser shell + physical network

**Status:** Phase 1–3 shipped (docs + shared hub on `/created/` + activity log)  
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
| Save, search, relabel, import backup, activity log | **Device hub** (`#device-hub`) |
| Manifesto, revoke, QR, backup export | **Network object** + `/created/` Manage tab |
| What a stranger sees | **Scan page only** — never a second homepage demo |

---

## Landing story (current)

1. **Header** — brand dot (network + device spec sheet) + Create  
2. **Status line** — `Network live · N saved · N pinned · N notice` → tap expands hub  
3. **On this device** — search, activity, saved cards, pins, shortcuts, backup import  
4. **Main column** — hero, four-step progress (Create → Save → Print → Manage), framing, **One use · status plate**, design choices, documentation  

**Removed (intentionally):** homepage pass-card demo (“What someone sees when they scan”) — redundant with real scan pages and case study.  
**Removed:** Documentation row “Create → scan → revoke” — case study and features hub cover the loop.

**Returning users:** focus mode (`hc_landing_focus`) hides intro sections; hub + documentation + contact stay.

---

## Shared device shell (shipped)

Same chrome on **landing**, **`/created/`**, and **`/wallet/`**:

| Piece | Module | Notes |
|-------|--------|-------|
| Status line + dot sheet | `device-status.mjs` | Expandable hub on landing + created; wallet scrolls to hub |
| Hub body | `device-hub-ui.mjs` | Saved rows, pins, notice, activity, search |
| Wallet save helpers | `device-wallet.mjs` | `hc_wallet` |
| Tab keys | `sessionStorage` `hc_created` | This tab only |
| Activity log | `device-activity.mjs` | `hc_device_activity`, max 40 entries |

### `/created/` differences

- Hub sits **above** owner tabs (not below hero).  
- Status line is **expandable** (not static).  
- Default **expanded** when this tab holds signing keys (first paint).  
- Notice row links to **`#created-keys-strip`** instead of another `/created/` URL.  
- Shortcuts: **Manage this card**, All saved cards, Homepage — no landing focus toggle.

---

## Local activity log (Phase 3)

**Storage:** `localStorage` key `hc_device_activity` — array of `{ id, type, label, at }`.

**Types:** `saved`, `use_keys`, `remove_card`, `pin_added`, `backup_import`, `live_control`

**UI:** Hub group **Recent on this device** — newest first; not filtered away when search is empty (group always visible if entries exist).

**Not logged:** resolver scans, failed imports, relabel-only edits (low signal).

---

## Network layer (unchanged contract)

- One primitive: signed card + QR credential + resolver status  
- **Status plate** = first dogfooded template (`/create/?template=status_plate`)  
- Scan = public truth; device hub never replaces scan UI  
- Studio blog (`/studio/`) documents building the site in public  

See `docs/DEVICE_HUB_AND_LOCAL_SEARCH.md` for storage tables and search phases.

---

## Implementation checklist

Use this order when extending the device OS:

- [x] **Doc** — this file + update `DEVICE_HUB_AND_LOCAL_SEARCH.md`  
- [x] **Extract** — `device-hub-ui.mjs` shared by landing and created  
- [x] **Created shell** — full hub HTML + expandable status + `device-hub-ui` init  
- [x] **Activity** — `device-activity.mjs` + hub group + hooks on save/use/remove/import/pin  
- [x] **Auto-expand** — `/created/` opens hub when tab has keys  
- [ ] **Deferred** — live-control inbox queue UI (activity type only for now)  
- [ ] **Deferred** — cross-tab “keys waiting in another tab” banner beyond notice row  
- [ ] **Deferred** — resolver-wide search / directory  

---

## Files

| Path | Role |
|------|------|
| `docs/DEVICE_OS.md` | This document |
| `docs/DEVICE_HUB_AND_LOCAL_SEARCH.md` | Storage, search, pins — companion |
| `site/js/device-hub-ui.mjs` | Shared hub render + init |
| `site/js/device-activity.mjs` | Activity log API |
| `site/js/device-status.mjs` | Status line, hub expand |
| `site/js/landing-device-hub.mjs` | Landing init wrapper |
| `site/js/created-hub.mjs` | Created page init wrapper |
| `site/index.html` | Landing hub + activity group |
| `site/created/index.html` | Created hub + activity group |
