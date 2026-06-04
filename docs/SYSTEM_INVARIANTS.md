# System invariants (engineering)

**Status:** Canonical — do not break without updating tests and this doc  
**Audience:** Humans and agents changing shell, wallet, scan, or resolver client code  
**Indexes:** [`STEWARD_DEVICE_ROADMAP.md`](STEWARD_DEVICE_ROADMAP.md) · [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md) · [`DOC_MAINTENANCE.md`](DOC_MAINTENANCE.md)

This doc holds **rules that must stay true** after closed investigations are archived. For narrative history, see `docs/archive/`.

---

## Device shell — status dot and hub

The floating **status dot** (`#brand-status-dot-btn`) opens the hub on `/`, `/create/`, and `/created/`. On `/wallet/` it only scrolls to saved cards. Do not wire glance-first on dot tap.

| Invariant | Detail |
|-----------|--------|
| Module graph | `device-status-bootstrap.mjs` → inner loads `device-status-core.mjs` then `device-status.mjs`. New `./device-*.mjs` imports on the status graph must ship in the same PR, appear in `DEVICE_STATUS_SHELL_JS_FILES` (`device-status-shell-modules.mjs`), and bump `DEVICE_SHELL_ASSET_VERSION`. |
| Partial vs total load | Partial failure (core OK, status failed): `data-device-status-partial`, hub opens, no coach hijack. Total failure: `data-device-status-error` + load-error coach; dot tap toggles coach, not hub. |
| Lazy subgraphs | Do not static-import full inbox/hub-sheet/notifications from `device-status.mjs` or `device-chrome-refresh.mjs`. Use `device-inbox-sheet-loader.mjs`, `device-hub-sheet-loader.mjs`, `device-inbox-loader.mjs`, `device-browser-notifications-loader.mjs`. |
| Hub open state | Open/close only through `setHubSheetOpen()` / `setHubExpanded()`. `hubSheetOpen()` treats a collapsed `#device-hub` as closed even if `body.device-hub-sheet-open` is stuck. |
| Clickability CSS | `.top-chrome--float { pointer-events: none }` with `.shell-status-cluster` (and dot/badge) at `pointer-events: auto` when `top-chrome--edge-hidden` or hub/inbox locked. |
| Boot gate | Shell bodies use `data-boot="pending"` until `markDeviceBootReady()`. Personalized rows stay hidden via `.device-boot-gated` until boot ready. Cross-tab inbox/dot/banner suppressed until `data-boot=ready`. |
| Hub render boot | Hub saved list, pins, activity, inbox alerts, stranger-empty chrome, and glance defer `innerHTML` until `data-boot=ready`; `markDeviceBootReady()` dispatches `hc-device-boot-ready` for first full hub refresh. |
| Dot boot | Dot hidden until first settled `applyDot()` after health fetch + quiet rehydrate — no flash of wrong steward/offline state from core-only boot. |
| Hub network chips | Per-profile chips show **checking** until `isResolverConfirmedProfile(profileId)`; cache ignored for identity/icon/scan-kind until poll confirms. |
| Wallet summary boot | First `loadWalletSummary()` each visit materializes `hc_wallet` and rebuilds summary; persisted fast path skipped until reconciled (`pageshow` bfcache resets reconcile). |

**Regression (status graph):**

```bash
npm run worker:test -- worker/tests/device-status-shell-modules.test.ts worker/tests/device-status-lazy-inbox.test.ts worker/tests/device-status-load-error.test.ts worker/tests/device-shell-boot.test.ts worker/tests/device-hub-boot.test.ts
npm run e2e -- e2e/device-status-dot.spec.ts e2e/device-inbox.spec.ts e2e/device-cross-tab-keys.spec.ts e2e/scan-page-dot.spec.ts
```

Canonical UX spec: [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md). Load failure postmortem: [`STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md`](STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md). Open boot follow-ups: [`SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md`](SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md) (RC-12–RC-14).

---

## Wallet and hub card rows

| Invariant | Detail |
|-----------|--------|
| Hub rows source | Hub saved-card rows always reflect `localStorage.hc_wallet`. Server orphan purge (90 days) does not touch browser storage. |
| Post-save verify | `saveWallet()` must round-trip `localStorage` via `verifyWalletStorageWrite()`; failure returns `WALLET_SAVE_VERIFY_FAILED`. |
| Corrupt wallet | Bad JSON → hub **urgent corrupt card** row, not stranger-empty. |
| Session vs hub loss | Hub row visible + empty tab session = session loss (RC-8), not hub disappearance. |
| Summary integrity | Allowlisted `hc_wallet_summary` rows + persist tripwire in `device-wallet-summary-core.mjs`. |
| Private browsing | Create/save blocked when private browsing detected (`private-browsing-detect-core`). |
| Canonical origin | `www.humanity.llc` → apex redirect on shell pages + Worker 301. |

