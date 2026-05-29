# PWA install — implementation plan

**Status:** Phases 0–9 shipped · Phase 4.1 brand-dot icons · iOS Safari P1-PWA signed off 2026-05-28 · **H-006 closed** · **H-007 closed**  
**Audience:** Engineers implementing [`PWA_INSTALL.md`](PWA_INSTALL.md)  
**Related:** [`PWA_INSTALL.md`](PWA_INSTALL.md) · [`DEVICE_OS.md`](DEVICE_OS.md) · [`HC_EMPHASIS_CARD_ROLLOUT.md`](HC_EMPHASIS_CARD_ROLLOUT.md) · [`AGENTS.md`](../AGENTS.md) · [`SITE_BUILD_VERSIONING.md`](SITE_BUILD_VERSIONING.md)

---

## Goal

Ship steward-only **Add to Home Screen / Install** for the device shell without:

- Prompting on scan or create flows
- Registering a service worker (v1)
- Breaking the status-dot import graph
- Competing with cross-tab / orphan inbox urgency
- Adding Worker network I/O

---

## Process (every phase)

1. Read the phase section below (scope, files, forbidden deps).
2. Implement **only** what the phase lists.
3. **Do not** add `pwa-install.mjs` to `DEVICE_STATUS_SHELL_JS_FILES` unless it becomes a static import of `device-status.mjs` (avoid).
4. If touching shell HTML bootstrap `?v=`, bump `DEVICE_SHELL_ASSET_VERSION` only for **unrelated** status-graph changes in the same PR — PWA lazy import uses the same constant but does not require a bump by itself.
5. Run the phase automated checks.
6. Update **Status** row in [`PWA_INSTALL.md`](PWA_INSTALL.md) phase table.
7. Manual **P1-PWA** when Phase 2+ touches visible UI ([`DEVICE_OS_QA.md`](DEVICE_OS_QA.md)).

---

## Phase 0 — Spec + contracts (shipped)

### Scope

| In scope | Out of scope |
|----------|--------------|
| `docs/PWA_INSTALL.md` | Manifest file on disk |
| `docs/PWA_INSTALL_IMPLEMENTATION.md` | DOM wiring |
| `pwa-install-metadata-core.mjs` | Icons |
| `pwa-install-ux-core.mjs` | E2E |
| Vitest contract tests | Service worker |

### Verification

```bash
npm run worker:test -- worker/tests/pwa-install-metadata.test.ts worker/tests/pwa-install-ux.test.ts
```

---

## Phase 1 — Metadata

### Intent

Browsers and OS can **discover** installability; no user-facing install card yet.

### Files

| File | Action |
|------|--------|
| `site/manifest.webmanifest` | Create per [`PWA_INSTALL.md`](PWA_INSTALL.md) § Manifest contract |
| `site/icons/pwa-192.png` | Create |
| `site/icons/pwa-512.png` | Create |
| `site/icons/pwa-apple-touch.png` | Create (180×180) |
| `site/index.html` | Add manifest + apple-touch-icon links |
| `site/wallet/index.html` | Same |
| `site/created/index.html` | Same |

### Forbidden

- Service worker registration
- `beforeinstallprompt` handlers
- Changes to Worker scan HTML

### Verification

```bash
npm run worker:test -- worker/tests/pwa-install-metadata.test.ts
npm run build
curl -s http://localhost:8788/manifest.webmanifest | jq .
```

Extend `pwa-install-metadata.test.ts` with:

- Manifest file exists and parses
- Shell HTML contains `<link rel="manifest"`
- Scan bundle / scan HTML does **not** link manifest (grep test)

---

## Phase 2 — Install UX

### Intent

Returning stewards see dismissible install emphasis card on shell pages when gates pass.

### Files

| File | Action |
|------|--------|
| `site/js/pwa-install.mjs` | DOM, event listeners, lazy init |
| `site/js/pwa-install-html.mjs` | `emphasisCardBodyHtml` wrapper |
| `site/index.html` | `#device-pwa-install-card` placeholder (hidden) |
| `site/wallet/index.html` | Same |
| `site/created/index.html` | Same (lower priority — may defer) |
| `site/css/device-shell.css` | Spacing for install card if needed |
| `device-status-bootstrap.mjs` or `device-chrome-refresh.mjs` | Lazy `import("./pwa-install.mjs?v=…")` after status load |

