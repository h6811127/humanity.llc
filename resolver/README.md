# Humanity Commons resolver (v0.5 MVP)

Implements the API and static UI described in `docs/Tech Spec v0.5 🏁.md`: SQLite-backed profiles, `hc://resolve/{id}` QR payloads, client-generated Ed25519 keys, and simple secret revocation.

## Prerequisites

- Node.js 20+

## Local setup

```bash
cd resolver
cp .env.example .env
npm install
npm run init-db
npm run dev
```

Open [http://127.0.0.1:3000/](http://127.0.0.1:3000/) for the landing page, or go directly to [http://127.0.0.1:3000/frontend/create.html](http://127.0.0.1:3000/frontend/create.html).

API base URL: `http://127.0.0.1:3000/.well-known/hc/v0.5/`

## Environment

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP port (default `3000`) |
| `DATABASE_PATH` | SQLite file path |
| `PUBLIC_BASE_URL` | Canonical HTTPS base for `profile_url` / `qr_code_url` in JSON (no trailing slash) |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` | Global rate limit (health check is excluded) |
| `CONSTITUTION_LINK` / `GOVERNANCE_LINK` | Links embedded in JSON + HTML profile |
| `LOG_FILE` | Append-only access log path (default `./data/access.log`; §8.2 format) |
| `LOG_ENABLED` | Set to `0` to disable file access logging |

## Connecting the main marketing site (`humanity.llc`)

The tech spec places the API at **`https://resolver.humanity.llc/.well-known/hc/v0.5/`** and the marketing site at **`humanity.llc`**. They are **two origins**:

1. **DNS:** Point `resolver.humanity.llc` at your VPS (A/AAAA) or at a **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)** that forwards to `127.0.0.1:3000`.
2. **Main site:** Add normal `<a href="https://resolver.humanity.llc/...">` links on the Cloudflare-hosted landing page (see `v5/assets/index.html` in this repo for an example card).
3. **Do not** try to serve the full SQLite-backed API from the static Worker-only site; keep the resolver on Node (or re-implement the API on D1 later). The Worker can later add redirects or thin wrappers, but profile data and QR generation should stay on the resolver host.

Example tunnel (run on the VPS):

```bash
cloudflared tunnel --url http://127.0.0.1:3000
```

Then map the tunnel hostname to `resolver.humanity.llc` in the Cloudflare dashboard.

## Deployment templates

- `deploy/nginx-resolver.example.conf` — HTTPS + HSTS + proxy to Node.
- `deploy/humanity-resolver.service` — systemd unit (adjust `WorkingDirectory` / `User`).

## Tech Spec v0.5 compliance

Use `docs/Tech Spec v0.5 🏁.md` as the source of truth. The resolver implements §3–§5 (API + UI + SW), §8.1–§8.2 (user-facing errors + access log), and §9 items that belong in app + Nginx (TLS/HSTS in `deploy/nginx-resolver.example.conf`). Gaps to track intentionally: **libsodium.js** vs **@noble/ed25519** on the client (same crypto goals), **profile.html** as a server template instead of a static file, and **deep Ed25519 point checks** on the server (currently length + base58 decode). **T-07** (camera opens profile) depends on device support for the `hc://` custom scheme; many teams add an HTTPS bridge in a later version.

## Smoke tests

```bash
curl -sS http://127.0.0.1:3000/.well-known/hc/v0.5/health
```

Create a profile from the browser at `/frontend/create.html` (keys are generated in the client). For API-only experiments, supply a valid base58-encoded 32-byte Ed25519 public key in `public_key`.
