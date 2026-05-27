# Hosted tier — G0 readiness (sign-off packet)

**Status:** **G0 signed (Governance + Ops, 2026-05-27)** — Legal pending (G7). Production rollout may proceed per epics § Production rollout.  
**Gate:** G0 in [`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md)  
**Checklist:** [`HOSTED_TIER_PRICING_AND_SLA.md`](HOSTED_TIER_PRICING_AND_SLA.md) § Governance checklist  
**Brief:** [`HOSTED_TIER_M4_GOVERNANCE_BRIEF.md`](HOSTED_TIER_M4_GOVERNANCE_BRIEF.md)

---

## Engineering completion (2026-05-27)

| Epic | Scope | Status |
|------|--------|--------|
| E1 | Steward API + D1 + quota | Staging (`HOSTED_STEWARD_ENABLED`) |
| E2 | Client entitlements probe + policy caps | Staging |
| E3 | Server caps + client 429 alignment | Staging |
| E4a–d | SSE push + SW bridge + fallback | Staging |
| E5 | Billing webhooks + lifecycle | Staging (enable after G8) |
| E6 | Ops snapshot, runbook, E6.1 guide, E6.2 CI | Staging |

**Deferred:** E4e Durable Object push fan-out.

---

## Verification commands (before / during rollout)

**Vitest (free-tier + hosted bundles):**

```bash
npm run verify:hosted-g0
```

Equivalent to `worker:test:hosted-free-tier` + `worker:test:steward-hosted`.

**Playwright (hosted E2E — run before production flag on):**

```bash
npm run e2e:steward-hosted
```

**Ops threshold script (production, after `OPERATOR_AUDIT_TOKEN` set):**

```bash
OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run worker:check-steward-ops
```

---

## Exit tests mapped

| Test | Coverage |
|------|----------|
| H1–H3, H5 | `e2e/hosted-tier-budget.spec.ts` |
| H4 + E4 fallback | `e2e/hosted-tier-push.spec.ts` |
| H6 commerce firewall | `worker/tests/billing-webhook.test.ts` |
| E6 tabletop (expired → free) | `billing-webhook.test.ts` + E2E H3 |
| E6 ops thresholds | `worker/tests/steward-ops-thresholds.test.ts` |

---

## Secrets and flags (production, after G0)

| Name | When | Purpose |
|------|------|---------|
| `HOSTED_STEWARD_ENABLED` | Step 4 rollout | Enable hosted routes |
| `OPERATOR_AUDIT_TOKEN` | Before E6.2 CI | `steward-ops` + daily workflow |
| `STRIPE_WEBHOOK_SECRET` | After **G8** checked | Billing lifecycle webhooks |

Migrations: `0012_steward_hosted.sql`, `0013_steward_billing.sql`.

Rollout steps: [`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md) § Production rollout (after G0).

---

## Ops checklist (parallel with G0)

| # | Item | Doc |
|---|------|-----|
| 1 | Pin CF Workers metrics for `humanity-llc-resolver` | [`HOSTED_STEWARD_CF_DASHBOARD.md`](HOSTED_STEWARD_CF_DASHBOARD.md) |
| 2 | Add GitHub secret `OPERATOR_AUDIT_TOKEN` | [`HOSTED_STEWARD_OPS_RUNBOOK.md`](HOSTED_STEWARD_OPS_RUNBOOK.md) |
| 3 | Review runbook | [`HOSTED_STEWARD_OPS_RUNBOOK.md`](HOSTED_STEWARD_OPS_RUNBOOK.md) |
| 4 | Confirm E6.2 workflow green after secret set | `.github/workflows/steward-ops-daily.yml` |

---

## Sign-off

**Recorded 2026-05-27** (solo founder — no separate governance meeting):

| Role | Status | Notes |
|------|--------|-------|
| Governance | **Signed** | G1–G3, G9–G10 defaults accepted |
| Ops | **Signed** | G4–G6, G8 defaults accepted; E6.1/E6.2 ops checklist remains |
| Legal | **Pending** | G7 refund window — use planning default until counsel |

Checklist: [`HOSTED_TIER_PRICING_AND_SLA.md`](HOSTED_TIER_PRICING_AND_SLA.md) § Governance checklist (G1–G10).

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-27 | G0 readiness packet — engineering verification + ops parallel checklist |
| 2026-05-27 | **G0 signed** (Governance + Ops); Legal pending |
