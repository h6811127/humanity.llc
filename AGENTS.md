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
- **Tests**: `npm run worker:test` (Vitest, worker tests under `worker/tests/`)
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
- The Worker health endpoint is at `/.well-known/hc/v1/health`. If `database` shows `schema_missing`, run migrations.
- The D1 database is emulated locally by Wrangler  -  no external SQLite or Cloudflare account needed for dev.
- Card creation requires Ed25519-signed JSON documents (card + qr_credential). Test fixtures in `worker/tests/fixtures/` provide valid signed payloads.
- The `CLOUDFLARE_API_TOKEN` env var is only needed for remote deployment, not local dev/test.
- Wrangler may print deprecation warnings about Vite CJS build  -  these are harmless.
