# humanity.llc reference resolver (Cloudflare Worker)

Implements `/.well-known/hc/v1/*` and public scan shortcuts per `docs/V1_0_ARCHITECTURE_ROADMAP.md`.

## Node.js version

This repo pins **`wrangler@4.47.0`**, which runs on **Node 20 LTS** (not Node 22).

**Recommended Node:** `>=20.18.1` (see `.nvmrc`). On `20.11.0` you may see a harmless-looking `EBADENGINE` for `undici` — it still installs; bumping to the latest **20.x** clears it:

```bash
nvm install    # reads .nvmrc → 20.18.1
nvm use
node -v
npm install
```

Wrangler **4.48+** requires Node 22. If `npm update` pulled 4.93, you'll see `Wrangler requires at least Node.js v22`. Fix:

```bash
rm -rf node_modules package-lock.json
npm install
```

When you're ready for Node 22, install it with [nvm](https://github.com/nvm-sh/nvm) (`nvm install` reads `.nvmrc`), then bump wrangler in `package.json`.

Until then, **`npx wrangler@4.47.0`** always works as an escape hatch.

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
| 2.1–2.4 POST `/cards`, validation, rate limit | Done |
| 2.5 `/create/` page (Pages) | Done (`site/create/`) |
| 2.6 Initial QR on create | Done (bundled in POST) |
| 2.7 Owner view | Done (`site/created/`) |
| 3.1 `GET /c/{profile_id}?q={qr_id}` HTML scan page | Done (`worker/src/resolver/scan*.ts`) |

## Public scan (M3.1)

```bash
npm run worker:migrate:local
npm run worker:dev
```

Open a scan URL from `/created/` or:

`http://127.0.0.1:8787/c/{profile_id}?q={qr_id}`

Returns mobile HTML with card, human trust, QR, and limits blocks (M3.2–3.7 extend JSON, cache tuning, and copy).

## Create card (M2)

```bash
npm run worker:migrate:local   # includes 0002_rate_limits
npm run worker:dev
```

- **Create UI:** https://humanity.llc/create/ (or Pages dev; API defaults to `http://127.0.0.1:8787` on localhost)
- **POST** `/.well-known/hc/v1/cards` with `{ card, qr_credential }` signed documents
- **GET** `/.well-known/hc/v1/cards/{profile_id}` — public card JSON

After create, open `/created/` for scan link + QR image.

**Production:** run `npm run worker:migrate:remote` then `npm run worker:deploy`.

## Cryptography (1.5)

- RFC 8785 JCS + Ed25519 sign/verify: `worker/src/crypto/`
- Tests: `npm run worker:test`
- Regenerate golden fixtures: `npm run worker:fixtures`

See `worker/src/crypto/README.md`.
