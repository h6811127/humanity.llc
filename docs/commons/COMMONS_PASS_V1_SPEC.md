# Commons Pass v1.0 Specification

**Status:** Product specification draft  
**Dependencies:** Humanity Card v1.0, QR Public Profile v1.0, Human Verification v1.0, V1 Product Trust Model  
**Purpose:** Define the first buildable version of Commons Pass as community membership infrastructure.

---

## Executive Summary

Commons Pass v1.0 lets a community create a mobile web membership pass, invite members, issue signed passes to Humanity Cards, scan QR codes for current membership status, check people into events, and issue simple signed stamps.

It is built for mobile Safari first. It does not require a native app.

The product promise:

> A community can issue beautiful, secure, revocable membership passes without phone numbers, government ID, ads, scan analytics, or platform-owned identity.

---

## Product Principles

| Principle | Requirement |
|---|---|
| Community-first | The pass exists because a community has a real membership or gathering workflow. |
| Mobile web first | Scanners and members use Safari/mobile browsers through HTTPS QR. |
| Trust is explicit | Pass pages show current membership, card status, live control state, and limitations. |
| No surveillance default | Check-ins and scans are not analytics products. |
| Signed claims | Membership and stamps are signed by community authority keys. |
| Revocable | Membership passes and stamps can be revoked under public rules. |
| Portable | A person can carry credentials across communities without platform lock-in. |
| Not legal ID | Commons Pass does not claim legal identity, KYC, age verification, or background checks. |

---

## Core Objects

### Community

A group that can issue passes.

Examples:

- Cooperative.
- Meetup.
- Mutual-aid group.
- Club.
- Conference.
- Open-source community.
- Local chapter.

### Humanity Card

The personal card and key-control primitive.

### Commons Pass

A membership credential issued by a community to a Humanity Card.

### Stamp

A signed community credential or event mark attached to a pass.

Examples:

- Founding Member.
- Attended Assembly.
- Volunteer.
- Organizer.
- Speaker.
- Chapter Member.
- Co-op Worker.

### Event

A community gathering where passes can be scanned and checked in.

---

## V1 User Stories

### Community Organizer

| ID | Story |
|---|---|
| CP-US-01 | As an organizer, I want to create a community profile. |
| CP-US-02 | As an organizer, I want to invite members to receive Commons Passes. |
| CP-US-03 | As an organizer, I want to issue membership passes signed by community authority. |
| CP-US-04 | As an organizer, I want to scan a member's pass at an event. |
| CP-US-05 | As an organizer, I want to check members into an event without turning check-in into surveillance analytics. |
| CP-US-06 | As an organizer, I want to issue a simple signed stamp after an event. |
| CP-US-07 | As an organizer, I want to suspend or revoke a pass under published community rules. |

### Member

| ID | Story |
|---|---|
| CP-US-08 | As a member, I want to receive a mobile web pass for my community. |
| CP-US-09 | As a member, I want my pass to show current membership status. |
| CP-US-10 | As a member, I want to prove live control when an organizer or peer requests it. |
| CP-US-11 | As a member, I want to see stamps issued to my pass. |
| CP-US-12 | As a member, I want to revoke or hide public display where policy allows. |
| CP-US-13 | As a member, I want to export my pass and credentials. |

### Scanner / Peer

| ID | Story |
|---|---|
| CP-US-14 | As a scanner, I want to scan a pass QR and understand current membership status. |
| CP-US-15 | As a scanner, I want to know whether the pass holder has proven live control. |
| CP-US-16 | As a scanner, I want to know what the pass does not prove. |

---

## V1 Functional Requirements

### Community Creation

| ID | Requirement | Priority |
|---|---|---|
| CP-FR-01 | System MUST support creating a community record with name, handle, description, public URL, and authority keys. | P0 |
| CP-FR-02 | Community handles MUST be unique and follow safe URL rules. | P0 |
| CP-FR-03 | Community profile MUST publish pass rules, revocation rules, and data practices. | P0 |
| CP-FR-04 | Community authority keys MUST be separated from individual member keys. | P0 |

### Pass Issuance

| ID | Requirement | Priority |
|---|---|---|
| CP-FR-05 | System MUST issue a Commons Pass to a Humanity Card profile ID. | P0 |
| CP-FR-06 | Pass issuance MUST be signed by a community authority key. | P0 |
| CP-FR-07 | Pass MUST have status: `active`, `pending`, `revoked`, `suspended`, or `expired`. | P0 |
| CP-FR-08 | Pass MUST expose a public mobile web view. | P0 |
| CP-FR-09 | Pass MUST expose machine-readable JSON. | P0 |
| CP-FR-10 | Pass MUST show what it proves and does not prove. | P0 |

### QR And Scan

| ID | Requirement | Priority |
|---|---|---|
| CP-FR-11 | Pass MUST have an HTTPS QR route optimized for mobile Safari. | P0 |
| CP-FR-12 | QR MUST resolve to current pass status, not stale printed claims. | P0 |
| CP-FR-13 | QR MUST NOT encode private member data, event history, payment data, or tracking identifiers. | P0 |
| CP-FR-14 | Scan page MUST distinguish community membership, Humanity Card status, live control proof, and limitations. | P0 |

### Live Control

