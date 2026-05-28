# Hosted steward — Cloudflare Workers dashboard (E6.1)

**Status:** Ops setup guide (external dashboard)  
**Epic:** E6.1 in [`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md)  
**Companion:** [`HOSTED_STEWARD_OPS_RUNBOOK.md`](HOSTED_STEWARD_OPS_RUNBOOK.md) (daily checks + E6.2 CI)

---

## Purpose

Cloudflare Workers analytics show **edge-level** health: request volume, error rates, and status-code mix for the reference resolver. Use this dashboard together with the **operator snapshot** (`GET …/operator/steward-ops`) for hosted-tier fair-use and SLA review.

| Signal | CF Workers analytics | `steward-ops` snapshot |
|--------|----------------------|-------------------------|
| Total requests / 5xx | Yes | No |
| **429 rate** (fair-use pressure) | Yes (filter by path/status) | Usage counters by event |
| Hosted account counts | No | Yes |
| SSE push connections | No (per-isolate in snapshot only) | Yes (`push.active_connections`) |
| Per-account poll totals | No | Yes (`usage` for UTC day) |

---

## Worker

| Item | Value |
|------|--------|
| Worker name | `humanity-llc-resolver` |
| Config | `worker/wrangler.toml` |
| Public API prefix | `/.well-known/hc/v1/` |

---

## Setup (Cloudflare dashboard)

**Local preflight (repo only):** `npm run hosted:rollout:step5a -- --preflight` — confirms `worker/wrangler.toml` `name` matches this doc and rollout Vitest pass.

1. Open **Workers & Pages** → **humanity-llc-resolver** → **Metrics** (or account **Analytics & Logs** → Workers).
2. Pin a **7-day** and **24-hour** view for on-call review.
3. Add saved filters or note these paths for hosted-tier load:

| Path pattern | Hosted relevance |
|--------------|------------------|
| `/.well-known/hc/v1/steward/entitlements` | Entitlement probes (E2) |
| `/.well-known/hc/v1/steward/push` | SSE push (E4) |
| `/.well-known/hc/v1/cards/*/live-control/challenges` | Live-proof polls (E3) |
| `/.well-known/hc/v1/operator/steward-ops` | Ops snapshot (E6) |
| `/.well-known/hc/v1/operator/billing/webhook` | Stripe lifecycle (E5) |

4. Track **HTTP status** breakdown; watch **429** on authenticated challenge GETs during fair-use incidents.
5. Compare spikes with [`HOSTED_STEWARD_OPS_RUNBOOK.md`](HOSTED_STEWARD_OPS_RUNBOOK.md) § Daily check and E6.2 CI (`.github/workflows/steward-ops-daily.yml`).

---

## SLA inputs (M4)

| Target | CF dashboard | Snapshot / other |
|--------|----------------|------------------|
| **99.5% uptime** | 5xx rate + availability on resolver routes | Health: `GET …/health` |
| **Push p95 ≤ 5s** | Not available in CF alone | Log sampling / future metrics; E6.2 script flags usage thresholds |

---

## Review cadence

| When | Action |
|------|--------|
| Daily | E6.2 automated threshold check + skim CF 24h metrics |
| Weekly | Compare CF 429/5xx trends with `steward-ops` account/usage rows |
| Incident | CF request graph + runbook § Incident responses |

---

## Out of scope (v1)

- Per-tenant billing UI (Stripe dashboard)
- Durable Object push fan-out metrics (E4e deferred)
- Automated CF dashboard-as-code (manual pin/save in CF UI for v1)

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-28 | `hosted:rollout:step5a -- --preflight` (wrangler name + doc gate before manual pin) |
| 2026-05-27 | E6.1 ops setup guide for external CF Workers dashboard |
