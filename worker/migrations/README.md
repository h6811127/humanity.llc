# D1 schema (M1.2)

Reference resolver SQLite schema for Cloudflare D1. Implements roadmap step **1.2** and Phase A tables from `docs/V1_0_ARCHITECTURE_ROADMAP.md` §12 A.1.

## Tables

| Table | Purpose |
|-------|---------|
| `cards` | Signed public Humanity Card documents + current `status` |
| `qr_credentials` | Card-scoped and `print_artifact`-scoped QR credentials |
| `verification_summaries` | Denormalized public verification state (default `registered` on create) |
| `revocations` | Append-only signed owner revokes and governance suspensions |

## Design choices

**Signed JSON columns**  -  `card_document_json`, `credential_document_json`, `signed_document_json`, and optional `summary_document_json` store the canonical signed payloads the API returns or verifies. Indexed columns (`handle`, `status`, etc.) support constraints and queries without parsing JSON on every read.

**Current status vs audit**  -  `cards.status` and `qr_credentials.status` are the resolver’s current truth for scan/UI. `revocations` is append-only history (owner revoke, QR revoke, governance suspension with optional `public_notice` / `appeal_deadline` per Technical Standards §11).

**Handle uniqueness**  -  `handle_normalized` is lowercase per protocol handle rules (`Technical Standards v1.0.md` §6.2). Application code MUST normalize before insert.

**One active card QR**  -  Partial unique index `idx_qr_one_active_card_scope` enforces a single `active` row with `scope = 'card'` per profile. Rotation sets the previous row to `replaced` before issuing a new epoch.

**Commerce firewall**  -  No Shopify, Printify, artifact intent, or shipping tables here. Those land in later migrations (Phase C) in separate tables, still without PII in trust tables.

**Out of scope for 0001**  -  `vouches`, `live_control_challenges`, `artifact_intents`, `commerce_order_links`, `print_orders` (M6+ / Phase C).

**Orphan purge (no migration):** Abandoned active cards are deleted by daily Worker cron per `docs/CARD_RETENTION_AND_ORPHAN_CLEANUP.md` (`worker/src/db/orphan-purge.ts`).

## Apply migrations

From repo root (after `npm install`):

```bash
# Local D1 (wrangler dev)
npm run worker:migrate:local

# Remote (after wrangler d1 create and database_id in wrangler.toml)
npm run worker:migrate:remote
```

## Related specs

- `docs/V1_IMPLEMENTATION_CONTRACTS.md`  -  field enums and state machines
- `docs/REFERENCE_OPERATOR_DATA_POLICY.md`  -  what may be stored
- `docs/Technical Standards v1.0.md` §9.7  -  resolver data minimization
