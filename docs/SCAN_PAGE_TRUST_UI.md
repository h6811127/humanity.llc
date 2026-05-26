# Scan & global status UI — Path 2 (shipped direction)

**Status:** **Approved** — Path 2 with **Option 2** (hero data-arriving + corner dot one-shot sync)  
**Shipped slice:** **S1 + S2** (`pass-v32`) — production scan HTML + `scan-live-check-arrive.mjs`  
**Date:** 2026-05-26  
**Audience:** Product, design, frontend  
**Related:** [`SCAN_PAGE_DEVICE_DOT.md`](SCAN_PAGE_DEVICE_DOT.md) · [`SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) · [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md) · [`VISUAL_IDENTITY_PRINCIPLES.md`](VISUAL_IDENTITY_PRINCIPLES.md) · [`M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md)

---

## Product decision (locked)

| Choice | Decision |
|--------|----------|
| **Storyboard** | **Path 2** — L2 hero performs “data arriving”; L1 corner dot is humanity.llc **mark**; L3 actor UI later (band, not dot pulse). |
| **Dot motion** | **Option 2** — **one-shot Settle** on corner dot **synced** with hero resolve (not looping pulse, not breathe-by-default). |
| **Rejected** | Looping red dot on scan (reads as object status); steward green on stranger scan dot; Figma-only mocks. |

**North star:**

> Scan pages **perform a live check in the card**; the corner dot is **humanity.llc’s mark**; **device actions appear only after the check lands**, in explicit copy—not through dot color.

---

## Three layers (constitution)

| Layer | Name | Definition |
|-------|------|------------|
| **L1** | **Site** | Who presents the page (humanity.llc), not the scanned object or viewer keys. |
| **L2** | **Object** | Resolver truth for **this** QR at scan time + limits. |
| **L3** | **Actor** | What this tab can do (vouch, keys) — **after** L2 settles; band/chip, not dot custody colors (v1). |

**Non-negotiable (stranger):** Corner dot must not read as “the sticker is legit.” Object state animates only in the **hero**.

### Motion dictionary

| Word | Meaning | Scan (production) |
|------|---------|-------------------|
| **Settle** | Proof arrived | Hero border pulse + row stagger + limits reveal |
| **Settle (L1)** | Mark acknowledges check | `scan-page-dot--settle` once, synced via `hc-scan-live-check-settled` |
| **Breathe** | Decorative brand | Prototype only unless approved later |
| **Urgent** | Act now | Shell dot only (unsaved keys); **not** scan corner dot |

Full animation rules: [`VISUAL_IDENTITY_PRINCIPLES.md`](VISUAL_IDENTITY_PRINCIPLES.md) § Motion & data arriving.

---

## Production behavior (`pass-v32`)

### Timeline (stranger, active scan)

| Phase | L1 corner dot | L2 live check hero |
|-------|---------------|-------------------|
| **First paint** | Static red mark · `aria-label` home | `scan-live-check--pending` · strip shows **Checking live status…** · body rows hidden |
| **Checking** (~380ms min) | No loop pulse | Checking copy on strip |
| **Settle** | One-shot `scan-page-dot--settle` | Strip → resolver label (e.g. **Active**) · `.scan-arrive-item` stagger · `scan-safety--pulse` on card · limits fade in |
| **After** | Static | All motion stopped |

### Modules

| Path | Role |
|------|------|
| `site/js/scan-live-check-arrive-core.mjs` | Timing constants (Vitest) |
| `site/js/scan-live-check-arrive.mjs` | Orchestration; dispatches `hc-scan-live-check-settled` |
| `site/js/scan-page-dot.mjs` | Listens for settled → dot sync |
| `worker/src/resolver/scan-html.ts` | `scan-live-check--pending` hero, `data-arrive-label`, arrive classes |
| `worker/src/resolver/scan-safety.ts` | Initial strip copy **Checking…**; first-seen script (no duplicate pulse) |
| `site/scan-pass.css` | Arrive + dot settle CSS (bundled to Worker) |

**Header:** `X-HC-Scan-UI: pass-v32`

**Reduced motion:** Instant reveal; no hero pulse; no dot settle.

---

## Interactive prototype (design lab)

Not production — use to tune copy/timing and run hallway tests without resolver.

```bash
npm run pages:dev
# → http://localhost:8788/prototypes/scan-trust-ui-demo.html
```

See dev panel + [`site/prototypes/scan-trust-ui-demo.mjs`](../site/prototypes/scan-trust-ui-demo.mjs). Production scan uses the same CSS tokens but real resolver content.

---

## Copy sheet (production)

| Phase | String |
|-------|--------|
| Checking | **Checking live status…** |
| Resolved | Resolver strip label (`Active`, revoked labels, etc.) from `data-arrive-label` |
| Limits | `BEARER_WARNING` under hero (`scan-hero-limit`) |

### L3 (not in S1/S2 — slice S3)

| String |
|--------|
| **Keys on this device** · **You can vouch or open your cards from here.** |

---

## Mark vs control

| Surface | Role |
|---------|------|
| **Scan `#scan-page-dot`** | **Mark** — home; one-shot Settle on L2 complete; progressive custody dot (Phase 8) unchanged for operators until S3/mark-first review |
| **Shell `#brand-status-dot-btn`** | **Control** — hub; custody colors + urgent pulse |

---

## Tests

```bash
npm run worker:bundle-scan   # after scan-pass.css changes
npm run worker:test -- worker/tests/scan-live-check-arrive-core.test.ts worker/tests/scan-safety.test.ts worker/tests/scan.test.ts worker/tests/scan-hero-snapshot.test.ts
```

Manual: `docs/DEVICE_OS_QA.md` **P1-SD** (update for arrive sequence).

---

## Implementation slices

| Slice | Status | Scope |
|-------|--------|--------|
| **S1** | **Shipped** (`pass-v32`) | L2 data-arriving |
| **S2** | **Shipped** (`pass-v32`) | L1 dot one-shot sync |
| **S3** | Planned | L3 operator band after settle |
| **S4** | Planned | Shell status line primary; neutral dot when empty wallet |

---

## Hallway tests (optional validation)

Use prototype or production scan URL. Record in table below.

| Test | Pass criterion |
|------|----------------|
| **A** | ≥2/3: dot = site/logo, not sticker |
| **B** | Hero settle explains result; looping dot loses |
| **C** | Can state proves / does not prove in 30s |

| Test | Tester | Pass? | Notes |
|------|--------|-------|-------|
| A | | ☐ | |
| B | | ☐ | |
| C | | ☐ | |

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-05-26 | Path 2 + Option 2 (hero arrive + dot sync) approved |
| 2026-05-26 | S1+S2 implemented `pass-v32`; pulse removed from first-seen inline script |
| 2026-05-26 | Functional prototype for design review (no Figma) |
| TBD | S3 operator band |
| TBD | Demote Phase 8 custody colors on scan dot for strangers (mark-first) |

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-26 | Brainstorm + prototype |
| 2026-05-26 | **Approved Path 2 Option 2; S1+S2 shipped `pass-v32`** |
