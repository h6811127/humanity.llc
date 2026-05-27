# L3 P2 — Steward authoring assistant

**Status:** Shipped  
**Parent:** [`AI_FEATURE_DEVELOPMENT.md`](AI_FEATURE_DEVELOPMENT.md) · [`MANIFESTO_STATUS_UPDATE.md`](MANIFESTO_STATUS_UPDATE.md)

---

## Goal

Stewards on `/created/` can request an **AI draft** of manifesto copy and optional object stream rows. The draft fills the update form only — the steward **must still sign and submit** `POST …/cards/{id}/update` to publish.

---

## Non-goals

- Auto-publish to resolver
- Scan-page changes
- Draft without owner context (public anonymous drafting)

---

## API

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/.well-known/hc/v1/ai/draft-manifesto` |
| **Auth** | None (rate-limited per IP; owner signing still required to publish) |
| **CORS** | Same allowlist as other hc/v1 routes |

### Request body

```json
{
  "pilot_template": "status_plate",
  "hint": "Closed early · compost turn needed",
  "current": {
    "manifesto_line": "Studio door\nOpen until 9 PM",
    "object_streams": [{ "label": "Tasks", "value": "Water bed 3", "class": "care" }]
  }
}
```

`pilot_template`: `status_plate` | `general` | `lost_item_relay`

### Response (200)

```json
{
  "draft": {
    "object_label": "Studio door",
    "status_line": "Closed early today",
    "manifesto_line": "Studio door\nClosed early today",
    "object_streams": [{ "label": "Tasks", "value": "Turn compost", "class": "care" }]
  },
  "source": "workers_ai",
  "disclaimer": "AI draft — review and sign to publish…",
  "limits": { "ai_draft_warning": "…" }
}
```

Shape varies by pilot (relay uses `relay_item` / `relay_message`; general uses `manifesto_line`).

---

## Owner UI (`/created/`)

In **What scanners see** / manifesto update form:

1. Optional hint textarea
2. **Suggest draft with AI** (opt-in)
3. Preview panel (dashed orange — not signed state styling)
4. **Use this draft** → fills form fields
5. Steward clicks **Publish update** → existing signed update flow

Module: `site/js/created-ai-draft.mjs`

---

## Rate limit

**20 requests / IP / hour** — bucket prefix `ai_draft:` in D1.

---

## Implementation

| Piece | Path |
|-------|------|
| Core | `worker/src/resolver/ai-draft-core.ts` |
| Handler | `worker/src/resolver/ai-draft-manifesto.ts` |
| Trust copy | `AI_DRAFT_LIMIT` in `worker/src/resolver/trust-copy.ts` |
| Rate limit | `checkAiDraftRateLimit` in `worker/src/db/rate-limit.ts` |

Workers AI model: `@cf/meta/llama-3.1-8b-instruct` (JSON response). Deterministic fallback when AI unavailable.

---

## Exit checklist

| Step | Pass? |
|------|-------|
| POST draft returns validated shape | ✅ `ai-draft-manifesto.test.ts` |
| Invalid pilot returns 422 | ✅ |
| Rate limit returns 429 | ✅ |
| `/created/` shows draft UI for plate/general/relay | ☐ manual |
| Submit Update still required to publish | ✅ by design |

---

## Related

| Doc | Role |
|-----|------|
| [`AI_L3_EXPLAIN_SNAPSHOT.md`](AI_L3_EXPLAIN_SNAPSHOT.md) | L3 P1 stranger explainer |
| [`LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md`](LOCALIZED_OBJECT_INTELLIGENCE_BOUNDARY.md) | L0–L3 layers |
