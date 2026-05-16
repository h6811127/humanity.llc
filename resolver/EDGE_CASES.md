# Edge Cases Attempted In The Prototype

This file lists edge cases the prototype explicitly tried to handle through code, tests, or deployment notes. It includes behavior that works, behavior that is only partially covered, and behavior that may need redesign.

## Input Validation

### Handles

Attempted edge cases:

- Non-string handles are rejected.
- Empty handles are rejected.
- Handles shorter than 3 characters are rejected.
- Handles longer than 32 characters are rejected.
- Handles starting with a digit are rejected.
- Uppercase handles are rejected.
- Handles containing characters outside lowercase letters, digits, and underscore are rejected.
- Reserved words are rejected.
- Null-like handles such as `null`, `undefined`, `false`, and `true` are reserved.
- Numeric placeholders `0` and `1` are reserved.
- Route-like handles such as `api`, `profile`, `profiles`, `qr`, `resolve`, and `hc` are reserved.
- Duplicate handles are rejected through the SQLite unique constraint and surfaced as `409 handle_taken`.

### Manifesto Lines

Attempted edge cases:

- Non-string manifesto input is treated as empty.
- Empty string is rejected.
- Whitespace-only string is rejected.
- Raw input longer than 4096 characters is rejected early.
- HTML tags are stripped.
- Remaining angle brackets are removed.
- Sanitized text must be non-empty.
- Sanitized text longer than 280 characters is rejected.
- Sanitized text is trimmed.
- Sanitized text is truncated to 280 by `sanitizeManifesto`.

Risk to preserve or reconsider:

- The regex-based tag stripping is not a full sanitizer.
- Sanitization and validation are separate; validation rejects overlong sanitized content, while `sanitizeManifesto` truncates. Keep that invariant clear in the rebuild.

### Public Keys

Attempted edge cases:

- Missing or non-string public keys are rejected.
- Public keys with encoded length outside 40-48 characters are rejected before decoding.
- Invalid base58 strings are rejected.
- Valid base58 strings decoding to 31 bytes are rejected.
- Valid base58 strings decoding to 33 bytes are rejected.
- Only exactly 32 decoded bytes are accepted.

Risk to preserve or reconsider:

- No real Ed25519 curve-point validation exists.
- The generated frontend private key is not used by the server.

### Profile IDs

Attempted edge cases:

- Non-string IDs are rejected.
- IDs shorter or longer than 20 characters are rejected.
- IDs containing `0`, `O`, `I`, or `l` are rejected.
- IDs containing characters outside base58 are rejected.
- Profile ID generation retries invalid base58 fragments.
- Profile ID generation retries when caller reports collision.
- Profile ID generation has exhaustion errors instead of infinite loops.

## QR Payloads

Attempted edge cases:

- Non-string QR payloads return `null`.
- Empty payloads return `null`.
- Surrounding whitespace is trimmed.
- Payloads longer than 120 characters return `null`.
- Raw query strings are rejected.
- Raw fragments are rejected.
- Raw ampersand delimiters are rejected.
- Scheme and host are case-insensitive.
- Profile ID remains case-sensitive.
- Percent encoding is decoded only in the profile ID suffix.
- Malformed percent encoding returns `null`.
- Percent-decoded delimiter smuggling is rejected after decode.
- `buildQrPayload` trims profile ID input before validation.
- `buildQrPayload` throws on invalid IDs.

Important invariant:

- The canonical QR payload is not an HTTP URL. It is `hc://resolve/{profile_id}`.

## HTTP Parsing and Routing

Attempted edge cases:

- JSON request bodies are limited to `32kb`.
- API route versioning is isolated under `/.well-known/hc/v0.5`.
- `GET /health` is exempt from rate limiting but still mounted inside the API router.
- `/sw.js` is served separately to attach `Service-Worker-Allowed: /`.
- Static frontend serving is conditional on the `frontend` directory existing.
- QR route validates filename shape before profile lookup.

Risk to preserve or reconsider:

- The QR handler regex uses a case-insensitive flag before `isValidProfileId`, so uppercase/lowercase base58 differences are passed through but still validated against the base58 alphabet.
- Express route is `/qr/:filename`, so only one path segment is accepted; nested paths are naturally rejected by routing.

