# Scan hero card — visual spec (live check)

**Status:** Active — **v3 glass step 1 shipped**: tier-4 frosted plate tokens + fallbacks; settle pulse unchanged. Prior **v2 depth complete** (`pass-v33`). Optional: spot-check on physical iPhone if WebKit CI green — [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) P1-SD steps 8–9.  
**Audience:** Product, design, frontend  
**Component name:** **Live check hero** (resolver plate)  
**Related:** [`SCAN_PAGE_TRUST_UI.md`](SCAN_PAGE_TRUST_UI.md) (motion) · [`M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md) (layout) · [`SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) (copy IA) · [`VISUAL_IDENTITY_PRINCIPLES.md`](VISUAL_IDENTITY_PRINCIPLES.md) · [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) (Beat 2 notary — no hoodie fork, no loop bubble) · [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md) § Emphasis notice cards · [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md)

---

## What this is

The **primary trust surface** on `GET /c/{profile_id}?q={qr_id}`: a single `<article>` that shows resolver truth for **this** QR at scan time. It is **not** the legacy flippable pass card (`.pass-tilt-wrap` / `.pass-flip`) and **not** a device OS notice (`.hc-emphasis-card`).

Strangers should read object state from **inside this card** (status strip + H1 + limits). The page-chrome dot is only the humanity.llc **mark** (L1), not object status — see [`SCAN_PAGE_TRUST_UI.md`](SCAN_PAGE_TRUST_UI.md).

---

## Visual tier (depth system)

Humanity uses a **raised-surface** language (inset highlights + outer drop). Apply it in **tiers** so scan stays calm and hierarchy stays obvious.

| Tier | Surface | Role | Elevation |
|------|---------|------|-----------|
| **0** | Page background (`.page`) | Canvas | Flat |
| **1** | Trust modules, collapsible groups, footnotes | Supporting copy | Flat or hairline list |
| **2** | L3 actor band (`.scan-actor-band`) | Viewer actions after settle | Light tint + hairline border |
| **3** | Device emphasis cards (`.hc-emphasis-card`) | Keys / cross-tab / wallet notices | `--hc-emphasis-card-shadow`, 14px radius |
| **4** | **Scan hero** (this doc) | L2 live check / resolver plate | **Largest** card on page; deeper than tier 3 |

**Rule:** Only **one** tier-4 hero per scan page. Do not give trust-module sections the same shadow stack as the hero.

**3D dialect:** Use **shadow-depth** (emphasis-card family). Do **not** use perspective tilt, idle sway, or front/back flip on the live check hero — that reads as passport / toy and fights Path 2 motion.

---

## Markup contract (shipped)

Rendered by `renderScanHeroSection()` in `worker/src/resolver/scan-html.ts`:

```html
<article
  class="scan-hero scan-status-panel scan-safety-header scan-live-check--pending"
  id="scan-safety-header"
  aria-label="Live check"
>
  <header class="scan-hero-head">…</header>
  <div class="scan-hero-body">…</div>
  <!-- arrive-staggered rows -->
  <p class="scan-safety-resolver scan-arrive-item …">…</p>
  <p class="scan-hero-limit scan-arrive-limits …">…</p>
  <ul class="scan-safety-chips scan-hero-details scan-arrive-item …">…</ul>
  <p class="scan-safety-first-seen" id="scan-safety-first-seen" hidden></p>
  <p class="scan-hero-foot">…</p>
  <details class="scan-hero-qr-details">…</details>
</article>
```

| Class | Purpose |
|-------|---------|
| `.scan-hero` | Live check hero layout + typography |
| `.scan-status-panel` | Panel shape (radius, padding); historical name |
| `.scan-safety-header` | Scanner-safety lineage; settle pulse target |
| `.scan-live-check--pending` | First-paint “checking” state (removed on settle) |
| `.scan-arrive-item` / `.scan-arrive-limits` | Path 2 stagger + limits reveal |

Page chrome (outside the card): `.scan-page-chrome` → `.scan-page-dot` only (`pass-v26`).

