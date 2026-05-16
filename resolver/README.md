# Resolver v0.5 (MVP slices)

This folder implements the Humanity Commons **resolver v0.5 MVP** in slices.

**Implemented so far**

1. **Contract library** — profile IDs, `hc://resolve/{id}` helpers, `handle` / `manifesto_line` / `public_key` validation (`lib/`).
2. **SQLite + health** — schema per Tech Spec §3.2, `GET /.well-known/hc/v0.5/health` per §4.7 (`schema.sql`, `lib/db.js`, `server.js`).
3. **Create profile** — `POST /.well-known/hc/v0.5/profiles` per §4.2; revocation secret per §3.4 (SHA-256 stored, plaintext only in 201 response); rate limit per §9 (`lib/post-profiles.js`).
4. **Resolve + QR** — `GET /profile/:profileId` (JSON vs HTML per §4.3–§4.4), `GET /qr/:profile_id.png` per §4.5 with payload `hc://resolve/{id}`; `Cache-Control` / `X-Resolver-Version` per spec (`lib/get-profile.js`, `lib/get-qr.js`, `lib/html.js`).
5. **Revoke** — `POST /revoke` per §4.6 (timing-safe secret check vs §3.4 hash); §8.1 message on wrong secret (`lib/post-revoke.js`).
6. **Access log** — append-only file log per §8.2: ISO timestamp, method, path (no query string), status, IPv4 last octet zeroed (`lib/request-log.js`, `LOG_FILE` / `LOG_ENABLED` in `.env.example`).
7. **Frontend + offline** — §5.1 static tree at site root (`/create.html`, `/revoke.html`, …); §5.2–§5.3 forms + profile asset links + SW registration; §6.1 **libsodium.js** (CDN) + base58 + `localStorage` / `sessionStorage` per §6.1–§6.2; §5.4 + §7 service worker (`frontend/sw.js`).
8. **Rate limit (T-11)** — §9 `express-rate-limit` (default 100 / 60s, health excluded); §10.1 T-11 covered in `test/rate-limit.test.js` (`createApp` accepts optional `rateLimit` overrides for fast assertions).
9. **Deployment (§11)** — example **systemd** + **Nginx** under `deploy/`; `.env.example` aligned with §11.2 (plus §8.2 logging / governance URLs); README deployment steps for Ubuntu + SQLite + TLS.

Authoritative docs:

- `docs/Technical Standards v0.5.md` — §2–3 (QR + profile id), §4.1–4.3 (Ed25519 + base58), §5.4–5.5 (handles)
- `docs/Tech Spec v0.5 🏁.md` — §3 (database), §4 (API, including §4.7 health), Appendix A (reserved handles)

## Usage

```js
const {
  handleIssue,
  manifestoIssue,
  isValidPublicKeyBase58,
  isValidProfileId,
  generateProfileId,
  buildQrPayload,
  parseQrPayload,
} = require('./lib/index');
```

Create profile (Tech Spec §10.2):

```bash
curl -sS -X POST http://127.0.0.1:3000/.well-known/hc/v0.5/profiles \
  -H "Content-Type: application/json" \
  -d '{"handle":"testuser","manifesto_line":"Testing","public_key":"<base58-32-byte-ed25519-pk>"}'
```

Use a real base58-encoded 32-byte Ed25519 public key (see contract tests / `bs58.encode(crypto.randomBytes(32))` in dev).

Revoke (Tech Spec §4.6):

```bash
curl -sS -X POST http://127.0.0.1:3000/.well-known/hc/v0.5/revoke \
  -H "Content-Type: application/json" \
  -d '{"profile_id":"<id>","revocation_secret":"<secret from create response>"}'
```

## HTTP server (Tech Spec §4.1, §4.7, §5.1)

```bash
cd resolver
cp .env.example .env   # optional
npm install
npm run init-db        # creates DB file and applies schema.sql
npm start              # default http://127.0.0.1:3000
```

- **API:** `/.well-known/hc/v0.5/…`
- **UI:** `/index.html`, `/create.html`, `/revoke.html`, `/style.css`, `/sw.js` (service worker scope `/` per §5.3).

Smoke check (matches Tech Spec §10.2 style):

```bash
curl -sS http://127.0.0.1:3000/.well-known/hc/v0.5/health
```

Production default DB path in the spec is `/var/data/profiles.sqlite` (§3.1); override with `DATABASE_PATH` in `.env`.

Access logging (§8.2): by default writes to `resolver/data/access.log` (gitignored). Override with `LOG_FILE`, or set `LOG_ENABLED=0` to turn logging off.

