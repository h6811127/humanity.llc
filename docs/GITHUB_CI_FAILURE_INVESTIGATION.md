# GitHub CI failure investigation

**Status:** Open — CI red on every `main` push (2026-05-29)  
**Reported:** 2026-05-29  
**Scope:** All three GitHub Actions workflows on `main`  
**Related:** [`SITE_BUILD_VERSIONING.md`](SITE_BUILD_VERSIONING.md) · [`DEVICE_SHELL_E2E_CI_REMEDIATION.md`](DEVICE_SHELL_E2E_CI_REMEDIATION.md) · [`LIVE_CONTROL_USABILITY_HARDENING.md`](LIVE_CONTROL_USABILITY_HARDENING.md) § H-14 · [`LIVE_PROOF_FAILURE_INVESTIGATION.md`](LIVE_PROOF_FAILURE_INVESTIGATION.md)

---

## Executive summary

Every push to `main` currently fails at least one workflow. There are **two independent failure classes**:

| Class | Workflows | Gate | Root cause |
|-------|-----------|------|------------|
| **A — Vitest drift** | **Test site**, **Deploy Worker** | `npm run worker:test` (step 1 in both) | Committed code, tests, and generated artifacts are out of sync; Playwright never runs because Vitest exits first |
| **B — Cloudflare auth** | **Deploy Pages** | `npm run pages:deploy` | `CLOUDFLARE_API_TOKEN` secret returns Cloudflare API error `10000` (authentication) on `/memberships` |

**Test site** has **zero successful runs** in the last 100 workflow executions (oldest sampled: 2026-05-28). **Deploy Pages** has **zero successful runs** in the last 59 executions. **Deploy Worker** fails on the same Vitest gate before deploy; it occasionally succeeded earlier on 2026-05-28 when the Vitest suite was green.

CI is not flaky — failures are **deterministic** and reproducible locally with `npm run worker:test` on committed `main`.

---

## CI architecture

Three workflows fire on `main` pushes (path filters differ):

