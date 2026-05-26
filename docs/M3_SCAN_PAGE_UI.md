# M3  -  Public scan page UI (`GET /c/{profile_id}?q={qr_id}`)

**Status:** Implementation contract for Worker HTML  
**Product spec (scanner safety, recognition, external-link policy, hero IA):** [`docs/SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md)  
**Visual direction:** [`docs/VISUAL_IDENTITY_PRINCIPLES.md`](VISUAL_IDENTITY_PRINCIPLES.md) § Scan page visual spec  
**Design reference (target):** `assets/Nerd Mobile Post Scan Render.png`  
**Route map (scan vs card JSON vs status vs qr metadata):** [`docs/FLOW_2_QR_SCAN_REPAIR_SPEC.md`](FLOW_2_QR_SCAN_REPAIR_SPEC.md) § Public scan surfaces  
**Related:** `docs/V1_PRODUCT_TRUST_MODEL.md`, `docs/V1_0_ARCHITECTURE_ROADMAP.md` §7, `docs/V1_IMPLEMENTATION_CONTRACTS.md` (QR payload + § Reference network — Flow 2 routes)

---

## Product rule

The scan page is **live resolver output** (Cloudflare Worker), not the static Pages site. Deploy with `npm run worker:deploy`. Pages deploy alone does not change `/c/…`.

Response header when the new UI is live: `X-HC-Scan-UI: pass-v24` (or later). **`pass-v24`:** omit empty trust groups; M5 live-object showcase seed + landing. **`pass-v23`:** scan-type heroes, trust modules, Phase 4 tests.

---

## Layout

### Shipped today (`pass-v24`)

`scan-html.ts` renders, top to bottom:

1. **Top header** — `humanity.llc` brand link.
2. **Live check hero** (`renderScanHeroSection`) — host + single status strip, H1 (manifesto / plate / `@handle` / failure copy), steward strip, trust pills on personal cards, resolver line, Level 0 limit, detail chips, first-seen footnote, demoted QR (`scan-hero-qr`).
3. **Proves / does not prove** (`renderScanTrustModules`) — compact modules linking to full limits.
4. **Show link** — collapsible scan URL + credential code.
5. **Grouped lists** — Card status, Human trust, This QR, Live control in `<details class="scan-trust-details">`.
6. **Limits `<details>`** — `scan-limits-settings` (`id="scan-limits-settings"`).

Legacy flippable pass card markup remains in `scan-html.ts` for reference; active scan HTML uses the **Live check hero** (not the flip scene). Standalone `renderScannerSafetyHeader()` remains for unit tests.

### Layout zones (reference)

All zones **A–H** shipped through `pass-v24`. See [`docs/SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) § First-scan hero for principles.

| Zone | Shipped in |
|------|------------|
| **A–B** Live check hero | `pass-v21`–`pass-v23` |
| **C** Steward strip | `pass-v23` |
| **D–E** Proves / does not prove modules | `pass-v23` |
| **F** Collapsible hero QR | `pass-v23` |
| **G** Trust groups omit empty sections | `pass-v24` (`pushTrustGroup`) |
| **H** Footer + limits settings | M3 baseline |

### Scan type heroes

Branch in `buildScanHeroMain()` using `parseManifestoDisplay()` (`manifesto-display.ts`):

| `display.kind` / context | H1 | Secondary |
|--------------------------|-----|-----------|
| `general` (live object manifesto) | `manifestoLine` (full text) | `Controlled by @handle` |
| `status_plate` | `objectLabel` | `statusLine` |
| `lost_item_relay` | `objectLabel` (after `[relay]` strip) | `statusLine` |
| Personal card (handle-forward) | `@handle` | manifesto + `renderTrustPills` |
| `minimalScan` / revoke / expire | `minimalScanHeadline` | compact; groups below unchanged |

Do **not** use eyebrow “This QR is active” **and** a facts grid “Status: Active” **and** a safety strip “Active” in the same viewport.

---

## UI refresh phases

