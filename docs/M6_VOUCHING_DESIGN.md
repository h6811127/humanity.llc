# M6 — Vouching design

**Status:** Design draft (pre-build)  
**Canonical refs:** `docs/V1_PRODUCT_TRUST_MODEL.md` § Level 2, `docs/V1_ADVERSARIAL_REVIEW.md` § Perspective 1, `docs/features/Human Verification v1.0.md`, `docs/V1_IMPLEMENTATION_BACKLOG.md` (V-001, V-002)  
**Product thesis:** Live control proves recent key possession. Vouching proves that other accountable humans attested this card belongs to a distinct person — under published rules, not under legal-ID assumptions.

---

## Mental model

Humanity Commons v1 does not try to be a government ID. It tries to make **mechanism-visible social trust** portable:

- A scan shows **current resolver state** (card active, QR active, verification summary).
- **Vouches** are signed statements from eligible humans: “I attest this is a distinct human I know.”
- When enough **active, accepted** vouches exist, the card earns the public label **Vouched Human** — not “Verified Human” unless copy testing says otherwise.

The scanner-facing sentence is:

> Three humans on this network vouched for this card under published rules.

Do not lead with graph theory, sybil resistance claims, or “bot-proof.” Those belong in adversarial review and governance docs, not the first interaction.

---

## What vouching proves

| Claim | Supported? |
|---|---|
| Other eligible humans signed public vouch credentials for this card | Yes |
| Active vouches meet the published threshold (default: 3) | Yes |
| Vouches are signed, replay-protected, and revocable | Yes |
| Latest accepted vouch recency is visible on scan | Yes (V-001) |
| The voucher was honest or correct | No |
| Legal name, age, immigration status, employment eligibility | No |
| Global uniqueness (one human, one card) | No |
| The person holding a printed QR is the card owner | No |
| Recent key control | No — that is live control (M7), separate block |

---

## What vouching must never do

- Grant verification because someone bought merchandise.
- Count live control proof toward the vouch threshold.
- Store or display **private vouch notes** on public scan or card pages.
- Expose a full social graph (who vouched whom beyond approved public evidence).
- Print mutable verification labels on physical artifacts.
- Imply KYC, background checks, or legal identity.

---

## UX rules

### Scan page (Human trust block)

Keep vouching **visually separate** from:

1. Card status (active / revoked / suspended).
2. This QR status (credential scope, expiry).
3. Live control (recent key proof — green block).

**Human trust row — default copy patterns:**

| State | Title | Subtitle |
|---|---|---|
| Unverified / registered | Registered | No accepted human vouches yet |
| 1–2 active vouches | Registered | 2 accepted vouches — needs 3 for Vouched Human |
| ≥3 active vouches | Vouched Human | Latest vouch {recency} · count on this operator |
| Revoked / suspended | (override) | Positive badges hidden; explain override |

**Recency:** show `latest_accepted_vouch_at` as a human-readable freshness signal (“Latest vouch 3 days ago”), not as a permanent badge.

**Limitations row:** retain “What this scan does not prove” — vouch honesty, legal identity, physical possession.

### Voucher flow (card client)

1. Voucher opens vouchee card (scan or profile link).
2. Voucher confirms eligibility (already Vouched Human or steward, past 90-day wait, quota remaining).
3. Voucher signs a **standardized public statement** (editable within 280 chars; default template provided).
4. Optional **private note** stays on device only — never POSTed to resolver (server rejects `private_note` in body today).
5. Success: “Vouch recorded.” Vouchee summary updates when threshold met.

### Vouchee flow

- Request vouches by sharing card link / QR — no central “friend finder.”
- Show progress: “2 of 3 active vouches” without exposing voucher private notes.
- When verified: label upgrades to **Vouched Human** with method summary “vouch.”

---

## Abuse prevention

Design for hostile actors, not only happy-path founders.

### Threat: many registered cards (sybil farm)

| Control | V1 status |
|---|---|
| Card creation rate limits | Planned / partial |
| Invite or waitlist at launch | Policy (HV-FR-08) |
| Vouch threshold before trust label | **3 active vouches** (`VOUCH_THRESHOLD`) |
| No device-proof-only path in v1 slice | Deferred |

**Design rule:** registration alone must never display as human verification.

