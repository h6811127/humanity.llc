# Vouch integrator policy guide (recency, live control, not KYC)

**Status:** Shipped guidance for v1 integrators  
**Scope:** How to gate actions using Humanity Card scan state without overclaiming identity  
**Threat IDs:** I-02 (`VH = KYC`), I-03 (stale trust), I-01/I-04 (holder vs owner confusion)

---

## Why this guide exists

`Vouched Human` is a social trust signal, not legal identity, not KYC, and not global uniqueness.

Integrators should make decisions with an explicit policy object instead of a single boolean.

---

## Non-negotiable rules

1. Never treat `Vouched Human` as legal identity proof.
2. Always enforce card status (`active` only) at decision time.
3. Always apply recency policy to vouch trust.
4. Require live control for handoff, in-person high-risk actions, or account recovery.
5. Show mechanism to users ("count + recency + status"), not vague claims.

---

## Recommended policy object

Use a policy object in your app config (or per route/action):

```json
{
  "minVouchCount": 3,
  "maxLatestVouchAgeDays": 90,
  "requireCardStatus": ["active"],
  "requireLiveControl": false,
  "denyIfMethodIn": [],
  "copyMode": "mechanism-visible"
}
```

Suggested defaults by risk tier:

- Low risk (comments/community read): `maxLatestVouchAgeDays = 180`, no live control.
- Medium risk (post, DM, moderation access): `maxLatestVouchAgeDays = 90`, no live control.
- High risk (money, custody, role transfer, event handoff): `maxLatestVouchAgeDays = 30` and `requireLiveControl = true`.

---

## Decision checklist (runtime)

For each gated action:

1. Fetch latest resolver state at action time.
2. Reject if card or verification state is revoked/suspended/inactive.
3. Verify `vouch_count >= minVouchCount`.
4. Verify `latest_accepted_vouch_at` is within `maxLatestVouchAgeDays`.
5. If `requireLiveControl`, complete live control proof before accepting.
6. Log which rule allowed/denied the action.

---

## Copy requirements (user-visible)

Use mechanism-visible language:

- Good: "Vouched by 3 humans on this network. Latest vouch 12 days ago."
- Good: "Control was proven moments ago. This is not legal identity proof."
- Bad: "Identity verified."
- Bad: "KYC complete."
- Bad: "Bot-proof human."

---

## Reference pseudocode

```ts
function allowAction(scanState: ScanState, policy: TrustPolicy): Decision {
  if (!policy.requireCardStatus.includes(scanState.card.status)) {
    return deny("card_status");
  }
  if (scanState.verification.state !== "verified_human" && scanState.verification.state !== "steward") {
    return deny("verification_state");
  }
  if (scanState.verification.vouch_count < policy.minVouchCount) {
    return deny("vouch_count");
  }
  if (isOlderThanDays(scanState.verification.latest_accepted_vouch_at, policy.maxLatestVouchAgeDays)) {
    return deny("stale_vouch");
  }
  if (policy.requireLiveControl && !scanState.liveControl?.ok) {
    return deny("live_control_required");
  }
  return allow();
}
```

---

## Anti-misuse guardrails for integrators

- Do not store or infer legal identity labels from vouch state.
- Do not collapse trust into one immutable vendor boolean.
- Re-check status/recency at each sensitive action, not only at signup.
- Escalate to manual review when policy signals conflict.

---

## Related docs

- [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) - Integrator misuse threats (`I-02`, `I-03`)
- [`VOUCH_TRUST_POSITIONING.md`](VOUCH_TRUST_POSITIONING.md) - positioning and "what vouch proves"
- [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) - trust levels and copy boundaries
- [`M7_LIVE_CONTROL_ALPHA.md`](M7_LIVE_CONTROL_ALPHA.md) - live control proof flow
