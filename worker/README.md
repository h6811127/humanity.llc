# humanity.llc reference resolver (Cloudflare Worker)

Implements `/.well-known/hc/v1/*` and public scan shortcuts per `docs/V1_0_ARCHITECTURE_ROADMAP.md`.

## Node.js version

This repo pins **`wrangler@4.47.0`**, which runs on **Node 20 LTS** (not Node 22).

**Recommended Node:** `>=20.18.1` (see `.nvmrc`). On `20.11.0` you may see a harmless-looking `EBADENGINE` for `undici`  -  it still installs; bumping to the latest **20.x** clears it:

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

### Cloudflare API token (local deploy)

Wrangler reads **`CLOUDFLARE_API_TOKEN`** from your environment (not committed to git).

1. Cloudflare Dashboard → **My Profile** → **API Tokens** → **Create Token**
2. Use template **Edit Cloudflare Workers** (includes Worker deploy + D1)
3. Export before deploy:

```bash
export CLOUDFLARE_API_TOKEN="your_token_here"
npm run worker:deploy
```

Optional: copy `worker/.env.example` to **repo root** `.env` and load it (`set -a; source .env; set +a`)  -  keep `.env` in `.gitignore`.

**Alternative:** `npx wrangler login` (browser OAuth)  -  no API token file needed for interactive deploys.

**CI:** GitHub Actions uses repository secret `CLOUDFLARE_API_TOKEN` (see `.github/workflows/deploy-worker.yml`).

### Deploy command

```bash
npm run worker:deploy
```

Configure `[[routes]]` in `wrangler.toml` for `humanity.llc` before production traffic.

### Verify status JSON (M3.4)

`malformed` means the **IDs in the URL** failed validation, not a bad API token. Use real values from `/created/` (not `{profile_id}` placeholders).

- `profile_id`: 20–32 characters, base58 (no `0`, `O`, `I`, `l`)
- `qr_id`: must start with `qr_` then base58

```bash
# Replace PROFILE and QR from your /created/ page or scan URL
curl -s "https://humanity.llc/.well-known/hc/v1/cards/PROFILE/status?q=QR" | jq .
```

Card-only (no `?q=`):

```bash
curl -s "https://humanity.llc/.well-known/hc/v1/cards/PROFILE/status" | jq .scan.kind
```

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

## Create card (M2)

```bash
npm run worker:migrate:local   # includes 0002_rate_limits
npm run worker:dev
```

- **Create UI:** https://humanity.llc/create/ (or Pages dev; API defaults to `http://127.0.0.1:8787` on localhost)
- **POST** `/.well-known/hc/v1/cards` with `{ card, qr_credential }` signed documents
- **GET** `/.well-known/hc/v1/cards/{profile_id}`  -  public card JSON
- **GET** `/.well-known/hc/v1/cards/{profile_id}/status?q={qr_id}`  -  machine-readable scan state (M3.4)
- **POST** `/.well-known/hc/v1/cards/{profile_id}/revoke`  -  owner-signed revocation (M4.1)

After create, open `/created/` for scan link + QR image.

### Revoke (M4.1)

```bash
# Body: { "revocation": <signed revocation document> }
# Sign target_kind: "card" | "qr_credential", target_qr_id when revoking one QR
curl -s -X POST "https://humanity.llc/.well-known/hc/v1/cards/PROFILE/revoke" \
  -H "Content-Type: application/json" \
  -d '{"revocation":{...}}' | jq .
```

### Manifesto / status line update

Owner-signed post-create copy change (same QR, no reprint). Spec: `docs/MANIFESTO_STATUS_UPDATE.md`.

```bash
# Body: { "card": <signed humanity_card with new manifesto_line and newer updated_at> }
curl -s -X POST "https://humanity.llc/.well-known/hc/v1/cards/PROFILE/update" \
  -H "Content-Type: application/json" \
  -d '{"card":{...}}' | jq .
```

Owner UI: `/created/` → **Update public line**.

### Artifact intent gate (M4.4 stub)

Pre-commerce stub: blocks revoked/suspended/expired card or QR before personalized merch (Phase C).

```bash
curl -s -X POST "https://humanity.llc/v1/store/artifact-intents" \
  -H "Content-Type: application/json" \
  -d '{"profile_id":"PROFILE","source_qr_id":"qr_..."}' | jq .
```

- Revoked QR → `403` `QR_REVOKED`
- Active QR → `501` `ARTIFACT_INTENTS_NOT_IMPLEMENTED` (full intent creation not built yet)

**Production:** run `npm run worker:migrate:remote` then `npm run worker:deploy`.

## Cryptography (1.5)

- RFC 8785 JCS + Ed25519 sign/verify: `worker/src/crypto/`
- Tests: `npm run worker:test`
- Regenerate golden fixtures: `npm run worker:fixtures`

See `worker/src/crypto/README.md`.