### Wiring sketch

```javascript
// pwa-install.mjs — after status healthy
import { shouldShowPwaInstallSurface, canTriggerNativeInstallPrompt } from "./pwa-install-ux-core.mjs";
import { readSavedCardCount, readActiveInboxKinds } from "…"; // existing helpers only

function renderInstallCard() {
  const show = shouldShowPwaInstallSurface({ /* … */ });
  // mount emphasis card, bind dismiss + prompt
}
document.addEventListener("hc-device-os-refreshed", () => debouncedRender());
window.addEventListener("beforeinstallprompt", onBip);
```

### Forbidden

- Static import from `device-status.mjs`
- Importing `device-inbox-sheet.mjs`
- Auto-prompt on first paint (wait for saved count + inbox snapshot)
- Install card on scan pages

### Verification

```bash
npm run worker:test -- worker/tests/pwa-install-metadata.test.ts worker/tests/pwa-install-ux.test.ts
npm run worker:test -- worker/tests/device-emphasis-card-html.test.ts
```

Manual **P1-PWA** (Chromium + iOS Safari if available).

---

## Phase 3 — E2E + closure

### Intent

Lock behavior in CI; close backlog item **H-006**.

### Files

| File | Action |
|------|--------|
| `e2e/device-pwa-install.spec.ts` | Gate tests with Playwright |
| `docs/V1_IMPLEMENTATION_BACKLOG.md` | Mark H-006 exit criteria |
| `package.json` | Optional `worker:test:pwa-install` script |

### E2E scenarios (minimum)

1. Landing with saved card fixture → install card visible in Chromium when `beforeinstallprompt` mocked
2. Scan page → no `#device-pwa-install-card`
3. Dismiss → card hidden; `hc_pwa_install_dismissed_at` set

### Verification

```bash
npm run e2e -- e2e/device-pwa-install.spec.ts
npm run worker:test -- worker/tests/pwa-install-metadata.test.ts worker/tests/pwa-install-ux.test.ts
```

---

## Phase 4 — Rollout gate

### Intent

Validate install behavior on real devices before expanding manifest coverage; lock remaining P1-PWA gates in CI where possible.

### Files

| File | Action |
|------|--------|
| `e2e/device-pwa-install.spec.ts` | Extend with Phase 4 describe (create exclusion, inbox block, iOS copy, standalone hub, status error, no SW) |
| `docs/PWA_INSTALL.md` | Phase 4 row + rollout checklist |
| `docs/DEVICE_OS_QA.md` | Cross-link automated Phase 4 coverage |
| `package.json` | `e2e:pwa-install` script |
| `.github/workflows/test-site.yml` | CI job `PWA install E2E (Phase 4 smoke)` |

### Automated scenarios (Phase 4)

1. `/create/` — no install card placeholder (P1-PWA step 2)
2. Zero saved cards — card hidden
3. `cross_tab_keys` inbox active — card hidden (P1-PWA step 8)
4. iOS Safari user agent on `/wallet/` — manual copy only (P1-PWA step 9)
5. Standalone display mode — no card; dot opens hub (P1-PWA step 10 / P0-3)
6. `data-device-status-error` — card hidden (P1-PWA step 11)
7. No service worker registered after PWA module load (v1 policy)

### Manual sign-off (required)

