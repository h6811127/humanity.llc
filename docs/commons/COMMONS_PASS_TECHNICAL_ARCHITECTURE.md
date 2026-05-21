# Commons Pass Technical Architecture

**Status:** Architecture draft  
**Purpose:** Define a secure, professional v1 architecture for Commons Pass as mobile web community membership infrastructure.

---

## Architecture Goals

Commons Pass v1 should be:

- Secure by design.
- Mobile web first.
- Simple enough for one engineer to build.
- Explicit about trust boundaries.
- Ready for future federation without pretending to be federated at launch.
- Auditable.
- Privacy-preserving.
- Operationally boring.

No system is "completely secure." The goal is to document threat models, minimize data, isolate authority, make unsafe states visible, and avoid architectural traps that would require a rewrite.

---

## High-Level Architecture

```text
Member Browser
  - Humanity Card key operations
  - Pass display
  - Live control signing

Scanner Browser
  - Public pass scan page
  - Live control challenge request

Organizer Console
  - Community management
  - Member invitations
  - Event check-in
  - Stamp issuance

Commons API
  - Community records
  - Pass records
  - Event records
  - Check-in records
  - Stamp records
  - Policy enforcement

Resolver / Public Web
  - Mobile pass pages
  - Humanity Card pages
  - QR status pages

Signature Service Boundary
  - Verifies user signatures
  - Verifies community authority signatures
  - Never receives user private keys

Database
  - Public records
  - Private community records
  - Audit log
  - Encrypted sensitive fields

Background Workers
  - Expiration
  - Export generation
  - Webhook processing if commerce is enabled
  - Reconciliation jobs
```

---

## Recommended V1 Deployment Shape

Use a modular monolith for v1.

Reason:

- One engineer can reason about it.
- Shared schemas stay consistent.
- Transactions are simpler.
- Operational overhead stays low.
- Services can split later along already-defined boundaries.

Logical modules:

- `identity`
- `communities`
- `passes`
- `events`
- `stamps`
- `live_control`
- `exports`
- `audit`
- `admin`

---

## Trust Boundaries

| Boundary | Allowed To Cross | Must Not Cross |
|---|---|---|
| Member browser -> Commons API | Public card payloads, pass requests, signed responses | Private keys, recovery secrets in plaintext |
| Scanner browser -> Public Web | QR IDs, pass IDs, challenge requests | Private member data, passive analytics identifiers |
| Organizer console -> Commons API | Community admin actions, invites, check-ins, stamp issuance | Unauthorized member private data |
| Commons API -> Database | Records, encrypted sensitive fields, audit events | Unencrypted secrets or private keys |
| Commons API -> Public Web | Public pass/card/status data | Private notes, private stamps, payment secrets |
| Community authority -> Pass records | Signed membership/stamp claims | Authority to mutate Humanity Card ownership |

---

## Identifier Strategy

| Identifier | Format | Public | Notes |
|---|---|---|---|
| `community_id` | `com_` + opaque random/ULID | Yes | Stable community ID. |
| `community_handle` | lowercase slug | Yes | Public URL handle. |
| `pass_id` | `pass_` + opaque random/ULID | Yes | Public pass route may reference it. |
| `membership_id` | `mem_` + opaque random/ULID | Maybe | Internal membership relation. |
| `event_id` | `evt_` + opaque random/ULID | Maybe | Public if event is public. |
| `checkin_id` | `chk_` + opaque random/ULID | No by default | Event attendance record. |
| `stamp_id` | `stamp_` + opaque random/ULID | Depends on visibility | Signed community credential. |
| `authority_key_id` | `key_` + opaque random/ULID | Yes | Public key reference for community issuer. |

Identifiers must not encode personal data, timestamps, membership status, payment state, or location.

---

## Data Model Contracts

### Community

```json
{
  "community_id": "com_123",
  "handle": "east_bay_toolshed",
  "name": "East Bay Tool Shed",
  "description": "A member-run community workshop.",
  "status": "active",
  "public_url": "https://humanity.llc/commons/east_bay_toolshed",
  "authority_keys": ["key_123"],
  "rules_url": "https://humanity.llc/commons/east_bay_toolshed/rules",
  "privacy_url": "https://humanity.llc/commons/east_bay_toolshed/privacy",
  "created_at": "2026-05-17T20:00:00Z"
}
```

Allowed `status`: `draft`, `active`, `suspended`, `archived`.

### Community Authority Key

```json
{
  "authority_key_id": "key_123",
  "community_id": "com_123",
  "public_key": "base58-ed25519-public-key",
  "label": "Primary issuer",
  "status": "active",
  "created_at": "2026-05-17T20:00:00Z",
  "rotated_at": null
}
```

Private authority keys should be stored outside the normal database where possible. If v1 uses server-held authority keys, they must be encrypted, access-controlled, and auditable.

### Commons Pass

```json
{
  "pass_id": "pass_123",
  "community_id": "com_123",
  "profile_id": "base58-profile-id",
  "display_name": "@ada_lovelace",
  "status": "active",
  "issued_at": "2026-05-17T20:00:00Z",
  "expires_at": null,
  "visibility": "public",
  "signature": {}
}
```

