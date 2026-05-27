# Emphasis card rollout (`hc-emphasis-card`)

**Status:** Phases 0–5 shipped · **Visual alignment v2 shipped** (Phases A–E + spacing ladder, May 2026)  
**Visual standard:** [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md) § Emphasis notice cards · [`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md)  
**Primary CSS:** `site/css/hc-emphasis-card.css` (imported by `site/styles.css`; bundled into scan via `worker:bundle-scan`), `site/css/theme-dark.css`

---

## What this is

Shared **raised notice cards** for high-salience device warnings and actions: layered shadow depth, semantic color in eyebrow/dot/CTA, status-dot glow.

**Shipped (May 2026):** Glass fills + hairline borders + `backdrop-filter`; opaque fallback when blur unsupported or `prefers-reduced-transparency: reduce`; eyebrow `0.025em`; CTA radius **10px**; landing glass withdrawn. See [`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md) changelog.

Replaces over time: flat `.hc-notice` strips, plain `<p>` cross-tab lines, and amber bordered `.wallet-strip-hint` boxes where a card + CTA is appropriate.

---

## Markup contract

```html
<div
  class="hc-emphasis-card hc-emphasis-card--{active|info|warn|urgent}"
  id="…"
  role="status"
  hidden
>
  <div class="hc-emphasis-card__main">
    <span class="hc-emphasis-card__dot hc-emphasis-card__dot--{success|info|warn|urgent}" aria-hidden="true"></span>
    <div class="hc-emphasis-card__copy">
      <p class="hc-emphasis-card__eyebrow" id="…-eyebrow">EYEBROW</p>
      <p class="hc-emphasis-card__title" id="…-title">Optional title</p>
      <p class="hc-emphasis-card__detail" id="…-detail">Body copy.</p>
    </div>
  </div>
  <a class="hc-emphasis-card__cta" href="…">Action</a>
  <!-- or <button type="button" class="hc-emphasis-card__cta"> -->
</div>
```

| Modifier | Use when | Eyebrow | Dot | Fill |
|----------|----------|---------|-----|------|
| `--active` | Keys live in **this** tab | Green | `--success` | Gray-green neutral |
| `--info` | Cross-tab keys, custody, informational CTA | Blue | `--info` | Cool gray neutral |
| `--warn` | Reversible risk, setup gates | Amber | `--warn` | Warm gray neutral |
| `--urgent` | Live proof, revoke, errors | Red | `--urgent` | Warm gray neutral |

**IDs:** Keep stable `id`s for JS (`#wallet-active-banner`, `#live-control-proof-lead`, `#no-session-detail`, etc.) even when classes migrate.

**Legacy aliases:** `.wallet-active-banner` and `.wallet-active-*` remain valid aliases to `.hc-emphasis-card` / `__*` until all call sites migrate (do not remove until Phase 5+ cleanup).

**Helpers:** `site/js/device-emphasis-card-html.mjs` · **Tests:** `worker/tests/device-emphasis-card-html.test.ts`

---

## CSS tokens (`:root`)

| Token | Role |
|-------|------|
| `--hc-emphasis-card-shadow` | Shared inset + outer lift (light/dark override) |
| `--hc-emphasis-card-fill-{active,info,warn,urgent}` | Opaque gradients per modifier (reduced-transparency fallback) |
| `--hc-emphasis-card-fill-*-glass` | Default translucent gradients per modifier |
| `--hc-emphasis-card-border-*` | Hairline stroke (neutral + per-modifier semantic tint) |
| `--hc-emphasis-card-backdrop` | `blur()` + `saturate()` for glass surfaces |
| `--hc-emphasis-card-cta-radius` / `cta-padding` | Precise in-card controls (**10px**, not pill) |
| `--hc-emphasis-card-eyebrow-{active,info,warn,urgent}` | Eyebrow text color per modifier |
| `--hc-emphasis-card-title-fg` | `.hc-emphasis-card__title` — all instances |
| `--hc-emphasis-card-detail-fg` | `.hc-emphasis-card__detail` — all instances (explicit literals; not `shell-label`) |

Default CTA: `.hc-emphasis-card__cta` uses `var(--red)` at `--hc-emphasis-card-cta-radius` (brand primary action).

### Typography contrast (global)

See [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md) § Typography contrast — implementation checklist. **Never** style one card’s detail in isolation.

---

## Rollout phases

