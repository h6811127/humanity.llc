# Data Models

This file extracts every schema, payload shape, constant model, validation model, and browser storage model found in the prototype.

## SQLite Schema

Source: `schema.sql`

### `profiles`

| Column | Type | Constraint / Default | Meaning |
|---|---|---|---|
| `profile_id` | `TEXT` | `PRIMARY KEY` | Opaque 20-character base58 resolver ID. |
| `handle` | `TEXT` | `UNIQUE NOT NULL` | Public lowercase handle. |
| `manifesto_line` | `TEXT` | `NOT NULL` | Sanitized public statement, 1-280 characters. |
| `public_key` | `TEXT` | `NOT NULL` | Base58-encoded 32-byte Ed25519 public key. |
| `created_at` | `INTEGER` | `NOT NULL` | Unix timestamp in seconds. |
| `updated_at` | `INTEGER` | `NOT NULL` | Unix timestamp in seconds. Currently set at creation only. |
| `revoked` | `INTEGER` | `DEFAULT 0` | Boolean-like flag: `0` active, `1` revoked. |
| `revoked_at` | `INTEGER` | nullable | Unix timestamp in seconds when revoked. |
| `revocation_secret_hash` | `TEXT` | nullable | SHA-256 hex digest of the creation-time revocation secret. |

Indexes:

- `idx_profiles_handle` on `profiles(handle)`.
- `idx_profiles_revoked` on `profiles(revoked)`.

## Constants

Source: `lib/constants.js`

### `BASE58_ALPHABET`

```text
123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
```

Excludes ambiguous characters:

- `0`
- `O`
- `I`
- `l`

### `PROFILE_ID_LENGTH`

```text
20
```

### `QR_PAYLOAD_MAX_LENGTH`

```text
120
```

### QR Protocol Constants

```text
QR_SCHEME = "hc"
QR_HOST = "resolve"
Canonical prefix = "hc://resolve/"
```

### Reserved Handles

Reserved handles are lowercased in the exported array:

- `admin`
- `administrator`
- `host`
- `resolver`
- `system`
- `test`
- `example`
- `support`
- `help`
- `info`
- `root`
- `api`
- `www`
- `hc`
- `hc://`
- `humanity`
- `commons`
- `profile`
- `profiles`
- `qr`
- `resolve`
- `revoked`
- `suspended`
- `null`
- `undefined`
- `false`
- `true`
- `0`
- `1`

## Validation Models

Source: `lib/validation.js`

### `Handle`

Type:

```text
string
```

Regex:

```text
^[a-z][a-z0-9_]{2,31}$
```

Valid examples from tests:

- `abc`
- `a_b_c_1`
- `z0000000000000000000000000000000`

Invalid examples from tests:

- empty string
- `ab`
- `1abc`
- `ABCD`
- 33-character strings
- `null`
- reserved handles such as `admin`, `api`, `null`

Issue codes:

- `format`
- `reserved`
- `null` for valid

### `ManifestoLine`

Raw type:

```text
string
```

Rules:

- Reject non-strings as `empty`.
- Reject raw input longer than 4096 characters as `too_long`.
- Strip tags matching `<[^>]*>`.
- Remove remaining `<` and `>`.
- Trim.
- Reject empty sanitized output as `empty`.
- Reject sanitized output longer than 280 characters as `too_long`.
- Sanitized output is `trim().slice(0, 280)`.

Issue codes:

- `empty`
- `too_long`
- `null` for valid

### `PublicKeyBase58`

Raw type:

```text
string
```

Rules:

- Encoded length must be 40-48 characters.
- Base58 decode must succeed.
- Decoded byte length must be exactly 32.

Meaning:

- Intended as Ed25519 public key bytes in base58.
- No curve-point validation is performed.

### `ProfileId`

Raw type:

```text
string
```

Rules:

- Exactly 20 characters.
- Matches `^[1-9A-HJ-NP-Za-km-z]{20}$`.
- Every character must be in `BASE58_ALPHABET`.

Generated from:

- 16 random bytes.
- Base58 encoding.
- First 20 characters of encoded value.

## QR Models

Source: `lib/qr-payload.js`

### `QrPayload`

Canonical text format:

```text
hc://resolve/{profile_id}
```

Builder input:

- `profileId: string`

Builder output:

- canonical string

Parser output:

```js
{ profileId: string }
```

Parser returns `null` for invalid input.

## HTTP Payload Models

### Create Profile Request

Route:

```text
POST /.well-known/hc/v0.5/profiles
```

Shape:

```json
{
  "handle": "valid_user",
  "manifesto_line": "Hello commons.",
  "public_key": "base58-encoded-32-byte-key"
}
```

### Create Profile Success Response

Status:

```text
201
```

Shape:

```json
{
  "success": true,
  "profile_id": "20Base58Characters",
  "handle": "valid_user",
  "manifesto_line": "Hello commons.",
  "qr_code_url": "https://resolver.example/.well-known/hc/v0.5/qr/20Base58Characters.png",
  "profile_url": "https://resolver.example/.well-known/hc/v0.5/profile/20Base58Characters",
  "revocation_secret": "base64url-secret",
  "created_at": 1778940000
}
```

Notes:

- `revocation_secret` is only returned once.
- The database stores `sha256(revocation_secret)` as hex.

### Profile JSON Response

Route:

```text
GET /.well-known/hc/v0.5/profile/:profileId
```

Shape:

```json
{
  "version": "0.5",
  "profile_id": "20Base58Characters",
  "handle": "valid_user",
  "manifesto_line": "Hello commons.",
  "badge": {
    "type": "early_builder",
    "label": "Early Builder"
  },
  "created_at": 1778940000,
  "revoked": false,
  "constitution_link": "https://humanity.llc/constitution",
  "governance_link": "https://humanity.llc/governance"
}
```

### Badge

Static shape:

```json
{
  "type": "early_builder",
  "label": "Early Builder"
}
```

### Revoke Profile Request

Route:

```text
POST /.well-known/hc/v0.5/revoke
```

Shape:

```json
{
  "profile_id": "20Base58Characters",
  "revocation_secret": "secret-from-create-response"
}
```

### Revoke Profile Success Response

Status:

```text
200
```

Shape:

```json
{
  "success": true,
  "message": "Profile revoked. QR codes will return 410 Gone within 1 hour."
}
```

### Health Success Response

Route:

```text
GET /.well-known/hc/v0.5/health
```

Shape:

```json
{
  "status": "ok",
  "version": "0.5",
  "uptime": 123,
  "database": "connected"
}
```

### Health Error Response

Shape:

```json
{
  "status": "error",
  "version": "0.5",
  "uptime": 123,
  "database": "error"
}
```

### Standard Error Response

Most JSON errors use:

```json
{
  "error": "machine_code",
  "message": "Human-readable message"
}
```

Observed error codes:

- `invalid_handle`
- `invalid_manifesto`
- `invalid_public_key`
- `handle_taken`
- `server_error`
- `not_found`
- `revoked`
- `bad_request`
- `invalid_secret`

## HTML Rendering Model

Source: `lib/html.js`

### `profilePageHtml(profile, meta)`

Expected `profile` fields:

- `handle`
- `manifesto_line`
- `badge.type`
- `badge.label`
- `created_at`
- `revoked`

Expected `meta` fields:

- `constitutionLink`
- `governanceLink`
- `servedAtIso`

Dynamic fields are escaped before interpolation:

- `&`
- `<`
- `>`
- `"`
- `'`

The rendered page stores `servedAtIso` in `body[data-server-as-of]` for offline banner copy.

## Browser Storage Models

Source: `frontend/create.js`

### `localStorage.hc_private_key`

Value:

```text
base58-encoded Ed25519 private key
```

Purpose:

- Store the locally generated private key in the current browser.

Current limitation:

- No backend route uses this key yet.
- No recovery, backup, or migration flow exists.

### `sessionStorage.hc_public_key`

Value:

```text
base58-encoded Ed25519 public key
```

Purpose:

- Preserve public key during the current browser session.

## Cache Models

Source: `frontend/sw.js`

### Static Cache

Name:

```text
hc-static-v0.5
```

Assets:

- `/index.html`
- `/create.html`
- `/revoke.html`
- `/profile.html`
- `/offline.html`
- `/style.css`
- `/app.js`
- `/create.js`
- `/revoke.js`
- `/manifest.json`

### Profile Cache

Name:

```text
hc-profiles-v0.5
```

Stores:

- Successful `200` responses whose path includes `/.well-known/hc/v0.5/profile/`.

## Runtime Configuration Model

Source: `.env.example`

Variables:

- `PORT`: Express listen port. Default fallback is `3000`.
- `DATABASE_PATH`: SQLite file path. Default fallback is `./data/profiles.sqlite`.
- `PUBLIC_BASE_URL`: Overrides generated absolute profile and QR URLs.
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in milliseconds.
- `RATE_LIMIT_MAX_REQUESTS`: Rate limit max requests per window.
- `LOG_LEVEL`: Reserved for future structured logging.
- `CONSTITUTION_LINK`: Profile response/render link override.
- `GOVERNANCE_LINK`: Profile response/render link override.
- `LOG_FILE`: Access log file path.
- `LOG_ENABLED`: Set to `0` to disable access logging.

Production comments mention:

- `DATABASE_PATH=/var/data/profiles.sqlite`
- `PUBLIC_BASE_URL=https://humanity.llc`
- `PUBLIC_BASE_URL=https://resolver.humanity.llc`
- `LOG_FILE=/var/log/humanity-resolver/access.log`
