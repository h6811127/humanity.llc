# Device OS request budget & resolver polling

**Opened:** 2026-05-26  
**Status:** **Active** — product/ops constraint; client polling must change before production scale  
**Audience:** Product, frontend, operators  
**Related:** [`DEVICE_OS.md`](DEVICE_OS.md) · [`DEVICE_INBOX.md`](DEVICE_INBOX.md) · [`UI_UX_REVERT_PLAN.md`](UI_UX_REVERT_PLAN.md) · [`CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md`](CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md)

---

## Why this doc exists

Humanity Commons is meant to be a **simple** reference site: static Pages + a small Worker resolver. In practice, the **device shell** can generate more Worker traffic than organic scans and creates combined — enough to exhaust the **Workers Free daily cap (100,000 requests/day)** in minutes when a steward leaves `/wallet/` open with many saved cards.

That is not “the site went viral.” It is **N cards × poll interval × open tabs**, mostly from **live-proof inbox** and **wallet status** fetches documented below.

**Cloudflare Error 1027** (`workers_daily_limit`) is an account quota event. Client mitigations (backoff, suppress since-visit UI when degraded) do not replace fixing the **poll budget**.

---

## Request budget math

Account limit (Free): **100,000 Worker requests / day** (resets **00:00 UTC**). All routes on the account count, including `humanity.llc/.well-known/hc/v1/*`, `humanity.llc/c/*`, and `*.workers.dev`.

| Pattern | Formula | Example (10 saved cards, 1 visible tab) |
|---------|---------|----------------------------------------|
| Live-control inbox (shipped) | `cards_with_qr × (86400 / POLL_MS)` per tab per day | 10 × (86400/5) = **172,800/day** |
| Wallet status (hub refresh) | `cards × refreshes_per_day` | 10 × ~50 hub opens ≈ 500 (small vs live proof) |
| Health check | `~1 / interval while shell loaded` | ~1/min visible tab ≈ 1,440/day |
| Stranger scan / create | User-driven | Variable; usually modest |

**Conclusion:** A single steward tab with **10+ saved cards** and **5s live-control polling** can exceed the **entire free daily quota in under 15 minutes**. Six tabs or aggressive refresh multiplies that further.

Paid Workers (**Standard**) includes **10 million requests/month** (~333k/day average) — viable for a reference operator **if** polling is scoped. Uncapped 5s × N-card polling still burns paid quota and D1 reads at scale.

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

Removing “OS polling” should mean removing **blind, per-card, high-frequency polling** — not removing network awareness entirely.

---

## Brainstorm: directions (not mutually exclusive)

### A. Scope *when* we poll (highest leverage)

| Idea | Pros | Cons |
|------|------|------|
| **Poll live proof only when hub expanded or inbox sheet open** | Huge savings on `/wallet/` with collapsed hub | Slightly slower “proof waiting” discovery on landing |
| **Poll only on `/created/` for the open card** | Matches signing surface | Inbox on hub won’t update until user opens hub |
| **Stop polling when health is degraded/offline** | Already partially shipped; extend to **skip starting** timer | Doesn’t help after recovery until user acts |
| **User “Check for live proof” control** | Zero background cost | Less “magical” UX |

### B. Scope *how* we poll

| Idea | Pros | Cons |
|------|------|------|
| **One timer, round-robin one card per tick** | Caps at **1 req/tick** instead of N | Full wallet scan takes `N × interval` |
| **Increase interval** (30s idle, 5s only when pending known) | Simple | Slower stranger wait discovery |
| **Serial status fetch with concurrency=2** | Limits spikes | Still costly if interval is 5s |
| **Cache + `If-None-Match` / short TTL on Worker** | Cuts duplicate work | Requires API/cache design |

### C. Scope *who* polls

| Idea | Pros | Cons |
|------|------|------|
| **Single “leader” tab** (BroadcastChannel) | One tab polls for all | More complexity |
| **SW only when notifications opted in** | Aligns cost with value | Throttled by browser anyway |
| **Disable SW periodic sync by default** | Saves hidden-tab storms | Fewer background alerts |

### D. Infrastructure (ops, not a substitute for A–C)