---

## Anatomy (zones)

Top-to-bottom inside the hero — matches production layout (e.g. live object demo scan).

| Zone | Element | Content |
|------|---------|---------|
| **Head** | `.scan-hero-head` | **Host** `.scan-hero-host.scan-hero-wordmark` (`humanity.llc`, muted lowercase) · **Status strip** `.scan-safety-strip` (pill, top-right in head) |
| **Body** | `.scan-hero-body` | **H1** `.scan-hero-title` and/or `.scan-hero-line` · **Steward** `.scan-hero-steward` · trust pills on personal cards (`.scan-hero-trust`) |
| **Proof row** | `.scan-safety-resolver` | Green line: “Signed object verified by resolver” (when applicable); arrive-staggered |
| **Level 0** | `.scan-hero-limit` | Single bearer / does-not-prove sentence; separated by top border; arrive-revealed |
| **Meta chips** | `.scan-safety-chips` | Uppercase pills: REVOCABLE, ISSUED …, ON HUMANITY NETWORK |
| **Foot** | `.scan-hero-foot` / `.scan-safety-first-seen` | First-seen / scan foot copy (muted 12px) |
| **QR (demoted)** | `.scan-hero-qr-details` | Collapsed `<details>`; QR max ~88px when open |

Below the hero (not part of this component): L3 `.scan-actor-band`, then “What this scan shows”, limits `<details>`, trust groups.

---

## Surface & depth

### Shipped (v3 step 1 — tier-4 glass plate)

| Property | Value | Notes |
|----------|-------|-------|
| Background (default) | `var(--hc-scan-hero-fill-glass)` | More opaque than tier-3 emphasis glass — trust surface |
| Backdrop | `var(--hc-scan-hero-backdrop)` | `blur(18px) saturate(1.12)` on hero only |
| Fallback | `var(--hc-scan-hero-fill)` | `@supports not (backdrop-filter)` + `prefers-reduced-transparency: reduce` |
| Border | `0.5px solid var(--hc-scan-hero-border)` | Unchanged hairline |
| Radius | **18px** | Unchanged |
| Shadow | `var(--hc-scan-hero-shadow)` | Tier 4 — deeper than emphasis card |
| Settle motion | `scan-hero-settle-pulse` | Unchanged — red ring layered on hero shadow |

### Shipped (v2 — resolver plate depth)

| Property | Value | Notes |
|----------|-------|-------|
| Background | `var(--hc-scan-hero-fill)` | Neutral gradient plate; opaque |
| Border | `0.5px solid rgba(60, 60, 67, 0.14)` | Hairline; settle pulse tints red briefly |
| Radius | **18px** (`.scan-status-panel`) | Larger than emphasis card (14px) |
| Padding | **22px 20px 18px** (`.scan-hero.scan-status-panel`) | Per [`VISUAL_IDENTITY_PRINCIPLES.md`](VISUAL_IDENTITY_PRINCIPLES.md) 24–28px intent |
| Shadow | `var(--hc-scan-hero-shadow)` | Tier 4 inset + outer stack — see `:root` in `scan-pass.css` |
| Settle motion | `scan-hero-settle-pulse` | Ring layers **on top of** hero shadow; returns to rest stack at 100% |
| Margin below hero | **18px** (`.scan-hero.scan-safety-header`) | Before actor band or trust modules |

CSS: `site/scan-pass.css` (`.scan-hero.scan-status-panel`). Bundled via `npm run worker:bundle-scan`.

Non-hero `.scan-status-panel` (e.g. scan-out) keeps the lighter v1 shadow stack.

### Dark mode (shipped step 3)

| Property | Value |
|----------|-------|
| Preference | `localStorage.hc_theme` = `dark` (inline bootstrap in Worker scan HTML; same as shell pages) |
| Tokens | `--hc-scan-hero-fill`, `--hc-scan-hero-border`, dark `--hc-scan-hero-shadow` on `html[data-theme="dark"]` |
| CSS | `site/css/theme-dark.css` (Pages + prototype with theme sheet) · mirrored in bundled `scan-pass.css` |
| Copy | Hero title/line → `--hc-emphasis-card-title-fg`; steward/limit/foot → `--hc-emphasis-card-detail-fg` |

