# Wallet pinned scans white box in dark mode

**Status:** **Open** — investigation only (May 2026); fix not applied  
**Reported surface:** **`/wallet/`** — “Pinned scans” section on **My objects on this device**, not the status-dot hub sheet  
**Reported:** After commit `6f904c1f` (“Fix hub pinned scans white box in dark mode”) — fix did not resolve user-visible bug  
**Companions:** [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md) · [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P1-5** · [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md)

---

## Correction (May 2026)

Initial investigation incorrectly treated **Pinned scans** as a hub-sheet-only surface (status dot → `#device-hub` bottom sheet on `/`). **Reporter confirmed:** the white dropdown/box is on **`/wallet/`**, the dedicated wallet page.

Pinned scans **does** share DOM ids/classes with hub markup (`#device-hub-pins-list`, `device-hub-*` groups) because wallet reuses hub UI modules — but on `/wallet/` those nodes live under `main.wallet-hub`, **not** inside `#device-hub.device-hub--sheet`.

---

## Symptom

With **Appearance → dark (OLED black)** enabled, on **`/wallet/`** the **Pinned scans** area shows a **bright white inset box or expandable panel** (user: “white dropdown”, “pin box is white”). Expected: list + **Add pin** accordion use dark `--shell-fill` / `--surface-popover-bg` (`#1c1c1e` family).

---

## Where pinned scans actually lives

| Page | Container | `#device-hub` sheet? | Pinned scans UI |
|------|-----------|----------------------|-----------------|
| **`/wallet/`** | `main#wallet-page.wallet-hub` | **No** — full-page wallet | **Primary** — `#device-hub-pins-group`, `#device-hub-pins-list`, `.wallet-add-details` (**Add pin**) |
| `/` hub sheet | `#device-hub.device-hub--sheet` | Yes | Duplicate markup; often empty / easy to miss |
| `/create/` hub | `#device-hub` in create flow | Yes | Duplicate markup |

**Primary file:** `site/wallet/index.html` (~327–363) — Pinned scans subgroup + **Add pin** `<details>`.

**JS:** `site/js/device-hub-ui.mjs` renders pin rows into `#device-hub-pins-list` on whichever page mounts those ids (wallet + hub).

---

## Why `6f904c1f` missed `/wallet/`

Shipped dark rules in `theme-dark.css`:

```402:407:site/css/theme-dark.css
html[data-theme="dark"] .device-hub #device-hub-pins-list,
html[data-theme="dark"] .device-hub .list.list-compact {
  background: var(--shell-fill);
  border-color: var(--shell-separator);
  box-shadow: var(--shell-shadow-sm);
}
```

**Problem:** Selectors require a **`.device-hub` ancestor**. On `/wallet/`, pinned scans sits under `.wallet-hub` with **no** `#device-hub` wrapper — so these rules **never apply** on the page users actually use.

Vitest guard in `ui-color-scheme-popover-guard.test.ts` asserts the same `.device-hub`-scoped selector — it passes while wallet remains broken.

---

## Likely white surfaces on `/wallet/` (ranked)

### 1 — **Add pin** accordion (most “dropdown-like”) — **CONFIRMED GAP**

```6062:6068:site/styles.css
.wallet-add-details {
  margin-top: 12px;
  border-radius: var(--radius);
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fafafa;
  overflow: hidden;
}
```

- Hardcoded **`#fafafa`** — no `html[data-theme="dark"]` override in `theme-dark.css`.
- Wallet-only; not covered by `6f904c1f`.
- Expanding **Add pin** shows a white panel on black page chrome.

### 2 — **Pinned scans list** `#device-hub-pins-list`

- Classes: `.list.list-compact` inside `#device-hub-pins-group`.
- Global `html[data-theme="dark"] .list` in `theme-dark.css` (~745) *should* apply — but explicit pin fix was scoped to `.device-hub` only.
- With **Reduce Transparency** on iOS, light `--shell-fill: #ffffff` leak was partially fixed on `:root:not([data-theme="dark"])` — wallet list may still read light if cascade/specificity loses or cache is stale.

### 3 — Hub sheet duplicates (lower priority)

Same ids exist in hub sheet on `/` — not the reported surface. Do not use hub sheet QA to sign off wallet.

---

## Prior fix attempt (`6f904c1f`) — what it did / didn’t do

| Change | Helped wallet? |
|--------|----------------|
| `:root:not([data-theme="dark"])` on reduced-transparency `--shell-fill` | **Partial** — token leak only |
| `.device-hub #device-hub-pins-list` dark rules | **No** — wallet has no `.device-hub` ancestor |
| `.device-hub-keys-custody-row` | **No** on wallet unless same class on wallet custody UI |
| `theme-dark.css?v=30` on `wallet/index.html` | Loads file but wallet-specific selectors still missing |

---

## Reproduction (correct)

1. `localStorage.hc_theme = "dark"` → reload **`/wallet/`** (not hub sheet on `/`).
2. Scroll to **Pinned scans** (under Saved items).
3. Inspect:
   - `#device-hub-pins-list` computed `background`
   - `.wallet-add-details` computed `background` (expand **Add pin**)
4. Network: `theme-dark.css?v=30` loaded from `site/wallet/index.html`.
5. `<html data-theme="dark">` present (inline boot script in wallet head).

**Fail signals:** `#fafafa` or `#ffffff` box on black page; **Add pin** panel reads as light gray/white.

---

## Recommended fix plan (not executed)

| Step | Action |
|------|--------|
| 1 | Add wallet-scoped dark rules — e.g. `html[data-theme="dark"] .wallet-hub #device-hub-pins-list`, `html[data-theme="dark"] .wallet-add-details` (+ summary/open borders) using `--shell-fill` / `--shell-separator` |
| 2 | **Or** drop `.device-hub` prefix from pin-list rule: `html[data-theme="dark"] #device-hub-pins-list` (id is unique per page) |
| 3 | Migrate `.wallet-add-details` off hardcoded `#fafafa` to tokens on `:root` + dark override |
| 4 | Extend Vitest guard to require wallet selectors (forbid `#fafafa` on `.wallet-add-details`; assert pin list rule not `.device-hub`-only) |
| 5 | Bump `theme-dark.css?v=` on shell pages; manual QA on **`/wallet/`** only |
| 6 | Update **P1-5** steps to say `/wallet/`, not hub sheet |

---

## QA linkage

### P1-5 addendum (wallet pinned scans — manual)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Dark theme; open **`/wallet/`** | Page chrome black |
| 2 | **Pinned scans** list (pin ≥1 scan if needed) | List inset uses dark `--shell-fill`, not white |
| 3 | Expand **Add pin** | Accordion panel dark, not `#fafafa` |
| 4 | iOS **Reduce Transparency** on; repeat 2–3 | No white wash |

**Automated gate (after fix):** `npm run worker:test:ui-color-scheme`

---

## Agent handoff

- **QA surface is `/wallet/`**, not hub sheet on `/`.
- `6f904c1f` commit message and docs wrongly said “hub” — root bug is **selector scope** (`.device-hub` ancestor) + **`.wallet-add-details` hardcoded light fill**.
- Do not close this investigation until verified on **`/wallet/`** in dark mode.
