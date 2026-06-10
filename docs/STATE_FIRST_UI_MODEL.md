# State-first UI model

**Status:** Active — presentation direction (UI/copy/layout only)  
**Audience:** Product, design, frontend, agents  
**Scope:** How major screens **show** resolver truth — not protocol, resolver semantics, signing, custody, or governance mechanics

**Related:** [`VISUAL_IDENTITY_PRINCIPLES.md`](VISUAL_IDENTITY_PRINCIPLES.md) · [`SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) · [`SCAN_PAGE_TRUST_UI.md`](SCAN_PAGE_TRUST_UI.md) · [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) § Semantic model · [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) · [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) · [`DISCOVERY_PROJECTION.md`](DISCOVERY_PROJECTION.md)

---

## Why humanity.llc needs this

Humanity.llc is **public infrastructure for physical places and objects** — not abstract SaaS. Strangers and stewards should feel they are checking **current state on real things**, the way they check account status on a utility app or contact info on a phone.

Today the product often leads with **category, narrative, or protocol framing** before **state**. That reads as software explaining itself. State-first UI inverts that: **show what is true now**, then offer action, then disclose rules and provenance.

This aligns with the semantic model ([`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) § Semantic model):

- **Identity + Address + Interpretation** produce **Representation** at interaction time.
- UI should surface **Representation** first (current public state), with **Interpretation** (governance, limits, charter) as progressive disclosure — not hero ontology.

---

## Core principle: five questions, fixed order

Every **major screen** should answer, in this order:

| # | Question | UI job |
|---|----------|--------|
| 1 | **What is this thing?** | Entity identity — name, place, kind (one line) |
| 2 | **What is its current state?** | Status hero — live, paused, revoked, window phase, world chip |
| 3 | **What can I do?** | Primary action — Scan, Open board, Manage, Contribute |
| 4 | **What governs it?** | Charter, limits, season rules — collapsed or below fold |
| 5 | **What details can I inspect?** | Provenance, JSON, signer table, secondary links |

**State-first** means #2 is visually and verbally **primary**, not a small badge after marketing copy.

---

## Inspiration (utility UIs, not visual clones)

### Visible — account status screen

- **Status first** — plan/state is the hero (“current service state”).
- **Actions second** — pay, pause, fix.
- **Details later** — plan fine print, history, support.

**Borrow:** calm utility tone; status before essay.

### Android Contacts — entity screen

- **Entity first** — photo + name immediately.
- **Actions available** — call, message, without hunting.
- **Fields below** — email, address, notes on demand.

**Borrow:** card = entity; actions adjacent to identity; metadata scrolls.

### Spotify-style cards — browse surfaces

- **Object as card** — album/show as tile with **state cue** (playing, new, locked).
- **One primary tap target** — play / open.
- **Secondary metadata** — genre, year — not the headline.

**Borrow:** networks, places, and objects as **cards** with state-led hierarchy — not feed rows with engagement metrics.

---

## Mapping to humanity.llc

| Entity type | Card metaphor | State hero examples | Primary actions |
|-------------|---------------|---------------------|-----------------|
| **Object** (plate, relay, node) | Scan target card | Active · Paused · Revoked · Season closed | Scan · (steward) Manage |
| **Place** (board pin, discovery pin) | Location row/card | Live chips from snapshot · Maintenance · Locked | Scan object · Open in Maps |
| **Network** (season, public listing) | Network card | Live now · Opens soon · Ended | Open board · Rules |
| **Account / root** (steward) | Workspace header | Keys in tab · Saved · Revoked | Manage · Add scan point |

**Rules:**

- **Objects, places, networks are cards** — bounded tiles with identity + state + action.
- **Status is the hero** — manifesto line, lifecycle, window phase, collective progress band.
- **Governance is progressive disclosure** — charter, proves/does-not-prove, data policy — inspectable, not dumped up front.
- **Authority / provenance** — signer table, public JSON, `@handle` — in details band or collapsible trust modules ([`SCAN_PAGE_TRUST_UI.md`](SCAN_PAGE_TRUST_UI.md) L3 actor / trust details).

---

## Screen hierarchy (template)

```text
┌─────────────────────────────────────┐
│ 1. Entity identity                  │  name · place · kind (quiet)
├─────────────────────────────────────┤
│ 2. Current state          ◀ HERO   │  live check · chips · window label
├─────────────────────────────────────┤
│ 3. Primary actions                  │  one obvious CTA
├─────────────────────────────────────┤
│ 4. Related resources                │  board · rules · maps · related objects
├─────────────────────────────────────┤
│ 5. Governance / provenance / details│  charter · limits · trust modules · JSON
└─────────────────────────────────────┘
```

Do **not** invert with “physical internet” essay, L1–L5 labels, or protocol nouns before state.

---

## Application by surface

### Scan pages (stranger)

**Already closest to state-first** — [`SCAN_PAGE_TRUST_UI.md`](SCAN_PAGE_TRUST_UI.md) L2 hero performs live check.

