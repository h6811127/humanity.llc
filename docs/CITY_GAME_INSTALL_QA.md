# Cedar Rapids city game — physical install QA

**Status:** Internal · Phase C gate  
**Canonical:** [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) · **Runbook:** [`CITY_GAME_OPERATOR_RUNBOOK.md`](CITY_GAME_OPERATOR_RUNBOOK.md)

---

## Engineering preflight (before stickers)

Run on every branch that touches game scan copy or resolver logic. Does **not** replace the ≥3-phone physical gate below.

| Step | Command | Pass when | Record |
|------|---------|-----------|--------|
| E0 | `npm run verify:city-game` | Vitest green + season registry OK | ☑ **2026-06-02** — see `verify:city-game` bundle |
| E1 | `npm run city-game:proof-local` | Live scan + contribute spine on local D1 | ☑ **2026-06-02** — full spine pass |
| E2 | Scenario spot-checks below on **one** phone against local or staging URLs | Same expected copy as production template | ☑ **2026-06-03** |
| E3 | `npm run city-game:install-qa-preflight` | Local seed 15 nodes + doc markers green | Run before physical gate |
| E4 | `npm run city-game:smoke-local` | Spot nodes HTTP 200 + game scan template | After `worker:dev` + seed |

Local walkthrough: [`CITY_GAME_LOCAL_DEV.md`](CITY_GAME_LOCAL_DEV.md) · seed: `npm run city-game:seed-local -- --write-season`

**LAN walk kit (before stickers):** on home Wi‑Fi or hotspot, run `npm run city-game:install-qa-walk -- --lan` (writes `site/dev/city-game-install-qa-walk.html` for all **15** season registry nodes), then `npm run city-game:dev -- --lan`. Open the printed URL on phones A, B, C — tap each node link and work through the seven checks below.

Automated copy guard (no leaderboard / XP / streak strings): `worker/tests/city-game-game-theory.test.ts` (included in `verify:city-game`).

---

## When to run (physical)

After all 15 nodes are minted, QR issued, and stickers/placards installed — **before** setting `CITY_GAME_ENABLED=1` on production.

Local/staging proof first: `CITY_GAME_ENABLED=1` in **`worker/.dev.vars`**, then follow [`CITY_GAME_LOCAL_DEV.md`](CITY_GAME_LOCAL_DEV.md). Season root + 3 prototype nodes minimum.

---

## Per-node checklist (repeat ×15)

| # | Check | Pass? |
|---|--------|-------|
| 1 | QR resolves on **phone A** (Safari or Chrome) — HTTP 200, not 404 | ☐ |
| 2 | Same on **phone B** (different OS if possible) | ☐ |
| 3 | Same on **phone C** | ☐ |
| 4 | Scan shows **public object state** (streams + label) — not app download wall | ☐ |
| 5 | No leaderboard, streak, XP, or scan-count copy | ☐ |
| 6 | **Care stream** visible; node_14 shows maintenance/safety boundary copy | ☐ |
| 7 | Sticker placement matches registry label (photo optional, internal) | ☐ |

---

## Scenario spot-checks (minimum set)

| Node | Scenario | Expected scan |
|------|----------|---------------|
| `node_01` | Relay bulletin live | Controller + bulletin streams |
| `node_04` | Temp drop active | Collective progress copy + contribute block |
| `node_04` | Site code contribute | `CR-LANTERN-7K` → quorum fills → `node_07` unlocks (no operator) |
| `node_04` | After `visible_until` | Dormant note; QR still resolves |
| `node_05` | Compromise flip then **revoke** | Revoked/unavailable — no game bulletins |
| `node_07` | Locked cabinet | Vouch / choice copy; no account gate |
| `node_07` | After River quorum | Unlocked together copy (autonomous) |
| `node_09`, `node_11`, `node_01` | Fragment site codes | Fragment registers on `node_13` → finale opens |
| `node_02` or `node_12` | Sanctuary | Regroup / no-capture coop hint |
| `node_14` | Care pause flip | Game bulletins muted; care stream wins |

Safety flips only via [`/game-operator/`](../site/game-operator/index.html) on staging (compromise, care pause, bulletin rotation).

