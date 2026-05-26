# V1 Use Cases

**Status:** Strategic draft  
**Purpose:** Define concrete contexts where Humanity Commons should be useful, so the project does not become a generic QR profile with movement language.

**Direction:** `docs/DEMOCRATIC_INFRASTRUCTURE.md`  -  scan must deliver live status, vouches, revoke, and (later) org tools - not “another link in bio.”

**Trust boundaries:** `docs/V1_PRODUCT_TRUST_MODEL.md`  -  what scans prove and do not prove at each level. **Vouch framing:** `docs/VOUCH_TRUST_POSITIONING.md`.

**Build phases:** `docs/V1_0_ARCHITECTURE_ROADMAP.md`  -  Phase A (digital trust) before commerce and Commons Pass.

**Public landing:** `site/index.html`  -  “One use” (door plate + QR), “Same idea elsewhere” (mechanism bullets). NFC/mesh diagrams and **Humanity node** vision live on `site/research-directions.html` (`docs/RESEARCH_DIRECTIONS_AND_NODES.md`). Full catalog stays in this doc, not on the homepage scroll.

**Post-M5 product focus:** After strangers pass the generic loop, pick **one** vertical to harden on real objects  -  `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md` (status plate, lost-item relay, organizer-signed revoke). Do not expand the public idea hub faster than that pilot.

---

## Why a use case beats “just a card page”

Each use case below must show **more than a profile view**:

1. Someone **checks** current trust state (not cached HTML).
2. Someone **acts** on revoke, vouch, or live control in a real workflow.
3. The group would **choose this** over a platform account or phone exchange for that workflow.

Phase A only covers (1) for strangers; later phases add vouches, merch revoke, and Commons Pass check-in.

---

## Use-Case Rule

Every use case must answer:

1. Who is using the card?
2. What trust problem do they have?
3. Why is a Humanity Card better than a generic profile link?
4. What does the card prove?
5. What does it not prove?
6. What would make the user come back?

---

## The Revocable QR Primitive (Cross-Cutting)

### What it is

A revocable HTTPS QR is **not just a link**. It is a **claim with current validity**: whoever scans gets what the resolver returns **now** (active, revoked, suspended, vouched, etc.), not a frozen file or cached profile.

The web normalized **permanent URLs**. Memberships, trust, affiliations, permissions, public statements, and contact endpoints are **dynamic**. A revocable QR lets physical artifacts - stickers, cards, posters, badges, tools - point at **dynamic truth** instead of static HTML.

That is the primitive Humanity Commons implements. **Global identity is not required** for the primitive to matter; scoped, revocable, mechanism-revealing trust is enough.

### Product line (one sentence)

> Physical artifacts point at current signed status, not a permanent file - so trust, membership, and public claims can change without pretending the world is static.

### How it differs from “link in bio”

| Generic QR / short link | Humanity revocable QR |
|---|---|
| Resolves to static page or redirect | Resolves to **current** card/QR status from the operator |
| Revoking means broken link or manual takedown | **Revoked** is an explicit, honest state (not silent 404) |
| Holder of printed QR often assumed = owner | **Bearer warning**: QR points at a card; holder may not control the key |
| Platform owns the identity object | Card is **signed**, exportable, revocable by the key holder |
| Often tracks clicks | **No scan analytics** by default (reference operator policy) |

### Temporary or sensitive public claims

Examples that fit the primitive when scoped honestly:

- Protest or event coordination contact that should **expire or revoke** after the action.
- Journalist tip line or mutual-aid contact on a poster (rotate QR without trusting old stickers forever).
- Creator or campaign offering something **sensitive for a limited time** - revoke when the moment passes.
- Signed public statement, manifesto, or correction that can be **superseded or revoked** without dead stickers implying it is still current.

**What this proves:** The QR credential and card resolve to an intentional status at scan time; the owner (or governance) can end or suspend that pointer.

**Owner vocabulary (v1):** One action is not “revoke everything.” See `docs/REVOKE_AND_LIFECYCLE_V1.md`:

| Action | Stranger sees (target UX) |
|--------|---------------------------|
| **Revoke QR** | “This QR is no longer valid”  -  minimal by default |
| **Disable card** | “This card has been disabled”  -  card details hidden |
| **Suspend** | “Suspended under public rules”  -  governance, not owner menu |

Printed objects always keep `profile_id` and `qr_id` in the URL; lifecycle changes resolver truth, not ink.

**What it does not prove:** Anonymity suitable for whistleblower threat models (a public card is pseudonymous, not a dead drop). That the person holding the printed item controls the card key. Legal identity, safety, or eligibility.

