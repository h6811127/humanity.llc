# Device OS — manual QA runbook

**Status:** Active (Phase 0 hardening)  
**Canonical product model:** [`DEVICE_OS.md`](DEVICE_OS.md)  
**Storage & hub detail:** [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md)  
**Refresh pipeline:** Status dot — resolver health only (`device-status.mjs` + `device-network-health.mjs`). Hub/wallet — scoped polls in `device-hub-ui.mjs` (`fetchAndApplyNetworkChips`, live-control inbox). `device-os-coordinator.mjs` is retained but not auto-started (see `docs/UI_UX_REVERT_PLAN.md` step 2).

**Purpose:** Repeatable checks before M5 stranger tests and after device-shell changes. Log failures in the triage table at the bottom.

**Environment:** Run against local Pages (`npm run pages:dev`) + Worker (`npm run worker:dev`) unless noted “production only.”

---

## Prerequisites

1. `npm run worker:migrate:local` then `npm run worker:dev` (8787)
2. `npm run pages:dev` (8788) or production URL
3. Two browser windows or one normal + one private window (multi-tab scenarios)
4. DevTools → Application → clear site data when resetting a scenario

---

## P0 — Stranger-confusion paths (must pass)

These map to the #1 documented confusion: **keys in one tab vs saved on device**.

### P0-1 · Create in tab B, open `/` in tab A

| Step | Action | Expected |
|------|--------|----------|
| 1 | Tab A: open `/` | Hub/status shows no unsaved notice if empty |
| 2 | Tab B: `/create/` → create card → land on `/created/` | Keys in tab B session |
| 3 | Tab A: reload `/` (do not close tab B) | Notice: keys in this tab / save (or cross-tab banner if B still open; may appear after ~8s — two presence heartbeats, Path G) |
| 4 | Tab A: follow notice → save or open controls | After save, notice clears; card appears under saved |

**Fail signals:** Silent empty hub; no notice; save does nothing.

### P0-2 · Open controls → `/created/` has session keys

| Step | Action | Expected |
|------|--------|----------|
| 1 | Save a card on `/wallet/` | Row visible |
| 2 | Tap **Open controls** | Navigates to `/created/?profile_id=…` |
| 3 | DevTools → Application → sessionStorage `hc_created` | Contains `owner_private_key_b58` |

**Fail signals:** `/created/` without signing keys; revoke panel stuck on “Checking…” (see [`REVOKE_UI_INVESTIGATION.md`](REVOKE_UI_INVESTIGATION.md)).

Hub ⋯ **Revoke QR** only navigates to `/created/#revoke` to confirm; it does not revoke on the network in one tap ([`HUB_REVOKE_AND_CONTROLS_NAVIGATION.md`](HUB_REVOKE_AND_CONTROLS_NAVIGATION.md)).

### P0-QR · Branded QR finder mark (`/created/` + scan page)

