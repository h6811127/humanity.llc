# Core product loop — quality & UX workstream (WS-QUALITY)

**Status:** Active — **WS-LIVE** sub-track (steward belt)  
**Workstream ID:** **WS-QUALITY**  
**Parent program:** **WS-LIVE** — [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md) § WS-LIVE  
**Coordination:** [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md) § WS-QUALITY  
**Last updated:** 2026-06-04

---

## Purpose

Make the **already-shipped** steward + stranger product **trustworthy and pleasant** — **WS-LIVE** sub-track owning Layer **L1** steward path and **LO-1** printed pilots. City-game field launch (**WS-CR** / **WS-SCALE** / **WS-SW**) runs in parallel under WS-LIVE (see coordination doc § Gating).

This is **not** a greenfield rewrite by default. It is:

1. **Verify** — automated belt + manual P0 matrix on the real journeys  
2. **Repair** — fix what the belt and humans prove is broken  
3. **Polish** — copy, layout, and flow continuity on core surfaces  
4. **Decide** — rearchitecture only where polish cannot fix measured friction (see § Rearchitecture gate)

---

## Product slice (in scope)

**Shippable core today** (same frame as [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md) multi-agent program):

| Actor | Journey | Surfaces |
|-------|---------|----------|
| **Steward** | Create card → save on device → manage on `/created/` → print QR → live proof / child objects → revoke | `/create/`, `/`, `/wallet/`, `/created/`, hub, inbox |
| **Stranger** | Scan QR → read status → vouch / live proof wait → trust UI | `/c/{profile}?q=…` scan page |
| **Recovery** | Import backup / recovery → open controls | Hub import, `/created/` view modes |

**Out of scope (unless blocking a P0 row or LO-1 pilot):**

- Cedar Rapids **40→60** node expansion (**WS-SCALE** — WS-LIVE sub-track)  
- Signal War maintenance (**WS-SW** — WS-LIVE sub-track)  
- **device_unlock** C1+ crypto (**WS-CUSTODY** beyond C0 comprehension)  
- Stripe checkout / entitlements UI (**WS-REV**) — parallel, not owned here  
- New live-object types or delegation features beyond regression fixes  

---

## Phases

```text
Q0 Belt authoritative     ☑ verify:desk:fast in CI · verify:desk pre-merge
    ↓
Q1 Loop inventory         Map journeys → tests + DEVICE_OS_QA P0 rows
    ↓
Q2 Repair                 Belt green · fix P0 failures · sad-path gaps (SAD_PATH)
    ↓
Q3 UX coherence           Copy · emphasis cards · flow order · Safari/WebKit P0-W
    ↓
Q4 Rearchitecture gate    Only if Q3 leaves structural debt (written decision)
```

| Phase | Exit criteria | Primary commands |
|-------|---------------|------------------|
| **Q0** | `npm run verify:desk:fast` green in CI; contributors run `verify:desk` before merge | `.github/workflows/verify-desk.yml` |
| **Q1** | Loop table (§ below) has **owner** + **automated** + **manual** cell filled for every row | Audit against [`SAD_PATH_COVERAGE_AND_BACKLOG.md`](SAD_PATH_COVERAGE_AND_BACKLOG.md) |
| **Q2** | No open **P0** from [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) on local stack; belt + surface gates in PR template pass | `verify:desk` · targeted `e2e:*` per row |
| **Q3** | 5 steward + 3 stranger comprehension sessions without “I thought it worked but…” on keys/save/revoke | `DEVICE_OS_QA` P0-1–P0-3, P0-W · optional `custody:phase0-kit` if create path touched |
| **Q4** | Written **go / no-go** in this file § Rearchitecture gate; if go, child workstream with file ownership | — |

---

## Core loop inventory (Q1)

Mark **☑** when automated + manual proof exist. Do not add nodes or game layers until **P0 column** is green.

| ID | Journey step | Automated gate | Manual gate |
|----|--------------|----------------|-------------|
| **L1** | Create card (general + child object paths) | `worker:test` create/custody · `e2e:custody-create-*` if custody | `DEVICE_OS_QA` create flow · [`CUSTODY_WEBAUTHN_FALLBACK_QA.md`](CUSTODY_WEBAUTHN_FALLBACK_QA.md) if WebAuthn |
| **L2** | Keys in tab → save to device | `ownership-restore:verify` · hub-restore Vitest | **P0-1** · **P0-2** |
| **L3** | Hub / dot / inbox open | `verify:desk` shell-boot · `hub-card-disappeared:verify` | **P0-3** · **P1-SD** (scan dot) |
| **L4** | `/created/` Live · manage · QR download | `worker:test:qr-branding` · created E2E | **P0-QR** |
| **L5** | Stranger scan · live proof | `e2e:scan-page-dot` · `live-control-loop` | **P1-SD** · **H-12** if printed QA |
| **L6** | Revoke QR / card | `worker:test` revoke · delegated revoke tests | Hub revoke nav · **P0-2** revoke panel |
| **L7** | Safari keys / ITP / quiet tab | `worker:test` safari-keys · `e2e:safari-keys-persistence` | **P0-W** production WebKit |
| **L8** | Steward scan handoff / PWA vouch | `steward-scan-handoff:verify` | **P1-PWA-V** prod WebKit |

