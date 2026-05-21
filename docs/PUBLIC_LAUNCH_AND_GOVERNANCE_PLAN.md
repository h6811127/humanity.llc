# Public Launch And Governance Plan

**Status:** Strategic draft  
**Purpose:** Define the public narrative, governance transition promise, decision rights, live proof model, launch campaign, legal path, abuse policy, financial policy, membership model, and website information architecture for Humanity Commons.

**Canonical architecture:** `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md` (federated resolvers, public launch, data minimization, no blockchain core). This doc covers governance narrative and campaign; where they conflict, the protocol strategy doc wins on architecture and launch gates.

---

## Positioning Sentence

Humanity Commons is membership infrastructure for real people and democratic communities. It starts with Commons Pass: create a community, issue mobile web passes, scan QR codes, check people into events, issue signed stamps, and prove live control when needed. It is designed to grow into member-governed digital infrastructure, not another extractive identity platform.

The first launch should not position Humanity Commons as universal identity infrastructure. It should position the product as a practical trust and membership tool for communities that already distrust surveillance platforms.

---

## 1. Public-Facing Narrative

### Website-Ready Short Version

Humanity Commons is a membership pass for communities that refuse surveillance.

Create a community, invite members, issue mobile web passes, scan QR codes for current membership status, check people into events, and issue signed community stamps. Members can still carry a signed Humanity Card, receive vouches, and prove live control without a phone number, government ID, follower count, ad network, or surveillance profile.

This is not a social network. It is a commons for human trust.

Today, Humanity Commons is founder-built. Over time, it is designed to become member-governed: users, workers, stewards, and aligned organizations will shape the standards, policies, treasury, and future of the system.

### Website-Ready Longer Version

The internet is full of accounts, bots, followers, ratings, and opaque platform reputation. Humanity Commons starts from a different premise: communities should be able to issue membership infrastructure they can trust, and people should be able to carry signed, revocable proof of belonging that they control.

A Commons Pass says:

> I belong to this community under these public rules. You can scan this pass, inspect current status, request live proof when needed, and understand what this does and does not prove without trusting a social platform.

The first version is intentionally simple:

- A signed public Humanity Card.
- A community-issued Commons Pass.
- A QR code that resolves to current pass/card status.
- Vouches from real people.
- Optional live control proof for moments when a scanner needs recent evidence that the nearby person controls the card key.
- Event check-ins.
- Signed community stamps.
- Clear active, revoked, suspended, expired, and unknown states.
- Physical stickers/cards that point back to the current card state.
- No scan analytics by default.
- No phone number, email, government ID, or social login required to create a card.

Humanity Commons is also a political and economic experiment. The goal is not to build a founder-owned identity company forever. The goal is to build public-interest digital infrastructure that can become worker-and-member governed.

### Homepage Hero

**Headline:** A membership pass for communities that refuse surveillance.

**Subheadline:** Issue mobile web passes, scan QR codes, check members into events, and build digital trust infrastructure owned by its communities.

**Primary CTA:** Create a Commons Pass

**Secondary CTA:** Read the Commons Roadmap

### Why It Matters

Most online identity systems ask people to trade privacy, platform dependence, or legal identity exposure for trust. Humanity Commons tries another path:

- Trust should be portable.
- Verification should be inspectable.
- Revocation should be visible.
- Public identity should be consent-based.
- Communities should govern the infrastructure they depend on.

### First Beachhead

The first public launch should be built around a specific use context, not a generic "everyone needs identity" claim.

**Launch posture:** **public card creation** when Phase A ships—no invite-only founding cohort as the product gate. See `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`.

Recommended beachhead:

> Events and meetup-style communities first; cooperative/member organization pilots second—with a path for the org to run a **compatible resolver** for its members.

Why:

- In-person scanning makes live control proof understandable.
- Stickers and cards have a natural role.
- Vouching can start with accountable humans who have met or know each other.
- The demo is memorable: scan, inspect, request live proof, and understand what a printed QR does not prove.
- A co-op or union as **second operator** proves federation early.

Other promising launch contexts:

