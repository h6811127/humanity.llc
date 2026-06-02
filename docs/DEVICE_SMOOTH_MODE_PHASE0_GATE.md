# Smooth mode — Phase 0 gate (measure + decide)

**Status:** Active — Phase 0 lab in progress; **Phase 1 deferred** (see § Lab results)  
**Canonical plan:** [`DEVICE_LITE_MOBILE_PLAN.md`](DEVICE_LITE_MOBILE_PLAN.md)  
**QA matrix:** [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) § **P0-SMOOTH**

Phase 0 has **no user-facing Smooth mode toggle**. It establishes how heavy the **full standard bootstrap** is today so Phase 1 (UX + quiet defaults on the same graph) can be judged against targets.

---

## Automated preflight (engineering)

Run before lab sign-off or opening Phase 1:

```bash
npm run device-smooth:phase0          # baseline snapshot + Vitest
npm run device-smooth:phase0 -- --e2e  # + Playwright boot/jank proxy
```

| Check | Command | Pass when |
|-------|---------|-----------|
| Module transfer snapshot | `npm run device-shell:baseline` | Matches `worker/fixtures/device-shell-baseline.json` |
| Core math + snapshot | `npm run worker:test:device-shell-baseline` | Vitest green |
| Boot-ready proxy (CI) | `e2e/device-shell-baseline.spec.ts` | `data-boot=ready` < 20s; hub scroll OK with 10 cards |

After intentional shell graph changes: `npm run device-shell:baseline:write` in the same PR.

---

## Lab device matrix (human)

Record results in the sign-off table below. **Do not start Phase 1** until at least one **low-end** device row is filled.

| Class | Example device | Role |
|-------|----------------|------|
| Low-end ×3 | iPhone SE (2nd gen) class · **OnePlus Nord N200 5G** · Android Go · one older WebKit | Primary Phase 0 gate |
| Mid ×3 | iPhone 13 · Pixel 6a class · desktop Safari | Regression reference |
| P0-W | Production WebKit on humanity.llc (HTTPS) | Steward shell acceptance |

Follow steps in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) § **P0-SMOOTH**.

---

## Lab results (recorded)

| Device | Class | Surface | Date | S1 cold hub | S2 hub scroll | S3 `/created/` Live | Notes |
|--------|-------|---------|------|-------------|---------------|---------------------|-------|
| **OnePlus Nord N200 5G** · 4 GB RAM · Snapdragon octa-core · Android 12 · ~$100 | Low-end **1/3** | Chrome + **PWA standalone** · production `humanity.llc` | 2026-06-01 / **2026-06-02** | **Jumpy** cold first hub open; **Pass** warm reopen | **Pass** (1, 4, **7 cards**) | **Pass** | 2026-06-02 follow-up **signed pass** — scroll @ 7 cards OK; PWA standalone OK; create rate limit blocked 10 (large-wallet paths not exercised). |

**Interim read (Nord N200 — follow-up complete 2026-06-02):** **Steady-state pass** on this budget Android (4 GB): warm hub, 7-card scroll, PWA standalone, `/created/` Live. **Cold first hub open** remains the only rough edge (bootstrap / first paint). **Smooth mode Phase 1** is unlikely to fix that; prefer boot-graph investigation or Phase 4 if cold boot stays unacceptable across the full low-end matrix.

**Nord row closed** for Phase 0 purposes pending 2 more low-end devices in the matrix.

---

## Metrics to record (per device)

| Metric | How to measure | Phase 1 target (same bootstrap) |
|--------|----------------|----------------------------------|
| **TTI proxy** | Stopwatch: cold load `/` → dot shows state + hub tap opens | ≤ **50%** of standard median on low-end after Phase 1 |
| **Boot-ready ms** | DevTools → Performance, or `[device-shell-baseline] boot-ready-ms=` from E2E on same network | Baseline only in Phase 0 |
| **Scroll jank** | Hub open, 10 saved cards, fling scroll — subjective | Subjective pass on 3 lab devices |
| **Transfer size** | `npm run device-shell:baseline -- --json` | Baseline only in Phase 0 |

---

## Path 1 gate (locked decision)

> If **UX simplification + quiet background defaults** on the **same bootstrap** meet § Success metrics on lab low-end devices → **Path 1 sufficient** — skip Phase 4 separate graph.

| Question | Answer | Sign-off |
|----------|--------|----------|
| Automated Phase 0 preflight green? | ☑ **Y** | Engineer |
| Low-end lab matrix complete (≥3 devices)? | ☐ **N** (1/3 — Nord N200) | QA |
| **Path 1 sufficient** for low-end targets? | ☑ **Y** (Nord steady-state pass) · ☑ **N** (cold first hub open still rough on Nord) · **Interim:** defer Phase 1 until ≥2 more low-end rows | Product + eng |
| Proceed to Phase 1 implementation? | ☑ **N — deferred** | Eng |

**Date signed:** 2026-06-02 (Nord follow-up pass — matrix still 1/3)  
**Notes:** Nord N200 @ 4 GB RAM is a valid **budget low-end** lab device. Nord follow-up **pass** (7-card scroll, PWA standalone, warm hub). Do **not** start `device-shell-tier.mjs` until ≥2 more low-end rows + one iPhone SE–class WebKit row. If cold boot remains the only failure mode across lab devices, prefer **boot graph investigation** ([`SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md`](SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md) / optional Phase 4) over Smooth mode Phase 1.

---

## Changelog

| Date | Note |
|------|------|
| 2026-06-02 | **Nord follow-up signed pass** — 7-card scroll, PWA standalone, warm hub; cold open still jumpy |
| 2026-06-02 | Baseline snapshot refreshed after shell status line removal; Phase 0 E2E in device-shell CI bundle |
| 2026-06-01 | **Lab row 1** — OnePlus Nord N200 5G (4 GB, Android 12, Chrome/prod): cold hub jumpy; steady-state pass @ 4 cards; Phase 1 **deferred** |
| 2026-06-01 | Phase 0 gate doc — baseline script, snapshot fixture, P0-SMOOTH QA matrix |
