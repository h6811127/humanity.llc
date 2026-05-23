# M4.2 — Owner revoke on `/created/`

**Status:** Implementation contract (Phase A)  
**API:** `POST /.well-known/hc/v1/cards/{profile_id}/revoke` (`worker/src/resolver/revoke.ts`)  
**Trust:** `docs/V1_PRODUCT_TRUST_MODEL.md` Level 0–1  

---

## Product rules

1. **Private key never leaves the browser** except as a signed `revocation` document POSTed to the resolver.
2. **Session-only key storage** — at create, `create-card.mjs` stores `owner_private_key_b58` in `sessionStorage` (`hc_created`). Closing the tab clears it. No localStorage, no server upload.
3. **Revoke requires the create session** — opening `/created/?profile_id=…&qr_id=…` without that session shows read-only copy; revoke buttons stay hidden.
4. **Two owner actions** (per Standards §10 + item-scoped QR):
   - **Revoke this scan QR** — `target_kind: qr_credential`, `target_qr_id` = card’s active QR.
   - **Revoke entire card** — `target_kind: card` (also revokes active QRs in D1).
5. **Confirm before submit** — checkbox + disabled button until checked (no accidental tap).
6. **Live status** — on load, `GET …/status?q=` shows resolver truth; after revoke, user can open scan URL to verify.

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

## Not in scope (v1)

- Key export / recovery / second device revoke
- QR rotation UI (M7)
- Revoke from scan page (owner must use `/created/`)
