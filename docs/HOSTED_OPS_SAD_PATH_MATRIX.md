# Hosted ops sad-path matrix

**Status:** Active — billing return + steward session edge cases  
**Date:** 2026-05-29  
**Audience:** Engineering, ops  
**Related:** [`SAD_PATH_COVERAGE_AND_BACKLOG.md`](SAD_PATH_COVERAGE_AND_BACKLOG.md) § Adversarial / ops · [`STEWARD_DEVICE_ROADMAP.md`](STEWARD_DEVICE_ROADMAP.md) · [`HOSTED_TIER_G0_READINESS.md`](HOSTED_TIER_G0_READINESS.md)

---

## Purpose

Hosted steward checkout can return to the device shell **before** signing keys are loaded in the tab. These paths must not silently drop the account link or strand the user without guidance.

---

## Matrix

| ID | Sad path | User behavior | Expected UX / system | Automation |
|----|----------|---------------|----------------------|------------|
| **O1** | Billing return, no tab keys | Stripe `success_url` with `?hc_account_id=acc_…`; wallet label only | Persist `hc_steward_pending_account_id` via `device-steward-billing-return-bootstrap.mjs` (early) + hub **billing pending** line; URL keeps param until linked | `e2e/hosted-tier-billing-return.spec.ts` (test 1) |
| **O2** | Keys load after pending | User opens controls / activates wallet entry | Retry `POST …/steward/session`; clear pending + strip `hc_account_id`; show hosted tier line | Same spec (test 2) |
| **O3** | Entitlements probe / caps | Large wallet + hosted plan | Policy from entitlements; free-tier regression | `e2e/hosted-tier-budget.spec.ts` · `npm run worker:test:hosted-free-tier` |
| **O4** | Push notify fallback | Push fails | Poll/inbox fallback (live proof) | `e2e/hosted-tier-push.spec.ts` |

---

## Automated regression index

| ID | Command |
|----|---------|
| O1–O2 | `npm run e2e:hosted-tier-billing-return` |
| O1–O2 (unit) | `npm run worker:test:hosted-billing-return` |
| Full hosted shell | `npm run e2e:steward-hosted` |
| Rollout gate | `npm run hosted:rollout:verify-path -- --e2e` |

---

## Operator notes

- Stripe `success_url` / `cancel_url`: `npm run hosted:stripe-return-url -- acc_…`
- Do not enable production billing until G8 + [`HOSTED_STEWARD_OPS_RUNBOOK.md`](HOSTED_STEWARD_OPS_RUNBOOK.md)

---

## Changelog

| Date | Notes |
|------|-------|
| 2026-05-29 | Initial matrix; O1–O2 E2E wired into sad-path backlog |
