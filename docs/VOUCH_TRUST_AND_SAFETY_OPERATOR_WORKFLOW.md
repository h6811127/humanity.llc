# Vouch trust and safety operator workflow

**Status:** Build spec — P0 case queue + suspension API shipped; operator case inbox + suspend UI in progress
**Audience:** Operators, stewards, product, engineering
**Primary refs:** [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) | [`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md) | [`VOUCH_STEWARD_REVIEW_RUNBOOK.md`](VOUCH_STEWARD_REVIEW_RUNBOOK.md) | [`PUBLIC_LAUNCH_AND_GOVERNANCE_PLAN.md`](PUBLIC_LAUNCH_AND_GOVERNANCE_PLAN.md) | [`REVOKE_AND_LIFECYCLE_V1.md`](REVOKE_AND_LIFECYCLE_V1.md)

---

## Purpose

The current vouch system has shipped cryptographic controls and operator-only audit flags, but trust and safety still depends on manual steward action. This spec turns the existing threat model, runbook, and governance plan into an implementation target for reports, case review, suspension, appeal, and transparency.

**Goal:** make false or abusive vouch elevation **reportable, reviewable, reversible, and auditable** without exposing the private social graph or turning scan pages into public shaming surfaces.

**Non-goal:** make `Vouched Human` a legal identity, KYC, biometric uniqueness, or "bot-proof" claim. Product framing remains [`VOUCH_TRUST_POSITIONING.md`](VOUCH_TRUST_POSITIONING.md).

---

## Existing foundation

| Piece | Status | Source |
|-------|--------|--------|
| Signed vouch POST, nonce replay protection, no self-vouch | Shipped | `worker/src/resolver/vouch.ts` and [`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md) |
| Threshold, quotas, 90-day wait, steward cap | Shipped | `worker/src/db/verification.ts` and [`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md) section Abuse prevention |
| Vouch revoke by voucher | Shipped | `worker/src/resolver/vouch-revoke.ts` and [`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md) Step 3 |
| Audit flags: loops, bursts, shared sets, directed cycles, steward bursts | Shipped | `worker/src/db/vouch-audit.ts` and [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) section 7 |
| Operator audit flag API + dismiss notes | Shipped | [`VOUCH_STEWARD_REVIEW_RUNBOOK.md`](VOUCH_STEWARD_REVIEW_RUNBOOK.md) |
| Suspension status enum | Schema-ready, no governance UI | [`REVOKE_AND_LIFECYCLE_V1.md`](REVOKE_AND_LIFECYCLE_V1.md) section Suspend card |
| Abuse and appeal principles | Drafted | [`PUBLIC_LAUNCH_AND_GOVERNANCE_PLAN.md`](PUBLIC_LAUNCH_AND_GOVERNANCE_PLAN.md) section 7 |

---

## Threats this workflow addresses

| Threat | Workflow response | Source |
|--------|-------------------|--------|
| 4-account clique / directed cycle | Flag-to-case conversion, cluster review, possible suspension | `R-02`, `G-02` in [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) |
| Steward-backed farm | Same-day steward burst case, out-of-band confirmation, possible steward pause | `R-03`, `S-02` |
| Stolen voucher or steward keys | Burst case, emergency steward pause, batch vouch revocation request | `V-04`, `V-05`, `A-02` |
| False or remote vouch | Report intake, voucher contact, revoke request, case notes | `V-06`, `H-02` |
| Coerced vouch | Report intake, appeal path, governance review | `H-01` |
| Harassing or defamatory statement | Statement report, takedown/suspension review | `V-08` |
| Integrator over-trust | Policy copy and transparency, not public graph exposure | `I-02`, [`VOUCH_INTEGRATOR_POLICY_GUIDE.md`](VOUCH_INTEGRATOR_POLICY_GUIDE.md) |

---

## Principles

1. **No shadow action.** Suspension is visible as `Suspended under public rules`, not hidden ranking or silent invisibility.
2. **Heuristics are leads, not verdicts.** Audit flags create review cases; they do not auto-suspend cards.
3. **Private graph stays private.** Public scan pages show aggregate trust state, count, recency, and status - not operator graph flags.
4. **Minimal data.** Store report/case data needed for review and transparency, not scan analytics or private social dossiers.
5. **Appeal exists.** Any rights-affecting suspension must have notice, cause category, appeal deadline, and logged decision.
6. **Money cannot influence trust state.** No paid escalation for vouches, appeals, or immunity.

---

## MVP scope

### P0 - Case queue from existing signals

Build an operator case layer that converts existing audit flags into durable review cases.

**Inputs:**

- `listVouchAuditFlags` results.
- Manual operator-created case from a profile ID, vouch ID, or cluster.

**Case fields:**

