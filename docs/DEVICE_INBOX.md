# Device inbox & background alerts

**Status:** v1 shipped (aggregate badge + hub alerts + browser alerts for live proof) · **Planned:** unified inbox core, inbox sheet, contextual opt-in, deep-link OS notifications  
**Audience:** Product, frontend  
**Related:** [`DEVICE_OS.md`](DEVICE_OS.md) · [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md) · [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md)

---

## North star

Three layers, one story:

| Layer | User question | Chrome surface |
|-------|---------------|----------------|
| **Status dot** | Is this device + network OK? Is something *urgently* visible at a glance? | `#brand-status-dot` + optional overlay notch |
| **Device inbox** | What should I do, in what order? | `#shell-notif-badge`, hub `#device-hub-alerts-top`, glance rows |
| **Background alerts** | Tell me when I’m not looking at the tab | Browser `Notification` API (opt-in, device-only) |

**Product sentence:** *Status dot = truth about device and network. Inbox badge = ordered actions on this device. Background alerts = high-urgency inbox items when the tab isn’t visible.*

Do **not** collapse dot and badge into one control—they answer different questions.

---

## Mental model (own the category)

Treat actionable device state as a single **Device inbox** with three presentation tiers—not three unrelated features.

```mermaid
flowchart TB
  subgraph sources [Inbox sources - device only]
    LP[live_proof]
    TK[tab_keys_unsaved]
    CT[cross_tab_keys]
    RV[card_disabled_since_visit]
    NET[resolver_degraded - informational only]
  end

  subgraph chrome [Chrome surfaces]
    DOT[Status dot - state + top urgency overlay]
    BADGE[Inbox badge - count + tap]
    GLANCE[Glance popover - peek list]
    HUB[Hub alerts stack - full detail]
  end

  subgraph push [Optional OS channel]
    OS[Browser Notification API]
  end

  sources --> HUB
  HUB --> BADGE
  HUB --> GLANCE
  LP --> DOT
  CT --> DOT
  LP --> OS
```

**User-facing language (use consistently in copy and ARIA):**

| Concept | Say | Avoid |
|---------|-----|-------|
| Dot | “Device status” / “Status” | “Notifications” on the dot button |
| Badge | “Needs attention” / “Inbox” | Generic “Notifications” without context |
| OS channel | “Background alerts” | “Notifications” without “when you’re away” |

---

## Inbox item taxonomy

Canonical `kind` values (target: one module `device-inbox-core.mjs`, Vitest-covered like `device-dot-state-core.mjs`).

| `kind` | Urgency | Badge count? | Dot overlay? | Browser alert? | Primary CTA |
|--------|---------|--------------|--------------|----------------|-------------|
| `live_proof` | **High** (time-sensitive) | Yes (pending count) | `proof_waiting` (highest overlay) | Yes (opt-in) | Open `/created/` to sign (`live_challenge`) |
| `tab_keys_unsaved` | Medium | Yes (0 or 1) | Via device axis (`unsaved` pulsing red), not overlay | No | Save keys on device |
| `cross_tab_keys` | Medium | Yes when tab notice = 0 | `cross_tab_keys` | No | Focus other tab / save here |
| `card_disabled_since_visit` | Medium | **Planned** (today: hub row + glance only) | No (optional soft overlay later) | No | Open card / Got it |
| `resolver_degraded` | Low | **No** | Via network color on dot | No | System banner only |

**Counting rules (codify in inbox core):**

1. **Badge count = actionable inbox items only** — exclude informational resolver state (`resolver_degraded`).
2. **Dot overlay = highest-priority inbox kind** — `proof_waiting` beats `cross_tab_keys` (see `dotOverlayFromCounts()` in `device-dot-state-core.mjs`).
3. **No double-counting** — e.g. cross-tab banner/glance only when `tabNoticeCount === 0` (`device-cross-tab-visibility.mjs`).
4. **Live proof** — N pending challenges may show as one inbox group with quantity N; badge may show total count or “1” per product choice; document in tests when unified.

---

## Chrome surfaces (shipped vs planned)

### Status dot (`device-status.mjs`, `device-dot-state-core.mjs`)

**Shipped:**

