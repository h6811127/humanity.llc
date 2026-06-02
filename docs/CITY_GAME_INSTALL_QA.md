# Cedar Rapids city game — physical install QA

**Status:** Internal · Phase C gate  
**Canonical:** [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) · **Runbook:** [`CITY_GAME_OPERATOR_RUNBOOK.md`](CITY_GAME_OPERATOR_RUNBOOK.md)

---

## When to run

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
| `node_04` | Temp drop active | Collective progress copy |
| `node_04` | After `visible_until` | Dormant note; QR still resolves |
| `node_05` | Compromise flip then **revoke** | Revoked/unavailable — no game bulletins |
| `node_07` | Locked cabinet | Vouch / choice copy; no account gate |
| `node_02` or `node_12` | Sanctuary | Regroup / no-capture coop hint |
| `node_14` | Care pause flip | Game bulletins muted; care stream wins |

Operator flips via [`/game-operator/`](../site/game-operator/index.html) on staging.

---

## Game-theory comprehension (GT-1–GT-6)

Run with **5 un coached testers** before launch ([`FOUNDING_COPY_COMPREHENSION_RUNBOOK.md`](FOUNDING_COPY_COMPREHENSION_RUNBOOK.md) pattern). Record pass/fail in implementation brief § Game theory acceptance tests.

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Operator | | |
| Engineering | | |

When complete, mark Phase C physical QA in [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) and proceed to Phase D launch checklist.
