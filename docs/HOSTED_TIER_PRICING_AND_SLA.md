# Hosted tier — pricing & SLA (M4 one-pager)

**Status:** **Governance draft** — numbers and commercial model require sign-off before billing code  
**Milestone:** M4 of [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md)  
**Depends on:** [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) (M2) · [`HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md`](HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md) (M3)  
**Audience:** Governance, product, ops, legal  
**Not in this doc:** Stripe integration, checkout UI, tax (E5)

---

## Summary

**Hosted steward** is optional infrastructure for stewards who want **higher automatic check budgets**, optional **live-proof push**, and **published availability targets** — not stronger identity claims or scan analytics.

This one-pager locks **planning defaults** for governance review: commercial model, illustrative price bands, fair-use, subscription lifecycle, SLA targets, and refund/downgrade rules. **Dollar amounts are placeholders** until ops models Cloudflare cost per hosted account.

---

## Product naming (governance — Q1)

| Option | Use when | Risk |
|--------|----------|------|
| **Hosted steward** (planning default) | Public copy, docs | Neutral; not “Pro verified” |
| **Commons operator plan** | B2B / second operator | Confuses with Commons Pass (Phase D) |
| **Pro steward** | Marketing only if vetted | Sounds like paid verification |

**Decision needed:** pick one customer-facing name before M5 FAQ copy. **Do not** use “Premium verification,” “Pro human,” or “Verified+.”

---

## What is sold (one sentence)

> **Hosted steward** pays for **resolver capacity and steward-side notification** on cards you already own — not for creating cards, vouching, or seeing who scanned you.

| Included (planning) | Excluded (always) |
|---------------------|-------------------|
| Higher auto poll caps ([`hosted_steward_v1`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md)) | Card create / public scan |
| Optional SSE live-proof push (M3) | Scan analytics |
| Published SLA (below) | Stronger trust labels |
| Fair-use multi-card wallet | Cross-tab or marketing push |
| Manual checks (uncapped) | Commerce / merch unlock |

---

## Commercial model (governance — Q9)

**Planning recommendation:** **per steward account / month** on the reference operator, with optional **org seat pack** after Commons Pass (Phase D).

| Model | Verdict | Notes |
|-------|---------|-------|
| Per **account** (individual steward) | **Default v1** | Matches M2 `account_id` billing subject |
| Per **device** | No | Shared browsers; unfair |
| Per **profile_id** | No | Penalizes many cards; wrong unit |
| Pure **usage** (per GET) | Defer | Surprise bills; keep internal metering only |
| Per **operator instance** (B2B) | Federation milestone | Separate price list for operator #2 |

**Payment provider (planning):** Stripe (or member-governed equivalent per [`DEMOCRATIC_INFRASTRUCTURE.md`](DEMOCRATIC_INFRASTRUCTURE.md)) — **governance must approve** before E5.

**Commerce firewall (unchanged):** Shopify, Printify, donations, and founding merch **must not** grant `steward.hosted` ([`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md)).

---

## Plans & illustrative pricing (Q9 — placeholders)

Governance sets final USD/EUR. Engineering uses **`plan_id`** only.

| `plan_id` | Audience | Illustrative price | Entitlements |
|-----------|----------|-------------------|--------------|
| `reference_free` | Everyone | **$0** | Shipped caps (400 auto polls/day/device, etc.) |
| `hosted_steward_v1` | Individual power steward | **$12–25 / month** (TBD) | M2 hosted row |
| `hosted_org_v1` | Orgs (future) | **Custom** | Seat pack + `org.policy.*` |

**Annual option (planning):** 2 months free if paid yearly — reduces churn; same entitlements.

**Trial (planning):** **14 days** `trialing` at full hosted caps; card linking required; no credit card optional trial only if abuse controls exist.

**Founding / early tester:** May receive **account override** (extended trial or discounted `plan_id`) — **not** a different trust label; document in support runbook, not protocol.

---

## Fair use (governance — Q6)

Locks behavior when M2 returns `poll.live_proof.auto_daily_cap: null` (“unlimited within fair use”).

### Normative definition

> **Fair use** means automatic live-proof and network polling **proportionate to steward-operated cards and real stranger demand**, not continuous monitoring of the public resolver or third-party cards.

### Guardrails (planning defaults — ops sign-off)

| Guardrail | `reference_free` | `hosted_steward_v1` |
|-----------|------------------|---------------------|
| Auto live-proof GETs / **device** / UTC day | **400** (shipped) | **4,000** (M2) or fair-use path |
| Auto live-proof GETs / **account** / UTC day (server) | N/A | **50,000** soft → **100,000** hard |
| `notify.push.delivered` / account / day | 0 | **10,000** |
| SSE connections / account | 0 | **5** (M3) |
| Manual **Check network** / **Check for live proof** | Uncapped | Uncapped |
| Stranger scan page poll | Unchanged | Unchanged |

**Client rule:** If API returns `null` for `poll.live_proof.auto_daily_cap`, client uses **4,000/day/device** until account-level server counter approaches soft cap; server returns **429** at hard cap ([`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) § Fair use).

