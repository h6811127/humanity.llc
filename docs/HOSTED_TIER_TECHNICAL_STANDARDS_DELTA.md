# Hosted tier — Technical Standards delta (M6)

**Status:** **Planning annex** — optional extensions to [`Technical Standards v1.0.md`](Technical%20Standards%20v1.0.md); **no implementation**  
**Milestone:** M6 of [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md)  
**Depends on:** M2 [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) · M3 [`HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md`](HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md)  
**Audience:** Standards editors, engineering, federation operators  
**Naming note:** This is **hosted-tier planning M6**, not architecture roadmap **M6 vouching** ([`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md)).

---

## Summary

[`Technical Standards v1.0.md`](Technical%20Standards%20v1.0.md) defines the **required** `hc/v1` resolver contract: cards, scan, live control, revoke, federation headers. **Hosted steward** features are **optional operator extensions** — an operator MAY omit them entirely and remain v1.0 compatible.

This delta specifies:

1. **`steward_account_link_v1`** — signed link from card owner key to billing `account_id`
2. **`operator.capabilities`** — discovery document for optional hosted endpoints
3. **Optional steward HTTP API** — entitlements, session, push (normative shapes cross-ref M2/M3)
4. **Compatibility rules** — what federated operators must and must not do

**Ratification path:** Merge into **Technical Standards v1.1** (or a ratified annex) after M4 governance sign-off — **not** a silent edit to v1.0.

---

## Design principles

| # | Rule |
|---|------|
| P1 | **Optional extensions** — clients MUST work on operators without hosted features |
| P2 | **No new trust labels** — entitlements change caps, not verification level |
| P3 | **Owner key for link** — same moral model as revoke; session is convenience only |
| P4 | **Operator-scoped** — `operator_id` in signed payloads; no cross-operator sessions |
| P5 | **Data minimization** — extensions MUST NOT require legal ID, scan analytics, or private keys on operator |

---

## Versioning & discovery

### Extension identifier

```text
hosted_steward
```

Extension version (planning): **`1`**

### `GET /.well-known/hc/v1/operator/capabilities`

**Auth:** None (public)  
**Cache-Control:** `public, max-age=3600`

**Response 200 (planning):**

```json
{
  "version": "1.0",
  "protocol_version": "1.0",
  "operator": {
    "id": "humanity.llc",
    "display_name": "Humanity Commons Reference Operator"
  },
  "required_endpoints": {
    "health": "/.well-known/hc/v1/health",
    "cards": "/.well-known/hc/v1/cards"
  },
  "extensions": {
    "hosted_steward": {
      "version": 1,
      "optional": true,
      "status": "planning",
      "endpoints": {
        "capabilities": "/.well-known/hc/v1/operator/capabilities",
        "plans": "/.well-known/hc/v1/operator/plans",
        "entitlements": "/.well-known/hc/v1/steward/entitlements",
        "session": "/.well-known/hc/v1/steward/session",
        "push": "/.well-known/hc/v1/steward/push"
      },
      "documentation": "https://humanity.llc/docs/HOSTED_TIER_ENTITLEMENTS_AND_METERING.md"
    }
  }
}
```

**Client rule:** If `extensions.hosted_steward` is absent, behave as **`reference_free`** ([`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) § Free-tier baseline).

### `GET /.well-known/hc/v1/operator/plans` (optional public catalog)

**Auth:** None  
**Purpose:** Publish `plan_id` list and public entitlement keys (not per-account overrides).

**Response 200 (planning):**

```json
{
  "version": "1.0",
  "operator": { "id": "humanity.llc" },
  "plans": [
    {
      "plan_id": "reference_free",
      "plan_version": 1,
      "description": "Default public reference tier",
      "entitlements": {
        "steward.hosted": false,
        "poll.live_proof.auto_daily_cap": 400
      }
    },
    {
      "plan_id": "hosted_steward_v1",
      "plan_version": 1,
      "description": "Optional hosted steward infrastructure",
      "entitlements": {
        "steward.hosted": true,
        "notify.push.live_proof": true,
        "poll.live_proof.auto_daily_cap": 4000
      },
      "commercial": {
        "status": "planning",
        "pricing_document": "HOSTED_TIER_PRICING_AND_SLA.md"
      }
    }
  ]
}
```