- Cooperatives and member organizations.
- Mutual-aid and local community groups.
- Privacy/open-source communities.
- Online communities facing AI/bot spam.

### What This Is Not

Humanity Commons is not:

- A government ID system.
- A background check.
- A follower graph.
- A crypto/NFT identity scheme.
- A way to buy verification.
- A claim that holding a sticker proves who you are.
- A surveillance analytics product.
- KYC, age verification, employment eligibility, or legal identity proof.
- Bot-proof or fraud-proof identity.

### What Physical Stickers And Cards Mean

A printed QR artifact is a pointer to a Humanity Card. It is not identity proof by itself.

Website and scan pages should say:

> This QR resolves to a Humanity Card. It does not prove the person holding this item is the card owner.

Higher-trust contexts eventually require live proof of control, not just a static printed QR.

### Public Labels

Launch copy should prefer labels that reveal the trust mechanism:

| Internal/Protocol Concept | Public Launch Label |
|---|---|
| Baseline card exists | Registered |
| Vouch threshold reached | Vouched Human |
| Founder/bootstrap credential | Founding Human or Early Builder |
| Steward authority | Steward |
| Owner revocation | Revoked By Owner |
| Governance action | Suspended Under Public Rules |

The phrase **Verified Human** should be avoided in primary launch UI unless it appears next to mechanism copy such as "by vouches" or "by ceremony" and passes comprehension testing.

---

## 2. Governance Transition Promise

### Website-Ready Promise

Humanity Commons is founder-built today and member-governed by design.

During the first phase, the founder and bootstrap operators make practical decisions needed to build, secure, and launch the system. Those powers are temporary and must be visible.

As the product reaches working milestones, governance moves to members, workers, stewards, and aligned organizations through a published transition process.

### What Is Founder-Controlled Now

Until member governance triggers are met and the product has working v1 infrastructure, the founder controls:

- Product scope.
- Repository direction.
- Initial design and copy.
- Provider choices.
- Bootstrap technical architecture.
- Initial pricing and artifact catalog.
- Launch timing.

### What Bootstrap Operators May Control

Bootstrap operators may temporarily control:

- Badge issuance.
- Suspension keys.
- Template approval.
- Emergency security decisions.
- Manual production approval.

These powers should be documented, named, logged, and sunset.

### What Becomes Member-Controlled

Members should eventually control or ratify:

- Constitution changes.
- User rights.
- Data and privacy policy.
- Verification thresholds.
- Scan logging policy.
- Suspension and appeal rules.
- Badge categories.
- Governance structure.
- Surplus allocation principles.
- Major protocol changes.

### Transition Triggers

Governance should move from founder control to member/steward control when these triggers are met:

1. The v1 trust loop works publicly: card, QR, vouching, revocation, export, and one physical artifact—with **open card creation** (not cohort-gated).
2. At least 25 active cards from users outside the founder’s direct network (public launch metric).
3. At least 10 completed vouch flows between distinct users (social trust is real, not founder-issued only).
4. A published **second resolver operator** commitment or live second host running `hc/v1` (federation credibility).
5. At least 3 bootstrap stewards are named and willing to sign public rules.
6. The first transparency report is published.
7. The first revenue and cost report is published after paid orders begin.
8. A 14-day public comment period has been completed for the constitution and technical standards.

### Transition Promise Language

> We will not ask people to trust a vague future democracy. We will publish what is founder-controlled now, what members will control later, and what milestones trigger the transition.

---

## 3. Decision Rights Matrix

