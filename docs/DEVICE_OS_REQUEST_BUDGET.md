# Device OS request budget & resolver polling

**Opened:** 2026-05-26  
**Status:** **Active** - product/ops constraint; client polling must change before production scale  
**Audience:** Product, frontend, operators  
**Related:** [`DEVICE_OS.md`](DEVICE_OS.md) · [`DEVICE_INBOX.md`](DEVICE_INBOX.md) · [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) (saved-card scale) · [`UI_UX_REVERT_PLAN.md`](UI_UX_REVERT_PLAN.md) · [`CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md`](CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md)

---

## Why this doc exists

Humanity Commons is meant to be a **simple** reference site: static Pages + a small Worker resolver. In practice, the **device shell** can generate more Worker traffic than organic scans and creates combined - enough to exhaust the **Workers Free daily cap (100,000 requests/day)** in minutes when a steward leaves `/wallet/` open with many saved cards.

That is not “the site went viral.” It is **N cards × poll interval × open tabs**, mostly from **live-proof inbox** and **wallet status** fetches documented below.

**Cloudflare Error 1027** (`workers_daily_limit`) is an account quota event. Client mitigations (backoff, suppress since-visit UI when degraded) do not replace fixing the **poll budget**.

---

## How we want people to receive this

Humanity Commons is **not** a wallet monitoring service. It is a **reference resolver**: truth when someone looks (scan, open `/created/`, expand the hub, tap refresh).

| We say (product) | We avoid implying |
|------------------|-------------------|
| “Last checked on **this device** …” | “Always live” / “real-time dashboard” for every saved card |
| “Tap **Check network**” or “**Check for live proof**” when you care | That the server is watching your wallet 24/7 |
| **Watch for live proof** is **opt-in** | That saving a card turns on background polling |
| **1–5 saved cards** is comfortable; **10+** is power-user / out of spec until budget fixes land | Unlimited multi-card stewardship with no cost |

Stewards get **power when they intend it** (buttons, watch toggle, `/created/` signing surface). They do **not** get unlimited free infrastructure just by leaving `/wallet/` open.

Cross-link: trust boundaries in [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md); cards vs keys in [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md).

---

## North star: who pays for network work

> **The stranger’s browser pays for urgency. The steward’s browser pays for intent.**

| Actor | Surface | Polling role | Budget stance |
|-------|---------|--------------|---------------|
| **Stranger** | Scan page (`pass-v33` live-control UI) | Polls **one** card while they wait for proof | Appropriate; user-initiated, short session |
| **Steward (signing)** | `/created/` live panel | ~3s for **active** `profile_id` + keys in tab | Appropriate; signing surface |
| **Steward (wallet)** | Hub / `/wallet/` | Round-robin inbox + optional network refresh | **Must be scoped, opt-in, and capped** |
| **Background** | Service worker + OS alerts | Only when alerts opted in; long interval | Align cost with explicit value |

Removing “OS polling” means removing **blind, per-card, high-frequency polling** — not removing resolver awareness when the user opens the hub or signs.

---

## Two checks, two cost shapes

The hub toolbar bundles two jobs. Treat them separately in product copy, QA, and implementer estimates.

| Check | User question | Worker route (typical) | Cost shape |
|-------|---------------|----------------------|------------|
| **Network** | Is this QR / card still reachable? Revoked? | `GET …/status?q=…` | **Burst**: up to **N parallel** GETs on hub expand, **Check network**, or wallet render when cache is stale (`device-wallet-network.mjs`) |
| **Live proof** | Is someone waiting for me to sign? | `GET …/live-control/challenges` (pending) | **Steady drip**: **one** GET per poll tick, round-robin across saved cards (`device-live-control-inbox.mjs`) |

**Network** is “refresh chips.” **Live proof** is “inbox for strangers waiting.” Only the latter had the historical **5s × N parallel** incident; network can still spike on large wallets when the user opens the hub or taps **Check network**.

---

## Operating modes (product contract)

Target behavior stewards should understand (shipped pieces noted).

