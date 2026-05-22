# M3 — Public scan page UI (`GET /c/{profile_id}?q={qr_id}`)

**Status:** Implementation contract for Worker HTML  
**Related:** `docs/V1_PRODUCT_TRUST_MODEL.md` §7, `docs/V1_0_ARCHITECTURE_ROADMAP.md` §7, `docs/V1_IMPLEMENTATION_CONTRACTS.md` (QR payload)

---

## Product rule

The scan page is **live resolver output** (Cloudflare Worker), not the static Pages site. Deploy with `npm run worker:deploy`. Pages deploy alone does not change `/c/…`.

Response header when the new UI is live: `X-HC-Scan-UI: pass-v4` (or later).

---

## Layout (three layers)

1. **Pass card (front)** — At-a-glance identity: handle, manifesto, trust pills, **this card’s scan QR**, one-line bearer foot.
2. **Pass card (back)** — Short limits only (same pattern as landing preview): bearer, not ID, revocable, link to data policy.
3. **Grouped lists below** — iOS-style sections per trust model: Card status, Human trust, This QR, Live control, Limitations.

Do **not** put full trust copy on the card back (it clips). Spec blocks live in the lists below.

---

## Pass card QR (must match `/created/`)

| Rule | Detail |
|------|--------|
| **Payload** | The HTTPS URL for **this** card + credential: `https://humanity.llc/c/{profile_id}?q={qr_id}` |
| **Source of truth** | `qr_credentials.payload` from D1 when present; otherwise build from request origin + ids (`resolveScanUrl` in `scan-state.ts`) |
| **Not allowed** | Brand placeholder `red_qr_transparent_bg.png`, homepage URL, or generic `humanity.llc` QR |
| **Color** | Modules `#db1b43`, background `#ffffff` (same as creation flow brand red) |
| **Creation page** | `/created/` renders the same payload client-side via `site/js/qr-render.mjs` + `qrScanUrl()` in `hc-sign.mjs` |
| **Scan page** | Worker renders the same payload server-side via `worker/src/resolver/scan-qr.ts` (`QRCode.toString`, type `svg`) |
| **Fallback** | If server SVG fails, inline module script loads `/js/qr-render.mjs` and fills `#pass-qr-slot[data-scan-url]` (never the brand PNG) |
| **Visible URL** | Red monospace line under QR on card front: full scan URL (confirms payload for humans) |

### Verification checklist

- [ ] Scan the on-card QR with a phone → opens **this** profile’s `/c/…?q=…` URL, not the marketing homepage.
- [ ] QR on `/created/` and on `/c/…` scan page encode the **same** string for a given card.
- [ ] QR modules are red, not black (after `qr-render.mjs` v2 red update).

---

## Trust list icons

Below-card rows use **colored tile + white stroke SVG** (same visual language as `site/index.html` “Clear limits”). Implementation: `worker/src/resolver/scan-icons.ts`. Empty colored squares without SVG are a bug.

---

## Files

| Path | Role |
|------|------|
| `worker/src/resolver/scan-html.ts` | HTML template |
| `worker/src/resolver/scan-state.ts` | View model + `scanUrl` |
| `worker/src/resolver/scan-qr.ts` | Red SVG QR generation |
| `worker/src/resolver/scan-icons.ts` | List row SVGs |
| `site/scan-pass.css` | Bundled styles → `scan-pass-styles.ts` |
| `site/js/qr-render.mjs` | Browser QR for `/created/` (+ scan fallback) |
| `site/js/hc-sign.mjs` | `qrScanUrl(profileId, qrId, origin)` |

After changing `scan-pass.css` or `pass-flip.js`, run `npm run worker:bundle-scan` (included in `worker:deploy`).

---

## Spec alignment (M3.2 / §7)

| Block | On card | Below card |
|-------|---------|------------|
| Card status | Pill + badge | Group: status, profile id, does not prove |
| Human trust | Pill | Group: label, vouches, does not prove |
| This QR | Pill | Group: QR status, scope, credential id, scan link, bearer warning |
| Live control | — | Group: not shown / proven (M7) |
| Limitations | Back face summary | Group: not ID, no analytics, data policy link |

Required bearer copy (printed-item scans) appears in **This QR** group and card foot.

---

## Deploy

```bash
npm run worker:test
npm run worker:deploy
curl -sI "https://humanity.llc/c/{profile_id}?q={qr_id}" | grep X-HC-Scan-UI
```
