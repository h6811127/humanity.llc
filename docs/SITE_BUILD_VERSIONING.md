# Site and Worker build versioning

**Status:** Phases 1–3 shipped.

When deploying straight to production, you need to answer **which deploy** is running in the browser and whether **Pages** and **Worker** are on the same commit. This doc defines build stamps, where they surface, and how they differ from cache-bust numbers.

## Problem

| Signal today | What it tells you | Limitation |
|--------------|-------------------|------------|
| `DEVICE_SHELL_ASSET_VERSION` | Shell status-graph JS changed (cache bust) | Manual bump; not tied to git or Pages deploy |
| Scattered `?v=` on CSS / other JS | Per-asset cache bust | Inconsistent across files |
| `GET /.well-known/hc/v1/health` → `version: "1.0"` | **hc/v1 protocol** version | Unrelated to site or Worker deploy |
| Cloudflare dashboard | Real deployment IDs | Not on the page during phone Safari debugging |

Typical failure modes:

1. **Pages deployed, Worker not** (or the reverse) — UI and API behavior diverge.
2. **Safari cached an old module** while HTML updated — mixed `?v=` on the status graph (see [`STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md`](STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md)).
3. **“I pushed but don’t see the fix”** — need to confirm new deploy vs stale tab.

## Principles

1. **One build stamp per artifact** — Pages (static site) and Worker (resolver) are deployed separately; each gets its own identity.
2. **Generate at deploy time** — do not hand-edit release identity; run `npm run site:build-meta` (Pages) or the Worker equivalent (Phase 3).
3. **Prefer git SHA + timestamp** — not `package.json` semver unless you adopt real releases.
4. **Keep cache bust separate** — `DEVICE_SHELL_ASSET_VERSION` stays for shell graph cache bust only; copy its value into `SITE_BUILD_META.shellAssetVersion` for debugging, do not replace it.
5. **Low noise in UI** — stewards should not see a marketing “v2.3.1” footer; use console, debug gate, or health JSON.

## Target shape

### Pages (`site/js/build-meta.mjs`)

Generated module (do not edit by hand):

| Field | Meaning |
|-------|---------|
| `gitSha` | Short git commit at generation time (`dev` / `unknown` when not in a git repo) |
| `builtAt` | ISO-8601 UTC timestamp when the file was written |
| `shellAssetVersion` | Current `DEVICE_SHELL_ASSET_VERSION` from [`device-status-shell-modules.mjs`](../site/js/device-status-shell-modules.mjs) |
| `source` | `deploy` \| `dev` \| `ci` — how the file was produced |

### Worker (`worker/src/generated/worker-build-meta.ts`)

Generated at deploy; exposed on health as `build`:

| Field | Meaning |
|-------|---------|
| `gitSha` | Short git commit at generation time |
| `builtAt` | ISO-8601 UTC when the file was written |
| `source` | `deploy` \| `dev` \| `ci` |

Example `GET /.well-known/hc/v1/health` body:

```json
{
  "version": "1.0",
  "operator": "…",
  "status": "ok",
  "database": "ok",
  "build": { "gitSha": "a3f9c2d", "builtAt": "2026-05-27T12:00:00.000Z" }
}
```

Keep existing `version` as **protocol** version only.

### Reading prod in one glance

| Layer | Where to look |
|-------|----------------|
| Site | DevTools console on shell pages: `[humanity] site build …` |
| Site (debug) | Device hub footer when `localStorage.hc_debug === "1"` or `?hc_debug=1` |
| Worker | `curl -s https://humanity.llc/.well-known/hc/v1/health \| jq .build` |
| Shell graph cache | `shell=` in console line or `SITE_BUILD_META.shellAssetVersion` |

## Phased implementation

### Phase 1 — Pages stamp + bootstrap console (shipped)

- [`worker/scripts/generate-build-meta.mjs`](../worker/scripts/generate-build-meta.mjs) writes [`site/js/build-meta.mjs`](../site/js/build-meta.mjs).
- [`site/js/build-meta-browser.mjs`](../site/js/build-meta-browser.mjs) — browser-safe helpers (shell imports **only** this file).
- [`site/js/build-meta-core.mjs`](../site/js/build-meta-core.mjs) — Node generators (`git`, `render*Module`); **never** import from shell pages ([`HUB_DOT_DEAD_INVESTIGATION_2026-05-27.md`](HUB_DOT_DEAD_INVESTIGATION_2026-05-27.md)).
- [`site/js/device-status-bootstrap.mjs`](../site/js/device-status-bootstrap.mjs) imports `build-meta-browser` and logs once on shell pages.
- **Commands:** `npm run site:build-meta` · runs automatically before `npm run pages:deploy` and `npm run deploy`.