| Mode | When | Live proof | Network status | Shipped? |
|------|------|------------|----------------|----------|
| **Idle** | Hub collapsed on landing; not in signing flow | No auto poll; show cache + “not checked this visit” until user acts | No fetch unless user navigates to `/wallet/` scope | Partial — poll scope shipped; copy still evolving |
| **Attending** | Hub expanded or inbox sheet open | Round-robin if **Watch** on (`hc_watch_live_proof === "1"`); else manual **Check for live proof** only | Fetch on expand / manual **Check network**; `/wallet/` in network scope | Yes (Phases 1–5) |
| **Urgent** | Pending live proof known | **5s** tick interval (still one card per tick) | Unchanged | Yes (`liveControlPollIntervalMs`) |
| **Signing** | `/created/` with keys | **~3s** for **this card only** | Row chips from wallet cache | Yes (`created.mjs`) |
| **Background** | Tab hidden + browser alerts on | SW round-robin, **15 min** minimum periodic sync | N/A | Yes (Phase 4) |

**Watch for live proof** is **off by default**. Enabling it is consent to automatic Worker use while hub/inbox scope is active — not a requirement to use Humanity Cards.

---

## Request budget math

Account limit (Free): **100,000 Worker requests / day** (resets **00:00 UTC**). All routes on the account count, including `humanity.llc/.well-known/hc/v1/*`, `humanity.llc/c/*`, and `*.workers.dev`.

| Pattern | Formula | Example (10 saved cards, 1 visible tab, watch on, hub open 8h) |
|---------|---------|------------------------------------------------------------------|
| Live-control inbox (**shipped**, watch on) | `(86400 / POLL_MS_IDLE) × hours_active` — **1 GET/tick**, not N | 8h × (3600/60) ≈ **480/day** idle; **5s** ticks while pending add more |
| Live-control inbox (**legacy**, pre–Phase 1–2) | `N × (86400 / 5)` parallel | 10 × 17,280 = **172,800/day** — **do not regress to this** |
| Wallet status (hub refresh) | `cards × refreshes_per_day` (parallel per stale card) | 10 × ~50 hub opens ≈ 500 (small vs unscoped live proof) |
| Health check | `~1 / interval while shell loaded` | ~1/min visible tab ≈ 1,440/day |
| Stranger scan / create | User-driven | Variable; usually modest |

**Conclusion:** **Unscoped** live proof (5s × all cards × all tabs) can exceed the **entire free daily quota in under 15 minutes**. **Shipped** round-robin + 60s idle + watch default off + hub scope reduces idle burn dramatically, but **10+ cards × watch on × hub left open × multiple tabs** still adds up — see § Open issues at large wallet size.

Paid Workers (**Standard**) includes **10 million requests/month** (~333k/day average) - viable for a reference operator **if** polling is scoped. Uncapped 5s × N-card polling still burns paid quota and D1 reads at scale.

### Target (product)

| Environment | Suggested cap (per account, all users) | Per active steward tab (idle, hub closed) |
|-------------|----------------------------------------|-------------------------------------------|
| Free / dev | Stay **under ~20k/day** total | **0** live-control polls (or manual refresh only) |
| Production (Paid) | Monitor; alert before 80% monthly included | **&lt; 500/day** idle; burst only when hub/inbox open |

These are guidelines until we ship coded budgets in the client.

---

## What hits the Worker today (shipped behavior)

