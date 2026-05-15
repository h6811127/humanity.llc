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

Copy the printed `database_id` into `wrangler.toml` (replace `REPLACE_WITH_wrangler_d1_create_output`).

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

```bash
npm run deploy
```

Attach your zone / routes in the Cloudflare dashboard as usual for the `humanityllc` worker (or rename `name` in `wrangler.toml`).

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
