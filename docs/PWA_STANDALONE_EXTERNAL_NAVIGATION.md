# PWA standalone — external navigation & new-tab gaps

**Status:** **P1–P4 + P1b shipped** (2026-05-29) — standalone scan handoff, return banner, install deferral, setup **Continue** decoupled from scan preview; P3 deferred  
**Audience:** Product, frontend, QA  
**Related:** [`PWA_INSTALL.md`](PWA_INSTALL.md) · [`CARD_WORKSPACE_UX.md`](CARD_WORKSPACE_UX.md) · [`CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md`](CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md) · [`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md) · [`shop-checkout-handoff.mjs`](../site/js/shop-checkout-handoff.mjs) · [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md)

---

## Problem statement

Stewards who install the **device shell** as a home-screen PWA lose the browser **tab bar**. Several steward flows — especially the post-create **setup wizard** on `/created/` and **“open scan”** affordances across the shell — use `window.open(…, "_blank")` or `target="_blank"`.

On iOS and Android standalone WebKit/Chromium:

| Mechanism | Typical standalone behavior |
|-----------|----------------------------|
| `window.open(url, "_blank")` | Opens **system browser** (Safari / Chrome), not a tab inside the PWA |
| `<a target="_blank">` | Same — leaves the installed app |
| `location.assign` / `location.replace` | Stays inside the PWA; **back** returns via history |

**Reported failure mode:** During the create → setup loop, tapping **Test scan** (setup step 3) “opens a new tab” and the steward **cannot easily return** to the wizard screen. The flow feels broken because there is no visible way back to the PWA context.

This is distinct from the **cross-tab keys** product (multiple browser tabs on the same origin). A PWA window and a Safari window are separate **top-level browsing contexts** even when they share `localStorage`.

---

## Root cause inventory

### Primary break: setup wizard test scan (historical → P1b)

**Original break (pre-P1):** [`created-setup.mjs`](../site/js/created-setup.mjs) **Continue** on step 3 opened scan preview *and* tried to advance the wizard — duplicating **Open scan page** and breaking PWA progression (no tab bar; `window.open` exits to system browser).

**P1 (2026-05-29):** Inline **Open scan page** uses `openStewardScanPreview` — same-tab in standalone PWA with `hc_return` + **← Back to setup** banner; new tab in browser.

**P0b-2 (2026-05-29, superseded by P1b):** Browser **Continue** required a second tap after opening scan in a new tab.

**P1b (2026-05-29):** **Continue** on the test step **only advances** to Protect (no scan navigation). Preview is optional via **Open scan page**. Test scan has no gate — stewards may skip preview and stay in one PWA context through the full setup loop.

Inline **Open scan page** (`data-setup-action="test-scan"`) remains the sole scan-preview entry point during setup.

### Secondary break: control dashboard scan actions

[`created-dashboard.mjs`](../site/js/created-dashboard.mjs) — `open-scan` and `test-scan` actions call `window.open` (line 98). Feedback: “Opened scan page in a new tab.”

[`created/index.html`](../site/created/index.html) — `#open-scan` anchor ships with `target="_blank"` (control-mode link; JS intercepts only when `target` is removed).

### Shell “open scan” links (hub, wallet pins)

| Location | Pattern | User-visible copy |
|----------|---------|-------------------|
| [`device-hub-ui.mjs`](../site/js/device-hub-ui.mjs) | `target="_blank"` on hub card actions | “Open scan” / “View scan” |
| [`card-wallet.mjs`](../site/js/card-wallet.mjs) | `target="_blank"` on pin rows | Subtitle: “Scan · new tab” |
| [`created-child-object.mjs`](../site/js/created-child-object.mjs) | Dynamic `target="_blank"` | “Open scan page” |
| [`created-child-object-lost-item.mjs`](../site/js/created-child-object-lost-item.mjs) | Same | Same |

These were intentional so stewards **keep** `/created/` or the hub open while previewing the public scan page in another tab. In standalone, that benefit inverts: the steward loses the shell instead.

### Flows that already avoid the gap

| Flow | Navigation | Notes |
|------|------------|-------|
| Create → `/created/` | `location.replace` in [`create-card.mjs`](../site/js/create-card.mjs) | Same PWA context |
| Merch Tier 1 checkout | `goToShopifyCheckout()` in [`shop-checkout-handoff.mjs`](../site/js/shop-checkout-handoff.mjs) | **Same-tab** handoff; precedent for standalone-aware navigation |
| Hub → `/created/`, `/wallet/` | `navigateTo()` in [`device-shell-motion.mjs`](../site/js/device-shell-motion.mjs) | Same origin, same context |
| Stranger scan `/c/…` | N/A | Strangers stay browser-native; no install prompt ([`PWA_INSTALL.md`](PWA_INSTALL.md) placement rule) |

### Explicit non-issues (for scope)

- **PTR / standalone refresh** on `/create/` and scan — intentionally off ([`PWA_INSTALL.md`](PWA_INSTALL.md) § Pull-to-refresh). Missing PTR is not the reported bug.
- **`/create/` excluded from install UX** — stewards can still navigate there inside an installed PWA; exclusion only hides install card + manifest on that path.
- **External domains** (Shopify checkout, carrier tracking on `/shop/thanks/`) — leaving the origin is required; same-tab handoff + system back is the current merch pattern.

---

## System impact matrix

How standalone new-tab behavior interacts with existing device-layer contracts:

| System | Impact if scan opens in system browser | Impact if scan opens same-tab in PWA |
|--------|----------------------------------------|--------------------------------------|
| **sessionStorage `hc_created`** | Keys stay in PWA; Safari tab has **no** signing keys unless quiet rehydrate runs | Keys remain; back returns to wizard |
| **Cross-tab keys inbox** | PWA + Safari may show `cross_tab_keys` if both contexts heartbeat — confusing during setup | No extra tab; no spurious cross-tab chrome |
| **Quiet tab rehydrate** ([`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md)) | Safari scan tab may rehydrate or show take-control notice | Not triggered |
| **Setup wizard history** | PWA history stack preserved; user must app-switch back; wizard may already be on **done** step | **Continue** never navigates away (P1b); optional preview via **Open scan page** + return banner |
| **Vouch / sign-as** ([`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md)) | Preview in Safari without keys is correct for stranger view; signing needs same context | Owner preview same-tab still stranger UI; signing affordances unchanged |
| **Status dot / hub** | Unchanged in PWA while user is in Safari | Dot hidden while on scan page; returns on back |
| **Merch scan → customize** | `hc_ref` on scan CTAs unaffected | Same |
| **E2E / QA** | [`CARD_WORKSPACE_UX.md`](CARD_WORKSPACE_UX.md) step 3 assumes new tab — update if behavior changes | Add **P1-PWA-N** manual matrix (below) |

**Storage note:** iOS Safari and home-screen PWA share **`localStorage`** (wallet, child-object indexes) but not **`sessionStorage`** per context. Opening scan in Safari does not copy tab keys; the PWA session is intact when the user returns.

---

## Proposals

Ranked by fit to reported pain and alignment with existing patterns.

### P1 — Standalone-aware scan handoff (recommended first ship)

**Idea:** Extract a small contract module (mirror [`shop-checkout-handoff.mjs`](../site/js/shop-checkout-handoff.mjs)):

```text
openStewardScanPreview(url, { navigation, standalone })
  → standalone: location.assign(url)   // stay in PWA; system back returns
  → browser tab: window.open(url, "_blank", "noopener,noreferrer")
```

**Wire at:**

- `created-setup.mjs` — **Open scan page** inline action only (P1b: **Continue** does not open scan)
- `created-dashboard.mjs` (`openScanUrl`)
- Hub / wallet / child-object link builders (remove `target="_blank"` when standalone, or bind click handler)

**Setup wizard contract (P1b):**

| Control | Behavior |
|---------|----------|
| **Continue** (footer) | Advance test → Protect; never opens scan |
| **Open scan page** (inline) | Optional preview via `openStewardScanPreview`; PWA same-tab + return banner; browser new tab |

**Copy:** Standalone preview feedback → “Opened scan preview — use Back to return here.” Browser preview → “Opened scan preview in a new tab.” Panel hint clarifies Continue vs preview ([`CARD_WORKSPACE_UX.md`](CARD_WORKSPACE_UX.md) § Setup wizard step 3).

| Pros | Cons |
|------|------|
| Small diff; reuses merch same-tab precedent | Scan page is full stranger UI — steward must discover back gesture |
| Fixes reported create/setup loop | Hub “keep controls open” pattern inverts in standalone (acceptable trade) |
| Pure helpers + Vitest like `pwa-standalone-refresh-core` | Update QA docs + selective E2E |

**Effort:** ~1–2 days engineering + QA.

---

### P2 — Return URL banner on scan (steward preview mode) — **shipped**

**Idea:** Before same-tab navigate, set `sessionStorage.hc_steward_preview_return` (or query `?hc_return=…` encoded path) to the current `/created/` URL including setup hash. Scan HTML shows a slim **“← Back to setup”** bar when return URL is present and validates as same-origin steward path.

**Composes with P1** — does not replace it.

| Pros | Cons |
|------|------|
| Explicit affordance where system back is unclear | Touches Worker scan HTML + trust surface styling rules |
| Reusable for hub “View scan” | Must not show to strangers; gate on return param + optional signed hint |

**Effort:** +2–3 days after P1.

---

### P3 — Inline scan preview on `/created/` (no navigation)

**Idea:** Embed public scan content in a sheet or iframe on the setup **test** step — e.g. fetch signed `public_snapshot` or render a read-only snapshot component.

| Pros | Cons |
|------|------|
| Never leaves wizard | Duplicates scan UI; drift risk vs real `/c/…` page |
| Best for “phone only” setup | iframe / CSP / Worker HTML may block embedding |

**Effort:** High; defer unless P1+P2 still fail M5-style validation.

---

### P4 — Product guard: defer install until after first setup

**Idea:** Extend [`pwa-install-ux-core.mjs`](../site/js/pwa-install-ux-core.mjs) gating: hide install card until `isSetupDone(profileId)` for at least one wallet row; hub copy: “Finish your first object in Safari, then add to Home Screen.”

| Pros | Cons |
|------|------|
| Zero navigation code | Does not fix hub “Open scan” for installed stewards |
| Honest about current limitations | Punishes early adopters who already installed |

**Effort:** Low; **insufficient alone** — use as complement to P1, not substitute.

---

### P5 — Document-only / support playbook

**Idea:** Add [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) note: complete first create in Safari; use app switcher to return to PWA.

| Pros | Cons |
|------|------|
| Immediate | Does not fix UX; high support burden |

**Effort:** Minutes; **not recommended** as the only response.

---

## Recommended path

1. **Ship P1** — standalone-aware scan handoff + Vitest contract tests. **Shipped 2026-05-29.**
2. **Ship P1b** — decouple setup **Continue** from scan preview; panel hint + feedback copy. **Shipped 2026-05-29.**
3. **Add P1-PWA-N manual QA** (below) and Playwright cases. **Shipped:** `e2e/device-pwa-scan-handoff.spec.ts` in `npm run e2e:pwa-install`.
4. **Evaluate P2** — return banner on scan. **Shipped 2026-05-29.**
5. **Optional P4** — defer install until first setup complete. **Shipped 2026-05-29.**
6. **Do not** pursue P3 unless stranger-path parity requires identical pixels in wizard.

**Close-out (2026-05-29):** Engineering path complete through P1b. Remaining validation is manual **P1-PWA-N** on real installed PWAs (HTTPS).

---

## Manual QA matrix (proposed P1-PWA-N)

**Prerequisites:** Device with installed PWA + ability to create a test card.

| Step | Action | Expected (after P1 + P1b) |
|------|--------|---------------------------|
| 1 | Installed PWA → `/create/` → complete create | Lands on `/created/?fresh=1` setup wizard **inside PWA** |
| 2 | Advance to **Test scan** → tap **Continue** | Advances to Protect **without** opening scan |
| 3 | Return to test step (Back) → tap **Open scan page** | Scan opens **in PWA** (no Safari chrome switch) |
| 4 | System back / swipe back **or tap return banner** | Returns to setup wizard; **← Back to setup** when `hc_return` present |
| 5 | Complete setup → hub **Open scan** on saved card | Same-tab in standalone; new tab in Safari browser |
| 6 | Browser tab (not installed) → **Open scan page** on test step | Opens **new tab** (regression guard) |
| 7 | Wallet pin row “Scan · …” | Same as step 5; subtitle omits “new tab” in standalone |

**Fail signals:** Safari opens when tapping **Continue**; wizard stuck on test step after Continue in PWA; cross-tab keys notice during fresh setup.

---

## File checklist (implementation reference)

| File | Change when implementing P1 |
|------|----------------------------|
| `site/js/pwa-scan-handoff-core.mjs` (new) | `openStewardScanPreview`, `scanLinkTargetAttrs(standalone)` |
| `site/js/created-setup.mjs` | P1b: **Continue** advances only; **Open scan page** uses handoff |
| `site/js/created-dashboard.mjs` | Use handoff |
| `site/js/device-hub-ui.mjs` | Standalone: no `target="_blank"` on scan links |
| `site/js/card-wallet.mjs` | Standalone: same-tab + copy “Scan” not “new tab” |
| `site/js/created-child-object*.mjs` | Dynamic links via handoff |
| `site/created/index.html` | `#open-scan` — bind via JS or conditional target |
| `worker/tests/pwa-scan-handoff-core.test.ts` (new) | Contract tests |
| `docs/CARD_WORKSPACE_UX.md` | QA step 3 |
| `docs/DEVICE_OS_QA.md` | P1-PWA-N section |
| `docs/PWA_INSTALL.md` | Cross-link § Cross-tab + browsing context |

---

## Open questions (product)

1. ~~**Auto-advance on test scan**~~ — **Resolved (P1b):** **Continue** never opens scan; only advances. Preview is optional via **Open scan page**.
2. **Hub open scan** — same-tab for all standalone pages *(P1 ships same-tab for all steward scan links)*.
3. **Child object scan links** — same policy as root scan preview *(P1)*.
4. **Return banner (P2)** — steward-only chrome on scan *(shipped)*.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-29 | Initial investigation — inventory, impact matrix, proposals P1–P5 |
| 2026-05-29 | **P1 shipped** — `pwa-scan-handoff-core.mjs` wired at setup, dashboard, hub, wallet pins, child-object scan links |
| 2026-05-29 | **P2 shipped** — `hc_return` param, sessionStorage fallback, scan return banner + `scan-steward-preview-return.mjs` |
| 2026-05-29 | **P1-PWA-N E2E** — `e2e/device-pwa-scan-handoff.spec.ts` (standalone same-tab + browser popup regression) |
| 2026-05-29 | **P4 shipped** — install card gated on `hc_setup_done` for wallet rows; deferral card until first setup complete |
| 2026-05-29 | **P1-PWA-N E2E extended** — hub Open scan + wallet pin + browser popup regressions in `e2e/device-pwa-scan-handoff.spec.ts` |
| 2026-05-29 | **P1b shipped** — setup **Continue** decoupled from scan preview; panel hint + feedback; `shouldAutoAdvanceSetupTestScan` removed |
