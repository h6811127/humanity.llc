# Hosted tier — M4 governance sign-off brief

**Status:** For governance / ops / legal review — **not** a substitute for checklist signatures  
**Milestone:** Unblocks **E1** in [`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md)  
**Full SLA & pricing:** [`HOSTED_TIER_PRICING_AND_SLA.md`](HOSTED_TIER_PRICING_AND_SLA.md)

---

## One-sentence product

**Hosted steward** sells **resolver capacity and steward-side notification** on cards the steward already owns — not verification, scan analytics, or card creation.

---

## What approvers are signing off

| Topic | Planning default | Needs change? |
|-------|------------------|---------------|
| **G1 Name** | **Hosted steward** (not Pro / Premium verified) | ☐ |
| **G2 Price** | **$12–25/mo** individual (`hosted_steward_v1`) — ops to set exact USD | ☐ |
| **G3 Trial** | **14 days**, link required | ☐ |
| **G4 Fair use** | **4,000** auto polls/day/device; **50k/100k** account soft/hard | ☐ |
| **G5 SLA uptime** | **99.5%** / month | ☐ |
| **G6 Push latency** | **p95 ≤ 5s** after stranger challenge | ☐ |
| **G7 Refund** | **14 days** pro-rata if &lt;10% fair-use used | ☐ |
| **G8 Payments** | **Stripe** (or member-governed alt.) | ☐ |
| **G9 Launch scope** | Reference operator only at v1 | ☐ |
| **G10 Org plan** | Defer `hosted_org_v1` | ☐ |

Check boxes in [`HOSTED_TIER_PRICING_AND_SLA.md`](HOSTED_TIER_PRICING_AND_SLA.md) § Governance checklist when approved.

---

## What does **not** change at sign-off

- Public **card create**, **scan**, **vouch**, **revoke**, **live control** (stranger-initiated) stay free.
- **Watch for live proof** stays **default off** on reference tier.
- **Merch / founding drop** does **not** grant hosted entitlements.
- No new trust labels or “who scanned you” features.

---

## Read order (15–20 min)

1. This brief  
2. [`HOSTED_TIER_PRICING_AND_SLA.md`](HOSTED_TIER_PRICING_AND_SLA.md) — fair use + lifecycle + SLA  
3. [`SKEPTIC_FAQ.md`](SKEPTIC_FAQ.md) § Is There A Paid Tier? — public framing  
4. [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) § Phase 10 — hosted tier rows (M7) — free vs hosted caps  

Optional depth: [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md), [`HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md`](HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md).

---

## What sign-off unlocks

| After signatures | Action |
|------------------|--------|
| Engineering | **E1** — Worker steward account + entitlements API (feature-flagged staging) |
| Not yet | **E5** billing until **G8** payment provider confirmed |
| Not yet | Public marketing of paid tier until product chooses launch date |

---

## Open items (ok to sign with TBD)

| Item | Owner | Note |
|------|-------|------|
| Exact monthly price in G2 band | Governance + ops | Does not block E1 API work |
| Stripe vs co-op billing (G8) | Governance | Blocks **E5** only |
| Ops cost model per hosted account | Ops | Informs final G2 |

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-26 | M4 governance brief for sign-off meeting |
