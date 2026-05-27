# Emphasis card visual alignment (keys-notification standard)

**Status:** In progress — **Phases A, B, C, F5 shipped**; Phase D (landing markup polish) next  
**Canonical for:** All `.hc-emphasis-card` surfaces, including landing (`/`) marketing blocks that adopted the component in May 2026  
**Supersedes (when implemented):** Opaque-fill + shadow-only-only rules in [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md) § Emphasis notice cards · glass landing CTAs in [`LANDING_FINAL_CTA_EMPHASIS_CARD.md`](LANDING_FINAL_CTA_EMPHASIS_CARD.md)  
**Related:** [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) · [`CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md`](CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md) · [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md)

---

## Problem

Recent landing work added **Liquid Glass** buttons (`site/css/landing-liquid-glass.css`, `.landing-cta-glass*`) on the hero, framing row, and final CTA. That language does not match the **keys notification** cards users already trust on wallet and device chrome.

Product direction:

1. **Revert** landing glass buttons to the same CTA family as keys notifications.
2. **Align** every emphasis card (homepage + shell + created + scan bundle) to one visual system rooted in the **reference keys surfaces** below.
3. **Apply three deliberate improvements** on top of that baseline (translucent blur, tighter eyebrow tracking, more precise in-card CTAs).

---

## Reference surfaces (do not reinvent)

These are the **visual source of truth** for markup, hierarchy, and state color:

| Surface | ID / selector | Modifier | State language |
|---------|---------------|----------|----------------|
| Keys active in this tab | `#wallet-active-banner` | `--active` | Green dot + green eyebrow · “live on device” |
| Keys in another tab (wallet) | `#wallet-tab-hint` | `--info` | Blue dot + blue eyebrow · cross-tab |
| Cross-tab (landing / shell) | `#device-cross-tab-banner` | `--info` | Same as wallet strip |
| Cross-tab (scan) | `#scan-cross-tab-banner` | `--info` | Bundled scan CSS; same tokens |

**Markup contract** (unchanged): [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) · helpers in `site/js/device-emphasis-card-html.mjs`.

**Legacy pre-rollout hint** (`.wallet-strip-hint`): rounded **12px** card, **1px** semantic-tinted border, soft tinted fill — informs “subtle border” intent; new standard uses shared tokens, not one-off amber boxes.

---

## Baseline anatomy (required on every emphasis card)

| Layer | Rule | Notes |
|-------|------|--------|
| **Shape** | `border-radius: 14px` (card); CTAs use precise radius below | Matches shipped `hc-emphasis-card.css` |
| **Border** | **Subtle hairline** — `0.5px` or `1px` neutral/semantic-tinted stroke | Replaces `border: none`-only depth. Stroke supports “physical object” read; must not read as a flat painted rim (no full-opacity semantic outline). |
| **Depth** | Keep layered **`--hc-emphasis-card-shadow`** (inset highlights + outer lift) | Shadow + hairline together; do not drop shadow when adding border. |
| **Status dot** | 9px circle + **glow halo** (`box-shadow` ring) per modifier | `--success` green · `--info` blue · `--warn` amber · `--urgent` red (existing classes). |
| **Eyebrow** | 12px uppercase, **semantic color** per modifier | Green / blue / amber / red eyebrows — not neutral gray. |
| **Title / detail** | `--hc-emphasis-card-title-fg` / `--hc-emphasis-card-detail-fg` only | No per-page `var(--black)` hacks. |
| **Dark mode** | Modifier-specific **cool/warm gray gradients** on near-black shell | “Physical object on device” — keep green cast (`--active`), blue cast (`--info`), warm casts (`--warn`, `--urgent`). Explicit `background` per modifier in `theme-dark.css` (see existing dark fills). |

### Semantic modifiers (state language)

| Modifier | Dot | Eyebrow (light / dark) | Fill cast (light) | Meaning |
|----------|-----|------------------------|-------------------|---------|
| `--active` | Green + halo | `#248a3d` / `#30d158` | Gray-green neutral | Keys live **here** |
| `--info` | Blue + halo | `#007aff` / `#64b5ff` | Cool gray neutral | Cross-tab / custody / informational |
| `--warn` | Amber + halo | `#a16207` / `#ffb340` | Warm gray neutral | Reversible risk, setup |
| `--urgent` | Red + halo | `#c9342a` / `#ff6961` | Warm pink-gray neutral | Live proof, revoke, errors |

