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
npm run e2e:install          # once per machine
npm run e2e                  # Playwright (starts pages:dev unless PLAYWRIGHT_SKIP_WEBSERVER=1)
npm run build                # validate static site
```

Worker health: `GET /.well-known/hc/v1/health` — if `database: schema_missing`, run `npm run worker:migrate:local`.

Card creation needs Ed25519-signed JSON (fixtures in `worker/tests/fixtures/`). `CLOUDFLARE_API_TOKEN` only for remote deploy.

## Documentation (read before coding)

| Need | Doc |
|------|-----|
| **Engineering invariants** | [`docs/SYSTEM_INVARIANTS.md`](docs/SYSTEM_INVARIANTS.md) |
| **Live object architecture** | [`docs/LIVE_OBJECT_ARCHITECTURE.md`](docs/LIVE_OBJECT_ARCHITECTURE.md) · catalog [`docs/QR_DESIGN_SPACE.md`](docs/QR_DESIGN_SPACE.md) |
| **Safari keys custody** | [`docs/SAFARI_KEYS_CUSTODY.md`](docs/SAFARI_KEYS_CUSTODY.md) |
| **Active work + regression gates** | [`docs/PRODUCT_WORKSTREAM_COORDINATION.md`](docs/PRODUCT_WORKSTREAM_COORDINATION.md) · multi-agent: **WS-DOC / WS-REV / WS-CR / WS-E** |
| **Feature map / roadmap** | [`docs/STEWARD_DEVICE_ROADMAP.md`](docs/STEWARD_DEVICE_ROADMAP.md) |
| **Doc policy + archive** | [`docs/DOC_MAINTENANCE.md`](docs/DOC_MAINTENANCE.md) |

Do **not** create new investigation docs for routine bugs. Update `SYSTEM_INVARIANTS.md` + tests, or the canonical feature spec.

## Agent checklist

1. Read `PRODUCT_WORKSTREAM_COORDINATION.md` — check active branches; do not duplicate open PR scope.
2. Read `SYSTEM_INVARIANTS.md` for your surface before editing shell/wallet/scan code. City game: [`docs/CITY_GAME_V1_IMPLEMENTATION.md`](docs/CITY_GAME_V1_IMPLEMENTATION.md) § Architecture (risks **R-***, gates **B***). Live objects / design space: [`docs/LIVE_OBJECT_ARCHITECTURE.md`](docs/LIVE_OBJECT_ARCHITECTURE.md). Read-only city board: [`docs/CITY_GAME_MAP_DASHBOARD.md`](docs/CITY_GAME_MAP_DASHBOARD.md).
3. Run the regression block for your surface (see PR template or workstream doc) before finishing. City game: `npm run verify:city-game`.
4. Bump `DEVICE_SHELL_ASSET_VERSION` when adding imports to the status module graph; list files in `DEVICE_STATUS_SHELL_JS_FILES`.
5. After `site/scan-pass.css` changes: `npm run worker:bundle-scan`.
6. Shell boot flash (RC-1–RC-7): [`docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md`](docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md) · `npm run worker:test:shell-boot`.

## Status dot guardrails (summary)

Full contracts: [`docs/SYSTEM_INVARIANTS.md`](docs/SYSTEM_INVARIANTS.md) § Device shell.

- Dot opens hub on `/`, `/create/`, `/created/`; on `/wallet/` scrolls to saved cards only.
- Red outline = total status graph failure (`data-device-status-error`); partial = amber ring, hub still opens.
- Never merge a new static import on the status graph without the file in the same deploy + shell modules list test.

Manual smoke: `docs/DEVICE_OS_QA.md` **P0-3**. Safari shell changes: **P0-W** on production WebKit.
