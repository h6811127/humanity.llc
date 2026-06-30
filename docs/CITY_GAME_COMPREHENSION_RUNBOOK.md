# Cedar Rapids city game — comprehension runbook (GT-1–GT-8)

**Status:** GT comprehension **passed** (2026-06-03) (≥5 testers)  
**Gate:** [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) § Game theory acceptance tests · Launch gates § Copy comprehension  
**Prerequisite:** Prototype nodes live on staging with `CITY_GAME_ENABLED=1`; rules draft at [`/play/cedar-rapids/`](../site/play/cedar-rapids/index.html) (read aloud OK).  
**Companion:** [`FOUNDING_COPY_COMPREHENSION_RUNBOOK.md`](FOUNDING_COPY_COMPREHENSION_RUNBOOK.md) pattern · `npm run verify:city-game`

---

## Engineering preflight (not a substitute for human testers)

| Step | Command | Pass when | Record |
|------|---------|-----------|--------|
| Copy guard | `npm run verify:city-game` | Includes `city-game-game-theory.test.ts` | ☑ **2026-06-02** |
| City board E2E | `npm run e2e:city-game-map-board` | Static board + snapshot chips on `.city-game-map-node-live` | ☑ **2026-06-03** |
| SF-3 / GT-8 engineering | `npm run city-game:network-lens-preflight` | Board + rules emphasis plates + `network_lens` JSON | ☑ **2026-06-21** |
| GT-8 field walk kit | `npm run city-game:network-lens-gt8-kit -- --production` or `city-game:comprehension-kit -- --production` | [gt8-field-walk.html](../site/play/cedar-rapids/comprehension/gt8-field-walk.html) — 10s timer + B1–B7 | ☑ **2026-06-21** |
| LAN GT-8 (rainy day) | `npm run city-game:comprehension-kit` (or `--lan`) | [site/dev/city-game-gt8-field-walk.html](../site/dev/city-game-gt8-field-walk.html) + map at `:8788/play/cedar-rapids/map/` | ☑ **2026-06-21** |
| B13 privacy engineering | `npm run city-game:map-board-privacy-preflight` | Snapshot JSON shape + public surface copy | ☑ **2026-06-21** |
| SF-3 GT-8 sign-off | `npm run city-game:network-lens-sign-off -- --pass --apply` | ≥4/5 testers in per-tester log | ☐ After human pass |
| Phase D status | `npm run city-game:launch-preflight` | Engineering green; human blockers listed | ☑ **2026-06-03** |
| Tester URLs | `npm run city-game:comprehension-kit -- --production` | https://humanity.llc/play/cedar-rapids/comprehension/ | ☑ **2026-06-03** |
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
> **7)** Open [`/play/cedar-rapids/map/`](../site/play/cedar-rapids/map/) — **does the weekend board show what the city knows, or what you personally did?**  
> **8)** Same URL, fresh open — **within 10 seconds**, can you point to where you would go first (no coaching)?

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
2. **Local:** `npm run city-game:dev` (or `--bootstrap` first time) — opens scan hub; comprehension kit at `http://127.0.0.1:8788/dev/city-game-comprehension`. **Regenerate only:** `npm run city-game:comprehension-kit`.
3. **Staging:** mint/seed URLs for `node_04`, `node_07`, sanctuary (`node_02` or `node_12`), `node_14`.
4. Read [`docs/CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) scenario spot-checks.

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
| GT-7 | On weekend city board at `/play/cedar-rapids/map/`: describes **shared world** chips, not “my visits” or GPS tracking | ☐ Required when marketing live board (**B13**) |
| GT-8 | On network lens: points to a **first stop on the map within 10s** (un coached, no paragraph read) | ☐ Required for **SF-3** / network lens v2 sign-off ([`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md)) |

**Pass bar:** GT-1, GT-2, GT-6 required for every tester; at most one miss across GT-3–GT-5 per tester. **≥5/5** testers pass. When marketing a live board (**B13**), GT-7 required for every tester too. When signing off **network lens v2** (SF-3), GT-8 required for **≥4/5** testers (same cohort OK).

**Fail action:** Fix scan copy in node templates or rules page; re-run `npm run verify:city-game`; re-test with 3+ new strangers.

---

## What you send (copy-paste)

Run `npm run city-game:comprehension-kit` — the page includes this block with the live **`node_04`** URL filled in. Or paste manually:

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
7) On the **weekend city board** (`/play/cedar-rapids/map/`) — does it show what the **city** knows, or what **you** did?  
8) Same board — where would you **go first** (point on screen)?

