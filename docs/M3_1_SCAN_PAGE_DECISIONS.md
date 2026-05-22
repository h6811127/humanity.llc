# M3.1 public scan page — implementation decisions

**Status:** Record of choices for `GET /c/{profile_id}?q={qr_id}` and related owner UX  
**Roadmap:** `docs/V1_0_ARCHITECTURE_ROADMAP.md` step 3.1 (done); 3.2–3.7 follow

---

## Scope of 3.1

Ship a **mobile-readable HTML** scan page from the reference Worker. JSON status parity (3.4), cache fine-tuning (3.6), and full trust-copy audit (3.2) are **later steps** on the same route.

---

## Route and parameters

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Canonical scan URL | `https://humanity.llc/c/{profile_id}?q={qr_id}` | Technical Standards + phone-camera HTTPS fallback |
| `q` required | Yes; missing/invalid → “Invalid scan link” (400) | QR payloads always include `qr_id`; avoids ambiguous card-only scans on `/c/` |
| `profile_id` format | Base58, 20–32 chars (`PROFILE_ID_REGEX`) | Matches create + crypto validation |
| `qr_id` format | `qr_` + base58 (`QR_ID_REGEX`) | Matches client `generateQrId()` |

---

## Response format (3.1)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Default representation | **HTML only** on `/c/` | 3.1 exit criteria; JSON deferred to 3.4 |
| Styling | Inline CSS in Worker response | Scan page must work when only Worker is deployed; no dependency on Pages `styles.css` |
| Trust blocks on page | Card, Human trust, QR credential, Limits (incl. bearer warning) | Roadmap §7 + `V1_PRODUCT_TRUST_MODEL.md`; needed for “under 5 seconds” comprehension, not a blank stub |

---

## HTTP status codes

| Situation | Status | Body |
|-----------|--------|------|
| Active / revoked / suspended / expired (known card+QR) | **200** | Honest status HTML (not silent 404) |
| Unknown `profile_id` | **404** | “Card not found” |
| Unknown `qr_id` (card exists) | **404** | “QR not found” |
| `profile_id` ↔ `qr_id` mismatch | **400** | “Mismatch” (no card details leaked) |
| Malformed ids or missing `q` | **400** | “Invalid scan link” |

Revoked states return **200** so scanners see **revoked**, not a broken link (QR Public Profile FR-24).

---

## Cache-Control (initial; 3.6 may refine)

| State | Header |
|-------|--------|
| Active | `public, max-age=300, stale-while-revalidate=60` |
| Revoked / unknown / negative | `public, max-age=60` |

---

## Bearer warning

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Shown when | **All** scan outcomes in 3.1, including unknown links | Trust model Level 0 copy; 3.3 may narrow emphasis for `print_artifact` scope |

Required copy (paraphrased): QR resolves to a card; does **not** prove the holder owns the item.

---

## Owner `/created/` page and URL parameters

### Is `profile_id` (and `qr_id`) in the URL OK for privacy/security?

**Yes, for this protocol**, with caveats documented here:

| Property | Assessment |
|----------|------------|
| Secrecy | `profile_id` and `qr_id` are **public opaque identifiers**, not secrets. They appear in printed QR URLs and resolver logs by design. |
| PII | They are **not** legal name, email, or government ID. Handle/manifesto are public card fields, not put in the query string. |
| Recovery | URL params let the owner **bookmark or share** the post-create view if `sessionStorage` is cleared (private mode, different device, tab closed). |
| What must never be in the URL | Private keys, recovery secrets, session tokens, email, legal ID. Create flow does not put these in the URL. |

**`sessionStorage`** (`hc_created`) holds the POST response plus **manifesto** (client-added); it is **same-origin, tab-scoped**, and cleared when the user clears site data. It is not sent to the resolver on page load.

**Redirect after create:** `/created/?profile_id=…&qr_id=…` (both params required for URL-only recovery).

### QR image on `/created/`

| Decision | Choice | Rationale |
|----------|--------|-----------|
| QR generation | **Client-side** (`site/js/qr-render.mjs` + `qrcode` via esm.sh) | Avoids sending scan URL to third-party QR APIs (privacy + reliability) |
| Previous approach | `api.qrserver.com` | Removed — leaks full scan URL to a third party; often blocked |

### “View public card JSON”

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Target | `GET /.well-known/hc/v1/cards/{profile_id}` on **resolver** (Worker) | Contract in `V1_IMPLEMENTATION_CONTRACTS.md` |
| Requires | Worker route deployed on `humanity.llc` | **Not** a future feature; broken if only Pages is deployed or `profile_id` missing from page state |
| Local dev | Points to `http://127.0.0.1:8787` when host is localhost | Same as create API base |

---

## Files (implementation)

| Path | Role |
|------|------|
| `worker/src/db/scan.ts` | D1 load for scan |
| `worker/src/resolver/scan-state.ts` | View-model / effective status |
| `worker/src/resolver/scan-html.ts` | HTML template |
| `worker/src/resolver/scan.ts` | Handler |
| `worker/src/index.ts` | `/c/*` route |
| `site/js/created.mjs` | Post-create page logic |
| `site/js/qr-render.mjs` | Client QR PNG |
| `site/js/create-card.mjs` | Redirect + richer `sessionStorage` |

---

## Explicitly deferred (not bugs)

| Item | Milestone |
|------|-----------|
| JSON scan/status matching HTML | 3.4 |
| `Accept: application/json` on `/c/` | 3.4 |
| Live control block on scan page | M7 |
| Vouches on scan page | M6 |
| Revoke UI | M4 |
| Owner dashboard beyond `/created/` | Later |
