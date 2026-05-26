# Production sad-path QA — humanity.llc

**Date:** 2026-05-26  
**Environment:** https://humanity.llc (live production)  
**Method:** Manual browser exploration (Cursor IDE browser) + targeted `curl` against resolver  
**Persona:** New / confused user deliberately breaking flows (not happy-path case study)  
**Note:** The automation browser already had saved cards in `localStorage`; some flows (empty wallet, true incognito stranger) were inferred from code + API where storage could not be cleared via CDP.

---

## Executive summary

| Severity | Count | Theme |
|----------|-------|--------|
| **P0** | 2 | Misleading `/created/` for bogus `profile_id`; false “Card disabled since your last visit” on **active** cards |
| **P1** | 4 | Create validation gaps, shop copy contradiction, soft 404, error messages expose API URLs |
| **P2** | 6 | Status-plate empty submit ordering, scan URL requirements, vouch gating copy, etc. |

Resolver health at test time: `GET /.well-known/hc/v1/health` → `{"status":"ok","database":"ok"}`.

**Side effect:** One real sample card was created on production: handle `@live_demo_xwr` (via “Create a sample card”). It is a public demo card on the network; revoke or ignore if undesired.

---

## P0 — Must fix (trust / safety)

### P0-1 · `/created/?profile_id=…` shows success chrome for invalid IDs

**Status (2026-05-26):** Fix shipped — resolver route gate on `/created/` (`created-route-gate.mjs`, `created.mjs?v=50`). Re-verify on production after deploy.

**Steps**

1. Open `https://humanity.llc/created/?profile_id=fakeprofileid123456789012345` (no `qr_id`, no `hc_created` session).

**Expected**

- Clear error state only: “This card doesn’t exist” / redirect to create or wallet — no “live” hero.

**Actual**

- Hero: **“Your object is live”**, **“Card active · QR expires -”**, setup checklist marked complete.
- Buried notice: **“Missing profile or QR in this link…”**, **“No signing keys in this tab”**, profile ID shows the fake value.
- Network panel eventually shows **Revoked** / unlock copy (inconsistent with hero).

**Why it hurts**

- A user who bookmarks or shares a truncated URL believes the card exists and is active.
- Matches `created.mjs` branch: missing `qr_id` triggers `setNoSessionNotice` but static HTML shell still reads as success until network poll contradicts it.

**Suggested fix**

- Gate hero on resolver `GET /cards/{profile_id}` (404 → error page).
- Require both `profile_id` and `qr_id` in URL for “live” layout, or redirect to wallet when only one param present.

---

### P0-2 · “Card disabled on the network since your last visit” on active cards (reproduced)

**Status (2026-05-26):** Fix shipped — never trust session cache for `scanKind: card_revoked` without a poll; G2 truth clear on cache/poll mismatch; hub hides since-visit banner when chip status is `active`. Re-verify on production after deploy.

**Steps**

1. Open `/`, `/create/`, or `/wallet/` with saved cards (including public showcase `@studio_door_showcase`).
2. Observe hub row detail for each card.

**Expected**

- No disabled-since-visit banner when resolver reports `status: "active"`.

**Actual**

- **Every** saved row shows: “Card disabled on the network since your last visit.”
- API check: `GET /.well-known/hc/v1/cards/nSVXWPqgRFEhGPjxyRzidF6s` → `"status": "active"`.
- Public scan page for same card shows **Card status active**, **QR active**.

**Related doc**

- [`CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md`](CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md) — status **REOPENED** (RC-B client re-apply path).

**Suggested fix**

- Ship client gates G1–G6 from investigation doc; verify on production after deploy with DevTools `scan.kind` on status fetches.

---

## P1 — High (confusing or wrong, not safety-critical)

### P1-1 · Create form: `novalidate` + weak client checks → resolver round-trip for bad handles

**Steps**

1. `/create/` → handle `AB` (2 chars) + manifesto → submit.

**Actual**

- Form uses `novalidate`; submit proceeds to **“Submitting to resolver…”**
- Error after network: `Handle must be 3–32 chars: lowercase letter, then letters, digits, or underscores. (https://humanity.llc/.well-known/hc/v1/cards)`

**Better**

- HTML5 `pattern` / `minlength` enforcement before submit (or re-enable native validation).
- User-facing message without raw API path.

---

### P1-2 · Shop: contradictory checkout messaging

**Config:** `site/data/shop-config.json` → `checkout_open: false`, `checkout_url: ""`.

**Actual (JS correct, HTML stale)**

- Hero/price: **“Checkout opening soon”** (from `showInterestPending`).
- Static block in `#shop-checkout-group` (hidden but present in DOM): **“Ready to order. You will complete payment on Shopify…”**
- If `checkoutSection` ever fails to hide (JS error, cache), users see “ready to order” with no buy button.

**Fix**

- Move “Ready to order” copy behind `checkout_open` in HTML or templating; single source of truth with `shop.mjs`.

---

### P1-3 · Unknown Pages paths return 200 (landing), not 404

**Steps**

- `curl -I https://humanity.llc/nonsense-page-xyz` → **200** (serves site shell / index).

**Impact**

- Broken links look “valid”; SEO noise; users don’t get a clear “page not found”.

**Fix**

