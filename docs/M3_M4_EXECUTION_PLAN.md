# M3 finish + M4 revoke — careful execution plan

**Status:** Working checklist (Phase A MVP)  
**Canonical milestones:** `docs/V1_0_ARCHITECTURE_ROADMAP.md` §12–13, steps M3.3–M4.4  
**Contracts:** `docs/V1_IMPLEMENTATION_CONTRACTS.md`, `docs/Technical Standards v1.0.md` §9–10  
**Scan UI:** `docs/M3_SCAN_PAGE_UI.md`  
**Trust copy:** `docs/V1_PRODUCT_TRUST_MODEL.md` §7  

**Operating rule (from backlog):** Finish the vertical slice `create → scan → revoke` before commerce, mesh hardware, or Commons Pass.

---

## Where we are

| Area | State |
|------|--------|
| M1–M2 | Health, D1, create card, `/create/`, `/created/` |
| M3.1–M3.2 | Scan HTML: pass card + trust lists (`pass-v4`, `M3_SCAN_PAGE_UI.md`) |
| M3.3–M3.7 | **This plan** |
| M4 | Revoke API + owner flow (after M3 tail) |
| M5 | Three stranger tests + public announce |

**Deploy reminder:** Scan HTML is Worker-only (`npm run worker:deploy`). Pages deploy does not change `/c/…`.

---

## M3 remainder (finish scan milestone)

Do these **in order**. Each step has an exit test before moving on.

### 3.3 — Bearer warning (mobile audit)

**Refs:** `V1_PRODUCT_TRUST_MODEL.md` Level 0–1; roadmap Flow audit §2  

**Requirement:** Printed-item / card QR scans show bearer copy without scrolling on common phones.

**Exit:**
- [x] Above-fold `scan-bearer-banner` + card foot use canonical copy (`trust-copy.ts`)
- [ ] iPhone Safari: bearer visible on first screen after redeploy
- [x] Copy matches: *This QR resolves to a Humanity Card. It does not prove the person holding this item is the card owner.*

**Note:** Full Level 0 bearer copy appears **once** (`scan-bearer-banner`). Card foot and list rows use shorter lines only.

---

### 3.4 — Machine-readable status JSON

**Refs:** `V1_IMPLEMENTATION_CONTRACTS.md` · `GET /.well-known/hc/v1/cards/{profile_id}/status`  
**Standards:** §9.1, §9.3 cache, §9.5 status codes  

**Implement:**
- `GET /.well-known/hc/v1/cards/{profile_id}/status`
- Optional `?q={qr_id}` — when present, status **matches** `/c/{profile_id}?q={qr_id}` HTML (`buildScanViewModel`)
- Without `?q`, card-level status only (handle, card status, verification summary)

**Exit:**
- [x] Implemented in repo (`worker/src/resolver/scan-status.ts`, route in `index.ts`)
- [x] `curl` JSON for active card+QR matches scan `kind` and statuses
- [x] Unknown profile → 404 JSON (`scan-status.test.ts`)
- [x] Card revoked → 410 JSON (Standards §9.5)
- [x] QR revoked → 200 JSON with `kind: qr_revoked`
- [x] `Cache-Control` on response matches scan/HTML policy (`CACHE_*` in tests)

---

### 3.5 — Unknown / malformed scan pages

**Refs:** roadmap R-002; contracts “no blank 404”  

**Requirement:** Malformed `/c/…` and unknown profile/QR render **designed** HTML (already partially in `scan-html.ts`).

**Exit:**
- [x] Bad profile id → 400 HTML, readable message (`scan.ts`)
- [x] Missing or bad `?q=` → 400 HTML
- [x] Unknown profile / unknown QR → 404 HTML (not empty Worker error)

**Note:** Mostly verification + copy pass; implement gaps only if tests fail.

---

### 3.6 — Cache-Control alignment

**Refs:** Technical Standards §9.3  

| State | Target |
|-------|--------|
| Active scan/HTML/JSON | `public, max-age=300, stale-while-revalidate=3600` |
| Revoked / suspended / expired / unknown | `public, max-age=60` |

**Exit:**
- [ ] After revoke (once M4 deployed), CDN/cache test shows update within 60s
- [x] HTML and JSON use `CACHE_ACTIVE` / `CACHE_INACTIVE` (`scan-state.ts`)

---

### 3.7 — Stranger path on scan page

**Refs:** roadmap A.8  

**Requirement:** Scan footer: Create CTA (unknown/malformed), data policy link, public card JSON when active.

**Exit:**
- [x] Active scan links to `/.well-known/hc/v1/cards/{id}` JSON (`scan-html.ts` footer)
- [x] Data policy linked from limits group and card back

**Note:** Mostly done; verify in production after Worker deploy.

---

## M4 — Revoke (Phase A core)

**Refs:** Technical Standards §10; contracts `POST …/revoke`; fixtures `worker/tests/fixtures/revocation.json`

### 4.1 — Owner-signed revoke API

**Payload:** `type: revocation`, fields per `PAYLOAD_FIELD_RULES` in `worker/src/crypto/signed-payload.ts`

**Targets:**
- Whole card (`target_kind: card` or equivalent per fixture)
- Single QR (`target_kind: qr_credential`, `target_qr_id`)

**Exit:**
- [x] POST revoke updates `cards.status` or `qr_credentials.status` (`db/revoke.ts`)
- [x] Append row to `revocations`
- [x] Invalid signature → 401; wrong key → 401 (`resolver/revoke.ts`)

### 4.2 — Revoked scan + JSON

**Exit:**
- [x] Scan HTML shows revoked state (card / QR) — `scan.test.ts`
- [x] Status JSON `kind` matches HTML — `scan-status.test.ts`
- [x] Card JSON `GET …/cards/{id}` → 410 when revoked (Standards §10.2)
- [x] Owner revoke UI on `/created/` (`docs/M4_CREATED_REVOKE_UI.md`, `site/js/created-revoke.mjs`)

### 4.3 — Item-scoped revoke

**Exit:**
- [x] Revoke one QR; sibling QR on same card stays active (view-model tests)
- [ ] End-to-end on production D1 with two QRs on one card

### 4.4 — Block intents on revoked QR (stub)

**Exit:**
- [ ] Revoked QR returns 403 on print intent endpoint (stub OK pre-commerce)

---

## M5 — Launch gate (after M4)

**Refs:** roadmap §12 Phase A exit; **`docs/M5_STRANGER_TEST_RUNBOOK.md`** (step-by-step)

- [ ] 3 people outside your network create cards unassisted
- [ ] Each explains what scan proves / does not prove in one sentence
- [ ] Revoke one QR; scan shows revoked within cache TTL
- [ ] No scan analytics in production paths
- [ ] Update landing “Building now” + short public announce

---

## What we are **not** doing in this track

- NFC / Bluetooth mesh implementation — research page only (`site/research-directions.html`)
- **Owner key export / recovery** (revoke from any device) — **M5.5** (`docs/M5_5_OWNER_KEY_PORTABILITY.md`)
- Vouches (M6), live control (M7), merch (M8)
- Commons Pass (M10+)

---

## Current step

**→ M5** — run `docs/M5_STRANGER_TEST_RUNBOOK.md` (three strangers). Code path for create → scan → revoke is in place; remaining gate is **human** validation.
