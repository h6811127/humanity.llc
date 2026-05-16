# Working Code To Preserve

This file identifies behavior that is implemented and currently covered by the passing test suite or otherwise clearly functional from code inspection. These are the pieces to preserve during a rebuild unless the product spec intentionally changes.

## Verification Snapshot

Command run:

```text
npm test
```

Result:

- 45 tests passing.
- 16 suites passing.
- 0 failures.

## Contract Validation

The contract helper layer is working and well covered.

Preserve:

- `handleIssue` returns structured issue codes for format vs reserved-handle failures.
- Valid handles such as `abc`, `a_b_c_1`, and max-length lowercase handles are accepted.
- Empty, too-short, digit-prefixed, uppercase, too-long, non-string, and reserved handles are rejected.
- `manifestoIssue` accepts non-empty 1-280 character plain text after trimming and tag stripping.
- Empty and whitespace-only manifesto lines are rejected.
- Overlong manifesto lines are rejected.
- `sanitizeManifesto('<p>Hi</p>')` returns `Hi`.
- Base58 public keys decoding to exactly 32 bytes are accepted.
- Base58 public keys decoding to 31 or 33 bytes are rejected.
- Invalid base58 public keys are rejected.
- Profile IDs require exactly 20 valid base58 characters.
- Ambiguous characters `0`, `O`, and `l` are rejected by tests; `I` is also excluded by the regex/alphabet.

## Profile ID Generation

Preserve:

- `generateProfileIdCandidate()` returns valid 20-character base58 IDs.
- Two generated candidates are not expected to collide in normal operation.
- `generateProfileId(isTaken)` retries while the caller reports collisions.
- Generation has bounded retry loops rather than infinite loops.

## QR Payloads

Preserve:

- `buildQrPayload(id)` returns `hc://resolve/{id}`.
- `parseQrPayload()` round-trips canonical payloads.
- Scheme and host are case-insensitive.
- Surrounding whitespace is trimmed.
- Percent-encoded ASCII profile IDs are accepted.
- Malformed percent encoding is rejected.
- Decoded delimiter smuggling is rejected.
- Query strings and fragments are rejected.
- `buildQrPayload()` throws for bad IDs.
- `buildQrPayload()` trims the profile ID input before building.

## Health Endpoint

Preserve:

- `GET /.well-known/hc/v0.5/health` returns `200` when SQLite is connected.
- Response includes `X-Resolver-Version: 0.5`.
- Response includes:
  - `status: "ok"`
  - `version: "0.5"`
  - numeric `uptime`
  - `database: "connected"`

## Profile Creation API

Preserve:

- `POST /.well-known/hc/v0.5/profiles` creates a profile with valid handle, manifesto, and public key.
- Successful creation returns `201`.
- Successful creation returns:
  - `success: true`
  - valid `profile_id`
  - original `handle`
  - sanitized `manifesto_line`
  - absolute `qr_code_url`
  - absolute `profile_url`
  - plaintext one-time `revocation_secret`
  - numeric `created_at`
- `PUBLIC_BASE_URL` is respected when constructing URLs.
- Database stores `revocation_secret_hash`, not the plaintext secret.
- Stored hash is a 64-character SHA-256 hex digest.
- Duplicate handles return `409 handle_taken`.
- Duplicate-handle message is user-friendly.
- Uppercase handles return `400 invalid_handle`.

## Profile Resolve API

Preserve:

- `GET /.well-known/hc/v0.5/profile/:id` returns JSON when `Accept: application/json`.
- JSON success response includes:
  - `version: "0.5"`
  - `profile_id`
  - `handle`
  - `manifesto_line`
  - `badge: { type: "early_builder", label: "Early Builder" }`
  - numeric `created_at`
  - `revoked: false`
  - `constitution_link`
  - `governance_link`
- Response includes `X-Resolver-Version: 0.5`.
- Active profile responses include `Cache-Control: public, max-age=3600`.
- Unknown valid profile IDs return `404` JSON.
- Revoked profiles return `410` JSON.
- Browser/default requests return HTML.
- HTML profile includes the handle.
- HTML profile includes "No data is sold" footer copy.
- HTML profile includes Constitution and Governance links.
- HTML profile links to `/style.css`.
- HTML profile registers `/sw.js`.

## QR PNG API

Preserve:

- `GET /.well-known/hc/v0.5/qr/{profile_id}.png` returns `200` for active profiles.
- Response content type is `image/png`.
- Response body begins with PNG magic bytes.
- Unknown profiles return `404`.
- Revoked profiles return `410`.
- QR payload builder is used before PNG generation.
- QR generation uses error correction level `M`.
- QR output size and margin are bounded.

## Revocation API

Preserve:

- Valid `profile_id` plus correct `revocation_secret` returns `200`.
- Successful revocation returns `success: true`.
- Successful revocation message is currently:
  - `Profile revoked. QR codes will return 410 Gone within 1 hour.`
- After revocation, resolving the profile returns `410`.
- Wrong secret returns `401 invalid_secret`.
- Wrong-secret message is user-friendly and does not reveal the expected secret.
- Missing profile ID or secret returns `400 bad_request`.
- Unknown profile returns `404 not_found`.
- Already revoked profile returns `410 revoked`.
- Already-revoked message is `Profile already revoked`.
- Secret comparison uses a timing-safe comparison when hash buffer lengths match.

## Access Logging

Preserve:

- `anonymizeIp('203.0.113.42')` returns `203.0.113.0`.
- `anonymizeIp('127.0.0.1')` returns `127.0.0.1`.
- One log line is written per request when logging is enabled.
- Log format is:
  - timestamp
  - method
  - path without query string
  - status
  - anonymized IP
- Timestamp format matches second-precision UTC ISO strings.
- `LOG_FILE` overrides the log path.
- `LOG_ENABLED=0` prevents new log writes.
- Logging failures do not break API responses.

## Static Frontend Serving

Preserve:

- `/create.html` is served by the Express app.
- `/create.html` contains `id="create-form"`.
- `/create.html` loads `libsodium-wrappers`.
- `/sw.js` is served by the Express app.
- `/sw.js` response includes `Service-Worker-Allowed: /`.
- Static frontend files are served from the `frontend` directory at the site root.

## Rate Limiting

Preserve:

- API rate limiting is active by default.
- Limit can be configured by `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`.
- `createApp` accepts test overrides for `rateLimit.max` and `rateLimit.windowMs`.
- Requests over the configured max return `429`.
- The 101st request in a 100-request window returns `429`.
- Health is skipped by rate limiting.

## Database Initialization

Preserve:

- `openDatabase(':memory:')` supports tests.
- File-backed database paths have parent directories created automatically.
- `schema.sql` is applied on database open.
- `scripts/init-db.js` loads `.env`, opens the configured database, applies schema, and prints the resolved DB path.

## Server App Structure

Preserve:

- `createApp(db, options)` is exported for tests.
- `BASE_PATH` is exported for tests and route consistency.
- `trust proxy` is enabled for deployment behind Nginx/Cloudflare.
- JSON body parser is scoped to the API router.
- Request logging is mounted before rate limiting so rate-limited responses are logged.
- Static frontend is mounted after API routes.

## HTML Rendering Helpers

Preserve:

- Dynamic HTML fields are escaped.
- Profile pages include a badge.
- Profile pages show member-since date from Unix seconds.
- Profile pages include constitution and governance links.
- Profile pages include an offline banner hook.
- Browser profile page registers the service worker.

## Frontend Behaviors Worth Preserving

These are not directly covered by the Node tests, but the implementation is coherent and should either be preserved or intentionally replaced:

- Create form disables submit while running.
- Create form shows clear errors for missing libsodium, API validation failures, network failures, and clipboard failures.
- Create flow generates keys locally before sending public key to the server.
- Private key never goes to the server.
- Revocation secret is shown prominently and can be copied or downloaded.
- Revoke form disables submit while running.
- Revoke form displays success and error states.
- Revoke form resets after success.
- Offline service worker uses network-first for profile pages and cache-first for static assets.

## Deployment Artifacts Worth Preserving

Preserve these deployment concepts even if the files are rewritten:

- One-host apex deployment is supported: marketing site at `/`, resolver API and UI on the same `humanity.llc` origin.
- Resolver API is reverse-proxied under `/.well-known/hc/v0.5/`.
- Resolver UI assets are reverse-proxied at root paths.
- `/sw.js` receives service worker scope headers.
- TLS and HSTS are part of the deployment plan.
- systemd service runs Node from the resolver directory with `.env`.
- Production database and log paths are configurable.

## Known Working Test Coverage

The passing tests cover:

- Contract helpers.
- QR payload helpers.
- Health endpoint.
- Create profile endpoint.
- Resolve profile endpoint.
- QR endpoint.
- Revoke endpoint.
- Access log formatting and opt-out.
- Static frontend serving.
- Rate limiting.

## Gaps Not Proven By Tests

These may work but are not fully proven by the current test suite:

- Browser key generation with real CDN-loaded `libsodium`.
- Browser import of `bs58` from `esm.sh`.
- Clipboard API behavior.
- Secret text file download behavior.
- Full service worker installation and fetch behavior in a browser.
- Offline profile display after a real network failure.
- Production Nginx routing.
- systemd startup.
- Cloudflare Tunnel or apex DNS behavior.
- SQLite persistence across process restarts.
- Real Ed25519 key semantics beyond 32-byte public key length.