---

## Network board field scenarios (B13 / SF-3)

Run on **≥2 phones** (Safari + Chrome if possible) at an **outdoor** venue or in **bright sun** — not only at a desk. Canonical spec: [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) § Network lens · human gate **GT-8** in [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md).

URL: `/play/cedar-rapids/map/` (production or LAN dev). **Operator kit:** [`gt8-field-walk.html`](../site/play/cedar-rapids/comprehension/gt8-field-walk.html) — 10s timer + scenario checklist (`npm run city-game:network-lens-gt8-kit -- --production`).

| # | Scenario | Pass when |
|---|----------|-----------|
| B1 | Fresh open, no coaching | Tester points to a **first stop on the map within 10s** (GT-8) |
| B2 | Outdoor / glare | Pin labels and express spine readable without zoom |
| B3 | Tap a spine pin | Selection shows **world state** (chips/effect), Scan + Maps — not duplicate essay block |
| B4 | Tap a non-spine pin | Same panel shape; state differs from personal progress |
| B5 | After scanning one node | Board refresh shows **snapshot chips** on pin or panel — not “you visited N times” |
| B6 | Expand “all places” | Full node list still state-first rows (SF-2); map remains visible |
| B7 | Privacy probe (GT-7) | Tester describes **city knowledge**, not GPS tracking or personal rank |

Record photos optional (internal). Failures block **B13** centerpiece sign-off until SF-3 Phase 1–2 fixes land.

---

## Public network player flow shell (PD-1–PD-5)

**Human execution pending** — run PD-1–PD-5 with un coached strangers.

Human gate — run with **3 un coached strangers** on production or LAN dev before treating discover → board → scan as stranger-ready. Engineering belt: `npm run verify:public-network-player-flow`.

**Operator kit:** [`player-flow-field-walk.html`](../site/play/cedar-rapids/comprehension/player-flow-field-walk.html) — linked from C2 comprehension hub and rules operator footnote (`npm run player-flow:field-kit:production`).

| # | Scenario | Pass when |
|---|----------|-----------|
| PD-1 | Discover network | From `/` or `/play/season/`, finds Wake the city and opens board — no coaching |
| PD-2 | What a scan proves | From catalog or home, reaches rules `#rules-prove-title` without search |
| PD-3 | Board shell intro | Dismisses first-visit banner, taps start callout, opens selection panel |
| PD-4 | First stop (world state) | Names suggested first place — collective state, not GPS rank |
| PD-5 | Scan handoff | Finds scan link on place row or scan onboarding **Open board** + **What a scan proves** CTAs |

When passed:

```bash
npm run player-flow:sign-off -- --pass --apply --strangers 3 --pass-count 3
```

---

## Game-theory comprehension (GT-1–GT-8)

Human gate — run with **5 un coached testers** before launch ([`FOUNDING_COPY_COMPREHENSION_RUNBOOK.md`](FOUNDING_COPY_COMPREHENSION_RUNBOOK.md) pattern). Full runbook: [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md). **GT-7** covers the live city state board when marketing the map dashboard; **GT-8** covers orientation speed on the **network lens** (SF-3 sign-off).

Engineering preflight only: `city-game-game-theory.test.ts` asserts scan templates never render forbidden score/analytics copy — **not** a substitute for GT-1–GT-8 human pass.

---

## Sign-off

| Gate | Status | Date |
|------|--------|------|
| Engineering preflight (`verify:city-game`) | ☑ Pass | 2026-06-02 |
| Local proof gate (`city-game:proof-local`) | ☑ Pass | 2026-06-02 |
| Physical install (≥3 phones × 15 nodes) | ☐ Pending | |
| GT comprehension (≥5 testers) | ☑ Pass | 2026-06-03 |
| Player flow shell (≥3 strangers, PD-1–PD-5) | ☐ Pending | |

| Role | Name | Date |
|------|------|------|
| Operator | | |
| Engineering | | |

When complete:

```bash
npm run city-game:install-qa-sign-off -- --pass --apply --phones 3 --nodes 15
```

Then mark Phase C physical QA in [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) and proceed to Phase D launch checklist.
