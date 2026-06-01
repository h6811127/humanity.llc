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
- Scan analytics: per-scan trails, scan notifications, location history, device fingerprinting, or ad profiles.
- Payment or shipping PII in the network database (commerce stays in Shopify / Printify).

## Access logs

- **Default:** no logging of scan requests.
- **Reference network v1:** `GET /c/…`, `GET …/status?q=…`, and `GET …/qr/{qr_id}` are **not** access-logged. Status JSON exposes `scan.limits.scan_analytics: false`.
- If minimal access logs are ever required for abuse response, that MUST be a **governance-approved** policy with published retention - not a silent product default.

## Scan notifications and interaction signals

- **Default:** no steward notifications, inbox rows, browser alerts, webhooks, emails, or dashboards are triggered by a passive scan.
- **Allowed notification exception:** live-control proof, where a scanner explicitly asks the steward to sign a short-lived challenge. That alert is about the challenge lifecycle, not a scan log.
- **Optional future interaction signals** may summarize object state only: "discovered recently," "scanned this week," "new person interacted," or "active in the network." They MUST NOT expose timestamps, locations, IPs, user agents, scanner identity, or per-scan history.
- Product copy MUST NOT position scan counts, "who scanned you," engagement dashboards, or hoodie scan alerts as the value of Humanity artifacts. Programmable resolver state is the product surface.

## Client UI (not operator storage)

Saved card rows on `/wallet/` and the device hub may show **checked … ago**. That timestamp is **only** when **this browser** last successfully polled `GET …/cards/{profile_id}/status?q=…` for a saved card (`hc_wallet_network_cache` in session storage). It is **not** a log of who scanned the QR, and the operator does not receive or retain that client timestamp. Product copy MUST NOT use **seen** or **last scan** on saved rows in ways that imply stranger scan trails. Spec: [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md) § Recency wording and data policy.

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

## Cedar Rapids city game (Season 1 collective mechanics)

Applies when the reference operator runs [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) on humanity.llc.

- **Public object state only:** faction holds, bulletins, route windows, and collective unlock flags are **operator-published world truth** — not per-player scores or scan-derived rankings.
- **Collective thresholds (v1):** “20 anonymous scans unlock clue” style beats use **operator-verified quorum flips** (`POST …/game-update`), not hidden scan counts or device trails. See implementation brief § Collective threshold — phase 2 RFC before advertising automatic thresholds.
- **Must not store for gameplay:** player IDs, scan heatmaps, location history, streaks, or leaderboard rows tied to scans.
- **Allowed:** aggregate flags on the object document (`collective_progress`, `unlocked_by`) when set by signed game-operator updates — still no per-scanner identity in D1.
- **Mobile lore hoodies:** enrolled `print_artifact` QRs show owner-updated status lines; enrollment is catalog metadata in season JSON, not scan logging.

## Retention (practical v1 targets)

| Data class | Retention |
|------------|-----------|
| Public card + credential state (active, maintained) | Until owner revoke/disable, user-initiated delete (future), or operator suspension |
| **Orphan registrations** (active, never updated, no vouches, no live QR, older than 90 days) | **Automatic purge** daily via Worker cron - see [`CARD_RETENTION_AND_ORPHAN_CLEANUP.md`](CARD_RETENTION_AND_ORPHAN_CLEANUP.md) |
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

- `docs/MERCH_QR_LIFECYCLE_POLICY.md` (printed artifact QRs: no calendar expiry, fulfillment mint rules)
- `docs/CARD_RETENTION_AND_ORPHAN_CLEANUP.md` (orphan eligibility + cron purge)
- `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md` §5 (normative minimization rules)
- `docs/Technical Standards v1.0.md`
- `docs/V1_PRODUCT_TRUST_MODEL.md`
