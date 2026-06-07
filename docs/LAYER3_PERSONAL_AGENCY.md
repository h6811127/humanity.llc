# Layer 3 — personal agency (on-device)

**Status:** Strategic spec — **not implemented**  
**Audience:** Product, device shell, privacy, agents  
**Parent:** [`AI_ECOSYSTEM_RESEARCH.md`](AI_ECOSYSTEM_RESEARCH.md) · [`DEVICE_OS.md`](DEVICE_OS.md) · [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md)

> **Definition:** Personal agency is the user’s right to organize **attention, memory, and intent** across public L1/L2 records—without the operator organizing it for them.

---

## Constraints (non-negotiable)

The on-device agent must **not** become:

- Centralized memory (operator honeypot)
- Autonomous signer
- Surveillance (scan analytics, visit trails)
- Resolver of truth
- Engagement optimizer

The agent is a **private clerk and conductor**—not a proxy identity.

---

## Six agency primitives

```text
RELATE   — declare interest (save, pin, follow) — no operator memory
WATCH    — pull public records for related entities — not scan analytics
ORIENT   — route attention (briefings, plans, reminders) — local only
DRAFT    — local scratch for human edit — never published unsigned
CONFIRM  — human gate before sign or data egress
PORT     — export/import user-owned continuity
```

Not agency primitives: VERIFY (crypto), COMPOSE (resolver), GOVERN (community process).

---

## What persists on device

| Category | Examples |
|----------|----------|
| Control (steward only) | `hc_wallet`, recovery references |
| Interest (all users) | follows (`season_id`), pins (public URLs), prefs |
| Agency policy | confirm rules, blocked origins, watch schedule |
| Steward index | child-object cache (reconcile from network) |
| Acknowledgment | dismissed inbox, seen governance notices |
| Portability | encrypted backup (steward); interest JSON (participant) |

**Do not persist by default:** full AI chat logs, raw status timelines, inferred interest models, visit sequences.

---

## What forgets automatically

- Session status cache (minutes–hours)
- Ephemeral AI legibility (end of session unless user keeps note)
- Live-control scratch state after resolve/TTL
- Hub search queries on clear
- Activity log FIFO cap (~40 entries)
- Cross-tab presence heartbeats (~10s)

---

## Watching without scan analytics

| Allowed | Forbidden |
|---------|-----------|
| Poll `GET …/status` for **saved** cards / **pinned** qr | Log stranger scans |
| Poll season snapshot for **followed** networks | “Who scanned you” alerts |
| Opt-in live-control poll (steward) | Upload watch events to operator |
| User-visible “check public state” copy | “Seen” / “last scan” wording |

**Rule:** Watch set = wallet ∪ pins ∪ follows ∪ active stewardship. Operator sees at most IP rate-limit buckets.

---

## Steward agent (5%)

**May:** brief across wallet, batch read status, draft local manifesto scratch, route to sign UI, reconcile child objects, remind backup/recovery.

**May not:** auto-sign, auto-revoke, auto-vouch, post drafts to resolver, upload keys or behavioral telemetry.

**Signing:** Tier A actions always end at confirm + Ed25519.

---

## Participant agent (95%)

**Personal agency without ownership** = interest, orientation, voluntary participation—not control of public records.

| Primitive | Participant form |
|-----------|------------------|
| RELATE | follow network, pin board/scan URL |
| WATCH | followed season snapshots |
| ORIENT | weekend brief, rules literacy, deep links |
| DRAFT | local itinerary notes (never uploaded) |
| CONFIRM | before `game-contribute`, offer, explain egress |
| PORT | export/import follows + pins |

**Forbidden for participants:** streaks, “your progress,” visit checklists, player profiles, implied tracking from pins.

---

## Operator / network comparison

User-initiated diff of **published** policies:

- `data-policy`, `operator/capabilities`, network rules
- Factual table; link primary sources
- User trust notes (L3) labeled as opinion
- No reputation scores

---

## Federation (L3 as client)

- Route fetches per `resolver_hint`
- Per-origin policy cache
- User denylist
- Show operator id on every record; never merge conflicting truths silently

---

## Confirmation tiers

**Tier A — confirm + sign:** create, update, revoke, vouch, live-control response, organizer game-update, child-object lifecycle.

**Tier B — confirm, no sign:** follow/unfollow, pin, enable polling, import backup, explain egress, policy compare fetch.

**Tier C — no confirm:** public GET for saved relationships, local search, navigate to scan URL, dismiss local inbox.

---

## Explicitly forbidden

- Autonomous signing or idle sign
- Upload wallet, pins, activity, inferred models to operator
- Passive scan logging (local or remote)
- Steward alerts on passive scans
- AI text presented as signed state
- Global people/object search
- Player profiles, streaks, leaderboards from device history
- Operator-hosted AI memory / sync
- Background location for ambient discovery without explicit user query

---

## Failure modes

| Failure | Mitigation |
|---------|------------|
| Cache mistaken for truth | Re-fetch before alarm; “checked” not “scanned” |
| Agent over-automation | Hard Tier A gate |
| Empty steward hub for strangers | Hide wallet chrome until keys exist |
| Participant gamification | No progress artifacts in ontology |
| Federation confusion | Operator label on every fetch |
| Briefing implies visits | “Since you opened app” OK; “since you visited node” not OK |

---

## Smallest safe product surfaces

### Participant (minimal)

1. **Follow** — `season_id` local
2. **Brief** — 3 lines from last snapshot on open
3. **Pin** — board or scan URL (cap ~20)
4. **Charter** — what device remembers

Placement: network/play surfaces—not full steward hub chrome.

### Steward (extension)

Agency panel: relate strip, watch toggle, briefing, confirm-at-sign handoff, read-only policy compare.

---

## Hub justification

| User | Hub |
|------|-----|
| Steward | Full hub (wallet, inbox, live proof) |
| Participant | Thin **“my networks”** shelf—not create/keys strip |
| Stranger | No L3 required; scan-complete |

**L3 is universal; steward hub UI is not.**