| Field | Notes |
|-------|-------|
| `case_id` | Stable `case_...` ID |
| `kind` | `vouch_graph`, `steward_burst`, `false_vouch`, `statement_abuse`, `impersonation`, `harassment`, `other` |
| `source` | `audit_flag`, `operator_manual`, future `public_report` |
| `source_key` | Flag key or report ID for dedupe |
| `subject_profile_ids_json` | Profiles under review |
| `subject_vouch_ids_json` | Optional vouches under review |
| `status` | `open`, `watching`, `action_required`, `dismissed`, `suspended`, `appealed`, `closed` |
| `priority` | `p0`, `p1`, `p2` |
| `threat_ids_json` | Threat IDs from [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) |
| `summary` | Short operator-readable reason |
| `created_at`, `updated_at` | ISO timestamps |
| `created_by`, `assigned_to` | Operator labels, no public exposure |

**Acceptance:**

- Same flag does not create duplicate open cases.
- Dismissed flag can be reopened if the graph changes.
- Case creation does not expose data publicly.

### P0 - Case notes and decisions

Extend dismiss notes into a general case log.

**Decision types:**

- `dismiss_false_positive`
- `watch`
- `request_revoke`
- `pause_steward_review`
- `suspend_profile`
- `restore_profile`
- `close_no_action`

**Acceptance:**

- Every decision has `reason`, `operator`, and timestamp.
- Decisions are immutable append-only events.
- `suspend_profile` requires a public cause category and appeal deadline.

### P0 - Suspension action record

Implement governance suspension as a distinct operator action, not owner disable.

**Required public fields:**

| Field | Example |
|-------|---------|
| `profile_id` | `profile_...` |
| `status` | `suspended` |
| `public_label` | `Suspended under public rules` |
| `cause_category` | `impersonation`, `vouch_abuse`, `harassment`, `illegal_content`, `security_compromise`, `other` |
| `notice` | Short public notice, no private graph dump |
| `appeal_deadline` | ISO date |
| `case_id` | Links operator workflow to action |
| `signed_document_json` | Future governance-key signature; MVP may log bootstrap operator |

**Acceptance:**

- Suspended state overrides `Vouched Human` and `Steward` display.
- Scan page remains explicit, not error-like.
- New print/artifact intent creation remains blocked for suspended profiles per existing commerce specs.

### P1 - Public report intake

Build a minimal report flow for people harmed by a vouch, statement, QR, or profile.

**Report kinds:**

- `false_vouch`
- `coerced_vouch`
- `statement_abuse`
- `impersonation`
- `stolen_qr_or_artifact`
- `harassment`
- `integrator_misuse`

**Public form constraints:**

- Accept a profile URL, vouch ID, or scan URL.
- Do not require account login for initial report.
- Optional contact method is separate from public graph data.
- Rate-limit reports; protect against report spam.

**Acceptance:**

- Report creates or attaches to an operator case.
- Reporter receives a non-secret reference code if contact info is provided.
- Public report data is not shown on scan.

### P1 - Appeal flow

Create an appeal path for suspended profiles.

**Flow:**

1. Suspended scan/status page shows appeal instructions.
2. Appealer submits case reference, profile ID, and statement.
3. Operator case moves to `appealed`.
4. Steward group records decision: `uphold`, `restore`, `modify_notice`, or `request_more_info`.
5. Final decision is logged and transparency counters update.

**Acceptance:**

- Appeal exists before broad public launch of suspension UI.
- Restoring a profile recalculates verification display and does not restore revoked vouches unless separately valid.

### P1 - Batch revoke / compromised steward playbook

Support emergency review when a steward or voucher key is suspected compromised.

**Actions:**

- Mark steward/voucher as `under_review`.
- List vouches issued by profile in time window.
- Request voucher-signed revocation where possible.
- If key compromise is confirmed, suspend profile and create batch case notes.

**Non-goal:** server-side vouch revoke without governance rules. The v1 revoke path remains voucher-signed unless a separate governance revocation policy is ratified.

### P2 - Statement moderation policy

Define what can happen to a public vouch statement independent of vouch counting.

**Open policy decisions:**

- Can an abusive statement be hidden while the vouch remains cryptographically present?
- Does hidden statement still count toward threshold?
- Who signs statement takedown records?
- What notice appears on credential detail pages?

Until resolved, do not pre-moderate statements; use report + case review + voucher revoke / suspension.

---

## Operator UI surfaces

| Surface | MVP behavior |
|---------|--------------|
| `/operator/vouch-audit.html` | Audit flags + case inbox; open case detail to suspend subject profile |
| `/created/` Steward Advanced | Link to review queue stays steward-only and resolver-confirmed |
| Public scan/status | Show only final public status and appeal link; no graph flags |
| Support page | Explain false vouch, stolen QR, impersonation, appeal |

---

## API sketch

All routes are operator-only unless marked public.

| Route | Method | Purpose |
|-------|--------|---------|
| `/.well-known/hc/v1/operator/vouch-cases` | `GET` | List cases |
| `/.well-known/hc/v1/operator/vouch-cases` | `POST` | Create manual case or convert audit flag |
| `/.well-known/hc/v1/operator/vouch-cases/{case_id}` | `GET` | Case detail |
| `/.well-known/hc/v1/operator/vouch-cases/{case_id}/events` | `POST` | Append note/decision |
| `/.well-known/hc/v1/operator/vouch-cases/{case_id}/suspend` | `POST` | Suspend profile with public notice |
| `/.well-known/hc/v1/vouch-reports` | `POST` | Public report intake (receipt-only response; see below) |
| `/.well-known/hc/v1/vouch-appeals` | `POST` | Public appeal intake |