**Differentiation from `.hc-emphasis-card`:**

| | Emphasis card (tier 3) | Scan hero (tier 4) |
|--|------------------------|---------------------|
| Size | Compact notice | Full-width plate |
| Fill | Modifier glass (~0.68–0.78 α) | Neutral glass (~0.84–0.9 α) + stronger shadow |
| Semantic frame | Eyebrow + dot modifier | Neutral surface; **strip** carries state |
| Motion | Static | Path 2 arrive + one-shot settle pulse |
| CTA | In-card pill common | CTAs in L3 actor band or page footer |

---

## Typography

| Role | Selector | Size / weight | Color (light) |
|------|----------|---------------|---------------|
| Host wordmark | `.scan-hero-wordmark` | 12px / 600, lowercase | `rgba(60, 60, 67, 0.48)` |
| H1 message | `.scan-hero-title` | `clamp(22px, 5.8vw, 26px)` / 700 | `var(--black)` |
| Secondary line | `.scan-hero-line` | 17px / 600 | `var(--black)` |
| Steward | `.scan-hero-steward` | 14px | `rgba(60, 60, 67, 0.72)` |
| Resolver proof | `.scan-safety-resolver` | 12px / 600 | `#248a3d` |
| Level 0 limit | `.scan-hero-limit` | 14px / 500 | `rgba(60, 60, 67, 0.78)` |
| Chips | `.scan-safety-chips li` | 11px uppercase / 600 | `rgba(60, 60, 67, 0.62)` |
| Foot / first-seen | `.scan-hero-foot`, `.scan-safety-first-seen` | 12px | `rgba(60, 60, 67, 0.55)` |

**Future:** Hero title/detail may adopt `--hc-emphasis-card-title-fg` / `--hc-emphasis-card-detail-fg` for dark parity — do not use `var(--shell-label)` on the card body.

---

## Color semantics

| Signal | Where | Allowed |
|--------|-------|---------|
| **Active / live** | `.scan-safety-strip--live` (green pill + dot) | One primary status control in head |
| **Verified now** | `.scan-safety-resolver` (green text) | Resolver signature line only |
| **Warn / bad / neutral** | `.scan-safety-strip--warn` / `--bad` / `--neutral` | Strip only for revoked / expired / unknown |
| **Brand red** | Settle pulse border, primary CTAs (actor band), QR accent | Not duplicated as a second “Active” badge |
| **Trust pills** | `.scan-hero-trust li.trust-on` | Personal card only; green pill for vouch-on |

**Anti-pattern:** Green strip + green resolver line + green trust pill + green group peek all saying the same thing — pick **strip + at most one** supporting green line.

Status strip spec:

| Modifier | Pill background | Label color |
|----------|-----------------|-------------|
| `--live` | `rgba(36, 138, 61, 0.12)` | `#248a3d` |
| `--warn` | `rgba(255, 149, 0, 0.12)` | `#9a6b00` |
| `--bad` | `rgba(219, 27, 67, 0.1)` | `var(--red)` |
| `--neutral` | `rgba(60, 60, 67, 0.08)` | `rgba(60, 60, 67, 0.85)` |

Pending copy on strip: **Checking live status…** (neutral label color until settle).

---

## Spacing & rhythm

| Rule | Value |
|------|-------|
| Hero bottom margin | 18px before next block |
| Section below hero | 28–32px effective gap when actor band + modules stack |
| Head → body | 16px (`margin-bottom` on `.scan-hero-head`) |
| Limit divider | 16px top margin, 14px padding-top, `0.5px` border |
| Chip gap | 6px |
| Page horizontal inset | `var(--pad)` (20px) on modules; hero is full width of `.scan-pass-layer` |

No back-to-back **equal-weight** bordered cards: hero is always the heaviest surface.

---

## Motion (L2 only)