| Source | Module | When | Worker calls |
|--------|--------|------|----------------|
| **Live proof inbox** | `device-live-control-inbox.mjs` | **Phases 1–3 shipped:** scoped polling; round-robin **one** GET per tick; **no timer/fetch** when resolver health ≠ `ok`; **60s** backoff after challenge **429** | **0** when degraded/offline; **1 per tick** when active + ok |
| **Wallet network status** | `device-wallet-network.mjs` + `device-hub-ui.mjs` | Hub init, hub expand, manual/`NETWORK_REFRESHED`, baseline events; **≥60s** debounce on `visibilitychange` | Up to **N per refresh** (on demand) |
| **Resolver health** | `device-status.mjs` | Shell bootstrap + visible tab | **1** per refresh |
| **Created / live panel** | `created.mjs` | ~3s while proving on `/created/` | **1** per open card (appropriate) |
| **Service worker** | `/sw-live-proof.mjs` | Tab hidden + background alerts opt-in; **Phase 4:** round-robin **one** GET per wake, **15 min** `periodicSync`, resolver `ok` only | Bounded when opted in (see [`DEVICE_INBOX.md`](DEVICE_INBOX.md) Phase D) |
| **Cross-tab presence** | `device-tab-presence.mjs` | Heartbeat to **localStorage** only | **No Worker** |

The dominant cost is **live-control inbox polling all saved cards on a timer**, not “having a status dot.”

---

## Is Cloudflare Workers still realistic?

**Yes**, for this architecture (edge resolver + D1 + static shell), **if** the browser treats the network as **occasionally consulted**, not **continuously monitored**.

Workers are a poor fit for “every wallet polls every card every 5 seconds forever.” That pattern belongs to:

- **On-demand** fetches (open hub, tap refresh, open `/created/`),
- **One slow round-robin** timer per tab (not N parallel requests),
- **Long intervals** when idle (30–120s),
- **Optional** push/WebSocket later if instant live proof is a hard requirement.

Removing “OS polling” should mean removing **blind, per-card, high-frequency polling** - not removing network awareness entirely.

---

## Feature decision tree (before new auto-fetch)

Every new shell network behavior must answer:

1. **Who initiated it?** — stranger on scan / steward button / system timer  
2. **How many cards?** — one active (`hc_created`) vs N in `hc_wallet`  
3. **How long?** — until proof resolves vs indefinitely  
4. **Is this tab the signing surface?** — `/created/` with keys vs gallery `/wallet/`

If the answers are not “one card, short window, user- or stranger-initiated,” it should **not** hit the Worker on a timer without an explicit budget line in this doc and Vitest/E2E updates.

---

## Honest UX copy (target)

Copy should set expectations and reduce “why didn’t my phone know instantly?” support load.

| Surface | Target copy pattern | Why |
|---------|---------------------|-----|
| Hub collapsed / landing | “Last checked … (this device)” — no implied live server truth | Idle mode |
| Hub expanded, watch off | “Check for live proof” + “Check network” visible; watch unchecked | Intent-based |
| Hub expanded, watch on | “Checking 1 of N cards each minute” (or idle interval) | Makes round-robin legible |
| Large wallet (future) | “Large wallet — automatic checks limited; use per-card refresh” | Capacity as a feature |
| After daily budget cap (future) | “Automatic checks paused until tomorrow — tap Check for live proof” | Fail safe |

Shipped today: separate **Network checked …** / **Live proof checked …** line (`formatHubNetworkStatusLine` in `device-hub-network-tools-core.mjs`). Round-robin legibility and large-wallet banners are **Phase 7+** below.

---

## Server-side guardrails (ops)

Client budgets are necessary; they are **not** sufficient against bugs, old cached JS, or abuse.

| Control | Purpose | Status |
|---------|---------|--------|
| **429 + Retry-After** on hot routes | Client backs off (60s live proof; health degraded) | Partially shipped client-side |
| **Per-IP / per-device rate limits** | Cap burst “Check network” fan-out | Planned |
| **Short TTL / ETag** on `status` and challenge list | Cheap 304s for repeat polls | **Shipped** (Phase 9) |
| **Workers Paid + dashboard alerts** | Production reference operator survives organic use | Ops (Phase 0) |
| **Fail closed on 1027** | Site down until quota resets | Shipped behavior |

---

## Direction catalog (shipped vs planned)

### A. Scope *when* we poll

