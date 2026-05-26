# Status Indicator: Steward Green + Intelligent Trust Dot

**Status:** Implemented (Phases 1–7, v1 complete)  
**Owners:** Device shell + resolver trust UX  
**Scope:** `site/js/device-status.mjs`, `site/js/device-dot-state-core.mjs`, `site/styles.css`, `site/css/device-shell.css`, status key copy in hub/wallet/created  
**Related:** [`DEVICE_INBOX.md`](DEVICE_INBOX.md) — inbox badge, hub alerts, background alerts (separate from dot semantics)

---

## Goal

Make the status dot feel like a trustworthy system signal instead of just a color chip:

1. **Bright green instantly confirms steward readiness** when steward keys exist on this device context.
2. **One-tap explainability** answers "why this color?" in plain language.
3. **Actionable urgency** escalates when intervention is needed, without becoming noisy.

This keeps the product intuitive for first-time users while giving power users real-time confidence.

---

## Product principles for the dot

- **Truth over decoration:** color must always map to a concrete state that users can act on.
- **Most urgent state wins:** offline/degraded warnings override celebratory states like steward green.
- **Local first clarity:** device custody state (keys saved/unsaved) remains visible inside any positive network state.
- **Never color-only:** every visual state has text in the status key, glance popover, and screen-reader labels.
- **Calm by default:** animation only for actionable urgency or new high-value events.

---

## Canonical dot state model (v1 plan)

The dot is computed from two axes plus event overlays:

- **Network axis:** `ok`, `degraded`, `offline`
- **Identity/capability axis:** `none`, `keys`, `unsaved`, `steward`
- **Overlay axis (optional):** `proof_waiting`, `cross_tab_keys`, `new_incident`

Priority order (highest first):

1. `offline` -> gray
2. `degraded` -> amber
3. `ok + unsaved` -> pulsing red
4. `ok + steward` -> bright green
5. `ok + keys` -> solid red
6. `ok + none` -> pulsing red

Notes:
- Steward green appears only when resolver health is `ok`.
- If steward keys are present but resolver is degraded/offline, dot follows network health colors and status text explains steward readiness is locally true but network-limited.

---

## Steward Green definition

### Steward key eligibility (v1)

A tab/session is steward-ready when:

- A saved or active keyset includes the steward capability (`steward` role/flag in local key metadata), and
- Required signing material for steward actions is available in this browser context.

Implementation note:
- Add a single helper in the device shell layer (example: `hasStewardReadyKeys()`) so UI does not duplicate key-role logic.
- Keep role detection source-of-truth aligned with existing vouch/steward handling modules.

### Visual spec

- **Color:** bright green token (example `#22c55e`) with AA contrast against shell surfaces.
- **Pulse:** none in steady state.
- **Celebration pulse (optional):** one-time 900ms bloom only when transitioning from non-steward -> steward.

### Copy spec

- Status key line: "Bright green - steward keys ready on this device."
- Glance popover subtitle: "Steward ready: you can review and sign steward actions now."
- ARIA label: "Status: network online, steward keys ready."

---

## The coolest version: "Trust Dot Intelligence"

The strongest evolution is to make the dot a **mini trust radar** while preserving simplicity:

1. **Single glance state:** base color reflects the highest-priority truth.
2. **Micro-overlay badge:** tiny ring/notch for urgent pending events (for example live proof waiting).
3. **Tap for narrative:** popover shows "Now / Why / What next" in 3 lines.
4. **State transitions as memory:** subtle motion differentiates "problem emerged" vs "problem resolved."

Example popover content:
- **Now:** "Steward ready, resolver online."
- **Why:** "Steward key found in saved wallet."
- **Next:** "Open steward review queue."

This gives users confidence and direction without turning the header into a dashboard.

---

## Relationship to device inbox (do not merge)

The header **shell status cluster** has two controls:

