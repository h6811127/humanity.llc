# M6  -  Vouching design

**Status:** Step 1 (V-001) shipped in repo  -  verify on production; Steps 2–3 shipped; Step 4 internal cluster flags shipped; steward review queue pending
**Canonical refs:** [`VOUCH_TRUST_POSITIONING.md`](VOUCH_TRUST_POSITIONING.md) (product framing), [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) (adversarial catalog), `docs/V1_PRODUCT_TRUST_MODEL.md` § Level 2, `docs/V1_ADVERSARIAL_REVIEW.md` § Perspective 1, `docs/features/Human Verification v1.0.md`, `docs/V1_IMPLEMENTATION_BACKLOG.md` (V-001, V-002)  
**Product thesis:** Live control proves recent key possession. Vouching proves **accountable humans staked public, revocable attestations** on this card under published rules—not legal ID, not global biometric uniqueness, not liveness at every click.

---

## Mental model

Read [`VOUCH_TRUST_POSITIONING.md`](VOUCH_TRUST_POSITIONING.md) first for AI-era framing, integrator policy, and positioning vs biometric global ID.

Humanity Commons v1 does not try to be a government ID or a central proof-of-personhood warehouse. It makes **mechanism-visible social trust** portable:

- A scan shows **current resolver state** (card active, QR active, verification summary).
- **Vouch** (verb) = an eligible human **signs and publishes** a revocable attestation: they know this profile as a distinct human, in person, on the record.
- When enough **active, accepted** vouches exist, the card earns **Vouched Human**  -  not “Verified Human” unless copy testing says otherwise.

The scanner-facing sentence is:

> Three humans on this network vouched for this card under published rules.

Do not lead with graph theory, “sybil solved,” or “bot-proof.” In 2026 the honest claim is **accountability**: who signed, under what rules, revocable how. Adversarial detail stays in [`V1_ADVERSARIAL_REVIEW.md`](V1_ADVERSARIAL_REVIEW.md) and operator audit hooks—not the first scan screen.

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
| Real-time liveness at vouch time (lab / iris / continuous) | No  -  in-person ritual + policy; pair with live control when possession matters |
| The person holding a printed QR is the card owner | No |
| Recent key control | No  -  that is live control (M7), separate block |
| That synthetic agents cannot exist on the internet | No  -  vouch is sufficient for **accountable participation** gates, not all AI abuse |

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
3. Live control (recent key proof  -  green block).

**Human trust row  -  default copy patterns:**

| State | Title | Subtitle |
|---|---|---|
| Unverified / registered | Registered | No accepted human vouches yet |
| 1–2 active vouches | Registered | 2 accepted vouches  -  needs 3 for Vouched Human |
| ≥3 active vouches | Vouched Human | Latest vouch {recency} · count on this operator |
| Revoked / suspended | (override) | Positive badges hidden; explain override |

**Recency:** show `latest_accepted_vouch_at` as a human-readable freshness signal (“Latest vouch 3 days ago”), not as a permanent badge.

**Limitations row:** retain “What this scan does not prove”  -  vouch honesty, legal identity, physical possession.

### Voucher flow (card client)

1. Voucher opens vouchee card (scan or profile link).
2. Voucher confirms eligibility (already Vouched Human or steward, past 90-day wait, quota remaining).
3. Voucher signs a **standardized public statement** (editable within 280 chars; default template in copy kit below).
4. Optional **private note** stays on device only  -  never POSTed to resolver (server rejects `private_note` in body today).
5. Success: signed vouch accepted; vouchee summary updates when threshold met.

### Vouchee flow

- Request vouches by sharing card link / QR  -  no central “friend finder.”
- Show progress: “2 of 3 active vouches” without exposing voucher private notes.
- When verified: label upgrades to **Vouched Human** with method summary “vouch.”

---

## Abuse prevention

Design for hostile actors, not only happy-path founders. **Full threat catalog:** [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) (IDs **R-***, **V-***, **G-***, **S-***, **H-***, **I-***, **A-***, **O-***).