| Idea | Status | Notes |
|------|--------|-------|
| Poll live proof only when hub **expanded** or **inbox sheet** open | **Shipped** (Phase 1) | Not on collapsed landing; not “bare” wallet without hub expand |
| Poll only on `/created/` for the open card | **Shipped** for signing | Inbox still needs hub/inbox + watch or manual check |
| Stop polling when resolver health ≠ `ok` | **Shipped** (Phase 3) | |
| Manual **Check for live proof** when watch off | **Shipped** (Phase 5) | |
| Idle = **zero** polls (hub closed, no SW) | **Mostly shipped** | Watch off + collapsed hub ≈ zero live-control |

### B. Scope *how* we poll

| Idea | Status | Notes |
|------|--------|-------|
| One timer, round-robin **one card per tick** | **Shipped** (Phase 2) | Full wallet scan takes `N × interval` |
| **60s** idle / **5s** when pending | **Shipped** | `LIVE_CONTROL_POLL_MS_*` in `device-live-control-poll-scheduler.mjs` |
| Network refresh: capped parallelism on large wallet | **Shipped** (Phase 8) | `walletNetworkMaxParallel` (2 auto, 1 manual) |
| Network refresh: round-robin one stale row per debounced hub refresh (large wallet) | **Shipped** (Phase 8b) | `selectNetworkRefreshEntries` + `listWalletEntriesNeedingNetworkFetch` |
| Network refresh: visible-row priority | **Shipped** (Phase 8c) | `device-hub-visible-rows-core.mjs` + `orderEntriesVisibleFirst` |
| `If-None-Match` / short TTL on Worker | **Shipped** (Phase 9) | `conditional-json.ts`; client `resolver-conditional-fetch-core.mjs` |

### C. Scope *who* polls

| Idea | Status | Notes |
|------|--------|-------|
| **Leader tab** (`BroadcastChannel`) | **Shipped** (Phase 7) | `device-live-control-poll-leader.mjs`; followers apply snapshot, no Worker GET |
| SW only when browser alerts opted in | **Shipped** (Phase 4) | 15 min periodic minimum |
| Poll only **active** or **recently used** cards | **Shipped** (Phase 8) | `selectLiveControlPollEntries` when wallet ≥10 cards |
| **Per-tab/day auto-poll cap** | **Shipped** (Phase 7) | `hc_live_control_auto_poll_budget`; manual check exempt |

### D. Product defaults & caps

| Idea | Status | Notes |
|------|--------|-------|
| **Watch for live proof** default **off** | **Shipped** | Only `hc_watch_live_proof === "1"` enables auto poll |
| **Hard per-tab/day GET budget** | **Shipped** (Phase 7) | 400 auto GETs/UTC day; hub status line when paused |
| Large-wallet UI warning (10+ cards) | **Shipped** (Phase 8) | `#device-hub-large-wallet-hint` in hub network tools |
| Paid tier for continuous watch + push (hosted operator) | **Planning** | [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md) |

### E. Longer term (only if phases 7–9 miss SLA)

- Server push (WebSocket, SSE) for live-proof events - steward notified; stranger still polls on scan  
- Stranger poll on scan page only remains the urgency path  
- Third-party relay — overkill for reference operator

---

## Recommended way forward (phased)

Do **not** rip out the device OS. **Retire the default “poll every card every 5s on every shell page.”**

