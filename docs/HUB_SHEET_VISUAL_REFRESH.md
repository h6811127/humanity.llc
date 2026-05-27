# Hub sheet visual refresh

**Status:** Phases 1–5 shipped (May 2026) · Phase 6 docs + regression (this file)  
**Scope:** Bottom-sheet hub on `/`, `/create/`, `/created/`; wallet page reuses the same saved-items blocks  
**Companions:** [`HUB_CARD_3D_AND_SHEET_GLASS.md`](HUB_CARD_3D_AND_SHEET_GLASS.md) · [`HUB_HEADER_SIMPLIFICATION.md`](HUB_HEADER_SIMPLIFICATION.md) · [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md) · [`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md) · [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md)

---

## Problem (May 2026)

The open hub read as a **solid white slab** with a generic grey toolbar wedged under **Saved items**. Saved rows, search, network/live-proof controls, and the live-proof waiting list did not share one visual language. Product goal: **simple, matching, elegant** shell surfaces with **medium transparency** on inset groups (not liquid-glass landing CTAs).

---

## Design rules

| Rule | Implementation |
|------|----------------|
| **Glass on inset groups, not sheet blur budget** | Hub sheet uses `--surface-popover-bg-glass` gradient fill + `--shell-blur` on the sheet chrome only. Row and alert cards use `--hc-emphasis-card-backdrop` on **nested** surfaces. Vitest forbids regressing sheet-level emphasis blur on `.device-hub--sheet`. |
| **Semantic card tiers** | **Info** glass — saved rows, inline search. **Warn** glass — Monitoring toolbar. **Urgent** emphasis — live proof waiting group. |
| **Red budget** | Brand red reserved for **Create** (section pill), **Prove live** (`.hub-card-control--primary`), and primary CTAs elsewhere. **Open controls** demotion to popover control surface is **optional follow-up** (still red on main as of May 2026). |
| **Status hierarchy** | Hub header status chips = canonical network summary. Monitoring card status line complements (**Network checked …** / **Live proof checked …**). Saved rows use unified **checked** recency line — not duplicate pills. |
| **Reduced transparency** | Sheet, rows, Monitoring, and live-proof waiting cards fall back to opaque fills; backdrop blur disabled (`prefers-reduced-transparency`, coarse pointer). |

---

## Visual tier map

| Tier | Surface | Token family |
|------|---------|--------------|
| **2** | Hub bottom sheet (`.device-hub--sheet`) | `--surface-popover-bg-glass`, `--shell-blur` |
| **3 info** | Inline search (`.device-hub-search--inline`), saved row (`.hub-card-item`) | `--hc-emphasis-card-fill-info-glass` |
| **3 warn** | Monitoring card (`.device-hub-network-tools`) | `--hc-emphasis-card-fill-warn-glass` |
| **3 urgent** | Live proof waiting (`.device-hub-live-control-card`) | `hc-emphasis-card--urgent` |

Row depth and sheet glass details: [`HUB_CARD_3D_AND_SHEET_GLASS.md`](HUB_CARD_3D_AND_SHEET_GLASS.md).

---

## Shipped phases

### Phase 1 — Sheet + search glass

- `--surface-popover-bg-glass` token (light + dark).
- Hub sheet medium frosted fill; inline search aligned to info glass + popover border.
- **Files:** `site/styles.css`, `site/css/theme-dark.css`, `site/css/device-shell.css`, `worker/tests/ui-color-scheme-popover-guard.test.ts`.

### Phase 2 — Monitoring card

Network / live-proof toolbar is a **warn-tinted inset card** with eyebrow **Monitoring**, status line, segmented **Check network** / **Check for live proof**, and iOS-style **Watch for live proof** toggle.

- **Mount:** `mountHubNetworkTools()` in `site/js/device-hub-network-tools.mjs` (inserted after `.device-hub-section-lead` in `#device-hub-saved-items-section`).
- **CSS:** `.device-hub-network-tools*` in `site/css/device-shell.css`.
- **Logic:** `site/js/device-hub-network-tools-core.mjs` (status line, watch default off).

### Phase 3 — Saved row polish

Tier-3 saved rows shipped via [`HUB_CARD_3D_AND_SHEET_GLASS.md`](HUB_CARD_3D_AND_SHEET_GLASS.md). Action button hierarchy (demote **Open controls** from red) documented as follow-up in [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md).

### Phase 4 — Header simplification

Create moved from top rail to saved-items section **+ New** pill; status chips collapsed to one inline row. See [`HUB_HEADER_SIMPLIFICATION.md`](HUB_HEADER_SIMPLIFICATION.md).

### Phase 5 — Live proof waiting group

Replaced gold section label + plain list with **`hc-emphasis-card--urgent`** card wrapping summary + pending rows.

```text
#device-hub-live-control-group
  └── .hc-emphasis-card--urgent.device-hub-live-control-card
        ├── status summary (eyebrow + detail)
        └── #device-hub-live-control-list (compact tap-to-sign rows)
```

- **Markup:** `site/index.html`, `site/create/index.html`, `site/wallet/index.html`.
- **Copy:** `site/js/device-hub-inbox-alerts.mjs` — eyebrow **Live proof waiting** / **N live proofs waiting**; detail from pending count.
- **CSS:** `.device-hub-live-control-card*` in `site/css/device-shell.css`; legacy `#device-hub-live-control-group` gold label removed from `site/styles.css`.

---

## Hub sheet anatomy (after refresh)

```text
┌─ .device-hub--sheet (tier-2 glass) ─────────────────────┐
│  [handle]  Home  status chips…                    Close │
│  #device-hub-alerts-top (cross-tab, disabled, …)        │
│  #device-hub-live-control-group (urgent card, if pending)│
│  search (info glass)                                     │
│  ── Saved items ──────────────────────── [ + New ]      │
│  section lead (one line policy copy)                     │
│  Monitoring card (warn glass)                            │
│  saved rows (info glass tier-3)                          │
│  pinned scans / shortcuts…                               │
└─────────────────────────────────────────────────────────┘
```

---

## Out of scope (follow-ups)

- `#device-hub-card-disabled-group` emphasis-card alignment (still legacy notice styling).
- Monitoring eyebrow switching to urgent when live proof pending (optional; skipped).
- **Open controls** red → popover control surface demotion.

---

## Regression

**Automated (Phase 6):**

```bash
npm run worker:test:ui-color-scheme
npm run worker:test -- worker/tests/device-status-shell-modules.test.ts worker/tests/device-hub-header-html.test.ts worker/tests/device-hub-network-tools-core.test.ts worker/tests/device-hub-frontend-pipeline.test.ts
npm run e2e -- e2e/device-status-dot.spec.ts e2e/device-os-wallet.spec.ts e2e/device-inbox.spec.ts
```

**Vitest guards:** `ui-color-scheme-popover-guard.test.ts` — sheet glass, `.device-hub-network-tools`, `.hub-card-item`, `.device-hub-live-control-card`.

**Manual:** [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P0-3**, **P0-W**, **P1-7**, **P1-9**.

---

## Implementation map

| Piece | Location |
|-------|----------|
| Sheet glass + Monitoring + live proof CSS | `site/css/device-shell.css` |
| Popover glass token | `site/styles.css`, `site/css/theme-dark.css` |
| Monitoring mount + segment UI | `site/js/device-hub-network-tools.mjs` |
| Network status line + watch storage | `site/js/device-hub-network-tools-core.mjs` |
| Live proof waiting render | `site/js/device-hub-inbox-alerts.mjs` |
| Hub HTML shells | `site/index.html`, `site/create/index.html`, `site/wallet/index.html` |
| Header + Create placement | shell HTML + `site/css/device-shell.css` (see header doc) |
| Guard tests | `worker/tests/ui-color-scheme-popover-guard.test.ts` |