| Workflow | File | First blocking step | Later steps (never reached when A fails) |
|----------|------|---------------------|------------------------------------------|
| **Test site** | [`.github/workflows/test-site.yml`](../.github/workflows/test-site.yml) | `npm run worker:test` | Merch rollout preflight, Playwright device shell / PWA / hosted / merch E2E |
| **Deploy Worker** | [`.github/workflows/deploy-worker.yml`](../.github/workflows/deploy-worker.yml) | `npm run worker:test` | D1 remote migrate, `worker:deploy`, post-deploy smoke |
| **Deploy Pages** | [`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml) | `npm run build` (passes) | `pages:deploy` → **auth failure** |

**Important:** Both Test site and Deploy Worker run the **full** Vitest suite (`vitest run` with no path filter). A single failing unit test blocks deploy and all Playwright jobs.

---

## Observed failures (run `26647261216`, commit `c0b63308`, 2026-05-29)

GitHub Actions log (`Test site` → **Run npm run worker:test**):

```
Test Files  5 failed | 256 passed (261)
```

| # | Test file | Assertion / error | Category |
|---|-----------|-------------------|----------|
| 1 | `worker/tests/site-build-meta.test.ts` | `SITE_BUILD_META.shellAssetVersion` **57** ≠ `DEVICE_SHELL_ASSET_VERSION` **58** | Stale generated file |
| 2 | `worker/tests/device-emphasis-card-html.test.ts` | `wallet/index.html` contains `device-shell.css?v=62` but test expects `v=59` | Version bump without test update |
| 3 | `worker/tests/router-cors.test.ts` | `TypeError: db.prepare(...).bind(...).run is not a function` | Rate-limit mock gap |
| 4 | `worker/tests/scan-live-control-client.test.ts` | HTML missing `ownerLink.hidden = true;` | Stale test (layout refactor) |
| 5 | `worker/tests/hosted-rollout-step6.test.ts` (2 tests) | Script missing `e2e:hosted-tier-billing-return`; spec file absent | Incomplete commit |

**Deploy Pages** (run `26647262027`, same push):

```
✘ ERROR A request to the Cloudflare API (/memberships) failed.
  Authentication error [code: 10000]
```

Wrangler notes the token is read from `CLOUDFLARE_API_TOKEN` and suggests missing `User → User Details → Read` (and, for deploy, Pages/Workers write permissions).

---

## Root-cause analysis

### 1. Stale committed `site/js/build-meta.mjs` (Class A)

[`site-build-meta.test.ts`](../worker/tests/site-build-meta.test.ts) requires the committed stamp to match [`DEVICE_SHELL_ASSET_VERSION`](../site/js/device-status-shell-modules.mjs) (currently **58**).

On committed `main`:

```js
// site/js/build-meta.mjs (committed)
"shellAssetVersion": 57
```

[`docs/SITE_BUILD_VERSIONING.md`](SITE_BUILD_VERSIONING.md) states that **Worker-only CI does not regenerate** the Pages stamp. Bumping `DEVICE_SHELL_ASSET_VERSION` without running `npm run site:build-meta` and committing the result breaks CI.

**Contributing pattern:** Developers regenerate `build-meta.mjs` locally (working tree shows `shellAssetVersion: 58`) but do not commit it with the shell version bump.

---

### 2. `device-shell.css` cache-bust drift (Class A)

[`device-emphasis-card-html.test.ts`](../worker/tests/device-emphasis-card-html.test.ts) hardcodes `device-shell.css?v=59` for shell pages (`wallet`, `create`, `created`).

Committed HTML after PWA Phase 9 (`528cfedf`):

| Page | Committed `device-shell.css?v=` |
|------|--------------------------------|
| `site/wallet/index.html` | **62** |
| `site/index.html` | **62** |
| `site/create/index.html` | **59** |
| `site/created/index.html` | **59** |

The test loops over wallet/create/created and fails on wallet first. The bump to `v=62` shipped without updating the Vitest expectation (unlike the prior `styles.css?v=129` fix in `3687ed16`).

---

### 3. `router-cors.test.ts` missing rate-limit mock (Class A)

Commit `58c72eb7` added `checkCardResolutionRateLimit` to [`handleGetScanStatus`](../worker/src/resolver/scan-status.ts). [`scan-status.test.ts`](../worker/tests/scan-status.test.ts) was updated to wrap mocks with [`d1WithRateLimitBuckets`](../worker/tests/rate-limit-db-mock.ts).

[`router-cors.test.ts`](../worker/tests/router-cors.test.ts) still uses a minimal `dbFor()` stub with only `.first()` — no `.run()`. Any `GET …/status` request now hits rate limiting and throws.

This is a **test maintenance gap**, not a production bug.

---

### 4. `scan-live-control-client.test.ts` not committed (Class A)

[`LIVE_CONTROL_USABILITY_HARDENING.md`](LIVE_CONTROL_USABILITY_HARDENING.md) marks **H-14** as shipped (2026-05-29): align assertions with `ownerPanel.hidden` / `ownerLink.href` instead of removed `ownerLink.hidden` / `ownerHint`.

Committed `main` still expects the old strings. The fix exists only in the **local working tree** (uncommitted). CI runs committed code → fails.

---

### 5. Hosted billing return E2E incomplete (Class A)

[`package.json`](../package.json) defines:

- `e2e:hosted-tier-billing-return` → `e2e/hosted-tier-billing-return.spec.ts`
- `e2e:steward-hosted` chains billing-return after hosted-tier specs

[`hosted-rollout-step6.test.ts`](../worker/tests/hosted-rollout-step6.test.ts) asserts:

1. Rollout script documents `e2e:hosted-tier-billing-return`
2. `e2e/hosted-tier-billing-return.spec.ts` exists

On committed `main`: the spec file is **untracked** (`??` in `git status`); rollout script checklist text is updated only locally.

---

### 6. Cloudflare API token permissions (Class B)

Deploy Pages never reaches production. `npm run pages:deploy` runs `site:build-meta` successfully, then Wrangler fails authenticating against Cloudflare.

This is **infrastructure / secrets configuration**, independent of Vitest. The token can resolve account name (`H6811127@gmail.com's Account`) but lacks permission for the deploy API call.

**Deploy Worker** would hit the same token on `worker:migrate:remote` and `worker:deploy` if Vitest passed — those steps have not been exercised on recent failing runs.

---

## Local reproduction

On commit `c0b63308` (discard uncommitted changes first for a clean repro):

```bash
npm ci
npm run worker:test
# → 5 failed test files (matches CI)
```

With current working tree (partial local fixes applied):

```bash
npm run worker:test
# → 2 failed: device-emphasis-card-html (v=59 vs v=62), router-cors (rate-limit mock)
```

Deploy Pages auth failure cannot be reproduced without the CI secret; logs above are sufficient evidence.

---

## Historical context

| Signal | Finding |
|--------|---------|
| Test site last 100 runs | **0 success**, failures since at least 2026-05-28 14:47 UTC |
| Deploy Pages last 59 runs | **0 success** (auth) |
| Deploy Worker (mixed 200 runs) | 10 success / 56 failure; last success ~2026-05-28 18:01 UTC |
| Steward ops daily | **Passing** (separate workflow, no Vitest gate) |

Earlier commits on 2026-05-29 also failed additional tests (ownership copy in inbox summaries, scan cross-tab banner copy) that appear fixed on current `main`; the five failures above are the **current** stable set.

---

## Remediation plan (recommended order)

### Phase 1 — Unblock Vitest (Class A)

Single PR on `main`; run full gate before merge:

```bash
# 1. Regenerate Pages build stamp after shell version bump
npm run site:build-meta
git add site/js/build-meta.mjs

# 2. Align device-shell cache-bust test with committed HTML
#    Update device-emphasis-card-html.test.ts:
#    wallet + index → v=62; create + created → v=59 (or unify all four if intentional)

# 3. Fix router-cors mock
#    Import d1WithRateLimitBuckets; wrap dbFor prepare stub
#    (mirror scan-status.test.ts)

# 4. Commit H-14 scan-live-control-client.test.ts fix
git add worker/tests/scan-live-control-client.test.ts

# 5. Commit hosted billing return artifacts
git add e2e/hosted-tier-billing-return.spec.ts
git add worker/scripts/hosted-rollout-step6.mjs   # checklist + preflight file list

npm run worker:test   # must be 0 failures
```

### Phase 2 — Fix Deploy Pages token (Class B)

In Cloudflare dashboard → **My Profile → API Tokens**:

1. Edit or replace the token stored as `CLOUDFLARE_API_TOKEN` in GitHub repo secrets.
2. Minimum for Pages deploy: **Account → Cloudflare Pages → Edit** (and account read).
3. Re-run **Deploy Pages** workflow (or push a `site/**` change).

Verify Worker deploy token separately if Deploy Worker should migrate + deploy after Phase 1.

### Phase 3 — Prevention

| Gap | Hardening |
|-----|-----------|
| `build-meta.mjs` drift | Add pre-commit or CI step: `npm run site:build-meta && git diff --exit-code site/js/build-meta.mjs` **or** document in PR checklist: bump shell version → always commit regenerated meta |
| CSS `?v=` drift | When bumping `device-shell.css?v=` on shell HTML, update `device-emphasis-card-html.test.ts` in the same commit (same pattern as `3687ed16` for `styles.css`) |
| New D1 writes in handlers | Any test using `worker.fetch` with a custom D1 mock must use `d1WithRateLimitBuckets` if the route calls rate limiting |
| Docs vs code | If a hardening doc marks a test fix “shipped”, require the test file in the same commit |
| Deploy auth | Document required token scopes in [`site/README.md`](../site/README.md) or a short `docs/CLOUDFLARE_CI_SECRETS.md` |

Optional: split **fast** Vitest (deploy gate) from **slow** Playwright in workflow job dependencies so deploy-worker could be unblocked by a smaller test subset — **not recommended** without an explicit allowlist; today the full suite is the contract.

---

## Workflow outcome after fixes

| Workflow | After Phase 1 | After Phase 2 |
|----------|---------------|---------------|
| Test site | Vitest green → Playwright runs (may surface separate E2E issues) | unchanged |
| Deploy Worker | Vitest green → migrate + deploy attempt | needs valid token |
| Deploy Pages | unchanged (no Vitest) | deploy succeeds |

---

## Commands for verification

```bash
# Vitest gate (same as CI)
npm run worker:test

# Targeted failing files
npm run worker:test -- \
  worker/tests/site-build-meta.test.ts \
  worker/tests/device-emphasis-card-html.test.ts \
  worker/tests/router-cors.test.ts \
  worker/tests/scan-live-control-client.test.ts \
  worker/tests/hosted-rollout-step6.test.ts

# After Vitest green — Test site Playwright bundle (local)
npm run e2e:install
npm run device-shell:e2e
```

---

## Related open items (not blocking this investigation)

- [`LIVE_PROOF_FAILURE_INVESTIGATION.md`](LIVE_PROOF_FAILURE_INVESTIGATION.md) — production live-proof 500 (separate from CI; resolved via D1 FK repair)
- Playwright E2E may fail **after** Vitest is fixed; that is a **second** gate not reached while Class A failures persist

---

## Investigation log

| Date | Action |
|------|--------|
| 2026-05-29 | Reviewed last 15 `main` pushes — all three workflows failing |
| 2026-05-29 | Pulled failed logs from runs `26647261216` (Test site), `26647260449` (Deploy Worker), `26647262027` (Deploy Pages) |
| 2026-05-29 | Reproduced Vitest failures locally; confirmed 3 fixes exist only uncommitted in working tree |
| 2026-05-29 | Confirmed Test site 0/100 success, Deploy Pages 0/59 success in GitHub API history |