| Control | Job | Module |
|---------|-----|--------|
| **Status dot** | Network + custody + urgent **overlay** (`proof_waiting`, `cross_tab_keys`) | `device-status.mjs`, `device-dot-state-core.mjs` |
| **Inbox badge** (`#shell-notif-badge`) | Count of **action items** (live proof, unsaved tab keys, cross-tab keys) | `notificationCount()` in `device-status.mjs` |

**Rules:**

- The dot is **never** a numeric notification bell.
- Overlay priority on the dot matches inbox urgency: live proof beats cross-tab (`dotOverlayFromCounts()`).
- When overlay is `proof_waiting`, dot explainer quick action is `open_notifications` → `openInboxFromChrome()` (inbox sheet — see [`DEVICE_INBOX.md`](DEVICE_INBOX.md)).
- **Background alerts** (OS `Notification` API) are a third channel for live proof only when the tab is hidden; configured separately from dot color.

Full inbox taxonomy, browser-alert roadmap, and implementation phases: [`DEVICE_INBOX.md`](DEVICE_INBOX.md).

---

## UX behavior by context

### Landing (`/`)
- Dot toggles the device hub sheet (first tap opens, second tap closes); chrome keeps the dot clickable while the sheet is open.
- Hub status key and glance popover show **Now / Why / Next** explainability for the current dot state.
- If steward-ready, primary quick action becomes "Open steward queue" when `#steward-review-details` exposes a link; otherwise "Open controls."

### Created (`/created/`)
- Dot remains global status entry point.
- Steward green should reinforce that this is the trusted place for privileged signing.

### Wallet (`/wallet/`)
- Dot explains local capability and network readiness.
- If user has steward keys but no active steward tasks, copy emphasizes readiness rather than urgency.

---

## Accessibility and trust requirements

- Do not rely on hue alone; include iconography/text label in key and popover.
- Respect reduced motion; disable celebration pulse and urgency pulsing where appropriate.
- Keep wording operational, not social rank language.
- Add deterministic test hooks (`data-dot-state`, `data-dot-overlay`) to avoid brittle color assertions.

---

## Telemetry and quality signals (optional but high value)

- Track dot state transitions (`from_state`, `to_state`, `page`, `network_status`) in local diagnostics/log hooks.
- Track popover opens and quick-action clicks to learn whether users understand steward green.
- Watch for confusion indicators: repeated popover opens without action, frequent state flapping.

No third-party analytics requirement; this can remain local/dev diagnostics initially.

---

## Technical implementation plan

Implementation snapshot:
- Phase 1: `site/js/device-status.mjs` + `site/styles.css` — steward green (`#22c55e`), ARIA, status key legend.
- Phase 2: `describeDotState()` in `site/js/device-dot-state-core.mjs` — **Now / Why / Next** in hub status key and glance popover; steward queue link when present.
- Phase 3: overlay axis (`proof_waiting`, `cross_tab_keys`), `::after` notch in `site/styles.css`, `data-dot-state` / `data-dot-overlay`, Vitest in `worker/tests/device-dot-state.test.ts`.
- Phase 4: steward celebration pulse (`pass-dot-steward-celebrate`), `hc-dot-state-changed` + optional `hc_dot_diag_log`, E2E in `e2e/device-status-dot.spec.ts`, CI via `test-site.yml`.
- Phase 5 (diagnostics UX): popover/action/hub telemetry in `device-dot-diagnostics.mjs` when `localStorage.hc_dot_diagnostics === "1"`.
- Phase 6 (A11y E2E): reduced-motion skips celebration class; hub explainer **Now / Why / Next** + `aria-label` covered in `e2e/device-status-dot.spec.ts`.
- Clickability: `site/css/device-shell.css` + `site/js/device-hub-sheet.mjs` — dot stays fixed/clickable when hub is open or chrome is edge-hidden; dot opens hub on first tap (not glance-first).
- Bootstrap + reconcile: `site/js/device-status-bootstrap.mjs`, `reconcileHubSheetState()` in `device-hub-sheet.mjs` — see **Fix directions** §1–3.

### Phase 4 - Hardening