Canonical timeline: [`SCAN_PAGE_TRUST_UI.md`](SCAN_PAGE_TRUST_UI.md). Implementation: `site/js/scan-live-check-arrive.mjs`, `scan-pass.css`.

| Phase | Hero behavior |
|-------|----------------|
| **Pending** | `scan-live-check--pending`; strip shows checking copy; `.scan-arrive-item--hidden` rows invisible |
| **Settle** | Strip label → resolver state; rows stagger (~90ms); `scan-safety--pulse` on article **once**; limits fade in |
| **After** | Static until navigation or state change |

**Settle pulse** (`.scan-hero.scan-safety--pulse` → `scan-hero-settle-pulse`): ~0.85s — red border + `0 0 0 4px` ring **layered on** `var(--hc-scan-hero-shadow)` at peak; 100% returns to hero shadow only. Legacy non-hero `.scan-safety-header` keeps `scan-safety-border-pulse`.

**Reduced motion:** Instant visibility; no pulse, stagger, or actor-band slide (`prefers-reduced-motion`).

**Forbidden on hero:** Idle tilt (`pass-idle`), flip, looping border glow, infinite shadow breathing.

---

## Secondary surfaces (same page)

| Block | Classes | Elevation vs hero |
|-------|---------|-------------------|
| L3 actor band | `.scan-actor-band` | Tier 2 — tinted, 14px radius, red hairline; slides in after settle |
| Trust modules | `.scan-trust-modules` | Tier 1 — label + list, no hero shadow |
| Trust group rows | `.scan-trust-details` | Tier 1 — colored left accent bar only |
| Cross-tab banner (if shown) | `.hc-emphasis-card` | Tier 3 — must not out-rank hero |

---

## Anti-patterns