| Layer | State-first fit |
|-------|-----------------|
| L2 hero | ☑ State hero (manifesto + lifecycle) |
| Limits line | ☑ Governance (#4) above fold but subordinate to state |
| Trust modules | ☑ Details (#5) — collapsible |
| L3 actor band | ☑ Actions (#3) after L2 settles |

**Future polish only:** ensure interpretation trace (charter, signers) lives in #5, not competing with #2.

### City board node cards (`/play/cedar-rapids/map/`)

**Shipped (SF-2):** identity → **Current state** (`[data-node-effect]`) → scan CTA → What / Scan details. Snapshot still updates the same selectors; chip list band deferred to SF-2b. **Visually complete** (light + dark QA; dark contrast patch in `theme-dark.css`; label `nowrap` cache-bust `styles.css?v=156` on map page). Engineering ready for **B13 human sign-off** path — privacy/GT-7 remain human gates per [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md).

**SF-2b (deferred):** optional `buildNodeChipsHtml` band above effect text when snapshot carries `chips[]`.

See [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) policy — world state, not personal progress.

### Public network discovery cards (landing portal)

**Today:** preview art → title + small status badge → meta → stats → **long summary** → actions.

**Gap:** summary (#1 essay) competes with status (#2). Status badge is secondary.

**Target:** identity → **state hero** → Open board CTA → stats → summary lower.

Module: `site/js/public-networks-portal-core.mjs` · styles: `site/css/public-networks-portal.css`.

### Created / managed object views (steward)

**Today:** room switcher + lists; network card status in places.

**Target:** active object header shows **current manifesto/status** before add-hub or stream editors. Governance (limits, season When panel) in progressive panels — aligns with [`STEWARD_UX_PRESENTATION_TARGET.md`](STEWARD_UX_PRESENTATION_TARGET.md).

**Defer broad `/created/` rework** — apply pattern per-room in later slices.

### Landing network cards

Same as public network discovery — listed seasons and vision cards on `/` discovery dashboard. Must stay within [`landing-copy-contract.mjs`](../site/js/landing-copy-contract.mjs) hero constraints.

---

## Anti-goals

| Anti-goal | Why |
|-----------|-----|
| **Surveillance UI** | No visit counts, heatmaps, “players nearby” |
| **Popularity / trending** | No engagement metrics on cards |
| **Social feed framing** | No infinite scroll of activity |
| **Ontology-first screens** | No L1–L5, Identity/Address/Interpretation labels for strangers |
| **Physical internet before state** | No manifesto essay before useful status |
| **Redesign whole app** | Slice surfaces incrementally |
| **Backend / protocol changes** | UI reorders existing fields only |

---

## Relationship to existing contracts

| Contract | Interaction |
|----------|-------------|
| [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) § Landing | Hero copy unchanged — state-first applies **below** hero on cards |
| [`SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) | Reinforces calm utility scan — state-first extends to browse/board |
| [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) | Limits copy stays honest — position as #4 governance, not hidden |
| [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) | Board stays read-only world truth — state-first ≠ personal progress |
| [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) | Plain language; no protocol nouns in hero bands |

---

## Implementation policy

1. **Documentation first** (this file).
2. **One surface per slice** — copy/layout/CSS micro-adjustments; reuse existing data.
3. **Tests** — update existing copy/layout contract tests; no new e2e unless a contract file exists.
4. **No** new routes, resolver changes, or broad `styles.css` rewrites.
5. **Review** — stranger comprehension (GT / RN rows) after each public slice.

---

## Slice index (planned)

| Slice | Surface | Status |
|-------|---------|--------|
| **SF-1** | Public network discovery cards | **☑ Shipped** — state hero + reordered card body |
| **SF-2** | City board node rows | **☑ Shipped + visually complete** — B13 human sign-off path |
| **SF-2b** | Per-row chip list band | Deferred — wire `buildNodeChipsHtml` on snapshot apply |
| **SF-3** | Scan trust details ordering | Coordinate with WS-REALITY — details band only |
| **SF-4** | `/created/` object headers | After steward comprehension |

---

## SF-1 — First slice spec (recommended)

**Surface:** Landing public network cards (`renderPublicNetworkCard`).

**Changes (data unchanged):**

- Promote `statusLabel` to a **state hero line** directly under title (e.g. “Live now · 40 places”).
- Move `summary` **below** primary CTA (or truncate to one line in #1, full text in #5).
- Clarify CTAs: primary = **Open board**; secondary = **About this network** (rules).
- Optional quiet identity line: `{categoryLabel} · {place}` above or beside title.

**Files:** `public-networks-portal-core.mjs`, `public-networks-portal.css`, `public-networks-portal-core.test.ts`, possibly `landing-copy-contract.test.ts` if card structure is locked.

**Regression:** `npm run verify:landing` · `worker/tests/public-networks-portal-core.test.ts`

---

## Agent checklist (when touching UI)

1. Which **entity** is this card/screen for?
2. What **state** does existing data already provide — is it the hero?
3. What is the **one primary action**?
4. Where does **governance** go without competing with state?
5. Is this **discovery** (browse) or **resolver** (scan truth) — don’t collapse planes.

---

## Related commands

```bash
npm run verify:landing
npm run worker:test -- worker/tests/public-networks-portal-core.test.ts
npm run worker:test -- worker/tests/city-game-map-node-card-core.test.ts
npm run verify:city-game   # after board slice
```
