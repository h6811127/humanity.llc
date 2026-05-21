# Humanity Commons landing (Cloudflare Pages)

Static landing for humanity.llc. Copy aligned with `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md` (public launch, federated resolvers). Visual: `docs/VISUAL_IDENTITY_PRINCIPLES.md` (brand accent `#DB1B43`).

## Local preview

```bash
npm run pages:dev
# or: npx wrangler pages dev site
```

Open the URL Wrangler prints (usually `http://localhost:8788`).

**Pass card (mobile Safari):** no idle spin on touch devices; drag to tilt; tap to flip front/back; release returns to neutral. Policy links under **Limits** and on the card back.

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
| `data-policy.html` | Mobile-friendly operator data policy summary |
| `styles.css` | Layout and visual system |
| `main.js` | Pass card tilt (touch + desktop), tap-to-flip |
| `_headers` | Security and cache headers |
| `assets/red_qr_transparent_bg.png` | Favicon, brand mark, card preview |
