# Device OS request budget & resolver polling

**Opened:** 2026-05-26  
**Status:** **Active** - product/ops constraint; client polling must change before production scale  
**Audience:** Product, frontend, operators  
**Related:** [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) · [`DEVICE_OS.md`](DEVICE_OS.md) · [`DEVICE_INBOX.md`](DEVICE_INBOX.md) · [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) (saved root-card scale) · [`UI_UX_REVERT_PLAN.md`](UI_UX_REVERT_PLAN.md) · [`CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md`](CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md)

---

## Why this doc exists

Humanity Commons is meant to be a **simple** reference site: static Pages + a small Worker resolver. In practice, the **device shell** can generate more Worker traffic than organic scans and creates combined - enough to exhaust the **Workers Free daily cap (100,000 requests/day)** in minutes when a steward leaves `/wallet/` open with many saved root cards or later many watched child objects.

That is not “the site went viral.” It is **N roots/objects × poll interval × open tabs**, mostly from **live-proof inbox** and **wallet status** fetches documented below.

**Cloudflare Error 1027** (`workers_daily_limit`) is an account quota event. Client mitigations (backoff, suppress since-visit UI when degraded) do not replace fixing the **poll budget**.

---

## How we want people to receive this

Humanity Commons is **not** a wallet monitoring service. It is a **reference resolver**: truth when someone looks (scan, open `/created/`, expand the hub, tap refresh).

| We say (product) | We avoid implying |
|------------------|-------------------|
| “Last checked on **this device** …” | “Always live” / “real-time dashboard” for every saved card |
| “Tap **Check network**” or “**Check for live proof**” when you care | That the server is watching your wallet 24/7 |
| **Watch for live proof** is **opt-in** | That saving a card turns on background polling |
| **1–5 saved root cards** is comfortable; **10+** is power-user / out of spec until budget fixes land. Many child objects should be managed under one root, but automatic checks still need explicit budgets. | Unlimited multi-card or multi-object stewardship with no cost |

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
| **Attending** | Hub expanded, inbox sheet open, or `/wallet/` with Watch on | Round-robin if **Watch** on (`hc_watch_live_proof === "1"`); else manual **Check for live proof** only | Fetch on expand / manual **Check network**; `/wallet/` in network scope | Yes (Phases 1–5) |
| **Urgent** | Pending live proof known | **5s** tick interval (still one card per tick) | Unchanged | Yes (`liveControlPollIntervalMs`) |
| **Signing** | `/created/` with keys | **~3s** for **this card only** | Row chips from wallet cache | Yes (`created.mjs`) |
| **Background** | Tab hidden + browser alerts on | SW round-robin, **15 min** minimum periodic sync | N/A | Yes (Phase 4) |

**Watch for live proof** is **off by default**. Enabling it is consent to automatic Worker use while hub, inbox, or `/wallet/` scope is active — not a requirement to use Humanity Cards.

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
| **Per-IP / per-device rate limits** | Cap burst “Check network” + live-proof poll + health fan-out | **Shipped (2026-05-28)** — `GET …/status` 300/IP/min; `GET …/live-control/*` 300/IP/min; `GET …/health` 120/IP/min (Technical Standards §15 + O2 step 2) |
| **Short TTL / ETag** on `status` and challenge list | Cheap 304s for repeat polls | **Shipped** (Phase 9) |
| **Workers Paid + dashboard alerts** | Production reference operator survives organic use | Ops (Phase 0) |
| **Fail closed on 1027** | Site down until quota resets | Shipped behavior |

---

## Direction catalog (shipped vs planned)

### A. Scope *when* we poll

| Idea | Status | Notes |
|------|--------|-------|
| Poll live proof only when hub **expanded**, **inbox sheet** open, or `/wallet/` with Watch on | **Shipped** (Phase 1) | Not on collapsed landing; not bare wallet when Watch is off |
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
| **Resolver network tab sync** | **Shipped** (Phase 1a) | [`DEVICE_TAB_RESOLVER_SYNC.md`](DEVICE_TAB_RESOLVER_SYNC.md) — `hc-resolver-sync` BC; followers skip duplicate polls within 60s |
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
| **10 - Hosted tier + push** (E2 staging) | Entitlements probe, higher caps, optional server push — **E2+E3 client/server staging**; E4 push next | Best UX at scale | [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md); M7 rows + test plan: § Phase 10 — hosted tier rows (M7) |

