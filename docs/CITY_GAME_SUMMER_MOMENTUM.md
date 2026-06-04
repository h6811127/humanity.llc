# Cedar Rapids city game — summer momentum (Lane B + Lane C)

**Status:** Active product plan · **SW-S2b ☑** · **SW-S3b ☑** · **SW-S4b ☑** · **SW-S5b ☑** · **SW-S6b ☑** (post-season debrief)  
**Parent:** [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) · workstream [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md) (**WS-SW**)  
**Ops:** [`CITY_GAME_OPERATOR_RUNBOOK.md`](CITY_GAME_OPERATOR_RUNBOOK.md) § Summer beats

This doc captures the **“killer summer / become a thing in Cedar Rapids”** plan — separate from the full **CR-***/**PWM-*** traceability catalog (every page bullet) and honest about what is **automated (L)** vs **operator rhythm (O)**.

---

## Lane B — Gamify (resolver + board)

High-impact **L** upgrades that change scan + city board week to week. Priority order:

| # | Traceability | Delivery | Nodes / proof |
|---|--------------|----------|----------------|
| 1 | **SW-09** rare artifacts | **L** (SW-S2b) | `node_21` `hidden_relay` · `node_22` `double_capture` · `city-game-summer-s2-core.mjs` |
| 2 | **SW-12** overharvest → compromised | **L** (SW-S2b) | `node_15` · `node_31` · `relay-contribute.ts` |
| 3 | **CR-E02 / SW-10** scheduled bulletins | **L** (SW-S3b) | 6 anchor relays · `bulletin_schedule` · `npm run city-game:scale-summer-s3` |
| 4 | **SW-13** dual victory visible | **L** (SW-S4b) | `#city-game-map-dual-victory` · snapshot `paths` · `npm run city-game:scale-summer-s4` |
| 5 | **SW-11 / SW-15** faction badges | **L** (SW-S5b) | `mobile_lore_enrollment` canon · `scale-summer-s5` · play rules · `enroll-mobile-lore` for field hoodies |
| 6 | **SW-14** debrief | **L** (SW-S6b) | `/play/cedar-rapids/debrief/` · pattern gate until `ends_at` · board CTA · `scale-summer-s6` |
| 7 | Device-local discovered pins | **C** → UX | optional; fog stays policy-safe (**SW-08**) |

**Defer** unless spare capacity: **CR-G04** dilemma tokens, **CR-SV10** guestbook, **CR-X03** weather API, **PWM-ST03** 8 PM windows, **PWM-M04** issue-report workflow.

**Regression:** `npm run city-game:scale-summer-s2` · `scale-summer-s3` · `scale-summer-s4` · `scale-summer-s5` · `scale-summer-s6` · `npm run verify:city-game` · `worker/tests/dual-victory.test.ts` · `city-game-dual-victory-board-core.test.ts` · `worker/tests/city-game-summer-s2-core.test.ts` · `worker/tests/city-game-summer-s3-core.test.ts` · `worker/tests/city-game-summer-s5-core.test.ts` · `worker/tests/city-game-summer-s6-core.test.ts` · `worker/tests/city-game-debrief-core.test.ts` · `worker/tests/city-game-bulletin-schedule.test.ts` · `city-game-faction-badge.test.ts`

**Re-mint note:** Existing D1 `game_node` rows keep old `game_meta` until re-seed or operator rekey. New mints from templates pick up SW-S2b defaults. Local: `npm run city-game:seed-local -- --force` after pulling SW-S2b.

---

## Lane C — City momentum (field + partners)

**Playbook:** [`CITY_GAME_SUMMER_LANE_C.md`](CITY_GAME_SUMMER_LANE_C.md) · status: `npm run city-game:lane-c-preflight`

Engineering enables; **density + cadence** make it spread:

| Tactic | Action |
|--------|--------|
| **Density** | 40 well-placed nodes at open; **SC-4** (+10) only where crews already play |
| **Friday beats** | One bulletin flip + optional artifact move + optional compromise drill (30 min operator) |
| **Anchors** | 4 faction HQ + sanctuaries (`node_02`, `node_12`) as meetup lore |
| **Partners** | One business vouch per district (copy OK at **O** until Q6 enrollment) |
| **Merch** | Hoodie `faction_badge` scans in the wild |
| **Press** | “City state board, no app, no tracking” + photo after a faction swing |

**Gates before marketing “live summer”:** **B7** install QA (≥3 phones × 40) · **C5** launch checklist · production `CITY_GAME_ENABLED=1` · `city-game:launch-surfaces -- --apply`

---

## Summer timeline (June → Labor Day)

| Month | Lane B (engineering) | Lane C (operators) |
|-------|----------------------|---------------------|
| **June open** | SW-S2b artifacts + overharvest live · fog board · player capture | Stickers from canonical mint · rules + board linked · week-1 bulletin |
| **July mid** | Bulletin schedule beats · optional move artifact node | Friday clues · overharvest drill on `node_15` or `node_31` · SC-4 wave if ready |
| **August late** | Finale + dual victory pressure on board | Reinforce meta on hot relays · partner photo / local press |
| **Close** | SW-14 debrief · post-season pause | Dominant faction + awakening lines on season root |

---

## Changelog

| Date | Note |
|------|------|
| 2026-06-03 | Lane B/C plan documented · **SW-S2b** artifacts + overharvest on four nodes |
| 2026-06-03 | **SW-S3b** — weekly bulletin beats on six anchors (`merge-summer-s3-bulletins`) |
| 2026-06-03 | **SW-S4b** — dual victory panel on city board + rules copy (**SW-13**) |
| 2026-06-03 | **SW-S5b** — four faction badge + courier enrollments (`merge-summer-s5-enrollment`) · play rules (**SW-11** / **SW-15**) |
| 2026-06-03 | **SW-S6b** — debrief path + pattern gate + board/banner CTAs (`merge-summer-s6-debrief`) (**SW-14**) |
| 2026-06-03 | **Lane C** — field playbook + `city-game:lane-c-preflight` |
| 2026-06-03 | **Lane C bootstrap** — `city-game:lane-c-bootstrap` · 40-node registry target · install QA walk uses registry count |
