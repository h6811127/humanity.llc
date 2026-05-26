# UI/UX revert plan (May 25–26 regressions)

**Opened:** 2026-05-26  
**Status:** **Resolved** (production sign-off 2026-05-26) — see [Resolution](#resolution) below.  
**Baseline commit:** `4d1e965` (2026-05-25 20:59 CDT) — last good state before the device-inbox wave (`7590e79`, 22:24).  
**Related:** [`SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md`](SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md) · [`DEVICE_INBOX.md`](DEVICE_INBOX.md)

---

## Resolution

**Confirmed fix (not the later sheet/CSS commit):** [`277d08e`](https://github.com/h6811127/humanity.llc/commit/277d08e35f78316948a4dcb866c5902231d73a80) — **“Stop global device OS coordinator auto-refresh on shell pages.”**

That commit **reverts the harmful behavior** introduced when the device shell started auto-running `initDeviceOsCoordinator()` from `device-status.mjs` on every page with the status dot. The coordinator batch (resolver health + full wallet network poll + live-proof inbox) on `init`, tab `visibilitychange`, cross-tab `storage`, and `hc-device-hub-changed` amplified requests across tabs and cards and matched the **Cloudflare “temporarily rate limited”** screen and severe tab slowdown.

| Commit | Role |
|--------|------|
| **`7ef219d`** — Add device OS refresh coordinator and QA runbook | Introduced `device-os-coordinator.mjs` and the batched refresh pipeline |
| **`d520c9b`** — Add status dot Phase 4 hardening and steward E2E coverage | Wired `initDeviceOsCoordinator()` into `device-status.mjs` (global auto-start) |
| **`277d08e`** — Stop global device OS coordinator auto-refresh on shell pages | **Fix:** removed auto-start; status dot uses health-only `fetchResolverHealth`; hub keeps scoped polls in `device-hub-ui.mjs` |

**Not the production fix (per sign-off):** `733ae5e` (hub/inbox sheet CSS pre-cascade restore) and earlier scroll-chrome work (`6bcef6b`) may help related symptoms but were **not** what restored normal use.

Steps 4–8 below remain optional cleanup; do not block the incident as closed for coordinator/rate-limit UX.

---

## Symptoms

| Symptom | Likely layer |
|---------|----------------|
| Landing scroll lag / strobe (iPhone Safari) | Document scroll-edge chrome (`device-shell-chrome.mjs`) |
| Dead status dot / hub taps | Inbox sheet + backdrop stack + module graph |
| Tabs slow, then **“Please check back later… temporarily rate limited”** (Cloudflare) | Request amplification: OS coordinator + wallet network poll × cards × tabs |
| Each “fix” commit made UX worse | May 26 Safari cascade (`c1e1751`…`88d5d01`) layered on inbox landing |

The rate-limit screen is **Cloudflare edge** (not our Worker 429 JSON). It appears when a profile opens many tabs or refreshes aggressively while the shell fires **health + per-card status + live-proof** fetches on `init`, `visibilitychange`, `storage` (cross-tab), and `hc-device-hub-changed`.

---

## Root-cause layers (remove in this order)

1. **Scroll-edge chrome** — global `scroll` → `requestAnimationFrame` → `top-chrome--edge-hidden` + `shell-is-scrolling` (landing jank; hub-open feels smooth because document scroll stops).
2. **Device OS coordinator** — `initDeviceOsCoordinator()` in `device-status.mjs` batches health + full wallet network refresh + live-proof on many events (cross-tab `storage` storms).
3. **May 26 Safari “fix” cascade** — backdrop reconcile, lazy inbox loader, hit-test CSS, blur disables, kill-switch scaffolding.
4. **Device inbox v2** (`7590e79`+) — inbox sheet, dot overlay, OS notifications SW, new module graph.
5. **Hub row / landing polish** — consolidated card rows, de-explain landing (`0ae74a6`), scan pass v24/v25 UI.
6. **Tests/docs** — E2E and Vitest tied to reverted behavior; trim or restore to baseline expectations.

**Keep (out of scope unless broken):** Worker APIs, card-disabled *correctness* fixes that are server-side only, PIN/vouch-lock, scan credential codes, showcase seeds.

---

## Revert steps

| Step | Action | Primary paths | Status |
|------|--------|---------------|--------|
| **1** | **Remove document scroll-edge chrome entirely** — no `scroll` listener, delete `device-shell-chrome-core.mjs`, inset-only chrome; bump `DEVICE_SHELL_ASSET_VERSION` | `site/js/device-shell-chrome.mjs`, `worker/tests/device-shell-chrome.test.ts` | **Done** |
| **2** | **Stop global OS coordinator refresh** — remove `initDeviceOsCoordinator()` from status bootstrap; hub/wallet keep scoped refresh only | `site/js/device-status.mjs`, `device-os-coordinator*.mjs` | **Done** |
| **3** | **Revert May 26 Safari fix commits** (newest first): `88d5d01` … `c1e1751`, skip `7aa04bc` (wrangler tmp junk) | shell CSS, backdrop sync, lazy inbox loader, safari e2e | **Done** |
| **4** | **Roll back device inbox v2** to pre-`7590e79` — remove inbox modules, restore status dot without inbox sheet | `site/js/device-inbox*.mjs`, HTML script tags | Pending |
| **5** | **Restore shell graph from `4d1e965`** for `device-status.mjs`, hub UI, `device-shell.css` | `git checkout 4d1e965 -- <paths>` + manual merge | Pending |
| **6** | **Revert landing scroll experiments** (`0ae74a6`) | `site/index.html`, `site/styles.css` | Pending |
| **7** | **Align tests** — worker Vitest + Playwright device/safari specs | `worker/tests/device-*`, `e2e/device-*`, `e2e/safari-*` | Pending |
| **8** | **Verify** — `npm run worker:test`, `npm run e2e -- e2e/device-status-dot.spec.ts e2e/device-inbox.spec.ts e2e/device-os-wallet.spec.ts` | — | Pending |

---

## Commits to revert (UI-only, May 25 22:24 – May 26 01:40)

Newest first for `git revert` if doing commit-by-commit on step 3:

```
88d5d01 Disable document scroll-edge chrome by default…
189c3a3 Add scroll chrome kill switch and shared lazy inbox sheet loader
618cae8 Vitest scroll chrome gating (Phase 2.3)
fcd9ed7 Lazy-load inbox sheet (Phase 2.2)
1aa878b WebKit Playwright smoke (Phase 2.1)
fa5acbf Disable hub/inbox backdrop blur on touch (Phase 1.6)
b83a35f WebKit hit-test (Phase 1.5)
c8004d8 Hub/inbox backdrop reconcile
c1e1751 Safari shell regressions: cache-bust and touch scroll chrome
a1ab3fa Fix mobile scroll jump from shell chrome layout feedback
… then inbox wave from 7590e79 through hub row polish …
```

Prefer **path restore from `4d1e965`** over 40+ individual reverts when steps 4–5 land.

---

## Verification checklist

- [x] No Cloudflare rate-limit page under normal multi-tab use — **fixed by `277d08e`**
- [x] Shell usable again (scroll, dot, tabs) — **fixed by `277d08e`** (sign-off 2026-05-26)
- [ ] Landing scroll smooth on iPhone Safari (no `shell-is-scrolling` toggling)
- [ ] Status dot opens hub on `/`, `/wallet/`, `/created/`
- [ ] `npm run worker:test` green for device shell tests
- [ ] Device E2E subset green (see AGENTS.md)
