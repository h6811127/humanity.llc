# Card retention and orphan cleanup

**Status:** Shipped (reference operator)  
**Applies to:** `humanity.llc` D1 resolver · Worker cron  
**Companion:** [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md)

---

## Problem

**Create** always registers a **public card** on the network (`POST /.well-known/hc/v1/cards`). Private signing keys stay in the browser only.

If a user closes the tab without saving keys, they cannot revoke or update from the web UI. The resolver still holds:

- `cards` row (handle reserved)
- `verification_summaries`
- `qr_credentials`
- Related rows if any later activity occurred

Over time this **orphan** data accumulates. Rate limits slow abuse but do not remove stale rows.

---

## Policy (reference operator)

### What we keep

| Situation | Retention |
|-----------|-----------|
| Owner revoked / disabled | Indefinite (trust history) |
| Suspended (governance) | Indefinite until policy says otherwise |
| Active card with owner updates, vouches, or non-expired QR | Indefinite |
| **Orphan** (see eligibility below) | Removed after grace period |

### Orphan eligibility (all must be true)

A profile is eligible for **automatic purge** when:

1. `cards.status = 'active'`
2. `cards.created_at` older than **90 days** (`ORPHAN_MIN_AGE_DAYS`)
3. **No owner network action:** `cards.updated_at = cards.created_at` (never updated, revoked, or suspended via resolver)
4. **No social trust:** `verification_summaries.vouch_count = 0` and no `vouches` row where this profile is voucher or vouchee with `status = 'active'`
5. **No live QR:** no `qr_credentials` row for this profile with `status = 'active'` **and** (`expires_at` IS NULL OR `expires_at` > now)

### What purge does

- Deletes the profile and dependent rows (challenges, vouches, revocations, QRs, verification summary, card).
- Frees the normalized handle for a future create.
- Scan URLs for that `profile_id` return **not found** (same as never existed).

### What purge does not do

- Does not recover or prove the user “closed without saving” (we cannot see private keys).
- Does not delete revoked/suspended cards.
- Does not run more than **50 profiles per cron run** (`PURGE_BATCH_LIMIT`) to stay within Worker limits.

### Scan copy after purge

Strangers scanning an old printed URL see the resolver’s normal **unknown / not found** path-not “revoked by owner.” Physical stickers may outlive network rows; that is acceptable for abandoned, never-maintained registrations.

**Merch / `print_artifact` QRs:** Founding physical items use **`expires_at: null`** so they count as “live QR” for orphan eligibility and do not calendar-expire on scan. Paid fulfillment must mint only on linked owner profiles so purged orphans do not strand buyers. Policy: [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md).

---

## Implementation checklist

Execute in order:

| Step | Task | Location |
|------|------|----------|
| 1 | Constants + `findOrphanProfileIds` + `purgeOrphanProfiles` | `worker/src/db/orphan-purge.ts` |
| 2 | Wire `scheduled()` cron + export `runOrphanPurge` | `worker/src/index.ts` |
| 3 | Cron trigger `0 4 * * *` (daily 04:00 UTC) | `worker/wrangler.toml` |
| 4 | Vitest: eligible vs protected profiles | `worker/tests/orphan-purge.test.ts` |
| 5 | Document retention table | `docs/REFERENCE_OPERATOR_DATA_POLICY.md` |
| 6 | Operator runbook note | `worker/README.md` |

All steps above are implemented in the repo.

---

## Operations

**Local:** Cron does not fire in `wrangler dev` by default. Use tests or call `runOrphanPurge(db)` from a one-off script.

**Production:** After deploy, Cloudflare runs the cron daily. Monitor D1 row counts and create rate; optional: log purge counts from Worker tail.

**Remote migration:** No schema change required for v1 purge.

---

## Future (not v1)

- `DELETE /.well-known/hc/v1/cards/{id}` with owner signature (user-initiated delete).
- Shorter grace for handles with obvious spam patterns.
- Metrics row `operator_maintenance_runs` for last purge stats on `/health`.