| Decision Area | Founder Now | Bootstrap Operators | Worker Members | User Members | Steward Members | Organization Members |
|---|---|---|---|---|---|---|
| v1 product scope | Decides | Advises | Later co-decide | Advises after cohort | Advises | Advises |
| Protocol standards | Drafts | Advises | Ratify if labor-impacting | Ratify rights-impacting changes | Ratify operational trust rules | Advises |
| QR format and resolver behavior | Drafts | Advises | Advises | Ratify rights-impacting changes | Advises | Advises |
| Federated operator policy | Drafts | Advises | Advises | Ratify rights-impacting changes | Advises | Co-decides for org-hosted resolvers |
| Resolver data retention / scan logging | Drafts | Temporarily executes | Advises | Ratifies | Reviews | Advises |
| Suspension rules | Drafts | Temporarily executes | Advises | Ratifies | Co-decides and executes | Advises |
| Individual suspensions | Emergency only | Executes under policy | No | Appeal oversight | Executes/reviews | No |
| Verification thresholds | Drafts | Advises | Advises | Ratifies | Co-decides | Advises |
| Badge categories | Drafts | Temporarily issues | Advises | Ratifies public categories | Co-decides | Advises |
| Store catalog | Decides v1 | Approves marks/templates | Advises/operates | Advises | Advises | Advises |
| Revenue policy | Drafts | Advises | Co-decides once formalized | Ratifies principles | Advises | Advises |
| Spending and budget | Decides pre-transition | Advises | Co-decides after transition | Ratifies surplus principles | Advises | Advises |
| Worker pay | Decides pre-workers | No | Decides after worker body exists | Sees transparency | No | No |
| Legal structure | Drafts options | Advises | Co-decides | Ratifies member-rights impact | Advises | Advises |
| Emergency security changes | Decides temporarily | Can execute with logs | Reviews | Retroactive ratification if rights-impacting | Reviews | Advises |

### Rule Of Thumb

- Product speed can be founder-led early.
- User rights must become member-ratified.
- Labor conditions must become worker-governed.
- Trust operations must involve stewards.
- Capital must not govern protocol rights.

---

## 4. Live Proof Model

### Problem

A static printed QR can be stolen, copied, photographed, or stuck somewhere misleading. It can resolve to a real card, but it cannot prove the holder controls that card.

### Trust Levels

#### Level 0: Static Printed QR

**What it proves:**

- The QR resolves to a Humanity Card.
- The QR credential is active, revoked, expired, suspended, or unknown.
- The card has a current public verification state.

**What it does not prove:**

- The holder is the card owner.
- The holder is verified.
- The holder controls the private key right now.

**Use cases:**

- Discovery.
- Posters.
- Stickers.
- Calling cards.
- Low-stakes affiliation.

#### Level 1: Current Card Scan

**What it proves:**

- The card is active at scan time.
- The card has a public verification summary.
- Latest accepted vouch recency is visible when available.

**Use cases:**

- Social trust.
- Public profile inspection.
- Event browsing.

#### Level 2: Live Owner Proof

**What it proves:**

- The person can control the card's private key or authenticated device at that moment.

**What it does not prove:**

- Legal identity.
- Global uniqueness.
- Age, KYC, employment eligibility, or background check status.
- That holding a printed artifact proves ownership.

**Possible mechanisms:**

- Signed nonce challenge.
- "Prove control" button on card owner's device.
- Short-lived live QR code.
- Wallet/passkey-backed signature.
- One-time challenge phrase displayed to scanner and signed by owner.

**Use cases:**

- Event entry.
- Member voting.
- Sensitive ceremony attendance.
- High-trust steward actions.

**Required success copy:**

> Control proven moments ago. This means the card key signed a fresh challenge. It does not prove legal identity.

#### Level 3: Ceremony Or Steward Proof

**What it proves:**

- A steward or ceremony process witnessed the person's participation under published rules.

**Use cases:**

- Vouch bootstrapping.
- Steward-led ceremonies (optional).
- Appeals.
- Higher-trust credentials.

### V1 Decision

V1 should ship Level 0 and Level 1 clearly. Live owner proof should be built for private alpha if it does not delay the core card/QR/revocation loop; otherwise it should remain a clearly documented v1.1 feature, not a public promise.

V1 scan pages must include the bearer warning:

> This QR resolves to this Humanity Card. It does not prove the person holding this item is the card owner.

### Future Live Proof Requirements

When live proof is added, it must:

- Avoid biometric collection.
- Avoid phone-number dependence.
- Avoid centralized identity brokers.
- Use signed challenges.
- Expire quickly.
- Be understandable to non-technical scanners.
- Be accessible to people with older devices where possible.

---

## 5. Campaign And Launch Plan

### Campaign Thesis