Auth for operator routes follows the current `OPERATOR_AUDIT_TOKEN` pattern until governance-key signing is implemented.

### Public intake responses (no auth)

Public routes must **not** echo operator case rows. Reporters can file reports; case dedupe, status, subjects, and priority stay on `OPERATOR_AUDIT_TOKEN` case routes.

**`POST …/vouch-reports`** (201):

- Request: `kind`, `target`, `statement`, optional `contact_method`.
- Response: `{ ok, report_id, reference_code }` only. `reference_code` is present when `contact_method` is provided (support follow-up).
- The worker still dedupes into `public_report` cases server-side; the JSON shape is the same whether a new case was opened or an existing open case received another report.
- Must **not** return: `case`, `case_created`, `case_id`, `status`, `priority`, `subject_profile_ids`, `subject_vouch_ids`, or any other inbox field. Probing `(kind, profile_id)` pairs must not reveal whether an investigation is already open.

---

## Transparency counters

Publish aggregate counts only; never publish raw graph exports.

Minimum counters:

- New audit flags by kind.
- Cases opened/closed by kind.
- Reports received by kind.
- Profiles suspended/restored.
- Appeals opened/resolved.
- Vouches revoked after review.
- Median review age by priority.

Reference: Human Verification governance requires transparency reports with aggregate counts without exposing private identities.

---

## Regression and QA gates

### Unit / integration

- Audit flag to case dedupe.
- Case event append-only behavior.
- Public report rate limit.
- Public report intake returns receipt fields only (no case metadata in JSON).
- Suspension overrides verification summary in scan/status.
- Appeal creates case event and changes status.
- Transparency counter aggregation excludes raw graph data.

### Manual QA

- Steward opens review queue from `/created/` Advanced.
- Operator converts `directed_cycle_cluster` flag into a case.
- Operator dismisses false positive with note.
- Operator suspends a test profile and scan shows public suspension notice.
- Public appeal form attaches to suspended profile case.

### Copy checks

- Suspension copy distinguishes governance suspension from owner revoke/disable.
- Report pages do not promise identity verification, legal adjudication, or private investigation.
- Public pages say `Vouched Human`, not KYC or bot-proof.

---

## Build order

1. **Case schema + APIs**: durable cases from existing audit flags. **Shipped**
2. **Case UI**: convert current audit prototype into case inbox/detail. **Partial — inbox + suspend detail shipped; case events/notes pending**
3. **Suspension action**: public notice + scan/status override. **API shipped; operator suspend UI shipped**
4. **Report intake**: false vouch, statement abuse, impersonation, harassment. **Shipped** — `POST …/vouch-reports`, `/report/`
5. **Appeals**: suspended profile appeal path and case status transitions.
6. **Transparency counters**: aggregate report endpoint / operator export.
7. **Governance-key signatures**: replace bootstrap token-only action with signed suspension records.

---

## Open decisions before build

| Decision | Default for MVP |
|----------|-----------------|
| Who can suspend before formal governance? | Bootstrap operators named in governance plan; log every action |
| Does a suspended voucher invalidate downstream vouches immediately? | Yes for display recalc where rules require; document rule before implementation |
| Can a vouchee remove an unwanted vouch without voucher consent? | Not in MVP; report + steward review + possible suspension path |
| Can operators hide abusive statement text while preserving signed evidence? | Defer to P2 statement moderation policy |
| Are IP/time access logs allowed for abuse review? | No by default; requires governance-approved retention policy |
| Can integrator misuse trigger protocol action? | Case note + policy contact; no automatic card suspension |

---

## Related docs

- [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) - threat IDs, residual risks, hardening backlog.
- [`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md) - vouch rules, privacy, and shipped abuse hooks.
- [`VOUCH_STEWARD_REVIEW_RUNBOOK.md`](VOUCH_STEWARD_REVIEW_RUNBOOK.md) - current alpha runbook.
- [`PUBLIC_LAUNCH_AND_GOVERNANCE_PLAN.md`](PUBLIC_LAUNCH_AND_GOVERNANCE_PLAN.md) - abuse principles, appeal process, governance transition.
- [`REVOKE_AND_LIFECYCLE_V1.md`](REVOKE_AND_LIFECYCLE_V1.md) - owner revoke/disable vs governance suspension.
- [`VOUCH_INTEGRATOR_POLICY_GUIDE.md`](VOUCH_INTEGRATOR_POLICY_GUIDE.md) - third-party policy knobs and anti-KYC framing.
- [`features/Human Verification v1.0.md`](features/Human%20Verification%20v1.0.md) - ratified requirements for verification, suspension, and governance readiness.