1. **Celebration pulse** — one-time 900ms bloom on non-steward → steward when network is `ok`; disabled under `prefers-reduced-motion`. CSS: `pass-dot-steward-celebrate` in `site/styles.css`; logic: `shouldCelebrateStewardTransition()` in `device-dot-state-core.mjs`, applied from `device-status.mjs`.
2. **E2E** — `e2e/device-status-dot.spec.ts`: steward wallet + healthy resolver → green on `/wallet/` and `/`; degraded suppresses green; landing dot opens hub sheet.
3. **Diagnostics (dev-only)** — `window` event `hc-dot-state-changed` with `{ from, to, at, page }`; ring buffer `sessionStorage.hc_dot_diag_log` when `localStorage.hc_dot_diagnostics === "1"`.

### Phase 5 - Interaction telemetry (dev-only)

Enable: `localStorage.setItem("hc_dot_diagnostics", "1")` then reload. Read log: `JSON.parse(sessionStorage.getItem("hc_dot_diag_log"))`.

Logged entry types in `hc_dot_diag_log` (newest first, max 20):

| Type | When |
|------|------|
| `state_transition` | Dot network/device/overlay changes (`from` / `to`) |
| `dot_click` | Status dot tapped |
| `hub_toggle` | Hub sheet opened/closed from a haptic user action |
| `popover_open` | Glance popover shown |
| `quick_action` | Explainer button (`data-dot-action`) or link (`.device-dot-explainer-action[href]`) |

Confusion hints (console.info when thresholds hit): ≥3 glance opens without a follow-up action; ≥3 state transitions within 15s. Helpers: `device-dot-diagnostics-core.mjs`; Vitest: `worker/tests/device-dot-diagnostics.test.ts`.

### Phase 6 - Accessibility E2E

Playwright (`e2e/device-status-dot.spec.ts`, `status dot accessibility`):

1. **`prefers-reduced-motion: reduce`** — steward dot loads without `pass-dot-steward-celebrate` (JS + CSS both respect reduced motion).
2. **Text alternatives** — `#brand-status-dot-btn` `aria-label` mentions steward readiness and resolver state; opening the hub shows `.device-dot-explainer` with **Now / Why / Next** lines and the state quick action.

Network refresh for dot coloring uses `device-os-coordinator.mjs` (`DEVICE_OS_REFRESHED`) so steward green tracks resolver health consistently with wallet/hub.

### Phase 1 - Steward green foundation

1. Extend `deviceState()` model to return `steward`.
2. Add CSS class mapping: `pass-dot-status-device-steward` under network-ok.
3. Update `applyDot()` class list constants and class assignment.
4. Update status key legend copy and markup.
5. Add ARIA label generation for the composed state.

### Phase 2 - Explainability layer

1. Add structured state descriptor function (example `describeDotState()`).
2. Surface descriptor in popover/hub status area.
3. Add quick action intents based on dot state.

### Phase 3 - Intelligence overlays

1. Add overlay state computation for urgent pending items.
2. Render small overlay marker with non-color fallback.
3. Add tests for priority + overlay combinations.

---

## Test plan

- Unit: state priority resolver (network overrides, steward precedence among healthy states).
- Unit: role detection helper for steward readiness.
- UI unit: class + aria output for each state.
- E2E: seeded steward wallet shows `data-dot-state` `ok:steward` on landing and wallet (class hooks, not computed color).
- E2E: degraded/offline suppresses network-ok even with steward keys.
- A11y: reduced-motion celebration off + explainer/ARIA text (`e2e/device-status-dot.spec.ts`, Phase 6).

---

## Acceptance criteria (MVP)

- With steward-ready keys and healthy resolver, dot is bright green on all device-shell pages.
- Status key + popover text explicitly explain steward readiness.
- Degraded/offline always override green.
- Existing red/amber/gray semantics continue to work unchanged for non-steward users.

---

## Resolved decisions (v1)