**Tests (shipped, Phases 1–9):** Vitest in `device-live-control-poll-scheduler.test.ts`, `device-live-control-round-robin.test.ts`, `device-live-control-poll-budget-core.test.ts`, `device-live-control-poll-leader-core.test.ts`, `device-live-control-sw-core.test.ts`, `device-hub-visible-rows-core.test.ts`, `device-wallet-scale-core.test.ts` (if present); Playwright in `e2e/device-inbox.spec.ts`, `e2e/created-control.spec.ts` (collapsed hub idle, one challenge per tick, degraded health, watch off + manual check).

**Tests (Phase 10, M8 staging):** § Phase 10 test plan (M7) — G0 verification: `npm run verify:hosted-g0` · `npm run e2e:steward-hosted` (H1–H6).

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

**Paid / hosted operator (staging):** Product definition in [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md). Free/reference use remains **manual check**, opt-in watch, and shipped caps (400 auto live-proof GETs/day/device). Hosted E2 can raise caps from `GET …/steward/entitlements`; push remains a later E4 path. Full entitlement rows and test plan: § Phase 10 — hosted tier rows (M7) below.

---

## Phase 10 — hosted tier rows (M7)

**Status:** E1/E2/E5 foundation staging (May 2026) — keep production flag off until M4 governance sign-off + M8 rollout gates  
**Sources:** [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) · [`HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md`](HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md) · [`HOSTED_TIER_TECHNICAL_STANDARDS_DELTA.md`](HOSTED_TIER_TECHNICAL_STANDARDS_DELTA.md)

As M8 **E2** stages, shipped free-tier constants in poll modules MUST resolve from **`GET …/steward/entitlements`** (or fall back to `reference_free` when unauthenticated). This section is the **request-budget contract** for that migration.

### Entitlement rows (free vs hosted)

| Entitlement key | Free (`reference_free`, shipped) | Hosted (`hosted_steward_v1`, planning) | Client module(s) |
|-----------------|----------------------------------|----------------------------------------|------------------|
| `steward.hosted` | `false` | `true` | Master gate (hub settings, entitlement probe) |
| `notify.push.live_proof` | `false` | `true` | `device-browser-notifications*.mjs`, `sw-live-proof.mjs` |
| `watch.default_on` | `false` | `false` | `device-hub-network-tools-core.mjs` (org override only) |
| `poll.live_proof.auto_daily_cap` | **400** / UTC day / `device_id` | **4000** (fair-use; account soft cap 50k/day per M4) | `device-live-control-poll-budget-core.mjs` |
| `poll.live_proof.idle_ms` | **60000** | **30000** | `device-live-control-poll-scheduler.mjs` |
| `poll.live_proof.active_ms` | **5000** | **5000** | same |
| `poll.network.max_parallel` | **2** (large wallet auto) | **5** | `device-wallet-network.mjs` / `walletNetworkMaxParallel` |
| `poll.network.manual_max_parallel` | **1** (large manual) | **3** | same |
| `wallet.large_threshold` | **10** | **25** | `device-wallet-scale-core.mjs` |
| `sw.periodic_min_ms` | **900000** (15 min) | **300000** (5 min) | `device-live-control-sw-core.mjs` |

**Unchanged on every tier:** round-robin **one** live-proof GET per tick; poll only when hub expanded, inbox open, or `/wallet/` with Watch on (unless push replaces poll — M3); manual **Check for live proof** and **Check network** uncapped by daily auto cap; resolver health gate; leader tab; stranger scan page polls **their** session only.

**Server push (hosted only):** When `notify.push.live_proof === true` and steward subscribes, push **reduces** wallet round-robin need; SW remains fallback ([`HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md`](HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md)). Free tier keeps device-only polling + OS alerts path ([`DEVICE_INBOX.md`](DEVICE_INBOX.md)).

### Request math (planning)

| Mode | Free reference (20 cards, watch on, hub 8h) | Hosted steward (same, caps raised) |
|------|---------------------------------------------|-------------------------------------|
| Auto live-proof GETs | Hits **400/day** cap → pause + manual check | **4000/day** cap; 30s idle interval → ~960/day before cap |
| Network status (large wallet) | Max **2** parallel auto | Max **5** parallel auto |
| SW wake | 15 min min + alerts on + watch on | 5 min min (still alerts + watch gated) |

Ops MUST NOT treat hosted as unlimited polling — M4 fair-use and account soft caps still apply.

### Test plan (run when M8 ships E2–E4)

**Free-tier regression (run today on every hosted-tier PR — must stay green):**

