# M4.2  -  Owner revoke on `/created/`

**Status:** Implementation contract (Phase A)  
**API:** `POST /.well-known/hc/v1/cards/{profile_id}/revoke` (`worker/src/resolver/revoke.ts`)  
**Trust:** `docs/V1_PRODUCT_TRUST_MODEL.md` Level 0–1  
**Product vocabulary & roadmap:** `docs/REVOKE_AND_LIFECYCLE_V1.md` (Revoke QR vs Disable card, privacy modes, planned UI)

---

## Product rules

1. **Private key never leaves the browser** except as a signed `revocation` document POSTed to the resolver.
2. **Session-only key storage**  -  at create, `create-card.mjs` stores `owner_private_key_b58` in `sessionStorage` (`hc_created`). Closing the tab clears it. No localStorage, no server upload.
3. **Revoke requires signing material**  -  session key, encrypted backup import, or recovery key on `/created/` (`docs/M5_5_OWNER_KEY_PORTABILITY.md`). Opening `/created/?profile_id=…&qr_id=…` without any of these shows read-only copy; owner actions stay hidden.
4. **Two owner actions** (per Standards §10 + item-scoped QR):
   - **Revoke this scan QR**  -  `target_kind: qr_credential`, `target_qr_id` = credential id. UI label stays **Revoke this QR**.
   - **Disable card** (API: `target_kind: card`)  -  UI label **Disable card** per `REVOKE_AND_LIFECYCLE_V1.md`.
5. **Confirm before submit**  -  checkbox + disabled button until checked (no accidental tap).
6. **Live status**  -  on load, `GET …/status?q=` shows resolver truth; after revoke, user can open scan URL to verify.

---

## Files

| Path | Role |
|------|------|
| `site/created/index.html` | Owner controls section |
| `site/js/created-revoke.mjs` | Sign + POST + UI state |
| `site/js/created.mjs` | Wires session + revoke init |
| `site/js/hc-sign.mjs` | `signRevocation`, URLs, `BEARER_WARNING` |
| `site/js/create-card.mjs` | Persists owner keys in `hc_created` |

---

## Exit test (manual)

1. Create card on `/create/` → land on `/created/`.
2. Resolver status shows **active**.
3. Check “Revoke this scan QR”, submit → `200`, status `qr_revoked`, scan page shows revoked QR (card still active if only QR revoked).
4. New card → revoke entire card → public JSON `410`, scan `card_revoked`.
5. Reload `/created/` without session → revoke section explains keys are unavailable.

---

## Not in scope (Phase A / M4)

- QR rotation UI (A.6) — shipped
- Post-create QR expiry extension (M4.6b) — shipped
- Revoke from scan page (owner must use `/created/`)

## Follow-up: revoke from any device (M5.5)

Session-only keys are intentional for Phase A. **Encrypted export/import** and optional **recovery key** are specified in `docs/M5_5_OWNER_KEY_PORTABILITY.md` so owners can revoke after closing the tab or from another device.

## Lifecycle UX (M4.5 + M4.6)

**Product frame:** `/created/#revoke-rules` is titled **Object lifecycle**  -  revoke is one state transition, not “delete the QR.” See `docs/REVOKE_AND_LIFECYCLE_V1.md` § State transitions.

| Feature | Status |
|---------|--------|
| Minimal scan (QR revoked, card disabled, QR expired) | Shipped  -  `pass-v10` |
| **Show link** on scan pages | Shipped |
| **Disable card** + **Revoke this QR** labels and ID warnings | Shipped |
| **Revoke rules** explainer (`/created/#revoke-rules`) | Shipped |
| Validity at create (7 / 30 / 90 / 365 days) | Shipped  -  M4.6 |

Optional privacy modes (`display_mode`), revoke-on-next-scan: `docs/REVOKE_AND_LIFECYCLE_V1.md`  -  not shipped.
