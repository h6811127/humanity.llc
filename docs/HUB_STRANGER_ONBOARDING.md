# Hub stranger onboarding (prod walkthrough follow-up)

**Status:** Slice 1–2 shipped · P3 mode labels **removed** (May 2026)  
**Scope:** Device hub on `/`, `/create/`, `/created/`, and `/wallet/` when **no saved cards, pins, or inbox action items**  
**Source:** Production walkthrough May 2026 — combined landing/home + hub-as-OS validated; empty hub read as admin panel before mental model landed  
**Companions:** [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md) · [`DEVICE_OS.md`](DEVICE_OS.md) · [`OWNERSHIP_AND_CONTROL_MODEL.md`](OWNERSHIP_AND_CONTROL_MODEL.md)

---

## Problem

The collapsed hub does not consume layout on `/` (hero stays above the fold). Opening the hub sheet on a **stranger** device still surfaces returning-user chrome:

- **Monitoring** (network checks, watch for live proof)
- **Ownership education** card duplicating the empty hint
- **Backup** import form, **Shortcuts**, **Recent device actions**
- **Status dot reference** legend
- Steward vocabulary before the user has created anything

`/wallet/` already had clearer empty copy (*No cards saved yet · Create one · import a backup*; *Bookmarks only — cannot manage objects*). Landing hub did not match.

---

## Principles

1. **Hook before dock** — hero + **How it works** teach strangers; hub waits until they have something to manage or an inbox item needs action.
2. **One empty voice** — align shell hub empty hint with wallet; teach custody in one line + two CTAs.
3. **Progressive disclosure** — monitoring, shortcuts (landing), activity log, and dot legend appear after first save or when inbox has actionable items. **Restore / import backup** stays visible even in stranger-empty mode ([`OWNERSHIP_RESTORE_UX_PLAN.md`](OWNERSHIP_RESTORE_UX_PLAN.md)).
4. **Do not regress returning users** — `hc_landing_focus` still auto-enables when wallet or pins exist; stranger-empty mode turns off as soon as counts or inbox actions appear.

---

## Priority stack

| P | Change | Status |
|---|--------|--------|
| **P1** | **Stranger-empty hub** — match wallet empty copy; hide steward chrome until first save | Slice 1 shipped |
| **P2** | **Stranger landing chrome** — keep hub collapsed; network-only status line; stranger coachmark copy | Slice 2 shipped |

**Removed (May 2026):** P3 page-aware subtitles under `#shell-status-line` (`On this device`, etc.) — sighted users rely on page context; aria labels per `dotPageKind()` remain. Load failures use the red-ring **load-error coach card** instead (`device-status-load-error.mjs`).

---

## P1 — Stranger-empty hub (Slice 1)

### When active

`isHubStrangerEmptyState()` is true when **all** of:

- `hc_wallet` count = 0  
- `hc_device_pins` count = 0  
- Device inbox `notificationCount()` = 0 (no live proof, cross-tab keys, unsaved tab keys, card-disabled alerts, etc.)

### Visible in stranger-empty mode

| Element | Behavior |
|---------|----------|
| Sheet title | **Saved in this browser** (unchanged) |
| Empty hint | `No cards saved yet.` **Create one** · **import a backup** (same as wallet) |
| Saved items | Section header + **+ New**; empty row copy |
| Pinned scans | Subgroup label + **Bookmarks only — cannot manage objects** + empty row |
| Search | Kept (wallet parity) |
| Backup import | `[data-hub-group="import"]` with **`data-hub-restore-always`** — full form stays visible; empty hint links to `#hub-import-form` |

### Hidden until first save (`data-hub-stranger-empty-hide`)

| Element | Notes |
|---------|--------|
| `#device-hub-network-tools` | Monitoring eyebrow, check buttons, watch toggle |
| `#device-hub-keys-custody` | Education + proactive rows (empty hint carries custody for strangers) |
| `[data-hub-group="shortcuts"]` | Landing hub only — settings remain on page **Shortcuts & settings** section |
| `#device-hub-actions-section` | Recent device actions |
| `#device-hub-status-key` | Status dot color legend |

