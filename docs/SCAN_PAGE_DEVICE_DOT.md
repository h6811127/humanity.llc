# Scan page device dot (progressive chrome)

**Status:** Phase 8.1–8.7 shipped (`pass-v31`)  
**Audience:** Product, design, frontend implementers  
**Scope:** Page chrome on public scan HTML (`GET /c/{profile_id}?q={qr_id}`) — `#scan-page-dot` in `renderScanPageChrome()`  
**Related:** [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md) · [`M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md) · [`SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) · [`VOUCH_READY_KEYS_DESIGN.md`](VOUCH_READY_KEYS_DESIGN.md) · [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) · [`CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md`](CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md)

---

## Problem

**Shipped (`pass-v26`):** Scan page chrome is a **static** brand-red dot that links home. It does not reflect the viewer’s device, network, or signing readiness.

**Gap for operators:** Stewards and vouch-ready users open scan links to attest or manage live proof. Their real state already exists in the product model (`device-dot-state-core.mjs`) and in lower-page UI (vouch explainer, `#scan-cross-tab-banner`), but the top corner does not help them discover “your device” vs “this object” without scrolling.

**Risk if done naively:** Most scan viewers are strangers. An animated or green dot in the corner is easily read as **the scanned card’s status**, which duplicates the hero status strip and violates scan calm (`SCANNER_EXPERIENCE.md` § Motion).

**Goal:** Make the chrome dot a **progressive “your device on this scan”** signal for viewers who might sign — without turning scan into a device dashboard or importing the full hub sheet on Worker HTML.

---

## Product principles

1. **Object vs device:** Hero status strip and pills describe the **scanned object**. Page chrome dot describes **this browser tab’s** signing/network readiness only. Copy must say “your device” / “this tab,” never imply the dot colors the card being viewed.
2. **Progressive, not universal:** Strangers keep the current static brand dot. Dynamic semantics activate only when local eligibility says this viewer may sign on this page.
3. **Reuse trust vocabulary:** Same network × device × overlay model as the shell dot (`STATUS_INDICATOR_STEWARD_GREEN.md`). No parallel color language.
4. **Calm for strangers, urgent for operators:** No infinite decorative pulse on scan. Pulse only when this tab can take a concrete action (keys available but not loaded, cross-tab conflict, live proof waiting).
5. **Never color-only:** `aria-label` on the control and tap explainer use **Now / Why / Next** from `describeDotState()` with `pageKind: "scan"`.
6. **Do not open the hub from scan:** Tap opens a **scan glance** (lightweight dialog) or scrolls/focuses in-page actions — not `openHubFromChrome()` (leaves the scan context).

---

## Three trust layers on one page (do not merge)

| Layer | Surface | Question answered |
|-------|---------|-------------------|
| **Network object** | Live check hero: status strip, pills, resolver line | Is **this QR / card** active, revoked, vouched, etc.? |
| **Viewer device** | Page chrome dot (+ optional scan glance) | Can **I** sign or vouch from **this tab** right now? |
| **Urgent cross-tab** | `#scan-cross-tab-banner` | Are keys active in **another tab** on this device? |

**Division of labor:**

| Surface | Role |
|---------|------|
| **Chrome dot** | Persistent, at-a-glance **viewer** state when eligible |
| **Cross-tab banner** | **Urgent** conflict; actions “Open that tab” / “Open controls here” |
| **Vouch block** | Full explainer, picker, submit, “Use keys here,” “Stop” |

The dot is for **discovery** at the top of a long page. It must not replace the vouch explainer or duplicate banner sentences verbatim.

---

## Progressive activation (eligibility gate)

Dynamic dot behavior turns on only when **at least one** is true (exact helpers should match vouch-ready and inbox gather logic):

| Signal | Meaning |
|--------|---------|
| `hc_created` has owner keys for a profile eligible to vouch on this scan | Operator already in tab |
| `hc_wallet` has ≥1 saved row eligible to vouch (steward / vouched human per network rules) | Could activate without leaving scan |
| `hc_default_vouch_profile_id` set and wallet row exists | Opt-in vouch-ready path |
| Cross-tab presence: other tab holds keys (`shouldShowCrossTabKeysNotice`) | Urgent overlay path |
| Live proof pending for a saved card on this device (inbox) | Overlay `proof_waiting` |

**Stay static (brand-only)** when:

- No saved wallet rows and no `hc_created` keys, **and** no cross-tab / live-proof signals, **and** scan is not an active vouch surface (e.g. inactive scan kinds).
- First paint before local read completes: show static dot until eligibility is known (avoid flash of “no keys” for strangers).

**Privacy (shipped Phase 8.6):** Dynamic mode requires `hc_scan_operator_familiar` on the origin (set on first wallet save; backfilled when `hc_wallet` already has rows). Tab-only keys or vouch-ready prefs without a saved wallet stay **static** until the user has saved at least once on this device.

---

## State model (reuse shell)

Use the same axes as `site/js/device-dot-state-core.mjs`:

- **Network:** `ok` | `degraded` | `offline` (resolver health gate; respect `navigator.onLine` vs stale HTML — align with `#scan-offline-banner`)
- **Device:** `none` | `keys` | `unsaved` | `steward` (from tab session + wallet + steward verification on active profile)
- **Overlay:** `none` | `proof_waiting` | `cross_tab_keys` on scan (`card_disabled_since_visit` is **shell/inbox only** — Phase 8.7)

Apply classes via `dotClassList(network, device, overlay)` and expose `data-dot-state` / `data-dot-overlay` on the dot element for tests.

### Scan-specific semantics (device axis)

| Device | Viewer meaning on scan | Typical chrome visual |
|--------|------------------------|-------------------------|
| `none` | Resolver reachable; **no signing keys in this tab**; may have saved cards elsewhere | **Hollow red ring** (see Visual spec) when eligibility gate is on |
| `keys` | Saved keys on device; session may or may not be active — clarify in glance | Solid red |
| `unsaved` | Tab has keys not saved to wallet | Solid red + urgency pulse (same as shell) |
| `steward` | Steward-capable keys in this tab context | Solid **green** |

**Do not use hollow ring to mean “resolver request in flight.”** Loading is a separate transient (below).

### Overlay agreement

When `#scan-cross-tab-banner` is visible, the dot **must** show `cross_tab_keys` overlay (blue notch per shell CSS) so dot and banner agree. Banner carries the sentence; dot carries the notch.

---

## Visual spec

Implement in `site/scan-pass.css` (bundled to Worker). Reuse shell tokens from `site/styles.css` / `device-shell.css` where possible.

### Default (ineligible viewer)

| Element | Spec |
|---------|------|
| Control | `<a class="scan-page-dot" href="…/">` or button with home as secondary action |
| Dot | Solid `var(--red)` 10px, no pulse, no overlay |
| `aria-label` | `humanity.llc home` (unchanged from `pass-v26`) |

### Operator mode (eligible viewer)

| State | Dot | Pulse |
|-------|-----|-------|
| Loading local/resolver context | Hollow **gray** ring or reduced-opacity ring | None, or single 300ms fade-in when resolved |
| `ok` + `none` | **Hollow red ring** (2px stroke, transparent fill) | One-shot attention pulse on **transition into** `none` from unknown; then steady hollow. Under `prefers-reduced-motion`: no pulse |
| `ok` + `keys` | Solid red | None |
| `ok` + `unsaved` | Solid red + shell ring shadow | Slow pulse (reuse `brand-dot-pulse`) |
| `ok` + `steward` | Solid green `#22c55e` | Optional one-time steward celebrate (same as shell); respect reduced motion |
| `degraded` / `offline` | Gray / amber per shell network classes | None |
| Overlay `cross_tab_keys` | `pass-dot-overlay-cross_tab_keys::after` | None on overlay |

**Hollow ring CSS sketch (contract for implementers):**

```css
.pass-dot-status-device-none-eligible {
  background: transparent;
  box-shadow: inset 0 0 0 2px var(--red);
}
```

Class name is illustrative; ship the smallest diff that matches shell naming (`pass-dot-status-network-ok.pass-dot-status-device-none` plus an eligibility modifier).

### Anti-patterns

- Hollow or pulsing dot for **every** scan visitor
- Green dot without steward keys in tab (false readiness)
- Three competing “status” glyphs: chrome dot animation + hero strip + trust pill all pulsing
- Hero host dot animating in sync with chrome (hero dot stays **brand-static**)

---

## Motion (scan-specific)

