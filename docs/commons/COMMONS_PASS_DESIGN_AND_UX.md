# Commons Pass Design And UX

**Status:** Design draft  
**Purpose:** Define the professional mobile web experience for Commons Pass.

---

## Design North Star

Commons Pass should feel like:

> A world-class membership pass for democratic communities.

It should be:

- Sleek.
- Mobile-first.
- Trustworthy.
- Fast.
- Professional.
- Enticing.
- Clear under pressure.
- Beautiful enough to share.

It should not look like:

- A generic QR profile.
- A government ID.
- A crypto wallet.
- A protest flyer.
- A ticketing app clone.
- A dropshipping storefront.
- A social media profile.

---

## Primary Use Environment

V1 assumes:

- Member opens pass in mobile Safari.
- Scanner opens pass after scanning HTTPS QR.
- Organizer uses mobile web check-in.
- Native app may come later but is not required.

Design for:

- Bright outdoor light.
- Crowded events.
- One-handed phone use.
- Low attention spans.
- Older phones.
- Spotty cellular.
- People who have never heard of Humanity Commons.

---

## Visual Direction

Primary accent:

```text
#DB1B43
```

Use it for:

- Brand mark.
- Active pass accent.
- Primary action.
- Community color fallback.
- Focus state.
- Important dividers.

Avoid making every warning red. Red should feel like brand energy first, danger second.

Base palette:

- White.
- Warm off-white.
- Soft gray.
- Charcoal.
- Graphite/navy.
- `#DB1B43`.
- Small green success indicator only when needed.

---

## Pass Page Layout

### Above The Fold

Must show:

1. Community brand.
2. Member handle/display.
3. Pass status.
4. Trust-at-a-glance.
5. QR or primary action.
6. Key limitation.

Recommended hierarchy:

```text
Community Header
  -> Member Pass Card
  -> Trust At A Glance
  -> QR / Scan Status
  -> Primary CTA
  -> Limitation Warning
```

### Trust At A Glance

Show three compact modules:

- Membership: `Active Member`
- Human trust: `Vouched Human` or `Registered`
- Control: `Control proven` or `Not proven`

Optional fourth:

- Stamps: number of public stamps

### Primary CTA

Scanner view:

- `Ask for live proof`
- `Read what this proves`

Member view:

- `Show QR`
- `Prove live control`
- `View my stamps`

Organizer view:

- `Check in member`
- `Issue stamp`

---

## Page Variants

### Member Pass Page

For the pass holder.

Includes:

- Community.
- Membership status.
- Personal display.
- QR.
- Stamps.
- Export.
- Privacy settings.
- Revoke/hide options where allowed.

### Public Scan Page

For anyone scanning.

Includes:

- Current status.
- What the pass proves.
- What it does not prove.
- Live control request.
- Public stamps.
- No scan analytics disclosure.

Does not include:

- Private settings.
- Private stamps.
- Organizer controls.

### Organizer Check-In Page

For authorized organizers.

Includes:

- Event name.
- Scanner camera or QR input.
- Pass status result.
- Live control requirement if policy requires it.
- Confirm check-in action.
- Issue stamp action if enabled.

### Community Page

For public discovery and legitimacy.

Includes:

- Community name and description.
- Rules.
- Data practices.
- Pass explanation.
- Join/request invite if enabled.
- Public stamps/roles if enabled.

---

## UX Flows

### Flow A: Scanner Reads Pass

1. Scanner opens QR in Safari.
2. Page loads current pass status.
3. Scanner sees `Active Member` or relevant state.
4. Scanner sees limitations.
5. Scanner can ask for live proof if context requires.

### Flow B: Ask For Live Proof

1. Scanner taps `Ask for live proof`.
2. Challenge appears.
3. Member opens/signs challenge.
4. Scanner sees `Control proven moments ago`.
5. Proof expires visibly.

### Flow C: Organizer Check-In

1. Organizer opens event.
2. Organizer scans member pass.
3. System verifies pass and event policy.
4. Organizer taps `Check in`.
5. Optional stamp is issued.
6. Member sees event stamp.

### Flow D: Issue Stamp

1. Organizer selects stamp type.
2. Organizer selects member/pass.
3. System shows preview.
4. Organizer confirms.
5. Community authority signs.
6. Stamp appears according to visibility.

---

## Status Language

### Pass Status

- `Active Member`
- `Pending`
- `Revoked`
- `Suspended`
- `Expired`
- `Unknown`
- `Invalid Signature`

### Control Status

- `Control proven moments ago`
- `Control not proven`
- `Control proof expired`
- `Owner declined proof`

### Stamp Status

- `Issued`
- `Revoked`
- `Private`
- `Expired`

---

## Critical Copy

Printed QR warning:

> A printed QR is only a pointer to this pass. Always scan for current status.

Legal identity warning:

> This pass does not prove legal identity.

Live control explanation:

> Live proof means the member's card key signed a fresh challenge moments ago.

No analytics:

> Passive scans are not used for analytics.

Membership:

> This pass shows current membership status in this community.

---

## Empty And Failure States

### Unknown Pass

> This pass could not be found.

Do not show generic 404.

### Revoked Pass

> This pass was revoked and is no longer active.

### Suspended Pass

> This pass is suspended under this community's published rules.

### Invalid Signature

> This pass could not be verified.

### Offline/Stale

> This view may be stale. Refresh before relying on current status.

---

## Professional Design Bar

The design should feel closer to:

- Stripe.
- Linear.
- Apple Wallet quality.
- Modern event credential.
- Premium mobile web SaaS.

It should not feel like:

- Linktree.
- Discord bot dashboard.
- Government form.
- Web3 wallet clone.
- Activist PDF.

---

## Shareability

A pass screenshot should be beautiful but not misleading.

Screenshot-safe elements:

- Community name.
- Member handle.
- Active status.
- Public stamps.
- "No phone. No ID. No tracking."

Screenshot must not imply:

- Legal identity.
- Global uniqueness.
- Permanent verification.
- Ticket ownership unless event ticketing exists.

---

## Design QA

A v1 design passes if testers say:

- I know what community this is for.
- I know whether the pass is active.
- I know what the QR does.
- I know this is not legal ID.
- I know how to ask for live proof.
- It looks professional enough for my community.
- I would be comfortable sharing this.

It fails if testers say:

- This looks like a QR profile.
- This looks like a government ID.
- This looks like crypto.
- This looks like a political poster.
- I cannot tell whether membership is active.
- I thought scanning tracked me.

