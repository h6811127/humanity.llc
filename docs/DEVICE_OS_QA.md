# Device OS — manual QA runbook

**Status:** Active (Phase 0 hardening)  
**Canonical product model:** [`DEVICE_OS.md`](DEVICE_OS.md)  
**Storage & hub detail:** [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md)  
**Refresh pipeline:** Status dot — resolver health only (`device-status.mjs` + `device-network-health.mjs`). Hub/wallet — scoped polls in `device-hub-ui.mjs` (`fetchAndApplyNetworkChips`, live-control inbox). `device-os-coordinator.mjs` is retained but not auto-started (see `docs/UI_UX_REVERT_PLAN.md` step 2).

**Purpose:** Repeatable checks after device-shell changes and before vertical pilots or merch checkout. Log failures in the triage table at the bottom.

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

**Fail signals:** Hub does not open (healthy graph); console module 404; `#top-chrome[data-device-status-error]` — red outline + **load-error coach card** auto-shows (`.device-status-load-error-coachmark`). Full diagnosis: [`STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md`](STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md) · [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md) troubleshooting.

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

**Automated gate:** device shell E2E in CI — `npm run device-shell:e2e` (see [`DEVICE_SHELL_E2E_CI_REMEDIATION.md`](DEVICE_SHELL_E2E_CI_REMEDIATION.md)). **P0-W** sign-off is still manual on real WebKit devices.

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

**Multi-tab (Phase 1a resolver sync):** Two tabs on `/` with the same saved card. Tab A expands hub or **Check network**; within 60s, focus Tab B and expand hub — Tab B should show updated chips **without** a second burst of `GET …/status?q=…` (health fetch may still run once). Disable with `localStorage.hc_resolver_sync_tabs = "0"` to confirm per-tab polling returns.

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

## P1-RESTORE — View-only restore and Live QR tasks

**When:** After deploy touching `/created/` view mode or setup **Protect** step.

| Step | Action | Pass |
|------|--------|------|
| 1 | Open `/created/?profile_id=&qr_id=` in a tab **without** `hc_created` keys | Hero **View this card**; **Live · Manage** tabs visible |
| 2 | **Live** tab | **QR and signage** section visible; **What scanners see** publish form hidden |
| 3 | Open scan / copy link | Works when scan URL resolves (no signing) |
| 4 | **Manage** tab | **Restore ownership** at top; recovery import + backup link |
| 5 | Restore with valid recovery or `.hcbackup` | Enters control mode; signing UI returns |

Automated: `npm run ownership-restore:verify` · `npm run e2e:key-loss-sad-path` (K1/K5/K2) · `npm run worker:test:view-only-restore`

## P1-KC · Keys custody emphasis card (compact layout)

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

### P1-LC · Live control copy comprehension (M7 Step 2)

**Runbook:** [`M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md`](M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md) · **Passed 2026-05-29** · automated copy guards: `npm run worker:test:comprehension` (D9 · H-002).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Complete live proof loop (two phones) | Success panel includes **Control proven moments ago** + **does not prove legal identity** |
| 2 | Ask tester: “What did live control prove?” | Recent key control; not legal ID or vouch |
| 3 | Proof window ends | Scanner returns to **Ask for live proof** with expired copy; success panel showed **Proof display expires in M:SS** while active |
| 4 | Let challenge expire unsigned | **The 2-minute window ended. You can ask again.** — **Ask for live proof** enabled and visually primary |

### P1-FC · Founding copy comprehension (D9)

**Runbook:** [`FOUNDING_COPY_COMPREHENSION_RUNBOOK.md`](FOUNDING_COPY_COMPREHENSION_RUNBOOK.md) · automated copy guards: `npm run worker:test:comprehension`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Tester reads `/shop/founding/` FAQ on own phone | Sees buy ≠ verify, QR ≠ owner proof, no calendar expiry, revoke, campaign end, misprint |
| 2 | Ask F1–F3 from runbook | Merch ≠ vouched; holding ≠ ownership; sticker does not year-expire |
| 3 | Optional: scan a demo founding QR | Bearer limits visible without coaching |

### P1-LC-REF · Live control scan refresh resume (H-09)