**Git-connected Pages:** set **Build command** to:

```bash
npm run site:build-meta && npm run build
```

(Build output directory remains `site`.)

**Worker-only CI** (`.github/workflows/deploy-worker.yml`) does **not** update the site; Pages deploy is separate ([`site/README.md`](../site/README.md)).

### Phase 2 — Debug-gated hub UI (shipped)

- [`site/js/device-hub-build-stamp.mjs`](../site/js/device-hub-build-stamp.mjs) mounts at the bottom of `#device-hub-body` (before the status-key reference).
- Shown when `localStorage.hc_debug === "1"` or URL `?hc_debug=1` / `?hc_debug=true` ([`isSiteDebugEnabled()`](../site/js/build-meta-browser.mjs)).
- Displays `SITE_BUILD_META` as `Site {sha} · shell {n} · {source}`; **Copy build info** writes multi-line text for bug reports.
- Wired from [`initDeviceHub()`](../site/js/device-hub-ui.mjs) on all shell hub pages.
- Listed in [`DEVICE_STATUS_SHELL_JS_FILES`](../site/js/device-status-shell-modules.mjs) (bump shell asset version when changing).

**Enable on a phone:** Safari → bookmark or type `?hc_debug=1` once, or in console: `localStorage.hc_debug = "1"` then reload and open the hub.

### Phase 3 — Worker health `build` (shipped)

- [`worker/scripts/generate-worker-build-meta.mjs`](../worker/scripts/generate-worker-build-meta.mjs) writes [`worker/src/generated/worker-build-meta.ts`](../worker/src/generated/worker-build-meta.ts).
- [`worker/src/resolver-health-build.ts`](../worker/src/resolver-health-build.ts) maps meta into the health JSON `build` object.
- [`worker/src/index.ts`](../worker/src/index.ts) `healthResponse()` always includes `build` (ok and degraded responses).
- **Commands:** `npm run worker:build-meta` · runs automatically before `npm run worker:deploy` (and CI deploy via `.github/workflows/deploy-worker.yml`).

## Commands

| Command | When |
|---------|------|
| `npm run site:build-meta` | Before Pages deploy; optional locally to match prod stamping |
| `npm run worker:build-meta` | Before Worker deploy; optional locally |
| `npm run pages:deploy` | Runs `site:build-meta` then `wrangler pages deploy` |
| `npm run deploy` | Same as `pages:deploy` |
| `npm run worker:deploy` | Runs `worker:build-meta`, bundle-scan, then `wrangler deploy` |

Local dev without regenerating keeps the committed default stamp (`gitSha: "dev"`). Regenerate when you need a real SHA in console:

```bash
npm run site:build-meta
npm run pages:dev
```

## What not to do

- Do **not** use `DEVICE_SHELL_ASSET_VERSION` as the release version — bump it only for shell graph cache bust ([`AGENTS.md`](../AGENTS.md)).
- Do **not** put a prominent version string on the public landing for end users.
- Do **not** assume Worker deploy updated `/create/` or shell JS — that requires Pages deploy.
- Do **not** register a PWA service worker that caches shell JS without `DEVICE_SHELL_ASSET_VERSION` in the cache key — see [`PWA_INSTALL.md`](PWA_INSTALL.md) § Caching (v1 ships **without** SW).

## Tests

After changes to build meta, bootstrap logging, hub debug stamp, or Worker health `build`:

```bash
npm run worker:test -- worker/tests/site-build-meta.test.ts worker/tests/resolver-health-build.test.ts worker/tests/device-status-shell-modules.test.ts
```

## Related docs

- [`STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md`](STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md) — mixed `?v=` / shell graph
- [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) — manual shell smoke
- [`site/README.md`](../site/README.md) — Pages vs Worker deploy
- [`AGENTS.md`](../AGENTS.md) — agent commands
