# Cedar Rapids city game — weekend operator schedule

**Status:** Internal template · **assign names before launch**  
**Runbook:** [`CITY_GAME_OPERATOR_RUNBOOK.md`](CITY_GAME_OPERATOR_RUNBOOK.md)

**Phase C gate:** Replace `[fill]` placeholders with named primary + backup operators and confirm shift coverage for Fri–Sun season window. Required for launch checklist O3 ([`CITY_GAME_LAUNCH_CHECKLIST.md`](CITY_GAME_LAUNCH_CHECKLIST.md)).

---

## Shift model

| Window | Operator | Focus |
|--------|----------|-------|
| Fri 17:00–22:00 | Primary | Open relays · River Lantern seed · bulletin rotation |
| Sat 10:00–14:00 | Primary | Monitor spine scan copy · safety / care checks only |
| Sat 14:00–22:00 | Backup | Compromise/rekey drill coverage · sanctuary checks |
| Sun 10:00–18:00 | Primary | Monitor fragment + finale copy · cabinet dilemma beat (narrative) |
| Sun 18:00–22:00 | Backup | Wind-down · post-season pause prep |

---

## Bulletin rotation (operator-only beats)

**Autonomous spine (no scheduled flip):** River Lantern quorum, witness passes, fragment lattice, and finale open via player site-code contribute — see [`CITY_GAME_AUTONOMOUS_V1.md`](CITY_GAME_AUTONOMOUS_V1.md).

| Time (local) | Nodes to touch | Action |
|--------------|----------------|--------|
| Fri open | node_01, node_15 | Open relays · season open copy |
| Sat noon | node_04 | **Monitor only** — quorum unlocks when players contribute at site |
| Sat evening | node_05 | Optional compromise drill → rekey |
| Sun morning | node_09, node_11, node_01 | **Monitor only** — fragments register via contribute |
| Sun afternoon | node_13 | **Monitor only** — finale opens when lattice complete |
| Sun close | all gates | Optional pause or living-infra copy |

Flips via [`/game-operator/`](../site/game-operator/index.html) — document **world state**, not player rewards.

---

## Escalation

- **Compromised sticker:** revoke QR → verify scan shows unavailable ([`CITY_GAME_SUPPORT_MACROS.md`](CITY_GAME_SUPPORT_MACROS.md))
- **Care pause:** care stream first; mute game bulletins until cleared
- **Resolver outage:** static scan may cache; do not promise live state until Worker healthy

---

## Launch sign-off (O3)

| Check | Done? |
|-------|-------|
| Primary + backup operators named for Fri–Sun window | ☐ Pending |
