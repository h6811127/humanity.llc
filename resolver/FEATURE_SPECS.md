# Feature Specs

This file captures all functionality present in the prototype, including incomplete or fragile behavior that should be reconsidered during a rebuild.

## 1. Resolver Contract Library

The `lib/index.js` module exports the resolver contract helpers from `constants`, `validation`, `profile-id`, and `qr-payload`.

### Feature: Shared Protocol Constants

The system defines:

- Base58 alphabet: `123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz`.
- Profile ID length: 20 characters.
- QR payload max length: 120 characters.
- QR scheme: `hc`.
- QR host: `resolve`.
- Reserved handles list covering admin/system terms, resolver paths, null-like values, and numeric placeholders.

### Feature: Handle Validation

Handles must:

- Be strings.
- Match `^[a-z][a-z0-9_]{2,31}$`.
- Be 3 to 32 characters.
- Start with a lowercase ASCII letter.
- Contain only lowercase ASCII letters, digits, and underscores after the first character.
- Not be in the reserved handle set.

The helper returns issue codes rather than only booleans:

- `format`
- `reserved`
- `null` for valid input

### Feature: Manifesto Validation and Sanitization

Manifesto lines are public short statements.

Rules:

- Raw input must be a string.
- Raw input over 4096 characters is rejected early.
- HTML-looking tags are stripped with a regex.
- Remaining `<` and `>` characters are removed.
- Trimmed text must be at least 1 character.
- Trimmed text must be at most 280 characters.
- Sanitized text is trimmed and truncated to 280 characters.

This is not a complete HTML sanitizer. It is an MVP plain-text extraction step.

### Feature: Public Key Validation

Public keys are intended to be Ed25519 public keys encoded with base58.

Rules:

- Must be a string.
- Encoded string length must be between 40 and 48 characters.
- Base58 decode must succeed.
- Decoded bytes must be exactly 32 bytes.

The prototype does not validate that the key is actually a valid Ed25519 curve point.

### Feature: Profile ID Validation and Generation

Profile IDs are opaque 20-character base58 strings.

Generation:

- Uses `crypto.randomBytes(16)`.
- Encodes the bytes as base58.
- Slices the first 20 characters.
- Retries candidate generation up to 128 times.
- Retries final ID generation up to 64 times when the caller reports collision.
- Throws `profile_id_generation_exhausted` or `profile_id_collision_exhausted` if generation fails.

Validation:

- Requires string type.
- Requires exact 20-character length.
- Rejects characters excluded by the base58 alphabet, including `0`, `O`, `I`, and `l`.

## 2. QR Payload Contract

### Feature: Canonical QR Payload Builder

QR payloads are built as:

```text
hc://resolve/{profile_id}
```

Behavior:

- Input must be a string.
- Surrounding whitespace is trimmed.
- Profile ID is validated after trimming.
- Final payload must not exceed 120 characters.
- Throws on invalid profile IDs.

### Feature: QR Payload Parser

The parser reads QR payload strings and returns `{ profileId }` or `null`.

Behavior:

- Rejects non-strings.
- Trims surrounding whitespace.
- Rejects empty strings.
- Rejects payloads longer than 120 characters.
- Rejects any raw `?`, `&`, or `#`.
- Requires prefix equivalent to `hc://resolve/`.
- Matches scheme and host case-insensitively.
- Decodes percent encoding only in the suffix after the canonical prefix.
- Rejects malformed percent encoding.
- Rejects decoded `/`, `?`, `#`, and `&` in profile IDs.
- Validates the decoded profile ID.

## 3. SQLite Persistence

### Feature: Database Initialization

`openDatabase(dbFilePath)` opens a SQLite database through `better-sqlite3` and applies `schema.sql`.

Behavior:

- Creates parent directories for non-memory database paths.
- Supports `:memory:` for tests.
- Executes schema on open.

The `scripts/init-db.js` script loads `.env`, resolves `DATABASE_PATH` or defaults to `./data/profiles.sqlite`, opens the database, applies schema, and prints the resolved path.

## 4. HTTP Server

### Feature: Express App Factory

`createApp(db, options)` builds an Express app.

Behavior:

- Sets `trust proxy` to `1`.
- Mounts API routes under `/.well-known/hc/v0.5`.
- Parses JSON bodies up to `32kb`.
- Logs API requests after responses finish.
- Applies IP-based rate limiting to API routes.
- Excludes `GET /health` from rate limiting.
- Serves static frontend files from `/frontend` at site root.
- Serves `/sw.js` specially with `Service-Worker-Allowed: /`.

### Feature: Public Base URL Resolution

Response URLs are built from:

