# Cedar Rapids city game — minimum autonomous v1

**Status:** Draft · product + engineering decision  
**Feature catalog:** Every public-page bullet is tracked by ID in [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) § Feature page traceability (**CR-***, **PWM-***). This doc covers the smallest **L**-delivery subset for a self-running weekend.  
**Privacy canon:** [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) (requires amendment before ship)  
**Season config:** [`site/data/city-game-cr-season-01.json`](../site/data/city-game-cr-season-01.json)

---

## Problem

Research demos ([physical-world multiplayer](../site/what-can-a-qr-do/physical-world-multiplayer/), [Cedar Rapids city game](../site/what-can-a-qr-do/combining-ideas/cedar-rapids-city-game/)) describe **scan-driven public state** — collective unlocks, trust gates, fragment lattices, scarcity — without a human operator flipping every beat.

Engineering ships **scan UX**, **operator tooling**, and a partial **L** spine (quorum, fragments, scarcity contribute — see CR-G01, CR-G05, CR-G07). Rows still **O** at S1 in the traceability table need operators or S2/S3 automation before advertising a fully autonomous season.

**Minimum autonomous v1** = the smallest set of resolver rules so a weekend season completes its **main coordination spine** with **zero live operator** during play, while stewards retain **revoke, care pause, and compromise recovery** only.

---

## Success criteria

| # | Criterion | Pass when |
|---|-----------|-----------|
| A1 | **No babysitting** | Fri 18:00 → Sun 22:00 play window needs no scheduled operator flips for the spine below |
| A2 | **River → cabinet** | `node_04` quorum fills → `node_07` shows unlocked copy without `/game-operator/` |
| A3 | **Fragment → finale** | `node_09` + `node_11` (+ configured third) marked → `node_13` auto-opens |
| A4 | **Privacy hold** | No player IDs, scan heatmaps, streaks, or per-scanner rows in D1 |
| A5 | **Care still wins** | `node_14` care pause still mutes game copy automatically (already shipped) |
| A6 | **Revoke still works** | Compromised sticker → owner/operator revoke without new gameplay code |

**Spine under test:** `node_04` → `node_07` → (optional `node_10` vouch display) → `node_09` / `node_11` fragments → `node_13` finale.

Everything else in the 15-node pack may stay **pre-scripted static copy** or **operator-only** for this milestone.

---

## Autonomy split (what changes)

### Already autonomous (keep)

| Mechanism | How |
|-----------|-----|
| Temp drop expiry | `game_meta.visible_until` → dormant scan mode |
| Care overrides game | `care` stream pause regex in `scan-view.ts` |
| Lifecycle revoke/pause | Existing card/child revoke primitives |
| Season off / flag off | `CITY_GAME_ENABLED=0` or season `status: ended` → fallback template |

### Must become autonomous (new work)

| Mechanism | Demo reference | Min v1 delivery |
|-----------|----------------|-----------------|
| **Collective quorum** | River Lantern “20 anonymous scans” | Player **contribute** action → count-only increment → auto flip at target |
| **Unlock graph** | “Czech Village object now visible” | Server **evaluates `unlock_edges`** after quorum / fragment / vouch signals |
| **Fragment lattice** | Greene + Czech fragments → finale | **Contribute** at fragment nodes sets `game_meta.fragment_id` / `unlocked_by` on `node_13` prerequisites |
| **Vouch gate (read)** | Cabinet “vouched by library + café” | Scan **reads vouch graph** + `game_meta.vouch_requires` → show locked vs open copy (no account) |
| **Scarcity decrement** | Library “11 sunset passes remain” | **Contribute** at witness decrements `scarcity_remaining`; auto-dormant at 0 |
| **Season window** | Weekend open/close | Cron or scan-time check against season JSON `window.starts_at` / `ends_at` |

### Stays operator-only at S1 (explicit · see traceability)

