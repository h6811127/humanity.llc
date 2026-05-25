# Device hub and local search

**Status:** Phase 1–4 shipped · shared hub · activity log · returning-user desktop  
**Scope:** Browser-local personalization only  -  not resolver-wide discovery  
**Companion:** [`DEVICE_OS.md`](DEVICE_OS.md)  -  two-layer model, placement rule, landing story

---

## Product intent

The landing page, **`/created/`**, and **`/wallet/`** share an **“on this device”** hub: saved cards with signing keys, **pinned public scan links**, **recent activity**, and shortcuts. This mirrors a Settings-style surface (grouped inset lists) without accounts, sync, or operator storage of private keys.

**Not in scope:** searching the Humanity resolver, other people’s cards, or any server index.

---

## Personalization route (decision)

We kept the landing funnel (hero → device hub → long-form content) and **enriched** it rather than replacing it with a full dashboard.

**Landing story (shipped):** Hero one-liner, a **four-step progress strip** (Create → Save → Print → Manage), **On this device** below the status line (inline search  -  no floating FAB), and a **New here?** help drawer. Homepage pass-card demo removed; strangers see real scan pages and the case study.

**Status line (shipped):** Segmented grey text (`Network live · 2 saved · 0 pinned · 1 notice`). Hub open state in `sessionStorage`; first unsaved-tab notice auto-expands hub once. On **`/created/`**, hub auto-opens when this tab has signing keys and hub state was never set.

**`/created/` hub (shipped):** Same groups as landing except: notice links to **`#created-keys-strip`**; shortcuts are **Manage this card**, **All saved cards**, **Homepage** (no focus toggle).

**Hub rows (shipped):** Saved cards  -  **Use keys**, **Open scan**, **⋯** (Relabel, Remove). **Import backup file** decrypts `.hcbackup.json` into `hc_wallet`.

**Landing focus mode:** `localStorage.hc_landing_focus` hides intro (`[data-landing-tutorial]`). Keeps **hub**, **hub glance**, **system banner** (if unhealthy), **Help & protocol** list (not full Documentation), and **contact**. No bottom Create dock or “New here?” float. **Auto-save** optional via `hc_auto_save_device` in hub shortcuts.

**Hub glance (landing):** When the hub is collapsed, `#device-hub-glance` shows notice (if any) and up to three saved card labels; tap expands the hub.

**`/wallet/` (Phase 5–6):** Uses the same hub renderer as landing. Each saved row shows a **network chip** (resolver status, ~5 min cache), optional **Revoked since last visit** alert (`hc_wallet_last_seen_network`), **Last on device** from activity, and **Use keys / Open scan / Manage**. Page is hub-expanded by default; help disclosure hides when cards exist.

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
- **`device-cross-tab-banner.mjs`** on landing and `/wallet/` when keys live in another tab.
- Hub glance rows for cross-tab keys and live proof when collapsed.

### Optional hub polish (deferred)

No backend required:

- Browser notifications when a live proof is waiting (device-only).
- Hub glance on `/wallet/` (landing-only today).
- Light frontend tests for tab presence and live-control inbox polling.

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
- Pins are bookmarks only; vouching needs saved keys (**Use keys**).

---

## Files

| Path | Role |
|------|------|
| `docs/DEVICE_OS.md` | Device OS vision + checklist |
| `site/index.html` | Landing hub + progress strip |
| `site/created/index.html` | Created hub shell |
| `site/js/device-hub-ui.mjs` | Shared hub render + init |
| `site/js/device-activity.mjs` | Activity log API |
| `site/js/device-live-control-inbox.mjs` | Live proof inbox poll + open |
| `site/js/device-hub-glance.mjs` | Collapsed-hub summary (landing) |
| `site/js/landing-device-hub.mjs` | Landing init wrapper |
| `site/js/created-hub.mjs` | Created init wrapper |
| `site/js/landing-focus.mjs` | Focus mode + intro toggle |
| `site/js/device-status.mjs` | Status line, dot sheet, hub expand |
| `site/js/device-hub-search.mjs` | Shared filter |
| `site/js/device-hub-import.mjs` | Hub backup import |
| `site/wallet/index.html` | Saved cards device shell |
| `site/js/wallet-hub.mjs` | Wallet hub + tab save + pins |
| `site/js/device-wallet-network.mjs` | Network status chips |
