# M5  -  Stranger test runbook (Phase A exit gate)

**Status:** Active checklist  
**Canonical gate:** `docs/V1_0_ARCHITECTURE_ROADMAP.md` §12 Phase A exit; `docs/M3_M4_EXECUTION_PLAN.md` § M5  
**Scanner spec:** `docs/SCANNER_EXPERIENCE.md`  
**Prerequisite:** Worker + Pages deployed; you can create → scan → revoke in one browser session.

**Goal:** Three people **outside your network** complete the loop **without you explaining the UI**. Each can say in one sentence what scan **proves** and what it **does not**.

**Coverage:** At least one stranger should scan a **live object** or pilot sticker (pre-made scan URL)—not only a card they created themselves. Success criteria: [`docs/SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) § Success criteria (first scan).

---

## Before you invite strangers

Run this yourself once (5 minutes):

1. **Create**  -  `https://humanity.llc/create/` → land on `/created/`.
2. **Scan**  -  open scan link on phone; confirm pass card + bearer line + “What this scan does not prove” at bottom.
3. **Save recovery and/or download backup**  -  on `/created/`, save the one-time recovery key and/or encrypted backup if you care about cross-device revoke.
4. **Session-only check** (optional but recommended)  -  if you close the tab without recovery/backup, the web UI should no longer be able to sign revoke until you unlock one.
5. **Revoke QR**  -  on `/created/`, revoke **this QR only** (not whole card).
6. **Re-scan**  -  scan link shows **QR revoked** within ~60s (cache TTL).
7. **Status JSON**  -  replace `PROFILE` and `QR` below:

```bash
curl -sS "https://humanity.llc/.well-known/hc/v1/cards/PROFILE/status?q=QR" | jq '.scan.kind, .scan.error, .scan.qr.status, .scan.limits.scan_analytics'
# After revoke: kind "qr_revoked", error "QR_REVOKED", qr.status "revoked", scan_analytics false
```

8. **No analytics**  -  confirm scan HTML has no third-party trackers (view source / Network tab once); status JSON `scan.limits.scan_analytics` is `false`.

9. **Minimal failure layout** (optional) — revoke card or expire QR; confirm **Card status** + **This QR** groups still appear below the compact panel (human trust hidden).

10. **Live object scan** (recommended) — open a pilot or demo live-object scan URL on phone; confirm within ~30s they can state host trust, live status, what the **message** says, and that holding the sticker does not prove ownership. They should **not** need to reconcile multiple “Active” labels.

    - Status plate: `site/data/showcase-status-plate.json` — `npm run site:seed-showcase`
    - Live object: `site/data/showcase-live-object.json` — `npm run site:seed-showcase-live-object`
    - Lost item relay: `site/data/showcase-lost-item.json` — `npm run site:seed-showcase-lost-item`
    - CI fixtures: `worker/tests/scan-m5-showcase-paths.test.ts`, `worker/tests/site-showcase-data.test.ts`

**Deploy check:** scan response header `X-HC-Scan-UI: pass-v25` (or later) on an active scan.

**UX reference (target):** `assets/Nerd Mobile Post Scan Render.png`; gap list: [`docs/SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) § Known UX gaps.

---

## Who counts as a “stranger”

- Not you, not a co-founder, not someone who read the docs with you.
- OK: friend-of-friend, meetup attendee, coworker in another team, family who hasn’t heard the pitch.
- Avoid: anyone you already walked through `/create/` this week.

---

## What you send them (copy-paste)

> Try this when you have 5 minutes on your phone:  
> **https://humanity.llc/create/**  
>  
> Make a card, open the scan link it gives you, then tell me:  
> 1) What you think the scan **proves**  
> 2) What it **does not** prove  
>  
> Optional: revoke the QR from the “created” page and scan again.  
> No account, no app  -  just Safari/Chrome.

Do **not** send the data policy or research page unless they ask.

---

## Per-stranger scorecard

| # | Name (optional) | Created unassisted? | Scan understandable &lt;30s? | Live object scan? | One-sentence proves | One-sentence does not prove | Revoked + re-scan OK? | Notes |
|---|-----------------|--------------------|-----------------------------|-------------------|---------------------|----------------------------|------------------------|-------|
| 1 | | ☐ | ☐ | ☐ | | | ☐ | |
| 2 | | | ☐ | ☐ | | | ☐ | |
| 3 | | | ☐ | ☐ | | | ☐ | |

**Pass line for M5:** all three rows checked for create + scan understanding; **at least one** live-object (or pilot sticker) scan checked; **at least one** completes revoke + re-scan; none think it proves legal ID or “holder owns the sticker” without reading limits.

---

## Good answers (examples)

**Proves:** “The card/QR is still active or revoked **right now** on humanity’s resolver.” / “It’s a live status check, not a permanent profile.”

**Live object (good):** “It’s an active live object on humanity.llc—the network just checked it.” / “The page says [manifesto message] and it’s still valid.”

**Does not prove:** “That the person showing me the sticker owns the card.” / “Government ID or employment.” / “That they’re a good person.”

**Yellow flags (copy or UX):** “It verified they’re human.” “It’s like Instagram.” “The QR proves identity.” “Which Active is real?” “The @handle is the name of the thing.” → fix before public announce; see [`docs/SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) § Known UX gaps.

---

## After three pass

1. Check boxes in `docs/M3_M4_EXECUTION_PLAN.md` § M5.
2. Update landing **Building now**  -  move stranger tests to done; optional one-line public note (email list, post, or hero eyebrow).
3. **Do not** start merch (M8) or Commons Pass until M5 is checked.
4. **Recommended next:** finish M5.5 backup confidence (import on second device) if strangers struggled with “revoke later.”
5. **Then:** harden the stranger path with **one vertical pilot**  -  see `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md` (status plate, lost-item relay, organizer-signed revoke; not more hub pages).

---

## If something fails

| Symptom | Likely fix |
|---------|------------|
| Scan still “active” minutes after revoke | Worker deploy; wait cache max 60s inactive TTL |
| Create fails | Check Worker logs, rate limits, D1 |
| Bearer warning buried | Worker scan HTML deploy (`npm run worker:deploy`) |
| Closed tab, no saved key | Expected by design; use the saved recovery key or encrypted backup, otherwise create again |
| “Wrong passphrase” on backup import | Re-export; type passphrase manually; see `docs/M5_5_OWNER_KEY_PORTABILITY.md` |
| Stranger confused | Shorten scan lead copy; watch them screen-share once, then reset count |
| Multiple “Active” labels | Hero consolidation ([`docs/M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md) Phase 1) |
| Thinks @handle is the object name on live object | Hero H1 = manifesto; handle in steward strip ([`docs/SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) § Scan type templates) |

---

## Related

| Doc | Use |
|-----|-----|
| `docs/FOUNDING_COHORT_PLAYBOOK.md` | Optional larger tester pool (non-gating) |
| `docs/M4_CREATED_REVOKE_UI.md` | Owner revoke on `/created/` |
| `docs/V1_PRODUCT_TRUST_MODEL.md` | What to listen for in answers |
| `docs/SKEPTIC_FAQ.md` | If they push back on “just a QR” |
| `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md` | Post-M5: which vertical to prove on real objects |
