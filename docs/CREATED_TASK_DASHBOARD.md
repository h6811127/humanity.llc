# `/created/` control mode UX (Live tab)

**Status:** Superseded by shipped redesign - see [`CREATED_TASKS_TAB_REDESIGN.md`](CREATED_TASKS_TAB_REDESIGN.md) (T1-T5 complete)  
**See:** [`CARD_WORKSPACE_UX.md`](CARD_WORKSPACE_UX.md)  
**Page:** `site/created/index.html` · `site/js/created-dashboard.mjs` · `site/js/created.mjs`  
**E2E:** `e2e/created-control.spec.ts` · `e2e/device-os-wallet.spec.ts`

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

## Files

| Path | Role |
|------|------|
| `site/created/index.html` | Live · Manage tabs, cockpit, deploy, custody |
| `site/js/created-dashboard.mjs` | Deploy/custody actions, done persistence |
| `site/js/created-live-primary-cta*.mjs` | Contextual primary button |
| `site/js/created-live-setup-memory*.mjs` | Setup memory chips |
| `site/js/created-manifesto-update.mjs` | What scanners see publish |
| `site/js/created.mjs` | Hero meta, QR, live proof, network poll |

---

## Manual QA

1. Finish setup wizard - control mode shows **Your object is live**, no step-1 Save theater when wallet saved.
2. Live proof pending - primary is **Prove control now**; banner still visible.
3. Deploy disclosures use Manage-style icon + chevron pattern.
4. iPhone Safari: live object card fits viewport; tap targets >= 44px.
5. Dark mode: shell fill on card and disclosures.
6. Hub **Open controls** and `#revoke` / `#update-status` deep links land correct tab/panel.