## Content Negotiation

Attempted edge cases:

- Missing `Accept` header defaults profile resolution to HTML.
- `Accept` containing `text/html` returns HTML.
- `Accept` containing `application/json` returns JSON only when `text/html` is not present.
- Other accept headers default to HTML.

Risk to preserve or reconsider:

- The negotiation is simple substring matching, not full HTTP quality-value negotiation.
- If an `Accept` header contains both `text/html` and `application/json`, HTML wins.

## Profile Lookup States

Attempted edge cases:

- Invalid profile IDs are treated as not found by the profile lookup helper.
- Unknown profile IDs return `404`.
- Revoked profiles return `410`.
- Active profiles return `200`.
- Revoked QR codes return `410`.
- Unknown QR codes return `404`.
- Invalid QR paths return `400`.

User-facing mismatch to examine:

- The static revoke UI maps `404` to "No profile exists with this ID. The QR code may be invalid or revoked." The API uses `410` for revoked profiles, so the "or revoked" part is defensive copy rather than exact API state.

## Revocation

Attempted edge cases:

- Missing `profile_id` or `revocation_secret` returns `400`.
- Empty `profile_id` or `revocation_secret` returns `400`.
- Invalid profile ID returns `404` instead of exposing validation detail.
- Unknown profile returns `404`.
- Already revoked profile returns `410`.
- Missing `revocation_secret_hash` in the database returns `500`.
- Wrong secret returns `401`.
- Valid secret returns `200`.
- Revocation updates `revoked` and `revoked_at`.
- Repeated revocation after success returns `410`.

Security detail:

- Submitted secrets are SHA-256 hashed.
- Hashes are compared with `crypto.timingSafeEqual` only if buffers have the same length.
- Plaintext revocation secrets are not stored.

Risk to preserve or reconsider:

- SHA-256 without a salt or KDF may be acceptable only if generated secrets are high entropy and never user chosen.
- The success message says QR codes will return `410 Gone within 1 hour`, but the current code makes them return `410` immediately.

## Database and Persistence

Attempted edge cases:

- Database parent directories are created automatically for file-backed SQLite.
- `:memory:` databases work for tests.
- Schema is applied on every open.
- Handle uniqueness is enforced at the database layer.
- Profile ID uniqueness is enforced by primary key and proactively checked before insert.
- Database failures during ID generation or insert return `500`.

Risk to preserve or reconsider:

- There is no migration system beyond executing `schema.sql`.
- `updated_at` is not changed during revocation.
- `revocation_secret_hash` is nullable in schema, but creation always sets it.

## Rate Limiting

Attempted edge cases:

- Defaults to 100 requests per 60 seconds per IP.
- Environment variables override window and max.
- Test options override window and max.
- 101st request in a 100-request window returns `429`.
- Health endpoint is excluded.
- Standard rate limit headers are enabled.
- Legacy headers are disabled.

Risk to preserve or reconsider:

- Trust proxy is set to `1`, so deployment proxy configuration must be correct for client IP limiting.

## Access Logging

Attempted edge cases:

- Log writes occur on response `finish`, so final status is logged.
- Query strings are stripped from logged paths.
- Log lines include timestamp, method, path, status, anonymized IP.
- IPv4 last octet is zeroed.
- IPv4-mapped IPv6 addresses are normalized.
- Localhost addresses pass through.
- IPv6 addresses are shortened.
- Missing IP becomes `0.0.0.0`.
- Unknown IP shape becomes `unknown`.
- `LOG_ENABLED=0` disables logging.
- Log directories are created automatically.
- Log write errors are caught and printed rather than breaking requests.

Risk to preserve or reconsider:

- IPv6 anonymization is very simple and should be checked against privacy requirements.
- The access log is append-only in behavior but not protected from filesystem rotation/truncation.

## Frontend Create Flow

Attempted edge cases:

- Manifesto character count updates live.
- Form submit prevents default browser navigation.
- Form error is cleared before retry.
- Submit button is disabled during async work.
- Missing or blocked `libsodium` shows a user-facing error.
- `sodium.ready` is awaited.
- Private key storage failures are ignored to handle quota/private mode.
- Public key session storage failures are ignored.
- API errors attempt to show server `message`.
- Duplicate handle has a friendly fallback message.
- Network failures show a connectivity message.
- Clipboard failures show an error.
- Revocation secret can be downloaded as a text file.

