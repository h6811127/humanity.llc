# Product positioning and loop strategy

**Status:** Active  
**Purpose:** Positioning synthesis, narrative sequencing, and phased implementation plan.  
**Parent:** `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md` · `docs/STATUS_PLATE_PILOT.md`

---

## Narrative stack (canonical — do not collapse)

| Layer | Message | Where |
|-------|---------|--------|
| Hook | Live state on real objects | Landing hero H1 |
| Mechanism | Print once · change or revoke later | Landing hero tagline · how-it-works |
| Category | Public programmable objects / physical software objects | Landing kicker · framing card |
| Catalog | What else can a QR do? | `site/what-can-a-qr-do.html` |

---

## Messaging matrix (canonical copy)

| Surface | Lead copy |
|---------|-----------|
| Landing hero H1 | Live state on real objects |
| Landing hero kicker | Public programmable objects |
| Landing meta / OG | Public programmable objects. Live, revocable status on physical tags — browser-native. No scan tracking. |
| Instagram bio (external) | Public programmable objects. / Live · revocable · browser-native. |
| Create (general) | Create a live card — signed QR, live status, keys in this browser tab |
| Create (status plate) | One plate · one question · open or closed right now |
| Create (lost item) | Tag the item — finders see a live return path, not your phone number |
| Scan (status plate) | Object name + status line + honest limit |
| `/created/` (status plate) | Same QR · publish status updates on Live |
| Commons Pass (Phase D) | Membership infrastructure for communities that refuse surveillance |
| Federation pitch | Democratic trust grammar · portable · federated operators |

**Rule:** Hero hook and meta/OG must not contradict each other. Avoid leading public copy with “OS” — reserve device-shell language for stewards.

---

## Implementation plan

### Step 1 — Status plate habit loop scorecard ✅

**Shipped:**

- Local scorecard on `/created/` for `status_plate` pilots (`site/js/status-plate-loop-scorecard.mjs`)
- Tracks manifesto publish count and last update time per `profile_id` (localStorage — no scan analytics)
- Manual milestones: printed QR, scanned from second device (owner checkboxes; print auto-checks on QR PNG download)
- Surfaces progress toward pilot habit target: **≥2 status updates**

**Exit:** `worker/tests/status-plate-loop-scorecard.test.ts`; scorecard visible on status-plate `/created/` in control workspace.

**Related:** `docs/STATUS_PLATE_PILOT.md` § Habit loop scorecard

### Step 2 — Unlock live update for live-update pilots without first-revoke gate ✅

**Shipped:** `site/js/created-first-revoke-gate.mjs` — `status_plate` and `lost_item_relay` skip revoke-first gate via `isPilotUpdateUnlocked()`.

### Step 3 — Messaging matrix alignment ✅

**Shipped:**

- Landing meta + OG aligned with matrix (`site/index.html`)
- Landing hero kicker → “Public programmable objects” (H1 unchanged)
- Create template-specific hero lead (`site/create/index.html` · `site/js/create-card.mjs`)
- Status plate field hint corrected (Live updates without reprint)
- Vitest: `worker/tests/landing-messaging.test.ts`

### Step 4 — Status plate field pilot (10 plates)

Founder-run; see `docs/STATUS_PLATE_PILOT.md`.

### Step 5 — Terminology sequencing pass (scanner vs steward) ✅

**Shipped:**

- `site/js/pilot-steward-copy.mjs` — plain-language overlay per pilot template
- `/created/` Live + Manage labels sync on template (`syncCreatedPilotStewardCopy`)
- Hub card controls use pilot-aware labels (`applyHubControlPlainLabels`)
- Revoke summary + network hints simplified for status plate and lost-item pilots
- Vitest: `worker/tests/pilot-steward-copy.test.ts`

**Rule:** Precise terms (QR credential, card revoke) remain in Advanced panels and general cards.

### Step 6 — Lost-item scan → create hint (optional) ✅

Calm footer on lost-item relay scan template only — link to `/create/?template=lost_item`. Copy in `worker/src/resolver/scan-safety.ts`; render in `scan-html.ts` (`scan-create-hint`). Tests: `scan.test.ts`, `scan-m5-showcase-paths.test.ts`.

---

## Related

| Doc | Role |
|-----|------|
| `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md` | Vertical priorities + narrative stack |
| `docs/STATUS_PLATE_PILOT.md` | Vertical #1 |
| `docs/M5_STRANGER_TEST_RUNBOOK.md` | Proof loop exit gate |
