# Investigation: Safari help FAB, revoke disclosure density, blank red bar

**Date:** 2026-05-26  
**Scope:** Read-only (no code changes in this pass)  
**Surfaces:** `/created/` Manage tab (`#revoke-details`, `#revoke-rules`), fixed help link (`#device-help-fab`)  
**Reporter:** macOS Safari screenshots - oversized help icon; busy revoke panel; unexplained pink/red bar  
**Related:** [`REVOKE_UI_INVESTIGATION.md`](REVOKE_UI_INVESTIGATION.md) (resolver / missing buttons), [`M4_CREATED_REVOKE_UI.md`](M4_CREATED_REVOKE_UI.md), [`SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md`](SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md)

---

## Executive summary

| Issue | Likely cause | Intentional? |
|-------|----------------|--------------|
| **Help icon huge on Mac Safari** | Fixed `#device-help-fab` SVG sizing / flex layout; icon matches `device-help-fab.mjs` markup, not Lifecycle disclosure art | **No** - layout bug |
| **Blank pink/red bar in revoke panel** | Almost certainly `#owner-revoked-banner` (`hc-notice--error`) visible with **no text**; sits between resolver check and `#revoke-actions` | **No** - empty notice chrome |
| **Revoke disclosure feels busy** | Many layers stacked in one `<details>` (live status + prefs + warnings + confirm + advanced disable) | **Partly** - product wants confirm + live status; prefs are optional power-user |

---

## 1. Help button (Mac Safari)

### What it is

The bottom-left control is **not** part of the "Lifecycle & help" row. It is injected globally by `site/js/device-help-fab.mjs` (loaded from `created-hub.mjs` on `/created/`):

```24:29:site/js/device-help-fab.mjs
  link.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <path d="M12 17h.01"/>
    </svg>`;
```

That SVG (circle + question mark + dot) matches the reporter screenshot. The "Lifecycle & help" summary uses a **book** icon in `site/created/index.html` (`#revoke-rules`), not this glyph.

### Intended styling

```5537:5562:site/styles.css
.device-help-fab {
  position: fixed;
  z-index: 38;
  left: max(14px, calc((100vw - 430px) / 2 + 14px));
  bottom: calc(env(safe-area-inset-bottom, 0px) + 14px);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  ...
}

.device-help-fab svg {
  width: 18px;
  height: 18px;
}
```

On `/created/`, `body` has `has-device-hub-search`, which only raises `bottom` to clear hub search chrome - not width.

### Why Safari macOS likely blows it up

**High-confidence hypothesis:** WebKit is not honoring the intended 36x36 / 18x18 box for this flex + inline-SVG combo, so the SVG paints at intrinsic or container size (often filling much of the column or viewport).

Contributing factors in current code:

1. **SVG has no `width` / `height` attributes** - only CSS on `.device-help-fab svg`; Safari has had more flaky behavior here than Chromium when flex is involved.
2. **Flex child defaults** - the `<svg>` inside `display: flex` `<a>` has no `flex-shrink: 0` or `max-width` guard.
3. **Fixed FAB vs scroll position** - the link is `position: fixed` on `document.body`, outside `.page` (max-width 430px). When the user scrolls Manage to "Lifecycle & help", the broken giant icon **overlaps** list content and can look like it belongs to that section.
4. **Thin red sliver above "Lifecycle & help"** (screenshot 1) may be the **top arc** of the same oversized ring, not a separate widget.

**Lower-confidence alternatives** (rule out in DevTools):

- Wrong element selected (book icon in `#revoke-rules` scaled) - icon shape in screenshot does not match that SVG.
- Stylesheet version mismatch (`styles.css?v=101` not loaded) - would affect more than the FAB.
- Dark theme only (`theme-dark.css`) - dark rules only change colors, not dimensions.

### Verification (before any fix)

On Mac Safari with Web Inspector:

1. Select the giant graphic - expect `#device-help-fab` on `<body>`.
2. Computed styles on `a#device-help-fab` and child `svg`: `width`, `height`, `flex`, `position`.
3. Compare same page in Chrome/Firefox on macOS - FAB should stay 36px.
4. Toggle `width` / `height` attributes on the SVG in the inspector - if size snaps correct, confirms WebKit CSS sizing issue.

### Fix (step 1 - shipped 2026-05-26)

- Explicit `width="18" height="18"` on the FAB SVG (`site/js/device-help-fab.mjs`).
- `.device-help-fab`: `overflow: hidden`, `flex-shrink: 0`, `contain: layout`.
- `.device-help-fab svg`: `flex-shrink: 0`, `max-width` / `max-height` 18px, `display: block`.
- Vitest: `worker/tests/device-help-fab.test.ts`.
- Shell pages: bumped `styles.css?v=` on `/`, `/created/`, `/create/`, `/wallet/`.

---

## 2. Blank pink / red bar

### DOM placement (matches screenshot 2)

Inside `#revoke-details` > `.settings-panel-action`, order is:

1. `#owner-network-status` - "Resolver check" block  
2. **`#owner-revoked-banner`** - error notice (initially `hidden`)  
3. `#owner-no-key` - unlock copy when no signing keys  
4. `#revoke-actions` - begins with `#revoke-display-prefs` ("What scanners see")

Markup:

```728:728:site/created/index.html
              <p class="hc-notice hc-notice--error form-warning owner-revoked-banner" id="owner-revoked-banner" hidden></p>
```

The blank bar in the screenshot sits **between** the resolver check box and "WHAT SCANNERS SEE" - exactly this node's slot.

### What it is for (when working)

`site/js/created-revoke.mjs` shows it after a successful revoke (or when session / status says revoked):

```176:182:site/js/created-revoke.mjs
  function showRevokedUi(kind) {
    if (revokedBannerEl) {
      revokedBannerEl.hidden = false;
      revokedBannerEl.textContent =
        kind === "card"
          ? "Card disabled. Scans may take up to a minute to update."
          : "This QR is revoked. You can still disable the whole card below.";
```

So it is **post-revoke feedback**, not a progress bar or placeholder.

### Why it appears empty (pink/red, no copy)

Styling when visible:

```5981:5984:site/styles.css
.hc-notice--error {
  background: rgba(255, 59, 48, 0.1);
  border: 0.5px solid rgba(255, 59, 48, 0.22);
}
```

Plus:

```6059:6067:site/styles.css
.hc-notice--error.form-warning,
.hc-notice--error.owner-revoked-banner {
  display: flex;
  margin: 8px 0;
  padding: 12px 14px;
  border-radius: 12px;
  ...
}
```

**High-confidence failure mode:** the banner is **laid out** (`display: flex`, padding, tinted background) but **`textContent` is empty** - reads as a blank pink/red rounded bar.

How that can happen:

| Mechanism | Notes |
|-----------|--------|
| **`hidden` not applied in practice** | Element should be hidden while card/QR active. If `hidden` is false with empty text, bar shows. |
| **`[hidden]` vs author `display: flex`** | Project has **no global** `[hidden] { display: none !important; }` (only a few component-specific `[hidden]` rules). HTML says `[hidden]` is `display: none !important`, but WebKit regressions with author `display` on the same element are worth checking on the failing Safari build. |
| **JS sets `hidden = false` without text** | Only `showRevokedUi()` sets `hidden = false` today; it always sets `textContent` in the same block. Race or future edit could regress. |
| **Stale session `revoke_state` without UI text** | `refreshLiveStatus()` calls `showRevokedUi(revokedKind)` when `session.revoke_state` exists - still sets text. |

**Lower-confidence:** disabled `#revoke-qr-btn` (`.btn-danger:disabled`) - white fill, red border, full width - but that lives **below** the fieldset, not between resolver check and "What scanners see".

### Screenshot 1 small red sliver

Between "Inspect on network" (Architecture · public JSON) and "Lifecycle & help" may be:

- The same **oversized help FAB** ring clipping between cards, or  
- Unrelated spacing - confirm in Elements panel.

### Verification (before any fix)

1. Inspect the pink bar - if `#owner-revoked-banner`, check `hidden`, `textContent`, computed `display`.
2. Active card, keys loaded: banner should have `hidden` true and **zero layout height**.
3. After revoke: banner should show one of the two strings above.
4. If bar shows on active card, trace `refreshLiveStatus()` / `showRevokedUi()` and session `revoke_state`.

### Fix (step 2 - shipped 2026-05-26)

- CSS: layout only when `.owner-revoked-banner:not([hidden])`; `[hidden]` forces `display: none !important` (WebKit vs `display: flex` fight).
- JS: `applyOwnerRevokedBanner()` sets copy before unhide; hides on active resolver status (`created-revoke-banner-core.mjs`, `created-revoke.mjs`).
- Vitest: `worker/tests/created-revoke-banner-core.test.ts`.
- `/created/`: `styles.css?v=103`.

---

## 3. Revoke disclosure complexity (can it be simplified?)

### What users open

**Primary action disclosure:** `#revoke-details` - summary "Revoke this QR" (`settings-disclosure-action`).

**Separate explainer:** `#revoke-rules` - "Lifecycle & help" (info-only, links to docs). Not the same control as revoke, but adds perceived density in Manage.

### Current stack when signing keys are present

| Block | Purpose | Required by docs? |
|-------|---------|-------------------|
| Resolver check (3 rows + hint + scan link) | Live `GET …/status` truth | **Yes** - [`M4_CREATED_REVOKE_UI.md`](M4_CREATED_REVOKE_UI.md) exit tests |
| `#owner-revoked-banner` | Post-revoke confirmation | Yes after revoke |
| `#owner-no-key` | Hidden when keys present | - |
| **What scanners see** - 2 radios | `display_mode` minimal vs tombstone | Shipped prefs; [`REVOKE_AND_LIFECYCLE_V1.md`](REVOKE_AND_LIFECYCLE_V1.md) lists richer privacy modes as not all shipped |
| **Optional reason on scan** - 6 options | `revoke_public_reason` on POST | Optional product surface |
| Orange warning notice | Sticker vs network copy | Yes - ID warnings in M4 |
| Checkbox + **Revoke this QR** | Confirm gate | **Yes** - M4 |
| **Disable entire card (advanced)** | Second confirm + button | Yes - vocabulary locked |