| ID | Requirement | Priority |
|---|---|---|
| CP-FR-15 | Scanner SHOULD be able to request live control proof from pass page. | P1 |
| CP-FR-16 | Live control proof MUST use Humanity Card key challenge flow. | P1 |
| CP-FR-17 | Live control proof MUST NOT become a permanent membership stamp. | P0 |

### Events And Check-In

| ID | Requirement | Priority |
|---|---|---|
| CP-FR-18 | Community organizer MUST be able to create an event. | P0 |
| CP-FR-19 | Organizer MUST be able to scan pass QR for check-in. | P0 |
| CP-FR-20 | Check-in MUST create an event attendance record only when the organizer intentionally checks the member in. | P0 |
| CP-FR-21 | Passive scans MUST NOT become analytics. | P0 |
| CP-FR-22 | Member-facing event attendance display MUST follow community privacy policy. | P1 |

### Stamps

| ID | Requirement | Priority |
|---|---|---|
| CP-FR-23 | Community MUST be able to issue simple signed stamps to a pass. | P0 |
| CP-FR-24 | Stamp types MUST be community-defined but constrained by approved schema. | P0 |
| CP-FR-25 | Stamp MUST include issuer, subject pass, issued_at, type, visibility, and signature. | P0 |
| CP-FR-26 | Stamp visibility MUST support at least `public` and `private_to_member`. | P1 |
| CP-FR-27 | Stamp revocation MUST be supported. | P0 |

### Export

| ID | Requirement | Priority |
|---|---|---|
| CP-FR-28 | Member MUST be able to export pass records and public stamps. | P0 |
| CP-FR-29 | Export MUST include signatures and issuer references. | P0 |
| CP-FR-30 | Export MUST NOT include private organizer notes or unrelated community records. | P0 |

---

## Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| CP-NFR-01 | Pass scan first render | < 2s p95 on mobile LTE |
| CP-NFR-02 | Public pass HTML size | < 200KB compressed where possible |
| CP-NFR-03 | QR route availability | 99.5% during launch |
| CP-NFR-04 | Check-in action latency | < 2s p95 excluding network failures |
| CP-NFR-05 | Accessibility | WCAG 2.2 AA |
| CP-NFR-06 | Mobile browser support | Current iOS Safari, Chrome Android, Firefox Android |
| CP-NFR-07 | Passive scan analytics | Disabled |

---

## Primary User Flows

### Flow 1: Create Community

```text
Organizer creates Humanity Card
  -> Organizer creates community
  -> Community authority key is generated or registered
  -> Community publishes rules and data practices
  -> Community invite link is created
```

### Flow 2: Issue Pass

```text
Organizer invites member
  -> Member creates or connects Humanity Card
  -> Community issues signed pass
  -> Member opens mobile web pass
  -> Pass QR resolves to current status
```

### Flow 3: Scan Pass

```text
Scanner opens pass QR
  -> Public pass page loads in mobile Safari
  -> Scanner sees community, member handle, pass status, card status, and limitations
  -> Scanner may request live control proof
```

### Flow 4: Event Check-In

```text
Organizer opens event check-in
  -> Organizer scans member pass
  -> System verifies pass status
  -> Organizer confirms check-in
  -> Attendance record is created
  -> Optional event stamp is issued
```

### Flow 5: Issue Stamp

```text
Organizer selects stamp type
  -> Selects eligible member/pass
  -> Community authority signs stamp
  -> Stamp appears according to visibility policy
```

---

## Public Pass Page

The public mobile pass page MUST show:

- Community name.
- Member handle or display name chosen for that community.
- Pass status.
- Humanity Card status.
- Human trust label where available.
- Live control status if requested.
- Public stamps.
- QR status.
- No scan analytics disclosure.
- What this pass does not prove.

Recommended warning:

> This pass shows current community membership status. It does not prove legal identity.

For printed passes:

> A printed QR is only a pointer to this pass. Always scan for current status.

---

## V1 Acceptance Criteria

### Community

- Organizer can create a community.
- Community profile has public rules.
- Community authority can sign pass issuance.

### Pass

- Member can receive a pass.
- Pass resolves by HTTPS QR.
- Pass shows current status on mobile Safari.
- Pass status can be revoked/suspended.
- Pass does not expose private data.

### Event

- Organizer can create one event.
- Organizer can scan member pass.
- Organizer can check member in.
- Event check-in is not passive scan analytics.

### Stamp

- Organizer can issue one stamp type.
- Stamp is signed.
- Stamp can be displayed on pass.
- Stamp can be revoked.

### Trust

- Scanner understands what pass proves.
- Scanner understands what pass does not prove.
- Live control proof is either implemented or explicitly deferred.
- Users do not confuse Commons Pass with legal ID.

---

## V1 Launch Demo

The demo should take under three minutes:

1. Create a community.
2. Invite a member.
3. Member opens Commons Pass in mobile Safari.
4. Scanner scans pass QR.
5. Scanner sees active membership.
6. Scanner asks for live control proof.
7. Organizer checks member into event.
8. Community issues event stamp.
9. Member scans pass and sees stamp.

---

## Open Questions

1. Does V1 require member authentication, or can invite links bootstrap pass issuance?
2. Who controls community authority keys at launch?
3. Can a community revoke a pass without revoking the underlying Humanity Card?
4. What stamp types are allowed in the first release?
5. Are private stamps in V1, or are all stamps public?
6. Does event check-in require live control proof, or is active pass status enough?
7. How much organizer tooling is required before the first pilot?