- **Steward detection:** `verification.state === "steward"` or `verification.label === "Steward"` on tab session (`hc_created`) or wallet entries (`hc_wallet`), via `hasStewardVerification()` / `hasStewardReadyKeys()` in the device shell. Re-saving merges fresh `verification` from the tab session (`mergeWalletEntryFromSession`); `/created/` syncs resolver verification into session and wallet on status refresh.
- **Unsaved vs steward:** `deviceStateFromContext` prioritizes `unsaved` over `steward` (tab keys not saved wins).
- **Steward queue action:** deep-link from `#steward-review-details a[href]` on `/created/` when visible; otherwise "Open controls."
- **Green token:** `#22c55e` (`pass-dot-status-device-steward` under network-ok).

## Optional follow-up

- **CI (shipped):** `.github/workflows/test-site.yml` runs `npm run worker:test` and `e2e/device-status-dot.spec.ts` on `site/` / `e2e/` changes.
- **Interaction telemetry (shipped):** Phase 5 dev-only log; see Telemetry section and Phase 5 above.
- **A11y E2E (shipped):** Phase 6 Playwright checks in `e2e/device-status-dot.spec.ts`.
- **Inbox chroma sync (shipped):** badge ring/count match dot overlay urgency — [`DEVICE_INBOX.md`](DEVICE_INBOX.md) phase 5.
- **Unified inbox core:** `buildInboxItems()` shared by badge, glance, and hub alerts — keeps overlay and counts aligned.

---

## Troubleshooting: dot tap appears dead

Use this when users report “the status dot does nothing” on every page. On current `main`, Playwright (`e2e/device-status-dot.spec.ts`, Pixel 5 viewport) passes hub-open on landing; a total failure usually means the handler never ran or the UI did not change visibly.

### Expected behavior by page

| Page | `#brand-status-dot-btn` tap |
|------|-----------------------------|
| `/`, `/create/`, `/created/` | Toggles hub bottom sheet (`#device-hub.device-hub--sheet`) — first tap opens, second closes |
| `/wallet/` (`body.page-wallet`) | **Does not open a hub sheet** — scrolls to `#device-hub-saved-group` only (wallet has no `#device-hub` host) |

Handler chain: `dotBtn` click → `openHubFromChrome()` → `setHubExpanded()` → `setHubSheetOpen()` when `device-hub--sheet` is present (`site/js/device-status.mjs`, `site/js/device-hub-sheet.mjs`). Glance-first-on-dot was removed in commit `77816d1`; `toggleGlancePopover()` is not wired to the dot.

### Diagnosis checklist (device under test)

1. **Console on first load** — Red errors loading `device-status.mjs` or any import (`device-inbox-sheet.mjs`, `device-inbox-core.mjs`, `device-browser-notifications.mjs`, etc.) mean the module aborted and **no click listener was registered** (dot still renders from HTML).
2. **Network** — Confirm `/js/device-status.mjs?v=…` and `/js/device-inbox-sheet.mjs` return **200** (partial deploy or CDN cache after inbox sheet landed in `2b5d105` is a common cause).
3. **After one tap** — In console: `document.body.classList.contains('device-hub-sheet-open')` and `document.getElementById('device-hub')?.className`. If body says “open” but the sheet looks closed, the next tap only **closes** (toggle trap) — see fix direction 2 below.
4. **Pointer hit-testing** — In DevTools, inspect `#brand-status-dot-btn`: another element on top, or `pointer-events: none` on `#top-chrome` / `.top-chrome-bar` without the `.shell-status-cluster` override (regression of `77816d1` CSS).
5. **Diagnostics** — `localStorage.setItem('hc_dot_diagnostics', '1')`, reload, tap dot, read `JSON.parse(sessionStorage.getItem('hc_dot_diag_log'))`. Missing `{ type: 'dot_click' }` → handler did not run; present with no sheet motion → open/toggle or CSS issue.
6. **Hard refresh / private window** — Rule out stale `device-shell.css` vs `device-status.mjs` version mismatch.

### Likely causes (priority order)

