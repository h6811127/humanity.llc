# Cedar Rapids city game — operator runbook

**Status:** Internal · Season 1 prep  
**Audience:** Weekend operators  
**Canonical spec:** [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) · **Custody:** [`CITY_GAME_OPERATOR_CUSTODY.md`](CITY_GAME_OPERATOR_CUSTODY.md)

---

## Before the weekend

1. Confirm `season_root_profile_id` in [`site/data/city-game-cr-season-01.json`](../site/data/city-game-cr-season-01.json).
2. All 15 nodes minted + QR issued (`npm run city-game:mint-node -- --all`).
3. Physical stickers installed; spot-scan each node on ≥3 phones (Phase C QA).
4. Game-operator private key available offline; `/game-operator/` tested locally.
5. Public rules page reviewed: [`/play/cedar-rapids/`](../site/play/cedar-rapids/index.html) (enable at launch only).

---

## Routine flips (game-update)

Use [`/game-operator/`](../site/game-operator/index.html) or signed `POST …/game-update`.

| Situation | What to publish | Fields |
|-----------|-----------------|--------|
| **Relay bulletin rotation** | New public bulletin line | `public_state`, narrative stream |
| **Faction hold change** | Controller field update | `place` stream Controller value |
| **River Lantern quorum met** | “Unlocked together” copy | `collective_progress`, `unlocked_by: ["node_04"]`, unlock `node_07` in copy |
| **Cabinet dilemma beat** | Shared vs private ending state | narrative stream + schedule in operator notes |
| **Scarcity pass issued** | Decrement witness passes | `game_meta.scarcity_remaining` |
| **Finale ready** | Three fragments met | `node_13` streams + `unlocked_by` from season config |

**Game-theory check:** every flip describes **world state**, not player rewards. No leaderboard, XP, or scan counts.

---

## Compromise + rekey (`node_05` bridge)

1. Set `game_meta.compromised: true` + bulletin warning on bridge node.
2. Keep **care stream** honest (bridge physically open ≠ game trust).
3. After physical rekey / steward verification, set `compromised: false` + new bulletin.
4. Do **not** publish per-player access logs — public rekey only.

Preset buttons on `/game-operator/` cover compromise + rekey for drills.

---

## Maintenance pause (care wins)

When a site needs repair, flood closure, or safety pause:

1. Update **care** stream to maintenance language (`Maintenance pause`, `Closed`, etc.).
2. Scan template automatically mutes game bulletins ([`scan-view.ts`](../worker/src/city-game/scan-view.ts) precedence).
3. After steward repair, clear care stream → reopen route streams.

**Hard boundary:** players never mark emergency or safety equipment “safe.”

---

## Revoke / pause compromised marker

| Action | Who | How |
|--------|-----|-----|
| Disable one node QR | Owner, recovery, or game-operator | `organizer_revoked` via `/organizer-revoke/` or owner revoke on `/created/` |
| Pause season | Owner | Disable child object or card |
| Mid-season sticker swap | Issue new QR on same object | owner `issue-qr` on `/created/` |

Verify scan shows revoked/paused truth — no ghost game copy.

---

## Finale flip (`node_13`)

Finale switch stays **dormant** until coordination lattice complete:

- Fragment nodes: `node_09`, `node_11`, plus operator confirmation for NewBo relay (`node_01`) per season config unlock edges.
- When 3/3 met, flip `node_13` streams from Dormant → Finale live.
- Announce via public rules page + optional research page banner update at launch (Phase D).

---

## Temp drop expiry (`node_04`)

When `game_meta.visible_until` passes, scan shows **dormant** copy — QR still resolves (no 404). Operator may extend window with signed update before expiry.

---

## Mobile lore hoodies (optional)

Enroll Glitch hoodie `print_artifact` QRs in season JSON → `mobile_lore_enrollment[]` with `{ "print_artifact_id", "label" }`. Owner updates status line; operator may attach fragment 3 hints. No new mint SKU required.

---

## Escalation

| Issue | Action |
|-------|--------|
| Resolver error on game-update | Check `CITY_GAME_ENABLED`, signer is issuer key, `updated_at` monotonic |
| Strangers confused by scan | Rules page + GT comprehension retest |
| Suspected scan logging | Confirm data policy — no heatmaps; file incident if access logs expand |
| Key lost | Owner/recovery path on season root; game-operator loss blocks flips only |

---

## Post-season

Per launch decision (Q5 in implementation brief): pause all nodes or leave living-infrastructure subset active. Document choice in season JSON `status` field before Phase D.