- Cloudflare Pages custom 404 or `_redirects` fallback with explicit 404 page.

---

### P1-4 · Error strings expose internal API URLs

Examples seen in create flow:

- Handle validation failure appends `(.well-known/hc/v1/cards)`.
- Duplicate handle: `Handle is already taken. (https://humanity.llc/.well-known/hc/v1/cards)`.

**Fix**

- Log URL in console only; surface plain-language errors in `#status`.

---

## P2 — Medium (edge cases, polish)

### P2-1 · Scan URLs — resolver error pages (good) but strict

| URL | HTTP | User-facing title |
|-----|------|-------------------|
| `/c/not-a-real-profile` | 400 | Invalid link |
| `/c/nSVXWPqgRFEhGPjxyRzidF6s` (no `?q=`) | 400 | Invalid link |
| `/c/nSVXWPqgRFEhGPjxyRzidF6s?q=qr_FAKE123` | 400 | Invalid link |

**Works well:** Branded error HTML, not blank 500.  
**Gap:** No hint “add `?q=qr_…` from your QR” vs “profile doesn’t exist” (same page for both).

---

### P2-2 · Create — empty submit messaging

| Template | Empty submit | Message |
|----------|--------------|---------|
| General | No fields | `Handle is required.` |
| Status plate | No fields | `Handle is required.` only (not object/status line) |

**Fix**

- On status plate / lost item, validate pilot fields first or list all missing fields in one status line.

---

### P2-3 · Create — duplicate handle

**Steps:** Handle `studio_door_showcase` + manifesto → submit.

**Actual:** `Handle is already taken.` — **correct** (409-style behavior).

---

### P2-4 · Create — “Create a sample card” (happy for demo, sad for production hygiene)

**Steps:** Click demo on `/create/`.

**Actual**

- Auto-fills handle `live_demo_*`, creates real network card, auto-saves to device (auto-save on), lands on `/created/`.
- **Works** but pollutes production with ephemeral demo handles unless periodically purged.

**Suggestion**

- Rate-limit demo creates per IP or prefix handles `demo_` + cron purge per retention doc.

---

### P2-5 · Shop — interest email validation (good)

**Steps:** Email `not-an-email` → Save.

**Actual:** `Enter a valid email or leave blank.` — **correct**.

---

### P2-6 · Organizer revoke — gated actions (good)

**URL:** `/organizer-revoke/`

- Revoke buttons **disabled** until confirm checkboxes + required fields.
- Garbage profile id `fake` does not enable buttons without key material.

---

### P2-7 · Scan page (showcase) — steward vs stranger

**URL:** Valid showcase scan (with `?q=`).

- With saved keys on device: “Keys on this device”, vouch section explains saved cards don’t qualify for steward on this scan — **clear**.
- **Ask for live proof** present; stranger path not fully re-tested in clean storage.

---

### P2-8 · API malformed POST (good)

```bash
POST /.well-known/hc/v1/cards {"garbage":true}
→ 400 {"error":"MALFORMED_REQUEST","message":"Body must include signed `card` and `qr_credential` objects."}
```

---

### P2-9 · `/created/` bare (no query)

**curl:** `GET /created/` → 200, title “Your live object”, hero “Live QR ready”.

Same class as P0-1 for users landing without params; may redirect to `/wallet/` when no session (code path exists) — verify in incognito.

---

## What worked (sad-path wins)

- Invalid scan links → dedicated **Invalid link** page (400), not stack traces.
- Duplicate handle rejected with clear message.
- Shop invalid email blocked client-side.
- Organizer revoke requires explicit confirmations.
- Resolver health endpoint publicly readable for diagnostics.
- Sample card flow completes end-to-end (good for demos).

---

## Recommended test matrix (follow-up)

| ID | Scenario | Tool |
|----|----------|------|
| S1 | Incognito: `/` → create → close tab without save → reopen `/` | Manual + P0-1 doc |
| S2 | Incognito: bogus `/created/?profile_id=` | Manual |
| S3 | Two tabs: create in B, hub in A | `DEVICE_OS_QA.md` P0-1 |
| S4 | Import corrupt `.hcbackup` on `/wallet/` | Manual |
| S5 | Pin `not-a-valid-url` on wallet | Manual |
| S6 | Revoke without keys on `/created/#revoke` | Manual |
| S7 | `Ask for live proof` without owner keys | Two devices |
| S8 | After P0-2 fix: hub rows vs `GET …/status` `scan.kind` | DevTools |

Automated regression already documented in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) and AGENTS.md status-dot / cross-tab suites.

---

## Files / areas implicated

| Issue | Likely touch |
|-------|----------------|
| P0-1 | `site/js/created.mjs`, `site/created/index.html` |
| P0-2 | `site/js/device-hub-ui.mjs`, `wallet-network-baseline.mjs`, `device-wallet-since-visit-gate.mjs` |
| P1-1 | `site/js/create-card.mjs`, `site/create/index.html` |
| P1-2 | `site/shop/index.html`, `site/js/shop.mjs` |
| P1-3 | `site/_redirects`, Pages 404 |
| P2-1 | `worker/src/resolver/scan-html.ts` (error copy differentiation) |

---

## Changelog

- **2026-05-26:** Initial production sad-path pass (browser + curl).
