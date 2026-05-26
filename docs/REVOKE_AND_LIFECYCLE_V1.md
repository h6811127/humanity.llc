# Revoke & card lifecycle (v1 product spec)

**Status:** Canonical product + protocol direction  
**Purpose:** Define **Revoke QR**, **Disable card**, **Suspend**, and **Delete** as distinct owner/governance actions; what scanners see; what stays in the URL; and what is shipped vs planned.  
**Supersedes:** Informal “revoke” wording in UI copy only  -  crypto/API field names may still use `revoked` until a labeled migration.

**Related:** `docs/Technical Standards v1.0.md` §10–11, `docs/V1_PRODUCT_TRUST_MODEL.md`, `docs/M4_CREATED_REVOKE_UI.md`, `docs/M5_5_OWNER_KEY_PORTABILITY.md`, `docs/V1_IMPLEMENTATION_CONTRACTS.md`, `docs/MERCH_QR_LIFECYCLE_POLICY.md` (printed artifacts)

---

## Core primitive

A Humanity **QR credential** (`qr_id`) is a **signed capability pointer**: it resolves to **current** resolver state until an authorized key changes that state.

**Owning the object** means owning its **lifecycle**  -  not only “delete this QR.” The interesting product is **programmable state transitions** for physical software objects. **Revoke is one transition** (pointer off). **Expiry** is another (time). Future transitions (claimed, recovered, after-next-scan, replaced) use the same primitive: **object state on the resolver**, not scan surveillance.

**Design rule (privacy):** Store **minimal object state** (`status`, `expires_at`, optional counters/reasons)  -  not **who scanned, when, or where**. No default scan logs. See §State transitions.

---

## State transitions (product frame)

| Transition | User-facing idea | Shipped? | Tracking required? |
|------------|------------------|----------|-------------------|
| **Active** | Default; scan shows live manifesto / pilot layout | ✓ | No |
| **Expired** | Validity ended (`expires_at`) | ✓ (M4.6) | No |
| **Revoke QR** | One pointer off; siblings may stay active | ✓ | No |
| **Disable card** | Whole profile offline | ✓ | No |
| **Organizer revoke** | Coalition key, `organizer_revoked` | ✓ (pilot) | No |
| **After next scan** | One-time reveal then off | Research | Counter only, not identity |
| **After N scans** | Limited tickets / clues | Research | Count only, not who |
| **Claimed / recovered** | Lost-item story states | Research | Object flags, not scanner ID |
| **Replaced / redirect** | New credential; old QR tombstone | Research | No |
| **Location / velocity** | Mismatch or abuse | **Defer** | High  -  conflicts with no-scan-analytics |

**UI vocabulary:** Prefer **lifecycle**, **state**, **transition** in explainers. Keep button labels **Revoke this QR** and **Disable card** (precise actions). Avoid implying the sticker is “deleted”  -  **the rules for this object changed**.

**Not Humanity:** scan analytics, device trails, “recent scans,” or crisis-resource **collection** on the operator. Saving a resource belongs on the **scanner’s device** (future wallet / saved resources  -  see crisis research page).

---

## Vocabulary (use in UI and docs)

| User-facing term | Protocol / D1 (today) | Who | Scope |
|------------------|----------------------|-----|--------|
| **Revoke this QR** | `target_kind: qr_credential`, `qr_credentials.status → revoked` | Owner or recovery key | One `qr_id` |
| **Disable card** | `target_kind: card`, `cards.status → revoked` | Owner or recovery key | Profile + all active QRs |
| **Suspend card** | `cards.status → suspended` | Governance keys (not owner) | Profile + policy-defined QRs |
| **Delete card** | *Not implemented*  -  see §Delete below | Owner (future spec) | Strongest privacy / export erasure story |

**UI direction:** Replace “Revoke entire card” with **Disable card**. Keep **Revoke this QR**  -  it matches stickers, wristbands, and printed items.

**Internal labels:** Resolver rows may stay `revoked`; public scan copy uses **Revoked** (QR) vs **Disabled** (card) where helpful. Trust model labels: `Revoked By Owner` vs `Suspended Under Public Rules` (`docs/V1_DECISION_LOCK.md`).

---

## What is shipped today (Phase A + M5.5)

| Capability | Status |
|------------|--------|
| Owner-signed `POST …/revoke` for one QR or whole card | **Live** |
| Recovery-key-signed revoke | **Live** (after D1 migration `0003_recovery_public_key.sql`) |
| Encrypted backup import → revoke on `/created/` | **Live** |
| Scan shows `qr_revoked` (card may stay active) or `card_revoked` | **Live** |
| Public card JSON `410` when card disabled | **Live** |
| Minimal revoke/disable scan, Show link, Disable card label, owner ID warnings | **Shipped** (M4.5, `pass-v9`) |
| Validity at create (`expires_at` 7–365 days), minimal **qr_expired** scan | **Shipped** (M4.6) |
| Post-create QR expiry extension (`POST …/qr/extend`) | **Shipped** (M4.6b) |
| Privacy modes, revoke-on-next-scan | **Not shipped**  -  this doc |