The campaign is not "download our app." It is:

> Help build a human-owned trust commons before the next wave of identity infrastructure is captured by platforms, surveillance, or speculation.

The campaign also needs a concrete product hook:

> Prove you're real without becoming a data product.

### Campaign Name Options

- "A Card For Real Humans"
- "Build The Human Commons"
- "Proof Without Platforms"
- "The Internet Needs A Public Human Layer"
- "Founder-Built, Member-Governed"
- "No Phone. No ID. No Tracking."

### Launch Story

1. The internet cannot tell people, bots, platforms, and communities apart in a humane way.
2. Existing identity systems tend to demand surveillance, legal ID, platform lock-in, or financial speculation.
3. Humanity Commons starts small: a signed card, a QR, a vouch, and the right to revoke.
4. Physical cards and stickers make the idea visible.
5. The long-term goal is member-governed, **federated** digital infrastructure.
6. Anyone can create a card when the resolver ships; early testers optionally help shape copy and ops (see below).

### Public Launch And Optional Early Testers

**Public launch:** Card creation opens to the world when Phase A is stable. No invite list is required to participate.

**Optional early tester pool** (formerly “founding cohort” in older drafts): 10–25 people who volunteer for intensive feedback before or during public launch. This is **not** a gate, paid status tier, or fake governance body. See `docs/FOUNDING_COHORT_PLAYBOOK.md`.

**Who helps early (optional):**

- Early builders.
- Cooperative organizers.
- Privacy/open-source people.
- Local community operators.
- People willing to test vouching and revocation honestly.

**What they do:**

- Create cards.
- Test scan flows.
- Give/receive vouches.
- Test live control proof if included.
- Review copy comprehension.
- Comment on constitution and standards during open windows.

### Founding Trust Bootstrap

The first trust network cannot pretend to have emerged from mature member governance. It needs a visible bootstrap rule.

Recommended public rule:

- Start with 10-25 founding humans or bootstrap stewards selected through named founder/operator authority.
- Label this as temporary bootstrap authority.
- Publish who can issue founding credentials, what those credentials mean, and when authority sunsets or is reviewed.
- Do not sell founding credentials or verification.
- Allow founding humans to vouch only after accepting public vouching rules.
- Keep the 90-day vouching delay for newly vouched humans unless a public bootstrap exception is explicitly documented.

Suggested copy:

> Humanity Commons is founder-built today. Founding credentials are issued under temporary bootstrap rules so the first trust network can exist. These powers are public, limited, and subject to transition once members can govern the system.

### Public Roadmap Reveal

Publish the democratic socialist enterprise roadmap on the website as a transparent transition plan, not as a claim that the cooperative already exists.

Suggested framing:

> Humanity Commons is founder-built today, member-governed by design. This roadmap shows how we move from product to commons.

### Calls To Action

Primary CTAs:

- Create a Humanity Card (when live).
- Create a Commons Pass (when live).
- Read the protocol and standards.
- Bring Humanity Commons to an event or community.
- Run a compatible resolver (second operator path).
- Read the Commons Roadmap.
- Order a sticker/card (optional merch).
- Become a supporter.

Secondary CTAs:

- Review the constitution.
- Review the technical standards.
- Review the product trust model.
- Read the movement narrative.
- Read the skeptic FAQ.
- Apply to be a bootstrap steward.
- Host a founding ceremony.
- Bring Humanity Commons to your cooperative/community.

### Artifact Drops

Launch artifacts should be meaningful, not merch spam. Stickers and cards are the simplest trust artifacts, but the launch does not need to wait for them to "take off" before testing clothing. A small clothing capsule can be part of the founding campaign if it stays operationally contained.

Possible drops:

- Founding Humanity Card.
- First QR sticker.
- "No phone. No ads. No follower count." sticker.
- Founding shirt or hoodie capsule.
- Steward kit.
- Early supporter card pack (optional).
- Event table kit.

Founding clothing constraints:

- Keep the first clothing drop to one or two SKUs.
- Use standard blanks, sizes, and colors.
- Avoid promising membership, verification, or governance power through purchase.
- Prefer campaign graphics over identity-bearing QR placement unless item-scoped QR logistics are fully tested.
- If a clothing item includes a QR, it must use the same printed-item QR rules as stickers/cards: unique item QR, revocation, and bearer warning.
- Treat clothing as brand/campaign visibility first, not proof infrastructure.

Each drop must state:

- Buying this does not verify you.
- Holding this does not prove identity.
- The QR resolves to current card status.
- Unique item QR can be revoked if stolen/lost.

### Press/Social Narrative

Angles:

- "An anti-surveillance public card for real humans."
- "A founder-built identity tool with a public member-governance roadmap."
- "A cooperative alternative to platform identity."
- "Physical cards and stickers that resolve to live revocable trust states."
- "Proof-of-personhood without government ID or crypto speculation."
- "Prove you're real without becoming a data product."
- "No phone, no ID, no ads, no tracking."

### Viral Loops To Design For

The product becomes shareable when the card is a simple status object with moral clarity.

Primary loops:

- Founding card loop: people create attractive cards and share screenshots.
- Vouch loop: users invite trusted friends because vouching requires real humans.
- Live proof loop: in-person scanning becomes memorable when someone asks for live control.
- Physical artifact loop: stickers/cards spark scans in the real world.
- AI backlash loop: people want a humane alternative to bot panic and surveillance verification.
- Community adoption loop: one event, co-op, or group uses cards, then members carry them elsewhere.
- Anti-platform narrative loop: "No phone. No ID. No ads. No tracking."

Do not rely on ideological agreement alone. The card must be useful and legible in a concrete situation.

### Viral Governance Without Lying

Use visible governance as campaign material, but label it honestly.

Good:

- Public roadmap.
- Public constitution.
- Public decision logs.
- Open comment windows.
- Optional early tester scan circles / ceremonies.
- Transparent revenue goals.
- "Founder-built today, member-governed by design."

Bad:

- Claiming members control the project before they do.
- Token votes that do not bind anything.
- Hiding founder override powers.
- Pretending a cooperative exists before it legally or operationally does.

The useful version is not fake democracy. It is public rehearsal for the institution being built.

---

## 6. Legal Structure Path

This is not legal advice. It is a planning map for discussion with counsel.

### Option A: Multi-Stakeholder Cooperative

**Best for:** Worker, user, steward, and organization governance in one structure.

**Pros:**

- Matches mission.
- Formal member classes.
- Democratic legitimacy.
- Surplus allocation can be member-governed.

**Cons:**

- More complex.
- State law varies.
- Fundraising can be harder.
- Governance overhead can slow operations.

### Option B: Worker Cooperative Plus User Assembly

**Best for:** Strong labor control with separate user rights governance.

**Pros:**

- Clear worker ownership.
- Easier workplace governance.
- User assembly can ratify rights-affecting standards.

**Cons:**

- Users may lack true ownership.
- Requires binding documents to keep user assembly meaningful.

### Option C: Trust-Owned LLC

**Best for:** Locking mission and preventing investor/founder extraction while keeping operational flexibility.

**Pros:**

- Flexible operations.
- Can encode purpose.
- Can prevent sale/control drift.
- Compatible with workers and members having governance rights.

**Cons:**

- Less familiar to members.
- Requires careful legal design.
- Democratic legitimacy must be designed, not assumed.

### Option D: Nonprofit Standards Foundation Plus Operating Company

**Best for:** Separating protocol/user rights from commerce and services.

**Pros:**

- Standards can be protected.
- Grants may be easier.
- Operating company can sell services/artifacts.

**Cons:**

- Two-entity complexity.
- Risk of foundation/company split incentives.

### Option E: Public Benefit Company With Conversion Promise

**Best for:** Early transitional phase before cooperative/trust conversion.

**Pros:**

- Familiar.
- Easier fundraising and contracting.
- Can move quickly.

**Cons:**

- Weak democratic ownership by default.
- Conversion promise must be credible and time-bound.

### Recommended Path

