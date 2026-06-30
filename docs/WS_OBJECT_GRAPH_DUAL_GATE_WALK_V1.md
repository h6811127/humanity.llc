# WS-OBJECT-GRAPH dual-gate field walk (D0–D3)

**Scope:** Manual proof that witness + unlock edges compose on the Czech Village cabinet  
**Builds on:** [`WS_OBJECT_GRAPH_V1.md`](WS_OBJECT_GRAPH_V1.md) · [`WS_OBJECT_GRAPH_PROD_SMOKE_V1.md`](WS_OBJECT_GRAPH_PROD_SMOKE_V1.md)

---

## Generate walk sheet

```bash
# Local (worker:dev + pages:dev)
npm run ws-object-graph:dual-gate-walk
# Open http://127.0.0.1:8788/dev/ws-object-graph-v1/dual-gate-walk.html

# Production comprehension path
npm run city-game:comprehension-kit -- --production
# Open https://humanity.llc/play/cedar-rapids/comprehension/ — links dual-gate walk
npm run ws-object-graph:dual-gate-walk -- --production
# Open https://humanity.llc/play/cedar-rapids/comprehension/dual-gate-walk.html
```

---

## Automated preflight (D0 only)

```bash
npm run worker:migrate:local
npm run city-game:seed-local
npm run worker:dev   # separate terminal

npm run ws-object-graph:local-smoke -- --setup --seed
# Report: site/dev/ws-object-graph-v1/local-smoke-report.json

# Automated D0–D3 spine (witness contribute + river quorum → cabinet open)
npm run ws-object-graph:dual-gate-spine-local -- --setup --seed
# Report: site/dev/ws-object-graph-v1/dual-gate-spine-local-report.json

# Revoke drill (local D1 — legacy vouch fallback, then re-issue)
npm run ws-object-graph:local-smoke -- --setup --seed --drill
```

When local seed profile (`CEen…`) differs from `season_root_profile_id` in `city-game-cr-season-01.json` (prod `GcP3…`), D1–D2 use **wrangler satisfy** instead of `game-contribute` (404 without season alignment). The belt still asserts witness + unlock edge satisfaction and D3 cabinet open on scan HTML/JSON.

Manual wrangler steps (same D1/D2 state the spine applies):

```bash
npm run ws-object-graph:satisfy-dual-gate-local -- --witness   # node_10 vouch_active_for node_07
npm run ws-object-graph:satisfy-dual-gate-local -- --unlock    # node_07 unlocked_by node_04
npm run ws-object-graph:satisfy-dual-gate-local -- --satisfy     # both
```

Production automated belt (after seed + deploy):

```bash
npm run ws-object-graph:prod-seed
npm run ws-object-graph:prod-smoke
npm run ws-object-graph:prod-smoke -- --dark-check
# Screenshot: site/dev/ws-object-graph-v1/screenshots/prod/cabinet-dual-gate-mobile-dark-check.png

# Human D1–D3 preflight (D0 scans + Pages deploy gate)
npm run ws-object-graph:prod-walk-preflight
# Deploy when Pages gate fails:
npm run city-game:comprehension-kit -- --production && npm run pages:deploy
```

---

## Walk steps

| Step | Action | Expect |
|------|--------|--------|
| **D0** | Scan cabinet · expand Live object details | Graph shows witness + unlock rows — both **Missing**; no legacy vouch chips |
| **D1** | Scan library · complete witness contribute (`CR-WITNS-4P`) | Witness edge **Live** on cabinet status JSON |
| **D2** | Scan river · complete quorum contribute (`CR-LANTERN-7K`) | Unlock edge **Live** on cabinet status JSON |
| **D3** | Re-scan cabinet | Both edges satisfied · cabinet path open |

---

## Local scan URLs (from `city-game-seed.json`)

| Node | Site code | QR |
|------|-----------|-----|
| Cabinet (node_07) | — | `qr_Ag51j5E7WAAk5E5t` |
| Library witness (node_10) | `CR-WITNS-4P` | `qr_hfiQzG53d6oj25aq` |
| River Lantern (node_04) | `CR-LANTERN-7K` | `qr_aV3BcFtid5NBfCuM` |

Profile: `CEenC57QN9qqnr2x5L89cbWt` · API: `http://127.0.0.1:8787`

---

## Production scan URLs

| Node | Site code | QR |
|------|-----------|-----|
| Cabinet | — | `qr_gEPR1PfPPB2z3ze1` |
| Library witness | `CR-WITNS-4P` | `qr_6zs7Jej5m4ZV4U7e` |
| River Lantern | `CR-LANTERN-7K` | `qr_aMr8qJGBF9xpC1gu` |

Profile: `GcP3Ee17yGqMHdidhEVMYBzq`

**Edges:** `edge_cr_witness_10_07` · `edge_cr_unlock_04_07`

Seed both on prod before walk:

```bash
npm run city-game:seed-relationship-edges:remote
# or npm run ws-object-graph:prod-seed
```

---

## Human sign-off (D1–D3)

After engineering preflight passes:

```bash
npm run ws-object-graph:prod-walk-preflight
# Open https://humanity.llc/play/cedar-rapids/comprehension/dual-gate-walk.html
# Complete D1 library → D2 river → D3 cabinet on a phone

npm run ws-object-graph:dual-gate-walk-sign-off -- --pass --operator "Your name" --apply
```

Production Pages deploy (from feature branch):

```bash
npm run city-game:comprehension-kit -- --production
npm run pages:deploy -- --branch main --commit-dirty=true
```

**D2 quorum incomplete (operator verify only):** when river progress is below target:

```bash
npm run ws-object-graph:satisfy-dual-gate-prod -- --quorum
# Sets river 20/20 evolved copy + cabinet unlocked_by node_04
npm run ws-object-graph:prod-smoke -- --d3-check
```

Unlock-only shortcut (skips river evolved state):

```bash
npm run ws-object-graph:satisfy-dual-gate-prod -- --unlock
```

Full launch belt after deploy:

```bash
# Pre-walk (D0 cold cabinet — before human D1–D3)
npm run ws-object-graph:launch-go

# Post-walk (cabinet open — after sign-off)
npm run ws-object-graph:launch-go -- --post-walk
```
