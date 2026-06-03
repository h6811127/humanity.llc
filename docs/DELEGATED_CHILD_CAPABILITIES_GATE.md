# Delegated child capabilities — product gate (step 17)

**Status:** **Deferred** — do not implement resolver routes, signing keys, or steward UI until a concrete team/event pilot demands delegation.

**Canonical model:** [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) § Delegated child capabilities (future) · implementation sequence step 17.

---

## Why deferred

Steps **1–16** of the root-card / child-object sequence are **shipped**. Stewards can:

- Create a general root, add status plates and lost-item relays under it, issue scan links, update/disable objects, see nested rows in **My cards** / hub, and reconcile from resolver list truth — all with the **root owner or recovery key**.

Delegated child keys add custody, revocation, and audit surface. The doc requires them only when a **real** operational need cannot be met by “volunteer opens `/created/` with root keys” or short-lived root-key handoff.

---

## Product gates (all required before step 17 code)

| # | Gate | Evidence |
|---|------|----------|
| G1 | **Named pilot** with steward + operator sign-off | Event, shop, or coalition name; link to runbook or brief |
| G2 | **Concrete capability matrix** — who may do what, on which `object_id`(s), until when | Filled row in § Capability templates below |
| G3 | **Root-key handoff rejected** — pilot tried root-key / recovery path and documented why it fails (latency, staffing, device policy) | Short postmortem or QA notes |
| G4 | **Anti-surveillance review** — delegation cannot read scans, cannot grant human trust, cannot vouch | Sign-off against [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) |
| G5 | **Revocation story** — root can revoke delegation without revoking root card; delegated key cannot escalate | Written in capability spec before API design |

Until **G1–G5** are satisfied, step 17 stays **docs-only** for resolver routes, D1 migration, and steward UI.

---

## Engineering prep (shipped — no routes)

Pure verification helpers ship ahead of gates so resolver wiring is a thin slice when a pilot clears G1–G5:

| Surface | Module | Status |
|---------|--------|--------|
| Capability document shape validation | `worker/src/live-object/delegation-spec.ts` `validateDelegatedCapabilityShape` | Shipped |
| Scope / expiry / operation access check | `evaluateDelegatedCapabilityAccess`, `isDelegatedCapabilityExpired` | Shipped |
| Vitest (shape + access boundaries) | `worker/tests/live-object-delegation-spec.test.ts`, `worker/tests/delegated-child-capability.test.ts` | Shipped |

**Still blocked on G1–G5:** D1 `delegated_capabilities` table, resolver acceptance of delegated signer, `/created/` Manage issuance UI.

```bash
npm run worker:test -- worker/tests/live-object-delegation-spec.test.ts worker/tests/delegated-child-capability.test.ts
```

## Capability templates (fill before engineering)

| Need | Scope | Expires | Revoke path | Human trust |
|------|-------|---------|-------------|-------------|
| Event volunteer updates one sign | `object_id` + `update` only | Event end + 24h | Root revoke delegation + disable object | **No** |
| Shop employee replaces one print QR | `print_artifact_id` + `issue-qr` / `revoke-qr` | Shift end | Root revoke delegation | **No** |
| Organizer emergency object revoke | Bounded `object_id` set + `revoke` | Campaign end | Root revoke delegation | **No** |

Delegated payloads must be **root-signed**, **scoped**, **expiring**, and **revocable** — never a second human verification path.

---

## Engineering checklist (when gates pass)

First slice should be minimal:

1. **Schema** — [`DELEGATED_CHILD_CAPABILITY_SCHEMA.md`](DELEGATED_CHILD_CAPABILITY_SCHEMA.md) (draft RFC; no migration until G1–G5 pass).
2. **Resolver** — verify root-signed delegation + enforce scope on existing child-object routes before accepting delegated signer.
3. **Steward UI** — issue/revoke delegation on `/created/` Manage; never on scan or `/create/`.
4. **Tests** — scope boundary, expiry, root override, no vouch/trust fields on delegation.

Do **not** ship delegation ahead of the root-card tree UX (steps 13–16) — that sequence is complete.

---

## Related product gates (outside step 17)

| Lane | Next gate | Doc |
|------|-----------|-----|
| Merch Tier 1 live checkout | M5 stranger runbook | [`M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md) |
| Hosted steward production | Rollout step 6 verify | [`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md) |
