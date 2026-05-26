# Status Indicator: Steward Green + Intelligent Trust Dot

**Status:** Proposed  
**Owners:** Device shell + resolver trust UX  
**Scope:** `site/js/device-status.mjs`, `site/styles.css`, `site/js/device-counts.mjs`, status key copy in hub/wallet/created

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

## UX behavior by context

### Landing (`/`)
- Dot opens hub glance/popover.
- Popover first row explains current dot state in plain language.
- If steward-ready, primary quick action becomes "Open steward queue" (if queue exists), otherwise "Open controls."

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
- E2E: seeded steward wallet shows bright green on landing and wallet.
- E2E: degraded/offline suppresses green even with steward keys.
- A11y: reduced-motion behavior and text alternatives validated.

---

## Acceptance criteria (MVP)

- With steward-ready keys and healthy resolver, dot is bright green on all device-shell pages.
- Status key + popover text explicitly explain steward readiness.
- Degraded/offline always override green.
- Existing red/amber/gray semantics continue to work unchanged for non-steward users.

---

## Open questions before build

- Exact steward-role source in local key metadata: existing wallet shape vs derived resolver call?
- Should steward green appear for unsaved in-tab steward keys, or only saved keys?
- Should "Open steward queue" deep-link to a dedicated review page now or later?
- Final green token selection to maintain brand consistency and contrast in light/dark surfaces.

---

## Recommendation

Ship **Phase 1 + basic explainability** first (fast, low risk), then add intelligence overlays after observing behavior.

The best long-term move is not just "green for stewards" but a **trust-native status language** where users can always answer:

- What is true right now?
- Why is it true?
- What should I do next?
