# humanity.llc reference resolver (Cloudflare Worker)

Implements `/.well-known/hc/v1/*` and public scan shortcuts per `docs/V1_0_ARCHITECTURE_ROADMAP.md`.

## Local development

From repo root (requires `npm install` once):

```bash
# Apply D1 schema to local database (first time and after new migrations)
npm run worker:migrate:local

npm run worker:dev
```

Health check:

```bash
curl -s http://127.0.0.1:8787/.well-known/hc/v1/health | jq
```

Expected when migrations are applied:

```json
{
  "version": "1.0",
  "operator": "humanity.llc",
  "status": "ok",
  "database": "ok"
}
```

If `database` is `schema_missing`, run `npm run worker:migrate:local`.

Response headers include `X-Resolver-Version` and `X-Resolver-Operator`.

## D1 database

Schema lives in `migrations/` (see `migrations/README.md`).

**First-time remote setup:**

```bash
npm run worker:d1:create
```

Copy the `database_id` from the command output into `worker/wrangler.toml` (replace the placeholder UUID), then:

```bash
npm run worker:migrate:remote
```

## Deploy (step 1.4+)

```bash
npm run worker:deploy
```

Configure `[[routes]]` in `wrangler.toml` for `humanity.llc` before production traffic.

## Roadmap steps

| Step | Status |
|------|--------|
| 1.1 Worker project + health (local) | Done |
| 1.2 D1 schema | Done |
| 1.3 Health on domain | With 1.4 deploy |
| 1.4 Production deploy | Pending |
| 1.5 Signature harness (C-003) | Done (`worker/src/crypto/`) |

## Cryptography (1.5)

- RFC 8785 JCS + Ed25519 sign/verify: `worker/src/crypto/`
- Tests: `npm run worker:test`
- Regenerate golden fixtures: `npm run worker:fixtures`

See `worker/src/crypto/README.md`.
