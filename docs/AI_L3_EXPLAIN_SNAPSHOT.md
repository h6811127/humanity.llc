# L3 P1 — Opt-in scan explainer

**Status:** Shipped — **deterministic-only** (2026-09-08): Workers AI dropped; opt-in “Plain language” reader restates the signed snapshot without a model.  
**Parent:** [`AI_FEATURE_DEVELOPMENT.md`](AI_FEATURE_DEVELOPMENT.md) · [`LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md`](LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md)  
**Language policy:** [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) § Rename, don’t erase

---

## Goal

Strangers scanning a **status plate** or **live object** with `object_streams` may optionally request a **plain-language summary** of the signed public snapshot. The summary is **not** resolver truth and never replaces the signed snapshot block. It is assembled **deterministically from signed field values** — no model output enters the response. UI copy says **Plain language**, while the stable endpoint and JSON fields keep their `ai` names for integrators.

---

## Non-goals

- Auto-run on page load
- Modify or store resolver state
- Use scan analytics, geolocation, or verifier identity
- Explain cards without `public_snapshot` (no streams)
- **Invoke any model** — the reference operator has no AI binding (2026-09-08)

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
  "summary": "This object is Studio door. Current status: Open until 9 PM. Special hours: Thursday closes at 6 PM.",
  "source": "deterministic",
  "disclaimer": "Plain-language summary — not signed network state. Only the signed snapshot above is steward-published resolver copy.",
  "limits": {
    "ai_explain_warning": "..."
  }
}
```

`source` is always `"deterministic"` on the reference operator — the Workers AI binding was removed (2026-09-08) and no model text can enter this response.

### Errors

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_SNAPSHOT` | 422 | Missing or malformed `public_snapshot` |
| `RATE_LIMITED` | 429 | Per-IP hourly cap |

---

## Restatement rules (deterministic)

`deterministicExplainSnapshot()` in [`ai-explain-core.ts`](../worker/src/resolver/ai-explain-core.ts) joins the signed fields into short sentences:

- `object` field → `This object is <value>.`
- `status` field → `Current status: <value>.`
- `statement` field → the value itself (sentence-terminated)
- any other field → `<key>: <value>.`

Rules:

- Restate **only** provided fields — no invented facts, hours, locations, or verification
- Same inputs → same summary (deterministic)
- No claim of verification, ownership, scan history, or legal identity
- Plain language for a stranger who just scanned a QR

The summary is bounded by the same L2 assembly limits used for `public_snapshot` (max 12 fields, key ≤ 40, value ≤ 120, plain text).

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

## Deterministic-only (no model dependency)

Decision: **resolve Priority 4 → deterministic-only** (2026-09-08) — see [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) § Implementation priority stack · [`EPHEMERAL_STATE_AND_MERCH.md`](EPHEMERAL_STATE_AND_MERCH.md).

- The `[ai]` Workers binding was **removed** from `worker/wrangler.toml` — no model is invoked anywhere on the reference operator.
- `AI_EXPLAIN_SYSTEM_PROMPT`, `buildExplainUserPrompt`, and `extractAiText` were deleted from `ai-explain-core.ts`; only the deterministic restatement remains.
- The deprecated L3 P2 draft endpoint ([`AI_L3_DRAFT_MANIFESTO.md`](AI_L3_DRAFT_MANIFESTO.md), API only) inherits deterministic output in production; its unit tests may still mock `AI`.
- Latency and cost are now bounded: one D1 rate-limit read + one deterministic join — no model round-trip.

---

## Trust copy

`AI_EXPLAIN_LIMIT` in `worker/src/resolver/trust-copy.ts` — must stay synchronized with scan panel and status JSON `limits.ai_explain_warning`.

---

## Exit checklist

| Step | Pass? |
|------|-------|
| POST with valid snapshot returns deterministic summary + disclaimer | ✅ `ai-explain-snapshot.test.ts` |
| Invalid body returns 422 | ✅ |
| Rate limit returns 429 | ✅ |
| Scan HTML includes explain button when snapshot present | ✅ `object-streams.test.ts` |
| Signed snapshot block unchanged; AI panel separate | ☐ manual |
| `GET …/status` includes `scan.ai` when snapshot present | ✅ `ai-explain-snapshot.test.ts` |
| No Workers AI binding; no model text in response | ✅ `wrangler.toml` · `ai-explain-core.ts` · `ai-explain-snapshot.test.ts` |
