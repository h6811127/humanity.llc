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

`OPERATOR_AUDIT_TOKEN` must be **ASCII-only** when passed on the shell (HTTP `Authorization` is a ByteString). Do not paste doc placeholders like `...` or `…` — use the exact value from `wrangler secret list` / GitHub Actions secret.

Migrations: `0012_steward_hosted.sql`, `0013_steward_billing.sql`.

**Rollout step 1 (script):**

```bash
npm run hosted:rollout:step1              # verify:hosted-g0 + local D1 apply
npm run hosted:rollout:step1 -- --remote  # + production D1 (Cloudflare auth)
```

**Rollout step 2 (script):**

```bash
npm run hosted:rollout:step2                        # verify HOSTED_STEWARD_ENABLED=0 in wrangler.toml
npm run hosted:rollout:step2 -- --deploy --smoke    # deploy Worker + GET health on API_ORIGIN
```

**Rollout step 3a — `OPERATOR_AUDIT_TOKEN` (required; do this first):**

```bash
npm run hosted:rollout:step3a
# After wrangler + GitHub secrets are set:
OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step3a
```

(`hosted:rollout:step3` is an alias for step3a.)

**Rollout step 3b — `STRIPE_WEBHOOK_SECRET` (defer until G8):**

```bash
npm run hosted:rollout:step3b   # setup notes only; not required before step 4
```

**Rollout step 4a — enable `HOSTED_STEWARD_ENABLED` in wrangler (do this first):**

```bash
npm run hosted:rollout:step4a
npm run hosted:rollout:step4a -- --apply   # writes "1" to worker/wrangler.toml locally
# commit worker/wrangler.toml, then step 4b
```

**Rollout step 4b — deploy + verify production:**

```bash
npm run hosted:rollout:step4 -- --deploy
npm run hosted:rollout:step4 -- --verify
OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step4 -- --verify
```

**Rollout step 5a — pin Cloudflare dashboard (do this first, manual):**

```bash
npm run hosted:rollout:step5a
```

See [`HOSTED_STEWARD_CF_DASHBOARD.md`](HOSTED_STEWARD_CF_DASHBOARD.md).

**Rollout step 5b — E6.2 CI secret + verify:**

```bash
npm run hosted:rollout:step5
npm run hosted:rollout:step5 -- --verify
OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step5 -- --verify
```

**Rollout step 6 (script):**

```bash
npm run hosted:rollout:step6
# Full regression before steward announcement:
npm run hosted:rollout:step6 -- --verify
npm run hosted:rollout:step6 -- --vitest   # step 6a (Vitest) only
npm run hosted:rollout:step6 -- --e2e      # step 6b (Playwright) only
```

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
