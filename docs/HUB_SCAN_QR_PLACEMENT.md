# Hub Scan QR placement

**Status:** Phase A shipped (glance row + steward tools strip) · Phase B shipped (conditional chrome icon)  
**Date:** 2026-05-30  
**Audience:** Product, design, frontend  
**Related:** [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md) (S3 in-app scanner) · [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md) · [`SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) · [`HUB_STRANGER_ONBOARDING.md`](HUB_STRANGER_ONBOARDING.md)

---

## Problem

**Scan QR to vouch** (S3 in-app camera) shipped inside the hub **Restore & scan** group — below saved cards, pins, and shortcuts. Stewards who vouch from printed QRs (especially Home Screen PWA on iPhone) had to: tap status dot → open hub → scroll past cards → find the button.

That placement matched “restore & handoff” grouping but buried the highest-frequency steward action.

---

## Three different “scan” jobs

Do not merge these into one generic “Scan QR” affordance:

| Job | Who | Entry | Copy |
|-----|-----|-------|------|
| Scan someone else’s Humanity QR to **vouch** | Steward with saved card | In-app scanner (S3) | **Scan QR to vouch** / **Scan a Humanity QR** |
| **Preview** my live object as strangers see it | Owner | Card row **Open scan** | **Open scan page** |
| **Paste** a link from Camera / Safari | Steward handoff (S1) | Hub **Open scan link** | **Open scan link** |

Strangers scanning street QRs use the **phone Camera app** — not the in-app scanner. The landing hero stays **Create-first**; we do not add a always-visible top-level scan icon for first-time visitors.

---

## Product principles

1. **Progressive disclosure** — in-app scan affordances appear only when `hc_wallet` count ≥ 1 (`shouldShowHubQrScanner`). Stranger-empty landing unchanged.
2. **Status dot stays hub-only** — do not overload `#brand-status-dot-btn` with scan; glance popover carries the fast path.
3. **Calm landing** — no scan icon in the hero; scan is steward tooling, not acquisition funnel.
4. **Copy specificity** — “Scan to vouch” vs “Open scan page” vs “Open scan link” must stay distinct ([`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md)).

---

## Placement roadmap

| Phase | Change | Status |
|-------|--------|--------|
| **A** | Glance popover row + **Steward tools** strip under saved-items header | **Shipped** |
| **B** | Optional muted scan icon in top chrome when wallet ≥ 1 and standalone PWA | **Shipped** |

### Phase A — Glance popover row

When the hub sheet is collapsed, tapping the status dot opens `#device-hub-glance-popover`. If the device has saved cards, prepend:

- **Title:** Scan a Humanity QR  
- **Subtitle:** Vouch from a printed code  
- **Action:** opens the existing `#device-hub-qr-scanner` dialog (same as hub button)

Hidden when `walletCount < 1`. Keeps landing hero clean while giving returning stewards a two-tap path (dot → scan).

**Module:** `site/js/device-hub-glance.mjs` · copy in `device-ownership-copy-core.mjs` (`HUB_GLANCE_SCAN_QR_*`).

### Phase A — Steward tools strip

Move **Scan QR to vouch** and the S4 iPhone vouch guidance card out of **Restore & scan** into `#device-hub-steward-tools` — directly under the saved-items section header (below section lead, above the card list).

**Restore & scan** (bottom of hub) keeps import / recovery / open-scan-link only — still `data-hub-restore-always` for strangers.

**Modules:** shell HTML (`site/index.html`, `site/create/index.html`, `site/wallet/index.html`) · visibility in `device-hub-qr-scanner.mjs`.

### Phase B — Conditional chrome icon (shipped)

When stewards still miss the scanner after Phase A, a muted QR icon in `#top-chrome` gives a one-tap path from any shell page in standalone PWA mode.

- Muted QR icon opposite the status dot (`#shell-scan-qr-btn`)  
- Gated: `walletCount ≥ 1` **and** `display-mode: standalone` (`shouldShowHubScanQrChrome`)  
- Label: **Scan to vouch** (`HUB_CHROME_SCAN_QR_ARIA`) — not generic “Scan QR”  
- Hidden when no saved cards (stranger-empty unchanged)  
- Opens the same `#device-hub-qr-scanner` dialog as hub / glance rows

**Modules:** shell HTML on `/`, `/create/`, `/created/`, `/wallet/` · `device-hub-qr-scanner-core.mjs` · `device-hub-qr-scanner.mjs` · `site/css/device-shell.css`

---

## Explicit non-goals

- Scan icon on landing hero (competes with Create funnel)
- Status dot long-press or dual meaning (hub opener contract)
- In-app scanner for strangers (Camera → `/c/…` remains canonical)
- Renaming card-row **Open scan** to “Scan QR”

---

## Engineering index

| Surface | Id / class | Role |
|---------|------------|------|
| Glance row | `.device-hub-glance-row--scan` | Fast scan from collapsed chrome |
| Chrome icon | `#shell-scan-qr-btn` | One-tap scan in standalone PWA |
| Steward strip | `#device-hub-steward-tools` | Scan button + vouch guidance near cards |
| Scanner dialog | `#device-hub-qr-scanner` | Shared camera UI |
| Hub button | `#hub-scan-qr-btn` | Same action as glance row |

### Tests

```bash
npm run worker:test -- worker/tests/device-hub-scan-qr-placement.test.ts
npm run worker:test:steward-scan-handoff
npm run e2e -- e2e/device-status-dot.spec.ts
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-30 | Phase B — standalone chrome scan icon (`#shell-scan-qr-btn`) |
| 2026-05-30 | Phase A — glance scan row + steward tools strip; doc created |