Risk to preserve or reconsider:

- `create.js` imports `bs58` from `https://esm.sh`, which requires network access and may conflict with strict CSP or offline behavior.
- `create.html` loads `libsodium-wrappers` from jsDelivr, also network-dependent.
- The service worker tries to cache `/create.js`, but `create.js` itself depends on external CDNs.
- The private key warning says losing the private key loses the ability to revoke the profile, but actual revocation uses the separate revocation secret, not the private key. This is a product/spec inconsistency to resolve.
- No client-side reserved-handle check exists beyond the API.
- The private key is stored in localStorage, which is convenient but sensitive.

## Frontend Revoke Flow

Attempted edge cases:

- Form submit prevents default browser navigation.
- Error and success messages are cleared before retry.
- Submit button is disabled during request.
- Profile ID is trimmed.
- Revocation secret is trimmed.
- Server JSON parse failures fall back to `{}`.
- Server error messages are displayed when present.
- `404` receives special user-facing copy.
- Network failures show a connectivity message.
- Form resets after successful revocation.

Risk to preserve or reconsider:

- Trimming the revocation secret is okay for current base64url generated secrets, but would be risky if future secrets allowed leading/trailing whitespace.

## Offline and Service Worker

Attempted edge cases:

- Service worker installation does not fail permanently if caching static assets fails.
- Static cache includes app shell files.
- Profile pages use network-first strategy.
- Only successful `200` profile responses are cached.
- Cached profile response is used when network fails.
- Other requests use cache-first, then network.
- Profile HTML has an offline banner that displays when `navigator.onLine` is false.
- Returning online reloads the profile page.

Risk to preserve or reconsider:

- No cache version cleanup exists during activate.
- No explicit fallback to `/offline.html` is implemented for profile misses; the code only tries `caches.match(event.request)`.
- The static cache may try to cache module scripts that depend on external network imports.
- Revoked profiles cached while active may still be shown offline, with only an offline banner. That may be intended by spec, but it is a policy decision.

## HTML Rendering

Attempted edge cases:

- Dynamic profile text is escaped before rendering.
- Badge type and label are escaped.
- Constitution and governance links are escaped.
- Missing badge falls back to Early Builder.
- Missing served timestamp falls back to current time.
- Date formatting errors fall back to a placeholder.
- Revoked profiles can render a revoked notice in the generic HTML renderer.

Risk to preserve or reconsider:

- The actual revoked profile route currently sends a small standalone revoked HTML string instead of using the full `profilePageHtml` renderer.

## QR Generation

Attempted edge cases:

- Invalid QR filename returns plain-text `400`.
- Invalid profile ID after filename extraction returns plain-text `400`.
- Unknown profile returns plain-text `404`.
- Revoked profile returns plain-text `410`.
- QR size is clamped to avoid too-small or too-large output.
- QR margin is clamped.
- QR generation exceptions return `500`.

Risk to preserve or reconsider:

- The QR PNG is cached for 24 hours, while revocation message says QR codes return 410 within 1 hour. Rebuild should define cache invalidation precisely.

## Deployment

Attempted edge cases:

- Apex deployment separates marketing static root from resolver routes.
- Resolver locations are intended to match before static `location /`.
- `/.well-known/hc/v0.5/` is proxied to Node.
- Root UI files are proxied to Node.
- `/sw.js` has service worker scope header.
- HTTPS and HSTS are included in examples.
- HTTP redirects to HTTPS.
- README warns against pointing apex DNS at a Worker/Pages app that lacks resolver routes, citing Worker 1101 failures.
- systemd restarts on failure.
- Production paths for database and logs are documented.

Risk to preserve or reconsider:

- `sync-marketing-static.sh` assumes the project is nested inside a parent repo containing `v5/assets`.
- The Nginx examples duplicate route blocks in multiple files and can drift.
- `nginx-apex-server-blocks.example.conf` comments say to paste location blocks, but it already includes them.