Marketing landing blocks pick the modifier by **state**, not by section aesthetics (e.g. “Physical software objects” → `--info` if informational; “Ready to try it?” → `--urgent` only if copy is truly urgent — product may choose `--info` for calmer close).

---

## Internal spacing ladder (May 2026)

**Problem:** After the stacked-layout fix (`flex: none` on `__main`), landing cards felt **too tight** — copy, dot, and CTAs ran together. An interim `12px` section gap (+4px over the old `8px` landing override) was **not perceptible** in production and read as “nothing changed.”

**Rule:** One source of truth on `:root`; `hc-emphasis-card.css` consumes `var(--hc-emphasis-card-gap-*)`. Stacked cards share the same section gap between flex children. **No ad-hoc margins** on `.hc-emphasis-card__title` / `__detail` inside emphasis cards — use tokens only (legacy `.landing-final-cta-title { margin-bottom: 6px }` fights the ladder).

**Comfort target:** Marketing/stacked cards should feel like **grouped iOS inset rows** — clear separation between status block, body copy, and CTA, not “tight notification strip.”

| Token | Value (default) | Zone |
|-------|-----------------|------|
| `--hc-emphasis-card-padding-block` | `20px` | Card inset top/bottom |
| `--hc-emphasis-card-padding-inline` | `20px` | Card inset left/right |
| `--hc-emphasis-card-gap-dot` | `14px` | Status dot ↔ copy column (`__main` flex `gap`) |
| `--hc-emphasis-card-gap-eyebrow` | `8px` | Eyebrow ↔ title (`margin-bottom` on eyebrow) |
| `--hc-emphasis-card-gap-copy` | `12px` | Title ↔ detail (`margin-top` on detail) |
| `--hc-emphasis-card-gap-section` | `24px` | Stacked flex children: **copy block ↔ actions/secondary row ↔ footer** (card `gap`) — primary “breathing room” rhythm |
| `--hc-emphasis-card-gap-row` | `16px` | Horizontal (side-by-side) wrap gap between `__main` and CTA column |
| `--hc-emphasis-card-gap-foot` | `12px` | Extra inset before disclaimer line when card `gap` is not used between actions and foot |

**Prior values (deprecated):** padding `14/16`, section `12px`, eyebrow `4px`, copy `6px` — too incremental; do not revert without product review.

**Stacked surfaces** (column + `flex: none` on `__main` + `justify-content: flex-start`):

- `.landing-framing`, `.landing-final-cta`
- `#device-cross-tab-banner`, `#wallet-tab-hint`, `#scan-cross-tab-banner`

**Do not** reduce `--hc-emphasis-card-gap-section` below `20px` on landing without product review.

**Deploy:** Bump `styles.css?v=` on `site/index.html` (and shell pages when cross-tab/wallet cards change) whenever tokens change; version `hc-emphasis-card.css` on the `@import` query. See [`LANDING_EMPHASIS_CARD_SPACING_DEPLOY_INVESTIGATION.md`](LANDING_EMPHASIS_CARD_SPACING_DEPLOY_INVESTIGATION.md).

---

## Deliberate deltas (on top of baseline)

These are **intentional changes** from the first shipped emphasis-card pass (opaque opaque gradients, `border: none`).

### 1. Translucent / blurred card background

| Aspect | Target |
|--------|--------|
| Fill | Semi-transparent modifier tint + **`backdrop-filter: blur(...)`** (and `-webkit-`) over page/shell background |
| Light | e.g. `rgba` washes ~0.55–0.75 opacity on neutral/semantic base; blur **12–20px**, `saturate(1.1–1.2)` |
| Dark | Lower-opacity washes on `#1c1c1e` family; blur over **black** shell; preserve modifier cast |
| Fallback | `@supports not (backdrop-filter)` and `prefers-reduced-transparency: reduce` → **opaque** gradient (current shipped fills) |
| Anti-pattern | Translucent **semantic rim** only (old blue `rgba(0,122,255,0.1)` stroke) — still forbidden |

New tokens (implementation): `--hc-emphasis-card-fill-*-glass`, `--hc-emphasis-card-border-*`, optional `--hc-emphasis-card-backdrop`.

### 2. Eyebrow letter-spacing (all-caps labels)

