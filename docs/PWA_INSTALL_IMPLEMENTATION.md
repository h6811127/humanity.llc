# PWA install — implementation plan

**Status:** Phases 0–3 shipped · **Phase 4 rollout gate in progress**  
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

## Rollback

| Phase | Rollback |
|-------|----------|
| 1 | Remove manifest link tags + manifest file; redeploy Pages |
| 2 | Remove lazy import + HTML placeholder; card absent |
| 3 | Delete e2e spec only |

No database or Worker migration rollback required.

---

## Open questions (resolve before Phase 2)

| ID | Question | Default if unresolved |
|----|----------|------------------------|
| PWA-Q1 | Show install card on `/created/` or landing+wallet only? | Landing + wallet first |
| PWA-Q2 | `start_url` query `?source=pwa` | Omit in v1 |
| PWA-Q3 | Hub collapsed glance vs hero placement on landing | Below hero, above hub sheet |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-28 | Phase 4 rollout gate — extended E2E + manual HTTPS sign-off checklist |
| 2026-05-27 | Phase 3 shipped — E2E + backlog H-006 closure |
| 2026-05-27 | Phase 2 shipped — install card UX + lazy bootstrap load |
| 2026-05-27 | Phase 1 shipped — manifest, icons, shell `<link>` tags |
| 2026-05-27 | Phase 0 shipped; Phases 1–3 defined |
