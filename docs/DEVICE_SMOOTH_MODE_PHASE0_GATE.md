# Smooth mode — Phase 0 gate (measure + decide)

**Status:** Phase 0 lab **complete (3/3)** · **Phase 1 deferred** — Nord N200 cold hub only outlier; boot-graph investigation preferred  
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

| Check | Command | Pass when | Last run |
|-------|---------|-----------|----------|
| Module transfer snapshot | `npm run device-shell:baseline` | Matches `worker/fixtures/device-shell-baseline.json` | ☑ **2026-06-02** — shell v82, 70 modules, 465.1 KiB graph |
| Core math + snapshot | `npm run worker:test:device-shell-baseline` | Vitest green | ☑ **2026-06-02** — 7 tests |
| Boot-ready proxy (CI) | `e2e/device-shell-baseline.spec.ts` | `data-boot=ready` < 20s; hub scroll OK with 10 cards | ☑ **2026-06-02** — `boot-ready-ms=623` (desk Chromium · local Pages) |

**Desk proxy only:** Playwright on a developer Mac is **not** a low-end lab row. Use it to catch regressions; record real hardware in § Lab results.

After intentional shell graph changes: `npm run device-shell:baseline:write` in the same PR.

---

## Lab device matrix (human)

Record results in the sign-off table below. **Do not start Phase 1** until at least one **low-end** device row is filled.

| Class | Example device | Role |
|-------|----------------|------|
| Low-end ×3 | iPhone SE (2nd gen) class · **OnePlus Nord N200 5G** · Android Go · one older WebKit | Primary Phase 0 gate |
| Mid ×3 | iPhone 13 · Pixel 6a class · desktop Safari | Regression reference |
| P0-W | Production WebKit on humanity.llc (HTTPS) | Steward shell acceptance |

Follow steps in [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) § **P0-SMOOTH**. Use § **Lab capture worksheet** below — one session per device (~20 min).

**Low-end row targets (fill in order):**

| Slot | Target hardware | Minimum spec | Surface |
|------|-----------------|--------------|---------|
| **2/3** | iPhone SE (2nd gen) or equivalent | 3 GB RAM · A13 or older · iOS 15+ | **Safari** + optional PWA standalone · production `https://humanity.llc` |
| **3/3** | Android Go or 3 GB budget phone | ≤4 GB RAM · Go edition or 2020–2022 budget tier | **Chrome** · production HTTPS |

---

## Lab results (recorded)

| Device | Class | Surface | Date | S1 cold hub | S2 hub scroll | S3 `/created/` Live | Notes |
|--------|-------|---------|------|-------------|---------------|---------------------|-------|
| **OnePlus Nord N200 5G** · 4 GB RAM · Snapdragon octa-core · Android 12 · ~$100 | Low-end **1/3** | Chrome + **PWA standalone** · production `humanity.llc` | 2026-06-01 / **2026-06-02** | **Jumpy** cold first hub open; **Pass** warm reopen | **Pass** (1, 4, **7 cards**) | **Pass** | 2026-06-02 follow-up **signed pass** — scroll @ 7 cards OK; PWA standalone OK; create rate limit blocked 10 (large-wallet paths not exercised). |
| **iPhone SE (2nd gen) class** | Low-end **2/3** | Safari · production HTTPS | **2026-06-02** | **Pass** | **Pass** | **Pass** | Signed pass — operator sign-off |
| **Android Go / 3 GB budget** | Low-end **3/3** | Chrome · production HTTPS | **2026-06-02** | **Pass** | **Pass** | **Pass** | Signed pass — operator sign-off |

### Desk proxy (does not count toward low-end 3/3)

| Device | Class | Surface | Date | boot-ready-ms (E2E) | Notes |
|--------|-------|---------|------|---------------------|-------|
| Mac desk · Playwright **Pixel 5** profile | CI proxy | Chromium · local Pages `:8788` | 2026-06-02 | **623** | Empty wallet · mocked health · hub scroll @ 10 cards pass |

**Phase 0 read (matrix complete 2026-06-02):** **3/3 low-end rows signed pass.** iPhone SE class (Safari) and Android Go / 3 GB budget (Chrome) passed S1–S3 on production HTTPS. Nord N200 remains the only device with a **jumpy cold first hub open**; steady-state pass on all three. **Smooth mode Phase 1** is still unlikely to fix Nord cold boot — prefer **boot-graph investigation** ([`SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md`](SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md)) over Phase 1 UX/quiet-defaults work.

