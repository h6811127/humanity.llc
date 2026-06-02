# Cedar Rapids city game — physical install QA

**Status:** Internal · Phase C gate  
**Canonical:** [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) · **Runbook:** [`CITY_GAME_OPERATOR_RUNBOOK.md`](CITY_GAME_OPERATOR_RUNBOOK.md)

---

## Engineering preflight (before stickers)

Run on every branch that touches game scan copy or resolver logic. Does **not** replace the ≥3-phone physical gate below.

| Step | Command | Pass when | Record |
|------|---------|-----------|--------|
| E0 | `npm run verify:city-game` | Vitest green + season registry OK | ☑ **2026-06-02** — 109 tests |
| E1 | `npm run city-game:proof-local` | Live scan + contribute spine on local D1 | ☐ — needs `worker:dev` + seed |
| E2 | Scenario spot-checks below on **one** phone against local or staging URLs | Same expected copy as production template | ☐ |

Local walkthrough: [`CITY_GAME_LOCAL_DEV.md`](CITY_GAME_LOCAL_DEV.md) · seed: `npm run city-game:seed-local -- --write-season`

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

## Game-theory comprehension (GT-1–GT-6)

Human gate — run with **5 un coached testers** before launch ([`FOUNDING_COPY_COMPREHENSION_RUNBOOK.md`](FOUNDING_COPY_COMPREHENSION_RUNBOOK.md) pattern). Full runbook: [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md).

Engineering preflight only: `city-game-game-theory.test.ts` asserts scan templates never render forbidden score/analytics copy — **not** a substitute for GT-1–GT-6 human pass.

---

## Sign-off

| Gate | Status | Date |
|------|--------|------|
| Engineering preflight (`verify:city-game`) | ☑ Pass | 2026-06-02 |
| Physical install (≥3 phones × 15 nodes) | ☐ Pending | |
| GT comprehension (≥5 testers) | ☐ Pending | |

| Role | Name | Date |
|------|------|------|
| Operator | | |
| Engineering | | |

When complete, mark Phase C physical QA in [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) and proceed to Phase D launch checklist.
