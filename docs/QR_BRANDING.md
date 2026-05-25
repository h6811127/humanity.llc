# QR center logo branding

**Status:** Shipped (generator + docs)  
**Asset:** `site/assets/qr-center-logo.png`  
**Related:** `docs/M3_SCAN_PAGE_UI.md`, `docs/Technical Standards v1.0.md` §8.5, `site/js/qr-render.mjs`, `worker/src/resolver/scan-qr.ts`

---

## Product intent (final state)

All Humanity scan QRs (creation page, download PNG, scan pass card) MUST match this visual:

| Property | Value |
|----------|--------|
| Modules | Brand red `#db1b43` on white `#ffffff` |
| Center mark | Small concentric-circle logo, **mostly transparent** (~48% opacity) |
| Logo size | ~22% of QR width (does not cover finder patterns) |
| Error correction | **Q** (required for center overlay; stickers/apparel per §8.5) |
| Payload | Unchanged — still the HTTPS scan URL for this card + `qr_id` |

The logo is composited **on top** of the QR (modules remain underneath). Scanners recover hidden data via error correction, not by changing the encoded URL.

---

## Asset placement

1. Place the logo file at **`site/assets/qr-center-logo.png`** (served as `https://humanity.llc/assets/qr-center-logo.png`).
2. Prefer a **PNG with transparent background** for clean print; JPEG with a solid backdrop still works because the generator applies **global opacity** in the browser and **`opacity` on SVG `<image>`** on the Worker.
3. You do **not** need a separate copy under `worker/` — both paths read the same public asset URL or site-relative path.

To replace the art: overwrite `site/assets/qr-center-logo.png` and keep the filename (or update `QR_CENTER_LOGO_PATH` in `site/js/qr-branding.mjs`).

---

## Implementation map

| Step | File | What it does |
|------|------|----------------|
| 1 | `site/js/qr-branding.mjs` | Shared constants + SVG overlay helper |
| 2 | `site/js/qr-render.mjs` | Canvas QR (`toCanvas`) + logo draw with `globalAlpha` |
| 3 | `worker/src/resolver/scan-qr.ts` | SVG QR (`toString`) + centered `<image opacity="…">` |
| 4 | Docs | This file, `M3_SCAN_PAGE_UI.md`, Technical Standards §8.5 |

Both generators import the same opacity, size ratio, colors, and correction level so `/created/` and `/c/…` stay aligned.

---

## Engineering rules

- **Do not** use the old brand placeholder `red_qr_transparent_bg.png` as the QR itself — that file is favicon/marketing only.
- **Do** keep quiet zone (`margin` ≥ 1).
- **Do** use correction **Q** whenever the center logo is enabled (default in `qr-branding.mjs`).
- **QA:** Scan with iOS Camera and Android at intended print size after any opacity/size change.

---

## Verification checklist

- [ ] `/created/` preview QR shows red modules + faint center logo.
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
