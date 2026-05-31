# Vouch steward review runbook

**Status:** Alpha (operator API + manual triage)  
**Audience:** Bootstrap stewards and operators  
**Threat context:** [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md)  
**Next build spec:** [`VOUCH_TRUST_AND_SAFETY_OPERATOR_WORKFLOW.md`](VOUCH_TRUST_AND_SAFETY_OPERATOR_WORKFLOW.md)
**Flag implementation:** `worker/src/db/vouch-audit.ts`

---

## Purpose

Vouch abuse is mitigated by **cryptographic rules** (quota, threshold, signatures) and **human triage** of operator-only graph heuristics. This runbook covers the shipped M6 Step 4 controls: operator review queue plus steward-specific issuance guardrails. The durable case/report/suspension/appeal workflow is specified in [`VOUCH_TRUST_AND_SAFETY_OPERATOR_WORKFLOW.md`](VOUCH_TRUST_AND_SAFETY_OPERATOR_WORKFLOW.md).

**Still manual in v1:** automated suspension. Review actions remain manual (DB, support, operator workflow).

---

## Cadence

| Phase | Cadence |
|-------|---------|
| Founding cohort / first 90 days | **Weekly** review minimum ([`VT-01`](V1_ASSUMPTION_REGISTER.md)) |
| Steady state | Weekly or after burst alerts |
| After public launch spike | Daily until volume stabilizes |

---

## Fetch audit flags (operator API)

**Endpoint:** `GET /.well-known/hc/v1/operator/vouch-audit-flags`

**Auth:** `Authorization: Bearer <OPERATOR_AUDIT_TOKEN>` (Cloudflare Worker secret; not in repo)

**Example:**

```bash
curl -sS \
  -H "Authorization: Bearer $OPERATOR_AUDIT_TOKEN" \
  "https://humanity.llc/.well-known/hc/v1/operator/vouch-audit-flags"
```

**Local dev:** set `OPERATOR_AUDIT_TOKEN` in `worker/.dev.vars` (see `worker/.dev.vars.example`).

**Query params (optional):**

| Param | Default | Range |
|-------|---------|-------|
| `max_rows` | 1000 | 1–5000 recent vouch rows scanned |

Response includes `flags[]` with `triage` hints (priority, suggested action, threat IDs).

### Record review decision (step 2 backend)

- `POST /.well-known/hc/v1/operator/vouch-audit-flags/dismiss`
  - Body: `{ flag_key, flag_kind, note, dismissed_by? }`
- `DELETE /.well-known/hc/v1/operator/vouch-audit-flags/dismiss`
  - Body: `{ flag_key }`

`GET` now returns each flag with `dismissal` (or `null`) so a future UI can hide/annotate previously reviewed items.

---

## Flag types and triage

### `closed_loop_only` (G-01)

**Meaning:** Voucher **V** has active vouches, and **every** active vouchee also has an active vouch **back to V**.

**Often benign:** Two real friends who vouched each other.

**Suspicious when:** Part of a **4-clique** (each of four profiles vouched the other three → all become **Vouched Human**). See **R-02**.

| Step | Action |
|------|--------|
| 1 | List `related_profile_ids` + voucher; open scan/status for each |
| 2 | Check creation timing, statement similarity, steward involvement |
| 3 | If farm: suspend profiles under governance; request voucher revocations |
| 4 | If legitimate: **dismiss** (record in operator log; no public change) |

**Does not catch:** Rotating 3-cycles **A→B→C→A** (**G-02**). Use shared-set flags + manual graph sketch.

---

### `burst_at_quota_boundary` (G-03, S-02, V-04)

**Meaning:** Voucher issued **5 vouches within 24 hours** (yearly quota max; includes revoked issuances).

**Often benign:** Steward batch onboarding at an event.

**Suspicious when:** Unknown voucher, new accounts, or stolen keys (**A-02**).

| Step | Action |
|------|--------|
| 1 | Confirm voucher is known steward or expected founding cohort |
| 2 | If steward: verify with human; if keys compromised, suspend + rotate |
| 3 | If non-steward burst after 90d wait: inspect all five vouchees |
| 4 | Consider temporary suspend until review completes |

