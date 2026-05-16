# API Endpoints and Function Signatures

This file lists every HTTP route, exported function, handler factory, script entry point, and deployment-facing route pattern found in the prototype.

## HTTP API Base

All versioned resolver API routes are mounted under:

```text
/.well-known/hc/v0.5
```

Constant:

```js
BASE_PATH = '/.well-known/hc/v0.5'
```

Source: `server.js`

## Routes

### `GET /.well-known/hc/v0.5/health`

Purpose:

- Check resolver and database health.

Headers:

- `X-Resolver-Version: 0.5`

Success:

- `200`
- JSON health payload.

Database failure:

- `500`
- JSON error health payload.

Notes:

- Excluded from API rate limiting.
- Still goes through request logging.

### `POST /.well-known/hc/v0.5/profiles`

Purpose:

- Create a new public profile.

Handler:

```js
postProfilesHandler(db, publicBaseUrl)
```

Request body:

- `handle`
- `manifesto_line`
- `public_key`

Success:

- `201`
- Profile creation response with URLs and one-time `revocation_secret`.

Errors:

- `400 invalid_handle`
- `400 invalid_manifesto`
- `400 invalid_public_key`
- `409 handle_taken`
- `500 server_error`

### `GET /.well-known/hc/v0.5/profile/:profileId`

Purpose:

- Resolve a profile ID to either JSON or human-readable HTML.

Handler:

```js
getProfileHandler(db)
```

Route param:

- `profileId`

Content negotiation:

- HTML when `Accept` is missing.
- HTML when `Accept` contains `text/html`.
- JSON when `Accept` contains `application/json` and does not contain `text/html`.
- HTML fallback for other accept values.

Success:

- `200`
- `Cache-Control: public, max-age=3600`
- JSON profile or HTML profile.

Errors:

- `404` unknown or invalid profile ID.
- `410` revoked profile.

### `GET /.well-known/hc/v0.5/qr/:filename`

Purpose:

- Generate a PNG QR code for an active profile.

Actual intended path:

```text
/.well-known/hc/v0.5/qr/{profile_id}.png
```

Handler:

```js
getQrPngHandler(db)
```

Route param:

- `filename`, expected to match `{20-char-base58}.png`

Query params:

- `size`: numeric, clamped to 100-1000, default 300.
- `margin`: numeric, clamped to 1-10, default 4.

Success:

- `200`
- `Content-Type: image/png`
- `Cache-Control: public, max-age=86400`

Errors:

- `400 Invalid QR path`
- `400 Invalid profile id`
- `404 Not found`
- `410 Revoked`
- `500 QR generation failed`

### `POST /.well-known/hc/v0.5/revoke`

Purpose:

- Revoke a profile using the creation-time revocation secret.

Handler:

```js
postRevokeHandler(db)
```

Request body:

- `profile_id`
- `revocation_secret`

Success:

- `200`
- `{ success: true, message: "Profile revoked. QR codes will return 410 Gone within 1 hour." }`

Errors:

- `400 bad_request`
- `401 invalid_secret`
- `404 not_found`
- `410 revoked`
- `500 server_error`

## Static Routes

Source: `server.js` and `frontend/`

### `GET /sw.js`

Purpose:

- Serve the service worker with root scope permission.

Headers:

- `Service-Worker-Allowed: /`
- `Content-Type: application/javascript`

### `GET /index.html`

Purpose:

- Resolver landing page.

### `GET /create.html`

Purpose:

- Create-profile UI.

### `GET /create.js`

Purpose:

- Browser-side keypair generation and profile creation flow.

### `GET /revoke.html`

Purpose:

- Revoke-profile UI.

### `GET /revoke.js`

Purpose:

- Browser-side revoke form submission.

### `GET /profile.html`

Purpose:

- Static instruction page explaining live profile URL shape.

### `GET /offline.html`

Purpose:

- Offline fallback/instruction page.

### `GET /app.js`

Purpose:

- Shared browser helper exposing `window.hcApiBase()`.

### `GET /style.css`

Purpose:

- Static UI styles.

### `GET /manifest.json`

Purpose:

- PWA manifest.

## Exported Server Functions

### `publicBaseUrl(req)`

Source: `server.js`

Signature:

```js
function publicBaseUrl(req)
```

Purpose:

- Derive the absolute public origin used in creation responses.

Resolution order:

1. `process.env.PUBLIC_BASE_URL`
2. `x-forwarded-proto` plus `x-forwarded-host`
3. `req.protocol` plus `host`

### `createApp(db, options = {})`

Source: `server.js`

Signature:

```js
function createApp(db, options = {})
```

JSDoc:

```js
/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ rateLimit?: { max?: number; windowMs?: number } }} [options]
 * @returns {import('express').Express}
 */
```

Purpose:

- Build the full Express app for tests and runtime.

Exports:

```js
module.exports = { createApp, BASE_PATH }
```

## Exported Contract Functions

Source: `lib/index.js`

Exports everything from:

- `lib/constants.js`
- `lib/validation.js`
- `lib/profile-id.js`
- `lib/qr-payload.js`

## Constants Module

Source: `lib/constants.js`

Exports:

```js
{
  BASE58_ALPHABET,
  PROFILE_ID_LENGTH,
  QR_PAYLOAD_MAX_LENGTH,
  QR_SCHEME,
  QR_HOST,
  RESERVED_HANDLES
}
```

## Validation Module

Source: `lib/validation.js`

### `isValidHandle(handle)`

Signature:

```js
function isValidHandle(handle)
```

Returns:

- `true` when `handleIssue(handle) === null`.
- `false` otherwise.

### `handleIssue(handle)`

Signature:

```js
function handleIssue(handle)
```

Returns:

- `'format'`
- `'reserved'`
- `null`

### `sanitizeManifesto(line)`

Signature:

```js
function sanitizeManifesto(line)
```

Returns:

- Sanitized string.
- Empty string for non-string input.

### `manifestoIssue(raw)`

Signature:

```js
function manifestoIssue(raw)
```

Returns:

- `'empty'`
- `'too_long'`
- `null`

### `isValidManifesto(line)`

Signature:

```js
function isValidManifesto(line)
```

Returns:

- Boolean.

### `isValidPublicKeyBase58(publicKey)`

Signature:

```js
function isValidPublicKeyBase58(publicKey)
```

Returns:

- Boolean.

### `isValidProfileId(id)`

Signature:

```js
function isValidProfileId(id)
```

Returns:

- Boolean.

Exports:

```js
{
  HANDLE_REGEX,
  RESERVED,
  isValidHandle,
  handleIssue,
  manifestoIssue,
  sanitizeManifesto,
  isValidManifesto,
  isValidPublicKeyBase58,
  isValidProfileId
}
```

## Profile ID Module

Source: `lib/profile-id.js`

### `bytesToProfileIdFragment(bytes)`

Signature:

```js
function bytesToProfileIdFragment(bytes)
```

Purpose:

- Encode random bytes with base58 and return a valid 20-character fragment or `null`.

### `generateProfileIdCandidate()`

Signature:

```js
function generateProfileIdCandidate()
```

Purpose:

- Generate a valid single profile ID candidate.

Throws:

- `profile_id_generation_exhausted`

### `generateProfileId(isTaken, maxAttempts = 64)`

Signature:

```js
function generateProfileId(isTaken, maxAttempts = 64)
```

JSDoc:

```js
/**
 * @param {(id: string) => boolean} isTaken
 * @param {number} [maxAttempts=64]
 * @returns {string}
 */
```

Purpose:

- Generate a profile ID that the caller says is not taken.

Throws:

- `profile_id_collision_exhausted`

Exports:

```js
{
  generateProfileIdCandidate,
  generateProfileId,
  bytesToProfileIdFragment
}
```

## QR Payload Module

Source: `lib/qr-payload.js`

### `buildQrPayload(profileId)`

Signature:

```js
function buildQrPayload(profileId)
```

JSDoc:

```js
/**
 * @param {string} profileId
 * @returns {string}
 */
```

Throws:

- `invalid_profile_id`
- `qr_payload_too_long`

### `parseQrPayload(raw)`

Signature:

```js
function parseQrPayload(raw)
```

JSDoc:

```js
/**
 * @param {string} raw
 * @returns {{ profileId: string } | null}
 */
```

Exports:

```js
{
  buildQrPayload,
  parseQrPayload
}
```

## Database Module

Source: `lib/db.js`

### `openDatabase(dbFilePath)`

Signature:

```js
function openDatabase(dbFilePath)
```

JSDoc:

```js
/**
 * @param {string} dbFilePath
 */
```

Purpose:

- Open SQLite, create directories, apply schema, return database object.

Exports:

```js
{ openDatabase }
```

## Profile Creation Handler Module

Source: `lib/post-profiles.js`

### `postProfilesHandler(db, publicBaseUrl)`

Signature:

```js
function postProfilesHandler(db, publicBaseUrl)
```

JSDoc:

```js
/**
 * @param {import('better-sqlite3').Database} db
 * @param {(req: import('express').Request) => string} publicBaseUrl
 */
```

Returns:

- Express request handler `(req, res) => void`.

Exports:

```js
{ postProfilesHandler, MSG }
```

## Profile Resolution Handler Module

Source: `lib/get-profile.js`

### `wantsHtml(req)`

Signature:

```js
function wantsHtml(req)
```

Purpose:

- Decide whether a profile response should be HTML.

### `getProfileRow(db, profileId)`

Signature:

```js
function getProfileRow(db, profileId)
```

Purpose:

- Validate profile ID and fetch row or `null`.

### `profileJson(req, row)`

Signature:

```js
function profileJson(req, row)
```

Purpose:

- Convert a DB profile row into the public JSON profile model.

### `getProfileHandler(db)`

Signature:

```js
function getProfileHandler(db)
```

JSDoc:

```js
/**
 * @param {import('better-sqlite3').Database} db
 */
```

Returns:

- Express request handler `(req, res) => void`.

Exports:

```js
{
  wantsHtml,
  getProfileRow,
  profileJson,
  getProfileHandler
}
```

## QR Handler Module

Source: `lib/get-qr.js`

### `getQrPngHandler(db)`

Signature:

```js
function getQrPngHandler(db)
```

JSDoc:

```js
/**
 * @param {import('better-sqlite3').Database} db
 */
```

Returns:

- Async Express request handler.

Exports:

```js
{ getQrPngHandler }
```

## Revoke Handler Module

Source: `lib/post-revoke.js`

### `postRevokeHandler(db)`

Signature:

```js
function postRevokeHandler(db)
```

JSDoc:

```js
/**
 * @param {import('better-sqlite3').Database} db
 */
```

Returns:

- Express request handler `(req, res) => void`.

Exports:

```js
{ postRevokeHandler, MSG }
```

## HTML Module

Source: `lib/html.js`

### `escapeHtml(s)`

Signature:

```js
function escapeHtml(s)
```

Purpose:

- Escape dynamic text for HTML interpolation.

### `formatMemberSince(ts)`

Signature:

```js
function formatMemberSince(ts)
```

Purpose:

- Convert Unix seconds to a US English date.

Fallback:

- Returns an em dash-like placeholder in current code for formatting errors.

### `profilePageHtml(profile, meta)`

Signature:

```js
function profilePageHtml(profile, { constitutionLink, governanceLink, servedAtIso })
```

JSDoc:

```js
/**
 * @param {object} profile
 * @param {{ constitutionLink: string, governanceLink: string, servedAtIso: string }} meta
 */
```

Purpose:

- Render the browser profile page HTML.

Exports:

```js
{ profilePageHtml, escapeHtml, formatMemberSince }
```

## Request Log Module

Source: `lib/request-log.js`

### `anonymizeIp(ip)`

Signature:

```js
function anonymizeIp(ip)
```

JSDoc:

```js
/**
 * @param {string | undefined} ip
 */
```

### `isoTimestamp()`

Signature:

```js
function isoTimestamp()
```

Returns:

- ISO timestamp to second precision.

### `logFilePath()`

Signature:

```js
function logFilePath()
```

Returns:

- Resolved log file path.

Not exported.

### `logRequest(req, status)`

Signature:

```js
function logRequest(req, status)
```

JSDoc:

```js
/**
 * @param {import('express').Request} req
 * @param {number} status
 */
```

### `requestLogMiddleware(req, res, next)`

Signature:

```js
function requestLogMiddleware(req, res, next)
```

Purpose:

- Express middleware that logs after response finish.

Exports:

```js
{ anonymizeIp, isoTimestamp, logRequest, requestLogMiddleware }
```

## Browser Functions and Globals

### `window.hcApiBase()`

Source: `frontend/app.js`

Signature:

```js
window.hcApiBase = function hcApiBase()
```

Returns:

```text
{window.location.origin}/.well-known/hc/v0.5
```

### Create Form Submit Handler

Source: `frontend/create.js`

Signature:

```js
form.addEventListener('submit', async (e) => { ... })
```

Purpose:

- Generate keys, store local key material, create profile, render result.

### Revoke Form Submit Handler

Source: `frontend/revoke.js`

Signature:

```js
form.addEventListener('submit', async (e) => { ... })
```

Purpose:

- Submit revocation request and render success/error state.

### Service Worker Event Handlers

Source: `frontend/sw.js`

Signatures:

```js
self.addEventListener('install', (event) => { ... })
self.addEventListener('activate', (event) => { ... })
self.addEventListener('fetch', (event) => { ... })
```

Purpose:

- Install static cache, claim clients, and serve profile/static cache strategies.

## Runtime Entry Points

### `npm start`

Command:

```text
node server.js
```

Behavior:

- Loads `.env`.
- Opens database from `DATABASE_PATH` or `data/profiles.sqlite`.
- Creates Express app.
- Listens on `PORT` or `3000`.

### `npm run dev`

Command:

```text
node --watch server.js
```

### `npm run init-db`

Command:

```text
node scripts/init-db.js
```

### `npm test`

Command:

```text
node --test test/
```

## Deployment Route Patterns

### Apex Nginx Resolver API

Pattern:

```text
location ^~ /.well-known/hc/v0.5/
```

Proxies to:

```text
http://humanity_resolver
```

### Apex Nginx Resolver HTML

Pattern:

```text
location ~ ^/(create|revoke|profile|offline)\.html$
```

### Apex Nginx Resolver JavaScript

Pattern:

```text
location ~ ^/(create|revoke|app)\.js$
```

### Apex Nginx Resolver Static Assets

Exact routes:

- `/style.css`
- `/manifest.json`
- `/sw.js`

### Subdomain Nginx Resolver

Pattern:

```text
location /
```

Proxies all routes to Node on `127.0.0.1:3000`.