### Threat: collusive vouch ring

| Control | V1 status |
|---|---|
| 3 distinct vouchers required | Enforced in summary recalc |
| 5 active vouches per voucher per year | **Enforced** (`VOUCHER_ACTIVE_QUOTA_PER_YEAR`) |
| 90-day wait after voucher becomes verified | **Enforced** (`VOUCHER_WAIT_DAYS`) |
| One active vouch per voucher→vouchee pair | **Unique index** |
| Steward audit hooks for suspicious clusters | **Design now, build later** |

**Ring detection (operator-only, not public):**

- Flag vouchers who only vouch each other in closed loops.
- Flag burst vouching at quota boundary.
- Flag vouchees who share voucher sets above a similarity threshold.

Do **not** publish graph analytics on scan pages. Audits are for stewards/operators, with minimal PII and documented appeal.

### Threat: replay or forged vouch payloads

| Control | V1 status |
|---|---|
| Ed25519 signed documents | **Enforced** |
| Canonical payload + `type: vouch` | **Enforced** |
| Unique nonce per vouch | **Enforced** (`idx_vouches_nonce`) |
| Voucher must sign with their card key | **Enforced** |
| Voucher must be active verified human or steward | **Enforced** |

### Threat: coerced or mistaken vouch

| Control | V1 status |
|---|---|
| Voucher-initiated vouch (not vouchee self-attestation) | By design |
| Revocable vouch | **API spec’d; POST revoke not yet shipped** |
| Standardized statement template | UX + validation |
| Appeal path for wrongful suspension | Governance (HV-FR-40) |

**Copy for voucher at sign time:**

> You are attesting you know this person as a distinct human. This is not legal ID. You can revoke this vouch if you made a mistake.

### Threat: impersonation via stolen QR / merch

Vouching does **not** solve possession. Scan copy must repeat:

> Vouches attest to the card on the network, not to the person holding this object.

Pair with live control when in-person trust matters.

### Threat: quota gaming via revoke/re-issue

**Policy (to implement with revoke):**

- Revoked vouches stop counting immediately in summary recalc.
- Re-vouching the same pair requires a **new** signed credential with a **new** nonce.
- Consider whether re-vouch after revoke counts toward **yearly quota** — default **yes** to prevent revoke-as-quota-reset abuse.

---

## Privacy-first architecture

### Public by design (resolver + scan)

- Vouch count and verification state (`registered` → `verified_human` / **Vouched Human**).
- `latest_accepted_vouch_at` when active vouches exist.
- Public vouch **statement** (280 chars max).
- Vouch method enum (`in_person` in v1).
- Credential IDs for inspection (`credential_ids_json`).
- Issuer public key reference (via signed document).

### Never on resolver (v1)

- Private notes (rejected at API: `PRIVATE_NOTE_NOT_ALLOWED`).
- Voucher legal name, email, phone, government ID.
- Scan analytics tied to vouch events.
- Full adjacency list exposed on scan (“everyone X vouched for”).

### Optional future: encrypted private notes

If added later:

- Encrypt on device with vouchee or voucher key.
- Store ciphertext only if explicitly synced — **not** in `vouches` table used for public resolution.
- Default path: omit entirely in v1.

### Data minimization on scan

Show **aggregate + recency**, not social graph:

- Good: “3 accepted vouches · latest 2 weeks ago”
- Bad: “Vouched by @alice, @bob, @carol” on first screen (deferred unless product testing wants it)

Credential detail pages may list public evidence per `HV-FR-30` — still no private notes.

---

## Security and integrity

### Signed vouch document (implemented)

Required fields aligned with `worker/tests/fixtures/vouch.json`:

- `vouch_id`, `voucher_profile_id`, `vouchee_profile_id`
- `nonce`, `statement`, `method`, `created_at`
- `type: vouch`, `version`, `signature`

Server validation (`worker/src/resolver/vouch.ts`):

- Both cards active; no self-vouch.
- Voucher verified human or steward; 90-day wait satisfied.
- Quota and duplicate-pair checks.
- Signature verification against voucher public key.

### Verification summary (partial)

`recalculateVouchSummary` updates:

- `state`, `label` (**Vouched Human** at ≥3 active vouches)
- `vouch_count`, `latest_accepted_vouch_at`, `credential_ids_json`