**Ref:** [`LIVE_CONTROL_USABILITY_HARDENING.md`](LIVE_CONTROL_USABILITY_HARDENING.md) H-09 · [`SAD_PATH_COVERAGE_AND_BACKLOG.md`](SAD_PATH_COVERAGE_AND_BACKLOG.md).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Stranger taps **Ask for live proof**; owner pane + countdown appear | Pending challenge stored in `sessionStorage` |
| 2 | Refresh scanner tab before owner signs | Countdown + poll resume without second **Ask** |
| 3 | Let challenge expire or owner proves | Storage cleared; expired or success UI |

### P1-LC-EX · Live control expiry retry (H-10)

**Ref:** [`LIVE_CONTROL_USABILITY_HARDENING.md`](LIVE_CONTROL_USABILITY_HARDENING.md) H-10.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Ask for live proof; wait for 2-minute window without owner sign | Status: **The 2-minute window ended. You can ask again.** |
| 2 | Observe **Ask for live proof** button | Enabled; status panel shows expired emphasis (not disabled/waiting) |
| 3 | Tap **Ask for live proof** again | New challenge; owner pane updates |

### P1-LC-SD · Live control same-device scan guidance (H-05)

**Ref:** [`LIVE_CONTROL_USABILITY_HARDENING.md`](LIVE_CONTROL_USABILITY_HARDENING.md) H-05.

| Step | Action | Expected |
|------|--------|----------|
| 1 | On a device with `hc_created` keys, open your own scan URL (`/c/…?q=…`) | Purple same-device banner visible; **Ask for live proof** still available |
| 2 | Tap **Ask for live proof** on same device | Owner handoff pane + QR/copy link appear; scanner flow not replaced by owner-only view |
| 3 | Second phone scans same URL (no keys) | No same-device banner; normal stranger scanner flow |

### P1-LC-VR · Live control owner tab resume (H-08)

**Ref:** [`LIVE_CONTROL_USABILITY_HARDENING.md`](LIVE_CONTROL_USABILITY_HARDENING.md) H-08.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `/created/` with signing keys; leave tab on listening state | Live-proof panel visible |
| 2 | Switch to another app for ~30s while stranger asks on scan page | No poll while hidden |
| 3 | Return to `/created/` tab | **Prove control now** appears without manual refresh; panel scrolls into view if off-screen |

### P1-LCP · Live control printed QR camera QA (M7 Step 2)

**Runbook:** [`M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md`](M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md) · desk gate: `live-control:printed-qa:desk-gate` · sign-off: `live-control:printed-qa:sign-off -- --pass --apply`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Print QR from `/created/`; scan with **iPhone Camera** | Opens Safari scan page; live control block visible |
| 2 | Repeat with **Android** camera/scanner | Same scan page; no app install required |
| 3 | Complete live proof from camera-opened session | Countdown, proven success, expiry, and retry all work |
| 4 | Wide viewport (tablet or desktop) while waiting | Scanner and Owner panes side by side |

### P1-LW · Large-wallet expanded hub summary rows

**Refs:** [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) S12 · [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) § Realistic scale.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Save **≥10** cards; expand hub on `/` | First **8** summary rows; **Show N more** at bottom |
| 2 | Scroll hub list near bottom | More summary rows load without full wallet hydration |
| 3 | Tap **Open controls** on a summary row | Full row hydrates; navigates to `/created/` |
| 4 | Search hub while expanded | Filter still works on summary rows |

Automated: `e2e/device-hub-large-wallet-summary.spec.ts` (steps 1–4); Vitest `device-hub-visible-rows-core.test.ts` · `device-hub-wallet-summary.test.ts`.

### P1-LW-SCALE · Wallet scale guardrails (comfort + large)

**Refs:** [`SAD_PATH_COVERAGE_AND_BACKLOG.md`](SAD_PATH_COVERAGE_AND_BACKLOG.md) § Large wallet · `device-wallet-scale-core.mjs`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Save **7** cards; open `/wallet/` | Monitoring hint mentions **1–5** comfortable zone |
| 2 | Save **≥10** cards; open `/wallet/` | **Large wallet** hint under Monitoring |
| 3 | Expand hub on `/` with **8** saved | Custody panel **Many saved cards** row with same guidance |

