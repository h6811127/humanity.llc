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

1. Is this a real Humanity check on `humanity.llc` right now?
2. What is this object or card saying **at this moment**?
3. Is it active, revoked, expired, or unknown?
4. What does this **not** prove? (one honest line above the fold)
5. *(personal card depth)* Is the person vouched? Was live control proven? Is this QR active?
6. Where can I read more?

For **live object** stickers, (2) is usually the manifesto or plate message—not the steward `@handle`. See [`docs/SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) § Scan type templates.

**Design reference:** `assets/Nerd Mobile Post Scan Render.png` (single hero, status bar, proof/limit modules, QR secondary).

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

**Target structure** (matches Nerd mock + [`docs/M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md)):

1. Minimal web header — dot + `humanity.llc` only.
2. **Live check hero** — one status + primary message (H1) + resolver verified line + one limit line.
3. Steward strip — `Controlled by @handle`, optional expiry (muted).
4. **What this proves** — up to three bullets (only true signals).
5. **What this does not prove** — warm module; link to full policy.
6. **This QR** — smaller code + credential code; collapsible on mobile when possible.
7. Primary CTA when relevant — `Ask owner to prove control` / `Prove live control`.
8. Footer — trust model, no analytics.

**Interim shipped layout** stacks a separate scanner safety header and status panel—see [`docs/SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) § Known UX gaps. Implementation should converge on the structure above.

---

## Hierarchy

### Universal (all scan types)

Most important:

1. **Trusted host** (`humanity.llc`) and **single live status** (active / revoked / expired / …).
2. **Object or card message** (manifesto, status plate lines, or `@handle` for personal cards).
3. **One Level 0 limit** (“does not prove who holds this”).
4. **Resolver verified** when signatures validate.

### Personal card (additional)

- Human trust label (e.g. Vouched Human).
- Live control status.
- QR active (as pill, not a second hero status).

### Secondary

- Steward handle (when not the H1).
- Vouch count and recency.
- Revocable / issued / steward chips — prefer **Details**, not hero.
- Governance links.

### Tertiary

- Full technical details.
- Credential code, profile id, JSON links.
- Constitution, roadmap.

**QR:** subordinate. The sticker already says `LIVE OBJECT`; the on-page QR is for re-scan and print match, not the primary trust signal. Max visual weight ~88–96px beside copy on wide phones; below message on narrow.

**Color:** use green only for active / verified-now. Do not show red **ACTIVE** badge and green **Active** strip for the same state.

---

## Scan page visual spec

Resolver HTML (`scan-pass.css`, bundled to Worker). Product rules: [`docs/SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md).

| Topic | Spec |
|-------|------|
| **Feel** | Enticing through competence—calm, precise, spacious—not loud marketing |
| **Spacing** | One primary hero card: 24–28px padding; 28–32px before secondary modules; no back-to-back equal-weight bordered cards |
| **Typography** | H1 message 22–26px semibold; status one pill or bar; meta 13–14px at `rgba(60,60,67,0.72)` |
| **Brand red** | Dot, QR frame accent, primary CTA—not every badge or status duplicate |
| **Green** | Active / “signed object verified by resolver” only |
| **Motion** | One-shot hero border pulse on load; respect `prefers-reduced-motion` |
| **Section kickers** | Avoid “Network status” for strangers; use human copy or omit |
| **Anti-pattern** | Four “Active” labels; passport styling; QR larger than the message |

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

For **live object** first scans, also: they name the **message on the page**, not only `@handle`, without prompting.

It is failing if testers say:

- "This looks like Linktree."
- "This looks like crypto."
- "This looks like a government ID."
- "This seems like a political flyer."
- "I thought the sticker proved identity."
- "I thought this was legal ID."
- "Which Active is the real one?"
- "The big QR means it's more verified."

Stranger test protocol: [`docs/M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md).