| Token | Current | Target |
|-------|---------|--------|
| `.hc-emphasis-card__eyebrow` `letter-spacing` | `0.04em` | **`0.025em`** (slightly tighter; ~37% reduction in extra track) |

No change to `text-transform: uppercase` or 12px size unless QA shows readability issues.

### 3. In-card CTA — precise, not bubble-like

| Property | Current (pill) | Target |
|----------|----------------|--------|
| `border-radius` | `999px` | **`10px`** (compact control; matches `.hc-notice-ack` / grouped UI buttons) |
| `padding` | `8px 12px` | **`7px 11px`** (primary); secondary **`6px 10px`** |
| `font-size` | `13px` | **`13px`** (unchanged) |
| Primary | Red fill, white label | **Unchanged semantics** — still `var(--red)`; less “bubble” from radius only |
| Secondary | Frosted white pill | **Flat control**: shell fill + hairline border; no oversized inset highlight |

**Landing hero** primary action (“Create a live object”) uses the **same primary CTA class** as wallet (`hc-emphasis-card__cta` or scoped alias with identical metrics) — **not** `.landing-cta-glass*`.

Nested link rows (e.g. “What else can a QR do?”) use **`hc-emphasis-card__cta--secondary`** full-width row or a **text + chevron** pattern inside the card — not a second glass material.

---

## Revert scope (landing glass — first implementation step)

Remove the Liquid Glass experiment from landing; do not extend to shell.

| Item | Action |
|------|--------|
| `site/css/landing-liquid-glass.css` | **Delete** file |
| `site/styles.css` top `@import` | **Remove** `landing-liquid-glass.css` import |
| Hero CTA | Restore solid brand primary (historically `.landing-hero-btn-primary` **or** shared `hc-emphasis-card__cta` metrics without glass) |
| `.landing-final-cta` button | `hc-emphasis-card__cta` only — drop `landing-cta-glass` |
| `.landing-framing-more-link` | Secondary in-card control / link row — drop `landing-cta-glass--row` |
| `site/css/theme-dark.css` | Remove `.landing-cta-glass*` overrides |
| Vitest | Update `device-emphasis-card-html.test.ts` — forbid `landing-cta-glass` on `/` |
| Cache bust | Bump `styles.css?v=` / `theme-dark.css?v=` on `site/index.html` |

[`LANDING_FINAL_CTA_EMPHASIS_CARD.md`](LANDING_FINAL_CTA_EMPHASIS_CARD.md) — mark glass sections **withdrawn**; point here for landing card + CTA rules.

---

## Surfaces in scope (alignment pass)

All rows use the **same token set** after implementation.

| Tier | Surface | File(s) | Notes |
|------|---------|---------|-------|
| **Reference** | `#wallet-active-banner`, `#wallet-tab-hint` | `site/wallet/index.html`, `hc-emphasis-card.css` | Tune tokens here first |
| **Shell** | `#device-cross-tab-banner` | `device-cross-tab-banner.mjs`, `styles.css` | Stacked column layout retained |
| **Landing** | `.landing-framing`, `.landing-final-cta` | `site/index.html` | Revert glass; cards follow baseline + deltas |
| **Created** | `#live-control-proof`, `#no-session`, `#owner-revoked-banner`, `#created-error`, revoke warnings, custody | `created/`, `device-keys-custody.mjs` | Modifier per semantics |
| **Create** | `#create-public-card-notice` | `create/index.html` | `--warn` |
| **Scan** | `#scan-cross-tab-banner` | `scan-pass.css` (bundled) | Sync tokens via `npm run worker:bundle-scan` |
| **Hub** | `.hub-card-status-alert` | `device-hub-ui.mjs` | Inset card; same border/blur/CTA rules at smaller scale |

**Out of scope:** Glance rows, inbox sheet rows, full-bleed `.device-hub-notice-banner`, OS notifications, status dot itself.

---

## Implementation phases (when approved)

