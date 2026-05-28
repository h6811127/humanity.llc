# AGENTS.md

## Cursor Cloud specific instructions

This is a Cloudflare Workers + Pages project. No Docker, external databases, or third-party services are needed for local development.

### Node version

The project requires **Node.js 20.18.1** (pinned in `.nvmrc`). Wrangler 4.47.0 does not support Node 22+.

```bash
source ~/.nvm/nvm.sh && nvm use 20.18.1
```

### Services

| Service | Command | URL | Notes |
|---------|---------|-----|-------|
| Worker (API + scan resolver) | `npm run worker:dev` | `http://127.0.0.1:8787` | Must run `npm run worker:migrate:local` first |
| Pages (static site) | `npm run pages:dev` | `http://localhost:8788` | Serves create/created/revoke UI |

### Key commands

- **Install deps**: `npm install`
- **Migrations**: `npm run worker:migrate:local` (idempotent, required before worker:dev)
- **Tests**: `npm run worker:test` (Vitest, all `worker/tests/`) · device-only: `npm run worker:test:device` (`worker/tests/device*`)
- **E2E**: `npm run e2e:install` once, then `npm run e2e` (Playwright; starts `pages:dev` unless `PLAYWRIGHT_SKIP_WEBSERVER=1`)
- **Orphan purge**: Daily cron purges abandoned cards per `docs/CARD_RETENTION_AND_ORPHAN_CLEANUP.md`
- **Landing desktop**: Wider two-column intro at ≥880px per `docs/LANDING_DESKTOP_LAYOUT.md`
- **Scan Path 2 UI (`pass-v33`)**: Live check data-arriving + dot sync + L3 actor band — `docs/SCAN_PAGE_TRUST_UI.md`, motion in `docs/VISUAL_IDENTITY_PRINCIPLES.md`. After `site/scan-pass.css` changes: `npm run worker:bundle-scan`. Tests: `npm run worker:test:scan-live-check-arrive` · `npm run worker:test:scan-actor-band`. Prototype: `/prototypes/scan-trust-ui-demo.html` on Pages dev.
- **Merch funnel MVP**: Scan → profile → QR customizer → Shopify → Printify — `docs/MERCH_FUNNEL_MVP.md` (§ Implementation priority stack). **Headless wiring:** `docs/MERCH_HEADLESS_COMMERCE.md`. Tier 0: `/shop/` · Tier 1: `/shop/customize/` · scan CTA `hc_ref=scan_customize` · artifact intent API · Worker route `humanity.llc/v1/*`. Engineering gate: `npm run merch-funnel:verify-exit` · operator: `merch-funnel:verify-config` · E2E: `e2e:merch-funnel` · physical print QA: `docs/MERCH_PHYSICAL_QA_RUNBOOK.md` · `npm run worker:test:merch-print-qa`. After `site/scan-pass.css` changes: `npm run worker:bundle-scan`. **Next product gate:** M5 stranger runbook (Priority 2) before live Tier 1 checkout.
- **AI L3 P1 (explain snapshot)**: Opt-in plain-language summary of signed `public_snapshot` — `docs/AI_FEATURE_DEVELOPMENT.md` · `docs/AI_L3_EXPLAIN_SNAPSHOT.md`. Worker: `POST /.well-known/hc/v1/ai/explain-snapshot` · `[ai]` binding in `worker/wrangler.toml`. Scan: `site/js/scan-ai-explain.mjs`. Tests: `npm run worker:test:ai-explain` · `npm run worker:bundle-scan`.
- **AI L3 P2 (draft manifesto)**: **UI retired** — steward ghostwriting removed from `/created/` (2026-05-27). API kept for tests only: `docs/AI_L3_DRAFT_MANIFESTO.md` · `POST /.well-known/hc/v1/ai/draft-manifesto`. Tests: `npm run worker:test:ai-draft`.
- **Build check**: `npm run build` (validates static site exists)
- **Build stamps (debug):** `docs/SITE_BUILD_VERSIONING.md` — Pages: `npm run site:build-meta` before `pages:deploy`; console + hub (`hc_debug`). Worker: `npm run worker:build-meta` before `worker:deploy`; `GET /.well-known/hc/v1/health` → `build`. Tests: `npm run worker:test -- worker/tests/site-build-meta.test.ts worker/tests/resolver-health-build.test.ts`.
- **Worker dev**: `npm run worker:dev`
- **Pages dev**: `npm run pages:dev`
- **Showcase scan URLs** (M5 / landing): `npm run site:refresh-showcase` (status plate + live object streams), or `site:seed-showcase` / `site:seed-showcase-live-object` / `site:seed-showcase-lost-item` individually (each needs `API_ORIGIN`)

