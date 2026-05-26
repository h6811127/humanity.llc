# QR center logo branding

**Status:** Shipped (generator + docs)  
**Reference asset:** `site/assets/qr-center-logo.svg` (design reference only; generators draw vectors in code)  
**Related:** [`docs/SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) (optical layer + planned frame), `docs/M3_SCAN_PAGE_UI.md`, `docs/Technical Standards v1.0.md` §8.5, `site/js/qr-render.mjs`, `worker/src/resolver/scan-qr.ts`

---

## Product intent (final state)

All Humanity scan QRs (creation page, download PNG, scan pass card) MUST match this visual:

| Property | Value |
|----------|--------|
| Modules | Brand red `#db1b43` on white `#ffffff` |
| Center mark | Large soft outer wash `#c9979f` (~36% opacity) + smaller brand-red core `#db1b43` (~58% opacity) |
| Logo size | ~78% of QR width (fills the code area; EC **Q** required) |
| Error correction | **Q** (required for center overlay; stickers/apparel per §8.5) |
| Payload | Unchanged — still the HTTPS scan URL for this card + `qr_id` |

The mark is drawn as **vector circles** only — no raster plate, no white JPEG backdrop. Modules remain underneath; scanners recover hidden data via error correction.

---

## Implementation map

| Step | File | What it does |
|------|------|----------------|
| 1 | `site/js/qr-branding.mjs` | Colors, center logo, **`renderHumanityQrFrameSvg` / `renderHumanityQrFrameMarkup` / `renderHumanityQrFrameToCanvas`** |
| 2 | `site/js/qr-render.mjs` | Browser PNG via `renderHumanityQrFrameToCanvas` |
| 3 | `worker/src/resolver/scan-qr.ts` | SVG QR + center logo + frame markup |
| 4 | `site/assets/qr-center-logo.svg` | Optional reference for designers (not loaded at runtime) |

Both generators import the same opacity, size ratio, colors, and correction level so `/created/` and `/c/…` stay aligned.

To tune the look, edit `QR_CENTER_LOGO_OUTER_FILL`, `QR_CENTER_LOGO_INNER_RADIUS_RATIO`, or opacity in `site/js/qr-branding.mjs`.

---

## Host lock (Phase C)

Official generators **must** encode only URLs that pass `validateOfficialScanUrl` in `site/js/qr-scan-url-lock.mjs`:

- Host: `humanity.llc` (or `*.humanity.llc`), plus `localhost` / `127.0.0.1` for local dev
- Path: `/c/{profile_id}` with **only** `?q={qr_id}` (no homepage, no extra query params)
- Wired in: `hc-sign.mjs` (`qrScanUrl`), `qr-render.mjs`, `qr-branding.mjs`, `worker/src/resolver/scan-qr.ts`, `worker/src/resolver/scan-state.ts` (`resolveScanUrl`)

```bash
npm run worker:test -- worker/tests/qr-scan-url-lock.test.ts
```

---

## Engineering rules

- **Do not** composite a full rectangular logo image with `globalAlpha` / `<image opacity>` — opaque white backdrops will show on the QR.
- **Do not** use the old brand placeholder `red_qr_transparent_bg.png` as the QR itself — that file is favicon/marketing only.
- **Do** keep quiet zone (`margin` ≥ 1).
- **Do** use correction **Q** whenever the center logo is enabled (default in `qr-branding.mjs`).
- **Do** call `buildOfficialScanUrl` / `assertOfficialScanUrl` before encoding any scan payload (see Host lock above).
- **QA:** Scan with iOS Camera and Android at intended print size after any opacity/size change.

---

## Verification checklist

- [ ] `/created/` preview QR shows red modules + faint concentric circles (no white square).
- [ ] Download PNG matches preview.
- [ ] `/c/{profile_id}?q=…` pass card QR matches (Worker SVG).
- [ ] Phone scan succeeds at 220px display size and at downloaded 512px PNG.
- [ ] `npm run worker:test` — `scan-qr-branding.test.ts` passes.

```bash
npm run worker:test -- worker/tests/scan-qr-branding.test.ts
```

---

## Opacity and scan reliability

| Opacity | Effect |
|---------|--------|
| Outer ~0.36 / inner ~0.58 (shipped) | Large soft wash with a visible core; modules show through |
| &gt; 0.85 size ratio | Risk of scan failures on some cameras — stay at **Q** and test phones |
| Opaque + full bleed | Needs Q/H; not the chosen design |

If scan QA fails in the field, reduce `QR_CENTER_LOGO_SIZE_RATIO` (e.g. to `0.72`) before lowering correction below Q.

---

## Signed visual frame (shipped)

All official generators wrap the branded QR in `renderHumanityQrFrameSvg` (Worker) or `renderHumanityQrFrameToCanvas` (browser PNG). Product spec: [`docs/SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) § Optical layer.

| Element | Implementation |
|---------|----------------|
| Brand border | Rounded rect stroke `#db1b43` (`qrFrameMetrics` + frame SVG/canvas) |
| Network glyph | Concentric circles top-left (`networkGlyphSvgFragment` / `drawNetworkGlyphOnCanvas`) |
| `LIVE OBJECT` | Uppercase label below modules (`QR_FRAME_LIVE_OBJECT_TEXT`) |
| Footer | `humanity.llc` (`QR_FRAME_FOOTER_TEXT`) |
| Layout tuning | Edit `qrFrameMetrics()` in `site/js/qr-branding.mjs` |

Official outputs must not bypass the frame helpers in `qr-branding.mjs`.

---

## Print sticker template (Phase D)

Fulfillment and DIY print use `renderPrintStickerSvg()` in `site/js/qr-print-sticker.mjs`, wrapping the signed frame in a mm-based sheet:

| Spec | Value |
|------|--------|
| Trim | **50.8 mm** (2 in square) — `STICKER_TRIM_MM` |
| Bleed | **1.5 mm** per edge |
| Safe inset | **2 mm** from trim |
| Guides | Trim/safe dashed rects + corner crop marks (omit with `showGuides: false` for production RIP) |
| Worker entry | `renderPrintStickerFromScanUrl(scanUrl)` in `worker/src/resolver/scan-qr.ts` |

**PDF:** Export SVG via browser Print → PDF or vendor RIP; no separate PDF generator in v1.

**Do not** print mutable trust claims on the sticker (status belongs on the resolver only).

```bash
npm run worker:test -- worker/tests/qr-print-sticker.test.ts
```

---

## Credential code (Phase F)

Official framed QRs include a short **HC-XXXX-XXXX** line under `humanity.llc`, derived from `profile_id` + `qr_id` (`site/js/qr-credential-code.mjs`). Same value appears in status JSON as `credential_code` and on DIY print exports. Humans compare sticker to network — not a secret, not proof of identity.

Optional verifier: [`/verify/`](https://humanity.llc/verify/).

---

## Print QA watermark (Phase G)

Fulfillment / operator proof sheets add a diagonal **HUMANITY PRINT PROOF** / **DO NOT SHIP** overlay (`site/js/qr-print-qa-watermark.mjs`). Customer DIY exports omit it.

| Entry | Use |
|-------|-----|
| `renderPrintStickerSvg(framed, { qaWatermark: true })` | Browser or tooling |
| `renderPrintProofStickerFromScanUrl(scanUrl)` | Worker proof export |

```bash
npm run worker:test -- worker/tests/qr-print-qa-watermark.test.ts
```

```bash
npm run worker:test -- worker/tests/qr-credential-code.test.ts
```