Spec: [`docs/QR_BRANDING.md`](QR_BRANDING.md) § Verification. Automated: `npm run worker:test:qr-branding`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/created/` with active card | Brand-red modules; rose + ink two-tone circle on **top-left finder** only |
| 2 | Same page | **No** tiny red dot on card frame border; **no** large bullseye in code center |
| 3 | **Download QR image** | Same finder placement as preview; `LIVE OBJECT` + `humanity.llc` + `HC-…` footer |
| 4 | Open `/c/{profile_id}?q=…` scan page | Hero QR matches `/created/`; page source includes `hc-qr-finder-logo` |
| 5 | iOS Camera + one Android device | Scan succeeds from on-screen ~220px preview and downloaded PNG |

**Fail signals:** Black modules; mark on frame margin; center-only disk; download uses different layout than preview; scan fails at print size.

### P1-SD · Scan page device dot + glance (`/c/…`)

Spec: [`SCAN_PAGE_DEVICE_DOT.md`](SCAN_PAGE_DEVICE_DOT.md) · Path 2 arrive [`SCAN_PAGE_TRUST_UI.md`](SCAN_PAGE_TRUST_UI.md) · Hero plate [`SCAN_HERO_CARD_VISUAL_SPEC.md`](SCAN_HERO_CARD_VISUAL_SPEC.md). Automated: `npm run worker:test:scan-page-dot` · `npm run worker:test:scan-live-check-arrive` · `npm run worker:test -- worker/tests/scan-hero-visual-contract.test.ts` · `npm run e2e:scan-page-dot` · `npm run e2e:scan-hero-visual` · `npm run e2e:scan-hero-visual:webkit` (P1-SD steps 8–9 plate + dark + revoked).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Incognito active scan URL | Hero: **Checking live status…** then **Active** (or kind label) with stagger + one card pulse; corner dot **one-shot settle** (no loop); tap home |
| 2 | Steward / saved wallet on same device | Same L2 arrive; **Keys on this device** band after settle; dot may show viewer state (Phase 8); tap opens glance, not hub |
| 3 | Glance primary action | Scrolls to vouch / live proof / cross-tab banner action in-page |
| 4 | Cross-tab keys banner visible | Dot overlay matches banner (`cross_tab_keys`) |
| 4b | Safari (macOS + iPhone): cross-tab banner CTAs | Red **Open that tab** + secondary **Open controls here**; pills not touching; not gray system buttons — [`SCAN_CROSS_TAB_BANNER_SAFARI_LAYOUT_INVESTIGATION.md`](SCAN_CROSS_TAB_BANNER_SAFARI_LAYOUT_INVESTIGATION.md) |
| 5 | Escape / outside tap | Glance closes; dot `aria-expanded` false |
| 6 | Hero card header | `humanity.llc` wordmark only — **no** second red dot inside the live-check card |
| 7 | Tab keys only (never saved a card on this origin) | Dot stays **static** brand red; no `data-dot-state`, no glance |
| 8 | Active scan hero (light) | Raised tier-4 plate (`--hc-scan-hero-shadow`); neutral fill; **Active** only in status strip (not duplicated on whole card) |
| 9 | Same URL with `localStorage.hc_theme = "dark"` (reload) | Hero dark gradient plate; title readable; settle pulse still visible once; scan-out / trust rows remain usable below hero |

**Fail signals:** Stranger sees pulsing or green dot; glance opens hub sheet; dot contradicts cross-tab banner; two brand dots on screen (chrome + hero); borrowed-phone flash of steward green before first wallet save; flat white hero in dark mode; whole hero tinted green/red for active state.

### P1-8 · Open controls: status dot vs hub row

| Control | Where | Expected |
|---------|-------|----------|
| Status dot explainer **Open controls** | Floating dot on `/`, `/create/`, `/created/` | Opens the **hub sheet**, not `/created/` directly |
| Row **Open controls** | Hub or `/wallet/` saved card row | `openCardNowPage()` → `/created/?profile_id=…` with `hc_created` keys |
| Wallet banner **Open controls** | `/wallet/` when this tab holds keys | Same as row (`activateWalletEntry` when a saved row exists) |

**Fail signals:** Dot jumps to `/created/` without opening hub; banner link opens `/created/` with empty `hc_created`.

### P0-3 · Status dot opens hub (not dead)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `/` with saved card | `#brand-status-dot-btn` visible |
| 2 | Tap status dot | Hub sheet opens on first tap (`body.device-hub-sheet-open`) |
| 3 | Scroll down, tap dot again | Hub still opens (desktop: edge-hidden chrome; touch: no edge-hidden) |
| 4 | `/wallet/` tap dot | Scrolls to saved cards (no hub sheet) |

**Fail signals:** Dot does nothing; console module 404; `#top-chrome[data-device-status-error]`. Full diagnosis: [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md) troubleshooting · Safari matrix: [`SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md`](SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md).

### P1-CT · Cross-tab keys banner (Safari layout)

