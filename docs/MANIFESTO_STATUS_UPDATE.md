# Manifesto / status line updates (post-create)

**Status:** Active  -  current Phase A product focus  
**Parent:** `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md` (status plate, lost-item relay)  
**Skipped for now:** M5 stranger gate batch, M7 Step 2 polish (see `docs/M3_M4_EXECUTION_PLAN.md`)

---

## Problem

Create locks the first public line at issuance. **Status plates** and **lost-item relays** need the printed QR to stay the same while **network copy changes** (open/closed, return message, corrections).

That is the gap between **revocable** (pull trust back) and **live** (current truth at scan time).

---

## Product rule

> Same physical QR · new signed public line on the resolver.

- **Immutable:** `profile_id`, owner `public_key`, `handle`, `created_at`
- **Mutable:** `manifesto_line`, `updated_at`, full signed `humanity_card` document stored in D1
- **Not mutable via this API:** QR credentials, verification, badges, organizer key

---

## API

| Endpoint | Method | Auth | Body |
|----------|--------|------|------|
| `/.well-known/hc/v1/cards/{profile_id}/update` | POST | Owner or recovery key | `{ "card": <signed humanity_card> }` |

**Validation:**

- Signature verifies (`type: humanity_card`, protocol `1.0`)
- `updated_at` strictly newer than stored card
- `manifesto_line` 1–280 chars, plain text (`worker/src/validation/manifesto.ts`)
- Card `status` must be `active` (revoked/suspended → `410`)

**Response (200):**

```json
{
  "profile_id": "...",
  "manifesto_line": "...",
  "updated_at": "...",
  "status": "active"
}
```

Scans and `GET …/cards/{id}` read the updated document on next fetch (active cache ~5 min per Technical Standards §9.3).

---

## Storage formats (pilots)

Same as create  -  one `manifesto_line` field, layout parsed at scan time (`worker/src/resolver/manifesto-display.ts`):

| Pilot | Format | Example line 1 · line 2 |
|-------|--------|-------------------------|
| **Status plate** | Two lines | `Studio door` · `Closed until Monday` |
| **Lost item relay** | `[relay]` prefix | `[relay] Keys` · `Found  -  thank you` |
| **General card** | One line (or two treated as plate if newline) | Single public statement |

---

## Owner UI (`/created/`)

1. Section **Update public line** (same QR  -  new manifesto on the network).
2. Fields match pilot template (status plate / relay / general).
3. Requires owner or recovery key (session, backup import, or recovery unlock).
4. Success: *Updated. Next scan shows the new line.*

Deep link: `/created/?profile_id=…&qr_id=…`  -  hydrates handle/manifesto from network when session is empty; infers pilot layout from stored `manifesto_line`.

---

## Exit checklist

| Step | Pass? |
|------|-------|
| Owner updates status plate line 2; second device scan shows new text | ☐ |
| Owner updates lost-item return message without reprint | ☐ |
| Revoked card cannot update (`410`) | ☐ |
| Wrong key cannot update (`401`) | ☐ |
| `updated_at` replay rejected (`422`) | ☐ |
| Scan cache: new line visible within active TTL (~5 min) or hard refresh | ☐ |

---

## Not in v1

- Signed `card_update` payload type separate from full `humanity_card` (optional future)
- Organizer-signed manifesto edits
- Calendar / geofence auto status
- Edit handle or rotate owner key via update

---

## Related

| Path | Role |
|------|------|
| `worker/src/resolver/update-card.ts` | POST handler |
| `site/js/created-manifesto-update.mjs` | Owner form |
| `site/js/created-update.mjs` | Sign + POST |
| `worker/src/resolver/extend-qr.ts` | QR expiry extension (M4.6b) |
| `worker/src/resolver/rotate-qr.ts` | QR rotation (A.6) |
| `docs/STATUS_PLATE_PILOT.md` | Vertical #1 |
| `docs/LOST_ITEM_RELAY_PILOT.md` | Vertical #2 |