| Priority | Cause | Symptom |
|----------|--------|---------|
| 1 | **`device-status.mjs` module load failure** | Dead on all shell pages; console import/404 errors; no `dot_click` in diag log |
| 2 | **Hub state desync** | Tap seems dead; `device-hub-sheet-open` on `body` while `#device-hub` still has `device-hub-collapsed` |
| 3 | **CSS hit-testing** | Dead when scrolled (`top-chrome--edge-hidden`) or when hub was open; works at page top after fresh load |
| 4 | **Wallet UX** | “No hub” on `/wallet/` — only scroll; subtle if already at saved section |
| 5 | **Stuck inbox backdrop** | Unlikely to block dot (backdrop z-index 56 vs chrome 60–65); verify `device-inbox-backdrop` not `.is-visible` when sheet closed |

---

## Fix directions (engineering)

Do not ship a blind “click fix” without matching the failure mode above. Preferred work, in order:

### 1. Harden module load (inbox dependency) — ✅ shipped

Since `2b5d105`, `device-status.mjs` imports `device-inbox-sheet.mjs` at top level. Any missing file or throw in that graph prevents **all** dot behavior.

- **Deploy:** Ensure Pages deploy includes every new `site/js/device-inbox*.mjs` (and `device-browser-notifications-core.mjs`) alongside HTML; bump cache-bust query on shell scripts when adding imports.
- **Runtime (shipped):** `site/js/device-status-bootstrap.mjs` dynamically imports `device-status.mjs`; on failure sets `data-device-status-error` on `#top-chrome` and logs to console. Shell pages load bootstrap (`?v=21`), not `device-status.mjs` directly.
- **CI (shipped):** `e2e/device-status-dot.spec.ts` — `status bootstrap loads and records dot_click in diagnostics`.

### 2. Hub open-state single source of truth — ✅ shipped

`hubSheetOpen()` is true if `body.device-hub-sheet-open` **or** `#device-hub` lacks `device-hub-collapsed` (`device-status.mjs`). Desync makes the first tap call `setHubExpanded(false)` with no visible change.

- Route **all** open/close paths through `setHubSheetOpen()` / `setHubExpanded()` (no direct `classList` on `body` elsewhere).
- **Reconcile (shipped):** `reconcileHubSheetState()` in `device-hub-sheet.mjs` on init and `pageshow` (bfcache) clears stuck `device-hub-sheet-open` / backdrop when hub is collapsed.
- **Diagnostics (shipped):** `hub_toggle` log entries include `bodyOpen` and `hubCollapsed`.

### 3. Preserve clickability CSS (`77816d1`) — ✅ regression E2E

Keep and regression-test in `site/css/device-shell.css`:

- `.top-chrome--float { pointer-events: none }` with `.top-chrome-bar--*` `auto`.
- `body.device-hub-sheet-open .shell-status-cluster` (and hub-locked / edge-hidden variants) `pointer-events: auto` + fixed position + `z-index: 65`.
- `#device-hub-backdrop` / `#device-inbox-backdrop`: `pointer-events: none` when closed; `hidden` + no `.is-visible` when closed (`device-hub-sheet.mjs`, `device-inbox-sheet.mjs`).

**E2E (shipped):** `dot click opens hub after scroll hides chrome bar` in `e2e/device-status-dot.spec.ts`.

### 4. Wallet clarity (product + test) — ✅ E2E

- Copy: keep `aria-label` / hint that wallet dot scrolls to saved cards, not the hub sheet.
- **E2E (shipped):** `wallet dot scrolls saved cards into view` in `e2e/device-status-dot.spec.ts`.

### 5. QA doc alignment

Update manual QA so dot tap is **hub toggle on first tap**, not glance-first — see [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) P1-3 / P2-3.

**Cross-link:** Inbox sheet and badge paths share `openInboxFromChrome()`; dot path remains `openHubFromChrome()` — [`DEVICE_INBOX.md`](DEVICE_INBOX.md) troubleshooting cross-link.

---

## Recommendation

Ship **Phase 1 + basic explainability** first (fast, low risk), then add intelligence overlays after observing behavior.

The best long-term move is not just "green for stewards" but a **trust-native status language** where users can always answer:

- What is true right now?
- Why is it true?
- What should I do next?
