# Hosted steward ops runbook

**Status:** E6 runbook draft (staging)  
**Epic:** [`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md) E6  
**Audience:** Operators supporting hosted steward accounts on the reference operator

---

## Purpose

Hosted steward adds resolver capacity and push delivery for stewards who already control their cards. It does **not** change public scan trust labels, grant verification, or sell scan analytics.

This runbook covers the operator loop for quota health, push health, subscription downgrade, Cloudflare 1027, and support escalation.

---

## Data sources

| Source | Use |
|--------|-----|
| Cloudflare Workers analytics | Requests, 4xx/5xx, subrequests, CPU, Error 1027 |
| Worker logs | `steward_push_*`, `steward_quota_exceeded`, billing webhook errors |
| D1 `steward_accounts` | Plan/status/effective-until state |
| D1 `steward_usage_counters` | UTC-day metering by account/device |
| Stripe dashboard | Customer/subscription truth for billing disputes |

Operator APIs are still feature-flagged behind `HOSTED_STEWARD_ENABLED`; production secrets stay unset until governance/payment sign-off.

Operator summary endpoint (E6 staging):

```bash
curl -sS \
  -H "Authorization: Bearer $OPERATOR_AUDIT_TOKEN" \
  "https://humanity.llc/.well-known/hc/v1/operator/hosted-steward/ops?window_key=$(date -u +%F)"
```

The response includes account status counts, usage totals, top usage accounts, current in-memory SSE connection counts, and alert candidates for the daily check below.

---

## Daily hosted steward check

| Check | Healthy | Escalate when |
|-------|---------|---------------|
| Worker request volume | Under planned daily/monthly budget | >80% monthly included usage or sudden per-account spike |
| `steward_quota_exceeded` count | Rare and explainable by power use | Repeated for same account/device or many accounts |
| SSE connection count | Within per-account/IP limits | Repeated `steward_push_connection_limit` or `steward_push_ip_limit` |
| Push freshness | `connection.ack` and live-proof events delivered | Push down >60s with hosted watch enabled |
| Billing status drift | Stripe and D1 status agree | D1 active while Stripe canceled/expired, or expired account still has sessions |

Record anomalies in the operator log with UTC time, account id, and action taken.

---

## Incident: Cloudflare Error 1027 / daily limit

| Step | Action |
|------|--------|
| 1 | Confirm Error 1027 in Cloudflare dashboard and Worker logs. |
| 2 | Check whether traffic is public scan/create or hosted steward polling. |
| 3 | If hosted traffic dominates, identify top `account_id` / `device_id` usage counters. |
| 4 | Temporarily suspend offending account status only if usage is abusive or clearly buggy. |
| 5 | Publish a plain status note: resolver capacity is constrained; public cards still use current status when service returns. |
| 6 | After reset/recovery, verify free-tier flows: create, scan, revoke, live proof. |

Do not re-enable global wallet polling or raise caps as an incident workaround.

---

## Incident: hosted account over fair use

| Signal | Action |
|--------|--------|
| Device hits `poll.live_proof.auto_daily_cap` | No operator action; client pauses automatic checks and manual checks remain available. |
| Account approaches 50k/day soft cap | Contact steward with support macro; inspect whether many tabs/devices are open. |
| Account exceeds hard cap or appears automated | Set account status to `suspended` or `expired` through operator DB/admin path; revoke sessions; note reason. |

Use the least invasive status that protects the reference operator. Do not modify card, QR, vouch, or public scan records for a billing/quota issue.

---

## Incident: push delivery degraded

| Step | Action |
|------|--------|
| 1 | Confirm `notify.push.live_proof` entitlement and `hc_watch_live_proof` / browser alerts are on. |
| 2 | Check SSE connection limit logs and recent `connection.ack` events. |
| 3 | If push is down, rely on fallback polling; do not ask the steward to create a new card. |
| 4 | If only one account is affected, revoke that account's sessions and have the steward re-link. |
| 5 | If all accounts are affected, disable push at the entitlement/config layer and leave free-tier polling behavior intact. |

Push is a delivery optimization. It must fail back to scoped polling, not block live proof.

---

## Billing downgrade / expiration

| Event | Operator expectation |
|-------|----------------------|
| `active` / `trialing` | Hosted entitlements apply. |
| `past_due` | Hosted caps continue during 7-day grace. |
| `canceled` before period end | Hosted caps continue until `effective_until`. |
| `expired` | Sessions revoked; push connections closed; entitlement fetch returns reference/free behavior. |

When Stripe and D1 disagree, treat Stripe as the billing source of truth, but never expose payment details through resolver APIs or public scan pages.

---

## Support boundaries

- Hosted steward is infrastructure capacity, not identity verification.
- Purchases, merch, donations, and Shopify/Printify orders never grant hosted entitlements.
- Support may explain cap/push behavior, but should not ask for private keys or signed vouch material.
- Downgrades must not delete local wallet data, cards, QRs, or public scan history.

---

## Related docs

| Doc | Use |
|-----|-----|
| [`HOSTED_TIER_SUPPORT_MACROS.md`](HOSTED_TIER_SUPPORT_MACROS.md) | Customer-facing replies |
| [`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md) | E1-E6 build map |
| [`HOSTED_TIER_PRICING_AND_SLA.md`](HOSTED_TIER_PRICING_AND_SLA.md) | Fair-use and lifecycle |
| [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) | Free vs hosted polling caps |
| [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) | Data boundaries |
