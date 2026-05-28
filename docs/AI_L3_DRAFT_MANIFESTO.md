# L3 P2 — Steward draft API (UI retired)

**Status:** **UI retired** (2026-05-27) — API kept for tests/integrators only  
**Parent:** [`AI_FEATURE_DEVELOPMENT.md`](AI_FEATURE_DEVELOPMENT.md) · [`MANIFESTO_STATUS_UPDATE.md`](MANIFESTO_STATUS_UPDATE.md)

---

## Decision

**Steward ghostwriting is off-brand for humanity.llc.** Stewards write manifesto copy themselves and sign with their key. The `/created/` “Suggest draft with AI” UI was removed per [AI_FEATURE_DEVELOPMENT.md § Concrete next steps](AI_FEATURE_DEVELOPMENT.md#concrete-next-steps) step 1.

The **HTTP API remains** so existing tests pass and third-party integrators *could* call it—but the reference operator does **not** expose or document it in product UI.

---

## Goal (historical)

Stewards could request an AI draft of manifesto copy and optional object stream rows. The draft filled the update form only—the steward **had to still sign and submit** `POST …/cards/{id}/update` to publish.

---

## Non-goals (unchanged)

- Auto-publish to resolver
- Scan-page changes
- Product UI on `/created/` (**retired**)

---

## API (deprecated — no product UI)

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/.well-known/hc/v1/ai/draft-manifesto` |
| **Auth** | None (rate-limited per IP) |
| **Product exposure** | **None** — not linked from Pages or device shell |

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
    "manifesto_line": "Studio door\nClosed early today"
  },
  "source": "workers_ai",
  "disclaimer": "AI draft — review and sign to publish…",
  "limits": { "ai_draft_warning": "…" }
}
```

---

## Owner UI

**Removed.** Stewards use the manifesto update form only (`site/js/created-manifesto-update.mjs`).

~~Module: `site/js/created-ai-draft.mjs`~~ — deleted.

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

---

## Exit checklist

| Step | Pass? |
|------|-------|
| POST draft returns validated shape | ✅ `ai-draft-manifesto.test.ts` |
| `/created/` has **no** draft UI | ✅ step 1 (2026-05-27) |
| Docs state UI retired | ✅ |
| Submit Update still required to publish | ✅ by design |

---

## Related

| Doc | Role |
|-----|------|
| [`AI_L3_EXPLAIN_SNAPSHOT.md`](AI_L3_EXPLAIN_SNAPSHOT.md) | P1 scan reader (under review) |
| [`AI_FEATURE_DEVELOPMENT.md`](AI_FEATURE_DEVELOPMENT.md) | Brand direction + next steps |