| Rule | Detail |
|------|--------|
| Hero card | Keep **one-shot** border pulse on live check complete (`SCANNER_EXPERIENCE.md`) — independent of chrome dot |
| Chrome dot | No infinite pulse except `unsaved` and agreed cross-tab urgency; prefer one-shot on enter `none-eligible` |
| Reduced motion | Disable celebration and urgency loops; hollow/solid distinction remains |

---

## Interaction: scan glance (not hub)

Replace home-only link for **eligible** viewers with a `<button type="button" class="scan-page-dot">` (home available inside glance or as secondary link).

**Tap behavior:**

1. Toggle **scan glance** popover (`role="dialog"`, `aria-labelledby`) anchored to the dot.
2. Content: three lines from `describeDotState(..., { pageKind: "scan" })` — **Now / Why / Next**.
3. Primary action (one button), chosen by state:
   - `none` + wallet eligible → **Use keys here** (same as vouch explainer; scroll to vouch if already visible)
   - `cross_tab_keys` overlay → **Open that tab** / **Open controls here** (mirror banner actions)
   - `steward` → scroll to vouch or **Open steward queue** when URL known
   - `proof_waiting` → scroll to live control / open owner flow on created
4. Secondary: **humanity.llc home** link.
5. **Do not** import `device-hub-sheet.mjs` or `#device-hub` on Worker HTML.

**Keyboard:** Escape closes glance; focus trap minimal (single popover).

---

## Copy (`pageKind: "scan"`)

Extend `describeDotState()` / `statusAriaLabel()` in `device-dot-state-core.mjs` with scan-specific **Next** lines (examples — finalize in implementation):

| State | Now (example) | Next (example) |
|-------|---------------|----------------|
| `none` | No signing keys in this tab. | Use keys here to vouch, or create a card. |
| `keys` | Keys saved on this device. | Scroll to vouch or open your card controls. |
| `steward` | Steward ready on this device. | Scroll to vouch or open steward review. |
| Overlay cross-tab | Keys active in another tab. | Open that tab or load keys here. |

**ARIA:** Prefix with `Your device:` so it cannot be confused with hero `aria-label="Live check"`.

---

## Wiring and modules (implementation plan)

Today `site/js/scan-tab-keys.mjs` starts `device-chrome-refresh.mjs` but **does not** register `setRefreshStatusSurfaces()` — so the chrome dot never updates.

**Recommended (lightweight):**

| Piece | Role |
|-------|------|
| `site/js/scan-page-dot.mjs` | Eligibility gate, gather context, apply `dotClassList`, update `aria-label`, wire glance |
| `device-dot-state-core.mjs` | Pure state + copy (extend `pageKind: "scan"`) |
| `device-chrome-refresh.mjs` | `setRefreshStatusSurfaces(refreshScanPageDot)` from scan module |
| `worker/src/resolver/scan-html.ts` | Markup: button + `#scan-page-dot` inner span + `#scan-page-dot-glance` container; keep static HTML fallback before module loads |
| `site/scan-pass.css` | Hollow ring, glance popover (use `--surface-popover-*` per [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md)) |

**Do not** add `device-status.mjs` to the scan module graph (heavy, hub coupling, status-dot load-failure risk — see [`STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md`](STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md)).

**Versioning:** Bump `scan-tab-keys.mjs` or new module `?v=` and `SCAN_UI_VERSION` when behavior ships (`pass-v28` or next).

### Phases

| Phase | Deliverable | Tests |
|-------|-------------|-------|
| **1** | Eligibility gate + dynamic classes + `aria-label` only; tap still home | **Shipped** (`pass-v28`) — `scan-page-dot.mjs`, `scan-page-dot-core.mjs`, `worker/tests/scan-page-dot-core.test.ts` |
| **2** | Scan glance + primary actions (scroll / use keys) | **Shipped** (`pass-v29`) — `scan-page-dot-glance-core.mjs`, glance markup in `scan-html.ts`; `npm run worker:test:scan-page-dot` |
| **3** | Hollow ring + one-shot pulse; overlay sync with banner | **Shipped** (`pass-v30`) — `shouldScanNoneEligibleAttentionPulse`, `scanCrossTabOverlayCount`, `scan-none-dot-attention` CSS |
| **4** | Hero host demotion: text-only wordmark inside card (chrome dot only) | **Shipped** (`pass-v31`) — `renderScanHeroHost()`, `.scan-hero-wordmark`; `scan-hero-snapshot.test.ts` |
| **5** | Playwright E2E (stranger static, steward glance, cross-tab overlay) | **Shipped** — `e2e/scan-page-dot.spec.ts`, `site/e2e-fixtures/scan-active.html`; `npm run e2e:scan-page-dot` |
| **6** | Operator-familiar privacy gate (`hc_scan_operator_familiar`) | **Shipped** — `scan-operator-familiar.mjs`, `scanPageDotEligible` + wallet save hook |
| **7** | `card_disabled_since_visit` overlay inbox-only on scan | **Shipped** — `scanDotOverlayFromCounts()` drops since-visit; shell/inbox unchanged |

