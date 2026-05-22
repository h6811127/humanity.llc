# Humanity Commons landing (Cloudflare Pages)

Static landing for humanity.llc. Copy aligned with `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md` (public launch, federated resolvers). Visual: `docs/VISUAL_IDENTITY_PRINCIPLES.md` (brand accent `#DB1B43`). Pass preview: matte credential card (hairline border, soft shadow, red for status only).

## Local preview

```bash
npm run pages:dev
# or: npx wrangler pages dev site
```

Open the URL Wrangler prints (usually `http://localhost:8788`).

**Pass card (iPhone Safari + Android Chrome):** tilt lives on `.pass-tilt-wrap`; flip is `.is-flipped` on `#pass-flip` / `.pass-inner` only (coarse-pointer CSS must not flatten `.pass-flip`). No idle spin on touch; drag face to tilt; tap **Tap to flip** for front/back; 44px flip button. Hard-refresh after deploy (`styles.css?v=16`, `main.js?v=1`). Reduced-motion: instant flip, button stays visible.

## Deploy on Cloudflare Pages

### Dashboard (Git-connected)

| Setting | Value |
|---------|--------|
| Build command | *(empty)* or `npm run build` |
| Build output directory | **`site`** |
| Deploy command | **Leave empty** |

Do **not** use `npx wrangler deploy` (Workers). Use Pages static deploy only.

### Wrangler CLI

```bash
npm run deploy
# or: npx wrangler pages deploy site --project-name=humanity-llc
```

**Custom domain:** `humanity.llc`

## Files

| File | Purpose |
|------|---------|
| `index.html` | Landing page |
| `create/index.html` | Create card UI at `/create/` |
| `created/index.html` | Post-create QR + scan link |
| `js/create-card.mjs`, `js/hc-sign.mjs` | Browser signing + POST to resolver |
| `data-policy.html` | Mobile-friendly operator data policy summary |
| `styles.css` | Layout and visual system |
| `main.js` | Pass card tilt (touch + desktop), tap-to-flip |
| `_headers` | Security and cache headers |
| `_redirects` | `/create` → `/create/` (301; avoid `create.html` — Pages strips `.html` and loops) |
| `assets/red_qr_transparent_bg.png` | Favicon, brand mark, card preview |

### After changing Pages files

Git push must include `site/create.html`, `site/create/`, `site/created/`, and `site/js/`.  
Worker deploy alone does **not** update `/create` (that is Pages).

Verify production:

```bash
curl -sS https://humanity.llc/create/ | grep -o '<title>[^<]*</title>'
# expect: Create card · humanity.llc
```

If you still see `humanity.llc` (landing), the Pages build is stale. In Cloudflare dashboard → Pages → your project → **Deployments**, confirm the latest commit includes those paths. If **Single Page Application** is enabled, disable it or keep `_redirects` as above.