| Mechanism | Traceability IDs | Why deferred to S2/S3 or **O** |
|-----------|------------------|--------------------------------|
| Faction capture / relay PvP | PWM-ST02, CR-R01 | Needs signed player faction actions + anti-grief rules |
| Spy compromise (player-initiated) | CR-C01 | Narrative drill; operator sets `compromised` for rehearsals |
| Prisoner’s dilemma choice outcomes | CR-G04, CR-M05 | Needs choice tokens + branch state machine (**L** target S3) |
| Weather / sunrise-only routes | CR-X03, PWM-MS05, PWM-W02, PWM-S03 | **L** partial — `route_window_schedule` local-hour gates (`route-window-schedule.ts`); external weather API still S3 |
| Rotating bulletins / live map ticker | CR-M01–07 | **L** partial — `bulletin_schedule` + snapshot headlines on rules board (`live-map-ticker.ts`, `GET …/seasons/{id}/snapshot`); WebSocket push still S3 |
| Anti-hoarding auto-evolve | CR-G02, CR-M03 | **L** at quorum — River Lantern + cabinet bulletins auto-evolve (`evolveRiverLanternAntiHoarding`, `unlockCabinetFromRiver`) |
| Business vouch (café) | CR-T03, CR-P03 | Q6 manual enrollment until S3 |
| Care loop repair unlock | PWM-M06, PWM-W05 | Steward-signed care stream only |
| Guestbook append | CR-SV10, CR-X01 | S3 moderated append |
| Mobile hoodie lore enrollment | CR-R03 | Optional; owner updates still manual |

**Operator role after min autonomous v1:** safety (revoke, care pause), narrative events (optional bulletin flips), compromise drills — **not** quorum counting or unlock graph maintenance.

---

## Privacy-safe contribute (pick one for ship)

Policy today blocks hidden scan counts. Min autonomous v1 **requires a published amendment** to [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) § Cedar Rapids collective mechanics.

### Recommended: **physical site code + count-only bucket** (option 3 from implementation brief)

Sticker/backing card includes a **rotating site code** (e.g. `CR-LANTERN-7K`) not guessable from the URL alone.

1. Scanner opens `/c/…?q=qr_…` (read-only hero).
2. Optional **“Add your scan to the quorum”** block: enter site code → `POST …/game-contribute`.
3. Resolver validates code against season config (`contribute_codes` map on node).
4. D1 stores **only** `(object_id, code_epoch, contribution_count)` — increment if code valid and bucket under rate limit.
5. No profile ID, no device fingerprint, no scan log row.

**Sybil resistance:** rate limit by IP hash (existing `rate-limit.ts` pattern) + per-object daily cap + code rotation between seasons.

### Alternative (engineering spike): **ephemeral contribute token**

Scan page embeds short-lived HMAC token; contribute POST sends token; server dedupes token hashes in a TTL table. **Do not ship both** — pick one path for v1.

---

## New resolver surface

### `POST /.well-known/hc/v1/cards/:profile_id/objects/:object_id/game-contribute`

**Auth:** none (public action on public object).  
**Body (example):**

```json
{
  "qr_id": "qr_…",
  "site_code": "CR-LANTERN-7K"
}
```

**Behavior:**

1. Validate `CITY_GAME_ENABLED`, season active, object is `game_node`, QR matches object, lifecycle `active`.
2. If care pause on node → 409 with care-wins message (no increment).
3. Apply contribute rules for node role (see table below).
4. Run **unlock evaluator** (below).
5. Return `{ collective_progress, collective_target, unlocked_nodes[], fragment_status }` — public aggregates only.

**Must not:** accept game-operator key on this route (separate `game-update` remains for stewards).

### Unlock evaluator (pure function + D1 write)

New module: `worker/src/city-game/unlock-engine.ts`

Inputs: season JSON (`unlock_edges`, node list), all touched `game_meta` + object status.  
Outputs: list of signed document patches to apply via **internal** game-update (server-side issuer) or direct child-object update with automation flag.

**Edges to implement first** (from season JSON):

| Trigger | Edge | Effect |
|---------|------|--------|
| `node_04` `collective_progress >= collective_target` | `node_04 → node_07` | Set `node_07.game_meta.unlocked_by` includes `node_04`; update `node_07` streams to “visible” copy |
| `node_10` active vouch for `node_07` (graph read) | `node_10 → node_07` | Cabinet trust chip “witness vouch live” |
| Fragment marked on `node_09`, `node_11`, `node_01` | `* → node_13` | When 3/3 prerequisites in `game_meta`, open finale streams |

Evaluator runs:

- After every successful `game-contribute`
- After every operator `game-update` (so manual overrides stay consistent)
- Optionally on scan (read-only re-eval if state drifted — no contribute side effects)

### Season window cron

