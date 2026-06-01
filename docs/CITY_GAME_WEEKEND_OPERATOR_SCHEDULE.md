# Cedar Rapids city game — weekend operator schedule

**Status:** Internal template · customize per season dates  
**Runbook:** [`CITY_GAME_OPERATOR_RUNBOOK.md`](CITY_GAME_OPERATOR_RUNBOOK.md)

---

## Shift model

| Window | Operator | Focus |
|--------|----------|-------|
| Fri 17:00–22:00 | Primary | Open relays · River Lantern seed · bulletin rotation |
| Sat 10:00–14:00 | Primary | Collective quorum checks · fragment flips |
| Sat 14:00–22:00 | Backup | Compromise/rekey drill coverage · sanctuary checks |
| Sun 10:00–18:00 | Primary | Finale lattice · cabinet dilemma beat |
| Sun 18:00–22:00 | Backup | Wind-down · post-season pause prep |

---

## Bulletin rotation (manual v1)

| Time (local) | Nodes to touch | Action |
|--------------|----------------|--------|
| Fri open | node_01, node_15 | Open relays · season open copy |
| Sat noon | node_04 | Check collective progress · quorum flip if verified physically |
| Sat evening | node_05 | Optional compromise drill → rekey |
| Sun morning | node_09, node_11 | Confirm fragments live |
| Sun afternoon | node_13 | Finale flip when 3/3 met |
| Sun close | all gates | Optional pause or living-infra copy |

Flips via [`/game-operator/`](../site/game-operator/index.html) — document **world state**, not player rewards.

---

## Escalation

- **Compromised sticker:** revoke QR → verify scan shows unavailable ([`CITY_GAME_SUPPORT_MACROS.md`](CITY_GAME_SUPPORT_MACROS.md))
- **Care pause:** care stream first; mute game bulletins until cleared
- **Resolver outage:** static scan may cache; do not promise live state until Worker healthy