| Phase | Change | Request impact | UX tradeoff |
|-------|--------|----------------|-------------|
| **0 - Ops** | Enable **Workers Paid** on production; document daily monitor | Restores service after 1027 | Billing ~$5+/mo |
| **1 - Stop the bleed** (P0) | **Shipped:** live-control polling **only** when hub is **expanded** or inbox sheet is open; **stop** on collapse/close. Idle interval **60s** when no pending proof (`LIVE_CONTROL_POLL_MS_IDLE`). | ~**95%** cut on **landing** (collapsed hub); large cut vs legacy 5s × N | Proof badge may lag until hub/inbox opened on landing |
| **2 - Cap fan-out** (P0) | **Shipped:** round-robin **one** `live-control` GET per tick; wallet status on hub open + manual refresh + **≥60s** visibility debounce | Bounded **~1,440–2,880/day/tab** at 30–60s | Full wallet scan for live proof takes `N × interval`; network chips refresh on expand not every visibility |
| **3 - Degraded = silent** (P1) | **Shipped:** no live-control poll timer/fetch unless resolver health is `ok` (`getResolverHealthStatus`); resumes on `hc-resolver-health-changed`; **60s** backoff after challenge **429** | Stops inbox poll storms during 1027/degraded | Live proof inbox may lag until health recovers |
| **4 - SW policy** (P1) | **Shipped:** SW polls only when browser alerts on + permission granted + resolver `ok`; **15 min** `periodicSync`; round-robin **one** challenge GET per wake; 60s backoff on 429 | Cuts hidden-tab burn | Slower background alerts; full wallet scan takes N wakes |
| **5 - Product polish** (P2) | **Shipped:** hub **Check network** + last-checked line; **Watch for live proof** toggle (**default off**, opt-in `hc_watch_live_proof === "1"`); **Check for live proof** when watch off | User-visible cost | Strangers waiting need steward to enable watch or tap manual check; lower idle Worker load |
| **6 - Evaluate push** (future) | Only if phases 7–9 cannot meet “stranger waiting” SLA | Best at scale | Engineering cost |
| **7 - Session budget & leader tab** (P1) | **Shipped:** `hc_live_control_auto_poll_budget` (**400**/UTC day/tab); leader lock `hc_live_control_poll_leader` + `BroadcastChannel` snapshot; manual check bypasses cap | Prevents runaway 8h hub sessions | Auto poll pauses with hub message; manual check remains |
| **8 - Wallet scale & network fan-out** (P1) | **Shipped:** large-wallet hint (≥10 cards); live-control poll set = active `hc_created` + pending; network `maxParallel` 2 (auto) or 1 (manual) | Cuts N-parallel status storms | Full-wallet live proof scan slower when large |
| **8b - Presence & chrome** (P1) | **Shipped:** skip presence heartbeat when alone with keys (`shouldSkipPresenceHeartbeat`) | Less cross-tab churn when single tab | Heartbeat resumes when second tab opens |
| **8c - Visible rows + SW watch** (P1) | **Shipped:** network refresh prefers hub-visible `.hub-card-item` rows; SW polls only when `hc_watch_live_proof === "1"` (alerts still required) | On-screen chips refresh first | Background polls off when watch off |
| **9 - Edge cache** (P2) | ETag / short TTL on status + challenge endpoints | Fewer D1 reads on repeat polls | **Shipped** |
| **10 - Hosted tier + push** (planning) | Entitlements, higher caps, optional server push — **no code yet** | Best UX at scale | See [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md) |

**Tests (shipped):** Vitest in `device-live-control-poll-scheduler.test.ts`, `device-live-control-round-robin.test.ts`, `device-hub-network-tools-core.test.ts`; Playwright in `e2e/device-inbox.spec.ts` (collapsed hub idle 10s, one challenge per tick, degraded health, watch off + manual check).

---

## What we should *not* do

- **Assume 100k/day is “heavy traffic” for humans** - it is heavy for **unscoped automated polling**, not for a simple brochure site.
- **Rely on cache clear or since-visit fixes** to solve 1027 - those are UI correctness; quota is polling volume.
- **Re-enable global `initDeviceOsCoordinator()`** on every shell page without a budget ([`UI_UX_REVERT_PLAN.md`](UI_UX_REVERT_PLAN.md)).
- **Add new per-card timers** without checking this doc.

---

## Agent / implementer checklist

Before merging shell changes that touch network I/O:

1. Read this doc and estimate **requests/day** for `N=20` cards, one tab, 8h visible.
2. Prefer **on-demand** and **round-robin** over `Promise.all(entries.map(fetch))` on an interval.
3. Gate polls on **hub expanded**, **health ok**, and **visibility**.
4. Update Vitest/E2E when changing poll gating.
5. Cross-link PR to phase table above.

---

## Watch for live proof (default off)

