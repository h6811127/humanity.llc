# Landing emphasis card spacing — “deployed but unchanged” investigation

**Status:** Resolved (comfort ladder shipped May 2026)  
**Reported:** 2026-05-26 — After multiple spacing commits and a Pages deploy, `/` cards (`.landing-framing`, `.landing-final-cta`) still look **too compressed**.

**Fix (shipped):** Raised spacing tokens per [`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md) (section gap **24px**, padding **20px**); zeroed landing title margins inside emphasis cards; `styles.css?v=118` on `/`; `@import` `hc-emphasis-card.css?v=2`. Deploy with **`npm run pages:deploy`**.  
**Related:** [`HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md`](HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md) · [`HC_EMPHASIS_CARD_IMPORT_REGRESSION.md`](HC_EMPHASIS_CARD_IMPORT_REGRESSION.md) · [`LANDING_FINAL_CTA_EMPHASIS_CARD.md`](LANDING_FINAL_CTA_EMPHASIS_CARD.md) · `site/README.md`

---

## Executive summary

The spacing ladder **is present on `main`** in git (`bcaa5fa` and later). If production looks unchanged, the most likely causes are:

1. **Wrong deploy target** — `worker:deploy` / GitHub **Deploy Worker** updates the resolver only, **not** the static homepage CSS.
2. **Browser/CDN cache** — `site/index.html` still references `styles.css?v=116`; commit `7c0a9bc` **reverted** the `v=117` bump from the spacing commit, so clients that already cached `styles.css?v=116` may keep **old CSS** after a deploy.
3. **Unversioned `@import`** — Emphasis-card rules load from `/css/hc-emphasis-card.css` with **no query string**; that file can stay cached even when `styles.css` updates.
4. **Perception vs tokens** — Shipped `--hc-emphasis-card-gap-section: 12px` is only modestly larger than the previous `8px` landing override; it may not match the visual “more air” the user expects even when applied correctly.

---

## What shipped in git (expected behavior)

| Change | Commit (approx.) | On `main`? |
|--------|------------------|------------|
| Stacked layout (`flex: none` on `__main`, no flex-grow gap) | `a136505` | Yes |
| Spacing tokens + stacked `gap: var(--hc-emphasis-card-gap-section)` | `bcaa5fa` | Yes |
| Vitest guards for tokens + stacked rules | `bcaa5fa` | Yes |

**`:root` tokens (current `site/styles.css`):**

| Token | Value |
|-------|-------|
| `--hc-emphasis-card-gap-section` | `12px` |
| `--hc-emphasis-card-gap-dot` | `12px` |
| `--hc-emphasis-card-gap-eyebrow` | `4px` |
| `--hc-emphasis-card-gap-copy` | `6px` |
| `--hc-emphasis-card-padding-block` | `14px` |

**Stacked landing selectors (current `site/styles.css`):**

```css
.landing-framing.hc-emphasis-card,
.landing-final-cta.hc-emphasis-card,
… {
  flex-direction: column;
  justify-content: flex-start;
  gap: var(--hc-emphasis-card-gap-section);
}
… __main { flex: none; width: 100%; }
```

So the **airy flex-grow bug is fixed in source**; remaining “compressed” look on a correctly loaded page is either **cache** or **token values still too small**.

---

## Finding 1 — Pages deploy vs Worker deploy

| Command / workflow | Updates homepage `/` CSS? |
|--------------------|---------------------------|
| `npm run pages:deploy` / `npm run deploy` | **Yes** — uploads `site/` to Cloudflare Pages |
| `npm run worker:deploy` | **No** — Worker + scan bundle only |
| `.github/workflows/deploy-worker.yml` on push to `main` | **No** — Worker only (see workflow comment: “Pages deploy is separate”) |
| Cloudflare Dashboard **Pages** Git integration | **Yes** — if connected to `site` output (see `wrangler.toml` `pages_build_output_dir = "site"`) |

**Implication:** If the user deployed via Worker CI, dashboard Worker deploy, or `worker:deploy`, the landing HTML/CSS **would not change**. They need an explicit **Pages** deploy (`npm run pages:deploy`) or a Git-connected Pages build that includes `site/**` changes.

---

## Finding 2 — Cache bust regression (`styles.css?v=116`)

Timeline on `main`:

| Commit | `site/index.html` `styles.css` |
|--------|--------------------------------|
| `bcaa5fa` | `?v=117` (spacing commit) |
| `7c0a9bc` | Reverted to `?v=116` (“Revert steward push and shell bumps…”) |

**Current `site/index.html` (workspace and `HEAD`):** `styles.css?v=116`

**Why this matters:** Query `?v=` is the project’s cache-bust mechanism (`site/README.md` pass-card note). When spacing CSS shipped under `v=117` but production HTML was later served as `v=116`:

- Browsers (and some intermediates) key cache entries on the **full URL** including query string.
- A user or CDN that cached **`/styles.css?v=116` from before `bcaa5fa`** can keep showing **old rules** (tight `8px` gaps, or pre–flex-fix layout) even after a new Pages deploy updated the **file on the server** at that URL.

**This matches “I deployed and nothing happened”** without a hard refresh or a new `?v=` on the stylesheet link.

---

## Finding 3 — Unversioned `hc-emphasis-card.css` via `@import`

Shell delivery chain:

```text
/index.html  →  /styles.css?v=116
                    @import url("./css/hc-emphasis-card.css");   ← no ?v=
                    →  /css/hc-emphasis-card.css
```

| File | Cache bust on `/`? |
|------|---------------------|
| `styles.css` | Yes (`?v=116`, should bump when spacing changes) |
| `hc-emphasis-card.css` | **No** — always `/css/hc-emphasis-card.css` |

Spacing implementation splits:

- Tokens on `:root` in `styles.css`
- Layout rules in `hc-emphasis-card.css` (`gap: var(--hc-emphasis-card-gap-dot)`, etc.)

If `styles.css?v=116` is refreshed but **`hc-emphasis-card.css` stays cached**, dot/eyebrow/detail spacing can remain on old values while section `gap` tokens (from refreshed `styles.css`) update — or vice versa. See [`HC_EMPHASIS_CARD_IMPORT_REGRESSION.md`](HC_EMPHASIS_CARD_IMPORT_REGRESSION.md) (belt-and-suspenders `<link>` to emphasis CSS still backlog).

**Note:** Mid-file `@import` was fixed (import at top of `styles.css`); this investigation is about **caching**, not ignored imports.

---

## Finding 4 — CSS is correct locally if Pages serves current `site/`

**Local check (no deploy):**

```bash
npm run pages:dev
# Open http://localhost:8788/ — serves `site/` directly
```

If local preview looks correct but production does not → **deploy or cache**, not missing commits.

If local preview **also** looks compressed → either tokens are too small for the design goal, or another stylesheet overrides (unlikely on `/` for these selectors).

---

## Finding 5 — Token values may still feel “compressed”

Even with a **full** cache refresh, the ladder uses **12px** between stacked sections (copy block → CTA row → footer). Previously landing used **`gap: 8px`** before the flex fix; the increase is **+4px**, not a large layout change.

| Zone | Shipped token | User expectation risk |
|------|---------------|------------------------|
| Dot ↔ copy | `12px` | Reasonable |
| Eyebrow ↔ title | `4px` | Tight by design |
| Title ↔ detail | `6px` | Tight by design |
| Copy block ↔ button | `12px` section gap | May still feel cramped vs marketing cards |

So “looks the same” can be **accurate** if cache is fine but **12px is insufficient** — that is a **design/token** issue, not a deploy failure.

---

## Production verification checklist (do before changing CSS)

Run against **production** `https://humanity.llc/` (or the URL actually deployed):

### A. Confirm Pages asset version

1. **View source** on `/` — note `styles.css?v=` (expect `116` today, not `117`).
2. **Fetch stylesheet:**  
   `curl -sS 'https://humanity.llc/styles.css?v=116' | grep -E 'hc-emphasis-card-gap-section|Stacked emphasis cards'`  
   - **Pass:** tokens and stacked block present.  
   - **Fail:** missing → Pages not serving current `main` or wrong host.
3. **Fetch emphasis file:**  
   `curl -sS 'https://humanity.llc/css/hc-emphasis-card.css' | grep 'hc-emphasis-card-gap-dot'`  
   - **Pass:** `var(--hc-emphasis-card-gap-dot)` in file.

### B. Confirm browser is not on stale cache

1. Hard refresh (Safari: empty caches for site; or private window).
2. Or temporarily open DevTools → Network → disable cache → reload.
3. Compare computed styles on `.landing-final-cta.hc-emphasis-card`:
   - `gap` should be `12px`
   - `.hc-emphasis-card__main` should be `flex: none` (not `flex-grow: 1`)

### C. Confirm deploy type

1. Cloudflare dashboard → **Workers & Pages** → project **`humanity-llc`** (Pages) → latest deployment time vs last `site/` commit.
2. Do **not** rely on Worker deployment time for homepage CSS.

---

## Root-cause decision tree

```text
Production curl missing new CSS?
  YES → Pages not deployed or wrong project/branch
  NO → Continue

View-source v=116 + hard refresh still old computed gap?
  YES → Stale cache for styles.css?v=116; bump ?v= on index.html on next fix
  NO → Continue

Computed gap = 12px but still feels compressed?
  YES → Increase --hc-emphasis-card-gap-* tokens (design), not deploy

Computed flex-grow on __main?
  YES → Stacked rules not applying (specificity/HTML); inspect class list on element
```

---

## Recommended fix directions (document only — not implemented here)

| Priority | Action | Owner |
|----------|--------|--------|
| P0 | Verify production with checklist above | Whoever reports the bug |
| P0 | Ensure **`npm run pages:deploy`** (or Git Pages) ran after `bcaa5fa` | Deploy |
| P1 | Bump `styles.css?v=` on `site/index.html` (e.g. `117` or higher) when shipping spacing changes | Frontend |
| P1 | Add `?v=` to `hc-emphasis-card.css` import or `<link>` (import regression doc Step 5) | Frontend |
| P2 | If 12px is too small after cache confirmed fresh, raise `--hc-emphasis-card-gap-section` (and related) in alignment doc | Product + frontend |

---

## Files reference

| File | Role |
|------|------|
| `site/index.html` | `styles.css?v=`, card markup |
| `site/styles.css` | `:root` tokens, stacked landing rules |
| `site/css/hc-emphasis-card.css` | Component spacing via `var()` |
| `site/css/device-shell.css` | `.landing-framing--compact` title sizes only |
| `.github/workflows/deploy-worker.yml` | Does **not** deploy Pages |
| `package.json` `pages:deploy` | Correct CLI for homepage |

---

## Related commits

| Commit | Summary |
|--------|---------|
| `a136505` | `flex: none` stacked layout fix |
| `bcaa5fa` | Spacing tokens F1–F4; `styles.css?v=117` |
| `7c0a9bc` | Reverted `styles.css?v=117` → `v=116` (cache bust regression) |