| Phase | Scope | Status |
|-------|--------|--------|
| **0** | Extract `.hc-emphasis-card` + four modifiers; migrate `#wallet-active-banner` | **Shipped** |
| **1** | `#wallet-tab-hint`, `#device-cross-tab-banner` (wallet + `/`) | **Shipped** |
| **2** | `#scan-cross-tab-banner` (scan bundle + `device-cross-tab-banner.mjs`) | **Shipped** |
| **3** | `#live-control-proof` on `/created/` → `--urgent` | **Shipped** |
| **4** | Create custody + revoke gates + `#no-session` / `#created-error` / `#owner-revoked-banner` | **Shipped** |
| **5** | `.hub-card-status-alert` inset `--warn` | **Shipped** |

### Phase 0–3 — shipped

See git history (`3eab136` Phase 3, `1f0c517` Phase 2). Acceptance: shadow-only depth, no translucent semantic rims, dark mode via shared tokens, Vitest guards on `site/css/hc-emphasis-card.css`.

### Phase 4 — shipped (create + revoke + session gates)

| Surface | File(s) | Shipped as |
|---------|---------|------------|
| Public create warning | `site/create/index.html` | `#create-public-card-notice` · `hc-emphasis-card--warn` |
| Keys custody (created) | `site/js/device-keys-custody.mjs` | `emphasisCardShellHtml` · `--warn` · Acknowledge secondary pill |
| No session | `site/created/index.html`, `created.mjs` | `--warn` · `#no-session-detail` · **My cards** secondary pill |
| Created error | `site/created/index.html`, `created.mjs` | `--urgent` · `#created-error-detail` |
| Owner revoked | `site/created/index.html`, `created-revoke-banner-core.mjs` | `--urgent` · `#owner-revoked-banner-detail` |
| Revoke ID warnings | `site/created/index.html`, `site/organizer-revoke/index.html` | `--warn` compact cards (no CTA) |

**Acceptance:** No flat orange/red `hc-notice` tinted boxes on these surfaces; pill CTAs where actions exist; revoke banner never empty when shown.

### Phase 5 — shipped (hub card disabled-since-visit)

| Surface | File(s) | Shipped as |
|---------|---------|------------|
| `.hub-card-status-alert` | `site/js/device-hub-ui.mjs`, `site/styles.css` | Inset `hc-emphasis-card--warn` per saved card row; eyebrow **Card status**; **Got it** / **View scan** secondary pills |

**Acceptance:** No red popover border rim inside hub rows; shadow-only depth; e2e selectors `.hub-card-status-alert` unchanged.

**Backlog (not Phase 5):** Optional emphasis summary **above** `#device-hub-live-control-group` / `#device-hub-card-disabled-group` lists — keep list row pattern.

---

## Further optimization backlog

Prioritized follow-ups after Phases 0–5. Full tier tables: [`UI_COLOR_SCHEME_STANDARD.md`](UI_COLOR_SCHEME_STANDARD.md) § Rollout candidates.

### High value (device chrome consistency)

| Item | Surface | Modifier | Notes |
|------|---------|----------|-------|
| Hub keys custody | `#device-keys-custody-hub` (`device-keys-custody.mjs` `--hub`) | `--info` | **Shipped** — emphasis card + secondary Acknowledge; **compact** stacked spacing ([`KEYS_CUSTODY_EMPHASIS_CARD_SPACING_INVESTIGATION.md`](KEYS_CUSTODY_EMPHASIS_CARD_SPACING_INVESTIGATION.md)) |
| Wallet keys custody | `#device-keys-custody-wallet` (`--wallet`) | `--info` | **Shipped** — same as hub + help/import foot; compact spacing |
| Compact custody strip | `device-keys-custody--compact` | `--warn` | **Shipped** — inline warn card for landing/create mounts |
| Hub cross-tab slot | `#device-hub-crosstab-notice` | `--info` / `--warn` | **Shipped** — emphasis card + pill CTAs (matches page/wallet cross-tab) |
| Vouch return | `#created-vouch-return-banner` | `--active` | **Shipped** — post-vouch continuity; green active dot + primary CTA |

### Medium value (workspace + flows)

| Item | Surface | Modifier | Notes |
|------|---------|----------|-------|
| Legacy `.form-warning` (non-notice) | Create advanced blocks | `--warn` | **Shipped** — `#create-public-card-notice`; legacy `.form-warning` CSS excludes `.hc-emphasis-card` |
| `#created-error` dynamic paths | Already Phase 4 if shipped | `--urgent` | **Shipped** — `showError()` updates `#created-error-detail` only |
| System / resolver banner | `#device-system-banner` | Minimal or `--urgent` | Only if copy gains a CTA; else keep plain line |
| Scan vouch explainer blocks | `scan-pass.css` | Case-by-case | **Shipped** — `#vouch-explainer`, `#vouch-ineligible`, `#vouch-success`, `#vouch-switch-default` use emphasis cards; `#vouch-interactive` form stays `.vouch-card` |

