# Resolver v0.5 — contract package

This folder holds the **first implementation chunk**: shared rules for profile IDs, `hc://` QR payloads, and validation of `handle`, `manifesto_line`, and Ed25519 `public_key` (base58).

Authoritative docs:

- `docs/Technical Standards v0.5.md` — §2–3 (QR + profile id), §4.1–4.3 (Ed25519 + base58), §5.4–5.5 (handles)
- `docs/Tech Spec v0.5 🏁.md` — §3–4, Appendix A (reserved handles)

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
