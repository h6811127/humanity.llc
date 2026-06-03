# Cedar Rapids city game — launch checklist (Phase D)

**Status:** Internal · run immediately before public season open  
**Canonical:** [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) · **Feature coverage:** § Feature page traceability (CR-* / PWM-*) · **Verify:** `npm run verify:city-game -- --require-launch`

---

## Engineering preflight

**Architecture / build gates:** [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) § Build process (**B1–B15**) and risks (**R-01–R-20**).

| Step | Command / check | Done? |
|------|-------------------|-------|
| E1 | `npm run verify:city-game` green | ☑ **2026-06-02** · ☑ **2026-06-03** (`--require-launch`) |
| E1b | Build gates **B1–B2**, **B5–B8** signed (vouch copy, surfaces honesty, load test, no player-signed over-promise) | ☐ · B1–B2 ☑ · **B5 ☑ 2026-06-03** local · B6–B8 human/doc |
| E2 | `npm run city-game:verify-season -- --require-launch` (season root + dates set) | ☑ **2026-06-03** |
| E3 | All 15 nodes minted + QRs issued on season root | ☐ local ☑ via `city-game:seed-local` |
| E4 | `CITY_GAME_ENABLED=1` in `worker/wrangler.toml` · Worker deployed | ☐ |
| E5 | Scan template live on staging/production for `node_01`, `node_04`, `node_07` | ☐ · `npm run city-game:smoke-production` after `CITY_GAME_ENABLED=1` |

**Phase D preflight (engineering only):**

```bash
npm run city-game:launch-preflight   # verify + season + launch-day blockers summary
```

Local E5: [`CITY_GAME_LOCAL_DEV.md`](CITY_GAME_LOCAL_DEV.md) · `npm run city-game:proof-local` · tap hub from `npm run city-game:dev`

---

## Product / trust

| Step | Check | Done? |
|------|-------|-------|
| P1 | [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md) — ≥5 testers pass GT-1–GT-7 (GT-7 when marketing live board) | ☑ **2026-06-03** |
| P2 | [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) — ≥3 phones × 15 nodes | ☐ |
| P3 | Rules page live — [`/play/cedar-rapids/`](../site/play/cedar-rapids/index.html) | ☑ **2026-06-03** Pages deploy (board + guide + Maps links) |
| P4 | Research pages — live season banners + rules link | ☐ |
| P5 | Confirm scan analytics still off — [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) | ☐ · automated: `city-game-scan-analytics-gate.test.ts` in `verify:city-game` |
| P6 | If marketing promises a **live city board**: **B13–B14** signed — [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) (optional at S1 **M1** static; required before **M2** snapshot) | ☐ |

**P3 + P4 automation (Phase D public surfaces):** After season root + window dates are set and human gates P1–P2 / O1–O3 are signed:

```bash
npm run city-game:launch-surfaces -- --check    # preflight (pre-launch state OK today)
npm run city-game:launch-surfaces -- --apply    # launch day only — patches 5 HTML surfaces
npm run build && npm run pages:deploy           # after --apply
npm run city-game:launch-surfaces -- --check --expect-applied
```

Patches: `site/play/cedar-rapids/index.html` · PWM · Cedar Rapids demo · living street · `what-can-a-qr-do.html`. Does **not** set `CITY_GAME_ENABLED` (E4 separate).

**Pre-launch check (2026-06-02):** `--check` confirms draft/noindex state; blockers until launch: `season_root_profile_id`, `window.starts_at` / `ends_at`.

---

## Operations

| Step | Check | Done? |
|------|-------|-------|
| O1 | Game-operator private key in custody — [`CITY_GAME_OPERATOR_CUSTODY.md`](CITY_GAME_OPERATOR_CUSTODY.md) | ☐ |
| O2 | [`CITY_GAME_NODE_INSTALL_MAP.md`](CITY_GAME_NODE_INSTALL_MAP.md) — install status + node_14 steward contact | ☐ |
| O3 | Weekend operator schedule assigned — [`CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md`](CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md) | ☐ |
| O4 | Support team has [`CITY_GAME_SUPPORT_MACROS.md`](CITY_GAME_SUPPORT_MACROS.md) | ☐ |
| O5 | Optional: Glitch hoodies in `mobile_lore_enrollment[]` | ☐ |

---

## Launch sign-off (C5)

```bash
npm run city-game:launch-checklist-preflight
npm run city-game:launch-checklist-sign-off -- --mark O1 O2 O3 O4 --apply   # after ops confirmation
npm run city-game:launch-checklist-sign-off -- --pass --apply --commander "Name"   # when P1–P5 + O1–O4 are ☑
```

| Gate | Done? |
|------|-------|
| P1–P5 and O1–O4 signed above | ☐ Pending |

---

## Launch day

1. Confirm launch checklist P1–P5 and O1–O4 signed.
2. Set `window.starts_at` / `ends_at` + `season_root_profile_id` in season JSON (if not already).
3. **Public surfaces:** `npm run city-game:launch-surfaces -- --apply` → `npm run build` → Pages deploy.
4. **Resolver:** `CITY_GAME_ENABLED=1` in `worker/wrangler.toml` → Worker deploy (E4).
5. Verify: `npm run city-game:launch-surfaces -- --check --expect-applied` · `npm run verify:city-game -- --require-launch`
6. Spot-scan `node_01`, `node_04`, `node_13` on production WebKit.
7. Post rules link from research hub (no heatmap / player-count claims).

---

## Post-season (Phase D close)

| Step | Check | Done? |
|------|-------|-------|
| S1 | Decision Q5: pause all nodes vs living-infra subset — document in season JSON `status` | ☐ |
| S2 | Flip compromised/revoked nodes to paused or living-infrastructure copy | ☐ |
| S3 | `CITY_GAME_ENABLED=0` or season `status: ended` if disabling game template | ☐ |

Post-season JSON: `npm run city-game:post-season -- --write` (sets `season.status = ended`; node pause per operator runbook).

See [`CITY_GAME_OPERATOR_RUNBOOK.md`](CITY_GAME_OPERATOR_RUNBOOK.md) § Post-season.
