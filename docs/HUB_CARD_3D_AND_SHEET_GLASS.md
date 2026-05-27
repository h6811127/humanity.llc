# Hub saved-card 3D + sheet glass

**Status:** Steps 1–5 shipped · Step 6 inbox sheet glass parity shipped (May 2026)  
**Scope:** Saved card rows (`.hub-card-item`) in the device hub bottom sheet; hub sheet surface transparency (light + dark)  
**Companions:** [`HUB_SHEET_VISUAL_REFRESH.md`](HUB_SHEET_VISUAL_REFRESH.md) · [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md) · [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) · [`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md) · [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md) · [`SCAN_HERO_CARD_VISUAL_SPEC.md`](SCAN_HERO_CARD_VISUAL_SPEC.md) § Visual tier

---

## Problem (May 2026)

After the **emphasis card / tier-3 depth** standard shipped (glass fill, hairline border, layered `--hc-emphasis-card-shadow`, `backdrop-filter`), hub saved-card rows still read **flat**: `--shell-fill` + `--shell-shadow-sm` in light mode; dark mode had a partial glass fill override without the full shadow stack. The hub bottom sheet was migrated to **near-opaque** popover tokens for contrast; product now wants **medium** frosted transparency so page content shows through without washing out row copy.

**Already on standard:** Inset `.hub-card-status-alert` (`hc-emphasis-card--warn`, Phase 5). This work targets the **outer row shell** and the **sheet chrome**, not alert markup.

---

## Visual tier placement

| Tier | Surface | Hub instance |
|------|---------|--------------|
| **2** | Hub bottom sheet (`.device-hub--sheet`) | Frosted sheet; medium transparency |
| **3** | Saved card row (`.hub-card-item`) | Same token family as `.hc-emphasis-card` (cool neutral `--info` glass) |
| **3** | Inset alert (`.hub-card-status-alert`) | Already shipped |

**Rule:** Row cards use tier-3 depth but **dense list rhythm** (5px gap, compact padding) — do not inflate padding to emphasis-card comfort ladder. Object-type color stays on the **left accent bar**, not the card frame.

---

## Target anatomy — saved card row

| Layer | Token / rule |
|-------|----------------|
| Radius | `14px` (`--shell-radius-card`) |
| Hairline | `0.5px solid var(--hc-emphasis-card-border-neutral)` |
| Fill | `var(--hc-emphasis-card-fill-info-glass)` — cool neutral (not semantic blue frame) |
| Depth | `box-shadow: var(--hc-emphasis-card-shadow)` |
| Frost | `backdrop-filter: var(--hc-emphasis-card-backdrop)` |
| Accent | Keep `.hub-card-item--{objectType}` `border-left: 3px` semantic stripe |
| Fallback | `var(--hc-emphasis-card-fill-info)` when blur unsupported or `prefers-reduced-transparency: reduce` |

No markup or JS changes in `device-hub-ui.mjs` for row shells.

---

## Target — hub sheet glass

| Token | Light (before → after) | Dark (before → after) |
|-------|------------------------|------------------------|
| `--surface-popover-bg-glass` | `0.94 / 0.88` → **`0.84 / 0.76`** | `0.94 / 0.88` → **`0.84 / 0.76`** |
| Sheet `backdrop-filter` | none → **`var(--hc-emphasis-card-backdrop)`** → **Step 5:** **`var(--shell-blur)`** | same progression |
| Hub dim backdrop (`.device-hub-backdrop`) | — | **Step 5:** **`var(--shell-blur)`** (was hardcoded `blur(28px)`) |
| Dark sheet `background` | opaque `--surface-popover-bg` → **`--surface-popover-bg-glass`** | same |

**Medium transparency** = clearly more see-through than May 2026 opaque migration, but row title/detail must still pass AA on the frosted stack. Inbox sheet matched hub frosted glass in Step 6.

### Step 5 — Stronger hub frost (May 2026)

Hub sheet and dim backdrop were still on tier-3 emphasis blur (`--hc-emphasis-card-backdrop`: 16px light / 18px dark). Product wants a **stronger frosted read** on the hub chrome in **both** light and dark without changing card-row tier-3 depth.

| Surface | Before | After |
|---------|--------|-------|
| `.device-hub.device-hub--sheet` `backdrop-filter` | `var(--hc-emphasis-card-backdrop)` | **`var(--shell-blur)`** (`saturate(200%) blur(40px)`) |
| `.device-hub-backdrop` `backdrop-filter` | `saturate(160%) blur(28px)` | **`var(--shell-blur)`** |
| `.hub-card-item` rows | `--hc-emphasis-card-backdrop` | unchanged (nested tier-3) |

**Why `--shell-blur`:** Already defined in `device-shell.css` for hub/sheet materials per [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md); Step 2 wired emphasis-tier blur instead. Step 5 aligns sheet + backdrop with that token. Coarse-pointer and `prefers-reduced-transparency` fallbacks unchanged (backdrop blur off on touch; sheet falls back to opaque popover bg).

**Reduced transparency:** Sheet and rows fall back to opaque `--surface-popover-bg` / `--hc-emphasis-card-fill-info`; backdrop disabled (existing `prefers-reduced-transparency` block in `device-shell.css`).

---

## Implementation steps

| Step | Work | Files | Status |
|------|------|-------|--------|
| **1** | Token transparency + `.hub-card-item` tier-3 CSS + Vitest guard | `styles.css`, `device-shell.css`, `theme-dark.css`, `ui-color-scheme-popover-guard.test.ts` | **Shipped** |
| **2** | Hub sheet frosted surface + dark glass; extend reduced-transparency | `device-shell.css`, `theme-dark.css`, guard test | **Shipped** |
| **3** | Cache bust shell pages; manual light/dark QA | `site/index.html`, wallet, created, create | **Shipped** |
| **4** | Regression suite | `worker:test:ui-color-scheme`, `worker:test:device`, `e2e/device-os-wallet.spec.ts` | **Shipped** (Vitest + wallet e2e green) |
| **5** | Hub sheet + dim backdrop → `--shell-blur`; cache bust; guard tests | `device-shell.css`, shell HTML, `ui-color-scheme-popover-guard.test.ts`, `device-emphasis-card-html.test.ts` | **Shipped** |
| **6** | Inbox sheet + dim backdrop glass parity with hub (`--surface-popover-bg-glass`, `--shell-blur`); cache bust; guard tests | `device-shell.css`, `theme-dark.css`, shell HTML, guard tests | **Shipped** |

---

## Out of scope

- Glance popover rows, pin rows, hub notice full-bleed banners
- Changing row copy, controls partition, or poll behavior
- Scan hero (tier 4) shadow on hub rows

---

## QA (Step 4 — May 2026)

**Automated (shipped):**

```bash
npm run worker:test:ui-color-scheme   # pass
npm run worker:test:device            # pass
npm run e2e -- e2e/device-os-wallet.spec.ts  # 16/16 pass
```

**Vitest additions:** `device-emphasis-card-html` hub tier-3 guard; cache bust `v=123` / `theme-dark v=26` / `device-shell v=52`; `shouldUseCachedNetworkStatus` aligned with G4 card-revoke cache policy.

**E2e fixes (May 2026):** Hub-row **Open controls** uses `.hub-card-item` + `{ exact: true }` (avoids wallet tab-hint **Open controls here**). `/created/` tests stub resolver card lookup (`health` + `status` + card JSON) so route gate boots setup/control roots. **Update status** test sets `hc_created_first_qr_revoke` before asserting `#created-live-scanners-see` (Phase A first-revoke gate).

**Manual (recommended):**

1. `/` and `/wallet/` — open hub in **light** and **dark**; confirm frosted sheet and raised card rows.
2. Object-type left accents visible on membership, status-plate, lost-item rows.
3. Disabled-since-visit row tint + inset `.hub-card-status-alert` still legible inside raised row.
4. `prefers-reduced-transparency: reduce` — sheet and rows opaque, no blur jank.
5. ⋯ menu panel still popover-opaque (unchanged).

```bash
npm run worker:test:ui-color-scheme
npm run worker:test:device
npm run e2e -- e2e/device-os-wallet.spec.ts
```