**Operator note:** High-risk contexts need explicit retention, abuse, and legal review - not only a revocable QR.

### Examples by build phase

Use this table to avoid building five products at once. Pilot conversations should name **one row** and one beachhead use case (below).

| Example | Primary use cases (below) | Phase | Humanity capability |
|---|---|---|---|
| In-person “scan my card”; follow-up without platform accounts | UC1, UC5 | **A**  -  MVP | Create card, HTTPS QR, trust-state scan UI, revoke |
| Revocable public handle / bio that stays live after job or project change | UC5 | **A** | Same; optional live control proof |
| Temporary activist, mutual-aid, or event contact on posters | UC3, UC1 | **A** | Revoke/rotate QR; status pages; no “verified forever” on print |
| Vouched portable reputation under community rules | UC2, UC4 | **A + M6** | Vouches, verification summary on scan |
| Live control in a meeting (“prove you hold the key”) | UC1, UC4 | **A + M7** (optional) | Short-lived challenge; separate UI block |
| Curiosity sticker → stranger creates card | UC1, MERCH_LED | **B** | Batch/card QR; store; no merch = vouched |
| Creator merch authenticity; limited edition still “recognized” | UC5 | **C** | Per-item QR; artifact intent; revoke one sticker |
| Revoke stolen badge; suspend abusive attendee | UC1, UC2 | **D**  -  Commons Pass | Org pass, check-in, suspension under public rules |
| “Current member” for co-op, club, festival | UC2 | **D** | Community pass + scan, not static plastic |
| Workshop completed / membership active / cert expired | UC2 | **D+** | Signed community stamps; explicit issuance rules |
| Backstage, popup, volunteer, housing access | UC1, UC2 | **D+** | Pass permissions + live status; not v1 card alone |
| Device, lab equipment, prototype “still official / maintained?” |  -  | **Future** | Object/credential layer; separate spec |
| Educational credential on transcript QR |  -  | **Future / ceremony** | Steward-attested credentials; not launch-critical |

**Phase key:** A = digital trust MVP (`V1_0_ARCHITECTURE_ROADMAP` M2–M5). B = curiosity drop merch. C = personalized artifact commerce. D = Commons Pass (`docs/commons/`).

### Mapping ChatGPT-style buckets to beachheads

| Bucket | V1 beachhead doc | Notes |
|---|---|---|
| Events, badges, in-person trust | Use Case 1 | Badge *permissions* need Commons Pass; card + revoke is Phase A |
| Co-ops, clubs, festivals, organizing | Use Case 2 | “Current member” is Phase D; card + vouch is pilot wedge |
| Mutual aid, local groups, temporary contact | Use Case 3 | Strong fit for revocable primitive without global ID |
| Online communities, bot pressure | Use Case 4 | Vouch + live control; not bot-proof uniqueness |
| Creators, merch, portable identity | Use Case 5 | Phase B/C for physical authenticity |
| QR business cards, networking | UC5 / UC1 | Revoke after role change; rotate endpoints on card |
| Public statements / manifests | UC3, UC5 | Signed card + revoke; corrections via new signed docs |
| Whistleblower / maximal anonymity | Anti-use (see below) | Do not imply; different threat model |

### Strongest public framing (design space, not roadmap)

> **Live public objects**  -  physical things that resolve to **current** signed status.

Avoid leading with: social network, universal identity, crypto, or ideology. Those trigger the wrong comparisons. The node mockup reinforces **infrastructure you can point at on a wall** - that is unusually legible for a trust protocol.

**Deeper layer:** infrastructure for **changing public truth attached to physical objects**. Every row below is the same question in a different costume: *Is this still valid? Who issued it? Can I trust this printed thing right now?*

### Design space catalog (expanded)