Worker/API: **no change** — all state is client-side.

---

## Relationship to `pass-v26`

`pass-v26` removed duplicate **brand** chrome (frosted bar + wordmark). This spec **keeps** dot-only chrome for strangers and **adds meaning** to the same control for operators. It does not restore the top wordmark row.

---

## Accessibility

- Remove `aria-hidden="true"` from the semantic dot when dynamic mode is active; label lives on the **button**.
- Hollow vs solid must be explained in text (not hue alone).
- Glance popover meets contrast for `--surface-popover-*`.
- Respect `prefers-reduced-motion` for all pulses.

---

## Test plan

**Unit:** `device-dot-state-core` scan `pageKind` strings; eligibility helper (wallet empty → static).

**Worker HTML:** `scan.test.ts` asserts `#scan-page-dot`, glance container present; optional fixture session injects `data-dot-state`.

**E2E (Playwright):** `npm run e2e:scan-page-dot` — static fixture `site/e2e-fixtures/scan-active.html` (regenerate: `npm run site:generate-scan-e2e-fixture`). Covers stranger static dot, steward dynamic + glance (no hub), hero wordmark-only, cross-tab overlay + banner agreement.

**Manual:** M5 stranger path — dot must stay static. Steward path — dot matches vouch strip; tap glance does not navigate away until user chooses home.

---

## Non-goals

- Full device hub sheet on `/c/…` Worker HTML
- Server-side “viewer role” in scan HTML (no steward flag in D1 for the scanner)
- Dot as numeric notification bell
- Auto-submit vouch when dot turns green
- Replacing `#scan-cross-tab-banner` with dot-only messaging

---

## Open questions

1. **Eligibility privacy gate** — **Resolved (Phase 8.6):** yes — `hc_scan_operator_familiar` after first wallet save.
2. **Home default** — **Resolved (Phase 8.2):** glance-first for eligible viewers; **humanity.llc home** link inside glance.
3. **Hero host dot** — **Resolved (`pass-v31`):** text-only `<p class="scan-hero-wordmark">` in card; brand dot in page chrome only.
4. **`card_disabled_since_visit` on scan** — **Resolved (Phase 8.7):** inbox-only on shell pages; scan dot uses `proof_waiting` + `cross_tab_keys` overlays only.

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-05-26 | Spec authored: progressive scan chrome, hollow ring for `ok`+`none` when eligible, scan glance not hub, reuse shell dot model |
| 2026-05-26 | Phase 8.1–8.2 implemented: `scan-page-dot.mjs`, glance popover, `pass-v29` |
| 2026-05-26 | Phase 8.3: one-shot hollow-ring pulse, cross-tab overlay aligned with scan banner, `pass-v30` |
| 2026-05-26 | Phase 8.4: hero host text-only wordmark; brand dot in page chrome only, `pass-v31` |
| 2026-05-26 | Phase 8.5: Playwright E2E + generated scan fixture for Pages-only CI |
| 2026-05-26 | Phase 8.6: operator-familiar privacy gate before progressive dot |
| 2026-05-26 | Phase 8.7: since-visit overlay suppressed on scan (shell/inbox only) |

---

## References

- `worker/src/resolver/scan-html.ts` — `renderScanPageChrome()`
- `site/js/scan-tab-keys.mjs` — chrome refresh entry on scan
- `site/js/device-cross-tab-banner.mjs` — `#scan-cross-tab-banner`
- `site/js/vouch-issue.mjs` — vouch gate and “Use keys here”
- `site/js/device-dot-state-core.mjs` — canonical dot semantics
- `docs/M3_SCAN_PAGE_UI.md` — Phase 7 (static dot shipped); Phase 8 (this spec)
