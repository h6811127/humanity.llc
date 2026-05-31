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
| Finder mark | Module-masked two-tone circle on the **top-left finder**: dusty-rose `#c9979f` (~52%) + warm-ink core `#141414` (~90%) |
| Mark size | ~21% of QR width, centered on finder (`margin + 3.5` modules); EC **Q** required |
| Error correction | **Q** (required for center overlay; stickers/apparel per §8.5) |
| Payload | Unchanged — still the HTTPS scan URL for this card + `qr_id` |

The mark is drawn as **vector circles** only — no raster plate, no white JPEG backdrop. **Only dark (brand-red) modules inside each circle receive the tint**; QR whitespace stays pure white so contrast stays high. Scanners recover hidden data via error correction **Q**.

---

## Implementation map

| Step | File | What it does |
|------|------|----------------|
| 1 | `site/js/qr-branding.mjs` | Colors, center logo, **`renderHumanityQrFrameSvg` / `renderHumanityQrFrameMarkup` / `renderHumanityQrFrameToCanvas`** |
| 2 | `site/js/qr-render.mjs` | Browser PNG via `renderHumanityQrFrameToCanvas` (preview **220** px, download **512** px) |
| 3 | `worker/src/resolver/scan-qr.ts` | SVG QR + finder mark; print path uses template render profile |
| 3b | `worker/src/print/print-template-render.ts` | Per-template `frameBackground` / `framePadding` / `output` |
| 4 | `site/assets/qr-center-logo.svg` | Optional reference for designers (not loaded at runtime) |

Both generators import the same opacity, size ratio, colors, and correction level so `/created/` and `/c/…` stay aligned.

To tune the look, edit `QR_CENTER_LOGO_OUTER_FILL`, `QR_CENTER_LOGO_INNER_FILL`, `QR_CENTER_LOGO_INNER_RADIUS_RATIO`, or opacity in `site/js/qr-branding.mjs`.

---

## Finder mark (module-masked two-tone circle)

Official generators place the original rose + ink concentric circles **on the top-left QR finder**, not on the card border and not in the code center. The mark renders **only on brand-red modules** (not on white quiet-zone cells):

| Layer | Color | Opacity | Effect on modules |
|-------|--------|---------|-------------------|
| Outer | `#c9979f` (dusty rose) | ~0.52 | Soft pink wash — reads as a halo against surrounding `#db1b43` |
| Inner | `#141414` (warm ink) | ~0.90 | Dark core — modules in the center read nearly black for a clear bullseye |

**Why ink instead of a second red:** With module masking, two reds on the same module pixels barely separate; a warm charcoal core gives a visible “eye” without painting over whitespace.

| Implementation | Entry |
|----------------|--------|
| SVG (scan pass, Worker) | `overlayFinderLogoOnSvg()` via `overlayCenterLogoOnSvg()` — SVG `<mask>` from dark-module paths |
| Canvas (created page PNG) | `drawMaskedFinderLogoOnCanvas()` — alpha punch-out from QR raster |
| Fallback | If no brand-red stroke paths are found, unmasked circles at finder center |

`QR_FRAME_BRAND_MARK_ENABLED` is **false** — do not paint a separate dot on the frame margin. Optional center bullseye: set `QR_CENTER_LOGO_ENABLED` to `true` (off by default).

---

## Passers-by legitimacy cues (read at a glance)

Official framed QRs combine cues that a generic pink QR cannot copy without encoding a Humanity scan URL:

| Cue | What people see | Why it matters |
|-----|-----------------|----------------|
| Red frame + rounded card | Thin `#db1b43` border around the whole sticker | Matches scan-page / pass-card chrome |
| `LIVE OBJECT` band | Uppercase label under the code | Signals network-backed status, not a static sticker |
| `humanity.llc` footer | Grey microtype host line | Ties the object to the resolver origin |
| `HC-XXXX-XXXX` credential | Monospace code under the footer | Humans can compare sticker to on-screen status |
| Finder two-tone mark | Rose + ink bullseye on top-left finder | Same palette as the legacy center glyph; module-masked |

Tune finder size via `QR_FINDER_LOGO_SIZE_RATIO` (default ~0.21). Tune opacities via `QR_CENTER_LOGO_OUTER_OPACITY` / `QR_CENTER_LOGO_INNER_OPACITY`.

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