**Critical graph insight:** A **4-account clique** (each vouches the other three) is the minimum mutual ring that can elevate every member to **Vouched Human** without outsiders. A 3-person cycle cannot satisfy “3 distinct vouchers” per node. Rotating **A→B→C→A** rings evade the `closed_loop_only` audit flag—triage must use shared-set flags and manual review.

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

**Ring detection (operator-only, not public)** — implemented in `worker/src/db/vouch-audit.ts`:

| Flag | Catches | Misses |
|------|---------|--------|
| `closed_loop_only` | Mutual-only pairs | **G-02** rotating 3-cycles (see threat model) |
| `burst_at_quota_boundary` | 5 issuances in 24h | Legitimate event bursts |
| `shared_voucher_set` | Overlapping voucher sets on two vouchees | Cliques spread across many vouchees |

Do **not** publish graph analytics on scan pages. Audits are for stewards/operators, with minimal PII and documented appeal. Response playbook: [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) §8.

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
| Revocable vouch | **Enforced** (POST revoke + summary recalc) |
| Standardized statement template | UX + validation |
| Appeal path for wrongful suspension | Governance (HV-FR-40) |

**Copy for voucher at sign time (checkbox + default statement):**

> I met them in person. This vouch is public, revocable, and not legal identity proof.

Default statement text: see **Copy kit** below and [`VOUCH_TRUST_POSITIONING.md`](VOUCH_TRUST_POSITIONING.md).

### Threat: impersonation via stolen QR / merch

Vouching does **not** solve possession. Scan copy must repeat:

> Vouches attest to the card on the network, not to the person holding this object.

Pair with live control when in-person trust matters.

### Threat: quota gaming via revoke/re-issue

**Policy (implemented with revoke, M6 Step 3):**

- Revoked vouches stop counting immediately in summary recalc.
- Re-vouching the same pair requires a **new** signed credential with a **new** nonce.
- Re-vouch after revoke **counts toward yearly quota** (default yes  -  prevents revoke-as-quota-reset abuse).

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
- Store ciphertext only if explicitly synced  -  **not** in `vouches` table used for public resolution.
- Default path: omit entirely in v1.

### Data minimization on scan

Show **aggregate + recency**, not social graph:

- Good: “3 accepted vouches · latest 2 weeks ago”
- Bad: “Vouched by @alice, @bob, @carol” on first screen (deferred unless product testing wants it)

Credential detail pages may list public evidence per `HV-FR-30`  -  still no private notes.

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
| Internal abuse flags | `worker/src/db/vouch-audit.ts`, `worker/tests/vouch-audit.test.ts` |

### Not yet built (recommended order)

**Step 1  -  Scan truth (V-001)**

- [x] Wire verification summary consistently on scan (state, label, count, recency).
- [x] Copy pass: **Vouched Human** vs registered; show progress below threshold.
- [x] Tests: revoked/suspended override; stale cache banner unchanged.
- [x] Status JSON exposes `scan.human_trust` (same copy as scan HTML) for `/created/` and clients.
- [ ] Production smoke: scan + status JSON for 0 / 2 / 3 vouches; revoked card overrides label.

**Step 2  -  Vouch issuance UX (V-002)**

- [x] Card client: **Issue vouch** on scan for eligible vouchers (`vouch-issue.mjs?v=11`).
- [x] Sign + POST flow with default statement template.
- [x] Eligibility errors surfaced in plain language (quota, wait period, not verified).
- [x] Scan explainer distinguishes network verification vs keys on this device (saved Steward detection).
- [x] `/created/` human-trust icon follows label (green shield = Steward).
- [x] `/wallet/` verification chip (Steward / Vouched Human / Registered).

**Step 3  -  Vouch revocation**

- [x] POST `/v1/verification/vouches/{vouch_id}/revoke` with signed revoke payload.
- [x] Summary recalc; quota policy for re-vouch documented and tested.
- [x] Client: sign + revoke from `/created/` for vouches issued in this browser session.

**Step 3 decision log (assumptions)**