Automated: `npm run e2e:wallet-scale-guardrail` (W1–W3).

### P1-KL · Key-loss view-only and backup import (K1–K2)

**Refs:** [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md) · [`M5_5_OWNER_KEY_PORTABILITY.md`](M5_5_OWNER_KEY_PORTABILITY.md).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `/created/?profile_id=…` with **no** `hc_created` in tab | **View this card** hero; view-only banner mentions recovery / encrypted backup |
| 2 | Wallet has label only (no private keys) | Same view-only; revoke controls hidden |
| 3 | Import valid `.hcbackup` on `/wallet/` with wrong passphrase | **Wrong passphrase** error (not crypto jargon) |

Automated: `npm run e2e:key-loss-sad-path` · `npm run worker:test:key-loss-copy`.

### P1-RESTORE · View-only Live tab + restore (OWNERSHIP_RESTORE Phase 3)

**Refs:** [`OWNERSHIP_RESTORE_UX_PLAN.md`](OWNERSHIP_RESTORE_UX_PLAN.md) · [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md) (K1/K5).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `/created/?profile_id=…&qr_id=…` with no signing keys in tab | **Live** tab active; `#created-view-live-banner` visible; deploy disclosures (print / test / download) usable |
| 2 | Same visit | **What scanners see** / publish form hidden; live-proof strip hidden |
| 3 | Tap **Restore ownership** on Live banner | **Manage** tab; restore panel + import visible |
| 4 | Deep link `#recovery` or `#backup` | Lands **Manage** with restore panel in view |

Automated: `npm run ownership-restore:verify` · `npm run e2e:key-loss-sad-path` (K1) · `npm run worker:test:view-only-restore`

### P1-HOSTED-BR · Billing checkout return (O1–O2)

**Refs:** [`HOSTED_OPS_SAD_PATH_MATRIX.md`](HOSTED_OPS_SAD_PATH_MATRIX.md) · [`HOSTED_TIER_G0_READINESS.md`](HOSTED_TIER_G0_READINESS.md).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Land on `/wallet/?hc_account_id=acc_…` with **no** signing keys in tab | Hub shows billing-pending line; `hc_steward_pending_account_id` set |
| 2 | Load keys (wallet entry / activate) | Session link retries; pending cleared; `hc_account_id` stripped from URL |

Automated: `npm run e2e:hosted-tier-billing-return` · `npm run worker:test:hosted-billing-return`.

### P1-HH · Hub header simplification (Home / Close / Create)

**Spec:** [`HUB_HEADER_SIMPLIFICATION.md`](HUB_HEADER_SIMPLIFICATION.md) · visual refresh: [`HUB_SHEET_VISUAL_REFRESH.md`](HUB_SHEET_VISUAL_REFRESH.md)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open hub on `/` (light) | Title **Saved in this browser**; no subtitle under title; **+ New** in saved-items header only |
| 2 | Top rail | Home (muted) + inline status line; **no** Create in status row; Close ≥40px, visually stronger than Home |
| 3 | Tap Home | Navigates home; hub closes |
| 4 | Reopen hub → tap Close | Sheet closes |
| 5 | Tap **+ New** | `/create/` |
| 6 | Repeat on `/create/` hub | Same layout as landing |
| 7 | Dark mode (`hc_theme=dark`) | Create pill readable; Close border visible; Home not competing with title |
| 8 | Scroll page → tap status dot | Hub still opens (P0-3) |

Automated: `e2e/device-status-dot.spec.ts` § hub sheet header chrome (steps 4–5, Close); Vitest `device-hub-header-html.test.ts` (40px Home/Close).

### P1-HE · Hub stranger-empty (onboarding)

**Spec:** [`HUB_STRANGER_ONBOARDING.md`](HUB_STRANGER_ONBOARDING.md)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Fresh browser (no `hc_wallet` / pins) → `/` → open hub | Empty hint: **No cards saved yet** + Create + import backup links; **Backup import** form visible (`data-hub-restore-always`); **no** Monitoring block, shortcuts, activity log, or status-dot legend |
| 2 | Pinned scans subgroup | **Bookmarks only — cannot manage objects** |
| 3 | Create + save a card (or import backup) | Hub shows full steward chrome; `device-hub--stranger-empty` removed |
| 4 | Repeat on `/wallet/` empty | Same hide rules; wallet page hint matches landing |