---

## P1 session script (operator)

**You run the session.** The tester uses their own phone. Do not explain game theory unless they are stuck after one neutral prompt (“What do you think that means?”).

**Order (~10 minutes):**

1. Send the **rules link only** first — wait until they have browsed (How to start + place list).
2. Ask **W1–W3** (wayfinding) before any scan.
3. Send the **River Lantern scan link** — wait for them to read the page.
4. Ask **GT-1–GT-6** from the scan (and rules if needed).
5. Send **`/play/cedar-rapids/map/`** — ask **GT-7**, then **GT-8** (point to first stop within 10s).

**Production URLs (2026-06-22):**

| Step | URL |
|------|-----|
| Rules | https://humanity.llc/play/cedar-rapids/ |
| Operator kit (you) | https://humanity.llc/play/cedar-rapids/comprehension/ |
| Primary scan (node_04) | https://humanity.llc/c/GcP3Ee17yGqMHdidhEVMYBzq?q=qr_aMr8qJGBF9xpC1gu |
| City board (GT-7, GT-8) | https://humanity.llc/play/cedar-rapids/map/ |
| GT-8 field walk (operator) | https://humanity.llc/play/cedar-rapids/comprehension/gt8-field-walk.html |
**Optional spot checks** (second pass or strong testers only — links on kit page):

- GT-3 sanctuary: NewBo café window (`node_02`)
- GT-4 cabinet: Czech Village cabinet (`node_07`)
- GT-5 care: River fountain / rain garden (`node_14`)

**Pre-window note (before 2026-06-06 6pm CT):** Scans stay readable; contribute UI is hidden until the season opens. Collective progress (e.g. 4/20) and “share outward” copy still support GT-1/GT-2. Board rows may show “Scan for live state” until the window — GT-7 still passes if they describe **shared city truth**, not personal visits or GPS.

**Disqualify:** anyone who wrote copy, built the resolver, or was coached through answers.

---

## Text to send (tester 1 — copy-paste)

> Hey — quick 10‑minute phone playtest for a Cedar Rapids weekend game. No app, no account.
>
> **Step 1:** Open this on your phone and read like a friend sent it (don’t scan anything yet):  
> https://humanity.llc/play/cedar-rapids/
>
> Reply with:  
> W1) How would you decide where to go first?  
> W2) Would you use the dot sketch, the place list, or your maps app from home?  
> W3) Could you find “Riverwalk River Lantern” before scanning?
>
> **Step 2:** I’ll send a scan link next.

After their wayfinding replies, send:

> **Step 3:** Scan this sticker URL:  
> https://humanity.llc/c/GcP3Ee17yGqMHdidhEVMYBzq?q=qr_aMr8qJGBF9xpC1gu
>
> Then:  
> 1) Did **you** win, or did the **city** unlock something together?  
> 2) Would **hiding** the clue help you or hurt everyone?  
> 3) Any place that feels like a **safe regroup** (no capture)?  
> 4) Need an **account** to go deeper, or trust from another place?  
> 5) If maintenance says **paused**, trust game bulletins for safety?  
> 6) See a **rank, streak, or scan count** anywhere?
>
> **Step 4:** Open the city board:  
> https://humanity.llc/play/cedar-rapids/map/  
> 7) Does it show what the **city** knows, or what **you** did?  
> 8) Where would you **go first** — point on the map (10 seconds).

---

## Per-tester log (record every session)

| Tester | Date | W1–W3 OK? | GT-1 | GT-2 | GT-3 | GT-4 | GT-5 | GT-6 | GT-7 | GT-8 | Pass? |
|--------|------|-----------|------|------|------|------|------|------|------|------|-------|
| 1 | | | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 2 | | | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 3 | | | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 4 | | | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 5 | | | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

**Pass bar (each tester):** GT-1, GT-2, GT-6 required; at most one miss among GT-3–GT-5; GT-7 required when marketing live board; **GT-8 required for SF-3 sign-off** (≥4/5 testers). **Gate:** ≥5/5 testers pass GT-1–GT-7 cohort; GT-8 tracked separately until **≥4/5** pass on network lens (run `npm run city-game:network-lens-preflight` for engineering status).

---

## Sign-off

| Field | Value |
|-------|--------|
| Date | `[YYYY-MM-DD]` |
| Testers (count) | `[≥5]` |
| Pass count | `[n/5]` |
| Result | ☑ Pass (2026-06-03 · 5/5 testers) |

When passed, update [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) GT-1–GT-6 checkboxes and Launch gates § Copy comprehension.
