# Device hub and local search

**Status:** Phase 1–2 shipped (UI + wallet + landing)  
**Scope:** Browser-local personalization only — not resolver-wide discovery

---

## Product intent

The landing page and `/wallet/` share an **“on this device”** hub: saved cards with signing keys, **pinned public scan links**, and shortcuts to manage/revoke/vouch. This mirrors a Settings-style surface (grouped inset lists, chevron rows) without implying accounts, sync, or operator storage of private keys.

**Not in scope:** searching the Humanity resolver, other people’s cards, or any server index. That would be a different product (directory, federation catalog) with privacy, abuse, and policy implications.

---

## Personalization route (decision)

We kept the current landing funnel (hero create → pass demo → device hub → long-form content) and **enriched** it rather than replacing it with a full dashboard.

**Landing story (shipped):** Hero one-liner (`landing-story-hook`), a **five-step progress strip** (Create → Revoke) with the next step highlighted from `hc_wallet` / `hc_device_pins`, **On this device** above the pass demo, and a floating **New here?** pill (hidden once wallet or pins exist) that mirrors the same steps.

**Status line (shipped):** Segmented grey text (`Network live · 2 saved · 0 pinned · 1 notice`) — zero counts are muted; **notice** is bold red when &gt; 0. Hint: “Tap to manage keys on this device” when hub collapsed. Chevron rotates when open. Hub open state persists in `sessionStorage` for the session; first unsaved-tab notice auto-expands hub once.

**Brand dot (shipped):** Tap opens an iOS-style spec sheet (Network / Saved / Pinned / Notice rows). Row taps expand hub or scroll to the matching group.

**Hub rows (shipped):** Saved cards show **Use keys**, **Open scan**, **⋯** (Relabel, Remove). Notice row routes to `/created/` when tab has unsaved keys. **Import backup file** shortcut decrypts `.hcbackup.json` into `hc_wallet`.

**Shared header:** Landing, `/wallet/`, and `/created/` use the same status module (`device-status.mjs`).

**Landing focus mode:** Toggle in hub shortcuts — `localStorage.hc_landing_focus` (`1` = hide intro sections marked `data-landing-tutorial`; default on when wallet/pins exist). Keeps **On this device**, **Documentation**, and **Contact**.

**Created keys strip:** On `/created/` **Now** tab, **Keys on this device** appears first (primary save); recovery key lives in a **Break-glass** `<details>` block below — not competing with the QR block.

**Naming:** UI says **Saved on this device** / **All saved cards** — not “wallet”. URL stays `/wallet/` for compatibility.

| Approach | Verdict |
|----------|---------|
| Full personalized landing (only your cards) | Too empty for first-time visitors |
| No personalization | Returning users repeat `/wallet/` |
| **Hybrid (chosen)** | Static shortcuts + **inject saved cards + pins** from `localStorage` when present; floating search filters **only** what’s on the page |

Returning users see their labels on the homepage; strangers still see the same story and CTAs.

---

## Local search — difficulty and phases

### Phase 1 (shipped)

- **Data:** `hc_wallet` entries (label, handle, manifesto line, `profile_id`, `scan_url`).
- **UI:** Client-side filter (case-insensitive substring) over device-hub rows and wallet list.
- **Landing:** Bottom-left **search FAB** → drawer with field, hint, disclosure, match count.
- **Wallet:** Always-visible centered search bar.

### Phase 2 (shipped)

- **Storage:** `hc_device_pins` in `localStorage`.
- **Schema:** `{ id, label, profile_id, qr_id | null, scan_url, pinned_at }` — **no private keys**.
- **Add pin:** On `/wallet/` — label + scan URL or profile ID. Parsed/validated in `site/js/device-pins.mjs` (base58 profile id, optional `qr_…`, dedupe by profile+qr).
- **Open:** Row opens `scan_url` in a **new tab** (`rel=noopener`).
- **Search:** Pins included in landing FAB search and wallet search (haystack: label, ids, url, “public pinned”).
- **Landing:** Injected **Pinned public cards** group when pins exist; ↗ chevron indicates external scan.

### Phase 3 — backup import (shipped on landing hub)

- **Import backup file** on landing **On this device** → decrypt `.hcbackup.json` into `hc_wallet` (`device-hub-import.mjs`).
- Full export/import UI remains under **Manage** on `/created/`.

### Explicitly deferred

- Resolver search API, full-text index of handles, “find anyone’s card” — conflicts with minimal data policy and invites scraping.

---

## Two storage layers (why tabs matter)

| Layer | API | Scope | Used for |
|-------|-----|--------|----------|
| **This tab** | `sessionStorage` (`hc_created`) | Single tab | Immediately after **Create** — signing, revoke, vouch in that tab |
| **This device** | `localStorage` (`hc_wallet`) | Whole origin (all tabs) | **Saved cards** on `/wallet/`, homepage **On this device**, search |

**Common confusion:** Create in tab B, switch to tab A (homepage or wallet) → no keys visible until you **Save on this device** in tab B (on `/created/` Now tab or wallet while keys still live in tab B). Copying the **recovery key** does not write to `hc_wallet`.

**Pins (`hc_device_pins`)** are a third bucket: public scan bookmarks only — no signing keys.

### Browser sync (Safari, Chrome, etc.)

`localStorage` is **per browser profile**, not uploaded by humanity.llc. Some browsers (especially Safari within Apple’s ecosystem, and signed-in Chrome profiles in some setups) may **replicate website data** across devices. That behavior is **platform-controlled**, can be **incomplete** (e.g. two cards on phone, one on laptop), and is **not** a supported product feature. Prefer **Save on this device** per machine, **encrypted backup** (Phase 3), or recovery key — not relying on browser sync.

**Wrong card after tap?** Usually the **label** does not match what you think you saved — keys are tied to `profile_id` and `@handle` at save time. A common pattern: save card A while the label field still says card B’s name; only that one entry syncs to another device. UI shows `@handle` + profile id under each title so you can verify before **Use keys**.

## Security and data policy

- Wallet and pins stay in **browser storage**; operator never receives private keys from pins.
- Search runs entirely in the client over data the user already stored.
- Pins are bookmarks only; vouching still requires **saved cards with keys** loaded in the tab (save → **Use keys** → open vouchee scan).
- Homepage **On this device** is device-local UI, not a server profile dashboard — your network profile ID is public on scan; private keys are not.

---

## Files

| Path | Role |
|------|------|
| `site/index.html` | Device hub + progress strip + search FAB + help pill |
| `site/js/landing-device-hub.mjs` | Wallet + pin injection, FAB, search |
| `site/js/landing-progress.mjs` | Progress strip next/done from local storage |
| `site/js/landing-help.mjs` | Floating “New here?” for empty device storage |
| `site/js/device-status.mjs` | Status line, dot spec sheet, hub expand/collapse |
| `site/js/device-keys.mjs` | Use keys → session + `/created/` URL |
| `site/js/device-hub-import.mjs` | Hub backup import → `hc_wallet` |
| `site/js/device-counts.mjs` | Shared saved/pin count label |
| `site/js/device-pins.mjs` | Parse, validate, dedupe, `hc_device_pins` |
| `site/js/device-hub-search.mjs` | Shared filter over `[data-hub-searchable]` |
| `site/wallet/index.html` | Save keys + pin form + lists |
| `site/js/device-wallet.mjs` | `hc_wallet` save helpers |
| `site/js/created-device-save.mjs` | Save-on-device block on `/created/` |
| `site/js/card-wallet.mjs` | Wallet + pin CRUD + search |
| `site/styles.css` | Device hub + pin row styles |