Automated: `npm run worker:test:hub-restore-always` · `npm run e2e:key-loss-sad-path` (K2-landing · K2-create · K2 wallet)

### P2-SLC · Hub stranger landing chrome

**Spec:** [`HUB_STRANGER_ONBOARDING.md`](HUB_STRANGER_ONBOARDING.md) § P2

| Step | Action | Expected |
|------|--------|----------|
| 1 | Fresh browser → `/` | Hub **collapsed** on load; hero + **How it works** visible (focus mode off) |
| 2 | Top chrome status line | **Network reachable** only — no `· 0 cards` |
| 3 | Hub intro coachmark (first visit) | Body: *Create a live object first. Later, tap the dot…* |
| 4 | Save a card or add a pin | Status line shows card count; coachmark uses returning-user copy on next fresh profile |

Automated: `npm run worker:test -- worker/tests/device-dot-state.test.ts worker/tests/device-hub-intro-coachmark.test.ts` · `e2e/device-status-dot.spec.ts` § shell S4

### P1-QTR · Quiet tab rehydrate (D10 Tier 1–3)

**Spec:** [`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md)

| Step | Action | Expected |
|------|--------|----------|
| 1 | One saved card in `hc_wallet` → new tab → `/` | No cross-tab “managing elsewhere” notice; dot shows steward/keys state without **Open controls** tap |
| 2 | Same → `/wallet/` | Saved list usable; active-control banner reflects rehydrated session |
| 3 | Two saved cards, last-active set, toggle on → new tab → `/` | Silent rehydrate of last-active object; no picker tap |
| 4 | Two saved cards, hub toggle **Open last object in new tabs** off → new tab | **No** silent rehydrate — existing take-control / hub picker UX |
| 5 | Two saved cards, no last-active → new tab | **No** silent rehydrate |
| 6 | One card + sign lock on → new tab | **No** silent rehydrate until unlock; cross-tab / take-control notice **remains** |
| 7 | Rehydrate succeeds with other tab on same saved profile | **No** cross-tab notice for that profile on new tab |

Automated: `npm run worker:test -- worker/tests/device-quiet-tab-rehydrate-core.test.ts worker/tests/device-quiet-tab-rehydrate.test.ts`

### P1-LDE · Status load-error coach card

**Spec:** [`STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md`](STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md) § Load-error dot explainer

| Step | Action | Expected |
|------|--------|----------|
| 1 | DevTools → block `device-status.mjs` → reload `/` | Red outline on dot; `#top-chrome[data-device-status-error]` |
| 2 | Wait ~1s (do not tap dot) | `#device-status-load-error-popover` visible — **Controls couldn't load** coach card with Now / Why / Next |
| 3 | Tap **Refresh page** | Tab reloads (remove block to recover) |
| 4 | Repeat with block on `device-status-bootstrap-inner.mjs` | Same coach card via thin bootstrap entry |
| 5 | Tap **Got it** or dot again | Coach card hides; red outline remains until graph loads |

Automated: `npm run worker:test -- worker/tests/device-status-load-error.test.ts` · `e2e/device-status-dot.spec.ts` § status load error

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
| 7 | Tap **Close** on expanded hub | Hub collapses; `body` loses `device-hub-sheet-open` |

Automated: `e2e/device-status-dot.spec.ts` § hub sheet header chrome (steps 6–7); Vitest `device-hub-header-html.test.ts`.

### P1-PWA · PWA install (device shell)

**Spec:** [`PWA_INSTALL.md`](PWA_INSTALL.md) · **Implementation:** [`PWA_INSTALL_IMPLEMENTATION.md`](PWA_INSTALL_IMPLEMENTATION.md)

**Prerequisites:** At least one card saved on device (`hc_wallet` non-empty). Phase 1+ manifest on disk.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `/c/…` scan URL (showcase or test card) | **No** `#device-pwa-install-card`; **no** install prompt |
| 2 | Open `/create/` | **No** install card (flow page) |
| 3 | Open `/` with saved cards (Chromium desktop) | After ~1s, install emphasis card may appear if `beforeinstallprompt` fired |
| 4 | Tap **Install** (Chromium) | Native install sheet; after install, card hidden |
| 5 | Dismiss install card | Hidden; `localStorage.hc_pwa_install_dismissed_at` set |
| 6 | Reload within 7 days | Card stays hidden (snooze) |
| 7 | Tab A: keys on `/created/` · Tab B: open installed PWA or second window on `/` | Cross-tab inbox / custody applies — not blocked by install UX ([`CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md`](CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md)) |
| 8 | Trigger orphan or cross-tab inbox item | Install card **hidden** while urgent inbox kind active |
| 9 | iOS Safari `/wallet/` with saved cards | Manual **Add to Home Screen** copy only — no fake Install button |
| 10 | Standalone (installed) mode | No install card; hub dot and inbox still work (**P0-3**) |
| 11 | Simulate status load failure (`data-device-status-error`) | No install card; fix status graph first |

**Fail signals:** Install prompt on scan; install card with zero saved cards; install card over orphan inbox; dead status dot after adding PWA module to status graph.

Automated (Phase 0+): `npm run worker:test:pwa-install` · Phase 3–4: `npm run e2e:pwa-install` (steps 2, 8–11 + no-SW policy in CI). **Manual HTTPS sign-off:** iOS Safari 2026-05-28 ✅ (steps 1–2, 5–6, 9–10, P0-W, standalone wallet). Re-verify icon after Phase 4.1 deploy (`site:generate-pwa-icons` + Pages).

### P1-PWA-R · PWA standalone refresh (Phases 6–9)

**Spec:** [`PWA_INSTALL.md`](PWA_INSTALL.md) § Standalone refresh & resume · **Implementation:** [`PWA_INSTALL_IMPLEMENTATION.md`](PWA_INSTALL_IMPLEMENTATION.md) Phases 6–9

**Prerequisites:** Installed PWA (standalone) with ≥1 saved card. Phase 6+ refresh modules shipped.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open installed PWA · switch to another app · return within ~30s | Hub dot, inbox badge, and network chips update without manual browser reload (soft refresh on resume) |
| 2 | Revoke or disable a card in Safari tab · switch back to installed PWA | Saved-row chip / alert reflects change after resume (wallet re-read from `localStorage`) |
| 3 | Background PWA · restore from app switcher (bfcache path if applicable) | No stuck “card disabled since visit” from previous visit; chrome refreshes |
| 4 | With hub collapsed on `/` | Resume does **not** fan out parallel status GET for every saved card (debounce / scope gates) |
| 5 | Pull down on `/` landing content (Phase 7) | Brief in-progress indicator → “Updated” (or equivalent); dot and hub glance refresh |
| 6 | Pull down on `/wallet/` | Same as step 5; saved-row chips refresh when debounce allows |
| 7 | Hub or inbox sheet **open** · attempt pull | No gesture fight; PTR disabled or scoped (no stuck spinner) |
| 8 | **Watch for live proof** off · pull to refresh | Chrome + chips still update; live-control poll does not run |
| 9 | Deploy newer Pages build · open old standalone session (Phase 8) | Stale shell banner appears when live `/js/build-meta.mjs` ≠ in-memory stamp; tap **Refresh** hard-reloads and banner clears; dot healthy (**P0-3**) |
| 10 | `/create/` or scan URL in standalone (if navigated there) | **No** PTR chrome |
| 11 | Standalone on `/` or `/wallet/` · hub glance **Refresh** row (Phase 9) | Tap runs soft refresh; “Updated” indicator; works even when hub sheet open |
| 12 | First standalone session (Phase 9) | One-time PTR tip visible; **Got it** dismisses; does not return on next open |

**Fail signals:** Standalone user must kill app to see card status change; pull triggers 10+ unscoped status GETs; PTR fires during hub sheet drag; auto `location.reload()` on every resume; refresh module on status graph breaks dot (**P0-3**).

Automated (when shipped): `npm run worker:test -- worker/tests/pwa-standalone-refresh-core.test.ts` · extend `npm run e2e:pwa-install`.

### P1-PWA-N · Standalone scan handoff (P1 shipped)

**Spec:** [`PWA_STANDALONE_EXTERNAL_NAVIGATION.md`](PWA_STANDALONE_EXTERNAL_NAVIGATION.md) · **Module:** `site/js/pwa-scan-handoff-core.mjs`

**Prerequisites:** Installed PWA (standalone) or Chromium `display-mode: standalone` emulation.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Installed PWA → `/create/` → complete create | Lands on `/created/?fresh=1` setup wizard **inside PWA** |
| 2 | Advance to **Test scan** → tap test / continue | Scan opens **in PWA** (no Safari chrome switch) |
| 3 | System back / swipe back **or tap return banner** | Returns to setup wizard; standalone shows **← Back to setup** when `hc_return` present |
| 4 | Complete setup → hub **Open scan** on saved card | Same-tab in standalone; new tab in Safari browser |
| 5 | Browser tab (not installed) → repeat step 2 | Still opens **new tab** (regression guard) |
| 6 | Wallet pin row | Same as step 4; subtitle omits “new tab” in standalone |

**Fail signals:** Safari opens automatically; wizard advances to done before user previews scan; cross-tab keys notice during fresh setup.

Automated: `npm run worker:test:pwa-install` (includes `pwa-scan-handoff-core.test.ts`) · `npm run e2e:pwa-install` (`e2e/device-pwa-scan-handoff.spec.ts` — setup test scan, hub Open scan, wallet pin, browser popup regressions).

### P1-PWA-P4 · Install deferral until setup complete (P4 shipped)

**Spec:** [`PWA_STANDALONE_EXTERNAL_NAVIGATION.md`](PWA_STANDALONE_EXTERNAL_NAVIGATION.md) § P4 · **Module:** `site/js/pwa-install-ux-core.mjs`

| Step | Action | Expected |
|------|--------|----------|
| 1 | Safari with saved card but `hc_setup_done` unset for that profile | Deferral card: “Finish your first object in Safari” — **no** Install button |
| 2 | Complete setup wizard (step 4 **Open card controls**) | `hc_setup_done[profile_id]` set |
| 3 | Return to `/` or `/wallet/` in browser tab | Install card may appear (Chromium `beforeinstallprompt` or iOS manual copy) |

**Fail signals:** Install CTA before setup complete; deferral card in standalone; install card after dismiss snooze without setup done.

Automated: `npm run worker:test:pwa-install` · `npm run e2e:pwa-install` (P4 deferral case).

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

## P5f — Stuck inbox backdrop vs Check network (Step 1 extension)

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/wallet/` with saved card; open inbox from badge; close via backdrop | **Check network** still tappable; status line updates on tap |
| 2 | Leave tab ~6 min (network cache stale) or refocus tab | **Check network** still tappable; stale “checked X ago” OK |
| 3 | Simulate stuck `#device-inbox-backdrop.is-visible` with inbox closed (devtools) | Taps pass through to wallet/hub controls; reconcile clears backdrop on tab focus |

Vitest: `worker/tests/device-sheet-backdrop-sync.test.ts`, `worker/tests/device-safe-rebuild-tripwires.test.ts`. Playwright: `e2e/device-hub-check-network-backdrop.spec.ts`.

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

Copy a row per finding. **P0** blocks vertical pilots or public announce; fix before scaling strangers.

| ID | Date | Priority | Scenario | Expected | Actual | Owner |
|----|------|----------|----------|----------|--------|-------|
| | | P0 / P1 / P2 | e.g. P0-1 | | | |

---

## Related

| Doc | Use |
|-----|-----|
| [`M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md) | Phase A exit gate (**passed** 2026-05-27) |
| [`M5_5_OWNER_KEY_PORTABILITY.md`](M5_5_OWNER_KEY_PORTABILITY.md) | Backup import / second device |
| [`VISUAL_DEVICE_SHELL.md`](VISUAL_DEVICE_SHELL.md) | Chrome / sheet / motion |
| [`SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md`](SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md) | WebKit scroll/dot fix plan + P0-W acceptance |
