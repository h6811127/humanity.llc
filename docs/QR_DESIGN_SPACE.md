# QR and live-object design space

**Status:** Strategic design catalog — research and positioning, not a build list  
**Purpose:** Expand the public “What can a QR do?” hub with blind spots, interaction verbs, network grammar, technology pairings, and open questions.  
**Public hub:** [`site/what-can-a-qr-do.html`](../site/what-can-a-qr-do.html) · [`site/what-can-a-qr-do/design-space/`](../site/what-can-a-qr-do/design-space/index.html)  
**Use-case phases:** [`V1_USE_CASES.md`](V1_USE_CASES.md)  
**Trust boundaries:** [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md)  
**Carrier research:** [`RESEARCH_DIRECTIONS_AND_NODES.md`](RESEARCH_DIRECTIONS_AND_NODES.md)

---

## How to use this doc

Every item below must still pass the [Use-Case Rule](V1_USE_CASES.md#use-case-rule) and map to a [build phase row](V1_USE_CASES.md#examples-by-build-phase) before it becomes engineering work. This catalog names **dimensions and patterns** the public idea hub under-specified as of 2026-06.

**Live product today:** create → scan → revoke → live control. Everything else here is research, imagination, or partial implementation (e.g. city game network primitives).

**Engineering map:** [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) — how verbs, streams, time, and network layers compose in the resolver (companion to this catalog).

---

## What the catalog already covers well

| Layer | Coverage in public hub |
|-------|------------------------|
| **Read truth at scan time** | Menus, freshness, crisis cards, maintenance, civic state |
| **Revoke / rotate without reprint** | Protest flyers, wearables, lost items |
| **Multi-signer composition** | Combining ideas + activity streams (game / maintainer / place) |
| **Network play** | City game, map board, relay nodes |
| **Anti-surveillance stance** | No scan analytics by default; bearer warnings on scan |

That spine — **mutable public truth on physical pointers** — is the correct primitive. The sections below extend it; they do not replace it.

---

## Blind spots in the current feature list

### 1. Interaction direction is mostly one-way

Almost every public idea is **scan → read** or **scan → contribute to a game**. Less explored in the hub:

- **Scan → request** — ask owner for something: pickup, permission, live proof, a signed reply
- **Scan → offer** — finder leaves a message; vendor marks “still available”
- **Scan → delegate** — temporary capability to the scanner: “you may unlock this shed until 6pm”

Live control is the only strong two-way primitive shipped today. **Request / offer / delegate** should be named as first-class interaction patterns, not implied only by live control and lost-item relay.

### 2. Time is underplayed as a product surface

Route windows exist in the city game, but the public ideas list rarely foregrounds:

- Scheduled availability (“open Thu–Sat only”)
- Auto-expire (“valid through Sunday”)
- Countdown / grace periods (“recall in 48h unless cleared”)
- **Intentional dormancy** (“this object is asleep until season start”)

Time-bound truth is a core differentiator vs static QR. It deserves its own category, not only game mechanics.

### 3. Custody and handoff

Child objects and per-QR revoke imply **custody**, but the catalog does not spell out:

- “Currently held by @handle until Friday”
- Tool-library checkout / return
- Art on loan between venues
- **Transfer ceremony** — signed handoff, not just revoke + reprint

Lost-item relay is adjacent; **temporary possession with revocable delegation** is not yet a named pattern.

### 4. Degraded connectivity and stale truth

Research directions mention mesh and NFC; the feature hub barely explores:

- Last-known-good with **stale disclosure**
- Offline maintainer signing → sync later
- “Resolver unreachable; here’s cached public state from 2h ago”

For crisis cards, food tags, and protest coordination, **honest staleness** is as important as live updates.

### 5. Governance when signers disagree or disappear

Activity streams assume clear authority (maintenance wins over game). Missing from the catalog:

- Maintainer key lost / org dissolved — who inherits the object?
- **Disputed claims** on the same physical thing (two parties, two signed streams)
- Community fork: “this bench’s history continued elsewhere after vandalism”
- Sunset / archival: live → read-only canon

The trust model is strong on *what scans don’t prove*; the catalog is weaker on **succession and dispute**.

### 6. Adversarial physical world

Security appears in limits copy, not as design-space entries:

- Sticker overlay / QR swapping on a real bench
- Cloned sticker on counterfeit merch
- Social engineering at scan (“tap here to verify”)
- **Decoy objects** in games (fake nodes)

City game touches trust chains; the general catalog should treat **attack surfaces on physical pointers** as a first-class topic.

### 7. Accessibility and non-camera paths

Research has NFC; the “What can a QR do?” list is camera-centric. Gaps:

- Audio capsule on scan (memory & place, extended for low vision)
- Large-print / high-contrast status pages
- NFC + spoken summary
- Objects that must work for people **without smartphones**

### 8. Institutional operator model

Most ideas assume **individual or small-group signers**. Lighter coverage of:

- Library / museum / school as **object operator** (not just end user)
- Multi-staff signing without sharing one key
- Audit trails for regulated maintenance (AED, extinguishers — proof-of-maintenance exists, but not “who signed, when, under what policy”)

### 9. Adjacent domains explicitly deferred

[`V1_USE_CASES.md`](V1_USE_CASES.md) flags healthcare-adjacent, payments, and regulated goods as caveats. The public hub should show **why** those are hard (jurisdiction, liability, PCI), not only omit them.

| Domain | Example | Why deferred |
|--------|---------|--------------|
| Healthcare-adjacent | Clinic “flu shot clinic open today” board | Not patient ID, triage, or eligibility |
| Regulated goods | Spirits/wine batch tags | Jurisdiction + labeling law |
| Financial | “This invoice QR is still unpaid” | Payments are a different product surface |
| Law / immigration | “Verified human” for borders | Explicit anti-use |

### 10. What live objects should never become

The product says “not a social feed” and “no scan tracking,” but the catalog should list **anti-patterns as product design**:

- Engagement loops (scan streaks, leaderboards tied to identity)
- Surveillance beacons (“who scanned this bench”)
- Opaque reputation scores on physical objects
- Permanent broadcast channels with no revoke

Naming forbidden shapes sharpens the positive list.

---

## Interaction verbs (the next layer)

The primitive is right. The next design layer is **verbs** applied across use cases:

| Verb | Meaning | Example |
|------|---------|---------|
| **Read** | Scanner sees current signed state | Menu sold-out, AED status |
| **Request** | Scanner asks owner or signer for action | Live proof, pickup permission |
| **Offer** | Scanner contributes without identity trail | Finder message on lost item |
| **Delegate** | Owner grants temporary capability | Shed unlock until 6pm |
| **Contribute** | Scanner adds to append-only public history | Guestbook note, game capture |
| **Inherit** | Succession when signer or org ends | New maintainer inherits bench stream |
| **Archive** | Live → read-only canon | Season ended; history preserved |

Shipped today: **read**, **request** (live control only), partial **contribute** (city game). The rest are research.

---

## Additional QR patterns

Beyond the twelve public hub walkthroughs:

| Pattern | Example |
|---------|---------|
| **Witness / co-sign** | “Two volunteers confirmed this shelter is open tonight” |
| **Conditional reveal** | Detail shown only if another object’s state is true (route unlocked after maintenance) |
| **Public ballot / poll stub** | Community preference on bench paint — signed tally, no voter ID |
| **Appointment / queue token** | “You’re #4 for repair café”; object holds queue state, not your phone |
| **Warranty / recall registry** | Batch recall without knowing who bought it |
| **Permit / inspection plaque** | “This food truck’s permit is current” (operator-attested, not government API) |
| **Tip / support pointer** | Revocable link to support artist/org — payments elsewhere, status here |
| **Correction chain** | “Previous statement superseded” with signed history |
| **Presence ping (opt-in)** | Owner marks “I’m at this table for office hours” — ephemeral, not tracking |
| **Pairing anchor** | Scan to bind phone to object for one session (exhibit audio, setup Wi‑Fi) |

Common thread: **QR as handle for a mutable claim**, not as content container.

---

## What a live object can do

Thinking “object as endpoint,” not “QR as label”:

1. **Hold multiple independent streams** — multi-tenant object (city owns bench, artist owns story, game owns points).
2. **Accumulate append-only public history** — guestbook, maintenance log, lore — with **revoke of individual entries** vs wipe-all.
3. **Publish derived state** — “computed from last 3 maintainer checks + game quorum” without hiding signers.
4. **Sleep / wake** — seasonal objects that reject game scans off-season but show archival state.
5. **Rate-limit or quota itself** — “this node accepts 50 contributions per day” (season metering generalizes as object policy).
6. **Emit events to subscribers** — not scan analytics: **opt-in** “notify me when this shelter opens” (push/email without proving who scanned).
7. **Anchor physical layout** — “objects within 200m of this node share a district ID” for map-less discovery.
8. **Self-describe limits** — every object carries machine-readable “I prove X, not Y” (structured on scan, not only copy).

---

## Network of live objects

A network is not “many QRs” — it is a **graph of signed state with conflict rules**.

```text
         [Quorum unlock]
    Bench ── AED ── Relay
         \    |    /
          Route state machine
         /    |    \
    Graph queries · Federation · Season reset
```

| Network capability | Example |
|--------------------|---------|
| **Quorum / threshold** | Three nodes agree → city bulletin updates |
| **Route as state machine** | Trail only “open” if upstream nodes are maintained |
| **Epidemic-style relay** | Compromise at one node → trust warnings propagate along graph |
| **Coverage maps** | “Which crisis resources are live vs stale in this ZIP?” |
| **Redundancy** | Two stickers, one logical object; revoke one, other still resolves |
| **Federation** | Objects on different operators still compose in one scan view |
| **Season / act structure** | Network resets lore without deleting object IDs |
| **Load shedding** | Mesh/cache reduces resolver hits during festival density |

**Canonical network demo:** city game + map board — [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md), [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md).

**Hub seed:** [`site/what-can-a-qr-do/combining-ideas/`](../site/what-can-a-qr-do/combining-ideas/) · [`site/what-can-a-qr-do/design-space/`](../site/what-can-a-qr-do/design-space/index.html)

---

## Technology combinations

Carrier layers must preserve the same resolver semantics — see [`RESEARCH_DIRECTIONS_AND_NODES.md`](RESEARCH_DIRECTIONS_AND_NODES.md).

| Technology | Combination | Why it fits |
|------------|-------------|-------------|
| **NFC** | Same `/c/…` URL, tap path | Wristbands, accessibility, anti-framing |
| **BLE mesh** | Local relay of **signed blobs** | Crowds, partial offline; resolver stays source of truth |
| **Solar + e-ink** | Object displays last resolver state without phone | Street infrastructure, crisis beacons |
| **Geofence (coarse)** | Optional “scan meaningful near object” | Reduces remote abuse; weak alone |
| **Camera / AR (read-only)** | Overlay stream labels on physical scene | Contextual scan, not tracking |
| **SMS / voice (dumb phone)** | Short code → resolver status | Crisis cards for non-smartphone users |
| **Calendar feeds (iCal)** | Object publishes hours as signed feed | Menus, shelters, office hours |
| **Web Push (opt-in)** | Subscribe to object state changes | Not a scan graph |
| **Passkeys / hardware keys** | Maintainer signing without browser tab | Field maintenance |
| **Satellite / LTE (node)** | Off-grid resolver sync | Trail markers, disaster |
| **Printed crypto (visual)** | Human-verifiable fingerprint on sticker | Anti-swap alongside URL |
| **Federation** | Cross-operator object graphs | Democratic infrastructure thesis |

**Avoid by default:** blockchain provenance, permanent IPFS “can’t revoke,” opaque ML trust scores.

---

## Suggested public hub additions

Lightweight categories on the public site — [`what-can-a-qr-do/design-space/`](../site/what-can-a-qr-do/design-space/index.html) (research walkthroughs or index rows — not shipping claims):

1. **Time-bound objects** — schedules, expiry, dormancy
2. **Request & delegate** — two-way scan patterns beyond live control
3. **Custody & handoff** — who holds this object now
4. **Network primitives** — quorum, routes, trust propagation (link map board + city game)
5. **Honest offline** — stale cache, mesh relay, last known good
6. **Governance & succession** — disputes, inheritance, archival
7. **Anti-patterns** — what live QRs must not become
8. **Accessibility & dumb phones** — NFC, voice, SMS paths

---

## Open questions (product and strategy)

### Product / strategy

- Which **one interaction pattern** (read / request / delegate / contribute) do we optimize scan UX for first?
- When is a live object **worse** than a paper sign or a phone call?
- Who **pays** for object lifetime (hosting, metering, seasons)? See [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md).
- What is the **minimum network size** before multiplayer beats solo objects?

### Trust / safety

- What happens when a **revoked object is still physically present** (sticker on bench)? UX + civic norms?
- How do we train scanners to understand **bearer ≠ owner** at scale?
- What is our stance on **children, schools, and public guestbooks** on street objects?
- When does “no scan analytics” conflict with **abuse response** (spam guestbook, hostile takeover)?

### Technical

- What is the **staleness contract** when cache/mesh serves state?
- Can an object **outlive its operator** (export, migrate, archive)?
- How do we prevent **stream stacking** from becoming unreadable soup on one scan page?
- What is the edit latency budget for “live menu sold out” vs “AED out of service”?

### Organizational

- Who is allowed to **install** a live object on public infrastructure (bench, pole, mural)?
- Do we want **templates** (maintainer kit, game kit, crisis kit) or one generic create flow?
- Is the city game the **canonical network demo**, or one of many network topologies?

### Competitive / positioning

- Why not **NFC-only** membership cards incumbents already ship?
- Where do **Apple/Google wallet passes** fit — complement or anti-pattern?
- What do we say to “just use a Google Form QR”?

### Ethical / political

- Protest infrastructure is in the hub — what is **operator neutrality** under government pressure?
- Can live objects become **gentrification markers** (“this bench is part of our brand game”)?
- How do we avoid **digital divide** (smartphone-required civic infra)?

---

## Bottom line

The list is strong on **mutable public truth**, **multi-signer composition**, and **civic/play networks**. The largest gaps are **time**, **two-way interaction**, **custody**, **offline/stale honesty**, **governance after signer loss**, and **network-level primitives** as explicit categories — plus the meta-question: **when is a live object the wrong tool?**

Next work is less “more use cases” and more **verbs** and **network grammar** applied across use cases already documented.

---

## Implementation traceability

Every catalog category below maps to a **phase**, **pilot or demo**, and **code touchpoint**. Status is **Shipped**, **Partial**, **In flight**, or **Research** — not a public shipping claim.

| Category | Phase | Pilot / demo | Code touchpoint | Status |
|----------|-------|--------------|-----------------|--------|
| **Read** (current signed state) | A | All cards, scan | `worker/src/resolver/scan-state.ts`, `scan-html.ts` | Shipped |
| **Request** (live proof) | A + M7 | Live control loop | `scan-live-control*`, `e2e/live-control-loop.spec.ts` | Shipped (narrow) |
| **Contribute** (public history / game) | B | Cedar Rapids S1 | `game-contribute.ts`, `live-object/scan-capabilities.ts` | Partial (engineering shipped; pilot P2 open) |
| **Time-bound objects** | A | Status plate, city game windows | `manifesto-display.ts`, `route-window-schedule.ts`, `season-window.ts` | Partial |
| **Revoke / rotate** | A | Core primitive | `update-card.ts`, revoke resolver | Shipped |
| **Offer** (finder message) | A | Lost-item relay | `manifesto-display.ts` (`[relay]` prefix), `created-child-object-lost-item.mjs` | Partial |
| **Delegate / custody** | A+ | Child objects | `worker/src/db/child-objects.ts`, `created-child-object*.mjs` | Partial |
| **Network primitives** | B | Cedar Rapids + map board | `quorum-contribute.ts`, `map-node-snapshot.ts`, `live-map-ticker.ts` | Partial (engineering shipped; launch gates open) |
| **Archive / sleep** | B | Season dormancy | `season-window.ts`, `live-object/scan-capabilities.ts` | Partial |
| **Honest offline / stale cache** | Future | — | — | Research |
| **Governance / succession** | D+ | Organizer revoke | `ORGANIZER_SIGNED_REVOKE_PILOT.md` | Partial (revoke only) |
| **Anti-patterns** (no scan analytics, etc.) | A | Platform policy | `REFERENCE_OPERATOR_DATA_POLICY.md`, scan limits copy | Shipped (policy) |
| **Accessibility / dumb phones** | Future | NFC research | `RESEARCH_DIRECTIONS_AND_NODES.md` | Research |

**Rule:** Move a row from **Research** → **Partial** only after a field pilot or season demo proves the verb on a real printed QR. See [`PHASE_A_STRANGER_PATH_PRIORITIES.md`](PHASE_A_STRANGER_PATH_PRIORITIES.md). Layer detail: [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md).

---

## Related docs

| Doc | Role |
|-----|------|
| [`V1_USE_CASES.md`](V1_USE_CASES.md) | Beachhead use cases + phase table |
| [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) | What scans prove and do not prove |
| [`RESEARCH_DIRECTIONS_AND_NODES.md`](RESEARCH_DIRECTIONS_AND_NODES.md) | NFC, mesh, Humanity node |
| [`PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md`](PHYSICAL_WORLD_MULTIPLAYER_RESEARCH_SPEC.md) | City-scale play research |
| [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) | Shipped / in-flight network play |
| [`PHASE_A_STRANGER_PATH_PRIORITIES.md`](PHASE_A_STRANGER_PATH_PRIORITIES.md) | Do not expand hub faster than pilot |
| [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) | Five-layer resolver map: object graph, verbs, streams, time, network |
