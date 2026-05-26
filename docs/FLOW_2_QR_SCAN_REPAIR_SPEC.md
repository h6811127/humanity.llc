# Flow 2 — Public QR Scan repair spec

**Date:** 2026-05-25  
**Status:** Repair backlog (read-only audit complete)  
**Scope:** `docs/V1_FLOW_AUDIT.md` Flow 2 + `docs/V1_IMPLEMENTATION_CONTRACTS.md` § API (Network + Public Shortcut)  
**Out of scope:** Storefront, Printify, ceremony credentials, device hub, `/created/` owner UX

---

## Source of truth

| Doc | Use for |
|-----|---------|
| `docs/V1_FLOW_AUDIT.md` | Flow 2 steps, required failure states, cross-boundary table |
| `docs/V1_IMPLEMENTATION_CONTRACTS.md` | API routes, QR/card contracts, error codes, acceptance tests |
| `docs/SCANNER_EXPERIENCE.md` | Scanner product spec (safety, recognition, external-link policy) |
| `docs/M3_SCAN_PAGE_UI.md` | Scan HTML layout, QR payload rules, status JSON parity |
| `docs/V1_PRODUCT_TRUST_MODEL.md` | Bearer warning, trust block separation |
| `docs/Technical Standards v1.0.md` | Cache-Control, profile_id length, scan logging policy |

**Code map (implementation):**

| Layer | Paths |
|-------|--------|
| Routes | `worker/src/index.ts` |
| Scan HTML | `worker/src/resolver/scan.ts`, `scan-html.ts`, `scan-state.ts`, `scan-status.ts`, `scan-qr.ts` |
| DB load | `worker/src/db/scan.ts` |
| Card GET | `worker/src/resolver/create-card.ts` (`handleGetCard`) |
| Site (QR encode only) | `site/js/hc-sign.mjs`, `site/js/qr-render.mjs` |

**Note:** Static UI is under `site/` (Pages). Public scan is **Worker-only** (`GET /c/…`), not Pages.

