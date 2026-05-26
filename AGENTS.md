# AGENTS.md

## Cursor Cloud specific instructions

This is a Cloudflare Workers + Pages project. No Docker, external databases, or third-party services are needed for local development.

### Node version

The project requires **Node.js 20.18.1** (pinned in `.nvmrc`). Wrangler 4.47.0 does not support Node 22+.

```bash
source ~/.nvm/nvm.sh && nvm use 20.18.1
```

### Services

| Service | Command | URL | Notes |
|---------|---------|-----|-------|
| Worker (API + scan resolver) | `npm run worker:dev` | `http://127.0.0.1:8787` | Must run `npm run worker:migrate:local` first |
| Pages (static site) | `npm run pages:dev` | `http://localhost:8788` | Serves create/created/revoke UI |

### Key commands

- **Install deps**: `npm install`
- **Migrations**: `npm run worker:migrate:local` (idempotent, required before worker:dev)
- **Tests**: `npm run worker:test` (Vitest, all `worker/tests/`) · device-only: `npm run worker:test:device` (`worker/tests/device*`)
- **E2E**: `npm run e2e:install` once, then `npm run e2e` (Playwright; starts `pages:dev` unless `PLAYWRIGHT_SKIP_WEBSERVER=1`)
- **Orphan purge**: Daily cron purges abandoned cards per `docs/CARD_RETENTION_AND_ORPHAN_CLEANUP.md`
- **Landing desktop**: Wider two-column intro at ≥880px per `docs/LANDING_DESKTOP_LAYOUT.md`
- **Build check**: `npm run build` (validates static site exists)
- **Worker dev**: `npm run worker:dev`
- **Pages dev**: `npm run pages:dev`
- **Showcase scan URLs** (M5 / landing): `npm run site:seed-showcase` (status plate), `npm run site:seed-showcase-live-object` (live object), `npm run site:seed-showcase-lost-item` (lost-item relay; each needs `API_ORIGIN`)

### Non-obvious notes

- **Cards vs keys vs verification:** `docs/KEYS_CARDS_AND_VERIFICATION.md` — steward status is on the resolver; vouch signing needs `hc_created` keys on the same browser tab.
- **Status dot vs inbox vs OS alerts:** `docs/DEVICE_INBOX.md` (action items, badge, background alerts) vs `docs/STATUS_INDICATOR_STEWARD_GREEN.md` (trust dot only).
- **Safari / iPhone shell regression (scroll, dead taps):** `docs/SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md` — fix plan; hub scroll smooth / landing lag implicates `device-shell-chrome.mjs` document scroll listener. **Reverted features catalog:** `docs/UI_UX_REVERTED_FEATURES_CATALOG.md` (safe rebuild without lag/rate-limit paths). **Phased implementation:** `docs/UI_UX_SAFE_REBUILD_IMPLEMENTATION.md`.
- **Card disabled since visit:** Banner, hub `#device-hub-card-disabled-group`, and inbox badge must use **resolver-confirmed** poll maps only — never `sessionStorage.hc_wallet_network_cache` alone. Incident **closed** (no Slice 9); see `docs/CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md`. After hub/inbox network changes: `npm run worker:test:card-disabled-since-visit` and `npm run e2e:card-disabled-since-visit`.
- **Worker request budget / polling:** Read `docs/DEVICE_OS_REQUEST_BUDGET.md` before shell network I/O. Live-control Phases 1–4: scoped polling, round-robin one GET per tick, resolver health gate, SW 15 min periodic. Phase 5 hub tools: **Check network**, last-checked line, **Watch for live proof** toggle (`hc_watch_live_proof`; default on). Wallet status: hub-expand refresh + 60s visibility debounce.

### Status dot / hub opener (agent guardrails)

The floating **status dot** (`#brand-status-dot-btn`) is the hub opener on `/`, `/create/`, and `/created/`. On `/wallet/` it only scrolls to saved cards. Do not wire glance-first on dot tap.

**Red outline ring + dead dot on all pages** = `device-status.mjs` import graph failed (`data-device-status-error`). See `docs/STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md`. Never merge a new `./device-*.mjs` import on the status graph without the file in the same PR; add the filename to `DEVICE_STATUS_SHELL_JS_FILES` in `site/js/device-status-shell-modules.mjs`, bump `DEVICE_SHELL_ASSET_VERSION` on shell HTML bootstrap and on every `./peer.mjs?v=N` import between manifest peers. Run `npm run worker:test -- worker/tests/device-status-shell-modules.test.ts`.

When you touch any of these, run the regression suite before finishing:

- `site/js/device-status.mjs`, `device-status-bootstrap.mjs`, `device-dot-state-core.mjs`
- `site/js/device-hub-sheet.mjs`, `device-inbox-sheet.mjs`, `device-hub-glance.mjs`, `device-shell-chrome.mjs`, `device-hub-glance-popover.mjs`
- `site/css/device-shell.css` (especially `pointer-events` on `.top-chrome--float` / `.shell-status-cluster`)

```bash
npm run worker:test
npm run e2e:install   # once per machine
npm run e2e -- e2e/device-status-dot.spec.ts e2e/device-inbox.spec.ts e2e/device-os-wallet.spec.ts
```

**Contracts (do not break without updating docs + tests):**

1. **Module graph** — `device-status-bootstrap.mjs` dynamically imports `device-status.mjs`; a failed import leaves the dot dead with no click handler. New imports must ship in the same deploy and stay listed in `site/js/device-status-shell-modules.mjs` (Vitest + `e2e/device-status-dot.spec.ts`).
2. **Hub open state** — Open/close only through `setHubSheetOpen()` / `setHubExpanded()`. `hubSheetOpen()` treats a collapsed `#device-hub` as closed even if `body.device-hub-sheet-open` is stuck (toggle-trap fix).
3. **Clickability CSS** — `.top-chrome--float { pointer-events: none }` with `.shell-status-cluster` (and dot/badge) at `pointer-events: auto` when `top-chrome--edge-hidden` or hub/inbox locked. See `docs/STATUS_INDICATOR_STEWARD_GREEN.md` troubleshooting.

Manual smoke: `docs/DEVICE_OS_QA.md` **P0-3** (dot opens hub; scroll + tap again). After Safari shell changes: **P0-W** on production WebKit devices.
- The Worker health endpoint is at `/.well-known/hc/v1/health`. If `database` shows `schema_missing`, run migrations.
- The D1 database is emulated locally by Wrangler  -  no external SQLite or Cloudflare account needed for dev.
- Card creation requires Ed25519-signed JSON documents (card + qr_credential). Test fixtures in `worker/tests/fixtures/` provide valid signed payloads.
- The `CLOUDFLARE_API_TOKEN` env var is only needed for remote deployment, not local dev/test.
- Wrangler may print deprecation warnings about Vite CJS build  -  these are harmless.
