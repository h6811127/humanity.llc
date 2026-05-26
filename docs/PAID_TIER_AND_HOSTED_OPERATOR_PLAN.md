# Hosted steward tier (paid) — planning

**Status:** **Planning only** — no billing, entitlements, or push implementation in this phase  
**Opened:** 2026-05-26  
**Audience:** Product, governance, operators, engineering (for later build)  
**Supersedes:** Scattered “Phase 10 / paid tier” bullets in [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) only for **product definition** — budget phases 1–9 remain the shipped free-tier contract.

**Related:** [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) · [`DEVICE_OS.md`](DEVICE_OS.md) · [`DEVICE_INBOX.md`](DEVICE_INBOX.md) · [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) · [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) · [`PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`](PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md) · [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) · [`SKEPTIC_FAQ.md`](SKEPTIC_FAQ.md) · [`DEMOCRATIC_INFRASTRUCTURE.md`](DEMOCRATIC_INFRASTRUCTURE.md)

---

## Summary

The **reference operator** (`humanity.llc`) is a **public, data-minimal resolver** with a **device shell** that must not treat every steward as unlimited infrastructure. Phases 1–9 shipped **intent-based polling**, caps, and honest copy so a free site cannot be turned into a 24/7 wallet monitoring network by default.

A **hosted steward tier** (working name; not final marketing) is the **commercial and product layer** for stewards and organizations who **choose** higher availability: more automatic checks, higher request budgets, optional **server-mediated live-proof notification**, and published SLAs — **without** changing the trust model into surveillance or “verified forever” theater.

This document defines **what paid means**, **what stays free**, **what we refuse to sell**, and **what must be decided before any code**. It does **not** specify payment provider, prices, or implementation tasks.

---

## Problem statement

| Stakeholder | Pain today (reference / free) |
|-------------|------------------------------|
| **Reference operator** | Workers Free quota (100k/day) is incompatible with “always on” multi-card monitoring; Phases 7–9 mitigate but caps remain (e.g. 400 auto live-proof GETs/day/device). |
| **Power steward** | Wants strangers’ live-proof requests to surface quickly without manually opening the hub or tapping **Check for live proof** on every card. |
| **Organization** | May want a **named hosted resolver** (second operator milestone) with the same protocol, not a different product. |
| **Skeptics** | Fear “paid” means paywalling identity, scan analytics, or weaker privacy for non-payers. |

**Paid tier must solve availability and steward UX for opt-in customers** — not monetize trust labels, vouches, or scan trails.

---

## Product principles (non-negotiable)

Inherited from [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) and [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md):