```bash
npm run worker:test -- \
  worker/tests/device-live-control-poll-scheduler.test.ts \
  worker/tests/device-live-control-round-robin.test.ts \
  worker/tests/device-live-control-poll-budget-core.test.ts \
  worker/tests/device-live-control-poll-leader-core.test.ts \
  worker/tests/device-live-control-sw-core.test.ts \
  worker/tests/device-hub-visible-rows-core.test.ts \
  worker/tests/device-wallet-scale-core.test.ts \
  worker/tests/device-hub-network-tools-core.test.ts \
  worker/tests/device-steward-entitlements-core.test.ts \
  worker/tests/device-steward-entitlements.test.ts \
  worker/tests/conditional-json.test.ts

npm run e2e -- e2e/device-inbox.spec.ts e2e/created-control.spec.ts
```

**Hosted-specific (bundled):**

```bash
npm run worker:test:steward-hosted
npm run e2e:steward-hosted
npm run verify:hosted-g0   # free-tier Vitest + steward-hosted Vitest
```

**Vitest (extend existing modules when E2 reads entitlements):**

| Case | Module | Assert |
|------|--------|--------|
| Free fallback | `device-live-control-poll-budget-core` | Cap **400** when no session / `reference_free` policy |
| Hosted cap | same | Cap **4000** when mocked `hosted_steward_v1` policy |
| Idle interval | `device-live-control-poll-scheduler` | **60s** free vs **30s** hosted from policy |
| Large threshold | `device-wallet-scale-core` | **10** vs **25** card narrowing |
| Network parallel | `device-wallet-network` / scale helpers | **2/1** free vs **5/3** hosted |
| SW periodic floor | `device-live-control-sw-core` | **15 min** vs **5 min** |
| Manual check bypass | `device-live-control-poll-budget-core` | Manual **Check for live proof** does not increment auto budget (both tiers) |
| Push gate | `device-browser-notifications-core` | `notify.push.live_proof` required for server subscribe path (hosted only) |

**Playwright (add to `e2e/device-inbox.spec.ts` or new `e2e/hosted-tier-budget.spec.ts`):**

| Case | Setup | Assert |
|------|-------|--------|
| H1 Free default | No steward session; watch on; hub expanded | `e2e/hosted-tier-budget.spec.ts` asserts **400** cap + free policy with no entitlement GET |
| H2 Hosted session | Mock `GET …/steward/entitlements` → `hosted_steward_v1` | `e2e/hosted-tier-budget.spec.ts` asserts **4000** cap, 30s idle, 5/3 network parallel, 5 min SW |
| H3 Downgrade | Session returns `reference_free` mid-session | `e2e/hosted-tier-budget.spec.ts` asserts client reapplies **400** cap on next entitlement fetch |
| H4 Push opt-in | Hosted + `notify.push.live_proof`; SSE mock | `e2e/hosted-tier-push.spec.ts` — push healthy suppresses auto poll; `live_proof.pending` triggers one GET |
| H5 Free unchanged | No billing code paths on reference operator | `e2e/hosted-tier-budget.spec.ts` asserts anonymous create remains available with no hosted entitlement call or paywall |