When keys are absent, user still sees resolver check + `#owner-no-key` but not `#revoke-actions` - can feel like "busy read-only panel" without a clear primary action.

### Why it feels busy (UX read)

1. **Two mental models in one `<details>`** - diagnostic dashboard (resolver check) plus destructive form (revoke).
2. **Prefs before action** - radios and dropdown appear above the red button; most owners only need defaults.
3. **Duplicate warnings** - resolver hint, orange `revoke-id-warning`, and Lifecycle copy elsewhere.
4. **Advanced card disable nested** - good hierarchy, but the outer panel already has many labels in all caps (kicker styling).
5. **Sibling "Lifecycle & help"** - third place for revoke education.

### Fix (step 3 - shipped 2026-05-26)

**Idea A:** Primary revoke flow first (warning, confirm checkbox, **Revoke this QR**). **What scanners see** radios and optional reason moved under **Advanced**; **Disable entire card** stays nested inside Advanced. API defaults unchanged (`minimal`, no reason). `site/created/index.html`.

### Simplification options (product / design - remaining)

Prioritized by impact vs contract risk:

| Idea | Effort | Risk to M4 / trust |
|------|--------|---------------------|
| **A. Collapse "What scanners see" + reason into Advanced** - default minimal, no reason | Low | **Shipped** (step 3) |
| **B. Move resolver check to Now tab** - revoke panel = confirm + button only | Medium | Low if status still reachable before revoke |
| **C. Progressive revoke** - step 1 checkbox, step 2 button; hide prefs until "Customize scan message" | Medium | Low |
| **D. Single warning line** - merge orange notice with resolver footer hint | Low | Low |
| **E. Fold Lifecycle & help into `/help/`** - one less disclosure on Manage | Low | None on crypto |
| **F. Reason dropdown → short text field or remove until >1 reason needed** | Low | Low |

**Do not drop without doc updates:** checkbox confirm, live status before revoke, **Revoke this QR** / **Disable card** labels ([`REVOKE_AND_LIFECYCLE_V1.md`](REVOKE_AND_LIFECYCLE_V1.md)).

### Suggested target layout (reference)

```
Revoke this QR  [disclosure]
  Resolver check (compact - 1 line summary + "Details" expando)
  [revoked banner if applicable]
  I understand - revoke this scan QR only  [checkbox]
  [Revoke this QR]  (primary)
  Advanced v
    What scanners see (radios + reason)
    Disable entire card (existing nested block)
```

---

## 4. Cross-reference to prior revoke investigation

[`REVOKE_UI_INVESTIGATION.md`](REVOKE_UI_INVESTIGATION.md) (2026-05-25) already noted an "empty pink/red bar" with low confidence. This pass **narrows it to `#owner-revoked-banner`** based on DOM order and `hc-notice--error` tint matching the screenshot.

That doc's other findings (missing buttons without keys, stuck "Checking…" when bootstrap fails) remain valid and are **orthogonal** to the help FAB and empty banner issues.

---

## 5. Files to touch when implementing fixes

| Issue | Primary files |
|-------|----------------|
| Help FAB Safari | `site/js/device-help-fab.mjs`, `site/styles.css`, optional `e2e/` or `worker/tests/` layout assertion |
| Blank banner | `site/created/index.html`, `site/styles.css`, `site/js/created-revoke.mjs` |
| Revoke simplification | `site/created/index.html`, `site/styles.css`, `site/css/device-shell.css`, `docs/M4_CREATED_REVOKE_UI.md`, tests touching revoke flow |

---

## 6. QA checklist (after fixes)

- [ ] Mac Safari: `#device-help-fab` <= 40px box on `/`, `/created/`, `/create/`, `/wallet/` (fix shipped - confirm on device)
- [ ] Mac Safari: open `#revoke-details` on active card - no empty pink bar (fix shipped - confirm on device)
- [ ] Mac Safari: after revoke QR - banner shows full sentence
- [ ] Chromium regression: `e2e/device-status-dot.spec.ts` + created/revoke paths if added
- [ ] Manual: [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) Manage revoke flow with keys

---

## Answer to reporter questions

**Help button:** Broken rendering of the global `#device-help-fab`, not the Lifecycle row icon. Safari likely ignores intended SVG dimensions inside the fixed flex FAB.

**Blank red bar:** Intended post-revoke notice `#owner-revoked-banner`, appearing as empty error-styled chrome between resolver check and revoke form - not a separate product feature.

**Simplify revoke dropdown?** Yes, with care: collapse display prefs and optional reason into Advanced, shorten resolver block, and reduce duplicate warnings - without removing confirm checkbox or live status contract.
