# Documentation maintenance

**Status:** Canonical policy  
**Audience:** Humans and agents writing or updating docs

---

## Three layers (do not conflate)

| Layer | Location | Role |
|-------|----------|------|
| **Invariants** | [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) | Rules that must stay true in code — update when behavior changes |
| **Feature custody specs** | e.g. [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md), [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md), [`CUSTODY_PHASE0_RUNBOOK.md`](CUSTODY_PHASE0_RUNBOOK.md), [`HUB_CARD_SAFARI_RELIABILITY.md`](HUB_CARD_SAFARI_RELIABILITY.md) | Slim canonical guides for complex shipped areas |
| **Indexes** | [`STEWARD_DEVICE_ROADMAP.md`](STEWARD_DEVICE_ROADMAP.md), [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md) | Where work lives, regression commands, active PRs |
| **Feature specs** | Named `*_MVP.md`, `DEVICE_*.md`, `LIVE_OBJECT_ARCHITECTURE.md`, etc. | Product policy and implementation detail for one concern |

Public feature map (recruiter-facing) is separate — see [`FEATURE_MAP_MAINTENANCE.md`](FEATURE_MAP_MAINTENANCE.md).

---

## When to write what

| Situation | Action |
|-----------|--------|
| Bug fix with a lasting rule | Add row to [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) + test |
| Bug fix, no new rule | GitHub issue or PR description only — **no new investigation doc** |
| Multi-day root-cause hunt | One `*_INVESTIGATION.md` while open; on close, migrate invariants → archive file |
| Closed investigation | Move to [`archive/`](archive/); leave stub at old path if heavily linked from code |
| Agent handoff | Update [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md) changelog only |

---

## Archive

Closed investigations and historical merge notes live in [`docs/archive/`](archive/). See [`archive/README.md`](archive/README.md) for the index.

**Do not** treat archived docs as active policy. Follow [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) and the canonical spec for each feature.

---

## AGENTS.md

[`AGENTS.md`](../AGENTS.md) is **environment bootstrap only** (Node version, dev commands, invariant pointers). Feature detail belongs in the docs above — not in AGENTS.md.
