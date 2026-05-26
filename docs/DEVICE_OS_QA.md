# Device OS — manual QA runbook

**Status:** Active (Phase 0 hardening)  
**Canonical product model:** [`DEVICE_OS.md`](DEVICE_OS.md)  
**Storage & hub detail:** [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md)  
**Refresh pipeline:** `site/js/device-os-coordinator.mjs` (debounced resolver + wallet sync)

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
| 3 | Tab A: reload `/` (do not close tab B) | Notice: keys in this tab / save (or cross-tab banner if B still open) |
| 4 | Tab A: follow notice → save or open controls | After save, notice clears; card appears under saved |

**Fail signals:** Silent empty hub; no notice; save does nothing.

### P0-2 · Open controls → `/created/` has session keys

| Step | Action | Expected |
|------|--------|----------|
| 1 | Save a card on `/wallet/` | Row visible |
| 2 | Tap **Open controls** | Navigates to `/created/?profile_id=…` |
| 3 | DevTools → Application → sessionStorage `hc_created` | Contains `owner_private_key_b58` |

**Fail signals:** `/created/` without signing keys; revoke panel stuck on “Checking…” (see [`REVOKE_UI_INVESTIGATION.md`](REVOKE_UI_INVESTIGATION.md)).

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
| 2 | Tap status dot | Glance first if content exists; else sheet opens |
| 3 | Escape | Closes glance or sheet |

**Note:** `/wallet/` uses scroll-to-saved, not a separate glance popover (see [`DEVICE_OS.md`](DEVICE_OS.md)).

---

## P1 — Card disabled since last visit

Requires a saved card and ability to disable it on the network (owner revoke **card**, not QR-only).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Save card; visit `/wallet/`; leave | Baseline recorded |
| 2 | Disable card on network (another session) | — |
| 3 | Return to `/wallet/` | Banner **Card disabled on the network since your last visit** + chip **Card disabled** |
| 4 | Tap **Got it** | Banner hides; baseline acknowledged |
| 5 | Re-enable or refresh if test card restored | Alert does not stick incorrectly |

**Fail signals:** Alert with chip still “Live State Active”; alert on QR-only revoke.

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

## P4 — Device inbox unification (planned — not yet QA)

When [`DEVICE_INBOX.md`](DEVICE_INBOX.md) phase 5–6 ship, add:

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
npm run worker:test -- worker/tests/device-os-frontend.test.ts worker/tests/device-cross-tab.test.ts worker/tests/device-os-coordinator.test.ts
```

Playwright (requires pages dev):

```bash
npm run e2e -- e2e/device-os-wallet.spec.ts
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
