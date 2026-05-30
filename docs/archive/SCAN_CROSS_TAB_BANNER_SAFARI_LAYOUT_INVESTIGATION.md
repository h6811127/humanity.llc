# Scan cross-tab banner Safari layout — investigation

**Reported:** 2026-05-26 — On Safari (macOS + iPhone), `#scan-cross-tab-banner` (“Keys in another tab”) shows cramped CTAs: pills almost touching, weak bottom padding, gray native-looking buttons instead of brand pills.

**Status:** Scan + shell fixes shipped (remediation steps 1–7). Landing `#device-cross-tab-banner` and `#wallet-tab-hint` use the same stacked layout as scan (`site/styles.css`).

**Surfaces:** Worker scan HTML (`worker/src/resolver/scan-html.ts`) + `site/js/device-cross-tab-banner.mjs` + bundled CSS (`site/scan-pass.css` + `site/css/hc-emphasis-card.css` via `npm run worker:bundle-scan`).

**Related:** [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) Phase 2 · [`SCAN_PAGE_DEVICE_DOT.md`](SCAN_PAGE_DEVICE_DOT.md) · [`CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md`](CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md)

---

## Symptom

| Observation | Detail |
|---------------|--------|
| Cramped CTAs | “Open that tab” and “Open controls here” sit flush with almost no horizontal gap |
| Weak bottom inset | Action row feels clipped against the card bottom |
| Gray pills | Both actions look like system gray buttons, not red / secondary emphasis pills |
| Browsers | Reproducible on **Safari macOS** and **Safari iOS**; Chromium desktop shows correct spacing and red primary CTA |
| Page | Scan resolver only (`#scan-cross-tab-banner`); wallet shell uses the same `hc-emphasis-card` primitives but wider layout |

---

## Architecture (what renders the banner)

1. Empty host in scan HTML: `#scan-cross-tab-banner.scan-cross-tab-banner` (`scan-html.ts`).
2. `scan-tab-keys.mjs` loads `device-chrome-refresh.mjs` → `renderCrossTabKeysBanner()` in `device-cross-tab-banner.mjs`.
3. When another tab holds keys, `renderScanCrossTabNotice()` sets:
   - Classes: `hc-emphasis-card hc-emphasis-card--info scan-cross-tab-banner`
   - Markup via `emphasisCardBodyHtml()` + `emphasisCardActionsHtml()` (`device-emphasis-card-html.mjs`).
4. CSS delivery: inline `SCAN_PASS_CSS` = `scan-pass.css` + concatenated `hc-emphasis-card.css` (no `@import` at runtime).

Markup shape:

```html
<div class="hc-emphasis-card hc-emphasis-card--info scan-cross-tab-banner" id="scan-cross-tab-banner">
  <div class="hc-emphasis-card__main">…</div>
  <div class="hc-emphasis-card__actions">
    <button class="hc-emphasis-card__cta" data-cross-tab-action>…</button>
    <button class="hc-emphasis-card__cta" data-cross-tab-use-keys>…</button>
  </div>
</div>
```

---

## Root causes

### 1. WebKit native `button` appearance (gray pills)

`.hc-emphasis-card__cta` sets `background`, `border`, and `font: inherit` on `<button>` elements but did **not** set `appearance: none` / `-webkit-appearance: none`.

On Safari, `appearance: auto` keeps the UA button chrome, which:

- Overrides intended red / secondary fills (reads as light gray pills in the report).
- Uses UA padding/metrics that do not match the flex `gap` layout used elsewhere on scan (e.g. `.scan-actor-band-*`).

Chromium often still paints the author `background` with `appearance: auto`; WebKit is stricter.

### 2. Flex wrap + `flex: 1 1 12rem` on `__main` (cramped row on narrow scan width)

`.hc-emphasis-card` is a wrapping row flex container (`justify-content: space-between`, `align-items: flex-end`).

