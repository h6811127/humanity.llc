# Humanity Commons landing (Cloudflare Pages)

Static merch-led landing page. Copy aligned with `docs/LAUNCH_LANGUAGE_KIT.md` (Tier 0 hero) and `docs/MERCH_LED_V1.md`.

## Deploy on Cloudflare Pages

### Fix: `wrangler deploy` failed

If the build log shows `Executing user deploy command: npx wrangler deploy`, that is **wrong** for this repo. `wrangler deploy` targets Workers; this site is **Pages** static files in `site/`.

**In Cloudflare → your project → Settings → Builds:**

| Setting | Value |
|---------|--------|
| Build command | *(empty)* or `npm run build` |
| Build output directory | **`site`** |
| Deploy command | **Leave empty** |

Do **not** use `npx wrangler deploy`. If a deploy command is required, use:

```bash
npm run deploy
```

which runs `wrangler pages deploy site`.

### Git-connected (recommended)

1. Cloudflare dashboard → **Workers & Pages** → **Pages** → your project → **Settings** → **Builds**.
2. Set build output directory to **`site`** and **clear** any custom deploy command.
3. **Custom domain:** `humanity.llc` (or staging subdomain first).
4. Retry deployment.

### Wrangler CLI

```bash
npx wrangler pages deploy site --project-name=humanity-llc
```

First run may prompt login. Create the Pages project in the dashboard if it does not exist.

## Local preview

```bash
npx wrangler pages dev site
```

Or any static server from the `site` folder:

```bash
cd site && python3 -m http.server 8788
```

Open `http://localhost:8788`.

## Customize before launch

| Item | File | What to change |
|------|------|----------------|
| Notify / waitlist email | `index.html` | `mailto:info@humanity.llc` links |
| Docs link | `index.html` footer | Replace `https://github.com` with repo or trust-model URL |
| OG image | `index.html` | Add `og:image` when asset exists |
| Store URL | `index.html` | Point **Get the founding sticker** to Shopify when live |

## Files

- `index.html` — page structure and copy
- `styles.css` — brand `#DB1B43`, mobile-first layout
- `_headers` — security headers (Cloudflare Pages)
