# Device hub and local search

**Status:** Shipped (UI + wallet); search Phase 1 on wallet and landing  
**Scope:** Browser-local personalization only — not resolver-wide discovery

---

## Product intent

The landing page and `/wallet/` share an **“on this device”** hub: saved cards with signing keys, shortcuts to manage/revoke, and (later) user-pinned public scan links. This mirrors a Settings-style surface (grouped inset lists, chevron rows) without implying accounts, sync, or operator storage of private keys.

**Not in scope:** searching the Humanity resolver, other people’s cards, or any server index. That would be a different product (directory, federation catalog) with privacy, abuse, and policy implications.

---

## Personalization route (decision)

We kept the current landing funnel (hero create → pass demo → device hub → long-form content) and **enriched** it rather than replacing it with a full dashboard.

| Approach | Verdict |
|----------|---------|
| Full personalized landing (only your cards) | Too empty for first-time visitors |
| No personalization | Returning users repeat `/wallet/` |
| **Hybrid (chosen)** | Static shortcuts + **inject saved cards** from `localStorage` when present; floating search filters **only** what’s on the page |

Returning users see their labels on the homepage; strangers still see the same story and CTAs.

---

## Local search — difficulty and phases

### Phase 1 (current)

- **Data:** `hc_wallet` entries (label, handle, manifesto line, `profile_id`, `scan_url`).
- **UI:** Client-side filter (case-insensitive substring) over device-hub rows and wallet list.
- **Effort:** Low — no network, no new schema beyond wallet.
- **Landing:** Bottom-left **search FAB** (hollow red outline, matches header **Create**). Tap expands a drawer: full search field, policy hint, **What this searches** disclosure, live match count / empty state. Filters **On this device** (saved cards injected from `hc_wallet` + shortcut rows). Escape or outside tap collapses; clearing query restores all rows.
- **Wallet (`/wallet/`):** Always-visible centered search bar (same filter logic, no FAB).

### Phase 2 (optional)

- **`hc_device_pins`:** User-pasted scan URLs or profile IDs for **public** cards they care about (no private keys). Search includes pins; row opens scan link in new tab.
- **Effort:** Medium — validation, dedupe, optional display name; still no server.

### Phase 3 (optional)

- **Encrypted backup import → wallet** (M5.5): restore entries into `hc_wallet` then searchable like Phase 1.
- **Effort:** Medium — reuse existing backup decrypt path from `/created/`.

### Explicitly deferred

- Resolver search API, full-text index of handles, “find anyone’s card” — conflicts with minimal data policy and invites scraping.

---

## Security and data policy

- Wallet and pins stay in **browser storage**; operator never receives private keys.
- Search runs entirely in the client over data the user already stored.
- Showing saved cards on the landing page does not expose them to other sites (same-origin only).

---

## Files

| Path | Role |
|------|------|
| `site/index.html` | Device hub section + floating search |
| `site/js/landing-device-hub.mjs` | Inject wallet rows, FAB expand/collapse, Phase 1 filter + status |
| `site/wallet/index.html` | Saved cards UI |
| `site/js/card-wallet.mjs` | Wallet CRUD + search filter |
| `site/styles.css` | `.device-hub-*`, `.pilot-showcase-*`, `.wallet-*` |
