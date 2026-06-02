# Cedar Rapids city game — comprehension runbook (GT-1–GT-6)

**Status:** Runbook ready; **human execution pending** (≥5 testers)  
**Gate:** [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) § Game theory acceptance tests · Launch gates § Copy comprehension  
**Prerequisite:** Prototype nodes live on staging with `CITY_GAME_ENABLED=1`; rules draft at [`/play/cedar-rapids/`](../site/play/cedar-rapids/index.html) (read aloud OK).  
**Companion:** [`FOUNDING_COPY_COMPREHENSION_RUNBOOK.md`](FOUNDING_COPY_COMPREHENSION_RUNBOOK.md) pattern · `npm run verify:city-game`

---

## Engineering preflight (not a substitute for human testers)

| Step | Command | Pass when | Record |
|------|---------|-----------|--------|
| Copy guard | `npm run verify:city-game` | Includes `city-game-game-theory.test.ts` | ☑ **2026-06-02** |
| Staging URLs | Seed or mint on staging | `node_04`, `node_07`, sanctuary, `node_14` reachable | ☐ |
| Install scenarios | [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) § Scenario spot-checks | Operator spot-check on one phone | ☐ |

Do **not** mark GT-1–GT-6 passed until ≥5 un coached testers complete the scorecard below.

---

## Core questions

After scanning **one live game node** (or hearing you read the scan copy aloud), ask:

> **1) Did you win something personal, or did the city unlock something together?**  
> **2) Would hiding the seed clue help you or hurt the group?**  
> **3) Which nodes feel like safe regroup zones with no capture?**  
> **4) On the cabinet node — do you need an account, or just trust from another place?**  
> **5) If maintenance says paused, do game bulletins count as safety truth?**  
> **6) Can you name your rank, streak, or scan count anywhere on the page?**

Do not explain game theory unless they are stuck after one neutral prompt.

---

## Who counts

- Not operators who wrote flip copy, not someone who built the resolver.
- OK: friend in Cedar Rapids, curious stranger at a install site, playtester who did not author docs.
- Each tester uses their **own phone** (Safari or Chrome).

Minimum **5** testers before marking GT comprehension passed.

---

## Pre-flight (operator, ~10 minutes)

1. `npm run verify:city-game` green on the branch you will demo.
2. Staging scan URLs for at least: `node_04` (River Lantern), `node_07` (cabinet), `node_02` or `node_12` (sanctuary), `node_14` (care loop with pause flip ready).
3. Read [`docs/CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) scenario spot-checks.

---

## Per-tester scorecard

| # | Check | Pass? |
|---|--------|-------|
| GT-1 | Describes River Lantern unlock as **“we unlocked it together,”** not “I won” | ☐ |
| GT-2 | Says sharing the seed clue **helps the group**, not hurts them | ☐ |
| GT-3 | Identifies café/bench nodes as **non-capture regroup** zones | ☐ |
| GT-4 | Understands cabinet private vs shared ending **without account signup** | ☐ |
| GT-5 | When care stream says paused, **does not** treat game bulletins as safety truth | ☐ |
| GT-6 | **Cannot** name a personal rank, streak, or scan count on scan | ☐ |

**Pass bar:** GT-1, GT-2, GT-6 required for every tester; at most one miss across GT-3–GT-5 per tester. **≥5/5** testers pass.

**Fail action:** Fix scan copy in node templates or rules page; re-run `npm run verify:city-game`; re-test with 3+ new strangers.

---

## What you send (copy-paste)

> Quick playtest (~5 min) on your phone — scan this node:  
> `[staging scan URL]`  
>  
> Then tell me:  
> 1) Did **you** win, or did the **city** unlock something together?  
> 2) Would **hiding** the clue help you or hurt everyone else?  
> 3) Any place that feels like a **safe regroup** with no capture?  
> 4) Do you need an **account** to go deeper, or trust from another place?  
> 5) If it says **maintenance pause**, would you trust game bulletins for safety?  
> 6) Do you see a **rank, streak, or scan count** anywhere?

---

## Sign-off

| Field | Value |
|-------|--------|
| Date | `[YYYY-MM-DD]` |
| Testers (count) | `[≥5]` |
| Pass count | `[n/5]` |
| Result | `[ ] Pass · [ ] Fail — copy fix before launch` |

When passed, update [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) GT-1–GT-6 checkboxes and Launch gates § Copy comprehension.
