# Reference operator data policy

**Status:** Draft · aligned with `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md` §5  
**Applies to:** The humanity.llc reference network (bootstrap operator). Other federated operators MUST publish their own policy.

## Purpose

Minimize stored data so the network is not a surveillance honeypot. Publish what we keep so scanners and members can inspect limits.

## What we MAY store (public trust layer)

- Opaque `profile_id`, public signing key, handle, manifesto (user-chosen public fields).
- Signed card document, QR credential records, status flags (active / revoked / suspended).
- Signed vouches and public verification summary fields.
- Signed revocation and suspension records (with public notice where policy requires).
- Short-lived live-control challenge records (TTL in minutes, not retained as history).

## What we MUST NOT store (core loop)

- Private keys, recovery secrets, or seed phrases.
- Government ID images, numbers, or KYC artifacts.
- Phone numbers or emails **required** to create a card.
- Scan analytics: per-scan trails, location history, device fingerprinting, or ad profiles.
- Payment or shipping PII in the network database (commerce stays in Shopify / Printify).

## Access logs

- **Default:** no logging of scan requests.
- If minimal access logs are ever required for abuse response, that MUST be a **governance-approved** policy with published retention—not a silent product default.

## Key custody and recovery limits

- Owner signing keys are generated client-side. During create, the owner key is session-only unless the user saves a recovery key or encrypted backup.
- Encrypted backup files are created client-side. The backup passphrase MUST NOT be sent to or stored by the reference operator.
- Recovery private keys are shown to the user once. The resolver may store the recovery public key, but MUST NOT store the recovery private key or seed.
- The reference operator cannot recover lost passphrases, restore lost private keys, or revoke on a user's behalf. Revocation requires a valid owner, recovery, or registered organizer signature.
- If a user closes the tab and loses both backup/passphrase and recovery key, they cannot revoke from the web UI without creating a new card.

## Commerce firewall

- QR payloads MUST NOT embed order IDs, emails, or shipping fields.
- Purchasing merch MUST NOT upgrade verification or vouch state.
- Printify / Shopify PII MUST NOT merge into “vouched” or “verified” without a separate, explicit, governed process.

## Retention (practical v1 targets)

| Data class | Retention |
|------------|-----------|
| Public card + credential state | Until user export + delete, or operator policy after account closure |
| Revocation / suspension records | Retained while status matters for trust; public notice fields follow governance |
| Live-control challenges | Minutes (TTL); not kept as long-term history |
| Access logs (if ever enabled) | Short, published maximum; governance-approved only |

## Your rights

- Export signed card material and public state you control.
- Revoke credentials and request deletion per published process.
- Move to another operator when federation and export paths are available.

## Changes

Rights-affecting retention changes require published notice and member governance per launch plan—not silent expansion.

## Related documents

- `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md` §5 (normative minimization rules)
- `docs/Technical Standards v1.0.md`
- `docs/V1_PRODUCT_TRUST_MODEL.md`