| Phase | Work | Acceptance |
|-------|------|------------|
| **A** | Revert landing glass (table above) | No `.landing-cta-glass` in repo; hero/final CTAs match wallet primary |
| **B** | Token + CSS in `hc-emphasis-card.css` + `:root` / `theme-dark.css` | Border + glass fills + eyebrow spacing + CTA radius on reference wallet cards |
| **C** | Propagate to shell, created, create, scan bundle, hub inset | Visual parity light/dark; reduced-transparency fallback |
| **D** | Landing markup polish | Framing + final CTA use standard CTAs; modifier choice documented |
| **E** | Docs + tests | `ui-color-scheme-popover-guard`, `device-emphasis-card-html`, update rollout doc status |
| **F1** | Add spacing tokens on `:root` in `site/styles.css` | All `--hc-emphasis-card-gap-*` and padding tokens defined once |
| **F2** | Wire tokens in `site/css/hc-emphasis-card.css` | Dot, eyebrow, detail, card padding/gap use `var()` — no magic numbers in component file |
| **F3** | Stacked surfaces: `gap: var(--hc-emphasis-card-gap-section)` + keep `flex: none` on `__main` | Landing, cross-tab shell, scan bundle; remove landing-only `8px` overrides |
| **F4** | Vitest: tokens present + `hc-emphasis-card` references `gap-section` | `device-emphasis-card-html.test.ts`; bump `styles.css?v=` on `/` |

**Shipped before F:** Stacked layout fix (`flex: none`, `justify-content: flex-start`) — commit `a136505`.

**Shipped F1–F4:** Spacing tokens on `:root`, wired in `hc-emphasis-card.css`, stacked surfaces use `gap-section`; landing `8px` overrides removed.

**Shipped F5 (comfort ladder, May 2026):** Tokens raised to table above (`section` **24px**, padding **20px**); landing title margins zeroed inside emphasis cards; `styles.css?v=118` + `@import` `hc-emphasis-card.css?v=2`.

**Shipped A (May 2026):** Deleted `landing-liquid-glass.css`; removed `@import`; final CTA uses `hc-emphasis-card__cta`; dark theme glass overrides removed; `styles.css?v=119` on `/`.

**Shipped B (May 2026):** Glass fills + hairline borders + `backdrop-filter` on `.hc-emphasis-card`; opaque fallback via `@supports` / `prefers-reduced-transparency`; eyebrow `0.025em`; CTA radius **10px** and tighter padding; `hc-emphasis-card.css?v=3`; `styles.css?v=120` / `theme-dark.css?v=24`.

**Shipped C (May 2026):** Glass parity on shell (`device-cross-tab`, wallet tab hint), created/create/organizer-revoke via shared import; scan bundle tokens + dark emphasis rules in `scan-pass.css` (`npm run worker:bundle-scan`); hub inset inherits component CSS; cache bust `styles.css?v=120` / `theme-dark.css?v=24` on wallet, create, created.

**Deploy / cache:** If production looks unchanged after deploy, see [`LANDING_EMPHASIS_CARD_SPACING_DEPLOY_INVESTIGATION.md`](LANDING_EMPHASIS_CARD_SPACING_DEPLOY_INVESTIGATION.md) (Worker vs Pages, cache bust, `@import`).

**Execute F1 → F4 in order** when tightening or loosening card rhythm later; change tokens on `:root` first, not one-off selectors. **Bump `styles.css?v=`** on `site/index.html` whenever spacing tokens change.

---

## QA checklist

1. **Wallet `/`:** Active banner + cross-tab hint — green/blue dots, hairline border, blurred fill (if supported), precise CTAs.
2. **Landing `/`:** No glass materials; framing + final blocks match wallet card family.
3. **Dark:** Cards read as **elevated physical objects** on black shell; eyebrows stay green/blue/amber/red; detail text readable.
4. **`prefers-reduced-transparency`:** Opaque fallback; no invisible cards.
5. **Safari iOS:** Cross-tab stacked actions still wrap (`SCAN_CROSS_TAB_BANNER_SAFARI_LAYOUT_INVESTIGATION.md`).
6. **Commands:** `npm run worker:test -- worker/tests/device-emphasis-card-html.test.ts worker/tests/ui-color-scheme-popover-guard.test.ts` · `npm run worker:bundle-scan` after scan token changes.

---

## Related decisions (unchanged)

- `@import` for `hc-emphasis-card.css` stays **first** in `styles.css` — [`HC_EMPHASIS_CARD_IMPORT_REGRESSION.md`](HC_EMPHASIS_CARD_IMPORT_REGRESSION.md).
- Inbox / dot chroma (blue cross-tab, amber live proof) unchanged — this doc is **card chrome** only.
- No numeric count on status dot.
