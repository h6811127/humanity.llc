# Scan page owner restore CTA

**Status:** Shipped  
**Date:** 2026-05-31  
**Audience:** Product, engineering, QA  
**Related:** [`OWNERSHIP_RESTORE_UX_PLAN.md`](OWNERSHIP_RESTORE_UX_PLAN.md) · [`EPHEMERAL_STATE_AND_MERCH.md`](EPHEMERAL_STATE_AND_MERCH.md) · [`SCAN_PAGE_TRUST_UI.md`](SCAN_PAGE_TRUST_UI.md) · [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md) · [`help/index.html`](../site/help/index.html)

---

## Problem

Owners who scan their **printed object** (hoodie, sticker) on a **new device** — especially iPhone Home Screen PWA with an empty wallet — land on the **public scan page**. That page is stranger-first: no hub import, no actor band when the wallet is empty, no path to load keys.

Cross-device restore already works on shell pages (`/` hub, `/wallet/`, `/created/?profile_id=…` Manage), but owners scanning their own QR had no bridge to those surfaces.

---

## Solution

On **active `print_artifact` scans**, show a hero CTA after the live check card:

| Element | Value |
|---------|--------|
| Label | **Restore control** |
| Target | `/created/?profile_id={id}&qr_id={id}#restore` |
| Copy | Explains this is for **your** printed object; import recovery code or backup on the card page |

Strangers may see the same line; it is optional and requires a backup the owner saved at create.

---

## What the owner does (laptop → phone PWA)

1. On **Mac Safari** at create/checkout: save recovery code and/or export encrypted backup.
2. On **iPhone PWA**: scan the hoodie (or open the scan link).
3. Tap **Restore control** on the scan page.
4. On `/created/` → **Manage** → **Restore ownership**: paste recovery code (profile ID already in URL) or import backup file.
5. Update manifesto / revoke item QR from `/created/` as usual.

Recovery import on `/created/` needs **only the recovery code** — not a separate scan link.

---

## Architecture (layer separation)

| Layer | Surface | Role |
|-------|---------|------|
| L2 | Scan hero | Public object truth |
| L3 link | Owner restore CTA | Points to custody surface — does **not** inline import |
| Custody | `/created/#restore` | View mode + restore panel (existing) |

We do **not** open the hub sheet from scan pages ([`SCAN_PAGE_DEVICE_DOT.md`](SCAN_PAGE_DEVICE_DOT.md)).

---

## Implementation

| Piece | Path |
|-------|------|
| Eligibility + URL | `site/js/scan-owner-restore-cta-core.mjs` |
| Copy | `SCAN_OWNER_RESTORE_CTA_*` in `device-ownership-copy-core.mjs` |
| SSR markup | `renderScanOwnerRestoreCta()` in `worker/src/resolver/scan-html.ts` |
| Hide when keys loaded | `site/js/scan-owner-restore-cta.mjs` |
| Styles | `site/scan-pass.css` (bundle via `npm run worker:bundle-scan`) |

**Eligibility:** `kind === "active"` && `qrScope === "print_artifact"` && `profileId` set.

**Hide when:** tab session or saved wallet already has owner/recovery signing keys for the scanned `profile_id`.

**Scan UI header:** `X-HC-Scan-UI: pass-v38`

---

## Tests

```bash
npm run worker:bundle-scan   # after scan-pass.css changes
npm run worker:test -- worker/tests/scan-owner-restore-cta-core.test.ts worker/tests/scan.test.ts
```

---

## Explicit non-goals

- Auto-redirect all scans to `/created/`
- Inline hub import forms on scan HTML
- Handle / profile search
- Operator key recovery

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-31 | Shipped print_artifact owner restore CTA → `/created/#restore` |