- Network + device color + overlay notch (`proof_waiting`, `cross_tab_keys`).
- Tap opens hub sheet (landing/created) or scrolls wallet on `/wallet/`.
- **Now / Why / Next** explainer in hub status key + glance popover.
- Quick action `open_notifications` when overlay is `proof_waiting`.

**Planned:**

- Overlay/badge **chroma sync** (e.g. amber ring on badge when proof overlay active).
- Do **not** add a numeric count on the dot.

See [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md).

### Inbox badge (`#shell-notif-badge`)

**Shipped:**

- Visible when `notificationCount() > 0` (`device-inbox.mjs` → `inboxCountFromItems(getInboxItems())`).
- `aria-label` from `inboxBadgeAriaLabel()` (shipped phase 2).
- Tap: on wallet → scroll `#wallet-alerts-top`; elsewhere → expand hub + scroll `#device-hub-alerts-top`.
- Styled in `site/css/device-shell.css` (red ring + count).

**Planned:**

- Rich `aria-label`: e.g. “3 items need attention: 2 live proofs, keys in another tab”.
- **Dedicated inbox sheet** on badge tap (lighter than full hub)—same actions as alert stack.
- Ring color matches `topInboxKind()` (amber proof, blue cross-tab).

### Hub alerts stack (`#device-hub-alerts-top`)

**Shipped:**

- Groups: cross-tab notice, tab keys notice, **Live proof waiting** (`device-live-control-inbox.mjs`).
- Card-disabled-since-visit on saved rows + glance (not yet in badge aggregate).

**Planned:**

- Render from shared `buildInboxItems()` — same data as glance and badge.

### Glance popover (`device-hub-glance.mjs`)

**Shipped (landing):**

- Rows for live proof, cross-tab keys, unsaved tab keys, saved cards (+ revoked hint), “N more”.
- Live proof tap → `expandHub('device-hub-live-control-group')`.

**Planned:**

- Rows generated from `buildInboxItems()` only (no parallel logic).

### Landing settings — Browser alerts

**Shipped:**

- Toggle on homepage **Shortcuts & settings** (`data-device-browser-notif-toggle` in `site/index.html`).
- Module: `site/js/device-browser-notifications.mjs`.
- Storage: `localStorage.hc_browser_notif` (`on` / off).
- Behavior: when enabled + `Notification.permission === 'granted'` + tab **hidden**, fire OS notification for new live-proof signature; **no** notification while tab visible.
- Tag: `hc-live-proof` (replaces prior notification).
- Click: focus window → `/wallet/`.

