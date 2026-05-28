# Hub / status dot dead on local dev — investigation (2026-05-27)

**Status:** Root cause identified · **fix shipped** (`build-meta-browser.mjs` split, shell v55)  
**Reporter symptom:** Status dot visible on `/`; tap does nothing. Brief ring around dot (blue/black or red), then gone after refresh.  
**Related:** [`STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md`](STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md) · [`SITE_BUILD_VERSIONING.md`](SITE_BUILD_VERSIONING.md) · [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md)

---

## Executive summary (≥90% confidence)

The device hub does not open because **`device-status.mjs` never runs**. The status bootstrap script fails **before** its dynamic `import()` of `device-status.mjs`, due to a **top-level `node:child_process` import** in [`site/js/build-meta-core.mjs`](../site/js/build-meta-core.mjs) (added in commit **`7b825ee`**, 2026-05-27, Worker build-meta Phase 3).

That module is pulled in by the browser on every shell page via:

1. **`device-status-bootstrap.mjs`** — static `import { formatSiteBuildConsoleLine } from "./build-meta-core.mjs"` (Phase 1 build stamp, `3239ce5`)
2. **(Uncommitted local only)** `device-status.mjs` → `device-network-health.mjs` → `build-meta-core.mjs` — not on `main` yet; bootstrap path (1) is sufficient on committed code.

Browsers cannot resolve `node:child_process`. The bootstrap module graph aborts, so **`#brand-status-dot-btn` never gets a click listener** and **`setHubSheetOpen(true)` never runs**.

The red **error outline** (`data-device-status-error` on `#top-chrome`) often **does not appear**, because `markChromeLoadError()` only runs in the **`.catch()`** on the dynamic import of `device-status.mjs`. A failure on the bootstrap’s **static** imports happens earlier — the affordance from `f177e8d` does not cover this path.

---

## Evidence

### 1. Reproduced E2E (local Pages `http://127.0.0.1:8788`)

| Test | Result |
|------|--------|
| `e2e/device-status-dot.spec.ts` — dot opens hub on landing | **Fail** — `body` never gains `device-hub-sheet-open` |
| Same file — `dot_click` in `hc_dot_diag_log` | **Fail** — no `dot_click` entry (handler never ran) |
| `e2e/hosted-tier-push.spec.ts` — `openExpandedHub()` | **Fail** — `#device-hub` stays `device-hub-collapsed` (same helper) |

### 2. Browser console (Playwright, landing `/`)

```
Access to script at 'node:child_process' from origin 'http://127.0.0.1:8788'
  has been blocked by CORS policy …
Failed to load resource: net::ERR_FAILED
```

(`node:` URL schemes are not loadable in a page context.)

### 3. DOM state while “dead”

| Check | Observed |
|-------|----------|
| `#top-chrome[data-device-status-error]` | **Absent** (null) — consistent with bootstrap static failure, not dynamic `device-status` catch |
| `#device-hub` classes after dot click | Still `device-hub-collapsed` |
| `body` after dot click | No `device-hub-sheet-open` |

### 4. Code path

```text
index.html
  └─ device-status-bootstrap.mjs?v=54
       ├─ STATIC import build-meta-core.mjs
       │    └─ import { execSync } from "node:child_process"  ← fails in browser
       └─ (never reached) dynamic import device-status.mjs?v=54
            └─ would register dotBtn click → openHubFromChrome → setHubSheetOpen
```

Offending line in `build-meta-core.mjs`:

```javascript
import { execSync } from "node:child_process";
```

Used by `resolveGitShaFromRoot()` for **`npm run site:build-meta`** / **`worker:build-meta`** — appropriate in Node, not in the browser graph.

### 5. Git timeline

| Commit | Change | Browser impact |
|--------|--------|----------------|
| `3239ce5` | Bootstrap imports `formatSiteBuildConsoleLine` from `build-meta-core` | **Safe** — core had no Node imports |
| **`7b825ee`** | Adds `node:child_process` to `build-meta-core` for Worker stamp generation | **First broken commit** — bootstrap static import fails; hub/dot dead |
| *(local WIP)* | `device-network-health.mjs` imports `parseResolverHealthBuild` from `build-meta-core` | Would add a second failure path once `device-status` loads |

---

## What the user saw (ring then refresh)

| Observation | Likely explanation |
|---------------|-------------------|
| Dot still visible (red fill) | HTML/CSS for `#brand-status-dot` does not require JS |
| Brief ring | **Not** the load-failure red outline (that needs `data-device-status-error`). Possibilities: **focus** ring on the button, **hub intro** coachmark pulse (`.shell-status-cluster--hub-intro .shell-status-dot-btn::after` — red-tinted border), or a tab that still had an older cached bootstrap briefly |
| Ring gone after refresh | Intro coachmark dismissed (`hc_device_hub_intro_*`); or cache state changed; error outline was never set for this failure mode |
| Hosted-tier E2E failures | Same dead dot on `/` — not a push/SSE logic bug in isolation |

---

## Secondary issue (not primary for this incident)

[`DEVICE_SHELL_ASSET_VERSION`](../site/js/device-status-shell-modules.mjs) is **54** on shell HTML, while [`device-status.mjs`](../site/js/device-status.mjs) still imports graph peers at **`?v=45`**. That violates the contract in [`STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md`](STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md) § 2026-05-26 and can cause **stale mixed graph** symptoms **after** the Node import is fixed. It does not explain `node:child_process` in the console.

Uncommitted local work also bumped bootstrap to **54** without aligning peer `?v=` (Refresh all tabs / hub build stamp).

---

## What is *not* the cause

| Ruled out | Why |
|-----------|-----|
| Hub sheet reconcile / toggle trap | Requires `device-status.mjs` loaded; module never runs |
| `pointer-events` on float chrome | Same — no open handler |
| Hosted SSE / resolver tab sync | Fails on landing before push; dot dead is earlier |
| Missing migration / hosted flag | Server unrelated to client module graph |

---

## Verification steps (for whoever fixes)

1. Open `/` with DevTools → **Console** — expect `node:child_process` / CORS error on module load.
2. **Network** — `device-status-bootstrap.mjs?v=54` loads; dependent `build-meta-core.mjs` fails.
3. Confirm `#top-chrome` has **no** `data-device-status-error` while dot is dead.
4. After fix: `PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test e2e/device-status-dot.spec.ts:101 e2e/device-status-dot.spec.ts:145` should pass.

---

## Fix (shipped)

1. **`build-meta-browser.mjs`** — browser-safe helpers (no `node:` imports).
2. **`build-meta-core.mjs`** — Node-only (`execSync`, `render*Module`); re-exports browser helpers for Vitest/scripts only.
3. Shell imports updated: bootstrap, `device-network-health`, `device-hub-build-stamp` → `build-meta-browser.mjs` only.
4. **`DEVICE_SHELL_ASSET_VERSION` → 55** on shell HTML bootstrap tags; `build-meta-browser.mjs` added to shell manifest.

**Follow-up (shipped):** status-graph peer imports aligned to `DEVICE_SHELL_ASSET_VERSION` (55); Vitest guard in `device-status-shell-modules.test.ts`.

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-27 | Investigation opened; root cause `build-meta-core.mjs` → `node:child_process` in browser graph |
| 2026-05-27 | Fix: `build-meta-browser.mjs` split; shell asset v55 |
