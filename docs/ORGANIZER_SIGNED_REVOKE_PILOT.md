# Organizer-signed revoke pilot (Phase A vertical #3)

**Status:** Shipped in repo (field-test checklist below)  
**Parent:** `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md`  
**Prerequisite:** M5 stranger loop; `docs/REVOKE_AND_LIFECYCLE_V1.md`  
**Research:** `site/what-can-a-qr-do/civic-protest-infrastructure/`, `site/what-can-a-qr-do/local-economies/`

---

## What it is

A **card owner** can register a separate **organizer public key** at create time. A coalition, event crew, or vendor holding the matching **private key** may:

- **Revoke one QR** (`reason: organizer_revoked`, `target_kind: qr_credential`)
- **Disable the whole card** (`reason: organizer_revoked`, `target_kind: card`)

The owner key and recovery key still work with `reason: owner_revoked`. Organizer keys cannot impersonate the owner for other actions.

---

## How to set up

1. **Create** at `/create/` → open **Organizer can revoke (optional)**
2. Choose **Generate** (hand off private key on `/created/`) or **Paste** an existing organizer public key
3. Card document includes `issuer_public_key` (stored in D1 after migration `0005_issuer_public_key.sql`)

---

## How organizers revoke

1. Open **https://humanity.llc/organizer-revoke/** (or link from `/created/` with `profile_id` + `qr_id`)
2. Paste **organizer private key** (session only)
3. Enter profile ID and QR ID (for single-QR revoke)
4. Confirm and submit → same `POST …/revoke` API as owner revoke

---

## Protocol

| Signer | Allowed `reason` |
|--------|------------------|
| Owner or recovery key | `owner_revoked` |
| Registered `issuer_public_key` | `organizer_revoked` |

Revocation row stores `issuer_public_key` = signer's public key (audit).

---

## Pilot checklist

| Step | Pass? |
|------|-------|
| Owner creates card with organizer key | ☐ |
| Organizer revokes one QR; sibling QRs stay active | ☐ |
| Owner can still revoke with owner key | ☐ |
| Organizer cannot revoke with `owner_revoked` reason | ☐ |
| Strangers understand scan after organizer revoke | ☐ |

---

## Not in this pilot

- Signed **manifesto updates** (status changes without revoke) — future `card_update` document
- Multi-organizer federation or rotation UI
- Organizer revoke from `/created/` (use `/organizer-revoke/` only)

---

## Related files

| Path | Role |
|------|------|
| `worker/migrations/0005_issuer_public_key.sql` | D1 column |
| `worker/src/resolver/revoke.ts` | Accept organizer signer + reason |
| `worker/src/resolver/create-card.ts` | Validate `issuer_public_key` on create |
| `site/organizer-revoke/` | Coalition revoke UI |
| `site/create/` | Optional organizer key at create |