**Storage:** `localStorage.hc_watch_live_proof`

| Value | Auto live-control poll |
|-------|-------------------------|
| unset | **Off** (reference default) |
| `"0"` | Off |
| `"1"` | On when hub expanded or inbox sheet open (and resolver health `ok`) |

Manual **Check for live proof** always runs one round-robin pass when watch is off. Opening the inbox sheet does **not** start auto poll without watch (scope may be active, but the timer requires `hc_watch_live_proof === "1"`).

**Paid / hosted operator (planning):** Product definition in [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md). Free/reference use remains **manual check**, opt-in watch, and shipped caps (400 auto live-proof GETs/day/device). Paid may raise caps and add optional server push — not implemented.

---

## Optimization catalog (full backlog)

Use this table when prioritizing work. **Shipped** items have modules named; **Planned** items need a phase line here before implementation.

### Product model (cards, keys, QRs)

| # | Question / idea | Shipped today | Planned direction | Phase |
|---|-----------------|---------------|-------------------|-------|
| P1 | **Do all QRs need a saved profile + keys?** | **No.** Scan is public. Signing needs `hc_created` in tab only. `hc_wallet` is optional convenience. | Docs + UX never imply “save every card.” Pins ≠ keys. | Ongoing |
| P2 | **Does saving a card turn on monitoring?** | **No.** Watch default off; save ≠ `hc_watch_live_proof`. | Same; optional per-card watch later. | 5 ✅ |
| P3 | **Auto-save vs auto-watch** | Auto-save (`hc_auto_save_device`) separate from watch. | Keep independent; auto-save does not enable poll. | Ongoing |
| P4 | **Paid / hosted operator** | Reference site: manual + opt-in watch. | Continuous watch + push + higher caps as **paid tier**; Free stays intent-based. | 10 — see [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md) |

### Live proof (steward)

| # | Idea | Shipped today | Planned direction | Phase |
|---|------|---------------|-------------------|-------|
| L1 | Poll only hub expanded / inbox open | Yes | — | 1 ✅ |
| L2 | Round-robin **one GET per tick** | Yes | — | 2 ✅ |
| L3 | **60s** idle / **5s** when pending | Yes | Tunable per environment | 2 ✅ |
| L4 | Watch **default off** | Yes (`=== "1"` only) | — | 5 ✅ |
| L5 | Manual **Check for live proof** | Yes | — | 5 ✅ |
| L6 | Resolver health gate + 429 backoff | Yes | — | 3 ✅ |
| L7 | **Leader tab** + follower snapshot | Yes (`device-live-control-poll-leader.mjs`) | Leader heartbeat for lock renewal | 7 ✅ |
| L8 | **Per-tab/day auto-poll budget** | Yes (400/UTC day); hub message when paused | Configurable cap; ops dashboard | 7 ✅ |
| L9 | Large wallet: poll **active + pending** only | Yes (`selectLiveControlPollEntries`, ≥10 cards) | Per-card “watch this card” flag | 8 ✅ |
| L10 | **Stranger pays urgency** | Scan page polls one QR while waiting | Steward inbox optional; OS alert path | Scan + SW |
| L11 | `/created/` polls **active card only** | ~3s while proving | Stop when hidden (shipped in `created-live-proof-poll-core`) | Created ✅ |
| L12 | Server push for live proof | — | SSE P1 then DO P2; steward notified without wallet round-robin | 10 — [`HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md`](HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md) |

### Network status (wallet chips)

| # | Idea | Shipped today | Planned direction | Phase |
|---|------|---------------|-------------------|-------|
| N1 | No fetch on collapsed landing hub | Yes (`shouldScheduleWalletNetworkFetchAfterHubRender`) | — | P1 ✅ |
| N2 | Debounced hub fetch (300ms) | Yes | — | P1 ✅ |
| N3 | Large wallet: cap parallel status GETs | Yes (2 auto, 1 manual via `walletNetworkMaxParallel`) | — | 8 ✅ |
| N3b | Large wallet: round-robin **one stale status GET** per hub debounce | Yes (`selectNetworkRefreshEntries`) | Visible-row priority | 8b ✅ |
| N4 | Visible-row-first status refresh | Yes (`profileIdsWithVisibleRows`, `orderEntriesVisibleFirst`) | Intersection-based hub list | 8c ✅ |
| N5 | Worker **ETag** / 304 on `status` | Yes | Fewer D1 reads on repeat polls | 9 ✅ |
| N6 | Longer session cache TTL when idle | 5 min session cache | Tiered TTL (idle vs attending) | 9 |