Spec: [`SCAN_CROSS_TAB_BANNER_SAFARI_LAYOUT_INVESTIGATION.md`](SCAN_CROSS_TAB_BANNER_SAFARI_LAYOUT_INVESTIGATION.md). Automated: `npm run worker:test -- worker/tests/device-emphasis-card-html.test.ts`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Safari iPhone or Mac: active scan URL; keys open in another tab on same device | `#scan-cross-tab-banner`: stacked copy + actions; spaced pills; primary + secondary CTAs |
| 2 | Safari: `/` with `#device-cross-tab-banner` visible (no inbox badge path) | Same pill layout as scan; **My cards** link when shown |
| 3 | Safari: `/wallet/` `#wallet-tab-hint` or page cross-tab banner | Same; matches scan spacing |

**Fail signals:** Gray native-looking buttons; CTAs flush/overlapping; action row clipped on card bottom.

### P0-W · WebKit shell acceptance (post 2026-05-26 fix)

Run on **production** (or staging with full Pages deploy) after `site/` ships. Maps to Phase 1 acceptance in the Safari investigation doc.

| Step | Device | Action | Pass |
|------|--------|--------|------|
| W1 | iPhone Safari (normal) | Scroll landing ~10s | Scroll usable; no severe strobe |
| W2 | iPhone Safari (normal) | Tap status dot 5× (hub closed) | Hub opens 5/5 |
| W3 | iPhone Safari (normal) | Tap a landing settings / hero control after scroll | Control responds |
| W4 | Mac Safari | Hard refresh 5× | No red outline ring on dot; dot opens hub each time |
| W5 | iPad Safari or Tor Mac | Smoke: dot + scroll | No regression vs prior good report |
| W6 | Optional | Private iPhone tab + cleared website data | Repeat W1–W3 |

**Fail signals:** Laggy landing scroll with hub closed; dot dead; full-page taps blocked (stuck backdrop — use unstick snippet in Safari investigation doc). If W1–W4 fail, consider Phase 3A/3B in that doc (do not ship without triage).

**Automated gate:** device shell E2E in CI (`e2e/device-status-dot.spec.ts`, `device-inbox`, `device-os-wallet`) plus invariant-only WebKit smoke (`e2e/safari-shell-scroll.spec.ts`). **P0-W** sign-off is still manual on real WebKit devices.

### P1-4 · Hub intro coachmark (first visit)

Spec: [`DEVICE_HUB_INTRO_COACHMARK.md`](DEVICE_HUB_INTRO_COACHMARK.md). Automated: `e2e/device-status-dot.spec.ts` (hub intro coachmark block).

