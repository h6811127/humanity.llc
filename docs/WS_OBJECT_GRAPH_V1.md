# WS-OBJECT-GRAPH-V1 — object scan graph

**Status:** Shipped (witness + unlock RelationshipEdge)  
**Scope:** Object scan page + status JSON only — no board/map changes  
**Workstream:** Agent 3 / scan surface  
**Related:** [`HUMANITY_OBJECT_MODEL_V1.md`](HUMANITY_OBJECT_MODEL_V1.md) §10 · product copy [`WS_OBJECT_GRAPH_PRODUCT_V1.md`](WS_OBJECT_GRAPH_PRODUCT_V1.md)

---

## What it does

When verified signed edges exist for a scanned `game_node`, the scan page shows a **Place in the network** block:

| Kind | UI group | Meaning |
|------|----------|---------|
| **witnesses** (incoming) | Before you can open this | Witness gate blocking this object |
| **witnesses** (outgoing) | Places you help unlock | Witness vouch this scan enables |
| **unlocks** (incoming) | Before you can open this | Quorum/unlock path not yet satisfied on this object |
| **unlocks** (outgoing) | Places you help unlock | Quorum path this scan helps open elsewhere |

Legacy installs without D1 edges keep **`vouch_requires` chips** and **`Unlocked by node_*` chips** unchanged. When a signed edge of the matching kind is active, legacy chips for that gate are suppressed on scan HTML.

---

## Verification checklist

| # | Criterion | Automated |
|---|-----------|-----------|
| 1 | Real scan page shows graph block | `ws-object-graph-v1-verify.test.ts` · `relationship-edge-scan-parity.test.ts` |
| 2 | Legacy `vouch_requires` still works | same |
| 3 | Signed RelationshipEdge takes precedence | same + `relationship-edge-evaluator.test.ts` |
| 4 | Page names who declares the rule | authority line + `scan.relationship_rules` |
| 5 | Missing / Live states understandable | HTML asserts `Missing` / `Live` + label copy |
| 6 | Board/map unchanged | `witness-gate-parity.test.ts` · map chip golden in verify test |
| 7 | Dev fixtures for screenshots | `npm run ws-object-graph:v1-kit` |

---

## Commands

```bash
# Full WS-OBJECT-GRAPH-V1 belt
npm run verify:ws-object-graph

# Regenerate dev HTML (open with pages:dev)
npm run ws-object-graph:v1-kit
# → http://127.0.0.1:8788/dev/ws-object-graph-v1/

# Local live scan (after seed)
npm run worker:migrate:local
npm run city-game:seed-local
npm run city-game:seed-relationship-edge
npm run city-game:seed-relationship-edge-unlock
npm run worker:dev   # :8787
npm run pages:dev    # :8788 — dev fixtures only; live scan hits worker
```

---

## Status JSON

When signed edges load:

```json
{
  "scan": {
    "relationships": [{
      "edge_id": "edge_cr_witness_10_07",
      "kind": "witnesses",
      "direction": "incoming",
      "role": "required_by",
      "rule_source": "signed_edge",
      "label": "Library witness vouch opens cabinet path",
      "satisfied": false,
      "peer_object_id": "obj_cr_node_10_library",
      "peer_public_label": "Library witness"
    }],
    "relationship_rules": {
      "signed": true,
      "steward_profile_id": "…",
      "network_id": "cr_season_01_wake",
      "edge_count": 1
    }
  }
}
```

---

## Out of scope (unchanged)

- Board snapshot / map SVG / network lens
- Federation, charters, activity streams
- Witness self-signing / authority model
- Generic relationship explorer UI

---

## Reference edges (Cedar Rapids)

Witness + quorum unlock paths publish as signed RelationshipEdges. Fragment → finale edges in `unlock_edges` stay in **game_meta** only (not scan graph v1).

| edge_id | kind | from → to | Label |
|---------|------|-----------|-------|
| `edge_cr_witness_10_07` | witnesses | Library → cabinet | Library witness vouch opens cabinet path |
| `edge_cr_unlock_04_07` | unlocks | River → cabinet | River Lantern unlocks Czech Village cabinet |

---

## Manual screenshot path

1. `npm run ws-object-graph:v1-kit`
2. `npm run pages:dev`
3. Open `/dev/ws-object-graph-v1/index.html`
4. Expand **Live object details** on each fixture (graph also visible in onboarding hero region)
5. Capture **cabinet-dual-gate-pending** (witness + unlock · Missing), **cabinet-quorum-pending**, **cabinet-pending**, **river-unlocks-live**

Reference captures (regenerate with kit + pages:dev):

| Fixture | File |
|---------|------|
| Cabinet · witness + unlock pending | `site/dev/ws-object-graph-v1/screenshots/cabinet-dual-gate-pending.png` |
| Cabinet · witness missing | `site/dev/ws-object-graph-v1/screenshots/cabinet-pending.png` |
| Cabinet · quorum unlock missing | `site/dev/ws-object-graph-v1/screenshots/cabinet-quorum-pending.png` |
| Library · witness unlocks live | `site/dev/ws-object-graph-v1/screenshots/library-unlocks-live.png` |
| River · quorum unlocks live | `site/dev/ws-object-graph-v1/screenshots/river-unlocks-live.png` |

HTML fixtures: `site/dev/ws-object-graph-v1/*.html` (written by `npm run ws-object-graph:v1-kit`).

---

## Next slice

**Prod walk preflight:** `npm run ws-object-graph:prod-walk-preflight` — **GO**. **Prod D3 check:** `npm run ws-object-graph:prod-smoke -- --d3-check` — **GO** (both edges Live on cabinet). **Human gate:** D1 witness done on prod · D2 quorum still **5/20** (needs group play for full player path) · sign-off after full D2 or document operator unlock in walk notes.