### Shell performance (no Worker)

| # | Idea | Shipped today | Planned direction | Phase |
|---|------|---------------|-------------------|-------|
| S1 | `loadWallet()` memo | Yes (`device-wallet.mjs`) | Invalidate on external storage only | Lag ✅ |
| S2 | Presence heartbeat **10s** + coalesce events | Yes | — | Lag ✅ |
| S3 | Chrome debounce + fingerprint skip | Yes (`device-chrome-refresh.mjs`) | — | Lag ✅ |
| S4 | Skip presence heartbeat **when alone with keys** | Yes (`shouldSkipPresenceHeartbeat`) | Also skip when no `hc_created` | 8b ✅ |
| S5 | Lazy-load inbox sheet / notifications | — | Smaller bootstrap graph | P2 |
| S6 | Shard `hc_wallet_network_cache` | — | Bound session cache size | Open issues |
| S7 | Cross-tab rebuild (one snapshot) | Partial (Phases 1–6) | Full state machine per [`CROSS_TAB_KEYS_REBUILD_PLAN.md`](CROSS_TAB_KEYS_REBUILD_PLAN.md) | Cross-tab |

### Background / SW

| # | Idea | Shipped today | Planned direction | Phase |
|---|------|---------------|-------------------|-------|
| B1 | SW polls only with browser alerts on | Yes | — | 4 ✅ |
| B2 | SW **15 min** periodic + round-robin | Yes | Align with watch opt-in only | 4 ✅ |
| B3 | SW respects watch + resolver health | Yes | `syncLiveProofServiceWorkerState` sets `enabled` from watch; periodic unregistered when watch off | 8c ✅ |

### Ops / edge

| # | Idea | Shipped today | Planned direction | Phase |
|---|------|---------------|-------------------|-------|
| O1 | Workers Paid on production | Ops | Monitor daily requests | 0 |
| O2 | Per-IP rate limits on hot routes | — | Cap burst **Check network** | Server |
| O3 | Fail closed on 1027 | Yes | User-visible degraded state | 3 ✅ |

### Implementer order (after Phases 1–9 + 8c)

1. **Phase 10 (planning → build)** — M2–M5 done. Next: **M6** Technical Standards delta in [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md), then M4 governance sign-off before code.  
2. **Shell P2** - Lazy inbox loader ([`SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md`](SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md)).  
3. **Ops O2** - Per-IP rate limits on hot routes.

See also [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) and [`SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md`](SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md).

---

## Open issues at large wallet size (must fix)

Phases 1–5 improved polling, but **N saved cards** on one browser is still an open product/engineering problem. The items below **need dedicated fixes** (not documentation-only). Full table and comfortable scale guidance: [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) § Realistic scale on one browser.

### 1. Worker / inbox budget (this doc)

**~10+ saved cards** with **watch on**, **hub expanded for hours**, and **browser alerts** can still stress Free-tier quota if the daily cap is not hit first. Phases **7–8** add a **400 auto-poll/day** cap, leader tab, narrowed large-wallet live-proof set, and capped network parallelism. Remaining: shell perf at large N ([`SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md`](SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md)).

### 2. Shell performance (must fix)

Every hub/inbox pass calls `loadWallet()` and `JSON.parse`s the full `hc_wallet` array. `hc_wallet_network_cache` grows per saved card per session. **Must address:** avoid full-wallet parse on hot paths, bound or shard cache entries, lazy row hydration. See [`SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md`](SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md).