Allowed `status`: `pending`, `active`, `revoked`, `suspended`, `expired`.

### Membership

```json
{
  "membership_id": "mem_123",
  "community_id": "com_123",
  "pass_id": "pass_123",
  "profile_id": "base58-profile-id",
  "role": "member",
  "status": "active",
  "joined_at": "2026-05-17T20:00:00Z"
}
```

Allowed `role`: `member`, `organizer`, `steward`, `admin`.

### Event

```json
{
  "event_id": "evt_123",
  "community_id": "com_123",
  "title": "Founding Assembly",
  "status": "published",
  "starts_at": "2026-06-01T18:00:00Z",
  "ends_at": "2026-06-01T21:00:00Z",
  "checkin_policy": "active_pass",
  "created_at": "2026-05-17T20:00:00Z"
}
```

Allowed `status`: `draft`, `published`, `completed`, `canceled`.

### Check-In

```json
{
  "checkin_id": "chk_123",
  "event_id": "evt_123",
  "community_id": "com_123",
  "pass_id": "pass_123",
  "checked_in_by": "profile_or_operator_id",
  "checked_in_at": "2026-06-01T18:10:00Z",
  "method": "qr_scan_confirmed"
}
```

Check-ins are intentional attendance records, not passive scan analytics.

### Stamp

```json
{
  "stamp_id": "stamp_123",
  "community_id": "com_123",
  "pass_id": "pass_123",
  "type": "attended_assembly",
  "label": "Attended Founding Assembly",
  "visibility": "public",
  "issued_at": "2026-06-01T21:00:00Z",
  "revoked_at": null,
  "evidence_uri": "https://humanity.llc/commons/east_bay_toolshed/events/evt_123",
  "signature": {}
}
```

Allowed `visibility`: `public`, `private_to_member`.

---

## API Surface

### Public Web

| Endpoint | Method | Purpose |
|---|---|---|
| `/p/{pass_id}` | GET | Public mobile pass page. |
| `/p/{pass_id}.json` | GET | Public machine-readable pass. |
| `/c/{community_handle}` | GET | Public community page. |
| `/c/{community_handle}/rules` | GET | Community rules. |

### Community API

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/v1/communities` | POST | Organizer | Create community. |
| `/v1/communities/{community_id}` | GET/PATCH | Organizer | Manage community. |
| `/v1/communities/{community_id}/invites` | POST | Organizer | Create member invite. |
| `/v1/communities/{community_id}/passes` | POST | Organizer/issuer | Issue pass. |
| `/v1/communities/{community_id}/passes/{pass_id}` | PATCH | Organizer/issuer | Update/revoke/suspend pass. |

### Event API

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/v1/communities/{community_id}/events` | POST | Organizer | Create event. |
| `/v1/events/{event_id}/checkins` | POST | Organizer | Confirm check-in. |
| `/v1/events/{event_id}/checkins/{checkin_id}` | DELETE | Organizer | Remove mistaken check-in with audit. |

### Stamp API

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/v1/communities/{community_id}/stamps` | POST | Issuer | Issue stamp. |
| `/v1/stamps/{stamp_id}/revoke` | POST | Issuer | Revoke stamp. |

### Live Control API

Use Humanity Card live control endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/.well-known/hc/v1/cards/{profile_id}/live-control/challenges` | POST | Create challenge. |
| `/.well-known/hc/v1/cards/{profile_id}/live-control/responses` | POST | Submit signed response. |

---

## State Machines

### Pass Status

```text
pending -> active
pending -> revoked
active -> suspended
active -> revoked
active -> expired
suspended -> active
suspended -> revoked
expired -> active
```

### Event Status

```text
draft -> published
published -> completed
published -> canceled
completed -> archived
```

### Stamp Status

```text
issued -> revoked
issued -> expired
```

---

## Audit Model

Every privileged action must create an audit event:

- Community created.
- Authority key added/rotated/disabled.
- Pass issued.
- Pass suspended/revoked/reactivated.
- Event created/updated/canceled.
- Check-in created/deleted.
- Stamp issued/revoked.
- Export requested.
- Admin access to private records.

Audit events should include:

- Actor.
- Action.
- Subject.
- Timestamp.
- Request ID.
- IP or device metadata only where policy allows.
- Before/after state where safe.

Audit logs must not contain private keys, full secrets, or unnecessary private notes.

---

## Build Order

1. Shared schemas and state machines.
2. Community creation.
3. Pass issuance.
4. Public mobile pass page.
5. Pass QR route.
6. Pass revocation/suspension.
7. Event creation.
8. Organizer check-in.
9. Stamp issuance.
10. Export bundle.
11. Live control integration if not already implemented.

---

## Architecture Decisions To Lock

1. Framework and hosting target.
2. Database.
3. Server-held vs client/community-held authority keys for v1.
4. Authentication model for organizers.
5. Invite model.
6. Whether event check-in requires live control.
7. Public/private stamp visibility in v1.
8. Audit log retention policy.

