# Book of Weird Practices

**Status:** Cultural branch · Tier 1 stub (v0)  
**Purpose:** Optional embodied practices for Humanity members — attention, presence, and weird belonging — without turning the product into a church or a purity test.  
**Surface:** [`/practices/`](../site/practices/index.html) · landing micro-link `#landing-weird-practices`  
**Related:** [`MOVEMENT_NARRATIVE.md`](MOVEMENT_NARRATIVE.md) · [`PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md`](PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md) (sibling Tier 1 pattern)

---

## Product and movement boundary

Same rule as the Public Docket and the movement narrative:

- **Scan / card** stay practical and trustworthy.
- **Practices** live on `/practices/`, landing lore, events, zines, and chapter meetups — never as a gate on create, vouch, or scan.

Skipping the book does not fail membership. Completing practices does not verify anyone.

---

## What this is / is not

| Is | Is not |
|----|--------|
| A field guide of optional experiments | A spiritual doctrine or creed |
| Invitation for people who already feel something is off | Conversion funnel or purity ladder |
| Practices with time/place constraints | Scored streaks, badges, or social proof |
| Forkable / annotatable | Closed priesthood of “true members” |

---

## Landing presentation (Tier 1)

**Decision:** Quiet **footer micro-link** on `/` — sibling to Public Docket; not a Learn row, shelf, trust chip, or hero.

| Surface | Copy / behavior |
|---------|-----------------|
| `/` link (`#landing-weird-practices`) | `Book of Weird Practices · for people with bodies` → `/practices/` |
| Placement | After contact (`#now`), with `#landing-public-docket` in the branch micro strip |
| Style | Muted grey text; no icon, badge, or “NEW” |
| Forbidden on `/` | “Doctrine,” creed language, practice titles as CTAs in the hero |

**Do not escalate** to shelves/hero without flipping center-vs-branch. Regression: `npm run verify:landing` · `worker/tests/book-of-weird-practices-landing.test.ts`.

---

## Page layout (readability)

Keep `/practices/` a **single narrow column** (~40rem), not a dashboard:

| Element | Rule |
|---------|------|
| Jump nav | Four plain text links (Oracles · Body · Commons · On these rails) — no pills |
| Chapters | Short uppercase title + one-line lead |
| Practice | Number · **title** · one short paragraph — no cards, icons, or streaks |
| Numbering | Continuous across chapters (`01`…`n`) |
| Disclosure | “How this works” stays collapsed at the bottom |

---

## Practice set (shipped on `/practices/`)

### Oracles
1. Ask a book · 2. Dream inbox · 3. Library labyrinth · 4. Write what you won’t ask a machine

### Body
5. Mirror ten minutes · 6. Ten minutes of silence · 7. One phone-free errand · 8. Salt the door · 9. Cold-water face

### Commons
10. Leave something useful · 11. Repair as spell · 12. Confess to a tree · 13. Circle of three · 14. Anonymous blessing drop

### On these rails
15. Return to a sticker · 16. Vouch only in person · 17. Scan as omen · 18. Sticker pilgrimage

---

## Next

- Printed zine / pocket card by chapter
- Chapter meetup format (share results, not streaks)
- Cross-link from steward materials without gating `/created/`
- Optional Accountability Day / commons fair booth for the book

---

## Changelog

| Date | Note |
|------|------|
| 2026-07-17 | Chapters + jump nav; expanded to 18 practices (oracles / body / commons / rails) |
| 2026-07-16 | Tier 1: muted `/` micro-link → `/practices/` stub; eight starter practices; not a doctrine |
