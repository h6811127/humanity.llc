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
| Center mark | Two concentric circles (dusty rose outer `#c9979f`, brand red inner `#db1b43`), **mostly transparent** (~48% opacity on the group) |
| Logo size | ~22% of QR width (does not cover finder patterns) |
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

## Engineering rules

- **Do not** composite a full rectangular logo image with `globalAlpha` / `<image opacity>` — opaque white backdrops will show on the QR.
- **Do not** use the old brand placeholder `red_qr_transparent_bg.png` as the QR itself — that file is favicon/marketing only.
- **Do** keep quiet zone (`margin` ≥ 1).
- **Do** use correction **Q** whenever the center logo is enabled (default in `qr-branding.mjs`).
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
| ~0.45–0.50 (shipped) | Logo more visible; modules still show through on white |
| &gt; 0.5 | Risk of muddy contrast over red modules |
| Opaque + large pad | Needs Q/H; hides more modules — not the chosen design |

If scan QA fails in the field, reduce `QR_CENTER_LOGO_SIZE_RATIO` before lowering correction below Q.

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