**Living backlog input:** [`SAD_PATH_COVERAGE_AND_BACKLOG.md`](SAD_PATH_COVERAGE_AND_BACKLOG.md) — file tickets only for **repeated** human confusion after Q2 fix.

---

## Regression belt (normative)

| When | Command |
|------|---------|
| Every PR (CI) | `npm run verify:desk:fast` |
| WS-LIVE integrator | `npm run verify:live:fast` |
| Before merge | `npm run verify:desk` · `npm run verify:live` (full WS-LIVE belt) |
| Touched create/custody | `npm run verify:desk -- --custody` |
| Touched city game only | `npm run verify:desk -- --city-game` (not default for WS-QUALITY) |
| Production WebKit sign-off | [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P0-W** after Pages deploy |

Do **not** widen the status module graph without `DEVICE_SHELL_ASSET_VERSION` + baseline write ([`AGENTS.md`](../AGENTS.md)).

---

## UX polish rules (Q3 — not a redesign)

Prefer **surgical** changes aligned with existing patterns:

| Do | Don’t |
|----|--------|
| [`hc-emphasis-card`](LANDING_FINAL_CTA_EMPHASIS_CARD.md) for one primary action + honest detail | New hub modes or parallel navigation trees |
| [`device-ownership-copy-core.mjs`](../site/js/device-ownership-copy-core.mjs) for custody/save language | New investigation docs per bug |
| [`UI_UX_SAFE_REBUILD_IMPLEMENTATION.md`](UI_UX_SAFE_REBUILD_IMPLEMENTATION.md) steps | Re-enable reverted experiments from [`UI_UX_REVERTED_FEATURES_CATALOG.md`](UI_UX_REVERTED_FEATURES_CATALOG.md) without WebKit proof |
| [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) error verbs | Marketing pages bulk rewrite |

**Canonical UX surfaces:** [`CARD_WORKSPACE_UX.md`](CARD_WORKSPACE_UX.md) · [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md) · [`CREATED_TASKS_TAB_REDESIGN.md`](CREATED_TASKS_TAB_REDESIGN.md) (phone-first).

**Q3 front-door targets (2026-06-04):** [`PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md`](PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md) steps 11–15 (shipped routing) · **Step 20** [`STEWARD_UX_PRESENTATION_TARGET.md`](STEWARD_UX_PRESENTATION_TARGET.md) (room-native control — planned).

| Target | Comprehension pass signal |
|--------|---------------------------|
| Three launch doors stay abstract (not lost-item-led) | Strangers pick correct door in &lt;10s without protocol vocabulary |
| Top-nav Create = steward chooser (deploy + wear) | No one asks why they must pick “General” before a plate |
| Deploy create = “what scanners read” | Stewards never say “root” or “child” unprompted |
| Hoodie path vs BYOP create | Buyers understand shop vs print-your-own as **carrier**, same live primitive |
| Game players vs organizers | Players use door 3; organizers find season setup without terminal mint |
| **Step 20 — three rooms** | Stewards describe deploy / wear / season as separate jobs, not one card form |
| **Step 20 — room switcher** | Stewards always know active room (Doors / Season / Wear); no “where did my plates go?” |
| **Step 20 — one root default** | Solo stewards use one `@handle`; org seasons may choose season-only account |
| **Step 20 — season cockpit** | Organizers do not expect lost-item or plate **add** UI in Season skin |
| **Step 20 — entry states** | No “field looks broken” reports from disabled/hidden inputs on mobile PWA |
| **Step 20 — wear tracks** | Stewards understand fulfilled garment (no expiry) vs BYOP QR (may expire) before filling forms |

**Architecture guardrails during Q3:** `verify:desk:fast` green; child objects stay out of `hc_wallet`; LO-1/LO-2 field kits exercise **deploy wizard (Path A)** plus **legacy flat regression (Path B)** — existing flat QRs keep scanning; no landing hero revert; presentation policy is UI-only; add UI filtered by room, lists show all children ([`STEWARD_UX_PRESENTATION_TARGET.md`](STEWARD_UX_PRESENTATION_TARGET.md) § Presentation policy table).

---

## Rearchitecture gate (Q4)

Trigger **only** when all are true:

1. **Q2 + Q3** exit criteria met (belt + P0 manual + comprehension).  
2. Same friction reproduced on **≥3** sessions with **no** copy/layout fix that fits invariants.  
3. Proposal names **files to delete or fold**, not “rewrite shell.”

| If friction is… | Prefer |
|-----------------|--------|
| Keys / save / cross-tab | Extend [`OWNERSHIP_RESTORE_UX_PLAN.md`](OWNERSHIP_RESTORE_UX_PLAN.md) — already phased |
| Boot / graph size / Nord cold | [`DEVICE_SMOOTH_MODE_PHASE0_GATE.md`](DEVICE_SMOOTH_MODE_PHASE0_GATE.md) — boot graph, not new app shell |
| Scan trust / hero | [`SCAN_PAGE_TRUST_UI.md`](SCAN_PAGE_TRUST_UI.md) contract tests |
| “Too many modules” on status dot | Split graph **behind** lazy loaders + baseline discipline — not second SPA |

**No-go default:** Stay on incremental fixes until summer field launch needs a hard blocker fix.

Record Q4 decisions here:

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-04 | **Notifications — go (WS-NOTIF)** | Tiered inbox-first + foreground U0; see [`NOTIFICATION_SYSTEM_V2.md`](NOTIFICATION_SYSTEM_V2.md) |
| 2026-06-04 | **Custody UI — no full rewrite** | View-only steps 1–3 shipped; Open controls path |
| 2026-06-04 | **WS-LIVE opened** — five-layer MVP program; WS-QUALITY is sub-track | [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md) § WS-LIVE |

---

## View-only deprecation (WS-QUALITY)

**Goal:** One steward path — open card → unlock if needed → manage. No “ownership not loaded in this tab.”

| Step | Status | What |
|------|--------|------|
| **1** | **Shipped** | `/created/` boot + quiet rehydrate prefer URL `profile_id`: auto `activateWalletEntryGated` (+ PIN prompt). `created-wallet-boot-activation.mjs` |
| **2** | **Shipped** | Removed restore-in-tab banners/buttons + `restore-control` CTA; K1 **Recovery import** on Manage; wallet-saved view retries boot activation |
| **3** | **Shipped** | Hub/wallet/scan: **Open controls** copy + `/created/` unlock path; no in-tab restore activation |
| **4** | **WS-NOTIF in-app (closed)** | N0–N5 ☑; **P0-N2 background OS non-functional** — do not block Q3 on tray alerts; **exit:** P0-N1 + P0-N4 (+ P0-N3 if testable) per [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) |

**Regression:** `npm run ownership-restore:verify` · `npm run worker:test` quiet-tab-rehydrate · `e2e:key-loss-sad-path` (K1). **WS-NOTIF:** `npm run notify:verify` · `npm run notify:field-signoff` · `npm run notify:hosted-push` · `e2e/device-inbox.spec.ts`.

---

## Agent assignment

| Role | Mission |
|------|---------|
| **WS-QUALITY owner** | Keep belt green; own L1–L8 inventory; **LO-1** printed pilots; PRs ≤300 lines on one loop row |
| **WS-LIVE game agents** | **WS-CR** / **WS-SCALE** / **WS-SW** — advance Layer 5 under WS-LIVE; respect file ownership (§ coordination doc) |
| **Other agents** | Stay inside assigned stream; do not fork parallel live-object composition |

**File ownership (typical):**

- `site/create/**` · `site/created/**` · `site/js/device-hub*.mjs` · `site/js/device-status*.mjs` · `site/js/create-*.mjs` · `site/scan-pass.css` (bundle after CSS)  
- `worker/src/resolver/**` when sad path is server-side  
- `e2e/*` + `worker/tests/*` for regression only  

**Do not touch without coordination:** `site/data/city-game-*.json` wave merges · `device-shell-baseline.json` unless graph change intentional.

---

## Q3 field notes (manual passes)

### Pass 1 — Motorola Edge Plus 2023 · Chrome PWA (2026-06-04)

Environment: installed PWA, Android. Triage ID = **P1-MOTO-***. Status: **captured** — not yet scheduled.

| ID | Severity | Surface | Summary |
|----|----------|---------|---------|
| P1-MOTO-01 | **P0** | `/created/` | Restore-in-tab UX **removed** (steps 1–2); auto-activate + hub **Open controls** — re-verify on device |
| P1-MOTO-02 | **P0 regression** | `/created/` Live/Manage | Grouped **status plate + lost item + game node** hub missing — **fix shipped** (`child-object-add-hub` wired) |
| P1-MOTO-03 | P1 UX | `/created/` child editors | Status plate / lost item edit UI not using global disclosure/dropdown styling |
| P1-MOTO-04 | P2 design | Shell / PWA | System-wide **back** (home, tab back) — especially PWA |
| P1-MOTO-05 | P2 product | `/` hub | **Revoke** / **Manage** shortcuts → active card controls — right default? other shortcuts? |
| P1-MOTO-06 | **P0 fix shipped** | Hub wallet rows | Stuck **Checking network…** when cache fresh but visit-unconfirmed, or health still `unset` — **re-verify on device** |
| P1-MOTO-07 | **P0 broken** | Hub | **Open controls** opens **landing** — **fix shipped** (sanitize `return_url`; navigate to `/created/` even if unlock fails) |
| P1-MOTO-08 | P1 copy/settings | Shell / notifications | Notification + system language reads **Safari**; should be browser-aware (Chrome/PWA) |
| P1-MOTO-09 | P1 UX | `/created/` Live | **Publish update** one-shot then UI hides; also timeout after create if fields untouched |
| P1-MOTO-10 | **P0 broken** | Lost-item relay | Finder messages → **no** notify — **partial fix** (wallet signing for relay poll + OS notification on new offers; enable Browser alerts) |
| P1-MOTO-11 | P1 UX | `/created/` | **View steward handoff QR** scrolls to main QR, not **Full size** / dual-QR section |
| P1-MOTO-12 | P2 prune | `/created/` | Remove **Test from another device** dropdown (redundant with open scan page) |
| P1-MOTO-13 | P2 prune | `/created/` | Remove **pilot habit loop** |
| P1-MOTO-14 | P1 UX | `/created/` | Combine **Print and share** (Manage) + **Download QR** (Live) |
| P1-MOTO-15 | P1 bug | Shop | **Founding sticker** — mockups not showing |
| P1-MOTO-16 | P1 UX | Shop → manage | **Add recovery** on glitch hoodie checkout dumps to manage; hard to find recovery section / return to shop |
| P1-MOTO-17 | P2 design | Shell PWA | Floating **status dot** + floating **back** (Android-like) |
| P1-MOTO-18 | P2 design | Store | Store page redo — **3 swipable product panes** |
| P1-MOTO-19 | P1 question | Custody / PWA | Save passkeys in **Chrome app** then add **PWA** — what happens? (doc + test) |
| P1-MOTO-20 | — | Vouch | Vouching not yet tested this pass |
| P1-MOTO-21 | **P0 — foreground only** | Live proof | Away-tab OS alert **non-functional** ([`NOTIFICATION_SYSTEM_V2.md`](NOTIFICATION_SYSTEM_V2.md)); use **foreground strip** when PWA open — background path **deferred** |
| P1-MOTO-22 | P2 polish | Footer | **Create a live object** / **About** buttons need spacing |
| P1-MOTO-23 | P1 product | Multi-card | How to **switch active ownership** for vouch / merch link to another card? |
| P1-MOTO-24 | P1 UX | City game | **City state** needs own screen; map nodes expand circles only, no readable detail |

**Engineering hints (pass 1 audit):**

- **P1-MOTO-02:** `child-object-add-hub` exists in JS (`created-child-object-add-hub.mjs`) but is **not** in `site/created/index.html` and **not** initialized from `created.mjs` — likely incomplete ship of grouped children UI.
- **P1-MOTO-07:** Hub **Open controls** calls `openCardNowPage` — verify Android PWA activation path / return URL (may fall through to `/`).
- **P1-MOTO-06 / 21:** Cluster under **live status + notification delivery** — see [`DEVICE_INBOX.md`](DEVICE_INBOX.md) channel matrix; may need product rethink (floating alerts option).

---

## Changelog

| Date | Note |
|------|------|
| 2026-06-04 | View-only deprecation step 3 — hub/wallet/scan Open controls only |
| 2026-06-04 | View-only deprecation step 2 — strip restore-in-tab UI; K1 recovery import only |
| 2026-06-04 | View-only deprecation step 1 — created boot auto-activate + URL quiet rehydrate |
| 2026-06-04 | Sprint A engineering pass — restore-in-tab, add-hub, open controls, network/notify partial |
| 2026-06-04 | Q3 pass 1 captured (Motorola Chrome PWA) — § Q3 field notes |
| 2026-06-04 | Workstream opened — Q0 belt green; Q1 inventory table; Phase 2 expansion deprioritized |
| 2026-06-04 | WS-NOTIF background OS closed as non-functional — WS-QUALITY owns Q2–Q3 + P1-MOTO cluster |
| 2026-06-04 | **P1-MOTO-06** — fetch unconfirmed profiles + allow wallet poll when resolver health `unset` |