1. Start with current entity for v1 build.
2. Publish governance transition promise.
3. Form bootstrap steward council.
4. Public launch; optional early tester pool.
5. Consult counsel on multi-stakeholder cooperative vs trust-owned LLC.
6. Choose structure after real member/revenue data exists.
7. Convert before governance claims outgrow the legal reality.

### Federation And Operator Liability

Resolvers are **operators**, not neutral physics. The public plan MUST include:

- What the reference operator stores (see `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md` §5).
- How legal requests are handled.
- How a second operator joins without forking the trust grammar.
- That **blockchain is not** the v1 legitimacy story—open standards and plural hosts are.

---

## 7. Abuse And Moderation Playbook

### Principles

- No shadow bans.
- No hidden trust scores.
- No silent scan analytics.
- No public shaming process for ordinary disputes.
- Appeals must exist for suspensions.
- User revocation remains an owner right.

### Abuse Cases

#### Impersonation

**Examples:**

- Someone creates a misleading handle.
- Someone uses another person's printed QR.
- Someone claims to be a public figure or organization.

**Response:**

- Clear report path.
- Verified impersonation can trigger suspension.
- Printed QR pages warn that possession does not prove identity.
- Live proof required for higher-trust contexts.

#### Stolen Stickers Or Cards

**Response:**

- Owner revokes the printed-item QR.
- Sibling item QR credentials remain active.
- Scan page shows revoked item status.
- Support explains that revocation changes scan result but does not recall the object.

#### False Vouches

**Examples:**

- Vouching for someone not known.
- Paid vouching.
- Collusive vouch rings.

**Response:**

- Vouch revocation.
- Voucher quota enforcement.
- Waiting period enforcement.
- Steward review for suspicious clusters.
- Do not expose private social graph details publicly.

#### Harassment

**Examples:**

- QR used to direct harassment.
- Public card used for targeted abuse.
- Bad-faith reporting.

**Response:**

- User revocation.
- Suspension under documented conditions.
- Appeal rights.
- Rate limits and abuse controls.

#### Illegal Content

**Response:**

- Resolver operates under jurisdictional law.
- Suspension requires documented reason and appeal path where legally possible.
- Preserve no more data than required.

### Appeal Process

Minimum viable appeal process:

1. User receives notice.
2. Public card shows suspension status, not silent failure.
3. User can submit appeal.
4. Steward group reviews.
5. Decision and reasoning are logged.
6. Reinstatement path is documented.

---

## 8. Public Financial Policy

### Website-Ready Policy

Humanity Commons does not sell user data, scan analytics, or identity access. Revenue funds the commons.

Artifact prices are designed to cover:

- Production.
- Shipping and tax where applicable.
- Payment and platform fees.
- Support and reprint reserve.
- Operations and development.
- A transparent commons margin.

### Margin Policy

For each product category, publish:

- Production cost range.
- Platform/payment fee estimate.
- Support/reprint reserve.
- Commons operating margin.

### Revenue Use

Revenue should fund:

- Hosting and security.
- Software development.
- Customer support.
- Physical QA.
- Accessibility and documentation.
- Governance operations.
- Worker compensation.
- Reserves.

### Worker Pay Principles

At maturity:

- Publish compensation bands internally.
- Publish aggregate compensation transparency to members.
- Adopt a wage-ratio cap when team size makes it meaningful.
- Create a path to worker membership.
- Budget for support, governance, operations, and care work, not only engineering.

### Founder Compensation And Conflict Of Interest

The founder may need material stability to keep building Humanity Commons. That need should be handled through transparent compensation, not hidden reimbursement or informal debt relief.

Acceptable founder compensation paths:

- Salary after sufficient revenue or capital exists.
- Contractor pay for defined work.
- Founder sustainability stipend during the bootstrap phase.
- Relocation support only if approved as a business need under a written policy.
- Health, equipment, workspace, or travel support when tied to documented project work.

Founder compensation should be disclosed in plain language:

> Humanity Commons may compensate founding labor through salary, contractor pay, or founder sustainability stipends. Founder compensation must be budgeted, documented, and visible to members once the member-governance phase begins.

Personal debt should not be framed as a direct project expense. Car loans, credit card debt, student loans, rent, relocation, or other personal obligations may affect the founder's required salary or stipend, but the public policy should describe compensation for labor and sustainability, not reimbursement of specific personal debts.