**Planned:** see [Background alerts roadmap](#background-alerts-roadmap) below.

---

## Background alerts roadmap

### v1 (shipped)

| Behavior | Detail |
|----------|--------|
| Scope | Live proof waiting only |
| Trigger | `hc-live-control-inbox-changed`, `visibilitychange` → hidden |
| Dedup | Signature of pending `challenge_id` list |
| Permission | Requested on toggle enable in settings |
| Limitation | Requires a background tab; **no Service Worker** — fully closed browser may not alert |

### v2 Phase A — Contextual opt-in (highest ROI)

- On **first** live proof while tab visible: inline strip in hub alerts (not modal):  
  *“Someone is waiting for live proof. Get an alert when this tab is in the background?”*  
  `[Turn on background alerts]` · `[Not now]`
- Permission tied to understood benefit; if denied, link to browser settings + rely on inbox badge.
- Duplicate control in inbox sheet footer (same toggle semantics).

### v2 Phase B — Smarter payload

- Title: card label; body: “Live proof waiting · tap to sign”.
- `notificationclick` → deep link to `/created/?profile_id&qr_id&live_challenge&return_url` for **first** pending item (not generic `/wallet/`).
- Optional `requireInteraction: true` only for first proof in a session.

### v2 Phase C — Policy matrix

| Event | OS alert | Rationale |
|-------|----------|-----------|
| Live proof pending | Yes (opt-in) | Stranger waiting; time-sensitive |
| Tab keys unsaved | No | User usually in create flow |
| Cross-tab keys | No | Multi-tab confusion |
| Card disabled since visit | Maybe later | Batch/digest, not instant |
| Resolver offline/degraded | No | `#device-system-banner` |

### v2 Phase D — Service Worker (optional, defer)

- Minimal SW + inbox poll when all tabs closed — only if contextual opt-in proves demand.
- **No server push** — stays device-only per threat model.

---

## Intuitive user flows

### Live proof while user is away

1. Amber **proof_waiting** notch on dot.
2. Inbox badge shows count (e.g. `1`).
3. Tab hidden + background alerts on → OS notification with card label.
4. User returns to tab → no OS spam; hub row + badge sufficient.
5. Tap badge (planned: inbox sheet) or hub row → sign on `/created/`.

### Keys in tab, not saved

1. Pulsing red dot (device `unsaved`).
2. Badge `1` → scroll/tab notice “Save keys”.
3. No OS alert.

### Keys in another tab

1. Blue `cross_tab_keys` overlay + badge (when this tab has no unsaved notice).
2. Glance/hub row → `actOnOtherTabKeys()` (`device-notice-nav.mjs`).

---

## Implementation roadmap

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 0 | This document + cross-links in DEVICE_OS / STATUS_INDICATOR | ✅ |
| 1 | `device-inbox-core.mjs` — `buildInboxItems()`, `inboxCountFromItems()`, `topInboxKind()` | ✅ |
| 2 | Refactor `notificationCount()`, glance, dot overlay, badge ARIA to use core | ✅ (hub alert DOM still in `device-hub-ui.mjs`; same scroll targets) |
| 3 | Inbox sheet from `#shell-notif-badge`; shared `openInboxFromChrome()` | Planned |
| 4 | Contextual browser-alert prompt + OS click deep link | Planned |
| 5 | Badge/dot chroma sync to `topInboxKind()` | Planned |
| 6 | E2E: proof → badge → row; Playwright `Notification` permission | Planned |

**Do not:**

- Put a numeric bell on the status dot.
- Request OS permission on first visit.
- OS-alert resolver health (use system banner).
- Add server push before inbox UX is unified.

---

## Diagnostics (planned)

Enable: `localStorage.setItem("hc_inbox_diagnostics", "1")` (mirror dot diagnostics pattern).

| Event | Use |
|-------|-----|
| `inbox_open` | Source: badge, dot explainer, glance |
| `inbox_item_action` | `kind` + outcome |
| `browser_alert_opt_in` / `denied` / `dismissed_prompt` | Funnel |
| `os_notification_click` vs `badge_click` | Within 5 min of proof arrival |

Confusion signal: repeated `inbox_open` without `inbox_item_action` → copy or ordering issue.

---

## Files (current)

| Path | Role |
|------|------|
| `site/js/device-status.mjs` | Dot, badge count, `openNotificationsFromChrome()` |
| `site/js/device-dot-state-core.mjs` | Dot overlay priority, explainers, `open_notifications` action |
| `site/js/device-browser-notifications.mjs` | OS notifications v1, toggle sync |
| `site/js/device-counts.mjs` / `device-counts-core.mjs` | `tabNoticeCount`, status segments |
| `site/js/device-live-control-inbox.mjs` | Live proof poll + hub list |
| `site/js/device-hub-glance.mjs` | Collapsed peek rows |
| `site/js/device-hub-ui.mjs` | Hub notice groups |
| `site/js/device-tab-presence.mjs` | Cross-tab presence + `crossTabNoticeCount()` |
| `site/js/device-cross-tab-banner.mjs` | Landing/wallet banner |
| `site/css/device-shell.css` | `.shell-notif-badge*` styles |
| `docs/DEVICE_INBOX.md` | This spec |

| `site/js/device-inbox-core.mjs` | Pure inbox model |
| `site/js/device-inbox.mjs` | Browser facade (`getInboxItems`, `notificationCount`) |
| `worker/tests/device-inbox.test.ts` | Vitest for inbox core |

---

## Acceptance criteria (inbox unification — when implemented)

- One `buildInboxItems()` drives hub alerts, glance actionable rows, and badge count/label.
- Badge tap opens inbox sheet with one primary CTA per row (not only hub expand + scroll).
- Dot overlay always matches `topInboxKind()` when overlays apply.
- Background alerts: contextual opt-in + deep link to sign flow for first pending proof.
- Resolver degraded/offline never increments badge count.
- No new resolver APIs required for phases 1–5.
