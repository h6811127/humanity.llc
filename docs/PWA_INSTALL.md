# Mobile home-screen app / PWA install plan

**Status:** Phase 4 rollout gate in progress  
**Audience:** Product, design, and engineers working on the device shell  
**Related:** [`DEVICE_OS.md`](DEVICE_OS.md), [`DEVICE_INBOX.md`](DEVICE_INBOX.md), [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md), [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md)

---

## What this feature is

Mobile browsers can install a website to the home screen. The result is not a native app, but it launches from an app icon and can run in `standalone` display mode, where the browser URL bar is hidden.

For Humanity, this is a good fit for the device shell: the site already has mobile viewport handling, local device state, a wallet surface, and a root-scoped service worker for opt-in live-proof alerts.

---

## Product recommendation

Start with install metadata only:

- Add a web app manifest and app icons.
- Add iOS home-screen tags to the device-shell pages.
- Keep offline caching and automatic service-worker registration out of the first pass.

This gets the low-risk benefit: users can add Humanity to their home screen, launch it without the URL bar, and keep the existing browser-backed key custody model.

---

## Non-goals for the first pass

- No offline scan/status cache.
- No caching of resolver API responses.
- No second root-scoped service worker.
- No native app store package.
- No promise that keys sync across devices or browsers.

These boundaries matter because card status, QR revocation, verification labels, and live-proof challenges must remain live. A stale app shell is acceptable; stale trust state is not.

---

## Existing codebase facts

| Area | Current state |
|------|---------------|
| Static app | Cloudflare Pages serves `site/`. |
| Worker API | Cloudflare Worker handles resolver and scan surfaces. |
| Shell pages | `/`, `/wallet/`, `/create/`, `/created/`, `/organizer-revoke/`. |
| Install metadata | Missing: no manifest link or Apple home-screen metadata. |
| Existing service worker | `/sw-live-proof.mjs`, root scope, opt-in for background live-proof alerts only. |
| Device storage | `hc_created` in `sessionStorage`; saved cards/keys in `hc_wallet` local storage. |

---

## Step-by-step plan

### Phase 1 - install metadata foundation

1. Add `/app.webmanifest` with name, short name, start URL, scope, standalone display, colors, icons, and shortcuts.
2. Generate home-screen icons from the existing brand QR asset:
   - `pwa-icon-192.png`
   - `pwa-icon-512.png`
   - `pwa-maskable-512.png`
   - `apple-touch-icon.png`
3. Add manifest and Apple home-screen metadata to the shell pages.
4. Add Pages headers for the manifest MIME type, icon caching, and service-worker freshness.
5. Add a Vitest guard that verifies the manifest, icons, head tags, and headers.

### Phase 2 - install UX

1. Add a compact "Add to Home Screen" affordance in the hub or wallet.
2. Use `beforeinstallprompt` only where supported.
3. Show iOS-specific instructions because iOS does not support `beforeinstallprompt`.
4. Suppress the prompt in standalone mode using `matchMedia("(display-mode: standalone)")` and `navigator.standalone`.

Implementation notes:

- Mount the prompt from shell page entry modules, not the status-dot bootstrap graph.
- Insert the prompt into `#device-hub-alerts-top` and `#wallet-alerts-top` so it uses the existing device-shell alert rhythm.
- Store only local dismissal/install flags (`hc_pwa_install_dismissed`, `hc_pwa_install_installed`).
- Do not register a new service worker or change live-proof alert registration in this phase.

### Phase 3 - service-worker alignment

1. Decide whether Chrome install prompting is worth registering a service worker before notification opt-in.
2. If yes, extend the existing root service worker instead of adding another one.
3. Add only a pass-through `fetch` handler at first.
4. Avoid asset/API caching until cache invalidation is documented against `DEVICE_SHELL_ASSET_VERSION`.

Decision: register the existing `/sw-live-proof.mjs` from the install UX path. This supports installability without introducing a second root-scoped worker. The worker stays network-only for fetches and live-proof polling remains disabled until browser alerts are explicitly enabled.

Implementation notes:

- `site/js/pwa-service-worker.mjs` owns the lightweight app-shell registration helper.
- `device-browser-notifications-sw.mjs` reuses that helper so install UX and browser alerts cannot compete over root scope.
- Turning off browser alerts disables live-proof state and periodic sync, but it does not unregister the app service worker.
- The fetch handler is `fetch(event.request)` only; no shell, resolver, scan, or API caching is introduced.

### Phase 4 - QA and broader rollout

1. Add manual QA cases to `DEVICE_OS_QA.md` for iOS Safari, Android Chrome, and standalone launch.
2. Smoke the status dot and hub from standalone mode.
3. Consider adding the manifest link to marketing/docs pages after shell behavior is stable.
4. Leave Worker-generated scan pages out unless product wants scan URLs themselves to be installable entry points.

Implementation notes:

- Manual QA lives in `DEVICE_OS_QA.md` as **P1-PWA · Home-screen install and standalone shell**.
- Phase 4 keeps rollout scoped to shell pages. Marketing/docs pages and Worker-generated scan pages remain out of scope until shell install behavior has real-device sign-off.
- Real install behavior must be checked on HTTPS; localhost only proves metadata and shell contracts.

Rollout gate before adding install metadata beyond shell pages:

1. Pass **P1-PWA** on iPhone Safari and Android Chrome.
2. Pass **P0-3** and **P0-W** from a standalone launch.
3. Confirm browser-alert opt-out does not unregister the root app service worker.
4. Decide whether marketing/docs pages should launch the app at `/` or remain normal browser pages.
5. Decide separately whether scan URLs should ever be installable entry points; default is **no**.

---

## Tradeoffs

| Benefit | Cost / risk |
|---------|-------------|
| App-like launch with no URL bar | Users may expect native-app capabilities. |
| Home-screen icon reinforces the device-shell model | Keys still live in browser storage, not a native keychain. |
| Better return path for stewards and creators | iOS and Android install flows differ. |
| Can reuse existing Pages + Worker architecture | Service-worker changes must avoid stale trust state. |
| Optional install UX can be progressive | Too much prompting can feel like spam. |

---

## Testing strategy

Automated tests should prove the shipped metadata is present and valid. Manual testing should prove platform behavior:

- iOS Safari: Share -> Add to Home Screen -> launch -> URL bar hidden.
- Android Chrome: Add to Home screen / Install app -> launch -> standalone mode.
- Shell smoke: status dot opens hub, wallet loads saved cards, create and created routes still work.
- Notification smoke: live-proof alert service worker still registers only through the existing opt-in flow.