1. **Stranger pays urgency; steward pays intent** — on the free tier. Paid tier may add **optional, bounded automation** the customer explicitly purchases; it does not remove manual controls.
2. **Not wallet monitoring SaaS** — even on paid: no implied 24/7 guarantee on every saved card unless copy and entitlements say so plainly.
3. **Data minimization** — paid features must not require new operator-held PII or scan analytics ([`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md)).
4. **Federation-ready** — entitlements and push should be definable per **operator** (`hc/v1`), not hard-coded to one Cloudflare account.
5. **Free reference stays usable** — card create, scan, vouch, revoke, manual hub checks, and `/created/` signing remain available without subscription.

---

## Two operators, two contracts

| | **Reference operator (free)** | **Hosted steward tier (paid)** |
|---|------------------------------|--------------------------------|
| **Who** | Public `humanity.llc` bootstrap network | Paying steward or org on reference and/or **federated** operator |
| **Goal** | Prove protocol + honest limits | Reliable steward operations at scale |
| **Device shell** | Same codebase; **tier gates behavior** | Higher caps, optional defaults, optional push |
| **Default watch** | Off (`hc_watch_live_proof === "1"` only) | **Planning:** still off by default unless org policy opts in at enroll |
| **Auto live-proof budget** | 400 GETs / UTC day / device (shipped) | **Planning:** higher cap or “unlimited within fair use” per subscription |
| **Background SW** | Alerts on + watch on + resolver ok; 15 min periodic | **Planning:** may shorten interval or add push (see below) |
| **Network status** | Visible-row-first; large-wallet round-robin | **Planning:** faster refresh cadence or higher parallel cap |
| **Server push** | None (device polling only) | **Planning:** optional WebSocket/SSE/queue notify |
| **SLA** | Best effort; 1027 = degraded | **Planning:** published uptime / response targets |
| **Billing** | None | Subscription or org seat (TBD) |

**Important:** Paid is **not** “create a card.” [`SKEPTIC_FAQ.md`](SKEPTIC_FAQ.md) already states public launch is not a paid gate for identity.

---

## Capability matrix (planning targets)

Use this when writing UX, support, and engineering specs later. Numbers are **illustrative** until ops models exist.

| Capability | Free (reference) | Paid (hosted) — direction |
|------------|------------------|---------------------------|
| Create card / scan / vouch | Yes | Yes (same protocol) |
| Manual **Check network** / **Check for live proof** | Yes | Yes |
| **Watch for live proof** | Opt-in | Opt-in; org may **recommend** on enroll |
| Auto live-proof polls (tab) | Capped; leader tab | Higher cap or fair-use pool per account |
| Live-proof OS alerts (SW) | Watch + permission required | Same gates; may add push-backed wake |
| Multi-card wallet (10+) | Supported with warnings | Supported with **published** fair-use |
| Stranger scan page poll | Unchanged | Unchanged (stranger-side) |
| Resolver `status` / challenge GET | ETag / 304 (shipped) | Same; may add operator-side cache TTL |
| Scan analytics | **Never** | **Never** |
| “Verified human” upsell | **Never** | **Never** |

---

## Entitlement model

**Canonical spec (M2):** [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) — registry keys, HTTP API shapes, metering events, enforcement points, free-tier baseline mapping.

Summary:

| Entitlement (examples) | Attached to | Notes |
|------------------------|-------------|--------|
| `steward.hosted` | `account_id` on operator | Master switch |
| `poll.live_proof.auto_daily_cap` | `account_id` + `device_id` counter | Overrides 400/day |
| `poll.network.max_parallel` | Plan | Overrides large-wallet cap |
| `notify.push.live_proof` | Account | Enables push path (M3) |
| `watch.default_on` | Org policy only | Controversial; requires consent UX |

**Cross-operator:** federated operators issue their own plans; reference site sells `hosted_steward_v1` first.

---

## Server push (companion to paid)

[`DEVICE_INBOX.md`](DEVICE_INBOX.md) Phase D: **no server push** in production today; SW + tab polling only.

**M3 RFC:** [`HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md`](HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md) — SSE MVP, DO scale path, event types, threat model, client integration.

### Why push belongs with paid

- Push reduces **steward-side** poll volume when strangers wait — aligns with budget goals **if** strangers still poll the scan page and stewards receive **one** notify event instead of N wallet round-robins.
- Free tier keeps polling to protect shared quota; paid customers fund Worker/Durable Object cost.

### Constraints

| Rule | Rationale |
|------|-----------|
| Push carries **only** `live_proof` (same as OS policy) | No cross-tab, no marketing, no resolver health spam |
| Stranger still uses scan UI | No hidden steward polling to “discover” challenges |
| TTL minutes | Matches live-control challenge TTL; no long-term notify history on operator |
| Opt-in + watch (or paid equivalent) | Same moral model as today |
| No scan analytics in push payload | Policy alignment |

### Architecture options (evaluate later)

| Option | Pros | Cons |
|--------|------|------|
| **A. SSE from Worker** | Simple subscribe per steward session | Connection limits; auth |
| **B. WebSocket + Durable Object** | Real fan-out; per-operator room | Cost + complexity |
| **C. Queue + webhook to mobile app** | Future native clients | Out of v1 web scope |
| **D. Email/SMS relay** | No persistent socket | Not “instant”; PII risk |

**Recommendation for planning:** treat **B** as the long-term hosted shape; **A** as a reference MVP if paid launches before DO investment.

**Dependency:** identity for “which steward owns this card” is already **cryptographic** (`profile_id` + keys on device) — push must not leak private keys; notify device tokens only.

---

## Billing and commercial (undecided)

Document options; **do not pick** in this planning pass without governance.

| Model | Fits | Risks |
|-------|------|-------|
| **Per steward seat** | Individual power users | Hard to attribute Worker cost on shared devices |
| **Per org** (Commons Pass future) | Phase D organizer layer | Scope creep |
| **Per operator instance** | Federation milestone | B2B hosting, not consumer |
| **Usage tier** (requests/month) | Aligns with Cloudflare bill | Complex metering; surprises users |

**Revenue use (positioning):** fund Workers Paid, abuse response, and **second operator** — not ad targeting.

**Commerce firewall (existing):** Shopify/Printify purchases must **not** grant `steward.hosted` ([`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md)).

---

## Trust, privacy, and public copy

### What we say publicly

- **Free:** “Resolver truth when you look; automatic checks are opt-in and capped on the public reference network.”
- **Paid:** “Higher limits and optional instant live-proof alerts for stewards who run many cards or events — not more surveillance, not stronger identity claims.”

### What we never say

- “Upgrade to see who scanned you.”
- “Premium verification.”
- “Always-on monitoring included.”

### Skeptic FAQ (future addition)