1. `PUBLIC_BASE_URL`, if set.
2. `x-forwarded-proto` and `x-forwarded-host`, if present.
3. Express request protocol and host.

Trailing slashes are removed.

## 5. Health Check

### Feature: Resolver Health Endpoint

`GET /.well-known/hc/v0.5/health`

Success response:

- Status `200`.
- Header `X-Resolver-Version: 0.5`.
- JSON body includes:
  - `status: "ok"`
  - `version: "0.5"`
  - `uptime`
  - `database: "connected"`

Database error response:

- Status `500`.
- Header `X-Resolver-Version: 0.5`.
- JSON body includes:
  - `status: "error"`
  - `version: "0.5"`
  - `uptime`
  - `database: "error"`

## 6. Profile Creation

### Feature: Create Profile API

`POST /.well-known/hc/v0.5/profiles`

Input:

- `handle`
- `manifesto_line`
- `public_key`

Behavior:

- Validates handle format and reserved handles.
- Validates manifesto length and non-empty sanitized text.
- Validates base58-encoded 32-byte public key.
- Generates a unique profile ID.
- Generates a revocation secret with 16 random bytes encoded as base64url.
- Stores only SHA-256 hash of the revocation secret.
- Stores profile timestamps as Unix seconds.
- Stores `revoked = 0`.
- Returns plaintext revocation secret only in the `201` response.
- Builds profile and QR URLs from public base URL.

Success response:

- Status `201`.
- `success`
- `profile_id`
- `handle`
- `manifesto_line`
- `qr_code_url`
- `profile_url`
- `revocation_secret`
- `created_at`

Error responses:

- `400 invalid_handle`
- `400 invalid_manifesto`
- `400 invalid_public_key`
- `409 handle_taken`
- `500 server_error`

## 7. Profile Resolution

### Feature: Resolve Profile API

`GET /.well-known/hc/v0.5/profile/:profileId`

Behavior:

- Validates `profileId`.
- Looks up profile by ID.
- Chooses HTML or JSON from the `Accept` header.
- Defaults to HTML when no `Accept` header is present.
- Treats any `text/html` in `Accept` as HTML.
- Treats `application/json` as JSON only when `text/html` is not present.
- Adds `X-Resolver-Version: 0.5`.
- Adds `Cache-Control: public, max-age=3600` for successful active profiles.

JSON success response:

- `version`
- `profile_id`
- `handle`
- `manifesto_line`
- `badge`
- `created_at`
- `revoked`
- `constitution_link`
- `governance_link`

HTML success response:

- Server-rendered profile page.
- Escaped dynamic text.
- Badge display.
- Member-since date.
- Constitution and Governance links.
- Service worker registration.
- Offline banner hook.

Not found behavior:

- Status `404`.
- HTML page or JSON `{ error: "not_found", message: "Profile not found" }`.

Revoked behavior:

- Status `410`.
- HTML revoked notice or JSON `{ error: "revoked", message: "This profile has been revoked" }`.

## 8. QR Code Generation

### Feature: QR PNG Endpoint

`GET /.well-known/hc/v0.5/qr/:profile_id.png`

Behavior:

- Filename must match a 20-character base58 profile ID plus `.png`.
- Validates profile ID.
- Looks up profile.
- Rejects unknown profiles with `404`.
- Rejects revoked profiles with `410`.
- Builds canonical payload `hc://resolve/{profile_id}`.
- Generates PNG with `qrcode`.
- Uses error correction level `M`.
- Supports optional query parameters:
  - `size`: clamped from 100 to 1000, default 300.
  - `margin`: clamped from 1 to 10, default 4.
- Sets `Content-Type: image/png`.
- Sets `Cache-Control: public, max-age=86400`.

## 9. Revocation

### Feature: Revoke Profile API

`POST /.well-known/hc/v0.5/revoke`

Input:

- `profile_id`
- `revocation_secret`

Behavior:

- Requires both fields.
- Invalid profile ID returns not found.
- Unknown profile returns not found.
- Already revoked profile returns `410`.
- Missing revocation hash returns `500`.
- Hashes submitted secret with SHA-256.
- Compares hash using `crypto.timingSafeEqual` when buffer lengths match.
- Sets `revoked = 1`.
- Sets `revoked_at` to Unix seconds.

Success response:

- Status `200`.
- `success: true`
- `message: "Profile revoked. QR codes will return 410 Gone within 1 hour."`

Error responses:

- `400 bad_request`
- `401 invalid_secret`
- `404 not_found`
- `410 revoked`
- `500 server_error`

## 10. Access Logging

### Feature: Append-only API Access Log

The API logs one line per completed API request unless `LOG_ENABLED=0`.

Log fields:

- ISO timestamp to second precision.
- HTTP method.
- URL path without query string.
- Response status.
- Anonymized IP.