Track with [`docs/SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) § Resolver UI refresh.

| Phase | Work | Primary files |
|-------|------|----------------|
| **0** | Design alignment (fixtures + Nerd mock) | Docs only |
| **1** | Hero consolidation, dedupe status/limits, QR demotion, spacing | **Shipped** — `scan-html.ts`, `scan-safety.ts`, `scan-pass.css` |
| **2** | Scan-type hero templates | **Shipped** — `buildScanHeroMain()` |
| **3** | Collapsible groups + proves/does-not-prove modules | **Shipped** — `renderScanTrustModules()`, `scan-trust-details` |
| **4** | M5 live-object path + tests + `X-HC-Scan-UI` bump | **Shipped** (`pass-v23`) — `scan-m5-live-object.test.ts`, hero snapshots; M5 strangers still manual |
| **5** | Omit empty trust groups; M5 showcase seed + landing row | **Shipped** (`pass-v24`) — `pushTrustGroup`, `site:seed-showcase-live-object` |

After `scan-pass.css` changes: `npm run worker:bundle-scan`.

---

## Layout (historical pass card — reference)

1. **Pass card (front)**  -  At-a-glance identity: handle, manifesto, trust pills, **this card’s scan QR**, one-line bearer foot.
2. **Pass card (back)**  -  Short limits only (same pattern as landing preview): bearer, not ID, revocable, link to data policy.
3. **Grouped lists below**  -  iOS-style sections per trust model: Card status, Human trust, This QR, Live control, Limitations.

Do **not** put full trust copy on the card back (it clips). Spec blocks live in the lists below.

---

## Pass card QR (must match `/created/`)

| Rule | Detail |
|------|--------|
| **Payload** | The HTTPS URL for **this** card + credential: `https://humanity.llc/c/{profile_id}?q={qr_id}` |
| **Source of truth** | `qr_credentials.payload` from D1 when present; otherwise build from request origin + ids (`resolveScanUrl` in `scan-state.ts`) |
| **Not allowed** | Brand placeholder `red_qr_transparent_bg.png`, homepage URL, or generic `humanity.llc` QR |
| **Color** | Modules `#db1b43`, background `#ffffff` (same as creation flow brand red) |
| **Center logo** | Small mostly transparent concentric circles (vector, ~48% opacity, ~22% width) — see [`docs/QR_BRANDING.md`](QR_BRANDING.md) |
| **Error correction** | **Q** (required with center logo) |
| **Creation page** | `/created/` renders the same payload client-side via `site/js/qr-render.mjs` + `qrScanUrl()` in `hc-sign.mjs` |
| **Scan page** | Worker renders the same payload server-side via `worker/src/resolver/scan-qr.ts` (`QRCode.toString`, type `svg` + centered vector circles) |
| **Fallback** | If server SVG fails, inline module script loads `/js/qr-render.mjs` and fills `#pass-qr-slot[data-scan-url]` (never the brand PNG) |
| **Visible URL** | Red monospace line under QR on card front: full scan URL (confirms payload for humans) |
| **Credential code** | `HC-XXXX-XXXX` under QR (Phase F); matches `scan.qr.credential_code` in status JSON and print sticker |

### Verification checklist

- [ ] Scan the on-card QR with a phone → opens **this** profile’s `/c/…?q=…` URL, not the marketing homepage.
- [ ] QR on `/created/` and on `/c/…` scan page encode the **same** string for a given card.
- [ ] QR modules are red, not black; faint center logo visible (see `docs/QR_BRANDING.md`).

---

## Trust list icons

Below-card rows use **colored tile + white stroke SVG** (same visual language as `site/index.html` “Clear limits”). Implementation: `worker/src/resolver/scan-icons.ts`. Empty colored squares without SVG are a bug.

---

## Files

| Path | Role |
|------|------|
| `worker/src/resolver/scan-html.ts` | HTML template |
| `worker/src/resolver/scan-safety.ts` | Scanner safety header + first-seen script |
| `worker/src/resolver/scan-state.ts` | View model + `scanUrl` |
| `worker/src/resolver/scan-qr.ts` | Branded SVG QR + center logo overlay |
| `worker/src/resolver/scan-icons.ts` | List row SVGs |
| `site/scan-pass.css` | Bundled styles → `scan-pass-styles.ts` |
| `site/js/qr-branding.mjs` | Shared logo opacity, size, correction Q |
| `site/js/qr-render.mjs` | Browser QR for `/created/` (+ scan fallback) |
| `site/assets/qr-center-logo.svg` | Design reference for center mark (runtime uses `qr-branding.mjs`) |
| `docs/QR_BRANDING.md` | Branding spec + QA checklist |
| `site/js/hc-sign.mjs` | `qrScanUrl(profileId, qrId, origin)` |
| `site/js/qr-scan-url-lock.mjs` | Host lock for official QR payloads |

After changing `scan-pass.css` or `pass-flip.js`, run `npm run worker:bundle-scan` (included in `worker:deploy`).

---

## Spec alignment (M3.2 / §7)

| Block | Target hero / card | Below hero |
|-------|-------------------|------------|
| Card status | Single status strip (not badge + strip + grid) | Group: status, profile id, does not prove |
| Human trust | Pills on personal-card type only | Group: label, vouches, does not prove |
| This QR | Optional compact QR in zone F | Group: QR status, scope, credential id, scan link |
| Live control |  -  | Group: not shown / proven (M7) |
| Limitations | **One** Level 0 line in hero | Group + `scan-limits-settings` `<details>` |

**Minimal failure scans** (`qr_revoked`, `qr_expired`, `card_revoked` with `display_mode: minimal`): compact hero or panel; grouped **Card status** and **This QR** rows still render below (human trust hidden). Level 0 limit visible without opening `<details>`.

**Limits copy (target):** exactly **one** prominent Level 0 sentence in the hero (`trust-copy.ts` bearer). No duplicate “Limits” row in `renderObjectStateFacts` when the hero already shows it. Full “does not prove” detail in module E and/or `scan-limits-settings`. Status groups remain **facts only**.

**Hero limits (shipped):** one Level 0 line in `scan-hero-limit`; full detail in modules + `scan-limits-settings`.

---

## Machine-readable status (M3.4)

Prefer this endpoint (with `profile_id`) for the same trust state as `/c/…`. When only `qr_id` is known, use `GET /.well-known/hc/v1/qr/{qr_id}` (credential metadata; see `worker/src/resolver/qr-metadata.ts`).

`GET /.well-known/hc/v1/cards/{profile_id}/status`

| Query | Behavior |
|-------|----------|
| `?q={qr_id}` | Same trust state as `GET /c/{profile_id}?q={qr_id}` (`buildScanViewModel`) |
| (none) | Card-level status only; no QR artifact fields |

Implementation: `worker/src/resolver/scan-status.ts`. HTTP status codes match scan HTML (`404` unknown, `400` malformed/mismatch, `410` card revoked). `Cache-Control` matches the scan view model.

Failure states also include optional `scan.error` (contract code, e.g. `QR_REVOKED`) while `scan.kind` stays the stable snake_case key (`scan-contract-error.ts`).

```bash
curl -s "https://humanity.llc/.well-known/hc/v1/cards/{profile_id}/status?q={qr_id}" | jq .scan.kind
```

---

## Deploy

```bash
npm run worker:test
npm run worker:deploy
curl -sI "https://humanity.llc/c/{profile_id}?q={qr_id}" | grep X-HC-Scan-UI
```