### 3. Multi-tab presence (must fix)

Tabs with `hc_created` heartbeat into `hc_tab_keys_presence` (max **20** rows). That traffic is local-only (no Worker), but `storage` events drive `refreshDeviceChrome` on **all** tabs. **Must address:** debounce/coalesce with large wallets and many tabs; align with [`CROSS_TAB_KEYS_REBUILD_PLAN.md`](CROSS_TAB_KEYS_REBUILD_PLAN.md). See [`LAGGY_SCROLL_CROSS_TAB_PRESENCE_INVESTIGATION.md`](LAGGY_SCROLL_CROSS_TAB_PRESENCE_INVESTIGATION.md).

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-26 | **M5 FAQ/launch copy:** [`SKEPTIC_FAQ.md`](SKEPTIC_FAQ.md), [`LAUNCH_LANGUAGE_KIT.md`](LAUNCH_LANGUAGE_KIT.md) |
| 2026-05-26 | **M4 pricing/SLA:** [`HOSTED_TIER_PRICING_AND_SLA.md`](HOSTED_TIER_PRICING_AND_SLA.md) |
| 2026-05-26 | **M3 push RFC:** [`HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md`](HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md) |
| 2026-05-26 | **M2 entitlements:** [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) |
| 2026-05-26 | **Phase 10 planning:** [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md) (hosted tier + push; no implementation) |
| 2026-05-26 | **Phase 8c shipped:** visible-row-first hub network refresh; SW background polls require **Watch for live proof** on |
| 2026-05-26 | **Phase 8b:** network status round-robin for large wallets; skip presence heartbeat when alone with keys |
| 2026-05-26 | **Phases 7–8 shipped:** auto-poll daily cap, leader tab + BC snapshot, large-wallet hint, narrowed live-control poll set, network `maxParallel` cap; Vitest for budget/scale/leader |
| 2026-05-26 | **Phase 7–8 shipped** in client: leader tab, daily auto-poll budget, large-wallet hint, narrowed poll entries, network `maxParallel`; **8b:** skip presence heartbeat when alone with keys |
| 2026-05-26 | **Optimization catalog** - full backlog table (product, live proof, network, shell, SW, ops) |
| 2026-05-26 | **Product/engineering brainstorm** — § How we want people to receive this, north star, two checks, operating modes, decision tree, honest UX, server guardrails, direction catalog (shipped vs planned), Phases 7–9 |
| 2026-05-26 | **Watch for live proof default off** - only `hc_watch_live_proof === "1"` enables auto poll; manual **Check for live proof** unchanged |
| 2026-05-26 | **Long-session lag pass:** 10s presence heartbeat; coalesced presence events; 1.2s debounced chrome when cross-tab active; skip chrome when presence fingerprint unchanged; `loadWallet()` memo; hub network fetch gated on collapsed landing; live-control poll only hub expanded/inbox (not bare `/wallet/`); idle poll **60s**; shell `?v=39` |
| 2026-05-26 | § Open issues at large wallet size - worker budget, shell perf, multi-tab (must fix) |
| 2026-05-26 | Initial doc after production 1027 + false-positive investigation |
| 2026-05-26 | **Phase 1 shipped:** `device-live-control-poll-scheduler.mjs`, scoped polling in `device-live-control-inbox.mjs` |
| 2026-05-26 | **Phase 2 shipped:** round-robin live-control poll slots; hub-expand network refresh; 60s visibility debounce for wallet status |
| 2026-05-26 | **Phase 3 shipped:** live-control poll loop gated on resolver health `ok` only; listen for `hc-resolver-health-changed` |
| 2026-05-26 | **Phase 4 shipped:** SW round-robin poll, 15 min periodic sync, alerts-only + resolver health gate |
| 2026-05-26 | **Phase 5 shipped:** hub network tools - Check network, last-checked status, Watch for live proof toggle |
| 2026-05-26 | **Test coverage:** Vitest `liveControlAutoPollShouldRun`; E2E watch-off idle + manual **Check for live proof** |
