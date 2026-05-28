# Delegated child capability — document schema (step 17, docs-only)

**Status:** **Draft RFC** — no resolver routes, wallet storage, or steward UI until [`DELEGATED_CHILD_CAPABILITIES_GATE.md`](DELEGATED_CHILD_CAPABILITIES_GATE.md) **G1–G5** pass.

**Canonical rules:** [`Technical Standards v1.0.md`](Technical%20Standards%20v1.0.md) §7A.1 · [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) § Delegated child capabilities (future).

---

## Design constraints

| Rule | Requirement |
|------|-------------|
| **Root-signed** | Capability document MUST be signed by root owner or recovery key at issuance; delegated signer is a **derived** Ed25519 keypair, not a second human identity |
| **Scoped** | Exactly one pilot operation class per document (see § Allowed operations) |
| **Expiring** | `expires_at` required; resolver MUST reject stale capabilities |
| **Revocable** | Root can revoke capability without disabling root card or sibling objects |
| **No human trust** | MUST NOT authorize vouch, verification changes, root disable, or scan analytics |
| **No wallet default** | Delegated keys MUST NOT appear as saved `hc_wallet` root cards |

---

## Capability document (target shape)

Root-signed issuance record stored on the resolver (or referenced by id). The delegated **signer** uses a separate keypair whose public key is named in the document.

```json
{
  "version": "1.0",
  "capability_id": "cap_opaque-id",
  "parent_profile_id": "base58-root-profile-id",
  "delegated_public_key": "base58-ed25519-public-key",
  "operations": ["child_object.update"],
  "scope": {
    "object_ids": ["obj_door_1"],
    "print_artifact_ids": []
  },
  "label": "Volunteer — front door sign",
  "expires_at": "2026-06-01T06:00:00Z",
  "status": "active",
  "created_at": "2026-05-28T18:00:00Z",
  "signature": {
    "alg": "Ed25519",
    "public_key": "root-owner-public-key",
    "signature": "base58-signature",
    "signed_at": "2026-05-28T18:00:00Z",
    "canonicalization": "JCS"
  }
}
```

### Field notes

| Field | Notes |
|-------|--------|
| `capability_id` | Opaque id; primary key if persisted |
| `delegated_public_key` | Public half of limited signer; **never** stored as a root Humanity Card |
| `operations` | Non-empty subset of § Allowed operations |
| `scope.object_ids` | Bounded list (pilot max TBD; start with **1** for event volunteer template) |
| `scope.print_artifact_ids` | Optional; for shop replace-QR template |
| `label` | Steward-facing description only; not shown on scan as human trust |
| `expires_at` | ISO-8601 UTC; hard stop for delegated acceptance |
| `status` | `active` \| `revoked` — root-signed revoke updates status without deleting audit row |

---

## Allowed operations (first slice)

Operations apply only within `scope` and before `expires_at`.

| Operation | Child-object route | Notes |
|-----------|-------------------|--------|
| `child_object.update` | `POST …/objects/{object_id}/update` | Public label/state only |
| `child_object.issue_qr` | `POST …/objects/{object_id}/issue-qr` | One active QR per object policy unchanged |
| `child_object.revoke_qr` | Existing QR revoke path for scoped `qr_id` | Does not disable root card |
| `child_object.revoke` | `POST …/objects/{object_id}/revoke` | Disable scoped object only |
| `print_artifact.issue_qr` | Print-artifact mint when `print_artifact_id` in scope | Shop employee template |

**Explicitly forbidden** on delegated signers (resolver MUST reject):

- `card.update`, `card.revoke`, root QR rotate/disable
- `vouch.*`, verification summary changes
- Any scan logging or analytics fields
- Delegation of delegation (no `capability.grant`)

---

## Resolver verification (when gates pass)

Before accepting a child-object mutation signed by `delegated_public_key`:

1. Load active capability row for `(parent_profile_id, delegated_public_key)`.
2. Verify `status === active` and `now < expires_at`.
3. Verify requested route maps to an entry in `operations`.
4. Verify target `object_id` / `print_artifact_id` is in `scope`.
5. Verify payload signature with **delegated** public key (not root key).
6. Reject if root card is disabled/suspended (cascade unchanged).

Root owner or recovery key continues to work on all child routes without a capability row.

---

## Steward UI (when gates pass)

| Surface | Allowed |
|---------|---------|
| `/created/` **Manage** | Issue / revoke delegation for scoped object; show expiry + label |
| `/created/` **Live** | No delegation issuance |
| `/create/`, scan pages | **Never** |
| Hub / **My cards** | Show optional “Delegated access active” on child row — no trust shield |

Copy pattern: **“Limited signer · expires {date}”** — not Steward / Vouched Human.

---

## D1 sketch (not migrated)

```sql
-- Draft only — do not apply until G1–G5 pass.
CREATE TABLE delegated_capabilities (
  capability_id TEXT PRIMARY KEY NOT NULL,
  parent_profile_id TEXT NOT NULL REFERENCES cards (profile_id),
  delegated_public_key TEXT NOT NULL,
  operations_json TEXT NOT NULL,
  scope_json TEXT NOT NULL,
  label TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  capability_document_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## Test plan (when gates pass)

| Case | Expect |
|------|--------|
| Scoped update succeeds | Volunteer updates one `object_id` before expiry |
| Out-of-scope object | 403 |
| Expired capability | 403 |
| Root revoke capability | Delegated signer rejected immediately; root still works |
| Delegated vouch attempt | 403, no side effects |
| Escalation to root revoke | 403 |

Vitest: `worker/tests/delegated-child-capability.test.ts` (add when implementation starts).

---

## Related docs

- [`DELEGATED_CHILD_CAPABILITIES_GATE.md`](DELEGATED_CHILD_CAPABILITIES_GATE.md) — product gates G1–G5
- [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) — step 17 in implementation sequence
- [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) — G4 anti-surveillance review