Not a build list. Use to test positioning, pilots, and what **not** to promise. Each item still needs the [Use-Case Rule](#use-case-rule) and a phase row before it becomes engineering work.

#### Community / membership

- Co-op membership cards · community passes · mutual-aid coordination
- Art collectives · hacker/makerspaces · private clubs · volunteer credentials
- Neighborhood associations · student orgs · temporary coalition networks
- Tool libraries / “library of things” · housing co-op guest or sublet passes
- Food co-op pickup windows · ride-share or carpool circles
- Parent cooperatives · faith-community visitor passes · diaspora reunion networks
- Worker centers · union halls (“meeting still on?” on a door plate)
- Community land trust · garden plot assignments · shared kitchen/fridge rules boards

#### Events

- Revocable event wristbands · VIP passes · festival credentials · speaker badges
- Staff / volunteer / backstage access (Commons Pass later; revoke wedge now)
- Conference networking objects · meetup check-ins · temporary installations
- Interactive exhibits · live venue occupancy or “doors open” status
- Pop-up restaurant hours · farmers-market stall “here today” · workshop seat holds
- Press / media credentials · afterparty bands · race or walk check-in *status* (not medical clearance)
- Protest or march coordination contact that must **expire** when the action ends

#### Public infrastructure

- Public resolver **nodes** (see `RESEARCH_DIRECTIONS_AND_NODES.md`)
- Community bulletin terminals · neighborhood status beacons
- Local emergency or mutual-aid coordination objects (scoped, not 911 replacement)
- Solar-powered trust endpoints · public NFC interaction points · mesh-aware objects
- Embedded civic kiosks · park facility open/closed · trail or beach condition beacons
- Cooling center / warming shelter “open tonight” · disaster supply point status
- Transit disruption plaques (“this stop detour active”) · construction site public notices
- “Is this public Wi‑Fi the one we operate?” (operator attestation only - not crypto panacea)

#### Physical objects with state

- Stickers that evolve · revocable posters/flyers · dynamic public signage
- Live studio / open-hours plaques · temporary QR campaigns · installation art
- Product authenticity tags · museum exhibit objects · community gardens
- Shared workshop tools · bike-share or fleet component tags · rental equipment checkout
- Building delivery hours · real estate open-house “still happening today”
- Zines, books, or records with **live** colophon or tour dates on scan

#### Trust / authenticity

- Verified creator merch · anti-counterfeit physical goods · signed artifact provenance
- Limited-run drops · local trust networks · revocable access tokens
- Community-issued reputation · human vouch systems · temporary trust scopes
- Repair-café or fix documentation pointers · open-hardware batch attestation
- Artisan batch numbers · gallery provenance cards (not appraisal or insurance)

#### Embedded / hardware

- NFC wearables · solar public nodes · BLE mesh propagation
- Offline verification appliances (cache **public** status; resolver still source when online)
- Portable resolver terminals · public scanning appliances · physical trust anchors
- Ambient local networking · shared edge infrastructure
- Wallet cards · key fobs · conference badges · vehicle fleet dash plaques (org-scoped, not “driver ID”)

#### Education / universities

- Student org credentials · research lab access · temporary classroom/event passes
- Campus installation projects · public research nodes · conference/demo infrastructure
- Guest lecturer passes · makerspace tool **membership** (not safety certification)
- Thesis defense door signs · department “office hours live” plaques
- Identity-lite campus systems (explicitly **not** transcript or accreditation replacement)

#### Creative / cultural

- Interactive merch · community-owned media objects · dynamic album/book objects
- Physical ARG systems · artifacts with evolving lore · zines with live updates
- Public storytelling infrastructure · networked gallery objects
- Band tour merch · bookstore author events · podcast “recording live” door tags
- Street art with revocable artist statement or correction chain

#### Work / coordination (lightweight, not HR)

- Contractor “on site today” status board · pop-up office hours
- Coworking day-pass objects · studio visitor lists without sharing personal numbers
- Open-call for collaborators on a poster (revoke when filled)

#### Questions every scan answers (coordination layer)

- Who is active right now? · Is this still valid? · Who issued this?
- Has this object changed state? · Is this event still happening?
- Is this person still a member (under **our** rules)? · Can this object still be trusted?
- Did this physical thing expire? · Was this QR batch revoked after a theft?

#### Additional buckets (use with care)

| Bucket | Example | Caveat |
|---|---|---|
| Healthcare-adjacent | Clinic “flu shot clinic open today” board | Not patient ID, triage, or eligibility |
| Regulated goods | Spirits/wine batch tags | Jurisdiction + labeling law; often anti-use for v1 |
| Financial | “This invoice QR is still unpaid” | Payments are a different product surface |
| Law / immigration | Any “verified human” for borders | Explicit anti-use |

---

## Use Case 1: Events And Meetups

### User

Attendees, organizers, speakers, volunteers, and local community members.

### Problem

People meet in person but do not have a lightweight way to carry portable trust, prove control of a public card, or follow up without exchanging platform accounts.

### Humanity Commons Fit

- Attendee scans a card.
- Scanner sees current status.
- Owner can prove live control.
- People can vouch after meeting.
- Physical cards/stickers feel natural.

### Demo Moment

> "Scan my card. Now ask me to prove control."

### What It Proves

- The card is active.
- The owner can prove recent key control if requested.
- Vouches or founding credentials are visible.

### What It Does Not Prove

- Legal identity.
- Event ticket ownership.
- Background check status.
- That holding a printed card proves ownership.

### Success Signal

At least one event wants to use cards for attendee identity, follow-up, or in-person trust rituals.

---

## Use Case 2: Cooperatives And Member Organizations

### User

Cooperative members, organizers, stewards, workers, and board/council participants.

### Problem

Member organizations need identity, membership, and participation tools that do not depend on extractive platforms or central social accounts.

### Humanity Commons Fit

- Members create cards.
- Organization can vouch or credential members under public rules.
- Members can prove live control for higher-trust actions.
- Future tools can support consent-based directories, events, and governance workflows.

### Demo Moment

> "This is my member card. It is active, vouched, exportable, and not tied to a platform account."

### What It Proves

- Public card status.
- Vouch or credential state.
- Recent key control when requested.

### What It Does Not Prove

- Legal membership unless the organization separately defines that credential.
- Voting eligibility until a voting workflow exists.
- Employment status.

### Success Signal

One cooperative or member organization can name a concrete workflow: onboarding, event check-in, member directory, ceremony, or credential issuance.

---

## Use Case 3: Mutual-Aid And Local Community Groups

### User

Local organizers, volunteers, recipients, donors, and trusted community members.

### Problem

Groups need lightweight trust and continuity without exposing phone numbers, legal names, addresses, or platform accounts unnecessarily.

### Humanity Commons Fit

- People carry a persistent public card.
- Vouches can represent known participation without exposing private notes.
- Live control can help in higher-trust handoffs.
- Revocation and suspension states are visible.

### Demo Moment

> "This card shows I am known in the group without publishing private context."

### What It Proves

- The card has public trust evidence.
- The person can prove live control when needed.

### What It Does Not Prove

- Need.
- Eligibility for aid.
- Legal name.
- Safety in all contexts.

### Success Signal

Organizers say the card could reduce platform dependence or help continuity across events.

---

## Use Case 4: Online Communities Facing AI/Bot Pressure

### User

Community moderators, members, creators, forum operators, and server admins.

### Problem

Communities need ways to identify real participants without requiring invasive verification, legal ID, or platform accounts.

### Humanity Commons Fit

- Members link a Humanity Card.
- Vouches establish social proof.
- Live control can prove the account holder controls the card.
- No scan analytics or identity brokerage.

### Demo Moment

> "This participant is vouched and can prove live control of their public card."

### What It Proves

- The card exists and is active.
- The card has vouches or credentials.
- The account holder can prove card-key control if challenged.

### What It Does Not Prove

- Perfect bot resistance.
- Legal identity.
- That one person has only one card.
- That a community account has not been compromised.

### Success Signal

Moderators say it could become an optional trust signal for posting, joining, or community participation.

---

## Use Case 5: Creators, Artists, And Independent Builders

### User

People who want a public identity object not controlled by a social platform.

### Problem

Creators and builders often rely on platform profiles, follower counts, and centralized verification to prove legitimacy.

### Humanity Commons Fit

- Card is portable.
- Card can be exported and revoked.
- Vouches can show social trust.
- QR can be carried into physical work, zines, booths, stickers, and events.

### Demo Moment

> "This is my public card. It is signed, vouched, and not owned by a platform."

### What It Proves

- Current public card state.
- Vouches from real people.
- Recent control if requested.

### What It Does Not Prove

- Audience size.
- Professional credentials.
- Legal identity.
- Quality or endorsement.

### Success Signal

Creators share cards because they feel beautiful, useful, and aligned with their identity.

---

## Prioritization

For v1:

1. Events and meetups.
2. Founding cohort.
3. Cooperatives/member organizations.
4. Online communities facing AI/bot pressure.
5. Creators/builders.

Do not build separate product surfaces for all use cases at once. Use them to test positioning and pilot conversations.

When evaluating a new pilot idea, ask: **which row in [Examples by build phase](#examples-by-build-phase)** does it need, and does Phase A already satisfy the trust loop?

---

## Anti-Use Cases

Do not position v1 for:

- Legal ID.
- KYC.
- Age verification.
- Employment verification.
- Border/immigration use.
- Background checks.
- Credit, lending, or financial eligibility.
- Law enforcement identity checks.
- Public scoring/ranking of humans.

These contexts would require separate legal, ethical, and technical review.

Also do not position the revocable QR primitive alone as:

- Whistleblower-grade anonymity (public resolver + card ≠ dead drop).
- Law-enforcement or immigration identity checks.
- Proof that the **holder** of a printed QR is the card owner (requires live control or separate workflow).
- Universal “verified human” or bot-proof one-person-one-card claims.

