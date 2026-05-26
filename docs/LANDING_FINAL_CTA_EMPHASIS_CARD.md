# Landing “Ready to try it?” emphasis card

**Status:** Shipped (steps 1–7)  
**Scope:** `.landing-final-cta` on `/` (`site/index.html`)  
**Pattern:** [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) · [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md)

---

## Problem

The closing landing CTA (`.landing-final-cta`) used a **flat** pink wash + **1px red border** — visually unlike the raised `hc-emphasis-card` surfaces shipped on wallet, created, and hub (shadow-only depth, opaque neutral fill).

---

## Approach

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Shared component | `hc-emphasis-card hc-emphasis-card--urgent` | Warm neutral fill + red eyebrow/dot matches brand “act now” without a painted rim |
| Not a new modifier | Reuse `--urgent` | Marketing CTA is high-salience; same token set as live proof / errors |
| Title ladder | Keep **22px** on `.hc-emphasis-card__title` via landing scope | Preserves section rhythm with **How it works** |
| Primary CTA | **Glass pill** (`.landing-cta-glass`) | Frosted layer on card fill; inset highlight + outer lift; red label for brand |
| Fallback | `@supports not (backdrop-filter: blur(1px))` | Opaque white + red text — no invisible button |
| Dark mode | Card via `theme-dark` emphasis fills; glass via scoped overrides | No per-card `color: var(--black)` hacks |

**Also shipped:** **Physical software objects** (`.landing-framing`) as `hc-emphasis-card--info` with a nested **What else can a QR do?** glass row (`.landing-cta-glass--row`). Hero primary uses `.landing-cta-glass--prominent`. Shared tokens: `site/css/landing-liquid-glass.css` (iOS 26 Liquid Glass–inspired: gradient fill, `blur(20px) saturate(180%)`, specular inset rim).

**Out of scope:** Trust chips, disclosure cards, `what-can-a-qr-do.html` tab rows (still flat `.landing-framing-tab`).

---

## Markup contract

```html
<section class="hc-emphasis-card hc-emphasis-card--urgent landing-final-cta" …>
  <div class="hc-emphasis-card__main">
    <span class="hc-emphasis-card__dot hc-emphasis-card__dot--urgent"></span>
    <div class="hc-emphasis-card__copy">
      <p class="hc-emphasis-card__eyebrow">Get started</p>
      <h2 class="hc-emphasis-card__title landing-final-cta-title">Ready to try it?</h2>
      <p class="hc-emphasis-card__detail landing-final-cta-lead">…</p>
    </div>
  </div>
  <div class="hc-emphasis-card__actions">
    <a class="hc-emphasis-card__cta landing-cta-glass landing-final-cta-btn" href="/create/">…</a>
  </div>
  <p class="landing-final-cta-foot">…</p>
</section>
```

Footer line stays **outside** `__actions` (muted disclaimer, not a card CTA).

---

## Implementation steps

| Step | Task | File(s) |
|------|------|---------|
| **1** | This doc | `docs/LANDING_FINAL_CTA_EMPHASIS_CARD.md` |
| **2** | Migrate HTML to emphasis card structure | `site/index.html` |
| **3** | Replace flat `.landing-final-cta` border/fill; add stacked layout + 22px title + glass CTA | `site/styles.css` |
| **4** | Dark overrides for glass CTA | `site/css/theme-dark.css` |
| **5** | Vitest: landing section uses `hc-emphasis-card--urgent` + `landing-cta-glass` | `worker/tests/device-emphasis-card-html.test.ts` |
| **6** | Bump `styles.css?v=` on `/` | `site/index.html` |
| **7** | Cross-link from `DEVICE_HUB_AND_LOCAL_SEARCH.md` | docs |

---

## Glass CTA tokens (`landing-liquid-glass.css`)

| Modifier | Use |
|----------|-----|
| `.landing-cta-glass` | Base frost + specular `::before` / rim `::after` |
| `.landing-cta-glass--prominent` | Hero **Create a live object** (red wash, white label) |
| `.landing-cta-glass--row` | Framing **What else can a QR do?** link row |

| Layer | Light | Dark (`theme-dark.css`) |
|-------|-------|-------------------------|
| Fill | White gradient + `blur(20px) saturate(180%)` | Low-alpha white gradient |
| Rim | `inset` highlight + `0.5px` border | Softer inset |
| Lift | Brand-tinted outer shadow | Deeper neutral shadow |
| Label | `var(--red)` (pill) / title fg (row) | Same |

`prefers-reduced-transparency: reduce` and no `backdrop-filter` — opaque fallback in `landing-liquid-glass.css`.

**Final CTA spacing:** `.landing-final-cta.hc-emphasis-card` uses ~half default card padding/gap (`7px 12px`, `gap: 6px 8px`; foot `margin-top: 7px`).

---

## QA

1. Light `/` — card shows shadow depth, no red painted border; glass button readable.
2. Dark `/` — card fill from emphasis tokens; glass button contrast ≥ WCAG AA on detail text nearby.
3. Tap: button scales slightly (`:active`); card does not trap focus.
4. `npm run worker:test -- worker/tests/device-emphasis-card-html.test.ts`
5. Manual: narrow mobile + desktop 430px column; no double margin vs prior section.

---

## Related

- [`HC_EMPHASIS_CARD_IMPORT_REGRESSION.md`](HC_EMPHASIS_CARD_IMPORT_REGRESSION.md) — shell pages must load `hc-emphasis-card.css` via top-of-file `@import`
- [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md) — landing narrative placement
