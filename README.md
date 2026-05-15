# Humanity.llc + Humanity Commons (Cloudflare)

One **Cloudflare Worker** serves the marketing landing page, the **Humanity Commons** UI (`/commons/`), and the **v0.5 resolver API** at `/.well-known/hc/v0.5/` backed by **D1** (SQLite).

## Prerequisites

- Node.js **20.18.1+** (Wrangler’s dependencies expect this minimum; Cloudflare’s build image often ships Node 22)
- A Cloudflare account

## One-time setup

```bash
npm install
npx wrangler d1 create humanity-commons
```

Copy the printed `database_id` into `wrangler.toml` (replace `REPLACE_WITH_wrangler_d1_create_output`), **or** leave the placeholder and set a Workers Builds / CI variable `D1_DATABASE_ID` to that UUID (see **Deploy** below).

Apply migrations locally and remotely:

```bash
npx wrangler d1 migrations apply humanity-commons --local
npx wrangler d1 migrations apply humanity-commons --remote
```

## Develop

```bash
npm run dev
```

- Landing: [http://127.0.0.1:8787/](http://127.0.0.1:8787/)
- Commons hub: [http://127.0.0.1:8787/commons/](http://127.0.0.1:8787/commons/)
- Health: [http://127.0.0.1:8787/.well-known/hc/v0.5/health](http://127.0.0.1:8787/.well-known/hc/v0.5/health)

## Deploy

### Local (from your laptop)

```bash
npm run deploy
```

`predeploy` runs `scripts/apply-d1-database-id.mjs`, then Wrangler deploys. Either commit a real D1 UUID in `wrangler.toml` or export `D1_DATABASE_ID` before this command.

### Cloudflare Workers Builds (GitHub / GitLab)

Workers Builds uses a **two-step** pipeline: optional **Build command**, then **Deploy command**. The deploy step defaults to **`npx wrangler deploy`**, which **does not run npm** — so npm **`predeploy` never runs** and `wrangler.toml` keeps the placeholder `database_id` unless you fix it below. That is why you still see validation failures (commonly **[code: 10021]** and a message about `binding DB` / `database_id`). If you see a different numeric code, copy the **full** log line; Cloudflare’s published upload error table centers on **10021** for binding validation.

Do **one** of the following:

1. **Commit the real D1 UUID** in `wrangler.toml` (replace `REPLACE_WITH_wrangler_d1_create_output`), push to `main`. No dashboard env vars required; default `npx wrangler deploy` works.

2. **Keep the placeholder in git** and inject at build time (good for forks):
   - Dashboard → Worker → **Settings → Builds → Build variables and secrets** → add **`D1_DATABASE_ID`** = your D1 database UUID (from `wrangler d1 list` or the DB’s Overview page).
   - **Build command** (Settings → Builds): set to  
     `npm run cf:inject-d1`  
     or prepend that to your existing build command (e.g. `npm run cf:inject-d1 && npm run build`). Dependency install (`npm ci`) runs before this in Workers Builds; the script rewrites `wrangler.toml` on disk before the deploy step reads it.
   - Leave **Deploy command** as the default `npx wrangler deploy`, **or** set it to  
     `npm run cf:inject-d1 && npx wrangler deploy`  
     if you do not use a separate build command.

3. **Use npm deploy on the deploy step** (only if build secrets are visible to the deploy command in your account — if unsure, prefer option 2): set **Deploy command** to **`npm run deploy`** so `predeploy` runs. You still need **`D1_DATABASE_ID`** available in that step.

Custom domains and `workers_dev` are configured in `wrangler.toml` under `[[routes]]`. Rename `name` in `wrangler.toml` if you rename the Worker script.

## Repo layout

| Path | Purpose |
|------|---------|
| `src/index.ts` | Worker entry: API + `/sw.js` header + static assets |
| `src/v05.ts` | Tech Spec v0.5 HTTP API |
| `src/validation.ts`, `src/profile-id.ts`, `src/html.ts`, `src/crypto-util.ts` | Shared logic |
| `public/` | Static assets (`index.html`, `commons/*`) |
| `migrations/` | D1 SQL |
| `docs/` | Product & tech specs |

The legacy **Node resolver** under `resolver/` has been removed in favor of this Worker; see git history if you need the old Express code.