Current scan copy (whole card): handle/manifesto may still appear on revoked scans  -  **planned change** under Disable card (§Disable card).

---

## Revoke QR

**Intent:** Kill **one** printed or shared pointer (event wristband, one sticker, one scan link) without destroying the owner’s card.

### Scanner experience (target)

**Default (minimal  -  recommended for QR revoke):**

- Headline: **This QR is no longer valid**
- Optional short reason: `event ended`, `rotated`, `lost item`, `owner revoked`
- **No** handle, **no** manifesto, **no** human-trust block (privacy-forward)
- **Show link** control: scan URL hidden until tapped (shoulder-surfing + mobile layout)
- Footer: limits + data policy (unchanged honesty)

**Optional tombstone (owner choice at revoke):**

- Show `@handle` + “QR revoked” for contexts where the link was semi-public (studio door plate)

**Sibling QRs:** Other `qr_id`s on the same card stay **active** unless separately revoked (`M4.3`).

### Permanent warning (physical reality)

Printed and photographed QRs **always embed**:

```text
https://humanity.llc/c/{profile_id}?q={qr_id}
```

- **`qr_id`**  -  opaque credential id; remains in the URL forever on the physical object.
- **`profile_id`**  -  public pseudonymous id; same.

The resolver cannot erase what is **printed**. Disable/revoke changes **what the resolver returns**, not the ink. Copy must say:

> This QR code still contains its IDs. Revoking changes live status on the resolver, not the physical sticker.

**Hiding `profile_id` in the URL (research  -  not v1):**

| Approach | Tradeoff |
|----------|----------|
| Short redirect token (`/c/r/{token}`) | Indirection table on operator; token can be rotated |
| QR-only opaque resolver id | New credential type; scan routing change |
| Encrypt ids in URL | Needs key in QR; breaks “any camera scans HTTPS” simplicity |

**Decision (v1):** Keep `{profile_id}?q={qr_id}` for camera compatibility (`V1_DECISION_LOCK.md`). Document privacy modes on **scan response**, not URL shape, until a standards revision.

### Revoke on next scan (research  -  privacy mode)

**Idea (from product notes):** For QRs that should not broadcast profile details until invalidated:

1. Owner marks credential **pending revoke** (signed intent on resolver).
2. QR encodes URL + optional **encrypted payload** (capability blob); material to complete revoke may ride in QR (high capacity formats / future NFC).
3. **Until the next scan**, cached/CDN views may still show last active state; **first scan after pending** delivers payload → resolver applies revoke → subsequent scans show minimal invalid page.
4. Strangers who never rescan might see stale active HTML until cache TTL  -  honest copy required.

**Status:** **Not specified for implementation.** Requires threat model (who can replay old scans), cache rules, and optional non-HTTPS carrier. Listed under `docs/V1_0_ARCHITECTURE_ROADMAP.md` follow-up **M4.x / M7** privacy spike.

### Other QR lifecycle (planned, same primitive)