Root class: **`device-hub--stranger-empty`** on `#device-hub` or `#wallet-page`.

### Copy (Layer 2)

Shared strings in `site/js/device-ownership-copy-core.mjs`:

- `HUB_EMPTY_NO_CARDS_HINT` — lead + link targets (create, import anchor)
- `HUB_PINS_BOOKMARKS_ONLY` — *Bookmarks only — cannot manage objects*
- `HUB_RESTORE_IMPORT_HINT` / `HUB_RESTORE_IMPORT_SUMMARY` — converged backup import copy (Phase 4 step 2; hydrated in `device-hub-import.mjs`)

### Files

| Area | Files |
|------|--------|
| Core | `site/js/device-hub-stranger-empty-core.mjs` |
| Apply | `site/js/device-hub-ui.mjs` (`applyHubStrangerEmptyChrome` on each `refreshDeviceHub`) |
| HTML | `site/index.html`, `site/create/index.html`, `site/wallet/index.html` (empty hint + pins hint + `data-hub-stranger-empty-hide` + import `data-hub-restore-always`) |
| CSS | `site/css/device-shell.css` — hide `[data-hub-stranger-empty-hide]` under `.device-hub--stranger-empty`; **`[data-hub-restore-always]` exempt** |
| Tests | `worker/tests/device-hub-stranger-empty-core.test.ts` · `worker/tests/device-hub-restore-always.test.ts` · HTML guard in `device-hub-header-html.test.ts` |

### Regression

```bash
npm run worker:test:hub-restore-always
npm run worker:test -- worker/tests/device-hub-stranger-empty-core.test.ts worker/tests/device-hub-header-html.test.ts
```

Manual: **P1-HE** in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) — stranger hub on `/` and `/wallet/`.

---

## P2 — Stranger landing chrome (Slice 2)

### Contract

- Hub sheet **stays collapsed** on first visit; coachmark is the only onboarding overlay (no auto-expand). Enforced in `device-status.mjs` init (`setHubExpanded(false)` + `sessionStorage.hc_hub_open = "0"`).
- **Focus mode** enables only when `hc_wallet` or pins exist (`landing-focus.mjs`); strangers always see hero + **How it works** until first save.
- On **`/`** with stranger-empty counts, `#shell-status-line` stays hidden; the neutral empty-wallet dot is the only top-chrome network cue.
- Hub intro coachmark uses **stranger copy** when wallet, pins, and inbox actions are all zero.

### Visible changes (stranger on `/`)

| Element | Behavior |
|---------|----------|
| `body.landing-stranger-chrome` | Set while stranger-empty on landing (hook-before-dock styling hook) |
| `#shell-status-line` | Hidden — network state via dot color + hub panel when opened |
| Hub intro body | *Create a live object first. Later, tap the dot…* (`HUB_INTRO_BODY_STRANGER`) |

### Files

| Area | Files |
|------|--------|
| Core | `site/js/device-hub-stranger-empty-core.mjs` (`isLandingHomePath`, `isLandingStrangerChrome`, `LANDING_STRANGER_CHROME_CLASS`) |
| Apply | `site/js/device-status.mjs` (`applyLandingStrangerChrome`, `renderShellStatusLine`) |
| Coachmark | `site/js/device-hub-intro-coachmark.mjs` |
| Copy | `site/js/device-ownership-copy-core.mjs` (`HUB_INTRO_BODY_STRANGER`) |

### Regression

```bash
npm run worker:test -- worker/tests/device-hub-stranger-empty-core.test.ts worker/tests/device-dot-state.test.ts worker/tests/device-hub-intro-coachmark.test.ts
```

Manual: **P2-SLC** in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md).

---

## Status dot behavior (reference)

Not changed by this work. Authoritative map:

| Surface | Dot tap |
|---------|---------|
| `/`, `/create/`, `/created/` | Toggle hub sheet |
| `/wallet/` | Scroll to saved items |
| Scan (`/c/…`) | No dot |
| No hub DOM | Navigate to `/` |

Home = hub header house icon, not the dot.
