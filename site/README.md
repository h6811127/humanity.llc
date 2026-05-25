# Humanity Commons landing (Cloudflare Pages)

Static landing for humanity.llc. Copy aligned with `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md` (public launch, federated resolvers). Visual: `docs/VISUAL_IDENTITY_PRINCIPLES.md` (brand accent `#DB1B43`). Pass preview: matte credential card (hairline border, soft shadow, red for status only).

## Local preview

```bash
npm run pages:dev
# or: npx wrangler pages dev site
```

Open the URL Wrangler prints (usually `http://localhost:8788`).

Run `npm run worker:dev` on port **8787** before using `/create/` locally  -  the UI signs in the browser and POSTs to the resolver.

**Pages preview URLs** (`*.pages.dev` after `npm run pages:deploy`) are static-only. Create/revoke/vouch calls use the production resolver at `https://humanity.llc` automatically. Override with `?api=http://127.0.0.1:8787` when testing against a local worker.

**Pass card (iPhone Safari + Android Chrome):** tilt lives on `.pass-tilt-wrap`; flip is `.is-flipped` on `#pass-flip` / `.pass-inner` only (coarse-pointer CSS must not flatten `.pass-flip`). No idle spin on touch; drag face to tilt; tap **Tap to flip** for front/back; 44px flip button. Script: `js/pass-flip.js` (landing + scan). Hard-refresh after deploy (`styles.css?v=25`, `pass-flip.js?v=1`). Reduced-motion: instant flip, button stays visible.

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
| `index.html` | Landing (four-step progress, device hub, status plate pilot  -  no pass demo) |
| `created/index.html` | Post-create owner UI + shared device hub |
| `wallet/index.html` | Saved cards on this device (`hc_wallet` in localStorage) |
| `shop/index.html` | Tier 0 drop  -  config-driven Shopify checkout handoff |
| `data/shop-config.json` | Set `checkout_url` + `checkout_open` to enable Buy |
| `shop/thanks/index.html` | Post-checkout guidance (Tier 0 email copy) |
| `js/device-hub-ui.mjs`, `js/device-activity.mjs` | Shared hub + local activity log |
| `js/landing-device-hub.mjs`, `js/created-hub.mjs` | Page-specific hub init |
| `js/card-wallet.mjs` | Wallet CRUD + pin form |
| `case-study/index.html` | Recruiter walkthrough: create → scan → update → revoke → live control |
| `data/showcase-status-plate.json` | Live public status-plate scan for homepage pilot |
| `create/index.html` | Create card UI at `/create/` |
| `created/index.html` | Post-create QR + scan link + owner revoke (session key) |
| `js/create-card.mjs`, `js/hc-sign.mjs` | Browser signing + POST to resolver |
| `data-policy.html` | Mobile-friendly operator data policy summary |
| `architecture.html` | Sparse architecture map  -  keys, revoke, resolver, tradeoffs |
| `research-directions.html` | NFC, mesh, and Humanity node  -  research / future infrastructure |
| `styles.css` | Layout and visual system |
| `js/pass-flip.js` | Pass card tilt (touch + desktop), tap-to-flip (landing + scan) |
| `_headers` | Security and cache headers |
| `_redirects` | `/create` → `/create/` (301; avoid `create.html`  -  Pages strips `.html` and loops) |
| `assets/red_qr_transparent_bg.png` | Favicon, brand mark, card preview |

### Homepage showcase card

```bash
API_ORIGIN=https://humanity.llc npm run site:seed-showcase
```

Writes `data/showcase-status-plate.json` with a live scan URL for the status-plate pilot block on the landing page.

### Device OS (browser shell)

Landing, **`/created/`**, and **`/wallet/`** share status line + **On this device** hub (saved keys, pins, activity, backup import). **`/created/` Tasks tab** layout and copy: `docs/CREATED_TASK_DASHBOARD.md`. See also `docs/DEVICE_OS.md` and `docs/DEVICE_HUB_AND_LOCAL_SEARCH.md`.

### After changing Pages files

Git push must include `site/create.html`, `site/create/`, `site/created/`, and `site/js/`.  
Worker deploy alone does **not** update `/create` (that is Pages).

Verify production:

```bash
curl -sS https://humanity.llc/create/ | grep -o '<title>[^<]*</title>'
# expect: Create card · humanity.llc
```

If you still see `humanity.llc` (landing), the Pages build is stale. In Cloudflare dashboard → Pages → your project → **Deployments**, confirm the latest commit includes those paths. If **Single Page Application** is enabled, disable it or keep `_redirects` as above.
