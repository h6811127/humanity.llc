# Cedar Rapids city game — local development walkthrough

**Status:** Internal · Phase C engineering gate  
**Canonical:** [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) · **Launch:** [`CITY_GAME_LAUNCH_CHECKLIST.md`](CITY_GAME_LAUNCH_CHECKLIST.md)

This is the **careful local path** before physical install QA or production launch. Production stays `CITY_GAME_ENABLED=0` until the launch checklist is signed.

---

## What you are proving

| Gate | Local proof |
|------|-------------|
| E1 | `npm run verify:city-game` — unit tests + season structure |
| E3 | `city-game:seed-local` — season root + 15 nodes + QRs in local D1 |
| E5 | `city-game:smoke-local` — game scan template on `node_01`, `node_04`, `node_07` |
| Manual | `/game-operator/` — signed game-update flip |

Physical stickers, 3-phone install, and GT comprehension are **human gates** — see [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) and [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md).

---

## One-time setup

```bash
npm install
npm run worker:migrate:local
npm run worker:apply-child-object-qr-schema   # required — child_object QR scope
cp worker/.dev.vars.example worker/.dev.vars   # if missing
```

Add to **`worker/.dev.vars`** (gitignored — never commit):

```bash
CITY_GAME_ENABLED=1
```

Do **not** change `CITY_GAME_ENABLED` in `worker/wrangler.toml` for local dev. That file stays `"0"` until launch deploy.

---

## Step 1 — Regression bundle

```bash
npm run verify:city-game
```

Expect 27 tests green and season warnings for missing `season_root_profile_id` (normal pre-seed).

---

## Step 2 — Start resolver

Terminal A:

```bash
npm run worker:dev
```

Health check: `curl -s http://127.0.0.1:8787/.well-known/hc/v1/health`

---

## Step 3 — Seed local season

Terminal B:

```bash
API_ORIGIN=http://127.0.0.1:8787 npm run city-game:seed-local -- --write-season
```

This writes:

- **`worker/.local/city-game-seed.json`** — owner + game-operator keys, scan URLs (**never commit**)
- **`season_root_profile_id`** in `site/data/city-game-cr-season-01.json` (local profile only — revert before prod launch if needed)

Save keys offline, then delete or restrict the seed file on shared machines.

---

## Step 4 — Scan smoke (E5)

With worker still running:

```bash
API_ORIGIN=http://127.0.0.1:8787 npm run city-game:smoke-local
```

Optional — all 15 nodes:

```bash
API_ORIGIN=http://127.0.0.1:8787 npm run city-game:smoke-local -- --all
```

Open a `local_scan_url` from the seed file in Safari if you want eyes-on confirmation.

---

## Step 5 — Operator flip (manual)

Terminal C (Pages, for static `/game-operator/` UI):

```bash
npm run pages:dev
```

Open `http://localhost:8788/game-operator/`:

1. Paste **game-operator private key** from seed file.
2. Enter **season root profile_id**.
3. Load nodes → pick `node_04` → apply “River Lantern quorum met” preset → publish.

Re-run smoke or spot-scan `node_04` to see updated copy.

---

## Step 6 — Scenario spot-checks (optional, local)

From [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) § Scenario spot-checks — run on local URLs before stickers:

| Node | Flip | Expect |
|------|------|--------|
| `node_05` | Compromise → revoke | No game bulletins; unavailable copy |
| `node_14` | Care pause | `scan-game-care-note`; bulletins muted |
| `node_04` | Past `visible_until` | `scan-game-dormant-note`; QR still 200 |

---

## When local proof is done

- [ ] Mark engineering items in [`CITY_GAME_LAUNCH_CHECKLIST.md`](CITY_GAME_LAUNCH_CHECKLIST.md) E1, E3, E5
- [ ] Fill [`CITY_GAME_NODE_INSTALL_MAP.md`](CITY_GAME_NODE_INSTALL_MAP.md) during physical install
- [ ] Run GT comprehension — [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md)
- [ ] **Do not** set prod `CITY_GAME_ENABLED=1` until launch checklist signed

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Missing script` | Run from repo root; `git pull` for latest `package.json` |
| `Missing script: "city-game:season-root,"` | Do not paste comma — run commands separately |
| `INVALID_QR_PAYLOAD` on seed | Expected — seed uses `https://humanity.llc/c/…` payloads; use `local_scan_url` for browser |
| Smoke: missing `scan-game-chips` | `CITY_GAME_ENABLED=1` in `.dev.vars` + restart `worker:dev` |
| Smoke: **HTTP 404** on scan URLs | Seed file points at a profile/QR **not in local D1** — re-run `city-game:seed-local -- --write-season` |
| `CHECK constraint failed: scope IN ('card', 'print_artifact')` | Run `npm run worker:apply-child-object-qr-schema` then re-seed |
| After `rm -rf worker/.wrangler/state/v3/d1` | Re-migrate, apply QR schema, **restart** `worker:dev`, then seed |
| `season_root_profile_id already set` | `npm run city-game:seed-local -- --force` or clear field in season JSON |
| `object_id already in local D1` | Reuse seed file or reset D1 (migrate + apply-child-object-qr-schema + restart worker) |
| Game-operator 404 | `CITY_GAME_ENABLED=1` locally; check profile_id matches seed |

---

## Command reference

| Command | Purpose |
|---------|---------|
| `npm run city-game:season-root` | Generate game-operator keypair + checklist |
| `npm run city-game:mint-node -- --all` | Print unsigned node payloads |
| `npm run city-game:prep-season` | season-root + mint templates chained |
| `npm run city-game:seed-local` | Create season root + 15 nodes on local D1 |
| `npm run city-game:smoke-local` | Verify game scan HTML after seed |
| `npm run verify:city-game` | Full regression bundle |
