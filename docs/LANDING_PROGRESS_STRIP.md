# Landing progress strip

**Status:** Spec agreed (May 2026) · **Phase 1 not shipped** · Phase 2 after Phase 1  
**Scope:** `/` (`site/index.html`) · `.landing-progress` · `site/js/landing-progress.mjs`  
**Companion:** [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md) · [`CARD_WORKSPACE_UX.md`](CARD_WORKSPACE_UX.md) · [`CARD_WORKSPACE_PHASE0.md`](CARD_WORKSPACE_PHASE0.md)

---

## Problem (current shipped UI)

The inset **“Your first live object in four steps”** block looks like a **step wizard** (numbered chips, `is-done` / `is-next` styling) but behaves inconsistently:

| Issue | What happens today |
|-------|-------------------|
| **Four nav affordances, one destination** | Steps **Save keys** and **Print** link to `/created/`. Contextless `/created/` **redirects to `/wallet/`** (My cards home). Step **My cards** also links to `/wallet/`. Three labels often open the same page. |
| **Only Create is distinct** | Step **Create** → `/create/` is the only chip that reliably goes somewhere else. |
| **Highlight ≠ this visit** | `landing-progress.mjs` sets `is-next` / `is-done` from **`localStorage`** (`hc_wallet`, `hc_device_pins`) on every homepage load. A returning steward can see e.g. **Print** highlighted without tapping anything on this page. |
| **Stranger confusion** | Empty wallet still marks step 2 (**Save keys**) as `is-next`, so a first-time visitor may see “step 2 active” before creating anything. |

This erodes trust: the strip teaches a custody journey but does not navigate it honestly.

**Not the same control as:** the **setup wizard** on `/created/` (“Four steps · keys stay in this browser” — Save → Print → Test scan → Live). That wizard is card-scoped and session-scoped; this doc is **landing-only**.

---

## Product decision

The strip has **one primary job** on the homepage:

> **Teach the steward custody journey** (create → save keys on device → print QR → manage on My cards) **and**, for returning visitors, offer **one honest “continue” action** derived from browser-local state.

We explicitly **reject** four peer hyperlinks that mostly land on My cards unless each href can perform the verb on the label (Phase 2).

### Dual surface (Job C)

| Audience | Strip shows | Primary action |
|----------|-------------|----------------|
| **Stranger** (no saved cards) | **Read-only legend** — four labels, **neutral** styling (no fake “step 3 active”) | Single **Continue** → Create (or hero CTA only; strip button optional) |
| **Returning steward** (`hc_wallet` non-empty) | Legend may show **subtle progress** (optional `is-done` on completed phases) | **One Continue** button — label + `href` from resolver (below) |

**Keep** existing hero **Create** and hub **My cards** entry points. The strip is **not** a second full nav bar.

---

## Target UX (after Phase 1)

```text
┌─────────────────────────────────────────────┐
│ YOUR FIRST LIVE OBJECT IN FOUR STEPS        │
│  (1 Create) (2 Save keys) (3 Print) (4 …)   │  ← legend, not four equal <a>s
│                                             │
│  [ Continue: <context-specific label> ]     │  ← one primary control
└─────────────────────────────────────────────┘
```

- **Legend:** `1 Create` · `2 Save keys` · `3 Print` · `4 My cards` — typography only, or non-navigating list items.
- **Continue:** one `<a>` or `<button>`; copy and destination from **`resolveLandingContinue()`** (pure function, unit-tested).

### Visual state rules (Phase 1)

| Condition | Legend | Continue |
|-----------|--------|----------|
| `hc_wallet` empty | All steps **neutral** (no `is-next` on load) | **Create your first live object** → `/create/` |
| Wallet has entries, keys not saved on device for resume target | Optional: mark **1** done | **Save keys on this device** → see href table |
| Saved on device, print/setup not complete for target card | Optional: **1–2** done | **Print your QR** → see href table |
| Otherwise | Optional: **1–3** done | **Open My cards (N)** → `/wallet/` |

**Do not** highlight a step as “next” on cold load unless **Continue** is shown and its label matches that step.

Pins (`hc_device_pins`) may refine “print vs manage” in the resolver; today’s script uses pins only to flip between step 3 and 4 as `is-next` — replace that with Continue copy, not orphan highlight.

---

## Resume resolver (contract)

Implement as a **pure function** (e.g. in `landing-progress.mjs` or `landing-progress-core.mjs`) consumed by the landing module:

```ts
// Shape (illustrative)
type LandingContinue = {
  label: string;
  href: string;
  legendStep: 1 | 2 | 3 | 4 | null; // which legend step Continue corresponds to
  legendDone: (1 | 2 | 3 | 4)[];   // optional subtle done styling
};
```

### Inputs (browser-local only)