**Note:** Dollar amounts stay in [`HOSTED_TIER_PRICING_AND_SLA.md`](HOSTED_TIER_PRICING_AND_SLA.md), not in wire JSON.

---

## Signed payload: `steward_account_link_v1`

Resolves M2 open question **E1**. Links a **`profile_id`** (card owner) to an operator **`account_id`** for entitlement metering and push fan-out.

### When required

| Action | Proof |
|--------|--------|
| First link profile → account | Owner-signed `steward_account_link_v1` |
| Refresh steward session | Valid session token OR new link if expired |
| Prove live control | Unchanged — owner key on `/created/` (`hc_created`) |

### Payload (signed bytes)

The object below is canonicalized with **JCS** (RFC 8785) per Technical Standards §5.4 and signed by the **card owner's active Ed25519 private key** (same key as card creation / revoke).

**Fields signed (before `signature` envelope):**

```json
{
  "type": "steward_account_link_v1",
  "version": "1.0",
  "profile_id": "base58-profile-id",
  "account_id": "acc_opaque_uuid",
  "operator_id": "humanity.llc",
  "device_id": "dev_opaque_uuid",
  "expires_at": "2026-05-26T12:00:00.000Z",
  "nonce": "base58-random-nonce",
  "issued_at": "2026-05-26T11:55:00.000Z"
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `type` | Yes | Literal `steward_account_link_v1` |
| `version` | Yes | `"1.0"` |
| `profile_id` | Yes | Must match card owner public key used in signature |
| `account_id` | Yes | Operator-issued opaque ID; format `acc_` + base58url |
| `operator_id` | Yes | Must match request host operator (§9.6.1) |
| `device_id` | Yes | Client install UUID; attribution only |
| `expires_at` | Yes | **≤ 15 minutes** after `issued_at` |
| `nonce` | Yes | ≥ 16 bytes random; single-use at operator |
| `issued_at` | Yes | ISO 8601 UTC |

### Signature envelope

Same pattern as Technical Standards §5.3 / §8.6:

```json
{
  "type": "steward_account_link_v1",
  "version": "1.0",
  "profile_id": "…",
  "account_id": "acc_…",
  "operator_id": "humanity.llc",
  "device_id": "dev_…",
  "expires_at": "2026-05-26T12:00:00.000Z",
  "nonce": "…",
  "issued_at": "2026-05-26T11:55:00.000Z",
  "signature": {
    "alg": "Ed25519",
    "public_key": "base58-owner-public-key",
    "signature": "base58-signature",
    "signed_at": "2026-05-26T11:55:00.000Z",
    "canonicalization": "JCS"
  }
}
```

### Operator verification

1. Verify JCS signature against card's stored **owner public key** for `profile_id`.
2. Reject if `expires_at` in the past or `issued_at` too far in the future (> 60s skew).
3. Reject if `nonce` replayed.
4. Reject if `operator_id` ≠ this operator.
5. Store `(account_id, profile_id, linked_at)` in `steward_account_profiles` (M2).
6. Issue steward session token (below).

**Threat model:** Stolen link payload within TTL allows session minting → raised poll caps until session expiry; **cannot** sign vouches or live control without private key. Short TTL + nonce limits blast radius.

### Wire submission

Submitted inside `POST /.well-known/hc/v1/steward/session` as `link_proof` (M2). The HTTP body MAY omit redundant top-level `profile_id` if present in `link_proof`.

---

## Optional steward HTTP API (summary)

Normative detail in M2/M3; this section indexes endpoints for standards editors.

| Endpoint | Method | Auth | Required for v1.0? | Spec |
|----------|--------|------|--------------------|------|
| `…/operator/capabilities` | GET | None | No | This doc |
| `…/operator/plans` | GET | None | No | This doc |
| `…/steward/session` | POST | Link proof | No | M2 § HTTP API |
| `…/steward/entitlements` | GET | Bearer session | No | M2 § HTTP API |
| `…/steward/push` | GET | Bearer session, SSE | No | M3 § HTTP API |

### Steward session bearer

| Property | Value |
|----------|--------|
| Header | `Authorization: Bearer <opaque_token>` |
| Optional | `X-HC-Device-Id: <device_id>` |
| Lifetime | 24h sliding (M2) |
| Scope | Entitlements, push subscribe, usage attribution |
| **Not valid for** | Card revoke, vouch sign, live control response |

### Rate limits (extension)

Extends Technical Standards §15 for authenticated steward routes:

| Route class | Planning limit |
|-------------|----------------|
| `steward/session` POST | 10 / hour / IP + 5 / hour / profile_id |
| `steward/entitlements` GET | 60 / hour / account |
| `steward/push` SSE | 5 concurrent / account (M3) |
| Authenticated `…/challenges` GET | Per M2/M4 fair-use counters |

**429** body shape: M2 § Enforcement (`steward_quota_exceeded`).

---

## Push events (extension wire types)

Cross-reference only — full spec: [`HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md`](HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md).

| Event `type` | Required on push channel? |
|--------------|---------------------------|
| `live_proof.pending` | Yes (primary) |
| `live_proof.proven` | Optional |
| `live_proof.expired` | Optional |
| `connection.ack` | Yes on subscribe |
| `connection.error` | On fatal errors |

**Forbidden on steward push channel:** `scan.*`, `vouch.*`, `marketing.*`, `cross_tab.*`

---

## Federation & compatibility

### v1.0 compliance without hosted

An operator **MUST NOT** be rejected as `hc/v1` incompatible for omitting:

- `operator/capabilities` hosted block
- All `steward/*` routes
- Push/SSE

### Hosted on federated operators

| Rule | Detail |
|------|--------|
| Separate billing | Each operator sells own `hosted_steward_v1` (or custom `plan_id`) |
| Session scope | Token from `humanity.llc` invalid on `coop.example` |
| Link signature | `operator_id` in payload MUST match issuing operator |
| Capabilities doc | Each operator publishes own `extensions.hosted_steward` |
| Stranger scan | Unchanged — no entitlement check on public routes |

### Commerce firewall (normative extension)

Operators offering hosted steward **MUST NOT** grant `steward.hosted` or entitlements based on:

- Merch / Shopify / Printify order IDs
- Donation receipts
- Founding cohort membership alone

See [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md).

---

## Terminology additions (proposed §2 delta)

| Term | Definition |
|------|------------|
| **Steward account** | Operator-held billing subject (`account_id`) linked to one or more `profile_id` values |
| **Steward session** | Short-lived bearer token for entitlement fetch and push; not owner authority |
| **Hosted steward extension** | Optional `hosted_steward` capability block in operator capabilities |
| **Reference free tier** | Implicit plan when no hosted extension or session; matches shipped client caps |

---

## Changes to Technical Standards v1.0 (when ratified)

Planned edits for **v1.1** (not applied to v1.0 draft in place):

| Section | Change |
|---------|--------|
| §2 Terminology | Add steward account, session, hosted extension |
| §5.5 Signature use cases | Add `steward_account_link_v1` |
| §9.1 Required endpoints | **No change** — hosted routes stay optional |
| §9.6 Federation | Add §9.6.5 Optional hosted extensions (pointer to this annex) |
| §15 Rate limits | Add steward authenticated route class |
| §18 Change log | v1.1 entry referencing this annex |

**v1.0 operators:** No action required until they choose to sell hosted infrastructure.

---

## Interoperability tests (planning)

When implementation begins (M8 / E1):

| Test | Pass criteria |
|------|---------------|
| Capabilities without hosted | Client uses free caps; no errors |
| Invalid link signature | `401` on session POST |
| Expired link | `401` |
| Cross-operator session | `401` on wrong host |
| Entitlements 304 | ETag matches M2 |
| Push without entitlement | `403` on SSE subscribe |
| Public card create | No session required |

---

## Open questions (post-M6)

| # | Question | Owner |
|---|----------|--------|
| S1 | Ratify as v1.1 vs standalone annex | Governance |
| S2 | Include `device_id` inside signed payload vs HTTP-only | **Planning default:** inside signed payload (binding) |
| S3 | Recovery key may link account? | Defer — owner key only v1 |
| S4 | Public `operator/plans` at launch or account-only | Product |

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-26 | M6 initial Technical Standards delta (planning annex) |
