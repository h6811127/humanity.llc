# Commons Pass Security And Privacy Model

**Status:** Security draft  
**Purpose:** Define the threat model, security requirements, privacy rules, and launch hardening gates for Commons Pass.

---

## Security Position

Commons Pass should be designed as if it will be attacked by:

- Impersonators.
- Spammers.
- Malicious community admins.
- Curious insiders.
- Scrapers.
- People trying to turn membership into surveillance.
- People trying to confuse printed artifacts with identity proof.

No documentation should claim the system is "completely secure." The correct claim is:

> Commons Pass minimizes data, signs important claims, exposes current status, separates authority, and makes unsafe states visible.

---

## Assets To Protect

| Asset | Why It Matters |
|---|---|
| Member private keys | Control Humanity Card and live proof. |
| Community authority keys | Issue passes and stamps. |
| Membership records | Reveal affiliation and community participation. |
| Private stamps | May reveal sensitive participation. |
| Event check-ins | Can reveal location/time/presence. |
| Organizer privileges | Can issue, suspend, or revoke passes. |
| Audit logs | Needed for accountability but may contain sensitive operational data. |
| Public trust state | Must not be forgeable or stale in dangerous ways. |

---

## Threats And Controls

### T-001: Forged Pass

**Threat:** Attacker creates a fake pass claiming membership in a community.

**Controls:**

- Pass issuance must be signed by community authority key.
- Public pass page must verify signature.
- Community public key must be discoverable.
- Unknown or invalid signatures must render invalid status.

### T-002: Stolen Printed QR

**Threat:** Someone uses a stolen sticker/card as if it proves identity or membership.

**Controls:**

- Printed QR resolves to current pass status.
- Printed QR warning is mandatory.
- Live control proof is available for higher-trust contexts.
- Pass or printed-item QR can be revoked.

### T-003: Malicious Organizer

**Threat:** Organizer issues false passes, revokes members unfairly, or misuses check-in data.

**Controls:**

- Community rules must be public.
- Privileged actions must be audited.
- Member export must include signed pass/stamp records.
- Suspension/revocation reason categories should be visible where policy allows.
- Future governance can require multi-sig for high-impact actions.

### T-004: Passive Scan Surveillance

**Threat:** Every pass scan becomes analytics or location tracking.

**Controls:**

- Passive scans must not create member-level analytics.
- No scan tracking pixels.
- No third-party analytics on pass pages.
- IP logs must be minimized/anonymized according to policy.
- Event check-ins require intentional organizer action.

### T-005: Check-In Surveillance

**Threat:** Event check-ins reveal sensitive affiliation or location histories.

**Controls:**

- Check-in purpose must be disclosed.
- Check-ins are private to community/member by default unless event policy says otherwise.
- Retention period must be published.
- Export and deletion/correction policy must exist.
- Avoid public attendance lists in v1 unless explicitly chosen.

### T-006: Account Takeover / Organizer Session Compromise

**Threat:** Attacker gains organizer access and issues/revokes passes.

**Controls:**

- Strong organizer authentication.
- Session expiration.
- Step-up auth for authority key actions where possible.
- Audit log and alerts for privileged actions.
- Ability to disable compromised authority keys.

### T-007: Authority Key Compromise

**Threat:** Community issuer key is compromised.

**Controls:**

- Authority key rotation.
- Key status: `active`, `rotated`, `revoked`, `compromised`.
- Compromise notice on affected community.
- Reissue passes/stamps under new key.
- Maintain revocation list for compromised key period.

### T-008: Scraping Public Passes

**Threat:** Public pass pages are scraped into a membership database.

**Controls:**

- Public fields must be intentionally public.
- Avoid global public directory in v1.
- Rate limits.
- Robots policy.
- Optional private/unlisted pass modes.
- Do not expose private stamps publicly.

### T-009: Vouch Collusion

**Threat:** Groups create fake vouch rings.

**Controls:**

- Vouch quotas.
- Waiting periods.
- Public vouch recency.
- Revocable vouches.
- Steward review for suspicious clusters.
- No algorithmic hidden trust score.

### T-010: Movement Capture / Governance Theater

**Threat:** Project claims member legitimacy while authority remains centralized.

**Controls:**

