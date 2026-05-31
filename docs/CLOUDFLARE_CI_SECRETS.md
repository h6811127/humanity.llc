# Cloudflare CI secrets

**Status:** Canonical — ops reference for GitHub Actions deploy workflows  
**Audience:** Repository admins, release engineering

Deploy workflows require a valid **`CLOUDFLARE_API_TOKEN`** in GitHub repository secrets. Vitest failures (Class A) are fixed in code; auth failures (Class B) require token rotation in Cloudflare.

---

## Workflows that use the token

| Workflow | Steps needing token |
|----------|---------------------|
| **Deploy Pages** | `npm run pages:deploy` |
| **Deploy Worker** | `npm run worker:migrate:remote` · `npm run worker:deploy` |

**Test site** and **Regression nightly** do not deploy — no Cloudflare token required.

---

## Minimum token permissions

Create or edit the token at [Cloudflare dashboard → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens).

| Permission | Scope | Why |
|------------|-------|-----|
| **Account → Cloudflare Pages → Edit** | Target account | Pages deploy |
| **Account → Workers Scripts → Edit** | Target account | Worker deploy |
| **Account → D1 → Edit** | Target account | Remote migrations |
| **User → User Details → Read** | User | Wrangler membership lookup (`/memberships`) |

Error `Authentication error [code: 10000]` on `/memberships` usually means the token lacks **User Details Read** or account scope is wrong.

Error `Authentication failed (status: 400) [code: 9106]` means the token value in GitHub Actions is invalid, expired, or not saved under the secret name **`CLOUDFLARE_API_TOKEN`** (re-create the repo secret after rotating in Cloudflare; workflow_dispatch does not pick up dashboard-only changes).

---

## Verification

After updating the secret in GitHub → Settings → Secrets → Actions:

1. Re-run **Deploy Pages** (push a `site/**` change or use workflow_dispatch).
2. Re-run **Deploy Worker** after Vitest is green on `main`.

Local deploy still requires `CLOUDFLARE_API_TOKEN` in the environment — not needed for `npm run worker:test` or `npm run pages:dev`.

---

## Related

- Investigation history: [`archive/GITHUB_CI_FAILURE_INVESTIGATION.md`](archive/GITHUB_CI_FAILURE_INVESTIGATION.md)
- Build stamp drift: [`SITE_BUILD_VERSIONING.md`](SITE_BUILD_VERSIONING.md) — run `npm run site:build-meta` when bumping `DEVICE_SHELL_ASSET_VERSION`