| Step | Action | Expected |
|------|--------|----------|
| 1 | DevTools → clear `hc_device_hub_intro_seen` and `hc_device_hub_intro_dismissed` | Fresh visitor state |
| 2 | Open `/` (hub closed) | `#device-hub-intro-coachmark` visible; copy mentions status dot |
| 3 | Reload without tapping **Got it** or the dot | Coachmark stays hidden (`seen` gate) |
| 4 | Clear both keys; tap **Got it**; reload | Still hidden (`dismissed` gate) |
| 5 | Open `/wallet/` | No coachmark markup |
| 6 | Repeat steps 1–2 with `localStorage.hc_theme = "dark"` | Readable title, body, dismiss button ([`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md) § QA intro coachmark) |

**Fail signals:** Coachmark on every refresh; coachmark on wallet; unreadable dark-mode text.

### P1-5 · Popover surfaces (contrast)

Per [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md): hub card alert links; glance dot explainer + **info@humanity.llc** row; expanded hub status-key explainer; **hub + inbox bottom sheets** (§ QA hub + inbox sheets) — legible in light and dark; sheets opaque under `prefers-reduced-transparency: reduce`.

**Automated gate:** `npm run worker:test:ui-color-scheme` (CSS token tripwires on migrated popover selectors).

### P1-6 · Hub card ⋯ menu (contrast)

Per [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md) § QA (hub card menu). Saved card with keys on `/` or `/wallet/`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Expand hub; open a saved card **⋯** menu | Panel uses dark/light surface (not a fixed white wash in dark theme) |
| 2 | Read section label, default items, **Revoke QR**, **Remove from device** | All readable; danger rows use accent, not low-contrast pink-on-white |
| 3 | Repeat with `localStorage.hc_theme = "dark"` | Same checks in dark theme |

**Fail signals:** White menu panel in dark mode; washed-out or pink-on-white danger labels.

### P0-3 · Auto-save (default on)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Confirm `localStorage.hc_auto_save_device` is `1` or unset with default on | Per product settings |
| 2 | Create new card | After create, `hc_wallet` includes card without manual save tap |
| 3 | New tab: open `/wallet/` | Saved row visible |

**Fail signals:** Card only in session until manual save.

---

## P1 — Hub chrome & coordinator (network batching)

### P1-1 · Tab focus does not spam resolver

| Step | Action | Expected |
|------|--------|----------|
| 1 | Save ≥1 card; open `/` with hub | Network tab open |
| 2 | Switch away from tab 5s, switch back once | At most **one** health fetch + **one** batch of card status fetches (not dozens within 300ms) |

**Fail signals:** Many duplicate `/.well-known/hc/v1/health` or per-card status requests on a single focus.

### P1-2 · Resolver health → status dot

| Step | Action | Expected |
|------|--------|----------|
| 1 | Worker running | Dot / chips: network reachable (green path) |
| 2 | Stop worker | After refresh, degraded/offline copy; system banner on landing if no hub chips panel |

### P1-3 · Hub sheet / glance (landing)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Saved card + collapsed hub | Glance popover or expand shows card label |
| 2 | Tap status dot | Hub sheet opens on first tap (toggle on second); glance is not glance-first on dot (`77816d1`) |
| 3 | Escape | Closes glance or sheet |

**Note:** `/wallet/` uses scroll-to-saved, not a separate glance popover (see [`DEVICE_OS.md`](DEVICE_OS.md)).

### P1-EC · Shell emphasis card delivery (import regression Step 4)

Spec: [`HC_EMPHASIS_CARD_IMPORT_REGRESSION.md`](HC_EMPHASIS_CARD_IMPORT_REGRESSION.md). Cross-tab pill layout: **P1-CT** above.

**Automated:** `npm run e2e:shell-emphasis-card` · `npm run worker:test -- worker/tests/device-emphasis-card-html.test.ts` · `npm run e2e:safari` (cross-tab CTAs)

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/wallet/` with signing keys in this tab | `#wallet-active-banner`: raised card (shadow), green dot, **Open workspace** pill — not flat unstyled text |
| 2 | Same + `localStorage.hc_theme = "dark"` | Active banner still raised; title readable on dark fill |
| 3 | `/created/` with pending live proof deep link | `#live-control-proof`: urgent emphasis card + **Prove control now** pill |
| 4 | Live proof panel in dark theme | Urgent card contrast; not white-on-white |
| 5 | Safari cross-tab banners (optional) | P1-CT — spaced red/secondary pills |

**Fail signals:** Emphasis cards render as plain text (no shadow/dot/pill); `@import` or `<link>` for `hc-emphasis-card.css` missing on shell pages.

### P1-KC · Keys custody emphasis card (compact layout)

Spec: [`KEYS_CUSTODY_EMPHASIS_CARD_SPACING_INVESTIGATION.md`](KEYS_CUSTODY_EMPHASIS_CARD_SPACING_INVESTIGATION.md) · [`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md) § Compact density.

**Reset:** `localStorage.removeItem("hc_keys_custody_notice_dismissed")` then reload.

**Automated:** `npm run worker:test:keys-custody` · `npm run e2e:keys-custody` · `npm run e2e:keys-custody:webkit` (Desktop Safari + iPhone 13 Pro)

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/wallet/` with notice visible (reset dismiss key) | **KEYS CUSTODY** info card; copy → **Acknowledge** ~12px rhythm; no tall empty band inside card |
| 2 | `/` → tap status dot → hub open | Same card in hub (`device-keys-custody--hub`); compact padding; **Acknowledge** left-aligned |
| 3 | Tap **Acknowledge** on wallet or hub | Card removed; `localStorage.hc_keys_custody_notice_dismissed === "1"`; reload — notice stays hidden |
| 4 | `localStorage.hc_theme = "dark"`; reload `/wallet/` + hub | Blue eyebrow + readable detail on dark shell; glass/hairline card still visible (not flat rim) |
| 5 | Safari iOS | `npm run e2e:keys-custody:webkit`; optional physical device spot-check if WebKit CI fails |
| 6 | `/created/?fresh=1` (unsaved keys; reset dismiss + `hc_auto_save_device=0` if testing) | Warn **Keys on this device** card above save strip; compact padding; **Acknowledge** dismisses |

**Fail signals:** Large gap between detail and **Acknowledge**; card stretches to sheet height; dismiss does not persist; dark mode gray-on-gray eyebrow/detail.

### P1-LP · Landing progress strip — retired

Removed May 2026. See [`LANDING_PROGRESS_STRIP.md`](LANDING_PROGRESS_STRIP.md). Steward resume: hub + `/created/` setup wizard; strangers: hero Create + **How it works**.

### P1-7 · Watch for live proof (request budget Phase 5)

**Product check:** Steward understands checks are **on demand** unless watch is on — not “the site monitors my wallet.” See [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) § How we want people to receive this.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Saved card; expand hub on `/` | **Watch for live proof** **unchecked** by default; **Check for live proof** visible; last-checked line present |
| 2 | Wait ~15s with watch off | No repeating `live-control/challenges` in Network tab |
| 3 | Tap **Check for live proof** | One challenge request; status line updates |
| 4 | Check **Watch for live proof** | Auto polling resumes while hub expanded (one challenge per tick at idle interval) |

See [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md).

### P1-9 · Hub sheet visual refresh (May 2026)

**Spec:** [`HUB_SHEET_VISUAL_REFRESH.md`](HUB_SHEET_VISUAL_REFRESH.md)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open hub on `/` in light + dark | Frosted sheet; page content subtly visible through sheet; row copy readable |
| 2 | Expand saved-items section | **Monitoring** warn card with segmented checks + watch toggle; status line below eyebrow |
| 3 | Trigger live proof waiting (inbox pending) | Urgent emphasis card at top of alerts — not gold section label; rows inside card |
| 4 | Saved row | Tier-3 info glass row; object-type left accent; unified **checked** status line |
| 5 | `prefers-reduced-transparency: reduce` | Sheet + inset cards opaque; no blur jank |
| 6 | Tap **+ New** in saved-items header | Navigates to `/create/`; Create not in top status rail |

### P1-8 · Hosted tier budget (Phase 10 — E2 staging)

**Status:** E2 client probe staging; production enablement still waits on M4 sign-off and rollout gates. Spec: [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) § Phase 10 — hosted tier rows (M7) · build order: [`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Free steward; watch on; hub expanded | **400**/day auto cap message; behavior unchanged from P1-7 |
| 2 | Hosted test account (mock or staging entitlements) | Cap **4000**/day; idle poll **30s** when watch on |
| 3 | Cancel / expire hosted | Returns to **400** cap; wallet and keys intact |
| 4 | Anonymous create / stranger scan page | No steward session; no hosted entitlement call; poll/create unchanged |

Automated:

```bash
npm run worker:test:steward-entitlements
npm run worker:test:steward-push
npm run e2e:hosted-tier
npm run e2e:hosted-tier-push
```

## P1 — Card disabled since last visit

Requires a saved card and ability to disable it on the network (owner revoke **card**, not QR-only).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Save card; visit `/wallet/`; leave | Baseline recorded |
| 2 | Disable card on network (another session) | — |
| 3 | Return to `/wallet/` | Banner **Card disabled on the network since your last visit** + status **Disabled on network** |
| 4 | Tap **Got it** | Banner hides; baseline acknowledged |
| 5 | Re-enable or refresh if test card restored | Alert does not stick incorrectly |

**Fail signals:** Alert with status still **Reachable** while card is disabled; alert on QR-only revoke; row copy implying stranger scan logs (**seen** / **last scan**).

---

## P2 — Cross-tab keys & live proof

### P2-1 · Cross-tab banner

| Step | Action | Expected |
|------|--------|----------|
| 1 | Tab A: create, **do not** save | Keys in tab A |
| 2 | Tab B: `/` | Cross-tab banner or glance row (if tab A visible & heartbeating) |
| 3 | Tab B: save from notice | Banner clears |

### P2-2 · Live proof inbox (if worker endpoint available)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Saved card with `qr_id` | Hub may poll challenges |
| 2 | Pending challenge exists | **Live proof waiting** row; status shows count |
| 3 | Tap row | Opens `/created/` with `live_challenge` |
| 4 | Tab hidden + **Browser alerts** on (`hc_browser_notif`) | OS notification (live proof); click focuses tab (v1 → `/wallet/`) |
| 5 | `#shell-notif-badge` visible | Count &gt; 0; tap scrolls hub/wallet alerts |

Spec: [`DEVICE_INBOX.md`](DEVICE_INBOX.md).

### P2-3 · Inbox badge vs status dot (regression)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Unsaved tab keys | Pulsing red dot; badge may show `1` |
| 2 | Live proof pending (saved card) | Amber overlay on dot; badge includes proof count |
| 3 | Tap dot | Opens hub (wallet: scrolls to saved) |
| 4 | Tap badge | Inbox sheet opens (`device-inbox-sheet`); one row per actionable item |

---

## P3 — Background alerts (phase 4)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Saved card + pending live proof, tab visible, alerts not enabled | Opt-in strip in hub/wallet alerts; compact strip in inbox sheet footer |
| 2 | Tap **Turn on background alerts** | Permission prompt; `hc_browser_notif` on when granted |
| 3 | Tap **Not now** | Strip hidden; `hc_browser_notif_prompt_dismissed` set |
| 4 | Hide tab with proof still pending | OS notification title = card label; tap opens `/created/` sign URL |

## P3b — Inbox badge chroma (phase 5)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Live proof pending | `#shell-notif-badge` has `data-inbox-chroma="live_proof"` and amber ring |
| 2 | Cross-tab only (no tab notice) | `data-inbox-chroma="cross_tab_keys"` and blue ring |
| 3 | Unsaved tab keys only | `data-inbox-chroma="default"` and red ring |

## P4 — Device inbox E2E (automated — phase 6)

Playwright: `e2e/device-inbox.spec.ts` (CI via `test-site.yml`). Manual spot-check still useful on real Worker + pending challenge.

## P5d — Live-proof service worker (Phase D)

`device-browser-notifications-sw.mjs` imports `isBrowserNotifEnabled` from `device-browser-notifications-core.mjs` only (not the page module). Vitest: `worker/tests/device-browser-notifications.test.ts`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Enable **Browser alerts** on `/` with notification permission granted | `navigator.serviceWorker.getRegistration()` shows `/sw-live-proof.mjs` |
| 2 | Save a card; simulate pending live proof; hide or close all Humanity tabs | OS notification may appear from SW when no visible client (browser-dependent) |
| 3 | Click SW notification | Opens `/created/` sign URL for pending challenge |
| 4 | With a visible Humanity tab and pending proof | Page path handles alert; SW does not duplicate while tab visible |

See [`DEVICE_INBOX.md`](DEVICE_INBOX.md) — v2 Phase D limits (no server push; periodic sync may be throttled).

## P5c — Hub saved card row visuals (Row Phase 3)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `/wallet/` with 2+ saved cards | Each row: title → identity line → status dot + line; no duplicate network/verification pills |
| 2 | Check status copy | **Reachable · checked …** (not **seen** / **Live State Active** on row) |
| 3 | Expand **Details** | Keys/profile metadata only; handle not repeated in title when title is `@handle` |
| 4 | Open ⋯ menu | **QR & lifecycle** section holds steward actions; **Open controls** + **Open scan** remain primary |
| 5 | Toggle dark theme | Identity/status tones readable; status dot rings visible on ok/warn |

See [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md).

## P5b — Glance row plan (phase 10)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Save 4+ cards; trigger live proof on one | Glance popover: inbox row(s) first, then up to 3 saved cards, then “N more” |
| 2 | Card disabled since visit (resolver-confirmed) | Inbox `card_disabled` row in glance; saved row for same card has no duplicate “since last visit” suffix |
| 3 | Tap live-proof glance row | Opens inbox sheet (`openInboxFromChrome('glance')`), not hub expand only |

## P5e — Inbox sheet reconcile + dot overlay (phase 13)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open inbox sheet from badge; close via backdrop | `body` loses `device-inbox-sheet-open`; `#device-inbox-backdrop` hidden |
| 2 | Card disabled since visit (resolver-confirmed) | `#brand-status-dot` has `data-dot-overlay="card_disabled_since_visit"`; badge chroma `default` |
| 3 | bfcache: open inbox → browser back → forward | Inbox not stuck open; backdrop not `.is-visible` when sheet collapsed |

Vitest: `worker/tests/device-inbox-sheet-core.test.ts`, `worker/tests/device-inbox.test.ts` (`inboxDotOverlayFromItems`). Playwright: `e2e/device-inbox.spec.ts` § card disabled since visit; § sheet reconcile (P5e — opens sheet via `setInboxSheetOpen`, phase 16).

## P5 — Inbox diagnostics (dev — phase 7)

| Step | Action | Expected |
|------|--------|----------|
| 1 | `localStorage.hc_inbox_diagnostics = "1"` | — |
| 2 | Open inbox from badge; tap a live-proof row | `sessionStorage.hc_inbox_diag_log` has `inbox_open` + `inbox_item_action` |
| 3 | Open inbox 3× without row tap | Console: `[hc-inbox-diag] Repeated inbox opens without row action` |

| Step | Action | Expected |
|------|--------|----------|
| 1 | First live proof while tab visible | Contextual “background alerts” strip (not on first visit globally) |
| 2 | Enable background alerts | Permission prompt; `hc_browser_notif` on |
| 3 | OS notification click | Deep link to `/created/` sign URL for first pending proof |
| 4 | Badge `aria-label` | Describes kinds (e.g. “2 live proofs”) not generic “Notifications” |
| 5 | Resolver offline | System banner only; badge does **not** increment for network alone |

---

## P2 — Focus mode & reference tier

| Step | Action | Expected |
|------|--------|----------|
| 1 | Save card; `/` | Focus mode on (intro hidden) |
| 2 | Toggle “Show intro again” | Full documentation visible |
| 3 | Hub + Help & protocol footer remain | Reference tier intact |

---

## Regression smoke (automated)

```bash
npm run worker:test -- worker/tests/device-os-frontend.test.ts worker/tests/device-cross-tab.test.ts worker/tests/device-os-coordinator.test.ts worker/tests/device-inbox-sheet-core.test.ts worker/tests/device-status-shell-modules.test.ts worker/tests/device-sheet-backdrop-sync.test.ts worker/tests/device-status-lazy-inbox.test.ts
```

Playwright (requires pages dev):

```bash
npm run e2e -- e2e/device-status-dot.spec.ts e2e/device-inbox.spec.ts e2e/device-os-wallet.spec.ts
```

---

## Bug triage log

Copy a row per finding. **P0** blocks M5 strangers; fix before public announce.

| ID | Date | Priority | Scenario | Expected | Actual | Owner |
|----|------|----------|----------|----------|--------|-------|
| | | P0 / P1 / P2 | e.g. P0-1 | | | |

---

## Related

| Doc | Use |
|-----|-----|
| [`M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md) | End-to-end stranger gate after OS QA |
| [`M5_5_OWNER_KEY_PORTABILITY.md`](M5_5_OWNER_KEY_PORTABILITY.md) | Backup import / second device |
| [`VISUAL_DEVICE_SHELL.md`](VISUAL_DEVICE_SHELL.md) | Chrome / sheet / motion |
| [`SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md`](SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md) | WebKit scroll/dot fix plan + P0-W acceptance |