**Regression:** `npm run hub-card-disappeared:verify:fast` · `npm run worker:test -- worker/tests/device-wallet-summary-core.test.ts worker/tests/device-wallet-meta.test.ts worker/tests/device-wallet-save-core.test.ts`

Reliability guide: [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md).

---

## Card disabled since visit (inbox + hub banner)

Banner, hub `#device-hub-card-disabled-group`, inbox badge, and dot overlay for **card disabled since visit** must use **resolver-confirmed** poll maps only — never `sessionStorage.hc_wallet_network_cache` alone.

All of the following are required to show the banner:

1. `resolverConfirmedMap[pid] === true` (network status fetch this visit)
2. `scan.kind === "card_revoked"` from that poll
3. Since-visit gate open (resolver health known and `ok`, live-proof poll health ok, **and** at least one wallet poll confirmed this visit — RC-11)
4. Baseline `hc_wallet_last_seen_network[pid]` was not already `card_revoked`

**Regression:** `npm run worker:test:card-disabled-since-visit` · `npm run e2e:card-disabled-since-visit`

Canonical inbox taxonomy: [`DEVICE_INBOX.md`](DEVICE_INBOX.md).

---

## Cross-tab keys and chrome refresh

| Invariant | Detail |
|-----------|--------|
| Not OS push | Cross-tab keys use in-app chrome (`cross_tab_keys` / `orphan_keys_removed` inbox kinds), never browser `Notification`. |
| Coordinator | `device-chrome-refresh.mjs` + fingerprint snapshot; avoid duplicate refresh paths that flash wrong labels. |
| Boot suppress | Cross-tab notification state, scan snapshot, and `crossTabPresenceActiveRaw()` return empty/hidden until `data-boot=ready`; skip `primeCrossTabNotificationState()` during boot. |
| Presence churn | Laggy scroll on landing often traces to cross-tab presence heartbeats fanning `applyDot()` / `refreshSummary()` — see [`CROSS_TAB_KEYS_REBUILD_PLAN.md`](CROSS_TAB_KEYS_REBUILD_PLAN.md). |
| Banner layout | Scan + landing `#device-cross-tab-banner` and `#wallet-tab-hint` use stacked F3 layout in `site/styles.css`. |

**Regression:** `npm run worker:test -- worker/tests/device-cross-tab-state.test.ts worker/tests/device-cross-tab.test.ts worker/tests/device-cross-tab-boot.test.ts` · `npm run e2e -- e2e/device-cross-tab-keys.spec.ts`

---

## Landing homepage (`/`)

| Invariant | Detail |
|-----------|--------|
| Hero H1 | **“The sticker stays. The status changes.”** (kicker: Public programmable objects). |
| Entry | **`#launch-doors`** — three list rows (status plate · Glitch hoodie · Cedar Rapids game), not a single hero Create CTA. |
| Forbidden | “Live state on real objects”, hero `landing-hero-btn-primary`, “One use · status plate”. |
| Contract | `site/js/landing-copy-contract.mjs` — bump version + tests when copy changes intentionally. |

**Regression:** `npm run verify:landing` · `npm run e2e:landing-copy` · CI: `.github/workflows/deploy-pages.yml` post-deploy `verify:landing:production`.

---

## Safari / PWA custody