---

### `steward_issuance_burst` (S-02, R-03, A-02)

**Meaning:** A steward account issued at least N vouches in the burst window (default 3 in 24h).

**Often benign:** Scheduled onboarding event by known steward.

**Suspicious when:** Steward identity cannot confirm issuance, unknown vouchee cluster, or copied key indicators.

| Step | Action |
|------|--------|
| 1 | Verify steward identity out-of-band (same day) |
| 2 | Review vouchee set for shared edges/cycles |
| 3 | If suspicious: pause steward operations + begin key rotation |
| 4 | If expected event: dismiss with event note |

---

### `shared_voucher_set` (G-04, G-07)

**Meaning:** Two vouchees share **≥3** of the same active vouchers with Jaccard similarity **≥0.75**.

**Often benign:** Siblings, roommates, same event cohort.

**Suspicious when:** Coordinated Sybil elevation or laundry (**G-07**).

| Step | Action |
|------|--------|
| 1 | Compare `vouchee_profile_ids` and `shared_voucher_profile_ids` |
| 2 | Check whether shared vouchers form a closed clique |
| 3 | If synthetic: suspend vouchees and/or revocations via vouchers |
| 4 | If legitimate cohort: dismiss with note |

---

### `directed_cycle_cluster` (G-02, R-02)

**Meaning:** Strongly connected directed cluster with cycle structure and minimum edge density.

**Often benign:** Small cohorts who cross-vouch naturally.

**Suspicious when:** Rotating 3-cycles or dense 4+ cliques rapidly gaining **Vouched Human**.

| Step | Action |
|------|--------|
| 1 | Inspect `profile_ids` as one cluster, not isolated pairs |
| 2 | Check if edges are concentrated in short time window |
| 3 | Correlate with `shared_voucher_set` and burst flags |
| 4 | If synthetic: suspend cluster + request revocations |

---

## Response actions (manual v1)

| Action | When | How (v1) |
|--------|------|----------|
| **Dismiss** | False positive | Operator log only |
| **Request revoke** | Mistaken or fraudulent vouch | Contact voucher; they revoke from session or `/created/` |
| **Suspend card** | Governance decision | D1 / operator procedure (document cause) |
| **Steward key rotation** | Compromised steward | Re-issue bootstrap; invalidate old key |

Always document **cause** and **appeal path** per Human Verification HV-FR-40.

---

## Escalation matrix

| Signal combo | Likely threat | Priority |
|--------------|---------------|----------|
| `closed_loop_only` + 4 profiles all VH | **R-02** clique | P0 |
| `burst_at_quota_boundary` + steward | **S-02**, **V-04** | P0 |
| `shared_voucher_set` + new registrations | **G-07** laundry | P1 |
| Single `closed_loop_only` only | Often social | P2 |

---

## What not to do

- Publish flag output on scan pages or public APIs
- Auto-suspend from heuristics alone (**O-04**)
- Treat flags as proof of guilt-they are **review queue items**
- Share raw graph exports with PII in public channels

---

## Roadmap (after step 1)

| Step | Deliverable |
|------|-------------|
| **1 (this doc + API)** | Runbook + `GET …/operator/vouch-audit-flags` |
| 2 | Dismiss/notes table + operator UI |
| 3 | Directed-cycle / clique detection (**G-02**) |
| 4 | Per-steward issuance cap policy (**shipped**) |

---

## Related docs

- [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) §5–§9
- [`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md) Step 4
- [`V1_ASSUMPTION_REGISTER.md`](V1_ASSUMPTION_REGISTER.md) VT-01–VT-04

## UI prototype (step 2)

- Internal page: `/operator/vouch-audit.html`
- Script: `site/js/operator-vouch-audit.mjs`
- Steward workflow entry: `/created/` → **Advanced** → **Steward review queue** (shown when card is `steward`)
- Uses Bearer token input + operator API to:
  - load flags
  - save dismissal notes
  - clear dismissals
  - hide/show reviewed items