| Decision | Choice | Rationale |
|---|---|---|
| Revoke payload type | `vouch_revocation` v1.0 | Not yet in Technical Standards §10; mirrors card `revocation` shape with vouch subjects. |
| Who may revoke (v1) | Voucher signature only | Contracts mention governance; steward revoke deferred to Step 4 / governance. |
| Revoke reason enum | `voucher_revoked` only | Matches card revoke pattern; other reasons reserved. |
| Yearly quota | Count **all** issuances in window (active + revoked) | M6 default  -  revoke cannot reset quota. |
| GET vouch metadata | Added `/v1/verification/vouches/{vouch_id}` | Supports inspection; revoke UI uses session-tracked list instead. |
| Revoke UI scope | Session `issued_vouches` only | No voucher-side list API in v1; only vouches signed in this browser appear for revoke. |

**Step 4  -  Abuse hooks (operator-only)**

- [x] Internal cluster flags (no public graph UI).
- [ ] Steward review queue spec (can be spreadsheet + manual in alpha).

**Deferred**

- Ceremony credentials (separate path).
- Device-based proof.
- Cross-operator vouch federation (see `PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`).

---

## Copy kit (launch)

Canonical framing: [`VOUCH_TRUST_POSITIONING.md`](VOUCH_TRUST_POSITIONING.md). Shipped scan strings below.

**Vouch card (explainer / interactive / success):**

| Surface | Eyebrow | Title |
|---------|---------|-------|
| Explainer | Device signing | Keys required in this tab |
| Interactive | Signed attestation | Issue vouch |
| Success | Accepted | Vouch recorded |
| Ineligible | Unavailable | Cannot issue vouch |

**Default public statement:**

> I know this person as a distinct human. This vouch is public, revocable, and not legal identity proof.

**Vouched Human (scan subtitle):**

> {n} humans vouched for this card on this network. Latest vouch {recency}. This does not prove legal identity.

**Below threshold:**

> {n} of 3 vouches accepted. This card is not yet a Vouched Human.

**CTA on explainer (when keys not loaded):**

> Sign as {label} · {Steward | Vouched Human}

**What scan does not prove:**

> That vouches were honest, that this person is globally unique, or that the holder of a printed QR is the card owner.

---

## Open questions (resolve before public launch)

1. **Public voucher handles on scan?** Default no on first screen; credential detail page only.
2. **Re-vouch after revoke and quota**  -  **confirmed:** year window includes all issuances, not just active.
3. **Bootstrap verified humans**  -  founding cohort vouch rules in `FOUNDING_COHORT_PLAYBOOK.md`.
4. **Cross-card detection**  -  same human, many cards: out of scope v1; document honestly.
5. **Comprehension test**  -  “What does Vouched Human mean?” before replacing Registered everywhere.

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

## Device keys vs network verification (read this first)

Vouching confuses people when these are mixed up. Full guide: [`docs/KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md).

- **Steward / Vouched Human** = resolver state for a `profile_id` (visible on scan, `/created/`, `/wallet/` chips).
- **Signing keys** = owner keypair in **`hc_created`** for this tab (loaded via create or **Use keys** from `hc_wallet`).
- **Vouch-ready keys:** [`VOUCH_READY_KEYS_DESIGN.md`](VOUCH_READY_KEYS_DESIGN.md) — scan-first activation (Sign as…, default for vouching, auto-load, clear keys from tab).
- **iPhone vs laptop** = separate devices unless you import a backup or save + Use keys on each.

Scan vouch UI (shipped): if keys are missing but a saved card is Steward on the network, the explainer names that card and offers **Sign as…** (or Saved cards → Use keys).

---

## Related docs

- [`docs/VOUCH_TRUST_POSITIONING.md`](VOUCH_TRUST_POSITIONING.md)  -  AI-era framing, what we own, integrator policy
- [`docs/VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md)  -  deep threats, gaps, operator playbook
- [`docs/KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md)  -  cards, keys, verification, multi-device
- `docs/M7_LIVE_CONTROL_ALPHA.md`  -  ephemeral key control (build before vouch UI polish is done)
- `docs/V1_DECISION_LOCK.md`  -  launch copy locks
- `docs/architecture.html`  -  public-facing trust map (link from scan settings when updated)
