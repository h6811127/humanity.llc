# Core product loop — quality & UX workstream (WS-QUALITY)

**Status:** Active — **priority over Phase 2 expansion** until Q3 sign-off  
**Workstream ID:** **WS-QUALITY**  
**Coordination:** [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md) § WS-QUALITY  
**Last updated:** 2026-06-04

---

## Purpose

Make the **already-shipped** steward + stranger product **trustworthy and pleasant** before adding summer scale, Signal War depth, or custody C1+.

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

**Out of scope (unless blocking a P0 row):**

- Cedar Rapids **40→60** node expansion (**WS-SCALE**)  
- Signal War **SW-04+** mechanics (**WS-SW**)  
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
| Before merge | `npm run verify:desk` |
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
| 2026-06-04 | **No rearchitecture** — start WS-QUALITY Q1–Q3 | Belt recently unified; failures were drift/parallel work, not wrong architecture |
| 2026-06-04 | **View-only deprecation** — incremental (not full Q4 rewrite) | User-facing “restore ownership / view-only” is deprecated; see § View-only deprecation |

---

## View-only deprecation (WS-QUALITY)

**Goal:** One steward path — open card → unlock if needed → manage. No “ownership not loaded in this tab.”

| Step | Status | What |
|------|--------|------|
| **1** | **Shipped** | `/created/` boot + quiet rehydrate prefer URL `profile_id`: auto `activateWalletEntryGated` (+ PIN prompt). `created-wallet-boot-activation.mjs` |
| **2** | **Shipped** | Removed restore-in-tab banners/buttons + `restore-control` CTA; K1 **Recovery import** on Manage; wallet-saved view retries boot activation |
| **3** | **Shipped** | Hub/wallet/scan: **Open controls** copy + `/created/` unlock path; no in-tab restore activation |
| **4** | Planned | Notifications rearchitecture decision (inbox vs OS) — separate from custody |

**Regression:** `npm run ownership-restore:verify` · `npm run worker:test` quiet-tab-rehydrate · `e2e:key-loss-sad-path` (K1 must stay view-only when no wallet keys).

---

## Agent assignment

| Role | Mission |
|------|---------|
| **WS-QUALITY owner** | Keep belt green; own L1–L8 inventory; PRs ≤300 lines on one loop row |
| **Other agents** | **STOP** new WS-SCALE / WS-SW scope unless fixing a red **L*** row |

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
| P1-MOTO-06 | **P0 broken** | Hub wallet rows | Many cards stuck **Checking network…** — **partial fix** (manual check refreshes resolver health first; re-verify on device) |
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
| P1-MOTO-21 | **P0 broken** | Live proof | Request from laptop scan → **no notification** — **partial fix** (OS notify when tab visible + requireInteraction; enable Browser alerts + signing keys in tab) |
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