- Duplicate **Active** in strip, badge, H1, and trust group peek.
- Passport / government ID styling (embossed seal, flip affordance, tilt drag on hero).
- QR larger than the H1 message on narrow viewports.
- Looping animation on hero or corner dot for strangers.
- Hoodie-only scan template or floating profile bubble on resolver ([`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) § Anti-patterns).
- Painting the **whole hero** green/amber/red — state belongs in the **strip** and copy, not the plate fill.
- Reusing `.hc-emphasis-card` markup for the hero (wrong IA and CTA pattern).

---

## Files & regression

| Path | Role |
|------|------|
| `worker/src/resolver/scan-html.ts` | Hero markup |
| `worker/src/resolver/scan-safety.ts` | Strip tones, first-seen script |
| `site/scan-pass.css` | Hero + motion CSS → bundle |
| `site/js/scan-live-check-arrive*.mjs` | Arrive orchestration |
| `site/js/scan-page-dot.mjs` | L1 settle sync |
| `site/js/scan-actor-band*.mjs` | L3 band after settle |
| `worker/tests/scan-hero-visual-contract.test.ts` | v2 CSS + markup contract |
| `e2e/scan-hero-visual.spec.ts` | Playwright: plate, settle, dark, reduced motion, revoked |
| `site/e2e-fixtures/scan-revoked.html` | Revoked QR fixture (generate with active) |

After `scan-pass.css` changes: `npm run worker:bundle-scan`.

```bash
npm run worker:test -- worker/tests/scan-hero-visual-contract.test.ts worker/tests/scan-hero-snapshot.test.ts worker/tests/scan-page-dot-contract.test.ts worker/tests/scan-live-check-arrive-core.test.ts worker/tests/scan-safety.test.ts worker/tests/scan.test.ts
npm run worker:test:scan-live-check-arrive
npm run site:generate-scan-e2e-fixture
npm run e2e:scan-page-dot
npm run e2e:scan-hero-visual
npm run e2e:scan-hero-visual:webkit
```

Prototype (timing tune): `npm run pages:dev` → `/prototypes/scan-trust-ui-demo.html`

---

## Implementation checklist (v3 glass)

When raising the hero to tier-4 glass:

1. ~~Add `--hc-scan-hero-fill-glass` + `--hc-scan-hero-backdrop` on `:root` (light + dark).~~ **Done**
2. ~~Apply glass + backdrop on `.scan-hero.scan-status-panel`; opaque fallback paths.~~ **Done**
3. ~~Keep `scan-hero-settle-pulse` unchanged.~~ **Done**
4. ~~Update `scan-hero-visual-contract.test.ts` + `ui-color-scheme-popover-guard.test.ts`.~~ **Done**
5. After `scan-pass.css` changes: `npm run worker:bundle-scan` · regenerate e2e fixtures if needed.
6. Manual / E2E: light + dark, active + revoked, reduced motion + reduced transparency.

**v3 step 2 (☑ shipped):** Lower glass opacity (~0.68–0.78 α) + `--hc-scan-page-canvas` gradient so `backdrop-filter` has contrast — without this, step 1 reads identical to opaque v2 on flat `#f2f2f7`.

**v4 Phase 0 (prototype):** Canvas + glass lab at [`/prototypes/scan-trust-ui-demo.html`](../site/prototypes/scan-trust-ui-demo.html) — query `?canvas=neutral|red-frame|red-vignette` · `?glass=low|mid|high|prod`. Demo CSS only (`scan-trust-ui-demo.css`); production `scan-pass.css` unchanged until Phase 1 sign-off.

## Implementation checklist (v2 depth)

When raising the hero to tier 4:

1. ~~Add `--hc-scan-hero-shadow` (+ dark override) in `site/styles.css` and `scan-pass.css` `:root` block (keep bundles in sync).~~ **Done**
2. ~~Apply to `.scan-hero.scan-status-panel` at rest; ensure `scan-safety--pulse` still has headroom above resting shadow.~~ **Done** (`scan-hero-settle-pulse`)
3. ~~Add dark hero fill overrides in `theme-dark.css` (scan pages that honor `data-theme`).~~ **Done** (+ bundled `scan-pass.css` dark block, `SCAN_PAGE_THEME_BOOTSTRAP`)
4. ~~Update this doc **Status** line and snapshot tests if class list or tokens change.~~ **Done** — `scan-hero-visual-contract.test.ts`, revoked/expired hero snapshots, regenerate `site/e2e-fixtures/scan-active.html`
5. ~~Manual: light + dark, active + revoked, reduced motion, first paint → settle on mobile Safari~~ **Automated:** `npm run e2e:scan-hero-visual` (Chromium) · `npm run e2e:scan-hero-visual:webkit` (Desktop Safari + iPhone 13 Pro). **Optional manual:** physical device if WebKit E2E green — [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P1-SD** steps 8–9

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-22 | v4 Phase 0: glass canvas prototype — `scan-trust-ui-demo` canvas/glass toggles (demo CSS only) |
| 2026-06-21 | v3 step 1: tier-4 glass plate — `--hc-scan-hero-fill-glass`, backdrop, opaque fallbacks; settle pulse unchanged |
| 2026-05-26 | Initial spec: anatomy, tier system, shipped v1 + target v2 depth, motion cross-ref |
| 2026-05-26 | v2 step 1: `--hc-scan-hero-shadow` on `:root` (`styles.css`, `scan-pass.css`) + dark in `theme-dark.css` |
| 2026-05-26 | v2 step 2: `.scan-hero.scan-status-panel` uses token at rest; `scan-hero-settle-pulse` for Path 2 settle |
| 2026-05-26 | v2 step 3: `--hc-scan-hero-fill` / dark overrides; Worker `hc_theme` bootstrap; bundled scan dark CSS |
| 2026-05-26 | v2 step 4: `scan-hero-visual-contract.test.ts`; revoked/expired snapshots; QA steps in DEVICE_OS_QA |
| 2026-05-26 | v2 step 5: `e2e/scan-hero-visual.spec.ts`; `scan-revoked.html` fixture; `e2e:scan-hero-visual` |
| 2026-05-26 | Residual WebKit: `scan-hero-visual` in webkit + iphone-13-pro projects; `e2e:scan-hero-visual:webkit` |
