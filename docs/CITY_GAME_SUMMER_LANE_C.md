# Cedar Rapids city game — Lane C (field momentum)

**Status:** Active operator playbook  
**Parent:** [`CITY_GAME_SUMMER_MOMENTUM.md`](CITY_GAME_SUMMER_MOMENTUM.md) · engineering Lane B complete (**SW-S2b–S6b**)  
**Gates:** **B7** physical install · **C5** launch checklist · **`CITY_GAME_ENABLED=1`** · **`city-game:launch-surfaces -- --apply`**

Lane C is **density, cadence, and trust in the field** — not new resolver features. Run this doc in order; use one command for status:

```bash
npm run city-game:lane-c-preflight
```

Exits non-zero when **engineering** blockers remain (Lane B canon, C3 seed, launch surfaces). **Human** gates (B7 stickers, C5 sign-off) print as ☐ until you mark them in the install QA and launch checklist docs.

---

## Before marketing “live summer”

| Gate | What “done” means | Command / doc |
|------|-------------------|---------------|
| **Registry** | Season JSON node count matches install map + mint | Today: **15** pilot · target **40** at open — see § Density |
| **Lane B** | Summer S2–S6 canon on season JSON | `npm run city-game:lane-c-preflight` (Lane B line) |
| **B7** | ≥3 phones × **current** registry count, every sticker | [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) |
| **C5** | P1–P5 + O1–O4 signed | [`CITY_GAME_LAUNCH_CHECKLIST.md`](CITY_GAME_LAUNCH_CHECKLIST.md) |
| **E4** | `CITY_GAME_ENABLED=1` + Worker deploy | Launch checklist · launch day only |
| **P3/P4** | Rules + research surfaces live | `npm run city-game:launch-surfaces -- --apply` → Pages deploy |

Do **not** claim “40-node summer” in press until registry, mint, install map, and B7 all match **40**.

---

## Phase 0 — Engineering smoke (no stickers yet)

| Step | Command | Pass when |
|------|---------|-----------|
| L0 | `npm run verify:city-game` | Vitest + season verify green |
| L1 | `npm run city-game:proof-local` | Full spine on local D1 |
| L2 | `npm run city-game:install-qa-preflight` | E0/E1 markers + seed matches registry count |
| L3 | `npm run city-game:launch-preflight` | Phase D blockers listed |
| L4 | `npm run city-game:lane-c-bootstrap -- --write` | Registry **40** + summer S2–S6 canon on season JSON |
| L4b | `npm run city-game:lane-c-preflight` | Lane B ☑ · density ☑ · C3 ☑ |

LAN kit before field day:

```bash
npm run city-game:dev -- --lan
npm run city-game:install-qa-walk -- --lan
```

Open the printed URL on phones A, B, C — seven checks per node in [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md).

---

## Phase 1 — Density (footprint)

| Milestone | Nodes | Action |
|-----------|-------|--------|
| **Now (pilot)** | 15 | B7 at **15** — valid for soft launch / comprehension; not summer marketing count |
| **Summer open** | **40** | WS-SCALE: merge wave-open season JSON → mint wave → install map → **B7 again at 40** |
| **Mid-season (optional)** | +10 → 50 | **SC-4** only where crews already play — no speculative installs |

**Anchors (meetup lore):** faction HQ + sanctuaries — `node_02`, `node_12` and district HQs per [`CITY_GAME_NODE_INSTALL_MAP.md`](CITY_GAME_NODE_INSTALL_MAP.md).

---

## Phase 2 — Physical install (B7)

**Engineering prep:**

```bash
npm run city-game:lane-c-phase2-preflight
```

Exits non-zero until season registry, install map rows, Lane B canon, and C3 engineering align. After `lane-c-bootstrap --write`, install map should already list **40** rows; re-sync anytime with `npm run city-game:sync-install-map -- --write`.

1. [`CITY_GAME_NODE_INSTALL_MAP.md`](CITY_GAME_NODE_INSTALL_MAP.md) — every row **Installed ☑** · **QR issued ☑**.
2. Stickers at registry labels; photo optional (internal).
3. Per node: phones A/B/C — 200, game template, no leaderboard copy ([`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) table).
4. Scenario spot-checks (E2) on one phone — autonomous spine paths.
5. Sign-off (replace `N` with registry count from `lane-c-preflight`):

```bash
npm run city-game:install-qa-sign-off -- --pass --apply --phones 3 --nodes N
```

---

## Phase 3 — Launch surfaces + flag (C5 / E4)

Human: comprehension ☑ ([`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md)), custody ☑, weekend roster ☑.