| Idea | Notes |
|------|--------|
| **Workers Paid** on production account | Required for reliable reference hosting; does not fix wasteful client |
| **Dashboard analytics** | Watch daily requests; set budget alerts |
| **Fail closed on 1027** | Correct for security; site is down until quota resets — another reason to fix client |

### E. Longer term (if “instant” inbox is mandatory)

- Server push (WebSocket, SSE, or queue + notify) for live-proof events  
- Stranger poll on scan page only; steward notified via OS after opt-in  
- Third-party relay (overkill for reference operator)

---

## Recommended way forward (phased)

Do **not** rip out the device OS. **Retire the default “poll every card every 5s on every shell page.”**

| Phase | Change | Request impact | UX tradeoff |
|-------|--------|----------------|-------------|
| **0 — Ops** | Enable **Workers Paid** on production; document daily monitor | Restores service after 1027 | Billing ~$5+/mo |
| **1 — Stop the bleed** (P0) | Start live-control polling **only** when hub is **expanded** or inbox sheet is open; **stop** on collapse/close. Increase idle interval to **30s** when no pending proof. | ~**95%** cut on **landing** (collapsed hub); **~6×** cut on **`/wallet/`** (30s idle vs 5s) | Proof badge may lag until hub/inbox opened on landing; wallet still polls while visible |
| **2 — Cap fan-out** (P0) | **Shipped:** round-robin **one** `live-control` GET per tick; wallet status on hub open + manual refresh + **≥60s** visibility debounce | Bounded **~1,440–2,880/day/tab** at 30–60s | Full wallet scan for live proof takes `N × interval`; network chips refresh on expand not every visibility |
| **3 — Degraded = silent** (P1) | **Shipped:** no live-control poll timer/fetch unless resolver health is `ok` (`getResolverHealthStatus`); resumes on `hc-resolver-health-changed`; **60s** backoff after challenge **429** | Stops inbox poll storms during 1027/degraded | Live proof inbox may lag until health recovers |
| **4 — SW policy** (P1) | **Shipped:** SW polls only when browser alerts on + permission granted + resolver `ok`; **15 min** `periodicSync`; round-robin **one** challenge GET per wake; 60s backoff on 429 | Cuts hidden-tab burn | Slower background alerts; full wallet scan takes N wakes |
| **5 — Product polish** (P2) | **Shipped:** hub **Check network** + last-checked line; **Watch for live proof** toggle (default on); **Check for live proof** when watch off | User-visible cost | More honest UX; turn off watch to stop auto polls |
| **6 — Evaluate push** (future) | Only if phases 1–4 cannot meet “stranger waiting” SLA | Best at scale | Engineering cost |

**Tests (shipped):** Vitest in `device-live-control-poll-scheduler.test.ts`, `device-live-control-round-robin.test.ts`, `device-hub-network-tools-core.test.ts`; Playwright in `e2e/device-inbox.spec.ts` (collapsed hub idle 10s, one challenge per tick, degraded health, watch off + manual check).

---

## What we should *not* do

- **Assume 100k/day is “heavy traffic” for humans** — it is heavy for **unscoped automated polling**, not for a simple brochure site.
- **Rely on cache clear or since-visit fixes** to solve 1027 — those are UI correctness; quota is polling volume.
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

## Changelog

| Date | Note |
|------|------|
| 2026-05-26 | Initial doc after production 1027 + false-positive investigation |
| 2026-05-26 | **Phase 1 shipped:** `device-live-control-poll-scheduler.mjs`, scoped polling in `device-live-control-inbox.mjs` |
| 2026-05-26 | **Phase 2 shipped:** round-robin live-control poll slots; hub-expand network refresh; 60s visibility debounce for wallet status |
| 2026-05-26 | **Phase 3 shipped:** live-control poll loop gated on resolver health `ok` only; listen for `hc-resolver-health-changed` |
| 2026-05-26 | **Phase 4 shipped:** SW round-robin poll, 15 min periodic sync, alerts-only + resolver health gate |
| 2026-05-26 | **Phase 5 shipped:** hub network tools — Check network, last-checked status, Watch for live proof toggle |
| 2026-05-26 | **Test coverage:** Vitest `liveControlAutoPollShouldRun`; E2E watch-off idle + manual **Check for live proof** |