| Invariant | Detail |
|-----------|--------|
| Two stores | Signing needs `sessionStorage.hc_created` with private key; `localStorage.hc_wallet` survives tabs but does not sign until copied into session. |
| Quiet rehydrate | `maybeQuietTabRehydrate()` on shell boot (`device-status.mjs`) and scan (`scan-tab-keys.mjs`) **before** vouch/live-control scripts. Shell pages share `ensureQuietTabRehydrateBootstrap()` — `/created/` and `/wallet/` await before reading `hc_created` (RC-10). |
| Scan script order | `scan-tab-keys.mjs` must load and finish (top-level await) **before** `vouch-issue.mjs` and live-control in `scan-html.ts`. |
| Tab session writes | Never persist `hc_created` without `owner_private_key_b58` or recovery private key (`setTabSession` / P0-6). |
| Hybrid `device_unlock` | `hc_wallet` rows may store `wrapped_owner_key` only — never plaintext `owner_private_key_b58` in `localStorage`. Unlock via WebAuthn → populate `hc_created` per tab. Quiet rehydrate **must not** silently copy wrapped rows (C2). Layer 2 copy: **Unlock to manage**, not restore jargon. Cross-device (C4): recovery import **strips stale wrap**; backup import restores owner key; `/created/` Manage offers passkey re-enroll. |
| Scan dot honesty | Dot / actor band reflect **tab signing state**, not wallet count alone (P0-5). |
| Save errors | `saveWallet()` try/catch + read-back verify; quota failures surface visibly. |
| ITP notice | Lazy-load `safari-itp-storage-notice.mjs` after status bootstrap (~7-day eviction + Home Screen timer reset). |
| Persist denied | When `navigator.storage.persist()` returns false, set `hc_storage_persist_requested_v1 = "0"` and show `safari-storage-persist-denied-notice.mjs`. |
| PWA session mismatch | `device-pwa-session-mismatch-core.mjs` tracks `hc_last_signing_shell_mode` when tab gains keys. |
| PWA shortcuts | Tab-native homepage shortcuts hidden in standalone via `pwa-browser-tab-shortcuts.mjs`. |
| Steward handoff encode | QR encode for steward handoff URLs must use shared `qr-encode-url-core.mjs` — both `qr-render.mjs` and `qr-branding.mjs` must agree. |
| Corrupt wallet | `loadWallet()` parse failure → corrupt coach card, not stranger-empty hub (P1-4). |

**Regression:** `npm run e2e:safari-keys-persistence` · `npm run e2e:scan-page-dot` · `npm run e2e:key-loss-sad-path` · `npm run e2e:custody-device-unlock` · `npm run worker:test:safari-itp-notice` · `npm run worker:test:safari-persist-denied-notice` · `npm run worker:test:pwa-session-mismatch` · `npm run worker:test:custody-wrap` · `npm run steward-scan-handoff:verify:fast`

Canonical: [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) · [`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md) · [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) · [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md) · [`PWA_INSTALL.md`](PWA_INSTALL.md)

---

## Network and polling

Read [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) before adding shell network I/O.

**North star:** *The stranger's browser pays for urgency. The steward's browser pays for intent.*

Resolver tab sync: `hc-resolver-sync` BroadcastChannel (network 60s, health 30s); opt out via homepage **Share network checks** or `hc_resolver_sync_tabs=0`.

Passive scans must not create steward notifications, OS alerts, emails, webhooks, scan histories, or engagement dashboards. `live_proof` is the narrow alert exception because the scanner explicitly requests a short-lived signature. Future awareness features must be coarse object state only, with no timestamps, locations, IPs, scanner identity, or per-scan rows.

---

## Print artwork frame (merch fulfillment)

| Invariant | Detail |
|-----------|--------|
| Digital frame | Scan pass, `/created/`, and customize QR preview use **full** white card + **default** padding — `renderFramedScanQrSvg(scanUrl)` with no frame opts. |
| Print frame | Printify upload and `POST /v1/print/artifacts` use `renderPrintArtworkFromScanUrl(scanUrl, templateId)` and `resolvePrintTemplateRenderProfile()` in `worker/src/print/print-template-render.ts`. |
| Launch hoodies | `hc-glitch-hoodie-v1` and `hc-hoodie-live-object-v1`: default profile `full` + `tight` + `frame_svg`. Glitch Printify placeholder **`back`**; Live Object **`front`**. Stickers: `full` + `default` + `sticker_sheet`. |
| Customize Glitch | Planned QR block below mockup; mock toggle does not replace fulfillment artwork alone. |
| Buyer print frame | Glitch buyer choice `full` \| `transparent` must persist on `artifact_intents.print_frame_background` and `print_orders.print_frame_background` and drive Printify SVG render — not `sessionStorage` only. See [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) § Glitch print frame background. |
| Transparent on fabric | Allowed in UI for approved colors (not Charcoal Heather / Royal Blue); Printify SVG uses stored `transparent` when persisted; physical QA sign-off still required ([`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md)). |

**Regression:** `npm run worker:test -- worker/tests/print-frame-background.test.ts worker/tests/print-template-render.test.ts worker/tests/artifact-intents.test.ts worker/tests/fulfillment-queue.test.ts worker/tests/printify-line-items.test.ts`

Canonical: [`QR_BRANDING.md`](QR_BRANDING.md) § Two registers · [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md) · [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md)

---

