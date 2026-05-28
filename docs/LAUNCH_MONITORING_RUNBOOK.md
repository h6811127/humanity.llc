# Launch monitoring runbook (card creation)

**Status:** Shipped for public-create launch guardrails  
**Primary risks:** `R-01` card farm, `A-012F` launch abuse before ops response  
**Endpoint:** `GET /.well-known/hc/v1/operator/create-rate-monitor`

---

## Purpose

Public card creation stays open by default. Abuse is handled with rate limits plus active monitoring, not invite-only gating as the product baseline.

This runbook defines the minimum monitoring loop during launch.

---

## Data source

Operator-only monitoring endpoint:

```bash
curl -sS \
  -H "Authorization: Bearer $OPERATOR_AUDIT_TOKEN" \
  "https://humanity.llc/.well-known/hc/v1/operator/create-rate-monitor?window_hours=24"
```

Returns:

- `cards_created`
- `create_allowed_attempts`
- `create_blocked_attempts`
- `unique_allowed_ip_windows`
- `unique_blocked_ip_windows`

All create throttling keys are hashed in `rate_limit_buckets`.

---

## Cadence

| Phase | Cadence |
|-------|---------|
| First 30 days post-open-create | Daily |
| High traffic windows / launch events | Every 4 hours |
| Steady state | Weekly |

---

## Escalation guidelines

| Signal | Interpretation | Action |
|--------|----------------|--------|
| `create_blocked_attempts` near 0 with stable create volume | Healthy baseline | Continue normal cadence |
| Sharp increase in blocked attempts with low successful creates | Possible farm pressure | Temporarily tighten limits; monitor support/abuse reports |
| Sharp increase in both successful and blocked attempts | Organic spike or mixed abuse | Validate with support queue and event calendar; adjust thresholds only if needed |
| Sustained elevated blocked attempts for >24h | Persistent abuse pressure | Move to incident mode; apply temporary stricter limits and publish status note |

---

## Policy constraints

- Do not require government ID, phone, or email for baseline card creation.
- Do not convert optional cohort testing into a permanent product gate.
- Prefer temporary, measurable limit adjustments with explicit rollback.

---

## Related docs

- [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) - `R-01`, `A-012F`
- [`V1_ASSUMPTION_REGISTER.md`](V1_ASSUMPTION_REGISTER.md) - `A-012F`
- [`V1_DECISION_LOCK.md`](V1_DECISION_LOCK.md) - registration controls