**Abuse:** Operator may set `status: suspended` with notice; independent **per-IP** limits (O2). No silent throttle of public scan/create.

---

## SLA (governance — Q10)

**Scope:** reference operator **hosted** features only. Free tier remains **best effort** (including `1027` degraded).

### Availability

| Metric | Target | Measurement |
|--------|--------|-------------|
| Resolver **uptime** (health + scan resolve) | **99.5%** / calendar month | Excludes published maintenance (≤4h/month, 7d notice) |
| Entitlement API `GET …/steward/entitlements` | Same as resolver | Included in uptime |
| **Credit** (if missed) | **10%** monthly fee per 0.5% below target, cap 100% | Governance approves credit policy |

### Live-proof responsiveness (hosted + push healthy)

| Metric | Target | Notes |
|--------|--------|-------|
| Push `live_proof.pending` delivery (p95) | **≤ 5 s** after stranger `POST` challenge | M3 SSE path; excludes client offline |
| Push delivery (p99) | **≤ 15 s** | |
| Fallback poll path (push down) | **≤ 60 s** to discover pending (p95) | Hosted idle interval 30s + one GET |
| Stranger scan page | **Unchanged** | Stranger still polls; not steward SLA |

### Support

| Tier | Response target |
|------|-----------------|
| Hosted steward | **2 business days** email (planning) |
| Free / public | Best effort community / docs |

**Exclusions:** Client bugs, user network, Safari permission denied, DDoS, force majeure, federation on non-reference operators (their SLA).

---

## Subscription lifecycle (Q7)

Aligns with M2 § Lifecycle.

| State | Steward experience | Billing |
|-------|-------------------|---------|
| `trialing` | Full hosted caps | No charge until trial end |
| `active` | Hosted caps + push if entitled | Charged per period |
| `past_due` | **7 days** grace at hosted caps | Retry payment |
| `canceled` | Hosted until `effective_until` | No renewal |
| `expired` | **`reference_free` immediately** | Stopped |
| `suspended` | Free tier + support message | Paused |

### Downgrade & portability (Q7, Q8)

| Rule | Detail |
|------|--------|
| **Cards & keys** | **Never** deleted or disabled by lapse |
| **Public scan / vouch** | **Unchanged** |
| **Push** | Subscriptions cleared within **24h** of `expired` |
| **Session** | Steward tokens revoked on `expired`; re-login to resubscribe |
| **Watch preference** | Device `hc_watch_live_proof` unchanged (user data) |
| **Export** | Cards remain portable Ed25519 documents; no operator lock-in |
| **Refund** | **Pro-rata** within **14 days** of first charge if &lt;10% of monthly fair-use consumed; otherwise credit next period (governance) |

**Never:** downgrade that revokes cards, removes vouches, or changes verification labels.

---

## Revenue use (positioning)

Hosted fees fund:

1. **Workers Paid** headroom and Durable Objects (push P2)
2. **Abuse response** and fair-use enforcement
3. **Second operator** / federation credibility — not ads or scan data

---

## Governance checklist (before E5 billing code)

| # | Decision | Default in this doc | Owner |
|---|----------|---------------------|-------|
| G1 | Customer-facing product name | Hosted steward | Product |
| G2 | Price band (`hosted_steward_v1`) | $12–25/mo TBD | Governance |
| G3 | Trial length | 14 days | Product |
| G4 | Fair-use hard caps | Table § Fair use | Ops |
| G5 | SLA uptime % | 99.5% | Ops + legal |
| G6 | Push latency SLA | p95 ≤ 5s | Ops |
| G7 | Refund window | 14 days pro-rata | Legal |
| G8 | Payment provider | Stripe pending approval | Ops |
| G9 | Sell on reference only at launch | Yes | Governance |
| G10 | Org plan `hosted_org_v1` | Defer post–Commons Pass | Product |

**Sign-off:** `[ ]` Governance · `[ ]` Ops · `[ ]` Legal — date: _________

---

## Cross-references

| Doc | Relationship |
|-----|----------------|
| [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md) | Product boundaries |
| [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) | Caps, lifecycle, metering |
| [`HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md`](HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md) | Push SLA dependency |
| [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) | Free-tier ceiling unchanged |
| [`SKEPTIC_FAQ.md`](SKEPTIC_FAQ.md) | M5 public copy |
| [`LAUNCH_LANGUAGE_KIT.md`](LAUNCH_LANGUAGE_KIT.md) | M5 lines |

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-26 | M4 initial governance one-pager (planning defaults) |
