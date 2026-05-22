# Deploy to production (git push)

Two pieces run on **humanity.llc**:

| Piece | What deploys it | Paths |
|-------|-----------------|-------|
| **Static site** (Pages) | Cloudflare Pages **Git integration** | `/`, `/create/`, `/created/`, assets |
| **Reference resolver** (Worker + D1) | GitHub Action on push to **`main`** | `/.well-known/hc/v1/*`, `/c/*` |

Pushing to git **does not** deploy the Worker unless the workflow below is enabled and secrets are set. Pages alone is not enough for create, scan, or JSON card APIs.

---

## One-time GitHub secrets

In **GitHub → repo → Settings → Secrets and variables → Actions**, add:

| Secret | Where to find it |
|--------|------------------|
| `CLOUDFLARE_API_TOKEN` | [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) — template **Edit Cloudflare Workers**, plus **D1 → Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → right sidebar on any zone/account overview |

The token must be allowed to deploy Workers and apply D1 migrations on account `180ee38ceea795d281fb5a3bd51af533` (zone in `worker/wrangler.toml`).

---

## Cloudflare Pages (site) — dashboard check

In **Workers & Pages → humanity-llc → Settings → Builds**:

| Setting | Value |
|---------|--------|
| Build command | empty or `npm run build` |
| Build output directory | `site` |
| **Deploy command** | **leave empty** (do not run `wrangler deploy` here) |

Connect the repo branch **`main`** (or your production branch). Each push updates the marketing/create UI only.

---

## Worker — already created?

If you already ran `npm run worker:deploy` or created **humanity-llc-resolver** in the dashboard, you only need to **ship new code**:

1. Merge your work into **`main`** (e.g. `m3_scan` → `main`).
2. `git push origin main`
3. Watch **Actions → Deploy production** — tests, D1 migrations, Worker deploy.

Workflow file: `.github/workflows/deploy-production.yml`

Manual deploy (same as CI):

```bash
cd /path/to/humanity.llc
npm install
npm run worker:test
npm run worker:migrate:remote   # needs wrangler login or API token in env
npm run worker:deploy
```

---

## Verify production

```bash
curl -sS https://humanity.llc/.well-known/hc/v1/health | jq
# expect: "status": "ok", "database": "ok"

# After creating a card, open scan URL or:
curl -sS -o /dev/null -w "%{http_code}\n" \
  "https://humanity.llc/c/YOUR_PROFILE_ID?q=YOUR_QR_ID"
# expect: 200 and HTML
```

| URL | Served by |
|-----|-----------|
| `https://humanity.llc/` | Pages |
| `https://humanity.llc/create/` | Pages |
| `https://humanity.llc/.well-known/hc/v1/health` | Worker |
| `https://humanity.llc/c/...?q=...` | Worker |

If health returns **HTML** (landing page), the Worker route is not attached — redeploy Worker or check routes in `worker/wrangler.toml`.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Site updates, API 404 / HTML on `/health` | Pages only deployed; Worker not deployed or routes missing |
| CI fails on migrations | API token missing **D1 Edit** |
| CI fails on deploy | Wrong `CLOUDFLARE_ACCOUNT_ID` or token scope |
| `database: schema_missing` | Migrations did not run — fix CI migrate step or run `npm run worker:migrate:remote` locally |

Local auth without CI: `npx wrangler login` then manual `worker:migrate:remote` + `worker:deploy`.
