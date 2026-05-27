# Hub saved-card 3D + sheet glass

**Status:** Steps 1–3 shipped · Step 4 (regression) pending  
**Scope:** Saved card rows (`.hub-card-item`) in the device hub bottom sheet; hub sheet surface transparency (light + dark)  
**Companions:** [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md) · [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) · [`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md) · [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md) · [`SCAN_HERO_CARD_VISUAL_SPEC.md`](SCAN_HERO_CARD_VISUAL_SPEC.md) § Visual tier

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
| Sheet `backdrop-filter` | none → **`var(--hc-emphasis-card-backdrop)`** | same |
| Dark sheet `background` | opaque `--surface-popover-bg` → **`--surface-popover-bg-glass`** | same |

**Medium transparency** = clearly more see-through than May 2026 opaque migration, but row title/detail must still pass AA on the frosted stack. Inbox sheet stays opaque in Step 1; parity optional in Step 3.

**Reduced transparency:** Sheet and rows fall back to opaque `--surface-popover-bg` / `--hc-emphasis-card-fill-info`; backdrop disabled (existing `prefers-reduced-transparency` block in `device-shell.css`).

---

## Implementation steps

| Step | Work | Files | Status |
|------|------|-------|--------|
| **1** | Token transparency + `.hub-card-item` tier-3 CSS + Vitest guard | `styles.css`, `device-shell.css`, `theme-dark.css`, `ui-color-scheme-popover-guard.test.ts` | **Shipped** |
| **2** | Hub sheet frosted surface + dark glass; extend reduced-transparency | `device-shell.css`, `theme-dark.css`, guard test | **Shipped** |
| **3** | Cache bust shell pages; manual light/dark QA | `site/index.html`, wallet, created, create | **Shipped** |
| **4** | Regression suite | `worker:test:ui-color-scheme`, `worker:test:device`, `e2e/device-os-wallet.spec.ts` | Planned |

---

## Out of scope

- Inbox sheet glass (unless Step 2 extends for parity)
- Glance popover rows, pin rows, hub notice full-bleed banners
- Changing row copy, controls partition, or poll behavior
- Scan hero (tier 4) shadow on hub rows

---

## QA (after Step 4)

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
