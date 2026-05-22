# hc/v1 signature harness (M1.5 / C-003)

Implements **RFC 8785 (JCS)** canonicalization and **Ed25519** sign/verify for all v1 signed payload types.

## Signing model

1. Build the **unsigned** JSON object (no `signature` key).
2. Include Technical Standards §17 fields:
   - `type` — payload type (`humanity_card`, `qr_credential`, `vouch`, …)
   - `version` — `"1.0"`
   - Subject profile id (`profile_id`, `vouchee_profile_id`, or `issued_to`)
   - Timestamp (`created_at`, `revoked_at`, `issued_at`, …)
   - `nonce` or stable unique id (`vouch_id`, `qr_id`, `manifest_id`, …)
3. Canonicalize with JCS → UTF-8 bytes → Ed25519 sign.
4. Attach inline `signature` block (`alg`, `public_key`, `signature`, `signed_at`, `canonicalization: "JCS"`).

```typescript
import { signDocument, verifySignedDocument, withProtocolFields, PAYLOAD_TYPES } from "./crypto";

const signed = await signDocument(
  withProtocolFields({ profile_id, ...fields }, PAYLOAD_TYPES.HUMANITY_CARD),
  { privateKey, publicKeyBase58 }
);

const result = await verifySignedDocument(signed, {
  expectedType: PAYLOAD_TYPES.HUMANITY_CARD,
  expectedPublicKeyBase58: card.public_key,
});
```

## Badge `type` field

Public badge records in prose specs use `type: "founding_human"` for badge kind. Signed badge **payloads** use:

- `type: "badge"` — protocol payload type (§17)
- `badge_type: "founding_human"` — display/issuance kind

## Replay protection

`NonceReplayGuard` is used in tests and will back resolver revocation/vouch ingestion (M4/M6). Payloads with a `nonce` can pass `nonceGuard` into `verifySignedDocument`.

## Tests and fixtures

```bash
npm run worker:fixtures   # regenerate worker/tests/fixtures/*.json
npm run worker:test       # vitest
```

Golden vectors use deterministic seed `humanity-commons-test-seed-v1` (**test only**).

## Spec references

- `docs/Technical Standards v1.0.md` §5, §17
- `docs/V1_IMPLEMENTATION_BACKLOG.md` C-003