| Feature | Mechanism |
|---------|-----------|
| **Scheduled end** | `expires_at` on `qr_credential` (schema exists)  -  UI for “valid until Sunday 11pm” |
| **Replace / rotate** | New epoch; old QR → `replaced` (`A.6`) |
| **Item-scoped QR** | `scope: print_artifact`  -  revoke one merch sticker; **no calendar `expires_at` on founding merch** ([`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md)) |

### Way future (explicit non-goals for v1)

- Revoke on geofence  
- Revoke on calendar sync  
- Revoke chains (multi-party)  
- Social “ask friends to confirm revoke”  

These need accounts, location, or private graphs  -  out of scope for public scan primitive.

---

## Disable card

**Intent:** Owner retires the **whole public card**  -  all active QRs stop resolving as active; the person is not using this profile on this operator anymore.

**Maps to today’s API:** `target_kind: card` (UI label → **Disable card**).

### Scanner experience (target)

**Default (privacy-forward  -  recommended):**

- Headline: **This card has been disabled**
- **Card details not shown:** no handle, no manifesto, no verification summary
- Optional: “Disabled by owner at {time}”
- **Show link** for URL (same control as QR revoke)
- Public card JSON: **`410`** (today)

**Optional tombstone (owner choice):**

- Show former `@handle` + manifesto with clear **Disabled** badge (for bookmarked links)

### Permanent warning

Same as QR: printed QRs **still contain** `profile_id` and `qr_id`. Disable changes resolver truth, not physical artifacts.

> Profile ID and QR ID remain on anything already printed. Disabling stops live trust use; it does not recall objects.

### “Temporarily disable all QRs”

**Clarification:**

- **Today:** Disable card sets card + active QRs to **revoked** in D1  -  effectively “all pointers off” until we spec **pause** separately.
- **Future `paused` / `disabled_until` (deferred):** Reversible owner state distinct from permanent disable; would need new status enum + signed “resume”  -  not Phase A.

Do not promise “temporary” in UI until `paused` exists.

---

## Suspend card

**Intent:** **Governance** action under published rules  -  not the owner menu on `/created/`. (Owner notes left this blank; product direction is governance-only.)

Per `Technical Standards v1.0.md` §11:

- Issued by governance key(s), not owner private key  
- Public notice, cause category, appeal deadline  
- Scan label: **Suspended under public rules** (`V1_DECISION_LOCK.md`)  
- Distinct from owner disable in copy and iconography  

**Status:** Schema-ready (`suspended` on cards); **no owner UI** in Phase A. Commons Pass / steward tooling (Phase D+).

---

## Delete card

**Intent (product notes):** Stronger than disable  -  when scanned, the credential should read as **gone**, not merely turned off. Printed QRs still contain profile ID and QR ID (physical objects cannot be recalled).

**Proposed scan headline (draft):** **This credential is not available**

**Proposed direction (needs governance + legal review before build):**

| Layer | Delete behavior (draft) |
|-------|-------------------------|
| **Resolver** | Card row tombstone or removal; scans → `unknown_profile` or dedicated **deleted** kind |
| **Scan UI** | “This credential is not available”  -  no handle/manifesto (same minimal default as disable, different resolver kind) |
| **Physical QR** | Still encodes old URL + ids  -  same physical warning |
| **Export / federation** | Right to export before delete; operator retention policy |

**Not the same as:**

- **Disable**  -  honest “disabled by owner” state  
- **GDPR erasure**  -  separate operator policy (`REFERENCE_OPERATOR_DATA_POLICY.md`)

**Status:** **Not implemented.** Do not ship “Delete” button until export, appeal, and federation exit are specified.

---

## Owner surfaces (how actions are taken)

| Surface | Revoke QR / Disable card | Phase |
|---------|--------------------------|-------|
| `/created/` session key | ✓ | A |
| Encrypted backup import | ✓ | M5.5 |
| Recovery key import | ✓ | M5.5 |
| iOS Shortcut / home widget | Same POST + key from Passwords | Planned doc only |
| Scan page (owner) | **No**  -  keeps scan stranger-safe |  -  |
| Scheduled job (resolver) | `expires_at` / future `revoke_at` | Planned |

---

## Owner warnings (confirm step  -  planned copy)

Show before owner submits revoke/disable. Same physical truth for every action:

**Revoke this QR**

> This QR will stop resolving as active. **The QR code still contains its QR ID** (and profile ID in the URL). Revoking changes live status on the resolver, not the physical sticker or photo.

**Disable card**

> Card details will no longer be viewable on scan. **All active QRs on this card will stop resolving as active.** Profile ID and QR IDs remain on anything already printed or shared.

**Delete card (future)**

> Same ID warning as disable, plus export/retention policy copy before irreversible delete.

---

## Scan UI conventions (mobile  -  planned copy pass)

- **Hide scan URL** behind **Show link** on active and revoked pages  
- **Signing key help:** shorter lead, less bold, more spacing; detail in `<details>`  
- **Revoke QR** vs **Disable card** button labels on `/created/`  
- QR-revoked default = **minimal**; card-disabled default = **minimal** (tombstone optional later via signed `display_mode` on revocation  -  **future field**)

---

## Protocol sketch: optional `display_mode` (future)

Owner-signed revocation **may** later include:

```json
{
  "display_mode": "minimal | tombstone | private",
  "public_reason": "event_ended"
}
```

Resolver stores on `revocations` row; scan HTML respects mode. **Not in v1 API yet.**

---

## Milestone map

| Item | Milestone |
|------|-----------|
| Revoke QR / disable card API + basic scan | **M4** ✓ |
| Recovery + backup revoke | **M5.5** ✓ |
| UI labels (Disable card), minimal scan pages, Show link | **M4.5** ✓ |
| Scheduled QR expiry UI (create + minimal expired scan) | **M4.6** ✓ |
| QR rotation `replaced` | **A.6** |
| `display_mode` on revocation | **M4.7** |
| Revoke-on-next-scan / opaque URLs | **Research spike** |
| Suspend (governance UI) | **Phase D+** |
| Delete card | **Post-federation** spec |

---

## Doc map

| Question | Read |
|----------|------|
| What does scan prove? | `V1_PRODUCT_TRUST_MODEL.md` |
| API shapes | `V1_IMPLEMENTATION_CONTRACTS.md`, Standards §10 |
| Owner UI today | `M4_CREATED_REVOKE_UI.md` |
| Keys after tab close | `M5_5_OWNER_KEY_PORTABILITY.md` |
| Adversarial / support | `V1_ADVERSARIAL_REVIEW.md` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-23 | Initial spec from owner notes + Phase A/M5.5 implementation reality |
| 2026-05-21 | Owner warning copy, delete scan headline, cross-links across doc set |
| 2026-05-24 | M4.5 minimal scans + Show link shipped; M4.6 create validity + qr_expired minimal scan |
| 2026-05-24 | State-transition framing: revoke as one lifecycle change; minimal object state vs scan logs |