IP anonymization:

- Missing IP becomes `0.0.0.0`.
- IPv4-mapped IPv6 prefix `::ffff:` is stripped.
- `127.0.0.1` and `::1` pass through.
- IPv4 addresses have the last octet replaced with `0`.
- IPv6 addresses keep up to the first four non-empty groups and append `::`.
- Unrecognized values become `unknown`.

Logging behavior:

- Default log path is `data/access.log`.
- `LOG_FILE` overrides path.
- Parent directories are created.
- Log write failures are printed but do not fail requests.

## 11. Rate Limiting

### Feature: API Rate Limit

The API uses `express-rate-limit`.

Defaults:

- `RATE_LIMIT_WINDOW_MS` or 60,000 ms.
- `RATE_LIMIT_MAX_REQUESTS` or 100.

Behavior:

- Standard rate limit headers enabled.
- Legacy headers disabled.
- Health endpoint excluded.
- Test app can override max/window through `createApp(db, { rateLimit })`.

## 12. Static Frontend

### Feature: Resolver Home

`/index.html` presents:

- Humanity Commons title.
- MVP description.
- Links to create, revoke, and health endpoints.
- API base hint.

### Feature: Create Profile UI

`/create.html` and `/create.js` implement:

- Handle field with browser pattern matching.
- Manifesto textarea with 280-character max and live count.
- Warning that private keys are only stored in this browser.
- Loading `libsodium-wrappers` from jsDelivr.
- Loading `bs58` from esm.sh.
- Local Ed25519 keypair generation.
- Public key base58 encoding.
- Private key base58 storage in `localStorage.hc_private_key`.
- Public key base58 storage in `sessionStorage.hc_public_key`.
- POST to create profile API.
- Display of QR image.
- QR download link.
- Display of revocation secret.
- Copy secret button.
- Download secret as `.txt`.
- Profile URL link.
- Error messages for missing libsodium, API validation failure, network failure, and clipboard failure.

### Feature: Revoke Profile UI

`/revoke.html` and `/revoke.js` implement:

- Profile ID field.
- Revocation secret textarea.
- POST to revoke API.
- Success message display.
- Error message display.
- Special user-facing not-found copy for `404`.
- Network failure copy.

### Feature: Profile Info Page

`/profile.html` is not a live profile renderer. It explains that live profiles are served from:

```text
/.well-known/hc/v0.5/profile/{profile_id}
```

### Feature: PWA Manifest

`/manifest.json` declares:

- App name: `Humanity Commons Resolver`.
- Short name: `HC Resolver`.
- Start URL: `/index.html`.
- Display mode: `standalone`.
- Background and theme colors.

### Feature: Service Worker and Offline Support

`/sw.js` implements:

- Static cache `hc-static-v0.5`.
- Profile cache `hc-profiles-v0.5`.
- Install-time caching of frontend static assets.
- `skipWaiting()` even when cache installation fails.
- `clients.claim()` on activate.
- Network-first strategy for profile HTML requests.
- Cache only successful `200` profile responses.
- Cache fallback for profile requests when network fails.
- Cache-first strategy for other requests, falling back to network.

`/offline.html` gives users a basic offline explanation.

Server-rendered profile HTML includes an offline banner that appears when `navigator.onLine` is false and reloads when the browser returns online.

## 13. Deployment

### Feature: Local Runtime

The app runs with:

- Node 20+.
- `npm run init-db`.
- `npm start`.
- Default port `3000`.
- Default database path `data/profiles.sqlite`.

### Feature: systemd Service

`deploy/humanity-resolver.service` defines:

- `User=www-data`
- `WorkingDirectory=/opt/resolver`
- `.env` loaded from `/opt/resolver/.env`
- `ExecStart=/usr/bin/node server.js`
- Restart on failure.

### Feature: Nginx Apex Deployment

The apex deployment intends one public hostname, `humanity.llc`, serving:

- Marketing static files at `/`.
- Resolver UI files from Node.
- Resolver API under `/.well-known/hc/v0.5/`.
- TLS and HSTS.
- HTTP to HTTPS redirect.

This was explicitly intended to avoid routing resolver paths to a Worker/Pages deployment that only serves marketing assets.

### Feature: Optional Resolver Subdomain Deployment

`deploy/nginx-resolver.example.conf` proxies all paths for `resolver.humanity.llc` to Node and redirects HTTP to HTTPS.

### Feature: Marketing Static Sync

`deploy/sync-marketing-static.sh` syncs `v5/assets/` from the parent project into a web root such as `/var/www/humanity`.

This script assumes the resolver sits inside a larger `humanity.llc` repository with a sibling `v5/assets` tree.