## Deployment — production (Tech Spec §11, §13)

Templates live in **`deploy/`**:

- **`deploy/nginx-apex-server-blocks.example.conf`** — **recommended:** one hostname `humanity.llc` for marketing (`v5/assets`) + resolver (API + `/create.html`, …).
- **`deploy/nginx-apex.example.conf`** — location blocks only (merge into your apex `server`).
- **`deploy/sync-marketing-static.sh`** — rsync `v5/assets/` → `/var/www/humanity`.
- **`deploy/nginx-resolver.example.conf`** — optional subdomain-only resolver (`resolver.humanity.llc`).
- **`deploy/humanity-resolver.service`** — systemd unit per §11.3 (`WorkingDirectory` must be the folder containing `server.js`).

### Apex only — everything on `https://humanity.llc`

Yes, this is possible. Users only see **`humanity.llc`**; you run **one origin** (VPS or Cloudflare Tunnel → Nginx on that machine):

| URL | Served by |
|-----|-----------|
| `/` | Marketing static (`v5/assets/index.html`) |
| `/create.html`, `/revoke.html`, … | Node resolver (proxied) |
| `/.well-known/hc/v0.5/…` | Node resolver (proxied) |

**Important:** Point **`humanity.llc` DNS** at that origin (tunnel or server). Do **not** leave the apex on a Cloudflare Worker/Pages project that only has `v5/assets` and no resolver — that is what caused Worker **1101** when resolver paths hit the wrong app.

1. Install Node 20+, copy `resolver/` to e.g. `/opt/resolver`, `npm install --omit=dev`, init DB, **`.env`** with **`PUBLIC_BASE_URL=https://humanity.llc`**.
2. `systemctl enable --now humanity-resolver` (unit from `deploy/humanity-resolver.service`).
3. `sudo ./deploy/sync-marketing-static.sh /var/www/humanity` (from repo root, or pass your web root).
4. Enable Nginx from **`deploy/nginx-apex-server-blocks.example.conf`**, then **`certbot --nginx -d humanity.llc`** (add `www` if you use it).
5. Cloudflare Tunnel (if used): public hostname **`humanity.llc`** → `https://localhost:443` (or your Nginx port). Users never type `*.cfargotunnel.com`.

Marketing home is **`/`**; resolver tools stay at **`/create.html`** etc. The resolver’s own `frontend/index.html` is not mounted at `/` on apex (only one homepage). Link “Create profile” from the marketing page to `/create.html`.

### Subdomain resolver (optional)

**Outline (Ubuntu; `resolver.humanity.llc` only):**

1. Install Node 20+ (§11.1).
2. Copy or clone this `resolver/` tree to e.g. `/opt/resolver` and run `npm install --omit=dev` (or `npm install` if you run tests on the server).
3. **`mkdir -p /var/data`** and apply schema: `npm run init-db` with `DATABASE_PATH=/var/data/profiles.sqlite` in `.env`, or `sqlite3 /var/data/profiles.sqlite < schema.sql` from the `resolver/` directory.
4. If using **`LOG_FILE`** under `/var/log/…`, create that directory and ensure the service user can write (e.g. `www-data`).
5. Copy **`.env.example`** → `.env`, set **`PUBLIC_BASE_URL=https://resolver.humanity.llc`**, production **`DATABASE_PATH`** / **`LOG_FILE`** (see comments in `.env.example`).
6. Install **Nginx** site from `deploy/nginx-resolver.example.conf`, then **Certbot** `certbot --nginx -d resolver.humanity.llc` (§11.1).
7. Install **systemd** unit from `deploy/humanity-resolver.service`, adjust **`WorkingDirectory`**, then `systemctl enable --now humanity-resolver`.

## Tests

```bash
cd resolver
npm install
npm test
```

## Notes

- **`parseQrPayload`**: trims the whole string, then applies **`decodeURIComponent`** only to the `profile_id` suffix (after `hc://resolve/`). Literal `?`, `&`, and `#` in the trimmed string are rejected before decode; after decode, `profile_id` must not contain `/`, `?`, `&`, or `#`. Malformed `%` sequences return `null`.
- **`buildQrPayload`**: trims `profile_id` before validation (so accidental whitespace does not break generation).

- **`public_key`**: validated as base58 that decodes to **32 bytes** (Ed25519 public key size). A full **curve-point** check is not done here; add that in a crypto-hardening chunk if required.
- **`profile_id`**: 20 characters from the standard base58 alphabet (excludes `0`, `O`, `I`, `l`). Generation uses `crypto.randomBytes` + base58 (Technical Standards §3.1).
