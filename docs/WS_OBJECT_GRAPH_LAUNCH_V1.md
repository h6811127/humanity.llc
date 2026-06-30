# WS-OBJECT-GRAPH-LAUNCH-V1 — public ship checklist

**Status:** Ready after launch belt passes  
**Scope:** Scan object graph block — ship safety only  
**Builds on:** [`WS_OBJECT_GRAPH_V1.md`](WS_OBJECT_GRAPH_V1.md) · [`WS_OBJECT_GRAPH_PRODUCT_V1.md`](WS_OBJECT_GRAPH_PRODUCT_V1.md)

---

## Launch audit

| Check | Result | Notes |
|-------|--------|-------|
| Mobile layout | **Pass** | `overflow-wrap: anywhere` on graph text; row padding fits 390px viewport |
| Dark theme | **Pass** (fixed) | `html[data-theme="dark"] .scan-object-graph-*` in `site/scan-pass.css` |
| Empty states | **Pass** | No graph block when `relationships[]` empty; legacy vouch chips unchanged |
| Long place names | **Pass** | Wrap without layout break — fixture `cabinet-long-peer-product.html` |
| Revoked edge | **Pass** | D1 lists `status = 'active'` only; composition filters revoked docs; legacy fallback |
| Stale/missing peer | **Pass** (fixed) | Fallback `Nearby place · node_10` + board note; never raw `object_id` |
| No authority jargon | **Pass** (fixed) | Provenance line: *Connection routes for this season were published by @handle.* |
| Production seed | **Pass** (fixed) | See production path below |

---

## Blockers found and fixed

| Blocker | Fix |
|---------|-----|
| No dark-theme styles for graph block | Added dark rules in `site/scan-pass.css` |
| Missing peer showed raw `obj_cr_node_*` | `scanObjectGraphPeerLabel()` + unavailable note |
| “Authority / steward / signed” copy | Renamed to provenance line + CSS class |
| Seed script local-only | `D1_TARGET=remote` + `npm run city-game:seed-relationship-edge:remote` |
| Revoked doc could render if passed through | Filter `edge.status === 'active'` in `scan-object-graph.ts` |

---

## Production path

```bash
# 1. Apply migration on production D1
npm run worker:migrate:remote

# 2. Deploy worker (includes bundled scan CSS)

# 3. Seed signed edges (requires season operator key)
STEWARD_PROFILE_ID=<profile> ISSUER_PRIVATE_KEY=<base58> \
  npm run city-game:seed-relationship-edge:remote
STEWARD_PROFILE_ID=<profile> ISSUER_PRIVATE_KEY=<base58> \
  npm run city-game:seed-relationship-edge-unlock:remote

# Or use API after deploy:
# POST /.well-known/hc/v1/cards/{profile}/relationship-edges
# POST .../relationship-edges/edge_cr_witness_10_07/revoke  (to roll back)
# POST .../relationship-edges/edge_cr_unlock_04_07/revoke
```

**Pre-seed requirements:** Cedar Rapids season objects for edge endpoints exist on the steward profile (`obj_cr_node_10_library`, `obj_cr_node_07_cabinet`, `obj_cr_node_04_river`); issuer key matches `cards.issuer_public_key`.

---

## Commands

```bash
npm run verify:ws-object-graph-launch   # launch belt
npm run ws-object-graph:launch-go       # pre-walk prod gate (D0)
npm run ws-object-graph:launch-go -- --post-walk   # post sign-off (D3)
npm run ws-object-graph:v1-kit          # fixtures + *-product.html + dark variant
npm run verify:ws-object-graph          # full graph regression
```

---

## Screenshots (regenerate)

```bash
npm run ws-object-graph:v1-kit
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const base = 'file://' + process.cwd() + '/site/dev/ws-object-graph-v1/';
  for (const [html, png] of [
    ['cabinet-pending-product.html', 'screenshots/launch-pending-light.png'],
    ['cabinet-pending-dark-product.html', 'screenshots/launch-pending-dark.png'],
    ['cabinet-long-peer-product.html', 'screenshots/launch-long-peer.png'],
    ['cabinet-missing-peer-product.html', 'screenshots/launch-missing-peer.png'],
  ]) {
    await p.goto(base + html);
    await p.locator('.scan-object-graph').screenshot({ path: 'site/dev/ws-object-graph-v1/' + png });
  }
  await b.close();
})();
"
```

| Fixture | File |
|---------|------|
| Pending · light | `site/dev/ws-object-graph-v1/screenshots/launch-pending-light.png` |
| Pending · dark | `site/dev/ws-object-graph-v1/screenshots/launch-pending-dark.png` |
| Long peer name | `site/dev/ws-object-graph-v1/screenshots/launch-long-peer.png` |
| Missing peer label | `site/dev/ws-object-graph-v1/screenshots/launch-missing-peer.png` |

---

## Final launch checklist

- [x] `npm run verify:ws-object-graph-launch` green
- [x] `npm run ws-object-graph:local-smoke -- --seed` green (worker:dev + local D1)
- [x] `npm run ws-object-graph:dual-gate-spine-local -- --setup --seed` green (local D0–D3)
- [x] `npm run ws-object-graph:local-smoke -- --setup --seed --drill` green (local revoke fallback)
- [x] `npm run ws-object-graph:dual-gate-walk` — local D0–D3 walk sheet generated
- [x] `worker:migrate:remote` applied (`0035_relationship_edges.sql`, `0036_relationship_edges_unlock_kind.sql`)
- [x] Worker deployed with bundled scan CSS (post `worker:bundle-scan`) — `npm run worker:deploy` · version `61b2b54d`
- [x] `edge_cr_witness_10_07` seeded on production D1 **or** issued via relationship-edge API
- [x] `edge_cr_unlock_04_07` seeded on production D1 (`npm run ws-object-graph:prod-seed` or `/created/` publish)
- [x] `npm run ws-object-graph:prod-smoke -- --drill` green (prod revoke fallback + re-issue)
- [x] Dark mode graph check (automated): `npm run ws-object-graph:prod-smoke -- --dark-check` · iOS Safari eyes-on still recommended
- [x] Pages deploy: comprehension index + `dual-gate-walk.html` — `npm run ws-object-graph:prod-walk-preflight` **GO**
- [x] Live scan smoke: D1 browser contribute · D2 operator --quorum · D3 graph Live · 2026-06-29 · Spencer

| OG-2 dual-gate D1–D3 prod walk | ☑ | Witness + quorum live on cabinet · graph open · 2026-06-29 · Spencer · D1 browser contribute · D2 operator --quorum · D3 graph Live |
- [x] Board/map unchanged (`witness-gate-parity` still green)

---

## Out of scope (unchanged)

Board snapshot · map SVG · federation · witness self-signing · generic relationship explorer

## OG-2 human walk sign-off

**Result:** ☑ Pass · 2026-06-29 · Spencer

Steps D0–D3 completed on production cabinet (witness + quorum → graph open).


Note: D1 browser contribute · D2 operator --quorum · D3 graph Live
