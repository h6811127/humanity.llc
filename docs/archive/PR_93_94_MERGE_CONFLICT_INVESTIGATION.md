# PR #93 and PR #94 merge conflict investigation

**Date:** 2026-05-28  
**Branches:** `cursor/child-object-scan-qr-30c9` (PR #93) · `cursor/hosted-rollout-step4a-9f90` (PR #94)  
**Base at investigation:** `main` @ `b52adb20` (includes PR #91 step 4b)

This doc records why the two PRs conflict with `main`, which source wins for each hunk, and the step-by-step resolution order. Use it as the checklist when rebasing or merging.

---

## Summary

| PR | Title (inferred) | Root cause | Resolution strategy |
|----|------------------|------------|---------------------|
| **#93** | Child object QR issue + scan rendering (first slice) | `main` shipped a **superset** on a parallel track: `/issue-qr` route (not `/qrs`), migration `0023_child_object_qr.sql`, disable UI, lost-item relay, scan `childObject` context | **Keep `main` for all code and roadmap docs.** Port only missing **V1 contract** rows from PR #93, rewritten to `/issue-qr`. After merge, PR #93 should contain no divergent implementation. |
| **#94** | Enable `HOSTED_STEWARD_ENABLED=1` (rollout step 4a) | `main` already has step **4a applied** plus step **4b** tooling/CI (PR #91). PR docs still describe step 4b as “next” and reference legacy `hosted:rollout:step4 -- --deploy` | **Keep `main` docs and wrangler comment.** Optionally retain PR’s step-4 wrangler flag assertion test if not duplicated elsewhere. |

Neither PR introduces net-new product behavior once aligned with `main`; both are **catch-up merges** so GitHub can close cleanly.

---

## PR #93 — child object scan QR

### What PR #93 added

- Route `POST …/objects/{object_id}/**qrs**` (see `childObjectQrIssuePath` in `child-object-api-core.mjs`)
- Migration `0023_child_object_qrs.sql`
- Worker mint/issue modules, `child-object-qr.test.ts`
- Docs: implementation sequence steps 8–9 as “QR issue first slice” + “scan rendering next”
- `V1_IMPLEMENTATION_CONTRACTS.md`: `child_object` scope + `/qrs` endpoint

### What `main` already has (superset)

Canonical references:

- [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) § Implementation sequence — steps **8–10 shipped** (issue scan QR, disable plate, lost-item relay)
- [`STATUS_PLATE_PILOT.md`](STATUS_PLATE_PILOT.md) — pilot checklist includes create + update + scan link + disable
- [`STEWARD_DEVICE_ROADMAP.md`](STEWARD_DEVICE_ROADMAP.md) — step 5 **Shipped**
- Code: `POST …/objects/{object_id}/**issue-qr**` (`childObjectIssueQrPath`), `issue-child-object-qr.test.ts`, scan context loads `childObject` row

### API naming (must not mix)

| Surface | PR #93 | `main` (canonical) |
|---------|--------|---------------------|
| Issue route | `/qrs` | `/issue-qr` |
| Path helper | `childObjectQrIssuePath` | `childObjectIssueQrPath` |
| Mint export | `mintChildObjectQrFromSignedCredential` | `mintChildObjectFromSignedCredential` |
| Migration file | `0023_child_object_qrs.sql` | `0023_child_object_qr.sql` |

**Rule:** Always pick **`main`** naming. Do not reintroduce `/qrs` in docs or code.

### Conflicting files and resolution

| File | Conflict | Pick |
|------|----------|------|
| `docs/ROOT_CARD_AND_CHILD_OBJECTS.md` | Steps 8–11 vs 8–10 | **`main`** (full shipped sequence) |
| `docs/STATUS_PLATE_PILOT.md` | Pilot row copy | **`main`** |
| `docs/STEWARD_DEVICE_ROADMAP.md` | Step 5 status; step 6 import | **`main`** |
| `docs/V1_IMPLEMENTATION_CONTRACTS.md` | PR adds `child_object` scope + `/qrs` | **Merge:** add PR’s contract rows with **`/issue-qr`** and `object_id` on QR credential JSON |
| `site/js/child-object-api-core.mjs` | Path helper name/URL | **`main`** (`issue-qr`) |
| `site/js/child-object-update.mjs` | Signing helpers | **`main`** (includes issue-qr client if present) |
| `site/js/object-taxonomy-core.mjs` | Label/copy ordering | **`main`** (child-object scan labels + lost-item relay) |
| `worker/migrations/*` | Two migration filenames | **`main`** only — drop `0023_child_object_qrs.sql` |
| `worker/src/**` (resolver, db, index) | Parallel implementations | **`main`** entirely |
| `worker/tests/*` | `child-object-qr.test.ts` vs `issue-child-object-qr.test.ts` | **`main`** tests only |

### PR #93 resolution steps

1. Merge or rebase `main` into `cursor/child-object-scan-qr-30c9`.
2. For each row in the table above, apply the **Pick** column.
3. Update [`V1_IMPLEMENTATION_CONTRACTS.md`](V1_IMPLEMENTATION_CONTRACTS.md) per § “V1 contract gap” below (on `main` or as a follow-up commit on the rebased branch).
4. Run `npm run worker:test -- worker/tests/issue-child-object-qr.test.ts worker/tests/scan-context.test.ts worker/tests/created-child-object.test.ts`.
5. Confirm PR diff vs `main` is empty or docs-only; close or merge.

### V1 contract gap (port from PR #93, fix path)

Add to `V1_IMPLEMENTATION_CONTRACTS.md` if missing after merge:

- Route table row: `POST …/objects/{object_id}/issue-qr`
- QR credential JSON: `"object_id": null` field documented
- Allowed `scope`: include `child_object`
- Section: **Issue child object QR (shipped)** pointing at `/issue-qr`

---

## PR #94 — hosted rollout step 4a

### What PR #94 added

Single commit `f8eba7c9` — Enable hosted steward rollout flag:

- `worker/wrangler.toml`: `HOSTED_STEWARD_ENABLED = "1"`
- Docs: step 4a “applied in repo”; step 4b still “next” with `hosted:rollout:step4 -- --deploy`
- `worker/tests/hosted-rollout-step2.test.ts`: removed assertion that flag defaults to `"0"`
- `worker/tests/hosted-rollout-step4.test.ts`: added assertion flag is `"1"`
- `site/js/build-meta.mjs`: deploy stamp bump (incidental)

### What `main` already has

Canonical references:

- [`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md) § Production rollout — **4a Shipped**, **4b Shipped** (step4b script + CI post-deploy verify)
- [`HOSTED_TIER_G0_READINESS.md`](HOSTED_TIER_G0_READINESS.md) — step 4b uses `hosted:rollout:step4b` and `post-deploy-smoke`
- [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) priority **3** — step 4b + scan smoke in progress
- [`STEWARD_DEVICE_ROADMAP.md`](STEWARD_DEVICE_ROADMAP.md) step **2** — step 4b ✅
- PR #91 merged: `hosted-rollout-step4b`, `deploy-worker.yml` verify

### Conflicting files and resolution

| File | Conflict | Pick |
|------|----------|------|
| `docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md` | 4b “Shipped” vs “Next” | **`main`** |
| `docs/HOSTED_TIER_G0_READINESS.md` | PR adds “step 4a applied” status line | **`main`** body; optional one-line “4a applied — proceed to 4b” is already implied |
| `docs/MERCH_FUNNEL_MVP.md` | Priority 3 status row | **`main`** |
| `worker/wrangler.toml` | Comment wording | **`main`** (`G0 signed (2026-05-27)…`) |
| `worker/tests/hosted-rollout-step2.test.ts` | Flag-off test removed in both | **`main`** |
| `worker/tests/hosted-rollout-step4.test.ts` | PR adds flag-on test | **Keep test** if not in `main` (harmless guard) |
| `site/js/build-meta.mjs` | Deploy stamp | **`main`** — do not commit stale stamp from PR |

### PR #94 resolution steps

1. Merge or rebase `main` into `cursor/hosted-rollout-step4a-9f90`.
2. Accept **`main`** for all docs and `wrangler.toml`.
3. If `hosted-rollout-step4.test.ts` on `main` lacks the `HOSTED_STEWARD_ENABLED = "1"` assertion, add it (from PR #94).
4. Drop `build-meta.mjs` changes from the PR branch.
5. Run `npm run worker:test -- worker/tests/hosted-rollout-step4.test.ts worker/tests/hosted-rollout-step2.test.ts`.
6. PR should merge as no-op or test-only delta; close after verify.

---

## Execution order

1. **Document** — this file (done).
2. **PR #94 first** — smaller surface; unblocks hosted rollout doc consistency.
3. **PR #93 second** — larger code overlap; depends on canonical `/issue-qr` docs from step 2’s `main` tip.
4. **V1 contract** — fill gap on whichever branch lands last (prefer `main` if PR #93 becomes empty).

---

## Verification commands

```bash
# PR #94
npm run worker:test -- worker/tests/hosted-rollout-step2.test.ts worker/tests/hosted-rollout-step4.test.ts worker/tests/hosted-rollout-step4b.test.ts

# PR #93
npm run worker:test -- worker/tests/issue-child-object-qr.test.ts worker/tests/scan-context.test.ts worker/tests/created-child-object.test.ts worker/tests/object-taxonomy-core.test.ts
```

---

## Related docs

- [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md)
- [`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md)
- [`SCAN_WORKER_1101_POSTMORTEM.md`](SCAN_WORKER_1101_POSTMORTEM.md) — migration `0023` before scan deploy

---

## Resolution (2026-05-28)

| PR | Branch | Action | Result |
|----|--------|--------|--------|
| **#94** | `cursor/hosted-rollout-step4a-9f90` | Merged `main`; kept main step 4b tooling + remote production verify notes | **Mergeable** — no conflicts vs `main` |
| **#93** | `cursor/child-object-scan-qr-30c9` | Reset to `main` tip (PR superseded by shipped `/issue-qr` path) | **Mergeable** — identical to `main` |

**Also on `main`:** `V1_IMPLEMENTATION_CONTRACTS.md` updated with `child_object` scope and `/issue-qr` route (commit `261a4039`).

**Verify locally:**

```bash
git fetch origin pull/93/head pull/94/head
git merge-tree $(git merge-base main FETCH_HEAD) main FETCH_HEAD  # repeat per PR
```
