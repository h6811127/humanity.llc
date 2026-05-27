# Hosted steward ops runbook

**Status:** E6 staging runbook  
**Scope:** Reference operator hosted steward tier (`HOSTED_STEWARD_ENABLED`)  
**Operator endpoint:** `GET /.well-known/hc/v1/operator/steward-ops`

---

## Access

The endpoint is operator-only and requires:

```bash
Authorization: Bearer $OPERATOR_AUDIT_TOKEN
```

Example:

```bash
curl -H "Authorization: Bearer $OPERATOR_AUDIT_TOKEN" \
  "https://humanity.llc/.well-known/hc/v1/operator/steward-ops"
```

Optional query:

```text
?day=YYYY-MM-DD
```

If `schema` is `missing`, run the hosted migrations before investigating hosted metrics.

---

## Snapshot fields

| Field | Meaning |
|-------|---------|
| `hosted_steward_enabled` | Worker flag state. Production may stage code with the flag off. |
| `accounts` | Account counts grouped by `plan_id` and lifecycle `status`. |
| `sessions.active` | Non-expired steward bearer sessions. |
| `usage` | Current UTC-day usage counters grouped by event. |
| `push` | In-memory SSE connection counts for this Worker isolate. |
| `controls` | Fair-use and SLA thresholds copied from the governance docs. |

`push` is per isolate and should be treated as a live debug signal, not a durable monthly metric.

---

## Daily check

1. Confirm `hosted_steward_enabled` matches the rollout plan.
2. Check `accounts` for unexpected `past_due`, `expired`, or `suspended` spikes.
3. Check `usage`:
   - `poll.live_proof.auto` near **50,000/account/day** means soft-cap review.
   - `poll.live_proof.auto` near **100,000/account/day** means hard-cap/fair-use intervention.
   - `notify.push.delivered` near **10,000/account/day** means push fan-out review.
4. Check `push.active_connections` against `push.max_connections_per_account`.
5. Cross-check Cloudflare Workers analytics for 429 rate, 5xx rate, and request volume.

---

## Incident responses

### Worker 1027 / quota pressure

1. Set `HOSTED_STEWARD_ENABLED=0` if hosted traffic is the suspected source.
2. Confirm public card create and scan still work.
3. Use the snapshot `usage` rows to identify whether live-proof auto polls or push delivery drove the load.
4. Keep public copy neutral: hosted capacity failed; card validity and verification labels did not change.

### Fair-use 429

1. Look for `poll.live_proof.auto` at or above hard-cap levels.
2. Keep manual checks available; do not disable cards, scans, or vouches.
3. Contact the steward with the M4 fair-use language.
4. If abuse is suspected, move the account to `suspended`; this downgrades entitlements to reference-free.

### Subscription downgrade or expiry

1. Confirm webhook lifecycle moved the account to `expired` or `canceled`.
2. Confirm `sessions.active` drops after expiry and SSE connections close.
3. Confirm cards, keys, scans, and vouches remain available.
4. Direct customer-facing answers to `docs/SKEPTIC_FAQ.md` and the M5 hosted-tier copy.

---

## Do not do

- Do not call hosted status a stronger verification label.
- Do not meter scan analytics, stranger identities, or locations.
- Do not restore global shell polling to improve hosted responsiveness.
- Do not let commerce or merch grant `steward.hosted`.
