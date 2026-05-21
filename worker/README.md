# humanity.llc reference resolver (Cloudflare Worker)

Implements `/.well-known/hc/v1/*` and public scan shortcuts per `docs/V1_0_ARCHITECTURE_ROADMAP.md`.

## Local development

From repo root (requires `npm install` once):

```bash
npm run worker:dev
```

Health check:

```bash
curl -s http://127.0.0.1:8787/.well-known/hc/v1/health | jq
```

Expected:

```json
{
  "version": "1.0",
  "operator": "humanity.llc",
  "status": "ok"
}
```

Response headers include `X-Resolver-Version` and `X-Resolver-Operator`.

## Deploy (step 1.4+)

```bash
npm run worker:deploy
```

Configure `[[routes]]` in `wrangler.toml` for `humanity.llc` before production traffic.

## Roadmap steps

| Step | Status |
|------|--------|
| 1.1 Worker project + health (local) | Done |
| 1.2 D1 schema | Next |
| 1.3 Health on domain | With 1.4 deploy |
| 1.4 Production deploy | Pending |
