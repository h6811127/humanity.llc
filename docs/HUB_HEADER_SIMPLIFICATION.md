# Hub header simplification

**Status:** Steps 1-2 shipped
**Scope:** Bottom-sheet hub header on `/`, `/create/`, and `/created/`  
**Companions:** [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md), [`VISUAL_DEVICE_SHELL.md`](VISUAL_DEVICE_SHELL.md), [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md)

---

## Problem

The open hub sheet currently asks the top edge to do too much at once: drag affordance, Home, resolver status, saved counts, Create, and Close. On a narrow mobile viewport this makes the header feel crowded, and the pink Create `+` competes with the hub title.

The controls are individually clear, but their combined weight makes the sheet read more like a toolbar than a calm system panel.

---

## Target experience

The first screen of the hub should prioritize:

1. **Place** - the user is in `This browser` / `My cards on this device`.
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

### Step 3 - Rebalance nav controls

- Review Home and Close visual weight together.
- Keep Close stronger than Home because it exits the sheet; keep Home available but quieter.
- Verify tap targets remain at least 40px.

### Step 4 - Manual QA pass

- Mobile Safari-width smoke: open hub, close hub, tap Home, tap New, scroll saved items.
- Regression: status dot still opens the hub after scroll.
- Dark mode check: Create pill uses shell/popover contrast tokens and does not bloom.

---

## Acceptance criteria

- The top rail contains Home + status only; Create no longer competes with Close or the title.
- The saved-items heading exposes a compact **+ New** action.
- The status panel stays on one inline row in the empty-wallet case: network + muted `0 cards` / `0 pinned`.
- Existing hub open/close state contracts still route through `setHubSheetOpen()` / `setHubExpanded()`.
- No new module imports are added to the status-dot graph.