If Humanity Commons later creates a hardship grant, debt relief, education support, relocation support, or mutual aid program, the founder may only apply under the same published criteria as other eligible members. Any founder application must require:

- Public conflict-of-interest disclosure.
- Independent review by non-founder stewards or directors.
- Recusal by the founder from the decision.
- Written reasoning for approval or denial.
- Aggregate disclosure in the next transparency report.

Early founder salary targets should be discussed as sustainability goals, not promises. For example:

- **Survival floor:** enough to avoid personal financial crisis while building.
- **Full-time sustainability:** enough to build without outside employment.
- **Mature founder salary:** a market-aware salary, such as a $100,000 target, only after revenue, grants, or capital can support it without compromising reserves, workers, user rights, or the governance transition.

The public line is:

> The commons can pay people to build and operate it. It cannot become a disguised mechanism for private extraction.

### Surplus Allocation

Possible surplus buckets:

- Operating reserve.
- Worker compensation and benefits.
- Security and audits.
- Local chapter grants.
- Mutual aid or solidarity fund.
- Open-source maintenance.
- Product reinvestment.
- Member-approved patronage if legally and financially appropriate.

### What Revenue Cannot Buy

Money cannot buy:

- Verification.
- Vouch priority.
- Suspension immunity.
- Private data access.
- Governance override.
- Better scan ranking.
- Protocol control.

---

## 9. Member Onboarding

### User vs Member

A user has a Humanity Card.

A member has a Humanity Card and opts into the governance commons under published membership rules.

### Membership Requirements

For v1 membership:

- Active Humanity Card.
- Agreement to constitution.
- No requirement for phone, email, government ID, or purchase.
- Acceptance of no-surveillance and no-pay-to-verify principles.
- Optional contribution through labor, testing, governance, support, donation, or artifact purchase.
- **No requirement** to join a private cohort before creating a card.

### Member Classes

#### User Member

Participates in rights-affecting governance.

#### Worker Member

Builds and operates the system with labor governance rights.

#### Steward Member

Helps with vouching, ceremonies, safety, appeals, or local operations.

#### Organization Member

An aligned cooperative, union, nonprofit, club, community, or local institution using the system.

#### Supporter Member

Supports financially or socially without special verification privileges.

### Onboarding Flow

1. Create Humanity Card.
2. Read public principles.
3. Accept member agreement.
4. Choose membership path.
5. Optionally request/receive vouches.
7. Participate in first ratification or feedback cycle.

### Member Rights At Launch

Members should have:

- Right to review constitution.
- Right to comment on standards.
- Right to participate in founding votes or polls clearly labeled by binding status.
- Right to see transparency reports.
- Right to export data.
- Right to revoke card.
- Right to appeal suspension.

### Member Responsibilities

Members should:

- Not sell vouches.
- Not imply merchandise proves verification.
- Respect consent boundaries.
- Report impersonation or abuse honestly.
- Participate in governance in good faith.

---

## 10. Website Information Architecture

### Launch Site Pages

#### `/`

**Purpose:** Explain the core product and invite action.

**Story:**

- A membership pass for communities that refuse surveillance.
- Create a community, issue passes, scan, check in, stamp.
- Founder-built today, member-governed by design.

**CTA:**

- Create a Commons Pass.
- Create a Humanity Card (when live).

#### `/card`

**Purpose:** Explain Humanity Cards.

**Content:**

- What a card contains.
- What a card does not prove.
- Verification states.
- Latest accepted vouch.
- Export and revocation.

#### `/scan`

**Purpose:** Teach scanners how to read a QR result.

**Content:**

- Card status.
- Human verification status.
- Latest accepted vouch.
- Printed-item QR status.
- Live control proof status when requested.
- Bearer warning.
- No scan analytics by default.

#### `/store`

**Purpose:** Story-row storefront.

**Content:**

- General artifacts.
- Personalized QR stickers/cards.
- Limited founding clothing and artifact drops.
- Buying does not verify.
- Holding a sticker does not prove identity.