## Product language

Default UI uses Layer 2 outcome copy; protocol terms stay in Advanced, Help, and engineer docs. Before changing user-visible strings: [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) · [`OWNERSHIP_AND_CONTROL_MODEL.md`](OWNERSHIP_AND_CONTROL_MODEL.md) · `site/js/device-ownership-copy-core.mjs`. Run `npm run worker:test:comprehension` when copy changes.

---

## UI tokens

New floating UI must use `--surface-popover-*` per [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md). Keys custody cards use compact F3 stacked layout per [`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md).

**Regression:** `npm run worker:test:ui-color-scheme` · `npm run worker:test:keys-custody` · `npm run e2e:keys-custody`

---

## Cards, keys, verification

- Steward status is on the resolver; vouch signing needs root `hc_created` keys on the same browser tab.
- Cross-device restore: **recovery code** (primary) or encrypted backup (advanced).
- Large wallets (~10+ saved root cards): poll budget and shell perf limits in [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) still apply.

Canonical: [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) · [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md)

---

## Created page — verification boot (RC-9)

| Invariant | Detail |
|-----------|--------|
| Human-trust row | `/created/` shows **Checking…** on human-trust icon/copy until first successful resolver status poll; steward review queue hidden until poll confirms `verification.state === "steward"`. |
| Poll confirmed | Mark poll confirmed on any successful status response, not only when `scan.human_trust` is present. |

**Regression:** `npm run worker:test -- worker/tests/created-verification-boot.test.ts`

---

## Scan page — live check arrive

| Invariant | Detail |
|-----------|--------|
| SSR fast path | Worker SSR renders the settled strip label in `.scan-arrive-status-label` (matching `data-arrive-label`). Client skips `SCAN_ARRIVE_MIN_CHECKING_MS` when labels agree and `navigator.onLine`; row stagger + hero settle pulse unchanged. Offline or legacy cached HTML keeps checking motion. |
| Reduced motion | `prefers-reduced-motion` → instant reveal (no stagger, no pulse). |

**Regression:** `npm run worker:test:scan-live-check-arrive` · `npm run e2e:scan-hero-visual`

Canonical: [`SCAN_PAGE_TRUST_UI.md`](SCAN_PAGE_TRUST_UI.md) · [`SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md`](SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md) (RC-8)

---

## Live objects (resolver composition)

Canonical architecture: [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) · public catalog: [`QR_DESIGN_SPACE.md`](QR_DESIGN_SPACE.md).

| Invariant | Detail |
|-----------|--------|
| Single composition pipeline | Scan HTML and `GET …/status` derive from `buildScanViewModel` in `scan-state.ts` — do not fork parallel scan products per use case. |
| Lifecycle first | Revoked / suspended card or QR or paused child shows lifecycle truth; overlays (game, streams) do not override. |
| Passive scan | Opening `/c/…` does not log scanner identity or increment game aggregates ([`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md)). |
| Verbs are explicit (target) | New scanner/owner actions ship as documented capabilities on status JSON, not ad-hoc HTML-only blocks. |
| Stream precedence | Care/maintenance streams mute game bulletin copy when in conflict — generalize via shared precedence, not one-off game checks. |
| Status freshness | Every `GET …/status` body includes `scan.freshness` (`fetched_at`, `max_age_seconds`, `stale_disclosure`, `source`). Offline/mesh clients must set `source` ≠ `resolver` when serving cache. Scan HTML embeds the same block; `#scan-freshness-banner` reveals when age exceeds `max_age_seconds` or `source` is not `resolver`. |
| Succession hints | `scan.succession` reports `live` \| `sunset` \| `archived` from revoke + archive capabilities — not human trust or vouch. |

**Regression:** `npm run worker:test -- worker/tests/scan.test.ts worker/tests/scan-freshness-banner.test.ts worker/tests/update-card.test.ts worker/tests/live-object-staleness-contract.test.ts worker/tests/live-object-succession-spec.test.ts`

Touching `worker/src/resolver/scan-state.ts`, stream validation, or planned `live-object/*` modules requires updating [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) when layer behavior changes.

---

## Cedar Rapids city game

Canonical spec: [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) · risks **R-*** · build gates **B1–B11**.

