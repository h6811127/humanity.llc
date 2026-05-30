# Scan & global status UI — Path 2 (shipped direction)

**Status:** **Approved** — Path 2 with **Option 2** (hero data-arriving + corner dot one-shot sync)  
**Shipped slices:** **S1 + S2** (`pass-v32`) · **S3** (`pass-v33`) L3 actor band · **S4** shell status line + neutral empty-wallet dot  
**Date:** 2026-05-26  
**Audience:** Product, design, frontend  
**Related:** [`SCAN_PAGE_DEVICE_DOT.md`](SCAN_PAGE_DEVICE_DOT.md) · [`SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) · [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md) · [`VISUAL_IDENTITY_PRINCIPLES.md`](VISUAL_IDENTITY_PRINCIPLES.md) · [`M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md) · [`SCAN_HERO_CARD_VISUAL_SPEC.md`](SCAN_HERO_CARD_VISUAL_SPEC.md) (surface + depth) · [`MERCH_VISUAL_CHOREOGRAPHY.md`](MERCH_VISUAL_CHOREOGRAPHY.md) (Beat 2 — stranger notary; do not add merch delight here)

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

**Not object-intelligence L3:** The **L3 actor band** is scan UI only. Optional **AI explain** (plain-language summary of signed snapshot) is object-intelligence **L3 P1** — separate panel, opt-in, not signed state. See [`AI_FEATURE_DEVELOPMENT.md`](AI_FEATURE_DEVELOPMENT.md) § Naming collision · [`AI_L3_EXPLAIN_SNAPSHOT.md`](AI_L3_EXPLAIN_SNAPSHOT.md).

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

## Production behavior (`pass-v33`)

### Timeline (stranger, active scan)

| Phase | L1 corner dot | L2 live check hero |
|-------|---------------|-------------------|
| **First paint** | Static red mark · `aria-label` home | `scan-live-check--pending` · strip shows resolver label from SSR · body rows hidden |
| **Checking** (~380ms min, skipped when SSR strip matches `data-arrive-label`) | No loop pulse | Legacy/cached HTML may still show **Checking…** — client holds then settles |
| **Settle** | One-shot `scan-page-dot--settle` | Strip → resolver label (e.g. **Active**) · `.scan-arrive-item` stagger · `scan-safety--pulse` on card · limits fade in |
| **After** | Static | All motion stopped |

### Operator (L3, after settle)

| Phase | Band |
|-------|------|
| Before settle | Hidden (`#scan-actor-band`) |
| ~220ms after settle | Slides in when viewer has keys / saved wallet / default vouch profile on **active** scan |
| Actions | **Go to vouch** (scroll to vouch block) · **My cards** → `/wallet/` |

Strangers and non-active scans: no band markup.

### Modules

| Path | Role |
|------|------|
| `site/js/scan-live-check-arrive-core.mjs` | Timing constants + `shouldUseScanArriveSsrFastPath()` (Vitest) |
| `site/js/scan-live-check-arrive.mjs` | Orchestration; dispatches `hc-scan-live-check-settled` |
| `site/js/scan-page-dot.mjs` | Listens for settled → dot sync |
| `worker/src/resolver/scan-html.ts` | `scan-live-check--pending` hero, `data-arrive-label`, arrive classes |
| `worker/src/resolver/scan-safety.ts` | Initial strip copy **Checking…**; first-seen script (no duplicate pulse) |
| `site/scan-pass.css` | Arrive + dot settle + actor band CSS (bundled to Worker) |
| `site/js/scan-actor-band.mjs` | L3 band reveal after `hc-scan-live-check-settled` |
| `site/js/scan-actor-band-core.mjs` | Band eligibility (Vitest) |

**Header:** `X-HC-Scan-UI: pass-v33`

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

### L3 (S3 shipped)

| String |
|--------|
| **Keys on this device** |
| **You can vouch or open your cards from here.** |
| Primary: **Go to vouch** · Secondary: **My cards** |

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
npm run worker:test -- worker/tests/scan-live-check-arrive-core.test.ts worker/tests/scan-safety.test.ts worker/tests/scan.test.ts worker/tests/scan-hero-snapshot.test.ts worker/tests/device-dot-state.test.ts
npm run e2e:scan-page-dot
npm run e2e:scan-hero-visual
npm run e2e -- e2e/device-status-dot.spec.ts -g "shell S4"
```

Manual: `docs/DEVICE_OS_QA.md` **P1-SD** (scan arrive + hero) · **P0-3b** (shell S4 empty wallet).

---

## Implementation slices

| Slice | Status | Scope |
|-------|--------|--------|
| **S1** | **Shipped** (`pass-v32`) | L2 data-arriving |
| **S2** | **Shipped** (`pass-v32`) | L1 dot one-shot sync |
| **S3** | **Shipped** (`pass-v33`) | L3 operator band after settle |
| **S4** | **Shipped** | Shell status line primary; neutral dot when empty wallet |

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
| 2026-05-26 | S3 operator band after settle (`pass-v33`) |
| 2026-05-26 | Mark-first scan dot shipped (`pass-v35`); S4 shell chrome shipped (neutral empty-wallet dot + `#shell-status-line`) |

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-26 | **S4 shipped** — shell `#shell-status-line` + neutral empty-wallet dot |
| 2026-05-26 | Brainstorm + prototype |
| 2026-05-26 | **Approved Path 2 Option 2; S1+S2 shipped `pass-v32`** |
| 2026-05-26 | **S3 shipped `pass-v33`** — L3 actor band |
