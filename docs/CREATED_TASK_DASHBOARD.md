# `/created/` control mode UX (Live tab)

**Status:** Superseded by shipped redesign - see [`CREATED_TASKS_TAB_REDESIGN.md`](CREATED_TASKS_TAB_REDESIGN.md) (T1-T5 complete)  
**See:** [`CARD_WORKSPACE_UX.md`](CARD_WORKSPACE_UX.md)  
**Page:** `site/created/index.html` · `site/js/created-dashboard.mjs` · `site/js/created.mjs`  
**E2E:** `e2e/created-control.spec.ts` · `npm run e2e:created-control` · `e2e/device-os-wallet.spec.ts`

---

## Product frame

After create, `/created/` is the **operator cockpit** for one live object (QR), not a settings dump. Setup wizard runs once; **control mode** assumes competence and surfaces network truth, one primary action, and progressive deploy/custody disclosures.

---

## Page hierarchy (Live tab)

Top to bottom:

1. **Status strip** - live on network chip + resolver meta
2. **Setup memory** - read-only Save · Print · Test scan · Live chips
3. **Live object card** - 160px QR, manifesto teaser, contextual primary CTA, copy scan link
4. **What scanners see** - template fields + publish (Phase A: gated until first revoke in session)
5. **Deploy disclosures** - print & share, test from another device, download QR
6. **Keys on this device** - custody disclosure with save form
7. **Manage hint** + footer links (My cards, loop)
8. **Network status & IDs** - collapsed glossary block
9. **Full-size QR** - collapsed disclosure with download and scan actions

**Manage** tab: rotate, extend, revoke, backup, recovery reveal, steward tools. No duplicate public-line editor (publish on Live).

---

## Copy rules

| Area | Use | Avoid |
|------|-----|--------|
| Page hero (control) | `Your object is live` | `Live QR ready` (process, not outcome) |
| Hero meta | `Card active · QR expires …` | Splitting status across duplicate titles |
| Primary CTA | One of: prove live, save keys, check network, test scan, open scan | Multiple equal primaries |
| Deploy rows | Verb-first disclosures | Flat "More tasks" list |
| Revoke | **Manage** tab only | Revoke on Live |

---

## Primary CTA priority

See `site/js/created-live-primary-cta-core.mjs`: live proof pending, keys not saved on device, resolver offline, test scan nudge, then open scan.

---

## Live proof panel — scroll-into-view

**Status:** Shipped (May 2026)  
**Module:** `site/js/created-live-proof-poll-core.mjs` (pure rules) · `site/js/created.mjs` (`initLiveControlProof`)

When a pending live-proof challenge becomes active on `/created/`, the steward may be scrolled down the Live tab (deploy disclosures, keys strip, etc.). The urgent `#live-control-proof` card must read as an **in-page alert**, not only update copy off-screen.

### When scroll runs

| Trigger | Scroll? | Rationale |
|---------|---------|-----------|
| Poll discovers a **new** pending challenge (`poll_discovered`) | Yes, if panel not mostly visible | Steward stayed on page but moved away from hero |
| Arrival via `live_challenge` deep link (`deeplink`) | Yes, if panel not mostly visible | Inbox / hub row opened controls; panel may be below fold after layout |
| Page reload with challenge already in URL | Same as deeplink | One-shot after `revealPanel` |
| Challenge already active; repeat poll ticks | No | Avoid scroll jank |
| After successful proof (`resetAfterProof`) | No | Returns to listening copy only |
| Panel already mostly visible | No | Top ≥ 0, top ≤ 55% viewport height, ≥ 72px of panel visible |

### Scroll behavior

- `panel.scrollIntoView({ behavior: 'smooth', block: 'start' })`
- Runs on the next animation frame after the panel is unhidden so layout is settled
- Does **not** replace inbox badge, dot overlay, or OS background alerts — `/created/` echo only

### Copy states (requested vs listening)

When `.live-control-proof-requested` is active, hide `#live-control-proof-lead` and show only `#live-control-proof-status` (*Someone nearby is asking…*). Listening state shows lead + idle status (*Keep this tab open…*).

### Automated QA (E2E)

**Spec:** `e2e/created-control.spec.ts` · **Command:** `npm run e2e:created-control`

| Manual QA # | E2E case | Assertion |
|-------------|----------|-----------|
| 2 | `live_challenge` deep link | Panel visible, `.live-control-proof-requested`, lead hidden, status line only, primary **Prove control now** |
| 3 | Poll discovers pending challenge while scrolled down | Panel unhidden with requested state; `scrollIntoView` called once when off-screen |
| 4 | Deeplink off-screen scroll gating | Vitest `shouldScrollLiveProofPanelIntoView` (`deeplink` reason) — bootstrap timing makes this unreliable in Playwright |

Vitest covers pure visibility/scroll gating in `worker/tests/created-live-proof-poll-core.test.ts`. E2E asserts DOM state + `scrollIntoView` on poll discovery (smooth scroll completion is browser-dependent).

---

## Files

| Path | Role |
|------|------|
| `site/created/index.html` | Live · Manage tabs, cockpit, deploy, custody |
| `site/js/created-dashboard.mjs` | Deploy/custody actions, done persistence |
| `site/js/created-live-primary-cta*.mjs` | Contextual primary button |
| `site/js/created-live-setup-memory*.mjs` | Setup memory chips |
| `site/js/created-manifesto-update.mjs` | What scanners see publish |
| `site/js/created-live-proof-poll-core.mjs` | Poll scope + scroll-into-view visibility rules |
| `site/js/created.mjs` | Hero meta, QR, live proof, network poll |

---

## Manual QA

1. Finish setup wizard - control mode shows **Your object is live**, no step-1 Save theater when wallet saved.
2. Live proof pending - primary is **Prove control now**; banner still visible; only one body line (no duplicate lead + status).
3. Scroll Live tab below fold; trigger live proof from scan page - panel smooth-scrolls into view once (`npm run e2e:created-control`).
4. Open `/created/?…&live_challenge=…` - requested state visible; off-screen scroll gating covered by Vitest.
5. Deploy disclosures use Manage-style icon + chevron pattern.
6. iPhone Safari: live object card fits viewport; tap targets >= 44px.
7. Dark mode: shell fill on card and disclosures.
8. Hub **Open controls** and `#revoke` / `#update-status` deep links land correct tab/panel.