| Signal | Storage | Use |
|--------|---------|-----|
| Saved card profiles | `localStorage.hc_wallet` | Any cards on device |
| Pinned scan links | `localStorage.hc_device_pins` | Optional progress hint (today: step 3 vs 4) |
| Setup finished per profile | `localStorage.hc_setup_done` | Print/live gate (align with [`CARD_WORKSPACE_UX.md`](CARD_WORKSPACE_UX.md)) |
| Unsaved keys / inbox | hub fingerprint / wallet rows | Prefer **Save keys** when a card needs device save (Phase 1: best-effort via wallet; Phase 2: inbox-aware) |

**No server state.** Custody truth stays on the client.

### Continue label + href (Phase 1 minimum)

| Resolver outcome | Continue label (example) | `href` (Phase 1 — honest minimum) |
|------------------|--------------------------|-----------------------------------|
| No wallet | Create your first live object | `/create/` |
| Need save on device | Save keys on this device | `/wallet/` (focus first unsaved row or open hub — **not** bare `/created/` until redirect/deeplink is fixed) |
| Need print / deploy | Print your QR | `/wallet/` (user uses row actions) **or** deferred until Phase 2 |
| Ready / manage | Open My cards · *N saved* | `/wallet/` |

Phase 1 accepts **wallet as hub** for steps 2–3 if deeplinks are not ready; the **label** must not imply four different products when the destination is the same.

### Phase 2 — step-specific deeplinks

Only after Phase 1 UX is validated. Each Continue target should match the verb:

| Intent | Target (conceptual) |
|--------|---------------------|
| Save keys | Wallet row needing save, or `/created/?fresh=1` / hash with keys loaded + setup step 1 / keys strip |
| Print | `openCardControlPage()` / setup print step for **default or last-active** `profile_id` |
| My cards | `/wallet/` |

Share resolution logic with hub where possible (`openCardControlPage`, `openCardNowPage`, default card selection).

---

## Relationship to other landing blocks

| Block | Role | Overlap |
|-------|------|---------|
| **Hero CTA** | Primary stranger action → `/create/` | Continue duplicates Create for empty wallet — acceptable if copy aligned |
| **How it works** flow strip | **Public** loop: print → scan → verify | Different story (scanner audience vs steward custody); do not merge in Phase 1 |
| **Device hub** | Operational home for saved cards | Continue should agree with hub notices (unsaved keys, print, inbox) |
| **Landing focus mode** | Hides `[data-landing-tutorial]` including progress | Unchanged — strip is intro-only |

---

## Implementation phases

### Phase 1 — Honest UX (ship first)

1. Documented contract (this file).
2. Extract **`resolveLandingContinue()`** + Vitest fixtures for storage snapshots.
3. **HTML/CSS:** legend (non-link or disabled styling) + single Continue control.
4. **Remove** misleading `is-next` on strangers; tie any `is-done` to resolver `legendDone` only when wallet non-empty.
5. **Stop** pointing steps 2–3 at contextless `/created/` in markup (or remove step links entirely).
6. **QA:** manual cases below; optional Playwright on `/` (incognito vs seeded `localStorage`).

### Phase 2 — Deeplinks (follow-up PR)

1. Continue `href`s open the screen that performs Save / Print for the resolved card.
2. Optional: shared helper imported by hub + landing.
3. Revisit legend `is-done` granularity using `hc_setup_done` per profile.

### Explicit non-goals

- Four equal clickable steps without deeplinks.
- Server-backed “progress” or accounts.
- Replacing the `/created/` setup wizard.
- Large landing redesign (merging with **How it works**) before Phase 1 ships.

---

## Current shipped files (pre-refactor)

| Path | Role |
|------|------|
| `site/index.html` | Markup: four `<a>` steps |
| `site/js/landing-progress.mjs` | `is-done` / `is-next` from wallet + pins only |
| `site/styles.css` | `.landing-progress-*` |

---

## Tests and QA

### Vitest (Phase 1)

Add tests for `resolveLandingContinue()` (or equivalent) with mocked storage:

- Empty wallet → Create, neutral legend.
- Wallet, no pins → Save or Print per contract table.
- Wallet + pins → My cards or Print per contract.

### Manual (`docs/DEVICE_OS_QA.md` — add when Phase 1 ships)

| Case | Expect |
|------|--------|
| Incognito `/` | No step looks “active”; one Continue → Create (if shown). |
| Wallet with cards, no pins | Continue label matches next real task; no three links to same URL with different verbs. |
| After completing save in another tab | `storage` event updates Continue (existing listener pattern). |

---

## Changelog

| Date | Note |
|------|------|
| May 2026 | Spec from landing UX review: legend + Continue; Phase 1/2 split; documents current four-link footgun. |