**Manual QA ([`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) — add **P1-8 Hosted tier budget** when E2 ships):**

1. Free steward: **400** auto cap message unchanged (P1-7 baseline).
2. Hosted test account: hub shows raised cap in diagnostics (`hc_inbox_diagnostics` / entitlement debug).
3. Cancel hosted: returns to free caps without clearing wallet or keys.
4. Stranger scan poll unchanged — no steward session on scan page.

**Epic exit criteria (M8):**

| Epic | Exit tests |
|------|------------|
| **E1** Account + entitlement API | Worker link-signature + entitlements routes; free scan/create unchanged |
| **E2** Client tier probe | Vitest policy merge; E2E H3 downgrade; hub `steward.hosted` gate |
| **E3** Raised caps | Vitest rows above; server 429 `steward_quota_exceeded` |
| **E4** Push channel | M3 interoperability; E2E H4; poll fallback when SSE down |
| **E5** Billing webhooks | Lifecycle `active` / `expired` → entitlement status |
| **E6** Ops dashboards | Runbook only |

### M8 implementation gates (do not start E2–E4 until)

1. **M4 governance sign-off** on [`HOSTED_TIER_PRICING_AND_SLA.md`](HOSTED_TIER_PRICING_AND_SLA.md) before production enablement.
2. This M7 section reviewed against shipped module constants (table above).
3. Vitest + Playwright rows above stay green with every E2–E4 hosted-tier PR — see [`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md).

---

## Optimization catalog (full backlog)

Use this table when prioritizing work. **Shipped** items have modules named; **Planned** items need a phase line here before implementation.

### Product model (cards, keys, QRs)

| # | Question / idea | Shipped today | Planned direction | Phase |
|---|-----------------|---------------|-------------------|-------|
| P1 | **Do all QRs need a saved profile + keys?** | **No.** Scan is public. Signing needs `hc_created` in tab only. `hc_wallet` is optional convenience. | Docs + UX never imply “save every card.” Pins ≠ keys. | Ongoing |
| P2 | **Does saving a card turn on monitoring?** | **No.** Watch default off; save ≠ `hc_watch_live_proof`. | Same; optional per-card watch later. | 5 ✅ |
| P3 | **Auto-save vs auto-watch** | Auto-save (`hc_auto_save_device`) separate from watch. | Keep independent; auto-save does not enable poll. | Ongoing |
| P4 | **Paid / hosted operator** | Reference site: manual + opt-in watch. | Higher caps + optional push; **free defaults unchanged** for anonymous + no session | 10 — [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md); tests § Phase 10 |

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
| L13 | **Entitlement-driven poll cap** | Fixed 400/day in client | Resolve `poll.live_proof.auto_daily_cap` from `GET …/steward/entitlements` | 10 — M7 § E2/E3 |
| L14 | **Server 429** on over-cap auto poll | Client cap only | Double enforcement when session + linked profile | 10 — M2 |
| L15 | **Push replaces round-robin** when healthy | SW/tab poll fallback | Leader tab holds SSE; poll only on push miss | 10 — M3 + M7 § E4 |

### Hosted tier / entitlements (Phase 10 — planning tests)

| # | Idea | Shipped today | Test when built | Phase |
|---|------|---------------|-----------------|-------|
| H1 | `reference_free` when no session | Yes | 401 / absent session → 400 cap | 10 |
| H2 | `hosted_steward_v1` caps from API | Staging | Mock entitlements → 4000 cap, 5 parallel | 10 |
| H3 | `steward_account_link_v1` verify | — | Worker rejects bad sig / replay nonce | 10 |
| H4 | Push `live_proof.pending` → one GET | Staging | E2E: no wallet round-robin while SSE up; SSE down re-enables poll | 10 |
| H5 | Downgrade to free on `expired` | Staging for policy reapply | Session cleared; 400 cap; push unsub | 10 |
| H6 | Merch order does not grant hosted | Staging | `worker/tests/billing-webhook.test.ts` commerce ignore | 10 |

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
| S3 | Chrome debounce + fingerprint skip | Yes (`device-chrome-refresh.mjs`) | Large wallets: `presenceChromeDebounceMs` steps 1200→1600→2000 ms (open issues §3) | Lag ✅ |
| S4 | Skip presence heartbeat **when alone with keys** | Yes (`shouldSkipPresenceHeartbeat`) | Also skip when no `hc_created` | 8b ✅ |
| S5 | Lazy-load inbox sheet / notifications | Yes (`device-inbox-sheet-loader`, `device-browser-notifications-loader`) | Smaller bootstrap graph | P2 ✅ |
| S6 | Shard / bound `hc_wallet_network_cache` | **Yes** (2026-05-27) | Max **20** fresh rows; LRU + wallet protect on save | Open issues → shipped |
| S8 | Wallet metadata hot paths | **Yes** (2026-05-28) | Count/pollable/signing/profile-summary reads avoid full wallet copies in status, glance, inbox, scan dot | Shipped |
| S9 | Hub saved-row display hydration | **Yes** (2026-05-28) | `listWalletDisplayEntries` + `findWalletEntryById` on action (no `loadWallet().slice()` per render) | Shipped |
| S10 | Hub saved-row DOM cap (large wallet) | **Yes** (2026-05-28) | `selectHubSavedRowEntries` (cap **15**, visible-first) + “N more” row → `/wallet/` | Shipped |
| S11 | `/wallet/` saved-row DOM cap (large wallet) | **Yes** (2026-05-28) | `selectWalletPageSavedRowEntries` (cap **40**, visible-first) + **Show all saved cards** expands full list | Shipped |
| S7 | Cross-tab rebuild (one snapshot) | **Yes** (Phases 1–6) | Coordinator + fingerprint skip; large-wallet scales `presenceChromeDebounceMs` | Cross-tab ✅ |

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
| O2 | Per-IP rate limits on hot routes | **Yes** (2026-05-28) | `GET …/status` 300/IP/min; `GET …/live-control/*` 300/IP/min; `GET …/health` 120/IP/min | Server ✅ |
| O3 | Fail closed on 1027 | Yes | User-visible degraded state | 3 ✅ |

### Implementer order (after Phases 1–9 + 8c)

1. **Phase 10 (M8 complete, G0 signed)** — **Next:** production rollout ([`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md) § Production rollout). Legal review for G7 when available.
2. **Shell P2** - Lazy browser notifications loader ([`SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md`](SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md)) — **shipped 2026-05-27**.  
3. **Ops O2** — **shipped:** per-IP limits on `GET …/status` (300/min), `GET …/live-control/*` (300/min), and `GET …/health` (120/min). Vitest: `worker/tests/hot-route-rate-limit.test.ts`.

See also [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) and [`SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md`](SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md).

---

## Open issues at large wallet size (must fix)

Phases 1–5 improved polling, but **N saved cards** on one browser is still an open product/engineering problem. The items below **need dedicated fixes** (not documentation-only). Full table and comfortable scale guidance: [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) § Realistic scale on one browser.

### 1. Worker / inbox budget (this doc)

**~10+ saved cards** with **watch on**, **hub expanded for hours**, and **browser alerts** can still stress Free-tier quota if the daily cap is not hit first. Phases **7–8** add a **400 auto-poll/day** cap, leader tab, narrowed large-wallet live-proof set, and capped network parallelism. Remaining: shell perf at large N ([`SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md`](SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md)).

### 2. Shell performance (must fix)

Hub/inbox chrome and poll selection avoid copying the full `hc_wallet` array for count/profile-only reads via persisted `hc_wallet_summary` (S8). Hub saved-card DOM uses display-safe rows without private key fields; signing actions hydrate the full row via `findWalletEntryById` (S9, 2026-05-28). Large wallets cap hub sheet saved-card rows at **15** with a link to **My cards** (S10) and cap `/wallet/` initial render at **40** with **Show all saved cards** (S11, 2026-05-28). **`hc_wallet_network_cache`** is capped at **20** fresh rows (S6). Optional later: virtual scroll on `/wallet/` for N ≫ 40. See [`SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md`](SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md).

### 3. Multi-tab presence (monitor)

Tabs with `hc_created` heartbeat into `hc_tab_keys_presence` (max **20** rows). Phases 1–6 ([`CROSS_TAB_KEYS_REBUILD_PLAN.md`](CROSS_TAB_KEYS_REBUILD_PLAN.md)) ship one coordinator, coalesced events, and fingerprint skip. **2026-05-28:** large wallets (≥10 saved) use longer `presenceChromeDebounceMs` (1.6s / 2.0s at ≥20). Re-test multi-tab landing scroll per [`LAGGY_SCROLL_CROSS_TAB_PRESENCE_INVESTIGATION.md`](LAGGY_SCROLL_CROSS_TAB_PRESENCE_INVESTIGATION.md). Duplicate status GET mitigation: [`DEVICE_TAB_RESOLVER_SYNC.md`](DEVICE_TAB_RESOLVER_SYNC.md) (shipped).

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-28 | **O2 step 2 shipped:** per-IP rate limits on `GET …/live-control/*` (300/min) and `GET …/health` (120/min) |
| 2026-05-28 | **S11 shipped:** large-wallet `/wallet/` DOM cap (40) + Show all; **presence debounce scales** with wallet size |
| 2026-05-28 | **S10 shipped:** large-wallet hub DOM cap via `selectHubSavedRowEntries` + “N more saved” row |
| 2026-05-28 | **S9 shipped:** hub `renderSavedRows` uses `listWalletDisplayEntries`; signing actions hydrate via `findWalletEntryById` |
| 2026-05-28 | **S8b shipped:** poll/coordinator/presence/SW paths use `listPollableWalletEntries` + `forEachWalletEntry`; snapshot baseline uses truth profile ids only |
| 2026-05-28 | **S8 shipped:** `hc_wallet_summary` + wallet metadata hot paths for count/pollable/signing/profile-summary reads |
| 2026-05-27 | **S6 shipped:** bound `hc_wallet_network_cache` (max 20 fresh rows, LRU prune) |
| 2026-05-27 | **O2 step 1:** per-IP rate limit on `GET …/status` (300/min); Shell P2 lazy notifications shipped |
| 2026-05-26 | **M8 epics:** [`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md) |
| 2026-05-26 | **M7:** Phase 10 entitlement rows + test plan (§ Phase 10 — hosted tier rows) |
| 2026-05-26 | **M6 standards delta:** [`HOSTED_TIER_TECHNICAL_STANDARDS_DELTA.md`](HOSTED_TIER_TECHNICAL_STANDARDS_DELTA.md) |
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