#### `/roadmap`

**Purpose:** Show product and enterprise roadmap.

**Content:**

- V1 build path.
- Democratic socialist enterprise roadmap.
- Ownership transition.
- First 18 months.

#### `/governance`

**Purpose:** Explain governance status honestly.

**Content:**

- Founder-controlled now.
- Bootstrap operator powers.
- Member-controlled later.
- Transition triggers.
- Decision rights.
- Open comment windows.

#### `/constitution`

**Purpose:** Publish constitutional commitments.

**Content:**

- Sovereignty.
- Consent.
- Transparency.
- Resilience.
- Accountability.
- Privacy.
- Governance.

#### `/standards`

**Purpose:** Publish technical standards.

**Content:**

- QR format.
- Signed payloads.
- Resolver behavior.
- Federated operators.
- Verification records.
- Revocation.
- Export.
- Operator data retention policy.

#### `/trust`

**Purpose:** Explain what each trust level proves and does not prove.

**Content:**

- Static artifact pointer.
- Current card resolution.
- Vouched Human.
- Live control proof.
- Steward or ceremony proof.
- Forbidden claims and limitations.

#### `/movement`

**Purpose:** Explain the values and cultural reason to join without overloading the card UI.

**Content:**

- What Humanity Commons is against.
- What Humanity Commons is for.
- Why now.
- Who this is for first.
- No phone, no ID, no ads, no tracking.

#### `/use-cases`

**Purpose:** Show concrete contexts where the card is useful.

**Content:**

- Events and meetups.
- Cooperatives and member organizations.
- Mutual-aid groups.
- Online communities facing AI/bot pressure.
- Creators and independent builders.

#### `/faq`

**Purpose:** Answer skeptical objections clearly.

**Content:**

- Is this just a QR profile?
- Why not government ID?
- Can vouching be gamed?
- Is this a social credit system?
- Who controls it now?
- How does money work?

#### `/membership`

**Purpose:** Explain user vs member.

**Content:**

- Member classes.
- Public launch (open card creation).
- Optional early tester pool.
- Rights and responsibilities.
- How to join.

#### `/finance`

**Purpose:** Explain money.

**Content:**

- Revenue policy.
- Product margin model.
- Revenue use.
- Founder compensation and conflict-of-interest policy.
- No data sales.
- Surplus principles.

#### `/support`

**Purpose:** Handle operational trust.

**Content:**

- Stolen sticker/card.
- Revoked QR.
- Misprint/reprint/refund.
- Impersonation report.
- Appeal suspension.

#### `/press`

**Purpose:** Make the campaign legible.

**Content:**

- One-line description.
- Founder statement.
- Product screenshots.
- Roadmap summary.
- Contact.

### Homepage Section Order

1. Hero: A membership pass for communities that refuse surveillance.
2. How it works: create a community, issue passes, scan, check in, stamp.
3. What a scan proves and does not prove.
4. Where to use it: founding events, communities, cooperatives, and member groups.
5. Why this matters.
6. Founding artifacts.
7. Member-governed by design.
8. Roadmap preview.
9. Calls to action.

---

## Immediate Deliverables

1. Turn the public-facing narrative into website copy.
2. Publish governance transition promise as a standalone page.
3. Convert decision rights matrix into a public governance table.
4. Add scan-page copy to v1 UI requirements.
5. Add live proof model as a technical design note.
6. Publish protocol federation strategy and operator data policy.
7. Draft support pages for stolen stickers, false vouches, and appeals.
8. Publish initial finance policy, including founder compensation and conflict-of-interest policy, before taking paid orders.
9. Publish membership page before claiming member governance.
10. Put the roadmap on the website with honest status labels.
11. Publish the product trust model and forbidden claims list before launch.
12. Run copy comprehension tests for `Registered`, `Vouched Human`, printed QR bearer warnings, revoked/suspended states, and live control proof.
13. Pick one beachhead launch context and write website copy for that use case.
14. Track whether founding users invite others without being prompted.
15. Publish movement narrative, launch language kit, use-case pages, visual identity principles, and skeptic FAQ before broad public launch.