### Non-obvious notes

- **Cards vs keys vs verification:** `docs/KEYS_CARDS_AND_VERIFICATION.md` and `docs/ROOT_CARD_AND_CHILD_OBJECTS.md` - steward status is on the resolver; vouch signing needs root `hc_created` keys on the same browser tab. **Large wallets (~10+ saved root cards):** same doc § Realistic scale; target product direction is one root card with many child objects, but poll budget, shell perf, and multi-tab issues in `docs/DEVICE_OS_REQUEST_BUDGET.md` still apply before treating large roots/objects as supported.
- **Cross-tab keys / inbox chrome:** `docs/CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md` (spec) · `docs/CROSS_TAB_KEYS_REBUILD_PLAN.md` (Phases 1–6 shipped) — not OS notifications; `device-chrome-refresh.mjs` coordinator + fingerprint snapshot. After changes: `npm run worker:test -- worker/tests/device-cross-tab-state.test.ts worker/tests/device-cross-tab-scan-snapshot.test.ts worker/tests/device-cross-tab.test.ts` and `npm run e2e -- e2e/device-cross-tab-keys.spec.ts`.
- **Status dot vs inbox vs OS alerts:** `docs/DEVICE_INBOX.md` (action items, badge, background alerts) vs `docs/STATUS_INDICATOR_STEWARD_GREEN.md` (trust dot only). **Steward roadmap index:** `docs/STEWARD_DEVICE_ROADMAP.md` (keys, Browser alerts, hosted push, PWA — links only).
- **Safari / iPhone shell regression (scroll, dead taps):** `docs/SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md` — fix plan; hub scroll smooth / landing lag implicates `device-shell-chrome.mjs` document scroll listener. **Reverted features catalog:** `docs/UI_UX_REVERTED_FEATURES_CATALOG.md` (safe rebuild without lag/rate-limit paths). **Phased implementation:** `docs/UI_UX_SAFE_REBUILD_IMPLEMENTATION.md`.
- **Card disabled since visit:** Banner, hub `#device-hub-card-disabled-group`, and inbox badge must use **resolver-confirmed** poll maps only — never `sessionStorage.hc_wallet_network_cache` alone. Incident **closed** (no Slice 9); see `docs/CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md`. After hub/inbox network changes: `npm run worker:test:card-disabled-since-visit` and `npm run e2e:card-disabled-since-visit`.
- **Shell popover contrast:** New floating UI must use `--surface-popover-*` per `docs/UI_COLOR_SCHEME_STANDARD.md`. After CSS changes to migrated selectors: `npm run worker:test:ui-color-scheme`; manual **P1-5** / **P1-6** in `docs/DEVICE_OS_QA.md`.
- **Keys custody emphasis cards:** Compact stacked layout on hub/wallet — `docs/KEYS_CUSTODY_EMPHASIS_CARD_SPACING_INVESTIGATION.md` (closed). After `site/styles.css` / `device-keys-custody.mjs` changes: `npm run worker:test:keys-custody` · `npm run e2e:keys-custody` · manual **P1-KC** in `docs/DEVICE_OS_QA.md`.
- **PWA install (device shell):** `docs/PWA_INSTALL.md` — steward-only Add to Home Screen on `/`, `/wallet/`, `/created/`; **never** scan or `/create/`. Load `pwa-install.mjs` **lazily** after status bootstrap — do not static-import from `device-status.mjs` unless added to `DEVICE_STATUS_SHELL_JS_FILES` in the same PR. **No service worker** in Phases 1–3 (cache skew risk). Tests: `npm run worker:test:pwa-install` · manual **P1-PWA** in `docs/DEVICE_OS_QA.md`.
- **Worker request budget / polling:** Read `docs/DEVICE_OS_REQUEST_BUDGET.md` before shell network I/O. Shipped Phases 1–9 + 8c. **Resolver tab sync (1a–1b + landing toggle):** `docs/DEVICE_TAB_RESOLVER_SYNC.md` — `hc-resolver-sync` BC (network 60s, health 30s); opt out via homepage **Share network checks** or `hc_resolver_sync_tabs=0`. After hub network changes: `npm run worker:test -- worker/tests/device-resolver-sync.test.ts` · `npm run e2e -- e2e/device-resolver-sync.spec.ts` · manual **P1-1** in `docs/DEVICE_OS_QA.md`. **Hosted tier:** **M8 complete**; **G0 signed** (Governance + Ops; Legal pending G7). Production rollout: [`docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md`](docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md) § Production rollout — `hosted:rollout:step1` → `step6`. Step 4b: `hosted:rollout:step4b -- --preflight` then `--deploy` / `--smoke` / `--verify`. Final regression: `hosted:rollout:step6 -- --verify`. Ops: `docs/HOSTED_STEWARD_OPS_RUNBOOK.md` · E6.1 `docs/HOSTED_STEWARD_CF_DASHBOARD.md` · E6.2 CI `.github/workflows/steward-ops-daily.yml`. Migrations: `0012_steward_hosted.sql`, `0013_steward_billing.sql`.

