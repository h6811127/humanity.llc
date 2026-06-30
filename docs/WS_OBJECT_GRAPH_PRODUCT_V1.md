# WS-OBJECT-GRAPH-PRODUCT-V1 — scan comprehension copy

**Status:** Shipped  
**Scope:** Scan HTML copy only — no authority model, map, or status JSON shape changes  
**Builds on:** [`WS_OBJECT_GRAPH_V1.md`](WS_OBJECT_GRAPH_V1.md)

---

## Goal

Make the signed witness graph block readable for a **normal scanner** (no protocol jargon) while keeping the same data model and gate logic.

---

## Copy map

| Before (V1) | After (PRODUCT-V1) |
|-------------|-------------------|
| Place in the network | **How this place connects** |
| *(none)* | **This object is part of a live network.** |
| Required by | **Before you can open this** |
| Unlocks | **Places you help unlock** |
| Row: role + Missing/Live | **Missing / Live** + next-step line |
| Trust path still waiting — {label} | **Not yet open — visit {peer} first, then return here.** |
| Place trust rules below are signed by @handle (season steward)… | **These connections were set by @handle, who runs this season — not read from this sticker alone.** |

### Next-step lines (by row)

| Role | State | Copy |
|------|-------|------|
| required_by | Missing | Visit {peer} first, then return here. |
| required_by | Live | You're clear — continue here. |
| unlocks | Live | Your visit here helped open {peer}. |
| unlocks | Missing | Visit here and witness to help open {peer}. |

Copy source: `worker/src/resolver/scan-object-graph-copy.ts`

---

## Commands

```bash
npm run verify:ws-object-graph-product
npm run ws-object-graph:v1-kit   # refresh dev HTML
npm run pages:dev              # → /dev/ws-object-graph-v1/
```

---

## Screenshots

Regenerate after kit:

| Fixture | File |
|---------|------|
| Cabinet · witness missing | `site/dev/ws-object-graph-v1/screenshots/cabinet-pending-product.png` |
| Cabinet · witness live | `site/dev/ws-object-graph-v1/screenshots/cabinet-live-product.png` |
| Library · unlocks live | `site/dev/ws-object-graph-v1/screenshots/library-unlocks-live-product.png` |

Expand **Live object details** if the graph block is collapsed in capture.

---

## Unchanged

- `scan.relationships[]` / `relationship_rules` JSON
- Witness gate evaluation · map chips · board snapshot
- Legacy `vouch_requires` path (still uses cooperation copy)
