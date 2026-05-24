# M6 Steward Review Queue (alpha)

**Status:** Alpha operations spec
**Parent:** `docs/M6_VOUCHING_DESIGN.md` Step 4
**Purpose:** Define the smallest operator-only review queue for vouch abuse flags before building steward tooling.

---

## Goal

Give stewards a consistent way to review suspicious vouch patterns without turning the public resolver into a social graph or an automated punishment system.

The queue may start as a spreadsheet or private issue tracker. It should only become product UI after real review volume proves the need.

---

## Inputs

| Source | Origin | Notes |
|---|---|---|
| `closed_loop_only` | `listVouchAuditFlags` | Vouchers whose active outgoing vouches only point at profiles that vouch back. |
| `burst_at_quota_boundary` | `listVouchAuditFlags` | A voucher reaches the yearly quota inside a short window. |
| `shared_voucher_set` | `listVouchAuditFlags` | Two vouchees have a highly overlapping active voucher set. |
| Manual report | Steward / support | Requires a written reason and profile IDs; no anonymous public accusation flow in alpha. |
| Production smoke finding | Operator | Used when M6 production checks reveal summary or scan-state drift. |

Audit flags are prompts for review, not proof of abuse.

---

## Queue record

Minimum spreadsheet columns:

| Field | Required | Description |
|---|---:|---|
| `review_id` | Yes | Stable internal ID, e.g. `m6_review_YYYYMMDD_001`. |
| `created_at` | Yes | ISO timestamp when the row was opened. |
| `source` | Yes | `audit_flag`, `manual_report`, or `production_smoke`. |
| `flag_kind` | Conditional | One of the audit flag kinds when source is `audit_flag`. |
| `profile_ids` | Yes | Profile IDs directly involved; keep to the minimum needed for review. |
| `vouch_ids` | Optional | Credential IDs relevant to the concern. |
| `evidence_json` | Yes | Raw flag output or concise manual evidence. No private notes. |
| `severity` | Yes | `low`, `medium`, `high`, or `critical`. |
| `status` | Yes | One of the queue statuses below. |
| `assigned_steward` | Optional | Internal reviewer name or handle. |
| `decision_summary` | Conditional | Required before `dismissed`, `action_taken`, or `closed`. |
| `action` | Optional | `none`, `watch`, `request_context`, `suspend_card`, `revoke_badge`, or `escalate_governance`. |
| `public_notice_required` | Yes | `yes` when action affects public card or verification state. |
| `appeal_deadline` | Conditional | Required when a public suspension/action is applied. |
| `closed_at` | Optional | ISO timestamp when review is closed. |

Do not store legal names, phone numbers, email, private vouch notes, IPs, device IDs, or scan-location data in this queue.

---

## Statuses

```text
new -> triaged -> watching -> action_recommended -> action_taken -> closed
new -> triaged -> dismissed -> closed
action_taken -> appealed -> closed
```

| Status | Meaning |
|---|---|
| `new` | Row opened; no steward has reviewed it. |
| `triaged` | Steward confirmed the row is understandable and in scope. |
| `watching` | Pattern is suspicious but not enough for action; revisit with future flags. |
| `action_recommended` | Steward proposes a state-changing action. Requires second reviewer before action. |
| `action_taken` | Public state or internal watch state changed. |
| `dismissed` | No action; flag was benign, stale, or unsupported. |
| `appealed` | A card owner or voucher has challenged a public action. |
| `closed` | Review is complete; no open operator task remains. |

---

## Severity rubric

| Severity | Use when | Required response |
|---|---|---|
| `low` | One weak signal, no public harm. | Triage or dismiss. |
| `medium` | Repeated suspicious pattern or multiple related flags. | Steward review and watch decision. |
| `high` | Verification label may be materially misleading. | Second reviewer before public action. |
| `critical` | Active exploitation, impersonation, or public safety issue. | Immediate escalation; document public notice requirements. |

---

## Review rules

1. **No automatic penalties.** Audit flags cannot directly suspend cards, revoke vouches, or downgrade labels.
2. **Two-person rule for public action.** Any action that changes public card, QR, vouch, badge, or verification state requires a second steward or bootstrap governance reviewer.
3. **Minimum evidence.** Keep only profile IDs, vouch IDs, timestamps, and aggregate flag output needed for review.
4. **No graph publication.** Do not show voucher networks on scan pages or public card pages because a queue row exists.
5. **Explain public actions.** If action affects public state, attach a concise public notice and appeal deadline.
6. **Prefer dismissal over vague suspicion.** If the steward cannot explain the issue in one paragraph, close or watch rather than punish.

---

## Alpha workflow

1. Run or generate audit flags from `listVouchAuditFlags`.
2. Open one queue row per distinct concern.
3. Steward triages the row and assigns severity.
4. Steward either dismisses, watches, or recommends action.
5. A second reviewer approves any public state-changing action.
6. Apply action through existing signed/admin process when available; otherwise escalate to governance docs before building new authority.
7. Close with a decision summary.

---

## Non-goals

- Public social graph explorer.
- Automated trust-score penalties.
- Scanner-visible accusations.
- Private vouch note collection.
- Device fingerprinting, scan analytics, or IP-based identity clustering.

---

## Exit criteria for alpha

- Spreadsheet or private tracker template exists with the fields above.
- At least one synthetic row is walked from `new` to `dismissed`.
- At least one synthetic high-severity row is walked through the two-person action gate without applying a real public penalty.
- Stewards can explain why a flag is not proof of abuse.
