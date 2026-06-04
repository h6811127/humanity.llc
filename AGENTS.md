# AGENTS.md

Cloudflare Workers + Pages project. No Docker or external databases for local dev.

## Environment

**Node.js 20.18.1** (`.nvmrc`). Wrangler 4.47.0 does not support Node 22+.

```bash
source ~/.nvm/nvm.sh && nvm use 20.18.1
```

| Service | Command | URL |
|---------|---------|-----|
| Worker (API + scan) | `npm run worker:migrate:local` then `npm run worker:dev` | `http://127.0.0.1:8787` |
| Pages (static site) | `npm run pages:dev` | `http://localhost:8788` |

## Key commands

```bash
npm install
npm run worker:test          # Vitest — all worker/tests/
npm run verify:live:fast     # WS-LIVE belt — PSO five-layer + city game (CI)
npm run verify:live          # WS-LIVE pre-merge (+ live-object e2e)
npm run ws-live:preflight    # LO-1–LO-5 engineering status report
npm run ws-live:lo1-kit      # LO-1 printed pilot field walk (site/dev/)
npm run e2e:install          # once per machine
npm run e2e                  # Playwright (starts pages:dev unless PLAYWRIGHT_SKIP_WEBSERVER=1)
npm run build                # validate static site
npm run notify:inventory     # WS-NOTIF N0 notification path registry
npm run notify:verify        # WS-NOTIF N1+ inbox / dot / browser-notify belt
npm run notify:foreground:e2e # WS-NOTIF N3 foreground U0 strip (Playwright)
```

Worker health: `GET /.well-known/hc/v1/health` — if `database: schema_missing`, run `npm run worker:migrate:local`.

Card creation needs Ed25519-signed JSON (fixtures in `worker/tests/fixtures/`). `CLOUDFLARE_API_TOKEN` only for remote deploy.

## Documentation (read before coding)

| Need | Doc |
|------|-----|
| **Engineering invariants** | [`docs/SYSTEM_INVARIANTS.md`](docs/SYSTEM_INVARIANTS.md) |
| **Live object architecture** | [`docs/LIVE_OBJECT_ARCHITECTURE.md`](docs/LIVE_OBJECT_ARCHITECTURE.md) · catalog [`docs/QR_DESIGN_SPACE.md`](docs/QR_DESIGN_SPACE.md) |
| **Safari keys custody** | [`docs/SAFARI_KEYS_CUSTODY.md`](docs/SAFARI_KEYS_CUSTODY.md) |
| **Hybrid custody (easy + keys)** | [`docs/CUSTODY_EASY_MODE.md`](docs/CUSTODY_EASY_MODE.md) · [`docs/CUSTODY_PHASE0_RUNBOOK.md`](docs/CUSTODY_PHASE0_RUNBOOK.md) · [`docs/OWNERSHIP_AND_CONTROL_MODEL.md`](docs/OWNERSHIP_AND_CONTROL_MODEL.md) |
| **Core loop quality + UX** | [`docs/CORE_PRODUCT_LOOP.md`](docs/CORE_PRODUCT_LOOP.md) · **WS-QUALITY** · `npm run verify:desk` |
| **Front door + positioning** | [`docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md`](docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md) § Front door strategy |
| **Notifications v2 (active)** | [`docs/NOTIFICATION_SYSTEM_V2.md`](docs/NOTIFICATION_SYSTEM_V2.md) · **WS-NOTIF** · inbox + delivery router |
| **Active work + regression gates** | [`docs/PRODUCT_WORKSTREAM_COORDINATION.md`](docs/PRODUCT_WORKSTREAM_COORDINATION.md) · **WS-NOTIF** · **WS-QUALITY** · Phase 2 **WS-SCALE / WS-SW / WS-CUSTODY** paused until Q3 + N4 |
| **Feature map / roadmap** | [`docs/STEWARD_DEVICE_ROADMAP.md`](docs/STEWARD_DEVICE_ROADMAP.md) |
| **Doc policy + archive** | [`docs/DOC_MAINTENANCE.md`](docs/DOC_MAINTENANCE.md) |

Do **not** create new investigation docs for routine bugs. Update `SYSTEM_INVARIANTS.md` + tests, or the canonical feature spec.

## Agent checklist

1. Read `PRODUCT_WORKSTREAM_COORDINATION.md` — check active branches; do not duplicate open PR scope.
2. Read `SYSTEM_INVARIANTS.md` for your surface before editing shell/wallet/scan code. City game: [`docs/CITY_GAME_V1_IMPLEMENTATION.md`](docs/CITY_GAME_V1_IMPLEMENTATION.md) § Architecture (risks **R-***, gates **B***). Live objects / design space: [`docs/LIVE_OBJECT_ARCHITECTURE.md`](docs/LIVE_OBJECT_ARCHITECTURE.md). Read-only city board: [`docs/CITY_GAME_MAP_DASHBOARD.md`](docs/CITY_GAME_MAP_DASHBOARD.md).
3. Run `npm run verify:desk:fast` (every change); `npm run verify:desk` before merge. Surface extras: workstream doc · city game: `npm run verify:city-game`. **Landing `/`:** hero is **“The sticker stays. The status changes.”** + `#launch-doors` — never restore “Live state on real objects” or hero Create CTA; run `npm run verify:landing` (contract: `site/js/landing-copy-contract.mjs`).
4. Bump `DEVICE_SHELL_ASSET_VERSION` when adding imports to the status module graph; list files in `DEVICE_STATUS_SHELL_JS_FILES`.
5. After `site/scan-pass.css` changes: `npm run worker:bundle-scan`.
6. Shell boot flash (RC-1–RC-7): [`docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md`](docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md) · `npm run worker:test:shell-boot`.

## Status dot guardrails (summary)

Full contracts: [`docs/SYSTEM_INVARIANTS.md`](docs/SYSTEM_INVARIANTS.md) § Device shell.

- Dot opens hub on `/`, `/create/`, `/created/`; on `/wallet/` scrolls to saved cards only.
- Red outline = total status graph failure (`data-device-status-error`); partial = amber ring, hub still opens.
- Never merge a new static import on the status graph without the file in the same deploy + shell modules list test.

Manual smoke: `docs/DEVICE_OS_QA.md` **P0-3**. Safari shell changes: **P0-W** on production WebKit.
