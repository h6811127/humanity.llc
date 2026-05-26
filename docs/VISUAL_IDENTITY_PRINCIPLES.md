# Visual Identity Principles

**Status:** Design strategy draft  
**Purpose:** Define the visual direction for Humanity Commons v1.0, especially the mobile web card and scan experience.  
**Scanner product contract (safety header, external links, recognition):** [`docs/SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md)

---

## Design Goal

Humanity Commons should feel:

- Sleek.
- Professional.
- Trustworthy.
- Mobile-first.
- Enticing.
- Human.
- Public-interest, not corporate-extractive.

It should not feel:

- Boring.
- Bureaucratic.
- Crypto-coded.
- Government-ID-like.
- Social-media-like.
- Linktree-like.
- Childish.
- Overly political in the core scan UI.

---

## Product Surface Rule

The mobile card page is a trust surface first.

Movement energy can live in the homepage, artifacts, launch materials, and community rituals. The public scan page should be fast, clear, and calm.

The mobile card page should answer:

1. Is the card active?
2. Is the person vouched?
3. Was live control proven?
4. Is this QR active?
5. What does this not prove?
6. Where can I read more?

---

## Primary Platform

V1 should assume scanners use mobile Safari or a mobile browser after scanning an HTTPS QR.

Design consequences:

- No native app assumptions.
- No bottom app navigation.
- No app-only gestures.
- Fast first render.
- Content should fit the first mobile viewport where possible.
- Critical trust states should appear above the fold.
- Primary CTAs should be normal web buttons.
- Links should work without authentication where public.

---

## Brand Color

Primary accent:

```text
#DB1B43
```

Use this color for:

- Brand mark.
- Active status accents.
- Primary action button.
- Thin outlines.
- Selected state.
- Small icon accents.

Do not overuse it for:

- Every warning.
- Large blocks of alarm UI.
- All text.
- Backgrounds that reduce readability.

Because `#DB1B43` is bright and close to warning/error territory, pair it with:

- White.
- Warm off-white.
- Charcoal.
- Soft gray.
- Deep navy/graphite.
- Occasional green only for success confirmation if needed.

---

## Mobile Card Layout Direction

Preferred direction:

> Sleek mobile Safari trust card.

Structure:

1. Minimal web header with Humanity Commons brand.
2. Profile hero with handle, manifesto, and active card state.
3. Trust-at-a-glance module:
   - Vouched Human.
   - Live Control.
   - QR Active.
4. Large QR/status card.
5. Primary CTA:
   - `Ask owner to prove control`
   - or `Prove live control` depending on scanner/owner context.
6. Warning module:
   - `Holding a printed QR does not prove identity or ownership.`
7. Footer links:
   - Trust Model.
   - Constitution.
   - Privacy / No scan analytics.

---

## Hierarchy

Most important:

- Card status.
- Handle.
- Human trust label.
- Live control status.
- QR status.

Secondary:

- Vouch count and recency.
- Manifesto line.
- Export/revocation/no-phone/no-analytics chips.
- Governance links.

Tertiary:

- Full technical details.
- Badge trail.
- Constitution.
- Roadmap.

Do not make the QR visually dominate at the cost of trust interpretation. The QR is a doorway; the current status is the point.

---

## Tone By Surface

### Scan Page

Tone: calm, precise, fast.

Avoid heavy ideology. Use short trust statements.

### Homepage

Tone: inspiring, values-driven, public-interest.

Can include movement language.

### Trust Model Page

Tone: educational, clear, humble.

Explain limits thoroughly.

### Storefront

Tone: meaningful artifact, not merch spam.

Every QR-bearing product must say buying does not verify.

### Founding Cohort Page

Tone: invitation to help build, test, and govern honestly.

---

## Components

### Status Pill

Examples:

- `Active Card`
- `Vouched Human`
- `Control Proven`
- `QR Active`
- `Revoked By Owner`
- `Suspended Under Public Rules`

Use icon plus label. Avoid ambiguous colors alone.

### Warning Block

Should be visible but not panic-inducing.

Recommended copy:

> Holding a printed QR does not prove identity or ownership.

Longer:

> This QR points to a Humanity Card. It does not prove the person holding this item is the card owner.

### CTA

Primary CTA on scanner view:

- `Ask owner to prove control`

Primary CTA on owner view:

- `Prove live control`

Secondary CTA:

- `Read what this proves`
- `View trust details`

### Trust Details

Expandable detail should explain:

- What this proves.
- What this does not prove.
- Vouch source/count/recency.
- Live control timestamp.
- QR/artifact status.
- No scan analytics.

---

## Visual Anti-Patterns

Avoid:

- Passport/government ID styling for default scan UI.
- Heavy seals or official-looking state symbols.
- Crypto neon everywhere.
- Poster/agitation style in the scan page.
- Follower counts.
- Trust scores.
- Leaderboards.
- Dense governance copy above the fold.
- Red warning overload.
- Hidden fine print for limitations.

---

## Movement Visual Layer

Movement materials can be more expressive:

- Posters.
- Stickers.
- Founding cohort graphics.
- Event table kits.
- Social share cards.
- Campaign pages.

Movement visuals may use:

- Stronger red.
- Bolder typography.
- Slogans.
- Community photography or illustration.
- "No phone. No ID. No ads. No tracking."

But the scan page should remain professional and utility-first.

---

## Design Validation

A v1 mobile scan page is successful if testers say:

- "I understand what this proves."
- "I understand what this does not prove."
- "This feels trustworthy."
- "This feels like a real product."
- "I would scan/share this."

It is failing if testers say:

- "This looks like Linktree."
- "This looks like crypto."
- "This looks like a government ID."
- "This seems like a political flyer."
- "I thought the sticker proved identity."
- "I thought this was legal ID."

