# Landing “Ready to try it?” emphasis card

**Status:** Shipped (emphasis card markup) · **Stacked layout + spacing ladder** (`--hc-emphasis-card-gap-*` tokens) · **Glass CTAs withdrawn** — see [`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md)  
**Scope:** `.landing-final-cta`, `.landing-framing` on `/` (`site/index.html`)  
**Pattern:** [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) · [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md)

---

## Problem (original)

The closing landing CTA (`.landing-final-cta`) used a **flat** pink wash + **1px red border** — visually unlike the raised `hc-emphasis-card` surfaces shipped on wallet, created, and hub.

---

## Shipped (May 2026)

| Surface | Markup | Notes |
|---------|--------|-------|
| **Ready to try it?** | `hc-emphasis-card hc-emphasis-card--urgent landing-final-cta` | Dot, eyebrow, title, detail, actions |
| **Physical software objects** | `hc-emphasis-card hc-emphasis-card--info landing-framing` | “What else can a QR do?” as nested row |

**Withdrawn (do not extend):** `site/css/landing-liquid-glass.css` and `.landing-cta-glass*` on hero, final CTA, and framing row. Revert and realign to keys-notification CTAs per [`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md) phase A.

---

## Target approach (after alignment)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Shared component | `hc-emphasis-card` + semantic modifier | Same family as `#wallet-tab-hint` / `#wallet-active-banner` |
| Title ladder | **22px** on `.hc-emphasis-card__title` via landing scope | Section rhythm with **How it works** |
| Primary CTA | **`hc-emphasis-card__cta`** (precise radius, red fill) | Not glass; matches wallet **Open workspace** / **Open that tab** |
| Hero **Create a live object** | Solid brand primary or same CTA metrics | No `.landing-cta-glass--prominent` |
| Framing link row | `hc-emphasis-card__cta--secondary` or in-card text link | No glass row material |
| Dark mode | Shared emphasis tokens + physical-object dark fills | No landing-only glass overrides |

**Out of scope:** Trust chips, disclosure cards, `what-can-a-qr-do.html` tab rows (still flat `.landing-framing-tab` until separately migrated).

---

## Markup contract (target — post-revert)

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
    <a class="hc-emphasis-card__cta landing-final-cta-btn" href="/create/">…</a>
  </div>
  <p class="landing-final-cta-foot">…</p>
</section>
```

Footer line stays **outside** `__actions` (muted disclaimer, not a card CTA).

---

## Withdrawn: Glass CTA tokens (`landing-liquid-glass.css`)

The following shipped in commit `41e3e49` and is **scheduled for removal**:

| Class | Was used for |
|-------|----------------|
| `.landing-cta-glass` | Frosted pill on final CTA |
| `.landing-cta-glass--prominent` | Hero primary |
| `.landing-cta-glass--row` | Framing “What else can a QR do?” |

Do not document or test these classes after phase A of the alignment doc.

---

## Implementation steps (historical + planned)

| Step | Task | Status |
|------|------|--------|
| 1–7 | Emphasis card migration + glass experiment | Shipped then **superseded** |
| **A** | Revert glass; restore standard CTAs | Planned — alignment doc |
| **B–E** | Global emphasis tokens (blur, border, CTA shape) | Planned — alignment doc |

---

## QA (after alignment)

1. Light `/` — cards match wallet keys-notification family; **no** glass buttons.
2. Dark `/` — physical-object fills; green/blue/red eyebrows per modifier.
3. `npm run worker:test -- worker/tests/device-emphasis-card-html.test.ts`
4. Manual: narrow mobile + desktop column; spacing per alignment doc (final CTA padding may stay tighter than wallet if scoped).

---

## Related

- [`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md) — canonical landing + global card rules  
- [`HC_EMPHASIS_CARD_IMPORT_REGRESSION.md`](HC_EMPHASIS_CARD_IMPORT_REGRESSION.md)  
- [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md) — landing narrative placement