Run [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P1-PWA** on a **deployed HTTPS origin**:

- Steps 1, 4, 6–7 (install/dismiss/snooze/cross-tab with real installed PWA)
- **P0-3** + **P0-W** from standalone launch

Localhost validates metadata and CI smoke only — not real mobile install sheets.

### Verification

```bash
npm run worker:test:pwa-install
npm run e2e:pwa-install
```

---

## Phase 5 — Closure

### Intent

Lock Phase 4 rollout decisions (no manifest on reference pages; scan not installable); enforce manifest scope in CI; close **H-006**.

### Files

| File | Action |
|------|--------|
| `site/js/pwa-install-metadata-core.mjs` | `PWA_ROLLOUT_*` constants, `PWA_MANIFEST_LINK_ALLOWED_HTML_PATHS`, `mayHtmlFileLinkPwaManifest()` |
| `worker/tests/pwa-install-metadata.test.ts` | Site-wide HTML walk + rollout decision assertions |
| `docs/PWA_INSTALL.md` | Phase 5 row + locked decisions |
| `docs/V1_IMPLEMENTATION_BACKLOG.md` | H-006 closed |
| `docs/STEWARD_DEVICE_ROADMAP.md` | PWA row → Phases 1–5 shipped |

### Verification

```bash
npm run worker:test:pwa-install
npm run e2e:pwa-install
```

---

## Phase 6 — Standalone soft refresh on resume

### Intent

When `display-mode: standalone`, run the **soft refresh pipeline** on warm resume so hub/network state catches up without browser reload. Highest ROI for the “no way to refresh on home screen” gap.

### Scope

| In scope | Out of scope |
|----------|--------------|
| `pwa-standalone-refresh-core.mjs` — `isStandaloneMode()`, `shouldRunStandaloneSoftRefresh()`, pipeline steps contract | Pull-to-refresh UI |
| `pwa-standalone-refresh.mjs` — `visibilitychange` + `pageshow` (`persisted`) hooks | `location.reload()` on every open |
| Lazy load after status bootstrap (same pattern as `pwa-install.mjs`) | Auto-start `initDeviceOsCoordinator()` |
| Vitest contract tests | Service worker |
| Call existing `refreshDeviceChrome`, `refreshNetwork`, debounced `fetchAndApplyNetworkChips` | Scan / create / `/created/` surfaces |

### Files

| File | Action |
|------|--------|
| `site/js/pwa-standalone-refresh-core.mjs` | Create — standalone detection + soft refresh contract |
| `site/js/pwa-standalone-refresh.mjs` | Create — resume listeners, debounce coalesce |
| `site/js/pwa-install.mjs` | Optional — extract shared `isStandaloneMode()` to core |
| `device-status-bootstrap.mjs` or `device-chrome-refresh.mjs` | Lazy `import("./pwa-standalone-refresh.mjs?v=…")` after status load |
| `worker/tests/pwa-standalone-refresh-core.test.ts` | Event matrix + pipeline step contract |

### Wiring sketch

```javascript
// pwa-standalone-refresh.mjs — standalone only
import { isStandaloneMode, runStandaloneSoftRefresh } from "./pwa-standalone-refresh-core.mjs";

function onResume() {
  if (!isStandaloneMode()) return;
  void runStandaloneSoftRefresh({ reason: "resume" });
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") onResume();
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted) onResume();
});
```

`runStandaloneSoftRefresh` orchestrates existing modules — do not duplicate poll logic.

### Forbidden

- Static import from `device-status.mjs`
- Full page reload on resume
- Unscoped parallel status GET per saved card
- PTR DOM in Phase 6

### Verification

```bash
npm run worker:test -- worker/tests/pwa-standalone-refresh-core.test.ts
npm run worker:test:pwa-install
npm run e2e:pwa-install   # resume + PTR smoke (P1-PWA-R steps 1, 3, 5+)
```

Manual **P1-PWA-R** steps 1–4 ([`DEVICE_OS_QA.md`](DEVICE_OS_QA.md)).

### Status

**Shipped 2026-05-29** — `pwa-standalone-refresh-core.mjs`, `pwa-standalone-refresh.mjs`, lazy bootstrap load, Vitest `pwa-standalone-refresh-core.test.ts`.

---

## Phase 7 — Pull-to-refresh

### Intent

Explicit steward control: pull down on `/` and `/wallet/` in standalone to run the same soft refresh pipeline with visible feedback.

### Scope

| In scope | Out of scope |
|----------|--------------|
| Custom PTR indicator (top of page content or hub scroll root) | Browser-native PTR assumption |
| “Updated” / in-progress affordance | Hard pull → `location.reload()` (defer) |
| Gesture guards when hub/inbox sheet open | PTR on `/created/` |
| Standalone-only (unless PWA-R1 resolves to browser too) | New Worker endpoints |

### Files

| File | Action |
|------|--------|
| `site/js/pwa-standalone-refresh.mjs` | PTR touch/pointer handlers, indicator DOM |
| `site/css/device-shell.css` | PTR indicator styles (`--surface-popover-*` if floating) |
| `pwa-standalone-refresh-core.mjs` | `pullToRefreshAllowed({ sheetOpen, pathname })` |
| `e2e/device-pwa-install.spec.ts` or `e2e/device-pwa-refresh.spec.ts` | Mock standalone + pull smoke |
| `site/index.html`, `site/wallet/index.html` | Optional `#device-ptr-indicator` placeholder |

### Forbidden

- PTR on scan or create
- PTR that triggers live-control poll when watch is off **and** no chrome/chip update occurs (must still run steps 1–4 of soft pipeline)
- Competing scroll handlers on hub sheet without gesture guard

### Verification

```bash
npm run worker:test -- worker/tests/pwa-standalone-refresh-core.test.ts
npm run e2e:pwa-install   # or dedicated refresh spec
```

Manual **P1-PWA-R** steps 5–8.

### Status

**Shipped 2026-05-29** — PTR touch handlers, `#device-ptr-indicator` styles in `device-shell.css`, Vitest + `e2e:pwa-install` smoke.

---

## Phase 8 — Stale shell nudge

### Intent

After deploy, standalone users may run mixed shell JS. Compare a cache-busted fetch of `/js/build-meta.mjs` (live Pages stamp) with the in-memory `SITE_BUILD_META` import; show dismissible “Update available — tap to refresh” that hard-reloads with `_hc_shell` cache bust.

### Scope

| In scope | Out of scope |
|----------|--------------|
| Compare live `build-meta.mjs` `gitSha` / `shellAssetVersion` vs in-memory import on init, resume, PTR | Auto-reload without user tap |
| Emphasis card or slim hub banner in standalone only | Prominent version footer for all users |
| Tap → `location.replace(staleShellHardReloadHref(...))` | Service worker update flow |
| Worker health `build` for debug hub only | Using Worker SHA as stale-shell signal (false positive — separate deploys) |

### Files

| File | Action |
|------|--------|
| `site/js/build-meta-browser.mjs` | `fetchLiveSiteBuildMeta()`, `parseSiteBuildMetaFromModuleText()` |
| `site/js/pwa-standalone-refresh-core.mjs` | `isShellBuildStale(liveSiteMeta, clientMeta)`, `staleShellHardReloadHref()` |
| `site/js/pwa-standalone-refresh.mjs` | Banner render after resume / PTR / init |
| `docs/SITE_BUILD_VERSIONING.md` | Cross-link stale nudge |
| `worker/tests/pwa-standalone-refresh-core.test.ts` | Stale detection unit tests |

### Verification

```bash
npm run worker:test -- worker/tests/pwa-standalone-refresh-core.test.ts worker/tests/site-build-meta.test.ts
```

Manual **P1-PWA-R** step 9.

### Status

**Shipped 2026-05-29** — `isShellBuildStale()` + dismissible `#device-pwa-stale-shell-banner`; live Pages compare on standalone init/resume/PTR.

**Fixed 2026-05-29** — Replaced Worker health compare (card persisted after Refresh when Worker ≠ Pages SHA). See [`PWA_INSTALL.md`](PWA_INSTALL.md) § Stale shell nudge — detection fix.

---

## Phase 9 — Supplementary affordances

### Intent

Low-discoverability fallbacks for stewards who do not know pull-to-refresh: explicit hub **Refresh** row, one-time PTR tip, and install-card copy mentioning PTR.

### Scope

| In scope | Out of scope |
|----------|--------------|
| Hub glance **Refresh** row on `/` and `/wallet/` (standalone + ≥1 saved card) | Long-press dot refresh |
| One-time dismissible PTR tip (`hc_pwa_ptr_tip_dismissed`) | Build-stamp tap debug affordance |
| Install card detail copy mentions pull-to-refresh | PTR in browser tabs (PWA-R1) |

### Files

| File | Action |
|------|--------|
| `site/js/pwa-standalone-refresh-core.mjs` | `shouldShowStandaloneRefreshRow`, `shouldShowStandalonePtrTip`, dismiss keys |
| `site/js/pwa-standalone-affordances-html.mjs` | Refresh row + PTR tip markup |
| `site/js/pwa-standalone-refresh.mjs` | `syncStandaloneAffordances()`, manual refresh tap |
| `site/js/pwa-install-html.mjs` | Install card detail copy |
| `site/css/device-shell.css` | Refresh row + PTR tip spacing |
| `worker/tests/pwa-standalone-refresh-core.test.ts` | Affordance gating unit tests |
| `e2e/device-pwa-install.spec.ts` | Refresh row + PTR tip smoke |

### Verification

```bash
npm run worker:test:pwa-install
npm run e2e:pwa-install
```

Manual **P1-PWA-R** steps 11–12.

### Status

**Shipped 2026-05-29** — hub Refresh row, first standalone PTR tip, install card PTR copy.

---

## H-007 closure — resume E2E + doc sync

### Intent

Close the remaining automation gap for standalone resume soft refresh (**P1-PWA-R** steps 1–3) and sync Phases 6–9 across specs after Phase 9 shipped.

### Scope

| In scope | Out of scope |
|----------|--------------|
| `__hcResumeRefreshTestTrigger` test hook | PTR in browser tabs (PWA-R1 — resolved standalone-only) |
| `e2e:pwa-install` resume + bfcache pageshow smoke | Manual iOS Safari P1-PWA-R sign-off |
| Phase 9 row in delivery table; PWA-R1–R4 resolved | New refresh features |

### Verification

```bash
npm run worker:test:pwa-install
npm run e2e:pwa-install
```

### Status

**Shipped 2026-05-29** — resume E2E smoke; H-007 fully closed in docs.

---

## Rollback

| Phase | Rollback |
|-------|----------|
| 1 | Remove manifest link tags + manifest file; redeploy Pages |
| 2 | Remove lazy import + HTML placeholder; card absent |
| 3 | Delete e2e spec only |
| 6–9 | Remove lazy import of `pwa-standalone-refresh.mjs`; PTR indicator CSS; stale banner; affordance rows |

No database or Worker migration rollback required.

---

## Open questions (resolve before Phase 2)

| ID | Question | Default if unresolved |
|----|----------|------------------------|
| PWA-Q1 | Show install card on `/created/` or landing+wallet only? | Landing + wallet first |
| PWA-Q2 | `start_url` query `?source=pwa` | Omit in v1 |
| PWA-Q3 | Hub collapsed glance vs hero placement on landing | Below hero, above hub sheet |

## Open questions (resolve before Phase 7)

| ID | Question | Default if unresolved |
|----|----------|------------------------|
| PWA-R1 | PTR on in-browser shell pages too? | Standalone-only |
| PWA-R2 | Pull triggers live-control when watch on? | Yes — same scope gates |
| PWA-R3 | Hub “Refresh” row placement? | Hub glance row |
| PWA-R4 | `?source=pwa` for first-open tip? | Omit; use `isStandaloneMode()` |

See [`PWA_INSTALL.md`](PWA_INSTALL.md) § Standalone refresh & resume for full spec.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-29 | H-007 closure — resume E2E smoke; Phases 6–9 doc sync |
| 2026-05-29 | Phase 9 shipped — hub Refresh row, first PTR tip, install card copy |
| 2026-05-29 | Phase 8 shipped — stale shell nudge; H-007 closed |
| 2026-05-29 | Phase 7 shipped — standalone pull-to-refresh |
| 2026-05-29 | Phase 6 shipped — standalone resume soft refresh modules + Vitest |
| 2026-05-29 | Phases 7–8 defined — PTR, stale shell nudge |
| 2026-05-28 | Phase 5 closure — rollout decisions + site-wide manifest CI gate; H-006 closed |
| 2026-05-28 | Phase 4.1 — brand-dot home screen icons; `site:generate-pwa-icons`; iOS Safari P1-PWA sign-off |
| 2026-05-28 | Phase 4 automated CI gate — `e2e:pwa-install` in `test-site.yml`; standalone hub E2E waits for status dot |
| 2026-05-28 | Phase 4 rollout gate — extended E2E + manual HTTPS sign-off checklist |
| 2026-05-27 | Phase 3 shipped — E2E + backlog H-006 closure |
| 2026-05-27 | Phase 2 shipped — install card UX + lazy bootstrap load |
| 2026-05-27 | Phase 1 shipped — manifest, icons, shell `<link>` tags |
| 2026-05-27 | Phase 0 shipped; Phases 1–3 defined |
