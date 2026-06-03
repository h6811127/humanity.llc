# Cedar Rapids city game — operator key custody

**Status:** Active (Season 1 prep)  
**Audience:** Operators, engineering  
**Related:** [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) · [`ORGANIZER_SIGNED_REVOKE_PILOT.md`](ORGANIZER_SIGNED_REVOKE_PILOT.md) · [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) · [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md)

---

## What the game-operator key is

The **game-operator** signs public world-state updates on `game_node` child objects (`POST …/game-update`). It does **not** prove player identity, grant ownership, or certify safety.

In v1 the game-operator public key is registered on the **season root Humanity Card** as `issuer_public_key` — the same D1 field used for organizer revoke ([`ORGANIZER_SIGNED_REVOKE_PILOT.md`](ORGANIZER_SIGNED_REVOKE_PILOT.md)). Different API surface, same custody pattern:

| Key role | API | Allowed action |
|----------|-----|----------------|
| **Owner / recovery** | revoke, child create, owner update | Full card stewardship |
| **Game-operator** (`issuer_public_key`) | `game-update` on `game_node` | Flip bulletins, collective flags, compromise, scarcity |
| **Game-operator** | revoke with `organizer_revoked` | Emergency disable of season root or node QRs |

The game-operator **cannot** impersonate the owner for manifesto updates, vouch issuance, or arbitrary child-object edits.

---

## Season root card

One dedicated **season root** card holds all 15 `game_node` child objects for `cr_season_01_wake`.

| Field | Where stored | Notes |
|-------|--------------|-------|
| `profile_id` | `site/data/city-game-cr-season-01.json` → `season_root_profile_id` | Set after create — never commit private keys |
| Owner + recovery keys | Operator offline custody | Same as any Humanity Card — see Safari keys doc for steward UX |
| Game-operator public key | Card document `issuer_public_key` | Paste at create or register before minting nodes |
| Game-operator private key | **Offline only** | Password manager / hardware — session paste at `/game-operator/` |

Generate a fresh keypair, then print mint templates for all 15 nodes (two separate commands — do not paste the comma):

```bash
npm run city-game:season-root
npm run city-game:mint-node -- --all
```

Or run both in one step:

```bash
npm run city-game:prep-season
```

### Local dev (automated)

**Walkthrough:** [`CITY_GAME_LOCAL_DEV.md`](CITY_GAME_LOCAL_DEV.md)

Enable the game template locally via **`worker/.dev.vars`** (not `wrangler.toml`):

```bash
CITY_GAME_ENABLED=1
```

When the local Worker is running:

```bash
npm run worker:migrate:local
npm run worker:dev   # separate terminal
API_ORIGIN=http://127.0.0.1:8787 npm run city-game:seed-local -- --write-season --skip-flag-check
```

Creates the season root card, mints all 15 `game_node` objects, issues QRs, writes keys to `worker/.local/city-game-seed.json` (gitignored), and sets `season_root_profile_id` in the season JSON.

**Note:** Local worker dev validates QR payloads as `https://humanity.llc/c/…`. The seed file includes `local_scan_url` entries (`http://127.0.0.1:8787/c/…`) for browser testing against your local D1.

The `/create/` UI path below is still valid for production/staging when you want browser-held keys instead of the seed script.

**After Cedar Rapids pilot:** new organizers use the **self-serve setup cockpit** on `/created/` (Phase E) — no terminal. See [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) § Phase E.

### Manual create (production / staging)

1. Open [`/create/`](../site/create/) on local or staging resolver.
2. Expand **Organizer / issuer** → paste the game-operator **PUBLIC** key from `npm run city-game:season-root`.
3. Complete create; save owner + recovery keys per [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md).
4. Record `profile_id` in `site/data/city-game-cr-season-01.json` → `season_root_profile_id`.
5. Mint nodes via `npm run city-game:seed-local` (local) or sign + POST each template from `npm run city-game:mint-node -- --all`.

---

## Custody rules

1. **Never commit** game-operator private keys or season root owner/recovery private keys.
2. **Session-only paste** at [`/game-operator/`](../site/game-operator/index.html) — same model as [`/organizer-revoke/`](../site/organizer-revoke/index.html).
3. **Separate people optional:** owner/recovery for lifecycle; game-operator for weekend bulletin rotation.
4. **Rotate** game-operator key only with a planned season — requires new season root or owner-signed card update to change `issuer_public_key`.
5. **Prod:** keep `CITY_GAME_ENABLED=0` until launch checklist in [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) is signed.

---

## Setup checklist (Phase A — engineering)

| Step | Done? |
|------|-------|
| Run `npm run city-game:season-root` and store keys offline | ☐ |
| Create season root at `/create/` with issuer (game-operator) public key | ☐ |
| Record `season_root_profile_id` in season JSON | ☐ |
| Local: `CITY_GAME_ENABLED=1` in `worker/.dev.vars` | ☐ |
| Mint full registry (`npm run city-game:mint-node -- --all`) | ☐ |
| Verify scan template + `/game-operator/` flip on local resolver | ☐ |

---

## Phase C ops gate (human — before `CITY_GAME_ENABLED=1` in prod)

| Step | Done? | Notes |
|------|-------|-------|
| Game-operator **private** key in offline custody (password manager / hardware) | ☐ | Never commit; session paste at `/game-operator/` only |
| Season root **owner + recovery** keys in offline custody | ☐ | Same as any Humanity Card |
| `season_root_profile_id` set in [`site/data/city-game-cr-season-01.json`](../site/data/city-game-cr-season-01.json) | ☐ | `verify:city-game` warns until set |
| All 15 node QRs issued and tracked in [`CITY_GAME_NODE_INSTALL_MAP.md`](CITY_GAME_NODE_INSTALL_MAP.md) | ☐ | |
| Weekend operator roster assigned — [`CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md`](CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md) | ☐ | |
| `node_14` care-loop steward contacts filled | ☐ | Install map § node_14 |

### Ops sign-off

| Role | Name | Date |
|------|------|------|
| Game operator (key holder) | | |
| Season root owner / recovery | | |
| Engineering | | |

---

## Related operator surfaces

| Surface | URL | Notes |
|---------|-----|-------|
| Manual state flip | `/game-operator/` | Weekend play console |
| Organizer / emergency revoke | `/organizer-revoke/` | |
| Owner stewardship | `/created/` | Phase E adds **game season setup** here |
| Runbook (compromise, finale, pause) | [`CITY_GAME_OPERATOR_RUNBOOK.md`](CITY_GAME_OPERATOR_RUNBOOK.md) | |

### Self-serve setup (Phase E — post-pilot)

Organizers who are not running Cedar Rapids internal scripts will:

1. Create season root at [`/create/`](../site/create/) (game-operator public key under Organizer / issuer).
2. Complete the five-step setup wizard — season roots see an extra **Two keys, two jobs** custody card on Protect and Live steps.
3. Add `game_node` children, issue QRs, edit season metadata, and run comprehension checks on [`/created/`](../site/created/) Live · Manage — **Setup checklist · custody & comprehension** panel (GT scorecard, runbook patterns, backup gate before a third node).
4. Operate live state at [`/game-operator/`](../site/game-operator/) with session-only private key paste.

Terminal commands (`city-game:season-root`, `city-game:mint-node`, `city-game:seed-local`) remain for **engineering, CI, and Cedar Rapids pilot ops** — not for public organizers once Phase E ships.
