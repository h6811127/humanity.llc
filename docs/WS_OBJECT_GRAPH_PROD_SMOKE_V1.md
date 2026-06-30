# WS-OBJECT-GRAPH-PROD-SMOKE-V1 — production proof

**Scope:** Witness + unlock RelationshipEdge on production cabinet scan (dual-gate)  
**Builds on:** [`WS_OBJECT_GRAPH_V1.md`](WS_OBJECT_GRAPH_V1.md) · [`WS_OBJECT_GRAPH_LAUNCH_V1.md`](WS_OBJECT_GRAPH_LAUNCH_V1.md)

---

## Commands

```bash
# 1. Apply migrations on production D1 (0035 + 0036 unlock kind)
npm run worker:migrate:remote

# 2. Deploy worker (includes bundled scan CSS)
npm run worker:deploy

# 3. Seed both signed edges (requires season operator key)
npm run ws-object-graph:prod-seed
# or:
npm run city-game:seed-relationship-edges:remote

# 4. Read-only prod smoke (dual-gate cabinet)
npm run ws-object-graph:prod-smoke

# Local revoke drill (no prod credentials required)
npm run ws-object-graph:local-smoke -- --setup --seed --drill

# Dark-mode graph check (Playwright — prod cabinet)
npm run ws-object-graph:prod-smoke -- --dark-check

# 5. Optional: mobile screenshots
npm run ws-object-graph:prod-smoke -- --screenshots

# 6. Optional: revoke + re-issue drill (mutates prod D1)
npm run ws-object-graph:prod-smoke -- --drill
```

**Local credentials:** `worker/.local/city-game-production-seed.json` (`profile_id` + `game_operator_private_key_b58`).

---

## Production URLs

| Step | URL |
|------|-----|
| Cabinet scan (node_07) | https://humanity.llc/c/GcP3Ee17yGqMHdidhEVMYBzq?q=qr_gEPR1PfPPB2z3ze1 |
| Library scan (node_10) | https://humanity.llc/c/GcP3Ee17yGqMHdidhEVMYBzq?q=qr_6zs7Jej5m4ZV4U7e |
| River scan (node_04) | https://humanity.llc/c/GcP3Ee17yGqMHdidhEVMYBzq?q=qr_aMr8qJGBF9xpC1gu |
| Cabinet status JSON | https://humanity.llc/.well-known/hc/v1/cards/GcP3Ee17yGqMHdidhEVMYBzq/status?q=qr_gEPR1PfPPB2z3ze1 |

**Profile:** `GcP3Ee17yGqMHdidhEVMYBzq` · **Handle:** `@cedar_rapids_wake_s01`  
**Edges:** `edge_cr_witness_10_07` (witness) · `edge_cr_unlock_04_07` (quorum unlock)

---

## Automated checks (`ws-object-graph:prod-smoke`)

| Check | Pass criteria |
|-------|----------------|
| Migration 0035 | `relationship_edges` table on remote D1 |
| Witness edge pending | status JSON: `edge_cr_witness_10_07` · `satisfied: false` |
| Unlock edge pending | status JSON: `edge_cr_unlock_04_07` · `satisfied: false` |
| Dual-gate status | `relationships[]` length ≥ 2 |
| Witness graph HTML | heading + Missing + witness label + hero note |
| Dual-gate HTML | both edge labels · ≥2 graph rows · no legacy vouch/unlock chips |
| Revoke drill (`--drill`) | both edges revoked → legacy vouch chips, no graph |
| Re-issue drill | both seed scripts restore `relationships[]` |

Unit tests: `worker/tests/ws-object-graph-prod-smoke-v1.test.ts` (in `npm run verify:ws-object-graph`).

---

## Manual live paths (automation blocked)

| Path | Steps | Expected |
|------|-------|----------|
| **Witness live** | Library scan → contribute **CR-WITNS-4P** → re-scan cabinet | witness row `Live` |
| **Quorum unlock live** | River scan → contribute **CR-LANTERN-7K** until quorum → re-scan cabinet | unlock row `Live` |
| **Dual-gate open** | Both paths satisfied | both rows `Live` · cabinet lore path open |

Cloudflare may block automated `game-contribute` POST from curl/scripts — use real browser.

---

## Screenshots

```bash
npm run ws-object-graph:prod-smoke -- --screenshots
```

| File | Description |
|------|-------------|
| `site/dev/ws-object-graph-v1/screenshots/prod/cabinet-dual-gate-mobile-light.png` | Dual-gate graph · mobile light |
| `site/dev/ws-object-graph-v1/screenshots/prod/cabinet-dual-gate-mobile-dark.png` | Dual-gate graph · mobile dark |

---

## Go / no-go

| Area | Verdict |
|------|---------|
| Both edges seeded on prod | Required for dual-gate smoke |
| Dual-gate pending on real scan | Required |
| Revoke safe fallback | Required (`--drill`) |
| Manual witness + quorum contribute | Required before calling full player path proven |

Report written to `site/dev/ws-object-graph-v1/prod-smoke-report.json`.