When implementation nears, add a **Hosted tier** section to [`SKEPTIC_FAQ.md`](SKEPTIC_FAQ.md) linking here — separate from “founding cohort” and “blockchain.”

---

## Operations and infrastructure

| Topic | Free reference | Paid hosted |
|-------|----------------|-------------|
| Cloudflare plan | Workers Paid required for production stability (Phase 0) | Same + budget headroom per customer |
| Rate limits | Per-IP (planned O2) | Per-account + per-IP |
| Monitoring | Daily request alerts | Per-tenant dashboards (TBD) |
| Abuse | 1027 fail-closed | Fair-use suspension with notice |

**Metering candidates (for later spec):**

- `GET …/status`
- `GET …/live-control/challenges`
- Push fan-out messages
- D1 reads (if push triggers fewer blind polls)

---

## What we will not sell

| Forbidden | Why |
|-----------|-----|
| Scan analytics or “who viewed my QR” | Contradicts [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) |
| Stronger verification label for money | [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) |
| Required paid account to create a card | [`SKEPTIC_FAQ.md`](SKEPTIC_FAQ.md) |
| Continuous monitoring of all saved cards by default | Request budget principles |
| Cross-tab or marketing push | [`DEVICE_INBOX.md`](DEVICE_INBOX.md) |
| Legal identity / KYC bundle | Out of product |

---

## Relationship to federation

[`PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`](PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md): second operator proves protocol credibility.

**Planning stance:**

- **Hosted tier** is a **product packaging** on top of any compatible operator.
- Reference operator may be the **first** seller; co-op / union operators may set their own prices and caps.
- Technical Standards must gain a **optional** `operator.capabilities` or entitlement document — **future standards revision**, not v1.0 silent change.

---

## Open questions (resolve before implementation)

| # | Question | Owner |
|---|----------|--------|
| Q1 | Product name: “Hosted,” “Pro steward,” “Commons operator plan”? | Product |
| Q2 | Sell on reference only or white-label for operator #2? | Governance |
| Q3 | Per-device vs per-account entitlements? | **Planning default:** account + device-scoped counters — see M2 § Identity model |
| Q4 | Can orgs force watch on for members? (consent) | Governance |
| Q5 | Push MVP: SSE vs Durable Object? | **RFC default:** P1 SSE, P2 DO — see M3 |
| Q6 | Fair-use definition for “unlimited” polls | Ops |
| Q7 | Refund / downgrade behavior when subscription lapses | Product |
| Q8 | Export/portability if user leaves paid but keeps cards | Federation |
| Q9 | Stripe vs member-governed billing | Ops |
| Q10 | SLA numbers (uptime, notify latency) | Ops + legal |

---

## Proposed documentation milestones (before code)

| Step | Deliverable | Status |
|------|-------------|--------|
| M1 | This plan (product + boundaries) | **This doc** |
| M2 | **Entitlement & metering spec** (fields, APIs, no UI) | **[`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md)** |
| M3 | **Push architecture RFC** (threat model + protocol messages) | **[`HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md`](HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md)** |
| M4 | **Pricing & SLA one-pager** (governance-approved) | Not started |
| M5 | **Skeptic FAQ + launch language** updates | Not started |
| M6 | **Technical Standards** delta (optional hosted extensions) | Not started |
| M7 | **DEVICE_OS_REQUEST_BUDGET** paid-tier row + test plan | Partial (link from budget doc) |
| M8 | Implementation epics (only after M2–M6) | Not started |

---

## Future implementation map (do not start yet)

For traceability when build begins — **not scheduled**:

| Epic | Depends on | Touches (expected) |
|------|------------|-------------------|
| E1 Account + entitlement API | M2 | Worker auth, D1 |
| E2 Client tier probe + UI gates | M2, M7 | `device-hub-*`, budget modules |
| E3 Raised caps / config per tier | M2 | `device-live-control-poll-budget-core`, scale core |
| E4 Push channel | M3 | Worker DO or SSE, `device-inbox`, SW |
| E5 Billing webhooks | M4, M9 | External Stripe, operator admin |
| E6 Ops dashboards | M4, M6 | Cloudflare analytics |

---

## Cross-reference: request budget Phase 10

In [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md), **Phase 10** is renamed in planning to **“Hosted tier + push”** and **defers implementation** to this document.

| Budget phase | Hosted tier interaction |
|--------------|-------------------------|
| 1–9 (shipped) | Defines **free-tier ceiling**; paid must not regress these defaults for anonymous users |
| 10 (planned) | Entitlements + optional push — see § Server push and § Entitlement model |

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-26 | **M3:** [`HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md`](HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md) |
| 2026-05-26 | **M2:** [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) |
| 2026-05-26 | Initial planning doc (no implementation) |
