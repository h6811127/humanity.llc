# PWA standalone — external navigation & new-tab gaps

**Status:** P1 shipped (2026-05-29) — standalone scan handoff · P2 return banner open  
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

### Primary break: setup wizard test scan

[`created-setup.mjs`](../site/js/created-setup.mjs) advances the wizard **and** opens scan in a new window:

```212:221:site/js/created-setup.mjs
    if (step === "test") {
      const url = getScanUrl?.();
      // ...
      window.open(url, "_blank", "noopener,noreferrer");
      showFeedback("Opened scan page - check it from another device, then continue.");
      goToStep(stepIndex + 1, { pushHistory: true });
      return;
    }
```

The inline **Test scan** button repeats the same pattern (line 287). Copy in [`CARD_WORKSPACE_UX.md`](CARD_WORKSPACE_UX.md) § Manual QA explicitly expects “test scan opens new tab.”

**Compounding factors:**

1. Wizard **auto-advances** to the “done” step immediately after `window.open` — the steward does not remain on the test step.
2. Feedback says “check it from another device” — optimized for desktop multi-tab, not standalone phone.
3. `/create/` itself uses same-tab `location.replace` to `/created/` (fine); the break is **preview scan**, not card creation.

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
| **Setup wizard history** | PWA history stack preserved; user must app-switch back; wizard may already be on **done** step | `history.back()` returns to setup; consider **not** auto-advancing on test scan in standalone |
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

- `created-setup.mjs` (continue + inline test scan)
- `created-dashboard.mjs` (`openScanUrl`)
- Hub / wallet / child-object link builders (remove `target="_blank"` when standalone, or bind click handler)

**Setup wizard tweak (standalone only):** Do **not** auto-advance past the test step until the user taps **Continue** — so app-switching back does not skip the step. Browser tabs can keep today’s auto-advance if desired.

**Copy:** Standalone feedback → “Opened scan preview — use Back to return here.” Browser → keep “new tab” wording.

| Pros | Cons |
|------|------|
| Small diff; reuses merch same-tab precedent | Scan page is full stranger UI — steward must discover back gesture |
| Fixes reported create/setup loop | Hub “keep controls open” pattern inverts in standalone (acceptable trade) |
| Pure helpers + Vitest like `pwa-standalone-refresh-core` | Update QA docs + selective E2E |

**Effort:** ~1–2 days engineering + QA.

---

### P2 — Return URL banner on scan (steward preview mode)

**Idea:** Before same-tab navigate, set `sessionStorage.hc_steward_preview_return` (or query `?hc_return=…` encoded path) to the current `/created/` URL including setup hash. Scan HTML (Worker template or client boot) shows a slim **“← Back to setup”** bar when return URL is present and user is not a stranger-only session.

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

1. **Ship P1** — standalone-aware scan handoff + setup step behavior tweak + Vitest contract tests (`pwa-scan-handoff-core.mjs` or extend `shop-checkout-handoff` pattern).
2. **Add P1-PWA-N manual QA** (below) and one Playwright case with `display-mode: standalone` emulation opening test scan from `/created/?fresh=1`.
3. **Evaluate P2** after dogfood — if stewards still miss Back, add return banner on scan.
4. **Optional P4** — soften install prompt until first setup complete (product call).
5. **Do not** pursue P3 unless stranger-path parity requires identical pixels in wizard.

Update [`CARD_WORKSPACE_UX.md`](CARD_WORKSPACE_UX.md) § Manual QA step 3 when P1 ships: “standalone → same-tab preview; browser tab → new tab.”

---

## Manual QA matrix (proposed P1-PWA-N)

**Prerequisites:** Device with installed PWA + ability to create a test card.

| Step | Action | Expected (after P1) |
|------|--------|---------------------|
| 1 | Installed PWA → `/create/` → complete create | Lands on `/created/?fresh=1` setup wizard **inside PWA** |
| 2 | Advance to **Test scan** → tap test / continue | Scan opens **in PWA** (no Safari chrome switch) |
| 3 | System back / swipe back | Returns to setup wizard on test or next step per policy |
| 4 | Complete setup → hub **Open scan** on saved card | Same-tab in standalone; new tab in Safari browser |
| 5 | Browser tab (not installed) → repeat step 2 | Still opens **new tab** (regression guard) |
| 6 | Wallet pin row “Scan · …” | Same as step 4 |

**Fail signals:** Safari opens automatically; wizard advances to done before user previews scan; cross-tab keys notice during fresh setup; keys missing after back.

---

## File checklist (implementation reference)

| File | Change when implementing P1 |
|------|----------------------------|
| `site/js/pwa-scan-handoff-core.mjs` (new) | `openStewardScanPreview`, `scanLinkTargetAttrs(standalone)` |
| `site/js/created-setup.mjs` | Use handoff; optional standalone advance guard |
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

1. **Auto-advance on test scan** — always wait for Continue in standalone, or only when `window.open` would have been used?
2. **Hub open scan** — same-tab for all standalone pages, or only during `fresh=1` setup?
3. **Child object scan links** — same policy as root scan preview?
4. **Return banner (P2)** — steward-only chrome on scan: acceptable on stranger trust surface with dismiss + no install prompt?

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-29 | Initial investigation — inventory, impact matrix, proposals P1–P5 |
| 2026-05-29 | **P1 shipped** — `pwa-scan-handoff-core.mjs` wired at setup, dashboard, hub, wallet pins, child-object scan links |
