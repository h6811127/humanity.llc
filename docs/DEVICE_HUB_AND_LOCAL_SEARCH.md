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

### Phase 3 (optional)

- **Encrypted backup import → wallet** (M5.5): restore entries into `hc_wallet` then searchable like Phase 1.
- **Effort:** Medium — reuse existing backup decrypt path from `/created/`.

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

## Security and data policy

- Wallet and pins stay in **browser storage**; operator never receives private keys from pins.
- Search runs entirely in the client over data the user already stored.
- Pins are bookmarks only; vouching still requires **saved cards with keys** loaded in the tab (save → **Use keys** → open vouchee scan).
- Homepage **On this device** is device-local UI, not a server profile dashboard — your network profile ID is public on scan; private keys are not.

---

## Files

| Path | Role |
|------|------|
| `site/index.html` | Device hub + search FAB |
| `site/js/landing-device-hub.mjs` | Wallet + pin injection, FAB, search |
| `site/js/device-pins.mjs` | Parse, validate, dedupe, `hc_device_pins` |
| `site/js/device-hub-search.mjs` | Shared filter over `[data-hub-searchable]` |
| `site/wallet/index.html` | Save keys + pin form + lists |
| `site/js/device-wallet.mjs` | `hc_wallet` save helpers |
| `site/js/created-device-save.mjs` | Save-on-device block on `/created/` |
| `site/js/card-wallet.mjs` | Wallet + pin CRUD + search |
| `site/styles.css` | Device hub + pin row styles |
