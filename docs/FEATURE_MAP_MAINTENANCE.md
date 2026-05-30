# Feature map maintenance

**Status:** Canonical guide for the public feature map and how it relates to product specs  
**Audience:** Product, engineering, recruiters, agents updating `/features/*`  
**Source of truth (public pages):** `site/scripts/generate-feature-pages.mjs`  
**Regenerate:** `node site/scripts/generate-feature-pages.mjs` (or `npm run site:generate-features`)

---

## Three documentation layers

Do not conflate these — each has a different job:

| Layer | Location | Role |
|-------|----------|------|
| **Public feature map** | `generate-feature-pages.mjs` → `/features-available-now.html` + `/features/*.html` | Recruiter- and user-facing **phases** with why / design / safety / limits / future |
| **Product specs** | `docs/features/*.md` (5 files) | Formal requirements: Humanity Card, Human Verification, QR Public Profile, Storefront, Printify |
| **Steward device index** | [`STEWARD_DEVICE_ROADMAP.md`](STEWARD_DEVICE_ROADMAP.md) | Engineering truth for shell, inbox, hosted tier, PWA, polling |

**Conflict rule:** Policy and behavior live in canonical docs (`DEVICE_INBOX.md`, `MERCH_FUNNEL_MVP.md`, etc.) and [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md). The public map **summarizes** shipped state; if they disagree, fix the canonical doc first, then regenerate the map.

**Doc maintenance:** [`DOC_MAINTENANCE.md`](DOC_MAINTENANCE.md) — when to write specs vs archive investigations.

**Cross-links:**

- Recruiters / site visitors → [`/features-available-now.html`](../site/features-available-now.html)
- Steward shell engineering → [`STEWARD_DEVICE_ROADMAP.md`](STEWARD_DEVICE_ROADMAP.md)
- End-user guides (ownership, dot, wallet) → [`/help/`](../site/help/index.html)

---

## Hub structure (target)

The hub (`features-available-now.html`) is organized in sections. **P0** refreshed copy and badges; later steps add rows/sections without one HTML file per micro-feature.

```text
What ships today
├── Site & returning users
│   ├── On this device hub (phase 10)
│   ├── Device shell details (P1 — compact list, links to /help/)
│   ├── Studio blog (phase 11)
│   ├── Hosted steward tier (phase 13 — partial, production-gated)
│   └── Help center → /help/ (P1)
├── Commerce & belonging (P1)
│   ├── Merch funnel & QR customizer (partial)
│   └── Artifact intent (phase 8 — cross-link)
├── Protocol & resolver (phases 0–9)
└── Also on the site — case study, wallet, …
```

---

## Micro-features (device shell)

**Micro-features** are shipped steward UX that does not warrant a full five-aspect feature page each. They belong under the **device shell** story, not as phases 12–25.

| Micro-feature | Canonical doc | Public surface today |
|---------------|---------------|----------------------|
| Device inbox + badge + sheet | [`DEVICE_INBOX.md`](DEVICE_INBOX.md) | Hub, `/wallet/`, `/help/` |
| Status dot / steward green | [`STATUS_INDICATOR_STEWARD_GREEN.md`](STATUS_INDICATOR_STEWARD_GREEN.md) | Shell pages; `/help/` → live-control (link fix in P1) |
| Cross-tab keys chrome | [`CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md`](CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md) | Hub banners |
| Browser alerts + `sw-live-proof.mjs` | [`DEVICE_INBOX.md`](DEVICE_INBOX.md) § Background alerts | Opt-in; live proof only |
| Resolver tab sync | [`DEVICE_TAB_RESOLVER_SYNC.md`](DEVICE_TAB_RESOLVER_SYNC.md) | Homepage toggle (browser context; hidden in standalone — [`PWA_INSTALL.md`](PWA_INSTALL.md)) |
| PWA install | [`PWA_INSTALL.md`](PWA_INSTALL.md) | Steward shell pages only |
| Keys custody notices | [`KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md`](KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md) | Hub / wallet |
| Child-object backup gate | [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) | `/created/` |
| Ephemeral manifesto update | [`EPHEMERAL_STATE_AND_MERCH.md`](EPHEMERAL_STATE_AND_MERCH.md) | `/created/#update-status` |

**P1:** Add hub subsection **Device shell details** — compact rows linking to `/help/` anchors or canonical docs, not new `/features/*.html` files.

---

## Major features missing from the map (planned pages)

These deserve **full feature pages** (phases ~12–13), not micro-feature rows:

| Feature | Status | Phase (planned) | Canonical doc |
|---------|--------|-----------------|---------------|
| Merch funnel & storefront | Engineering ✅; operator checkout / Printify QA gates live Tier 1 | ~12 Partial | [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) |
| Hosted steward tier | M8 code complete; production rollout nearly done | ~13 Partial ✅ on feature map | [`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md) |
| Scan plain-language reader (L3 P1) | Shipped opt-in on scan | Folded into **scan-ui** limits | [`AI_L3_EXPLAIN_SNAPSHOT.md`](AI_L3_EXPLAIN_SNAPSHOT.md) |

**Product spec note:** [`features/Storefront v1.0.md`](features/Storefront%20v1.0.md) header still says “Draft for Collective Ratification”; implementation status is ahead — see [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md) and merch funnel doc.

---

## Regeneration discipline

1. Edit **`site/scripts/generate-feature-pages.mjs`** only (not hand-edit `/features/*.html` unless emergency hotfix — then backport to the script).
2. Run `node site/scripts/generate-feature-pages.mjs`.
3. Commit **both** the script and generated HTML in the same PR.
4. Update this doc’s priority table if scope changes.

**Test count on hub:** Use `WORKER_TEST_COUNT_LABEL` in the generator (rounded, e.g. `1,400+`). Exact count: `npm run worker:test`. Do not hardcode a precise number that goes stale weekly.

**Scan UI copy:** Subline must say **flat status panel** (not “flippable pass”) — aligned with [`DEVICE_HUB_REPAIR_SPEC.md`](DEVICE_HUB_REPAIR_SPEC.md) DH-6 and [`SCAN_PAGE_TRUST_UI.md`](SCAN_PAGE_TRUST_UI.md).

---

## Implementation priority

Update status as steps complete.

| Priority | Work | Status |
|----------|------|--------|
| **P0** | Generator staleness: test count label, scan-ui subline, device-hub copy (dot + hub + inbox), artifact-intent + card-types partial text, hub eyebrow (“What ships today”) | ✅ Done (2026-05-29) |
| **P1** | Hub subsection **Device shell details** + `/help/` row; expand device-hub aspects for micro-features | ✅ Done (2026-05-29) |
| **P1** | New feature page: **Merch funnel & QR customizer** (partial) | ✅ Done (2026-05-29) |
| **P2** | New feature page: **Hosted steward tier** (partial, production-gated) | ✅ Done (2026-05-29) |
| **P2** | README doc map + steward roadmap cross-links (this file, public hub URL) | ✅ Done (2026-05-29) |
| **P2** | `/help/` link fix: status dot & inbox vs live-control protocol page | ✅ Done (2026-05-29) |
| **P2** | Optional: scan-ui aspect for L3 plain-language reader | ✅ Done (2026-05-29) |

---

## P0 checklist (reference)

What P0 changed in the generator:

- [x] `WORKER_TEST_COUNT_LABEL` → recruiter line and test-harness subline
- [x] scan-ui `subHtml` → flat status panel + grouped trust blocks
- [x] scan-ui design aspect → flat panel wording (not flippable pass)
- [x] device-hub design → status dot, hub sheet, inbox, glance; not legacy “status line” only
- [x] artifact-intent → engineering shipped in repo; operator gates live checkout
- [x] card-types limits → customizer + child objects on `/created/`
- [x] Hub hero eyebrow → “What ships today” (M5 / Phase A foundation shipped)

---

## P1 checklist (reference)

What P1 changed:

- [x] Hub **Device shell details** subsection with `MICRO_FEATURES` compact rows → `/help/#device-shell`
- [x] Hub **Help center** row → `/help/`
- [x] Hub **Commerce & belonging** section: phase 12 merch funnel + phase 8 artifact intent
- [x] New `/features/merch-funnel.html` (phase 12, partial)
- [x] Expanded device-hub aspects (micro-features, resolver-confirmed alerts, dot vs live control)
- [x] `/help/#device-shell` section; split status dot from live-control protocol link

---

## P2 checklist (reference)

What P2 changed:

- [x] New `/features/hosted-steward-tier.html` (phase 13, partial, production-gated)
- [x] Hub **Site & returning users** row for hosted steward tier (ordered after studio blog)
- [x] scan-ui limits aspect — opt-in **Plain language** reader (L3 P1), not signed truth

---

## Maintenance

When you ship steward shell, commerce, or protocol work:

1. Update the **canonical** doc.
2. If the public story changes, edit `generate-feature-pages.mjs` and regenerate.
3. If only a micro-feature changed, update [`STEWARD_DEVICE_ROADMAP.md`](STEWARD_DEVICE_ROADMAP.md) and (once P1 lands) the hub micro-feature list — no new phase page required.
4. Bump priority table rows in this file in the same PR.