### Status dot / hub opener (agent guardrails)

The floating **status dot** (`#brand-status-dot-btn`) is the hub opener on `/`, `/create/`, and `/created/`. On `/wallet/` it only scrolls to saved cards. Do not wire glance-first on dot tap.

**Red outline ring + dead dot on all pages** = `device-status.mjs` import graph failed (`data-device-status-error`). See `docs/STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md`. Never merge a new `./device-*.mjs` import on the status graph without the file in the same PR; add the filename to `DEVICE_STATUS_SHELL_JS_FILES` in `site/js/device-status-shell-modules.mjs`, bump `DEVICE_SHELL_ASSET_VERSION` on shell HTML bootstrap and on every `./peer.mjs?v=N` import between manifest peers. Run `npm run worker:test -- worker/tests/device-status-shell-modules.test.ts`. **Lazy subgraphs (Shell P2):** `device-inbox-sheet-loader.mjs` and `device-browser-notifications-loader.mjs` — do not static-import full sheet/notifications from `device-status.mjs` or `device-hub-ui.mjs`. Tests: `npm run worker:test:lazy-shell`.

When you touch any of these, run the regression suite before finishing:

- `site/js/device-status.mjs`, `device-status-bootstrap.mjs`, `device-dot-state-core.mjs`
- `site/js/device-hub-sheet.mjs`, `device-inbox-sheet.mjs`, `device-hub-glance.mjs`, `device-shell-chrome.mjs`, `device-hub-glance-popover.mjs`
- `site/css/device-shell.css` (especially `pointer-events` on `.top-chrome--float` / `.shell-status-cluster`)

```bash
npm run worker:test
npm run e2e:install   # once per machine
npm run device-shell:e2e
npm run e2e -- e2e/device-cross-tab-keys.spec.ts e2e/device-status-dot.spec.ts e2e/device-inbox.spec.ts e2e/device-os-wallet.spec.ts e2e/scan-page-dot.spec.ts
```

**Contracts (do not break without updating docs + tests):**

1. **Module graph** — `device-status-bootstrap.mjs` dynamically imports `device-status.mjs`; a failed import leaves the dot dead with no click handler. New imports must ship in the same deploy and stay listed in `site/js/device-status-shell-modules.mjs` (Vitest + `e2e/device-status-dot.spec.ts`).
2. **Hub open state** — Open/close only through `setHubSheetOpen()` / `setHubExpanded()`. `hubSheetOpen()` treats a collapsed `#device-hub` as closed even if `body.device-hub-sheet-open` is stuck (toggle-trap fix).
3. **Clickability CSS** — `.top-chrome--float { pointer-events: none }` with `.shell-status-cluster` (and dot/badge) at `pointer-events: auto` when `top-chrome--edge-hidden` or hub/inbox locked. See `docs/STATUS_INDICATOR_STEWARD_GREEN.md` troubleshooting.

Manual smoke: `docs/DEVICE_OS_QA.md` **P0-3** (dot opens hub; scroll + tap again). After Safari shell changes: **P0-W** on production WebKit devices.
- The Worker health endpoint is at `/.well-known/hc/v1/health`. If `database` shows `schema_missing`, run migrations.
- The D1 database is emulated locally by Wrangler  -  no external SQLite or Cloudflare account needed for dev.
- Card creation requires Ed25519-signed JSON documents (card + qr_credential). Test fixtures in `worker/tests/fixtures/` provide valid signed payloads.
- The `CLOUDFLARE_API_TOKEN` env var is only needed for remote deployment, not local dev/test.
- Wrangler may print deprecation warnings about Vite CJS build  -  these are harmless.