**HTML contract for `/c/…`:** [`docs/M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md) (layout, QR payload, status JSON parity, deploy). **Shipped vs deferred routes:** [`docs/V1_IMPLEMENTATION_CONTRACTS.md`](V1_IMPLEMENTATION_CONTRACTS.md) § Reference network — Flow 2 routes.

---

## Public scan surfaces (integrators)

Use the right endpoint for the job. Do not treat `GET …/cards/{id}` as a scan page or `GET /c/…` as the signed card document.

| Surface | Route | Response | When to use |
|---------|-------|----------|-------------|
| **Trust UI (humans)** | `GET /c/{profile_id}?q={qr_id}` | HTML pass + grouped trust lists (`X-HC-Scan-UI`) | Phone-camera QR; strangers; acceptance demos |
| **Signed card document** | `GET /.well-known/hc/v1/cards/{profile_id}` | `application/json` by default; `Accept: text/html` returns JSON in `<pre>` (not a scan layout) | Integrators verifying or caching the signed card payload |
| **Scan state (machines)** | `GET /.well-known/hc/v1/cards/{profile_id}/status?q={qr_id}` | JSON: `scan.kind`, card/human/QR/live blocks; same resolver truth as `/c/…` | Device hub poll, curl checks, automation with `profile_id` |
| **QR credential metadata** | `GET /.well-known/hc/v1/qr/{qr_id}` | JSON credential fields only; 404 if unknown | Lookup when only `qr_id` is known (shipped; see `qr-metadata.ts`) |

**UI shape:** Production scan is a **flat status panel** with grouped trust blocks below (see M3). There is no “flippable pass” product mode on `/c/…`; pass-card front/back in M3 refers to visual layout on one page, not a separate Pages route.

**Deferred (documented, not scan substitutes):** `GET /v1/verification/status/{profile_id}`, `POST …/export`, anonymized scan access log (Slice 5 — product decision pending). See mismatch table F2-5, F2-10, F2-1.

---

## What works today

| Step / contract | Evidence |
|-----------------|----------|
| HTTPS shortcut `GET /c/{profile_id}?q={qr_id}` | Routed; trust UI + `X-HC-Scan-UI` header |
| Malformed / unknown profile / unknown QR / mismatch | `scan-state.ts` kinds + HTML; HTTP 400/404 |
| Revoked / suspended / expired card; revoked / expired / replaced QR | Kinds + minimal layouts; tests in `worker/tests/scan.test.ts` |
| Bearer warning (Level 0) | `trust-copy.ts` on all scan HTML via `renderBearerLine()` |
| `print_artifact` scope copy | QR group row in `scan-html.ts` |
| Machine-readable twin with `?q=` | `GET …/cards/{id}/status?q=…` aligns with HTML (`scan-status.ts`) |
| No scan analytics on page | `scan.limits.scan_analytics: false` in status JSON |
| Live control display on scan (optional) | `?live_challenge=` + recent proof TTL (`scan.ts`) |
| Active scan trust separation | Tests: card / human trust / QR / live control blocks |

---

## Broken or missing (from audit)

| ID | Gap | Contract / audit reference |
|----|-----|---------------------------|
| F2-1 | ✅ Resolved (v1): no scan access log — audit + data policy aligned (Slice 5 option B) |
| F2-2 | ✅ Fixed: scan HTML shows offline banner when `navigator.onLine === false` (`scan-offline.ts`, `scan-offline-banner`). |
| F2-3 | ✅ Fixed: suspended scan HTML + status JSON include links to data policy and architecture (`scan-governance.ts`). |
| F2-4 | ✅ Fixed: `GET /.well-known/hc/v1/qr/{qr_id}` returns contract-shaped QR metadata (`qr-metadata.ts`). |
| F2-5 | `GET /v1/verification/status/{profile_id}` not implemented | § API Verification table |
| F2-6 | Card GET HTML is raw JSON `<pre>`, not public card view | § API: “HTML or JSON public card” |
| F2-7 | Revoked card: GET card returns JSON 410; scan returns HTML 410 | Integrators vs humans split (document or align) |
| F2-8 | ✅ Fixed: status JSON adds optional `scan.error` contract code alongside `scan.kind` (`scan-contract-error.ts`) |
| F2-9 | ✅ Fixed: minimal failure scans show compact Card status + This QR groups; human trust hidden (`scanLayoutForMinimalFailureTrust`) |
| F2-10 | `POST …/export` not routed | § API (defer unless export needed for scan) |

---

## Repair slices (ordered)

### Slice 1 — Contract clarity (no behavior change) ✅

**Goal:** Stop AI and integrators from guessing wrong endpoints.

- [x] Cross-links: this spec ↔ `M3_SCAN_PAGE_UI.md` (HTML contract) ↔ `V1_IMPLEMENTATION_CONTRACTS.md` (shipped vs deferred).
- [x] Document intentional split in § Public scan surfaces (integrators) above.
- [x] `GET …/qr/{qr_id}` **shipped** (Slice 4); listed in contracts § Reference network — Flow 2 routes (not deferred).

**Done when:** Contract doc lists which routes are shipped vs deferred; no contradictory “flippable pass” copy in feature page vs flat scan UI (`site/features/scan-ui.html` subline + design decisions aligned).

---

### Slice 2 — Suspension + governance links (P0 UX) ✅

**Goal:** Meet required failure state for suspended scans.

- [x] On `card_suspended` scan HTML + status JSON, add link(s) to published process (e.g. `/data-policy.html`, governance anchor in standards).
- [x] Copy audit: “suspended under published rules” → include clickable “published rules” / process.

**Files:** `worker/src/resolver/scan-html.ts`, `scan-status.ts`, `scan-governance.ts` (`scan.governance` field).

**Done when:** Stranger-test checklist item for suspended card includes visible process link; `worker/tests/scan.test.ts` asserts link href.

---

### Slice 3 — Stale / offline disclosure (P0 trust) ✅

**Goal:** Meet Flow 2 step 4 and acceptance test without false “active” claims offline.

- [x] Client-side: on scan page load, if `navigator.onLine === false`, show banner: “Offline — status may be stale; refresh when connected.”
- [x] Optional: CDN cache nuance deferred — Worker HTML already uses shorter cache on inactive scans (`max-age=60`).
- [x] Align `site/features/scan-ui.html` “future” bullet with shipped behavior.

**Files:** `worker/src/resolver/scan-html.ts`, `scan-offline.ts`, `site/scan-pass.css` (bundle via `npm run worker:bundle-scan`), tests in `scan.test.ts`.

**Done when:** Manual: DevTools offline → scan page shows banner; test asserts banner string when `onLine` mocked false.

---

### Slice 4 — `GET …/qr/{qr_id}` (P1 API) ✅

**Goal:** QR metadata without requiring profile_id in path.

- [x] Route in `worker/src/index.ts`.
- [x] Handler: load `qr_credentials` by id; return credential JSON; 404 if missing; no PII beyond contract fields.
- [x] Do **not** log scan analytics unless Slice 5 defines anonymized log.

**Files:** `worker/src/resolver/qr-metadata.ts`, `worker/src/db/qr-metadata.ts`, `worker/tests/qr-metadata.test.ts`.

**Done when:** `curl GET …/qr/{qr_id}` returns contract-shaped JSON; Vitest covers active/revoked/unknown.

---

### Slice 5 — Anonymized scan access log (P1 policy) ✅

**Goal:** Reconcile Flow 2 step 2 with “no scan analytics by default.”

**Decision (data policy):** **B** — no access log in v1. [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) forbids scan analytics and defaults to no scan request logging; governance approval would be required before option A.

- [x] `V1_FLOW_AUDIT.md` Flow 2 validate step: persisted record = none (v1).
- [x] `REFERENCE_OPERATOR_DATA_POLICY.md` + contracts table: reference network does not access-log scan routes.
- [x] No `scan_access_log` migration or handler instrumentation.

**Done when:** Policy doc + code match; health/docs do not claim logging that does not exist.

---

### Slice 6 — Status JSON error codes (P2 integrators) ✅

**Goal:** Optional `error` field for machine clients without breaking `scan.kind`.

- [x] Map `scan.kind` → contract codes (`CARD_SUSPENDED`, `QR_REVOKED`, …) in `scan-contract-error.ts` + `scan-status.ts`.
- [x] Keep `scan.kind` for backward compatibility.

**Done when:** `scan-status.test.ts` asserts code mapping for revoked/suspended/expired.

---

### Slice 7 — Minimal layouts vs trust separation (P2) ✅

**Goal:** Acceptance test parity on failure states.

- [x] For `qr_revoked` / `qr_expired` / `card_revoked` (minimal): compact **Card status** + **This QR** groups + bearer line; human trust and live control hidden.
- [x] Tombstone revocation display unchanged (richer status panel, no artifact group).

**Done when:** Product sign-off + tests updated consistently.

**Files:** `revocation-display.ts`, `scan-state.ts`, `worker/tests/scan.test.ts`, `worker/tests/revocation-display.test.ts`.

---

## Done when (Flow 2 overall)

- [x] All **P0** slices (2–3) shipped; Slice 1 contract clarity shipped.
- [ ] `npm run worker:test` green; stranger runbook scan section passes on production.
- [ ] `curl` checks in `docs/M5_STRANGER_TEST_RUNBOOK.md` still valid for `scan.kind` paths.
- [ ] No regression: bearer warning on every scan HTML; `scan_analytics: false` in status JSON.

---

## Test plan (per slice)

```bash
npm run worker:test -- worker/tests/scan.test.ts worker/tests/scan-status.test.ts
# After route add:
npm run worker:test -- worker/tests/qr-metadata.test.ts  # new
```

Manual:

1. Active card: phone scan `/c/{profile_id}?q={qr_id}` → trust blocks + bearer.
2. Revoke card → rescan → 410 HTML + revoked copy (not generic crash).
3. Suspend (fixture/seed) → process link visible.
4. Offline (browser) → stale banner on scan page.

---

## AI repair prompts (copy-paste)

**Slice 2 example:**

> Implement F2-3 from `docs/FLOW_2_QR_SCAN_REPAIR_SPEC.md` only. Add governance/process links to suspended scan HTML and status JSON. Extend `worker/tests/scan.test.ts`. Do not change unrelated routes.

**Slice 3 example:**

> Implement F2-2 only. Add offline/stale banner to `scan-html.ts` when `navigator.onLine` is false. Test with mocked offline. Do not add scan logging.

---

## Related next audits

- **Device hub (Phase 10):** owner-side network sync, false “card disabled” notices — see production homepage with saved cards.
- **M6 vouching:** return-to-scan flow (`hc_vouch_return_url`, `/created/?intent=vouch`).
- **Flow 4 artifact intent:** after QR resolution stable.