**Engineering status (read-only — does not patch HTML or wrangler):**

```bash
npm run city-game:lane-c-phase3-preflight
# after launch-surfaces --apply:
npm run city-game:lane-c-phase3-preflight -- --expect-applied
# launch day bundle (E4 + C5 + B7 + applied):
npm run city-game:lane-c-phase3-preflight -- --launch-day-ready
```

Individual gates (unchanged):

```bash
npm run city-game:launch-checklist-preflight
npm run city-game:launch-surfaces -- --check
# launch day:
npm run city-game:launch-surfaces -- --apply
npm run build && npm run pages:deploy
# Worker: CITY_GAME_ENABLED=1 → deploy
npm run city-game:launch-surfaces -- --check --expect-applied
npm run city-game:smoke-production
```

```bash
npm run city-game:launch-checklist-sign-off -- --pass --apply --commander "Name"
```

---

## Phase 4 — Weekly cadence (June → Labor Day)

### Friday beat (~30 min)

Automated bulletin rotation is **SW-S3b** (six anchors). Operator time is optional overrides only:

| Optional | Action |
|----------|--------|
| Bulletin | Manual `game-update` only if deviating from schedule |
| Artifact | Move enrollment to a new relay (retire old sticker or lore-only) |
| Drill | Compromise on `node_15` or `node_31` — teach commons without surveillance |

Canon: [`CITY_GAME_OPERATOR_RUNBOOK.md`](CITY_GAME_OPERATOR_RUNBOOK.md) § Summer S2b–S6b.

### Merch (Glitch hoodies)

Season JSON lists pilot enrollments (**SW-S5b**). Field hoodies need real `pa_*` mint + enroll:

```bash
npm run city-game:enroll-mobile-lore -- --write \
  --profile-id <season_root_profile_id> \
  --artifact pa_yourHoodie01 \
  --label "Red · Czech Village" \
  --role faction_badge --faction red \
  --mission-line "…" \
  --achievement-lines "First capture;Sanctuary pledge"
```

Mark launch checklist **O5** when at least one hoodie is live in the wild.

### Partners + press

| Tactic | Minimum viable |
|--------|----------------|
| **Partners** | One business vouch per district — copy OK at **O** until Q6 enrollment |
| **Press** | “City state board, no app, no tracking” + photo after a faction swing on the board |

Forbidden claims: heatmap, player counts, “you visited,” personal scoreboards.

---

## Phase 5 — Close (Labor Day)

| Step | Action |
|------|--------|
| Window | `window.ends_at` passes → debrief pattern bodies unlock |
| Debrief | `/play/cedar-rapids/debrief/` · optional `status: "ended"` |
| Season root | Dominant faction + awakening lines via steward `game-update` (operator copy) |
| Post-season | [`city-game:post-season`](CITY_GAME_LAUNCH_CHECKLIST.md) § Phase D close |

---

## Command quick reference

| Command | Lane C use |
|---------|------------|
| `npm run city-game:lane-c-bootstrap -- --write` | **Engineering start** — 40-node registry + Lane B canon + install map |
| `npm run city-game:lane-c-phase2-preflight` | **B7 prep** — map rows, seed, C3 before field |
| `npm run city-game:lane-c-phase3-preflight` | **C5/E4 prep** — surfaces + copy audit + checklist (read-only) |
| `npm run city-game:sync-install-map -- --write` | Refresh O2 install map from season JSON |
| `npm run city-game:lane-c-preflight` | B7/C5/density/Lane B status |
| `npm run city-game:launch-preflight` | Phase D engineering rollup |
| `npm run city-game:install-qa-preflight` | Before stickers |
| `npm run city-game:install-qa-walk -- --lan` | 3-phone field kit |
| `npm run city-game:launch-checklist-preflight` | C5 rows |
| `npm run city-game:launch-surfaces -- --apply` | P3/P4 go live |

---

## Changelog

| Date | Note |
|------|------|
| 2026-06-03 | Lane C playbook + `city-game:lane-c-preflight` |