Daily or hourly Worker cron (or check on contribute/scan):

- Before `window.starts_at`: nodes show “season not open” copy (or dormant).
- After `window.ends_at`: season `status: ended` behavior — game template muted, living-infra copy remains.

---

## Per-node automation matrix (15 nodes)

| Node | Autonomous in min v1 | Player action | Operator still needed for |
|------|----------------------|---------------|---------------------------|
| `node_01` | Partial | Contribute counts toward fragment edge to `node_13` | Bulletin rotation, faction color |
| `node_02` | Static | — | Rumors board edits |
| `node_03` | Static | — | Chapter unlock narrative |
| **`node_04`** | **Yes** | **Contribute → quorum → unlock `node_07`** | Revoke, care pause |
| `node_05` | Static | — | Compromise drill |
| `node_06` | Static | — | Weather route mode |
| **`node_07`** | **Yes (display)** | — | **Auto** locked/open from graph + vouch read |
| `node_08` | Static | — | Faction hold |
| **`node_09`** | **Yes** | **Contribute marks fragment** | Revoke |
| **`node_10`** | **Yes** | **Contribute decrements scarcity** | Institution closure flip |
| **`node_11`** | **Yes** | **Contribute marks fragment** | — |
| `node_12` | Static | — | — |
| **`node_13`** | **Yes** | — | **Auto** open when fragment lattice complete |
| `node_14` | Care auto | — | Maintainer care stream edits |
| `node_15` | Static | — | Reclaim narrative |

**Summary:** 6 nodes on the automation spine; 9 nodes are **ambient copy** for the weekend (still scannable, still on-brand, not progression-critical).

---

## Scan UX additions

Minimal UI on game scan pages (only when `CITY_GAME_ENABLED` and node role participates):

1. **Contribute block** — site code field + submit (no Humanity Card required).
2. **Progress readout** — “Collective 14/20” from live `game_meta` (already in chips).
3. **Locked/unlocked cabinet** — hero muted until graph says open; coop hint unchanged.
4. **No** leaderboard, streak, or “you are #3” copy.

Reuse scan actor band patterns; do not require wallet restore for contribute.

---

## Data model additions

### Season JSON (extend)

```json
{
  "contribute_codes": {
    "node_04": { "code": "CR-LANTERN-7K", "epoch": "cr_season_01_wake" },
    "node_09": { "code": "CR-MURAL-2F", "epoch": "cr_season_01_wake" }
  },
  "automation": {
    "quorum_nodes": ["node_04"],
    "fragment_nodes": ["node_09", "node_11", "node_01"],
    "finale_node": "node_13",
    "witness_scarcity_node": "node_10"
  }
}
```

Codes live in season JSON for generation at print time; **not** in public repo for production season (use deploy-time secret or operator-generated sheet — same custody as game-operator key).

### D1 (new table)

```sql
-- Count-only quorum buckets; no scanner identity
CREATE TABLE game_contribute_buckets (
  object_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  bucket_date TEXT NOT NULL,  -- UTC date for rate cap
  contribution_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (object_id, season_id, bucket_date)
);
```

Optional TTL purge post-season. **No** row per contribution event if policy requires — only aggregate counter (accepts small collision risk under extreme spam; rate limits bound abuse).

---

## Engineering tasks (ordered)

| # | Task | Tests |
|---|------|-------|
| 1 | ✓ Policy amendment: count-only quorum + site codes | [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) § Cedar Rapids |
| 2 | ✓ `game-contribute` handler + rate limits | `city-game-contribute.test.ts` |
| 3 | ✓ `unlock-engine.ts` + season edge wiring | `unlock-engine.test.ts` |
| 4 | ✓ Vouch graph read for `node_07` gate | `vouch-graph.test.ts` + `city-game-scan.test.ts` |
| 5 | ✓ Scan HTML contribute block + client POST | `scan-game-contribute.mjs` + scan tests |
| 6 | ✓ Season window guard | `city-game-season-window.test.ts` + cron stub |
| 7 | ✓ Seed script: per-node site codes into `.local/` | `city-game-seed-site-codes.test.ts` |
| 8 | ✓ Deprecate operator quorum flips for spine nodes | operator docs updated |
| 9 | ✓ Unlock evaluator after `game-update` | `unlock-evaluator.test.ts` + `city-game.test.ts` |