| Invariant | Detail |
|-----------|--------|
| Feature flag | `CITY_GAME_ENABLED=0` in production until launch checklist signed; game scan template and `game-contribute` only when enabled. |
| Passive scan | `GET /c/…` (scan SSR) does **not** increment collective progress, scarcity, or fragment state. |
| Contribute | `POST …/game-contribute` may update **aggregate-only** fields (`collective_progress`, `unlocked_by`, `scarcity_remaining`) and count buckets — **no** per-player ID, scan log row, or fingerprint. |
| Care wins | When care stream is maintenance pause / closure, game bulletins are muted on scan (`scan-view` / `scan-html` precedence). |
| Lifecycle first | Revoked or paused child object or QR shows lifecycle truth; game hero does not override. |
| Game-operator scope | `issuer_public_key` may `game-update` **game_node** only — not owner manifesto, human vouch issuance, or non-game child types. |
| Human vs game vouch | Game `vouch_requires` / `vouch_active_for` on `game_meta` is separate from root-card Steward vouch graph; do not conflate in copy or tests. |
| Launch deploy | Public “live season” HTML (`city-game:launch-surfaces --apply`) and Worker `CITY_GAME_ENABLED=1` ship in the **same** release train. |
| Map dashboard | Read-only **city state board** — same public truth as scan; **no** GPS, visit log, player ID, or device-local scarcity on server snapshot. Passive `GET` snapshot does not increment quorum/fragments. Plan: [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md). Play pages boot via **`city-game-play-page.mjs` only** (one season fetch → board + guide + banners + snapshot). Snapshot chips apply to **`.city-game-map-node-live`** inside each list row — do not remove when editing Maps links. |
| Season fair use | Organizer caps via `game.*` entitlements on linked steward account (`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md` § City game season). Stranger play stays free; IP rate limits remain. |
| Season root ↔ steward | `GET …/steward/entitlements?season_id=` succeeds only when `steward_account_profiles` links the session `account_id` to that season’s `season_root_profile_id` (bundled season config). |
| Snapshot quota | Uncached season snapshot builds increment `game.snapshot.get`; **304** (`If-None-Match`) does **not** increment season snapshot quota. |
| Season config bundle | Worker resolves seasons from `season-registry.generated.ts` imports of `site/data/city-game-*.json` at **bundle load** — editing JSON requires **`worker:dev` restart** (and `city-game:sync-season-root` when local seed ≠ JSON). |
| Self-serve setup | New public seasons register **game_node** child objects on `/created/` Live · Manage — bulk import, QR issue, rules publish. Organizer uses owner/recovery keys + game-operator public key at `/create/`; weekend flips stay on `/game-operator/` only. |
| Terminal mint scope | `city-game:mint-node` and `city-game:seed-local` are **Cedar Rapids pilot / CI / engineering** only. Self-serve seasons (`auto_rules_page: true`, not pilot) **exit 1** unless `--force` / `--ci` / `CI=1`. Do not document terminal mint for new organizers. |

**Regression:**

```bash
npm run verify:city-game
```

Touching `worker/src/city-game/*`, `worker/src/resolver/game-contribute.ts`, `worker/src/resolver/game-update.ts`, `site/js/scan-game-contribute.mjs`, or season snapshot / map dashboard paths requires the block above plus any new test named in the PR. Update this section when adding new automated mechanics.

---

## Hosted steward (reference operator)

Canonical spec: [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) · product framing: [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md).

| Invariant | Detail |
|-----------|--------|
| Feature gate | Extension active only when `HOSTED_STEWARD_ENABLED=1` and D1 migrations `0012` (+ `0031` for game season keys) applied. |
| Session bearer | `Authorization: Bearer <token>` from `POST …/steward/session` only — not checkout `acc_…` IDs; token stored client-side as `hc_steward_session` (see entitlements doc). |
| Entitlements authority | Server `GET …/steward/entitlements` is source of truth for paid caps; client may cache ≤300s; fail closed to `reference_free` when session missing or invalid. |
| Profile link | One `profile_id` maps to at most one `account_id` (`idx_steward_profile_unique`); link requires owner-signed `steward_account_link_v1`. |
| Game season attachment | `game_season` on entitlements requires steward account linked to season root profile; optional `?season_id=` must match that link. |
| No paywall on identity | Paid plans must not block card create, public scan, or vouch ([`SKEPTIC_FAQ.md`](SKEPTIC_FAQ.md)). |

**Regression:**

```bash
npm run worker:test -- worker/tests/steward-hosted.test.ts worker/tests/city-game-season-entitlements-api.test.ts worker/tests/billing-lifecycle.test.ts
```

Touching `worker/src/resolver/steward-hosted.ts`, `worker/src/steward/*`, or `site/js/device-steward-entitlements*.mjs` requires the block above when behavior changes.
