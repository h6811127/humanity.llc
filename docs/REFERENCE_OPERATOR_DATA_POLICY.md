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
- **Reference network v1:** `GET /c/…`, `GET …/status?q=…`, and `GET …/qr/{qr_id}` are **not** access-logged. Status JSON exposes `scan.limits.scan_analytics: false`.
- If minimal access logs are ever required for abuse response, that MUST be a **governance-approved** policy with published retention - not a silent product default.

## Client UI (not operator storage)

Saved card rows on `/wallet/` and the device hub may show **checked … ago**. That timestamp is **only** when **this browser** last successfully polled `GET …/cards/{profile_id}/status?q=…` for a saved card (`hc_wallet_network_cache` in session storage). It is **not** a log of who scanned the QR, and the operator does not receive or retain that client timestamp. Product copy MUST NOT use **seen** or **last scan** on saved rows in ways that imply stranger scan trails. Spec: [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md) § Recency wording and data policy.

## Commerce firewall

- QR payloads MUST NOT embed order IDs, emails, or shipping fields.
- Purchasing merch MUST NOT upgrade verification or vouch state.
- Printify / Shopify PII MUST NOT merge into “vouched” or “verified” without a separate, explicit, governed process.

## Retention (practical v1 targets)

| Data class | Retention |
|------------|-----------|
| Public card + credential state (active, maintained) | Until owner revoke/disable, user-initiated delete (future), or operator suspension |
| **Orphan registrations** (active, never updated, no vouches, no live QR, older than 90 days) | **Automatic purge** daily via Worker cron — see [`CARD_RETENTION_AND_ORPHAN_CLEANUP.md`](CARD_RETENTION_AND_ORPHAN_CLEANUP.md) |
| Revocation / suspension records | Retained while status matters for trust; public notice fields follow governance |
| Live-control challenges | Minutes (TTL); not kept as long-term history |
| Access logs (if ever enabled) | Short, published maximum; governance-approved only |

## Your rights

- Export signed card material and public state you control.
- Revoke credentials and request deletion per published process.
- Move to another operator when federation and export paths are available.

## Changes

Rights-affecting retention changes require published notice and member governance per launch plan - not silent expansion.

## Related documents

- `docs/CARD_RETENTION_AND_ORPHAN_CLEANUP.md` (orphan eligibility + cron purge)
- `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md` §5 (normative minimization rules)
- `docs/Technical Standards v1.0.md`
- `docs/V1_PRODUCT_TRUST_MODEL.md`