Revoked/suspended card states must **override** positive verification on scan (already required elsewhere; re-test when vouch UI lands).

---

## Boundaries with other trust mechanisms

```text
┌─────────────────────────────────────────────────────────┐
│ Scan page trust blocks (always separate)                │
├─────────────────┬─────────────────┬───────────────────┤
│ Card status     │ Human trust     │ Live control      │
│ (resolver)      │ (vouches)       │ (M7, ephemeral)   │
├─────────────────┴─────────────────┴───────────────────┤
│ This QR / artifact status + bearer warning            │
└─────────────────────────────────────────────────────────┘
```

| Mechanism | Mutates verification? | TTL |
|---|---|---|
| Vouch | Yes (when threshold met) | Until revoked or vouchers suspended |
| Live control | **No** | 2–5 min display only |
| Revoke card | Overrides everything | Permanent until re-create policy |
| Founding badge (V-003) | Separate credential trail | Policy-linked |

---

## Implementation map

### Already in codebase

| Piece | Location |
|---|---|
| POST vouch API | `worker/src/resolver/vouch.ts` |
| D1 schema | `worker/migrations/0004_vouches.sql` |
| Threshold / quota constants | `worker/src/db/verification.ts` |
| Tests | `worker/tests/vouch.test.ts` |
| Scan human trust row (basic) | `worker/src/resolver/scan-html.ts` |
| Private note rejection | `handlePostVouch` |

### Not yet built (recommended order)

**Step 1 — Scan truth (V-001)**

- [x] Wire verification summary consistently on scan (state, label, count, recency).
- [x] Copy pass: **Vouched Human** vs registered; show progress below threshold.
- [x] Tests: revoked/suspended override; stale cache banner unchanged.

**Step 2 — Vouch issuance UX (V-002)**

- [ ] Card client: “Vouch for this person” for eligible vouchers.
- [ ] Sign + POST flow with default statement template.
- [ ] Eligibility errors surfaced in plain language (quota, wait period, not verified).

**Step 3 — Vouch revocation**

- [ ] POST `/v1/verification/vouches/{vouch_id}/revoke` with signed revoke payload.
- [ ] Summary recalc; quota policy for re-vouch documented and tested.

**Step 4 — Abuse hooks (operator-only)**

- [ ] Internal cluster flags (no public graph UI).
- [ ] Steward review queue spec (can be spreadsheet + manual in alpha).

**Deferred**

- Ceremony credentials (separate path).
- Device-based proof.
- Cross-operator vouch federation (see `PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`).

---

## Copy kit (launch)

**Vouched Human (scan subtitle):**

> {n} humans vouched for this card on this network. Latest vouch {recency}. This does not prove legal identity.

**Below threshold:**

> {n} of 3 vouches accepted. This card is not yet a Vouched Human.

**Voucher confirmation:**

> I attest this is a distinct human I know. This is not legal ID. My vouch is public and revocable.

**What scan does not prove (unchanged intent):**

> That vouches were honest, that this person is globally unique, or that the holder of a printed QR is the card owner.

---

## Open questions (resolve before public launch)

1. **Public voucher handles on scan?** Default no on first screen; credential detail page only.
2. **Re-vouch after revoke and quota** — confirm year window includes re-issues.
3. **Bootstrap verified humans** — founding cohort vouch rules in `FOUNDING_COHORT_PLAYBOOK.md`.
4. **Cross-card detection** — same human, many cards: out of scope v1; document honestly.
5. **Comprehension test** — “What does Vouched Human mean?” before replacing Registered everywhere.

---

## Exit criteria (aligns with backlog)

**V-001**

- Scan shows current verification summary with vouch count and latest recency.
- Revoked/suspended override positive labels.

**V-002**

- Three valid active vouches upgrade card to **Vouched Human**.
- Revoked vouches stop counting.
- Private notes never appear publicly.
- Abuse controls (quota, wait, nonce, pair uniqueness) covered by tests.

---

## Related docs

- `docs/M7_LIVE_CONTROL_ALPHA.md` — ephemeral key control (build before vouch UI polish is done)
- `docs/V1_DECISION_LOCK.md` — launch copy locks
- `docs/architecture.html` — public-facing trust map (link from scan settings when updated)
