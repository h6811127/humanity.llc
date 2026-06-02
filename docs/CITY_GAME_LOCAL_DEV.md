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
| E5 | `city-game:smoke-local` + `city-game:smoke-contribute-local` on `node_01`, `node_04`, `node_07` |
| Manual | `/game-operator/` — safety flips only (compromise, care pause, bulletin rotation) |

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
SCAN_RESOLVER_ORIGIN=http://127.0.0.1:8787
SCAN_PAGES_JS_ORIGIN=http://127.0.0.1:8788
```

`SCAN_*` origins are required when wrangler dev simulates production hostnames (`humanity.llc`) so scan HTML loads local Pages JS instead of production.

Do **not** change `CITY_GAME_ENABLED` in `worker/wrangler.toml` for local dev. That file stays `"0"` until launch deploy.

---

## Step 1 — Regression bundle

```bash
npm run verify:city-game
```

Expect `npm run verify:city-game` green (80+ unit tests) and season warnings for missing `season_root_profile_id` (normal pre-seed).

---

## Step 2 — Start resolver

Terminal A:

```bash
npm run worker:dev
```

Terminal A2 (required for scan page JavaScript — contribute client, device shell modules):

```bash
npm run pages:dev
```

Scan HTML is served on **`:8787`**; static `/js/*.mjs` loads from Pages **`:8788`**. Without `pages:dev`, local scans pull production `humanity.llc` JS (stale until you deploy Pages). Set `SCAN_PAGES_JS_ORIGIN` / `SCAN_RESOLVER_ORIGIN` in `worker/.dev.vars` when wrangler simulates production routes.

Health check: `curl -s http://127.0.0.1:8787/.well-known/hc/v1/health`

---

## Step 3 — Seed local season

Terminal B:

```bash
API_ORIGIN=http://127.0.0.1:8787 npm run city-game:seed-local -- --write-season
```

This writes:

- **`worker/.local/city-game-seed.json`** — owner + game-operator keys, scan URLs, per-node site codes (**never commit**)
- **`worker/.local/city-game-site-codes.json`** — sticker/backing-card reference for autonomous contribute nodes
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

## Step 5 — Autonomous contribute smoke (spine)

With worker still running:

```bash
API_ORIGIN=http://127.0.0.1:8787 npm run city-game:smoke-contribute-local
```

Full spine (quorum + 3 fragments + finale):

```bash
API_ORIGIN=http://127.0.0.1:8787 npm run city-game:smoke-contribute-local -- --spine
```

This POSTs site codes from the seed file — no `/game-operator/` quorum flip. Site codes are listed in `worker/.local/city-game-site-codes.json` after seed.

Reset dev state:

| Command | Resets |
|---------|--------|
| `npm run city-game:reset-quorum-local` | `node_04` quorum + `node_07` cabinet lock |
| `npm run city-game:reset-spine-local` | Full spine above + fragments (`node_09`/`node_11`/`node_01`) + `node_13` finale + `node_10` witness passes |

### Manual browser walkthrough (A3 — fragment → finale)

After quorum smoke passes (or reset spine), eyes-on the fragment lattice:

1. Open `node_09` scan from seed — enter **`CR-MURAL-2F`** → expect “Fragment registered” and `1 / 3` on finale need stream.
2. Open `node_11` — **`CR-MARK-9P`** → `2 / 3`.
3. Open `node_01` — **`CR-RELAY-1N`** → finale opens; spot-scan `node_13` for “Finale switch live” copy.
4. Optional witness scarcity: `node_10` with **`CR-WITNS-4P`** → then `node_07` scan shows witness vouch chip when `node_10` lists cabinet in `vouch_active_for`. After one claim, the same browser hides the contribute form until the next UTC day (device-local ceiling — clear `localStorage` key `hc_game_scarcity_ceiling_v1` in dev tools to re-test).

Use `:8787` scan URLs only (Worker resolver). Pages `:8788` does not serve `/c/…`.

---

## Step 6 — Local proof gate (E1 + E3 + E5)

With worker still running and seed file present:

```bash
API_ORIGIN=http://127.0.0.1:8787 npm run city-game:proof-local
```

Faster replay after a prior full pass:

```bash
API_ORIGIN=http://127.0.0.1:8787 npm run city-game:proof-local -- --skip-verify --quorum-only
```

This runs `verify:city-game`, validates the seed file, `smoke-local`, and full-spine `smoke-contribute-local --spine`.

---

## Step 8 — Multi-phone on your LAN (optional, pre-stickers)

**One URL on each phone** — no copy/paste from the seed file:

```bash
npm run city-game:lan-hub -- --write-dev-vars
npm run worker:dev -- --ip 0.0.0.0
npm run pages:dev -- --ip 0.0.0.0
```

The script writes `site/dev/city-game-lan-hub.html` and prints a bookmark like `http://192.168.x.x:8788/dev/city-game-lan-hub.html`. Open that on each phone — tap scans; site codes are shown inline.

`--write-dev-vars` patches `SCAN_RESOLVER_ORIGIN` / `SCAN_PAGES_JS_ORIGIN` in `worker/.dev.vars` (restart `worker:dev` after).

Witness scarcity: one pass per device per UTC day — use a second phone to confirm the pool decrements while the first phone’s form stays hidden.

---

## Step 7 — Scenario spot-checks (optional, local)

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
| Witness: unlimited passes in browser | Run **`pages:dev`** (`:8788`) + add `SCAN_PAGES_JS_ORIGIN` / `SCAN_RESOLVER_ORIGIN` to **`worker/.dev.vars`** + restart **`worker:dev`**. Hard-refresh scan tab — contribute JS must load from `127.0.0.1:8788`, not production. Clear `localStorage` key `hc_game_scarcity_ceiling_v1` to re-test same device. |
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
| `npm run city-game:smoke-contribute-local` | Autonomous quorum → cabinet (add `--spine` for finale) |
| `npm run city-game:proof-local` | E1 + E3 + E5 gate after seed (add `--skip-verify` / `--quorum-only`) |
| `npm run city-game:reset-quorum-local` | Reset River Lantern quorum + cabinet lock (local D1) |
| `npm run city-game:reset-spine-local` | Reset full autonomous spine for replay |
| `npm run verify:city-game` | Full regression bundle |

**Multi-phone LAN:** `npm run city-game:lan-hub -- --write-dev-vars` → one bookmark on each phone.