**Regression gate:** extend `npm run verify:city-game` with contribute + unlock tests · local spine proof: `npm run city-game:proof-local` (or `smoke-contribute-local --spine`).

---

## Launch checklist deltas

Replace manual E5 spot-check expectation:

| Old | New |
|-----|-----|
| Operator flips River Lantern quorum | Two browsers contribute codes → `node_07` unlocks without operator |
| Operator flips finale | Fragment contributes on 3 nodes → `node_13` opens |

Keep operator tests for **revoke**, **care pause**, **compromise** only.

---

## Witness scarcity: device-local ceiling (Option 1)

**Problem:** Library witness (`node_10`) decrements a **shared** pool (`game_meta.scarcity_remaining`). Without a per-player server row (forbidden by [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md)), one browser can claim until the pool is empty. IP-only caps are a poor primary fix at the library — many players share one Wi‑Fi network.

**Chosen tightening:** **Option 1 — device-local ceiling.** After one successful scarcity contribute on a browser profile, the scan client records a **local-only** marker and hides the contribute form for that `(season_id, object_id, UTC date)` tuple. Server pool logic is unchanged; this is UX friction + honest-player guard, not cryptographic identity.

**Not chosen as primary:** Option 2 — strict IP cap (1–2/hour) on scarcity — kept only as the existing generic contribute IP rate limit (20/hour abuse backstop), not per-person enforcement.

### Policy alignment

| Allowed | Forbidden |
|---------|-----------|
| `localStorage` JSON on scan origin — no server write | Per-contributor D1 row, profile ID, or device fingerprint on server |
| Aggregate `scarcity_remaining` on object document | “One pass per account” without an account system |
| Player clears site data to bypass (accepted v1 tradeoff) | Scan logging to reconstruct who claimed |

### Storage contract

| Field | Value |
|-------|--------|
| Key | `hc_game_scarcity_ceiling_v1` |
| Value | JSON `{ season_id, object_id, bucket_date, claimed_at }` |
| `bucket_date` | UTC `YYYY-MM-DD` — matches `game_contribute_buckets.bucket_date` and server `utcDateKey()` |
| Scope | Witness scarcity contribute only (`contribute_mode === "scarcity"`, `node_10`) |
| TTL | Implicit — new UTC day → new bucket; old record ignored |

Pure helpers live in [`site/js/scan-game-scarcity-ceiling-core.mjs`](../site/js/scan-game-scarcity-ceiling-core.mjs) (importable from Vitest). Browser I/O stays in [`site/js/scan-game-contribute.mjs`](../site/js/scan-game-contribute.mjs).

### Implementation steps

| Step | Status | Deliverable |
|------|--------|-------------|
| **1** | **Done** | Core module: key constant, UTC date bucket, parse/build/match record + Vitest |
| **2** | **Done** | Scan hero `data-season-id`; client init gate + post-success write + hide form + copy |
| **3** | **Done** | Scan/regression tests; bump `scan-game-contribute.mjs?v=2` |
| **4** | **Done** | Local dev note (clear `localStorage` to re-test); `verify:city-game` gate; **`SCAN_PAGES_JS_ORIGIN` / `SCAN_RESOLVER_ORIGIN` in `worker/.dev.vars`** + `pages:dev` when wrangler simulates production hostnames |

**Step 2 copy (planned):** success — “Pass claimed — N remain tonight for everyone.”; device gate — “You already claimed a sunset pass from this device tonight. Remaining passes are for others at the library.”

**Regression:** `npm run verify:city-game` includes `scan-game-scarcity-ceiling-core.test.ts` after step 1.

---

## Explicit non-goals (still Phase 2)

- Player faction capture changing controller streams
- External weather API / automatic flood-only mode without operator signal
- Prisoner’s dilemma branch tokens
- Full 15-node unique automation (only spine + static ambient nodes)
- Scan analytics or “anonymous but logged” identity reconstruction

---

## Related

- [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) — full season vision  
- [`CITY_GAME_LOCAL_DEV.md`](CITY_GAME_LOCAL_DEV.md) — local proof path (contribute smoke + site codes)
- [`CITY_GAME_OPERATOR_RUNBOOK.md`](CITY_GAME_OPERATOR_RUNBOOK.md) — spine quorum/flips deprecated; safety flips remain
- [`PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md`](PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md) — design north star
