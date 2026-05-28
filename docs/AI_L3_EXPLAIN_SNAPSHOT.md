# L3 P1 — Opt-in scan explainer

**Status:** Shipped — kept as opt-in “Plain language” reader in UI  
**Parent:** [`AI_FEATURE_DEVELOPMENT.md`](AI_FEATURE_DEVELOPMENT.md) · [`LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md`](LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md)

---

## Goal

Strangers scanning a **status plate** or **live object** with `object_streams` may optionally request a **plain-language summary** of the signed public snapshot. The summary is **not** resolver truth and never replaces the signed snapshot block. UI copy says **Plain language**, while the stable endpoint and JSON fields keep their `ai` names for integrators.

---

## Non-goals

- Auto-run on page load
- Modify or store resolver state
- Use scan analytics, geolocation, or verifier identity
- Explain cards without `public_snapshot` (no streams)

---

## API

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/.well-known/hc/v1/ai/explain-snapshot` |
| **Auth** | None (public, rate-limited per IP) |
| **CORS** | Same allowlist as other hc/v1 routes |

### Request body

```json
{
  "public_snapshot": {
    "text": "Studio door · Open until 9 PM · Special hours: Thursday closes at 6 PM",
    "fields": [
      { "key": "object", "value": "Studio door" },
      { "key": "status", "value": "Open until 9 PM" },
      { "key": "Special hours", "value": "Thursday closes at 6 PM" }
    ]
  }
}
```

Validation matches L2 assembly limits (plain text, bounded field count and lengths).

### Response (200)

```json
{
  "summary": "The studio door is open until 9 PM. Special hours: Thursday closes at 6 PM.",
  "source": "workers_ai",
  "disclaimer": "Plain-language summary — not signed network state. Only the signed snapshot above is steward-published resolver copy.",
  "limits": {
    "ai_explain_warning": "..."
  }
}
```

`source` is `workers_ai` when Cloudflare Workers AI ran, or `deterministic` when the operator has no AI binding (local dev fallback).

### Errors

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_SNAPSHOT` | 422 | Missing or malformed `public_snapshot` |
| `RATE_LIMITED` | 429 | Per-IP hourly cap |
| `AI_UNAVAILABLE` | 503 | Workers AI error (no deterministic retry beyond fallback) |

---

## Model behavior

System prompt rules (enforced in `ai-explain-core.ts`):

- Restate **only** provided fields — no invented facts
- 2–3 short sentences maximum
- Do not claim verification, ownership, scan history, or legal identity
- Plain language for a stranger who just scanned a QR

When `env.AI` is absent, `deterministicExplainSnapshot()` joins field values into readable sentences — same disclaimer, `source: deterministic`.

---

## Scan UI

Rendered inside `.scan-public-snapshot` when L2 snapshot exists:

1. **Signed snapshot** (unchanged — resolver truth)
2. Limit note (unchanged)
3. **Explain in plain language** button (opt-in)
4. Hidden panel `#scan-ai-explain-panel` — labels the result “Plain-language help” and shows summary + `AI_EXPLAIN_LIMIT` on success

Module: `site/js/scan-ai-explain.mjs` (loaded from scan HTML when snapshot present).

Styling: `site/scan-pass.css` (`.scan-ai-explain-*`) — visually distinct from signed snapshot (not the same “steward-signed” treatment).

---

## Rate limit

**30 requests / IP / hour** — bucket prefix `ai_explain:` in D1 `rate_limit_buckets`. Separate from card resolution limit.

---

## Workers AI binding

`worker/wrangler.toml`:

```toml
[ai]
binding = "AI"
```

Model: `@cf/meta/llama-3.1-8b-instruct` (Workers AI). Change only with security/copy review.

---

## Trust copy

`AI_EXPLAIN_LIMIT` in `worker/src/resolver/trust-copy.ts` — must stay synchronized with scan panel and status JSON `limits.ai_explain_warning`.

---

## Exit checklist

| Step | Pass? |
|------|-------|
| POST with valid snapshot returns summary + disclaimer | ✅ `ai-explain-snapshot.test.ts` |
| Invalid body returns 422 | ✅ |
| Rate limit returns 429 | ✅ |
| Scan HTML includes explain button when snapshot present | ✅ `object-streams.test.ts` |
| Signed snapshot block unchanged; AI panel separate | ☐ manual |
| `GET …/status` includes `scan.ai` when snapshot present | ✅ `ai-explain-snapshot.test.ts` |