- Publish founder-controlled powers.
- Publish bootstrap authority.
- Publish transition triggers.
- Label bootstrap credentials clearly.
- Do not claim mature federation or democracy before it exists.

---

## Security Requirements

### Cryptography

- Use Ed25519 for Humanity Card signatures.
- Use signed envelopes with payload type, version, timestamp, subject, and nonce/unique ID.
- Use RFC 8785 JSON canonicalization for signed JSON.
- Verify signatures server-side before accepting claims.
- Public views should expose signature verification status where useful.

### Key Management

Member private keys:

- Must not leave user device in plaintext.
- May be exported only through encrypted backup.
- Must never be sent to Shopify, Printify, analytics providers, or community admins.

Community authority keys:

- Must be scoped to a community.
- Must support rotation and revocation.
- Should use hardware-backed or managed key storage when possible.
- If server-held in v1, must be encrypted at rest and access-controlled.

### Authentication And Authorization

- Organizer actions require authenticated sessions.
- Role-based access control must distinguish member, organizer, steward, and admin.
- Pass issuance, suspension, revocation, stamp issuance, and authority-key changes are privileged actions.
- Every privileged action must be audited.

### Data Minimization

Do not collect by default:

- Phone numbers.
- Government IDs.
- Birth dates.
- Home addresses.
- Biometric data.
- Passive scan histories.
- Social graph beyond explicit vouches/membership.

Collect only what the community workflow requires.

---

## Privacy Requirements

### Public By Intent

Public pass pages may show:

- Community name.
- Member display name/handle.
- Pass status.
- Public stamps.
- Public vouch/trust summary.
- QR status.
- Live control proof status when requested.

Public pass pages must not show:

- Private stamps.
- Private notes.
- Full event attendance history unless intentionally public.
- Payment data.
- Shipping data.
- Internal organizer notes.
- Passive scan history.

### Event Check-In Privacy

Event check-ins should be private to the community and member by default.

Public event attendance requires explicit event policy and member-visible disclosure.

### Retention

Each community must publish retention for:

- Membership records.
- Check-ins.
- Stamps.
- Audit logs.
- Support records.

Default recommendation:

- Public signed claims persist unless revoked/expired.
- Check-ins retain only as long as needed for community operations.
- Audit logs retain longer but with restricted access.

---

## Abuse And Safety

V1 must support:

- Report impersonation.
- Report false vouch.
- Report abusive community.
- Revoke personal card.
- Revoke printed QR.
- Appeal community suspension if community rules allow.
- Contact support for key loss or confusing status.

No shadow suspension:

- Pass is active, pending, revoked, suspended, expired, unknown, or invalid.
- There is no hidden "limited visibility" state.

---

## Launch Security Gates

Do not public launch until:

- Signed pass issuance works.
- Invalid signatures are rejected.
- Pass revocation works.
- Community authority key rotation path is documented.
- Organizer privileged actions are audited.
- Passive scan analytics are absent.
- Event check-in is intentional.
- Public/private stamp visibility is enforced.
- Rate limits exist on public routes.
- Security headers are configured.
- No private keys are logged.
- No secrets are present in client bundles.
- Copy clearly says pass is not legal ID.

---

## Security Review Checklist

Before first pilot:

- Review all public pages for overclaims.
- Test forged pass fixture.
- Test revoked pass fixture.
- Test suspended community fixture.
- Test compromised authority key fixture if implemented.
- Test organizer role boundaries.
- Test event check-in permissions.
- Test private stamp leakage.
- Test export contents.
- Test logs for sensitive data.
- Test mobile Safari QR scan flow.

---

## Incident Response

Minimum incident process:

1. Classify incident: key compromise, data leak, forged credential, abuse, outage, provider failure.
2. Disable affected authority key or route if needed.
3. Preserve audit evidence.
4. Notify affected community/member where appropriate.
5. Publish public notice for trust-impacting incidents.
6. Rotate keys/reissue credentials if needed.
7. Write postmortem.
8. Update docs/tests.

---

## Security Philosophy

Commons Pass should not ask people to trust vibes.

It should ask them to trust:

- Minimal data.
- Signed claims.
- Current status.
- Visible revocation.
- Explicit limits.
- Public rules.
- Audit logs.
- The right to exit.

