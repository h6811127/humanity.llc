# Cedar Rapids city game — local development walkthrough

**Status:** Internal · Phase C engineering gate  
**Canonical:** [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) · **Launch:** [`CITY_GAME_LAUNCH_CHECKLIST.md`](CITY_GAME_LAUNCH_CHECKLIST.md) · **City board (planned):** [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md)

This is the **careful local path** before physical install QA or production launch. Production stays `CITY_GAME_ENABLED=0` until the launch checklist is signed.

---

## What you are proving

| Gate | Local proof |
|------|-------------|
| E1 | `npm run verify:city-game` — unit tests + season structure |
| E3 | `city-game:seed-local` — season root + 15 nodes + QRs in local D1 |
| E5 | `city-game:smoke-local` + `city-game:smoke-contribute-local` on `node_01`, `node_04`, `node_07` |
| Manual | `/game-operator/` — safety flips only (compromise, care pause, bulletin rotation) |

Physical stickers, 3-phone install, and GT comprehension are **human gates** — see [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) and [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md). Before launch day: `npm run city-game:launch-preflight`.

---

## Three sources of truth (season root)

Local entitlements and game resolver paths can disagree when these three differ:

| # | Source | What it controls |
|---|--------|------------------|
| 1 | **`worker/.local/city-game-seed.json`** (gitignored) | Profile + keys used by `city-game:seed-local` and `hosted:steward-session-local` |
| 2 | **`site/data/city-game-cr-season-01.json`** | Committed `season_root_profile_id` and season metadata |
| 3 | **Running `worker:dev` bundle** | `worker/src/city-game/season-registry.generated.ts` imports (2) at **load time** |

**Symptoms:** `GET …/steward/entitlements?season_id=…` returns **403** `season_id is not linked` while bearer auth works — usually (2) ≠ (1) or (3) stale after editing (2).

**Fix:**

```bash
npm run city-game:sync-season-root   # align (2) to (1) on disk
# restart worker:dev — mandatory
npm run hosted:steward-session-local
```

`city-game:seed-local -- --write-season` only updates (2) during a **full seed** when `season_root_profile_id` is empty (or use `--force` to re-mint). Prefer **sync** when D1 already has nodes.

**Production:** committed `season_root_profile_id` in (2) is canonical for deploy; do not commit local-only profile ids from (1) unless ops intends to change production root.

Steward entitlements verbs: [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) § Normative verbs.

---

## One-time setup

```bash
npm install
npm run city-game:dev -- --bootstrap
```

That command alone: patches **`worker/.dev.vars`** (you never edit it by hand), migrates D1, seeds the season if missing, starts worker + pages, writes the tap-to-scan hub **and GT comprehension kit**, and opens the hub in your browser.

First time only needs `--bootstrap`. After that:

```bash
npm run city-game:dev
```

Ctrl+C stops both servers. For phone LAN (non-guest Wi‑Fi only): `npm run city-game:dev -- --lan`.

Legacy manual steps below if you need them.

---

## Step 1 — Regression bundle

```bash
npm run verify:city-game
```

Expect `npm run verify:city-game` green (80+ unit tests) and season warnings for missing `season_root_profile_id` (normal pre-seed).

---

## Step 2 — Start resolver

**Use `npm run city-game:dev`** (see One-time setup). It replaces separate worker/pages terminals and `.dev.vars` editing.

<details>
<summary>Manual fallback (two terminals)</summary>

Terminal A:

```bash
npm run worker:dev
```

Terminal A2:

```bash
npm run pages:dev
```

</details>

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

**City board (GT-7 engineering proxy):**

```bash
npm run e2e:city-game-map-board
```

Or open `http://localhost:8788/play/cedar-rapids/#city-state` with worker + `CITY_GAME_ENABLED=1` for live snapshot chips.

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

This runs `verify:city-game`, validates the seed file, **resets the autonomous spine**, `smoke-local`, and full-spine `smoke-contribute-local --spine`.

---

## Step 8 — Multi-phone on your LAN (optional, pre-stickers)

**One URL on each phone** — no copy/paste from the seed file:

```bash
npm run city-game:lan-hub -- --write-dev-vars
npm run worker:dev:lan
npm run pages:dev:lan
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
| Scan says **season not open yet** (before window dates) | `npm run city-game:local-env` sets `CITY_GAME_LOCAL_PLAY_OPEN=1` — restart `worker:dev`. Production uses real window only (no override). |
| Full automatic spine (no browser) | `npm run worker:dev` then `npm run city-game:smoke-contribute-local -- --spine` or `npm run city-game:proof-local` |
| Witness: unlimited passes in browser | Run **`pages:dev`** (`:8788`) + add `SCAN_PAGES_JS_ORIGIN` / `SCAN_RESOLVER_ORIGIN` to **`worker/.dev.vars`** + restart **`worker:dev`**. Hard-refresh scan tab — contribute JS must load from `127.0.0.1:8788`, not production. Clear `localStorage` key `hc_game_scarcity_ceiling_v1` to re-test same device. |
| Phone cannot load LAN hub URL | Re-run **`npm run city-game:lan-hub -- --write-dev-vars`** (IP changes per network). Use **`npm run worker:dev:lan`** + **`npm run pages:dev:lan`**. Kill stale ports: `lsof -ti :8787,:8788 \| xargs kill -9`. **Guest/corp Wi‑Fi** often blocks phone→laptop (AP isolation) — use phone hotspot or non-guest Wi‑Fi. |
| Smoke: **HTTP 404** on scan URLs | Seed file points at a profile/QR **not in local D1** — re-run `city-game:seed-local -- --write-season` |
| `CHECK constraint failed: scope IN ('card', 'print_artifact')` | Run `npm run worker:apply-child-object-qr-schema` then re-seed |
| After `rm -rf worker/.wrangler/state/v3/d1` | Re-migrate, apply QR schema, **restart** `worker:dev`, then seed |
| `season_root_profile_id already set` | `npm run city-game:seed-local -- --force` or clear field in season JSON |
| Steward `season_id is not linked` (403) | Seed `profile_id` ≠ `season_root_profile_id` in season JSON — `npm run city-game:sync-season-root`, restart `worker:dev`, re-mint session |
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
| `npm run city-game:sync-season-root` | Set `season_root_profile_id` from `worker/.local/city-game-seed.json` (no re-mint) |
| `npm run hosted:steward-session-local` | Mint bearer for `GET /steward/entitlements` (local curl) |
| `npm run city-game:smoke-local` | Verify game scan HTML after seed |
| `npm run city-game:smoke-contribute-local` | Autonomous quorum → cabinet (add `--spine` for finale) |
| `npm run city-game:proof-local` | E1 + E3 + E5 gate after seed (add `--skip-verify` / `--quorum-only`) |
| `npm run city-game:reset-quorum-local` | Reset River Lantern quorum + cabinet lock (local D1) |
| `npm run city-game:reset-spine-local` | Reset full autonomous spine for replay |
| `npm run city-game:local-env` | Patch `worker/.dev.vars` (`CITY_GAME_ENABLED=1`, `CITY_GAME_LOCAL_PLAY_OPEN=1`) |
| `npm run city-game:contribute-load-local` | B5 — 20 concurrent quorum POSTs (needs worker + seed) |
| `npm run city-game:comprehension-preflight` | C2 engineering — kit pages + probe URLs |
| `npm run city-game:install-qa-preflight` | C3 engineering — seed + install QA doc markers |
| `npm run city-game:install-qa-walk -- --lan` | C3 LAN walk kit — 15 tap links for 3-phone physical QA |
| `npm run city-game:smoke-production-preflight` | C4 engineering — production seed + spot scan URLs |
| `npm run city-game:launch-preflight` | Phase D status (B1–B5, C2–C5 blockers) |
| `npm run verify:city-game` | Full regression bundle |

### Terminal mint scope (Phase E)

| Audience | Path |
|----------|------|
| **New self-serve seasons** | `/create/` season root + `/created/` Live · Manage — **not** `city-game:mint-node` or `city-game:seed-local` |
| **Cedar Rapids pilot / CI** | `city-game:mint-node`, `city-game:seed-local`, `city-game:prep-season` — pilot season only without `--force` |
| **CI / fixture export** | `npm run city-game:mint-node -- --all --season example_city_season_01 --force` |

Self-serve seasons exit **1** from terminal mint scripts unless `--force`, `--ci`, or `CI=1`. See [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) § Cedar Rapids city game.

### E3 self-serve staging (Phase E gate)

Human gate: organizer completes a **full 15-node season in the browser on staging** — no terminal mint.

```bash
npm run city-game:self-serve-staging-preflight
npm run city-game:self-serve-staging-preflight -- --season example_city_season_01
API_ORIGIN=https://humanity.llc npm run city-game:self-serve-staging-preflight -- --profile-id <season_root_profile_id>
npm run city-game:self-serve-staging-preflight -- --profile-id <id> --expect-complete   # sign-off when done
```

Walkthrough (browser only): `/create/` root → `/created/` bulk import 15 nodes → issue QRs → rules publish → deploy preview → spot-scan `node_01`, `node_04`, `node_07` on staging WebKit.

**Multi-phone LAN:** `npm run city-game:lan-hub -- --write-dev-vars` → one bookmark on each phone.