**Low-end matrix closed** for Phase 0 gate purposes.

---

## Lab capture worksheet (one session · ~20 min)

Copy this block into the lab results table when done. Run on **production** `https://humanity.llc` unless noted.

**Before S1:** Settings → clear site data for humanity.llc (or private tab + no prior wallet).

| Step | Action | Record |
|------|--------|--------|
| S0 | `npm run device-shell:baseline -- --json` on desk (optional) | Transfer bytes reference only |
| S1 | Cold load `/` → wait for dot state → tap dot → hub opens | TTI stopwatch (s): _____ · Cold hub: **Jumpy / Pass** |
| S2 | Save or seed **10 cards** (or max available); open hub; fling scroll saved list | **Pass / Fail** @ ___ cards · Notes: _____ |
| S3 | Open `/created/` with keys in wallet → Live tab | **Pass / Fail** · Signing UI responsive? |
| S4 | Optional: repeat S1 warm (no clear) | Compare cold vs warm |
| S5 | Optional PWA: Add to Home Screen → repeat S1–S2 in standalone | Separate note in row |

**Sign-off line:** `[Device model]` · `[Date]` · Tester: _____ · Slot **2/3** or **3/3**

When rows 2/3 and 3/3 are filled, update Path 1 gate § Low-end lab matrix to **3/3** and re-evaluate Phase 1 deferral.

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
| Low-end lab matrix complete (≥3 devices)? | ☑ **Y** (3/3) | QA |
| **Path 1 sufficient** for low-end targets? | ☑ **Y** (steady-state on all 3) · ☑ **N** (Nord cold first hub still jumpy; SE + Android Go pass cold) | Product + eng |
| Proceed to Phase 1 implementation? | ☑ **N — deferred** (boot graph for Nord cold open first) | Eng |

**Date signed:** 2026-06-02 (low-end matrix **3/3** — rows 2/3 + 3/3 operator pass)  
**Notes:** Do **not** start `device-shell-tier.mjs`. Nord N200 cold boot is isolated; iPhone SE class + Android Go pass full S1–S3. Next engineering focus: **RC-18** boot graph / first paint ([`SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md`](SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md) § RC-18), not Smooth mode Phase 1 quiet-defaults.

---

## Next engineering (RC-18)

After Phase 0 gate sign-off, **RC-18** is the only open boot-graph item:

| Step | Action | Owner |
|------|--------|-------|
| R1 | Nord N200 cold S1 repro on production (cleared site data) | QA / eng |
| R2 | USB Performance trace: empty wallet → dot → hub; repeat @ 1 and 7 cards | Eng |
| R3 | Same S1 on iPhone SE class (control — pass device) | QA |
| R4 | Classify: content flash vs layout jank vs both | Eng |
| R5 | Targeted fix or written deferral in shell flash doc § RC-18 | Eng + product |

Desk gates (`npm run device-smooth:phase0 -- --e2e`, `worker:test:shell-boot`) catch regressions only — they **do not** substitute for R1–R3 on Nord hardware.

---

## Changelog

| Date | Note |
|------|------|
| 2026-06-02 | **RC-18 handoff** — boot-graph investigation scoped in shell flash doc; Nord repro + trace pending |
| 2026-06-02 | **Low-end matrix 3/3** — iPhone SE class + Android Go signed pass (S1–S3); Nord cold hub remains only outlier |
| 2026-06-02 | **Lab matrix rows 2–3** — pending templates + desk E2E proxy (`boot-ready-ms=623`); lab capture worksheet added |
| 2026-06-02 | **Automated preflight recorded** — baseline v82 / 465.1 KiB graph · Vitest + E2E green |
| 2026-06-02 | **Nord follow-up signed pass** — 7-card scroll, PWA standalone, warm hub; cold open still jumpy |
| 2026-06-02 | Baseline snapshot refreshed after shell status line removal; Phase 0 E2E in device-shell CI bundle |
| 2026-06-01 | **Lab row 1** — OnePlus Nord N200 5G (4 GB, Android 12, Chrome/prod): cold hub jumpy; steady-state pass @ 4 cards; Phase 1 **deferred** |
| 2026-06-01 | Phase 0 gate doc — baseline script, snapshot fixture, P0-SMOOTH QA matrix |
