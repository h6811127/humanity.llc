# Cedar Rapids city game — launch checklist (Phase D)

**Status:** Internal · run immediately before public season open  
**Canonical:** [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) · **Verify:** `npm run verify:city-game -- --require-launch`

---

## Engineering preflight

| Step | Command / check | Done? |
|------|-------------------|-------|
| E1 | `npm run verify:city-game` green | ☐ |
| E2 | `npm run city-game:verify-season -- --require-launch` (season root + dates set) | ☐ |
| E3 | All 15 nodes minted + QRs issued on season root | ☐ |
| E4 | `CITY_GAME_ENABLED=1` in `worker/wrangler.toml` · Worker deployed | ☐ |
| E5 | Scan template live on staging for `node_01`, `node_04`, `node_07` | ☐ |

Local E5: [`CITY_GAME_LOCAL_DEV.md`](CITY_GAME_LOCAL_DEV.md) · `npm run city-game:smoke-local` · `npm run city-game:smoke-contribute-local`

---

## Product / trust

| Step | Check | Done? |
|------|-------|-------|
| P1 | [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md) — ≥5 testers pass GT-1–GT-6 | ☐ |
| P2 | [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) — ≥3 phones × 15 nodes | ☐ |
| P3 | Rules page: remove `noindex`, add season dates on [`/play/cedar-rapids/`](../site/play/cedar-rapids/index.html) | ☐ |
| P4 | Research pages: swap “in development” hints → link to live rules | ☐ |
| P5 | Confirm scan analytics still off — [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) | ☐ |

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

## Launch day

1. Set `window.starts_at` / `ends_at` in season JSON (if not already).
2. Deploy Worker + Pages.
3. Spot-scan `node_01`, `node_04`, `node_13` on production WebKit.
4. Post rules link from research hub (no heatmap / player-count claims).

---

## Post-season (Phase D close)

| Step | Check | Done? |
|------|-------|-------|
| S1 | Decision Q5: pause all nodes vs living-infra subset — document in season JSON `status` | ☐ |
| S2 | Flip compromised/revoked nodes to paused or living-infrastructure copy | ☐ |
| S3 | `CITY_GAME_ENABLED=0` or season `status: ended` if disabling game template | ☐ |

See [`CITY_GAME_OPERATOR_RUNBOOK.md`](CITY_GAME_OPERATOR_RUNBOOK.md) § Post-season.