`.hc-emphasis-card__main` uses `flex: 1 1 12rem`. Per [flexbugs #1](https://github.com/philipwalton/flexbugs#1-min-and-max-size-declarations-are-ignored-when-wrapping-flex-items), **WebKit can compute wrap breaks from `flex-basis` while sizing from `min-width`**, so on a ~350px scan column it may try to place **copy + a ~260px-wide action group on one line**, then compress the action row.

Effects:

- Inner `gap: 8px` on `__actions` fails visually when flex items overflow (overlap / zero perceived gap).
- `align-items: flex-end` on the card makes the squeezed action row sit on the bottom edge → “no bottom padding” look.

Scan pages are always narrow (`max-width: 430px`); wallet / landing banners have more horizontal room, so the bug shows up mainly on scan.

### 3. Product inconsistency (secondary CTA)

Wallet `#wallet-tab-hint` uses **primary** + **`hc-emphasis-card__cta--secondary`** for “Open controls here”. Scan JS used **two primary** `emphasisCardCtaButton()` calls. This did not cause the overlap alone but made the banner look unlike other cross-tab surfaces once WebKit appearance was fixed.

---

## Remediation steps (apply in order)

| Step | Action | Files |
|------|--------|-------|
| **1** | Reset button rendering on emphasis CTAs: `appearance: none`, `-webkit-appearance: none`, `display: inline-flex`, center alignment | `site/css/hc-emphasis-card.css` |
| **2** | Replace flex `gap` on `__actions` with wrap-safe spacing (`margin: -4px` on container, `margin: 4px` on children) so WebKit always gets 8px between pills even when `gap` misbehaves | `site/css/hc-emphasis-card.css` |
| **3** | Force **stacked** layout on scan banner: `flex-direction: column`, `align-items: stretch`, full-width `__main` and `__actions`, `justify-content: flex-start` on actions | `site/scan-pass.css` |
| **4** | Match wallet: second scan CTA uses `emphasisCardCtaSecondary()` | `site/js/device-cross-tab-banner.mjs` |
| **5** | Regenerate Worker inline CSS: `npm run worker:bundle-scan` | `worker/src/resolver/scan-pass-styles.ts` |
| **6** | Tests: `npm run worker:test -- worker/tests/device-emphasis-card-html.test.ts` and scan/cross-tab tests | Vitest |
| **7** | Manual QA (Safari macOS + iPhone): open scan with keys in another tab; confirm 8px+ between pills, red primary + secondary second pill, even bottom padding | `docs/DEVICE_OS_QA.md` — add row if needed |

---

## Verification checklist

- [x] Two CTAs have visible horizontal spacing (not touching).
- [x] “Open that tab” uses brand red pill; “Open controls here” uses secondary pill (matches wallet tab hint).
- [x] Card keeps 14px padding; action row not clipped on bottom.
- [x] Chromium regression: wallet active banner still shows side-by-side main + CTA on wide shell pages.
- [x] After CSS edits touching scan bundle: `npm run worker:bundle-scan` committed or run in deploy pipeline.
- [x] Shell surfaces: `#device-cross-tab-banner`, `#wallet-tab-hint` stacked layout in `site/styles.css`.

Manual sign-off: **P1-CT** in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) · **P1-SD** step 4b (scan).

---

## Automated WebKit regression (shipped)

**Spec:** `e2e/scan-cross-tab-banner-webkit.spec.ts`  
**Projects:** `webkit` (Desktop Safari), `iphone-13-pro` in `playwright.config.ts`  
**CI:** `.github/workflows/test-site.yml` (with `npx playwright install webkit`)  
**Local:** `npm run e2e:safari` or `npm run e2e -- e2e/scan-cross-tab-banner-webkit.spec.ts --project=webkit`

Asserts stacked `flex-direction: column`, `-webkit-appearance: none`, red primary + secondary class, ≥6px horizontal gap between CTAs on `#scan-cross-tab-banner` and `#wallet-tab-hint`.

Regenerate scan fixture after `scan-pass.css` changes: `npm run site:generate-scan-e2e-fixture`.
