# Scan Worker Error 1101 — production postmortem

**Status:** Resolved on production · **Prevention shipped** in repo  
**Related:** [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) · [`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md)

---

## Summary

Valid-format scan URLs returned **Cloudflare Error 1101** when production D1 lacked `qr_credentials.object_id` after Worker deploy. **Fix:** `npm run worker:migrate:remote` (migration `0023`). No Worker redeploy required once migration is applied.

---

## Prevention (shipped)

1. Rollout step 1 documents full `worker:migrate:remote` (incl. `0022`/`0023`).
2. `hosted-rollout-scan-smoke.mjs` in step 2/4 smoke (showcase scan URL or `ROLLOUT_SCAN_SMOKE_URL`).
3. `schemaReady()` requires `qr_credentials.object_id`.
4. Optional: `npm run worker:apply-child-object-qr-schema -- --remote` for full `child_object` scope CHECK.

---

## Operator

```bash
npm run worker:migrate:remote
```