### Low priority / explicit out of scope

| Item | Reason |
|------|--------|
| Glance popover rows | List controls, not page-level cards |
| Inbox sheet rows | Dense list UX |
| Solid `.device-hub-notice-banner` full-bleed | Intentional high-contrast hub taps |
| `.research-live-banner` | Separate visual language (landing blocks — [`LANDING_FINAL_CTA_EMPHASIS_CARD.md`](LANDING_FINAL_CTA_EMPHASIS_CARD.md), alignment — [`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md)) |
| Remove `.wallet-active-*` aliases | After all consumers use `hc-emphasis-card__*` only |
| Landing Liquid Glass CTAs | Revert per visual alignment doc phase A |

### Engineering hygiene

| Item | Notes |
|------|-------|
| Single CSS source | `site/css/hc-emphasis-card.css`; scan via `npm run worker:bundle-scan` |
| Token sync | Keep `:root` emphasis tokens in `scan-pass.css` aligned with `site/styles.css` when tokens change |
| Regression | `npm run worker:test:ui-color-scheme` + `npm run worker:test -- worker/tests/device-emphasis-card-html.test.ts` after each phase |
| Shell delivery | `@import` for `hc-emphasis-card.css` must be **first** in `styles.css` — see [`HC_EMPHASIS_CARD_IMPORT_REGRESSION.md`](HC_EMPHASIS_CARD_IMPORT_REGRESSION.md) · explicit `<link>` on shell pages **shipped** |
| Dark cache bust | Bump `theme-dark.css?v=` on shell pages when changing `theme-dark.css` |
| No per-card fg hacks | Title/detail always `--hc-emphasis-card-title-fg` / `--hc-emphasis-card-detail-fg` |

---

## Post-rollout fix — shell CSS delivery (May 2026)

**Incident:** Mid-file `@import` in `styles.css` (Phase 2) caused all emphasis cards on shell pages to lose base styles.  
**Doc:** [`HC_EMPHASIS_CARD_IMPORT_REGRESSION.md`](HC_EMPHASIS_CARD_IMPORT_REGRESSION.md)  
**Step 1 (shipped in this branch):** Move `@import url("./css/hc-emphasis-card.css")` to top of `styles.css`; Vitest guard; bump `styles.css?v=` on shell pages.

---

| Phase | Docs |
|-------|------|
| 0–1 | This file, `UI_COLOR_SCHEME_STANDARD.md`, `CARD_WORKSPACE_UX.md` |
| 1 | `CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md`, `DEVICE_INBOX.md` |
| 2 | `SCAN_PAGE_DEVICE_DOT.md`, `M3_SCAN_PAGE_UI.md` |
| 3–4 | `CARD_WORKSPACE_UX.md`, `CREATED_TASK_DASHBOARD.md`, `CREATED_UI_SAFARI_HELP_REVOKE_INVESTIGATION.md` |
| 5 | `DEVICE_HUB_REPAIR_SPEC.md`, `CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md` |

---

## Visual alignment v2 (shipped — May 2026)

| Phase | Work | Status |
|-------|------|--------|
| A | Revert landing glass | **Shipped** |
| B | Global glass tokens + `hc-emphasis-card.css` | **Shipped** |
| C | Shell, created, create, scan bundle, hub | **Shipped** |
| D | Landing markup + standard CTAs | **Shipped** |
| E | Docs + Vitest regression guards | **Shipped** |

Canonical spec: [`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md).

---

## QA (every phase)

1. Light + dark theme on target page.
2. No blue (or semantic) **rim** from translucent fill alone — hairline uses neutral/semantic tint per alignment doc.
3. Eyebrow, title, detail, CTA readable; tap targets ≥44px where buttons.
4. **Dark mode:** explicit `background: var(--hc-emphasis-card-fill-*)` per modifier in `theme-dark.css`.
5. `npm run worker:test:ui-color-scheme`
6. Wallet/cross-tab: `npm run e2e -- e2e/device-os-wallet.spec.ts` when touching wallet chrome.
7. Created/revoke: manual Manage tab revoke banner + no-session paths on `/created/`.

---

## Out of scope

Glance rows, inbox sheet rows, solid `.device-hub-notice-banner` full-bleed taps, marketing `.research-live-banner`.