## `/created/` browser path

| Output | Width (module px) | Entry |
|--------|-------------------|--------|
| Hero + inline preview | `QR_PREVIEW_RENDER_WIDTH` (**220**) | `renderQrToImage()` |
| Download PNG | `QR_DOWNLOAD_RENDER_WIDTH` (**512**) | `downloadQrPng()` |

Both call `renderHumanityQrFrameToCanvas()` with the same branding flags as the Worker SVG path (finder mark + frame; no frame-margin dot).

```bash
npm run worker:test:qr-branding
```

---

## Verification checklist

- [x] `/created/` encoder contract — `qr-render.mjs` → `renderHumanityQrFrameToCanvas` at 220 / 512 (`qr-render-contract.test.ts`).
- [ ] `/created/` preview QR shows red modules + dusty-rose / ink mark on the **top-left finder** (manual: [`docs/DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P0-QR**).
- [ ] Download PNG matches preview (manual: **P0-QR** steps 1–3).
- [x] `/c/{profile_id}?q=…` pass card QR matches (Worker SVG) — `scan-pass.css` + `scan-qr-branding.test.ts`.
- [ ] Phone scan succeeds at 220px display size and at downloaded 512px PNG (manual: **P0-QR** step 5).
- [x] `npm run worker:test` — `scan-qr-branding.test.ts` + `qr-render-contract.test.ts` pass.
- [x] Site pass preview CSS (`styles.css` `.pass-qr`) accepts `hc-qr-frame-svg` markup (aligned with `scan-pass.css`).

```bash
npm run worker:test:qr-branding
```

---

## Opacity and scan reliability

| Opacity | Effect |
|---------|--------|
| Outer ~0.52 / inner ~0.90 (shipped) | Rose halo + ink core on modules only; whitespace untouched |
| Outer &lt; 0.40 | Bullseye may disappear on print — raise outer opacity before enlarging logo |
| &gt; 0.85 size ratio | Risk of scan failures on some cameras — stay at **Q** and test phones |
| Opaque + full bleed | Needs Q/H; not the chosen design |

If scan QA fails in the field, reduce `QR_CENTER_LOGO_SIZE_RATIO` (e.g. to `0.72`) before lowering correction below Q.

---

## Signed visual frame (shipped)

All official generators wrap the branded QR in `renderHumanityQrFrameSvg` (Worker) or `renderHumanityQrFrameToCanvas` (browser PNG). Product spec: [`docs/SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) § Optical layer.

| Element | Implementation |
|---------|----------------|
| Brand border | Rounded rect stroke `#db1b43` (`qrFrameMetrics` + frame SVG/canvas) |
| Finder mark | Two-tone circle on top-left finder (`finderLogoSvgFragment` / `overlayFinderLogoOnSvg`) |
| `LIVE OBJECT` | Uppercase label below modules (`QR_FRAME_LIVE_OBJECT_TEXT`) |
| Footer | `humanity.llc` (`QR_FRAME_FOOTER_TEXT`) |
| Layout tuning | Edit `qrFrameMetrics()` in `site/js/qr-branding.mjs` |

Official outputs must not bypass the frame helpers in `qr-branding.mjs`.

---

## Two registers: digital vs print fulfillment

Official generators share one encode path (red modules, EC **Q**, finder mark, host lock). **Frame chrome** splits by surface:

| Register | Surfaces | Frame background | Padding | Entry |
|----------|----------|------------------|---------|--------|
| **Digital (notary)** | Scan pass, `/created/` preview + download, customize QR preview | `full` white card | `default` | `renderFramedScanQrSvg(scanUrl)` — no frame opts |
| **Print fulfillment** | Printify upload, `POST /v1/print/artifacts` | Per approved template | Per template | `renderPrintArtworkFromScanUrl(scanUrl, templateId)` |

**Launch defaults** (`worker/src/print/print-template-render.ts`):

| Template | `frameBackground` | `framePadding` | `output` |
|----------|---------------------|----------------|----------|
| `hc-sticker-square-v1` | `full` | `default` | `sticker_sheet` (mm trim + bleed) |
| `hc-hoodie-live-object-v1` | `full` | `tight` | `frame_svg` (hoodie placeholder only) |
| `hc-glitch-hoodie-v1` | `full` | `tight` | `frame_svg` · Printify placeholder **`back`** |

`tight` scales outer pad by `QR_FRAME_PADDING_TIGHT_RATIO` (~0.62) in `qrFrameMetrics()` — smaller white island on fabric, same scan quiet zone under modules.

**Printify placeholder:** `print-template-render.ts` sets `printifyPlaceholder` per template (`back` for Glitch, `front` for Live Object hoodie). Env `PERSONALIZE_GLITCH_HOODIE_PRINTIFY_PLACEHOLDER` in `wrangler.toml` must stay aligned.

**Customizer:** Glitch `/shop/customize/` exposes **White card** vs **Transparent** (`shop-customize-printify-qr-core.mjs`). Gallery loads two Printify mock sets from `glitch-hoodie-mockups.json`: `src` (white-card product) and `src_transparent` (transparent-art product). Toggle swaps the garment mock photo only; the buyer’s **planned QR** renders in a separate block below the mockup (not composited on the Printify JPEG), using `transparentQrQuietZone` + `skipFinderLogo` when transparent is selected. If `src_transparent` is missing for a color, transparent mode falls back to a garment swatch. **Charcoal Heather, Royal Blue:** transparent option disabled (white card only). Preview choice is `sessionStorage` until fulfillment reads it at checkout.

**Export dual mockups:** `PRINTIFY_GLITCH_TRANSPARENT_PRODUCT_ID=<id> npm run printify:export-glitch-mockups` merges transparent product `images[]` into `src_transparent` per view (white-card product remains `printify_product_id`). Shop catalog: transparent art is on **Copy of Champion Hoodie** (`6a1c4fc1efb0c6a8580cdd93`); white card stays **Champion Hoodie** (`6a18a4d17f274f4c3e04f646`).

**Operator proof SVG:** `npm run print:glitch-hoodie-proof` → `site/data/fixtures/glitch-hoodie-print-proof.svg` (same renderer as fulfillment upload).

**Printify mockup art:** `npm run print:glitch-hoodie-printify-pngs` → `site/images/merch/printify-art/`:

| File | Meaning |
|------|---------|
| `glitch-hoodie-live-object-white-card.png` | White card behind full object; white QR quiet zone |
| `glitch-hoodie-live-object-transparent-card.png` | No outer card; **white still behind QR modules** |
| `glitch-hoodie-live-object-transparent-qr.png` | No outer card; **transparent QR quiet zone** (garment shows through the code background) |

Default scan URL links to humanity.llc (`--url` to override). Upload each PNG to a separate Printify product for mockup export. **transparent-qr** is mock/preview only — not launch fulfillment default (scan reliability).

**Future (QA-gated, not launch default):** `frameBackground: "qr_only"` (white behind modules only) or `"transparent"` (no card fill; stroke + type on garment). Requires [`MERCH_PHYSICAL_QA_RUNBOOK.md`](MERCH_PHYSICAL_QA_RUNBOOK.md) A1–A5 on Charcoal before changing catalog profile.

**Glitch composition:** Founding hoodie may use static Glitch art in Printify (`composition: "printify_layer"`) while middleware uploads a QR layer — today profiles use `standalone` (full framed SVG to print area). Align Printify placeholder with profile before production.

Choreography: digital surfaces echo the white island ([`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) Beat 1); print may tighten island without changing scan HTML.

```bash
npm run worker:test -- worker/tests/print-template-render.test.ts worker/tests/qr-print-sticker.test.ts
```

---

## Print sticker template (Phase D)

Fulfillment and DIY print use `renderPrintStickerSvg()` in `site/js/qr-print-sticker.mjs`, wrapping the signed frame in a mm-based sheet:

| Spec | Value |
|------|--------|
| Trim | **50.8 mm** (2 in square) — `STICKER_TRIM_MM` |
| Bleed | **1.5 mm** per edge |
| Safe inset | **2 mm** from trim |
| Guides | Trim/safe dashed rects + corner crop marks (omit with `showGuides: false` for production RIP) |
| Worker entry | `renderPrintArtworkFromScanUrl(scanUrl, templateId)` — stickers use `hc-sticker-square-v1`; legacy alias `renderPrintStickerFromScanUrl(scanUrl)` |

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
