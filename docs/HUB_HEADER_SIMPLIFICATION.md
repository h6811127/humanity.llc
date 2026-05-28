# Hub header simplification

**Status:** Steps 1–4 shipped (automated e2e + Vitest; manual **P1-HH** / **P0-W** still recommended on WebKit)
**Scope:** Bottom-sheet hub header on `/`, `/create/`, and `/created/`  
**Companions:** [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md), [`VISUAL_DEVICE_SHELL.md`](VISUAL_DEVICE_SHELL.md), [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md)

---

## Problem

The open hub sheet currently asks the top edge to do too much at once: drag affordance, Home, resolver status, saved counts, Create, and Close. On a narrow mobile viewport this makes the header feel crowded, and the pink Create `+` competes with the hub title.

The controls are individually clear, but their combined weight makes the sheet read more like a toolbar than a calm system panel.

---

## Target experience

The first screen of the hub should prioritize:

1. **Place** - the user is in **Saved in this browser** (`/`, `/create/`) or **My cards on this device** (`/created/`). No subtitle under the sheet title on landing/create (section leads carry policy copy).
2. **Trust state** - the resolver is reachable and device counts are available.
3. **Escape** - Close remains easy to hit.
4. **Next action** - Create is still available, but closer to saved items rather than competing with the sheet title.

### Header hierarchy

- Keep the drag handle centered at the top.
- Keep Close in the sheet corner.
- Keep Home as the left navigation control.
- Keep the status chips beside Home, but treat zero-value chips as low emphasis.
- Move Create out of the top rail and into the saved-items section header as a compact secondary action.

### Copy and visual rules

- Sheet title on **`/`** and **`/create/`**: **Saved in this browser** (`#device-hub-title`). Removed the former `.device-hub-lead` subtitle (“cards, keys, and pins…”) so the sheet opens on the title + search + saved items.
- Create action label: **New** when space allows, with the `+` retained as the fast-recognition glyph.
- Create action tone: pink accent is allowed, but the control must be smaller and less shadowed than the current floating `+`.
- Empty state counts may stay visible for diagnostics, but should not create a second row of scattered badges.
- Do not change status-dot behavior: `#brand-status-dot-btn` remains the hub opener on `/`, `/create/`, and `/created/`.

---

## Implementation steps

### Step 1 - Move Create below the header

- Remove `.device-hub-create-btn` from `.device-hub-status-head`.
- Add the Create action to the saved-items section header on `/`, `/create/`, and `/created/`.
- Restyle `.device-hub-create-btn` as a compact pill in section context.
- Preserve the existing `/create/` destination and accessible label.

### Step 2 - Calm the status chip row

- [x] Render the hub status panel as a single-line primary status where possible.
- [x] Keep zero saved/pinned values visually subordinate.
- [x] Avoid wrapping a lone `0 pinned` chip onto its own row on mobile.

**Shipped:** The sheet header now renders one inline status line: network first, then muted device counts, then compact alert-weight items only for actionable states.

### Step 3 - Rebalance nav controls ✅

- **Home (quieter):** `.device-hub-home-btn` uses muted popover fg, lighter fill (`rgba(120,120,128,0.08)`), 20px icon; still **40×40px** tap target.
- **Close (stronger):** `.device-hub-sheet-close` bumped to **40×40px**, popover fg (not muted), control fill + border + light shadow; dark theme border/shadow pass.
- **Files:** `site/css/device-shell.css`, `site/css/theme-dark.css` (`device-shell.css?v=59` on shell pages).

### Step 4 - QA pass ✅

Runbook: **P1-HH** in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md).

**Automated (May 2026):**

```bash
npm run worker:test -- worker/tests/device-hub-header-html.test.ts
npm run e2e -- e2e/device-status-dot.spec.ts -g "hub sheet header chrome"
```

- Close dismisses hub; **+ New** in saved-items header → `/create/`; Home/Close visible when expanded.
- Dot opens hub after page scroll (no `top-chrome--edge-hidden` — scroll-edge hide removed from shell).

**Manual (recommended):** P1-HH steps 6–8 (dark mode, `/create/` parity, WebKit).

---

## Acceptance criteria

- The top rail contains Home + status only; Create no longer competes with Close or the title.
- The saved-items heading exposes a compact **+ New** action.
- The status panel stays on one inline row in the empty-wallet case: network + muted `0 cards` / `0 pinned`.
- Existing hub open/close state contracts still route through `setHubSheetOpen()` / `setHubExpanded()`.
- No new module imports are added to the status-dot graph.
