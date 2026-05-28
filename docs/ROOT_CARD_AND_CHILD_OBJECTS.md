# Root card and child objects

**Status:** Canonical product direction for the post-v1 object model  
**Audience:** Product, protocol, frontend, resolver, commerce, and support  
**Related:** [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) · [`Technical Standards v1.0.md`](Technical%20Standards%20v1.0.md) · [`REVOKE_AND_LIFECYCLE_V1.md`](REVOKE_AND_LIFECYCLE_V1.md) · [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md)

---

## One-sentence model

One **root Humanity Card** key controls many public **child objects**; child objects can have their own IDs, QR credentials, status, and revocation without requiring users to manage a new private key for each object.

---

## Why this exists

The old flat mental model was easy to build but hard to use:

```text
one object -> one card/profile_id -> one owner key -> one backup/recovery burden
```

That model breaks down as soon as a real steward wants a status plate, a lost-item tag, a hoodie, stickers, event kits, and demos. It turns "I made stuff" into "I now hold ten identity keys." The product target is:

```text
one human/root key -> many child objects -> many QR credentials
```

The key limit should apply to **root authorities**, not every public object someone creates.

---

## Glossary

| Term | Meaning |
|------|---------|
| **Root Humanity Card** | The signed public profile for a human or steward-controlled root. It has a `profile_id`, owner key, optional recovery key, verification status, and vouch eligibility. |
| **Root key** | The owner Ed25519 key for the root Humanity Card. It signs root updates and, by default, child-object create/update/revoke operations. |
| **Recovery key** | A separate accepted key that can restore control for root and child lifecycle actions when the owner key is lost. |
| **Child object** | A nested public object controlled by the root key. It may be a status plate, lost-item relay, wearable, sticker, event kit, demo, or printed artifact. It has its own lifecycle and QR credentials, but no default private key. |
| **QR credential** | A pointer credential that resolves to current network state. A QR can point at the root card or at a child object / printed item scope. |
| **Print artifact** | A physical fulfillment record or printed item. In v1 code this is represented by `scope: "print_artifact"` and `print_artifact_id`; it is the first shipped child-object-like scope. |
| **Delegated child capability** | Future limited signing authority for one child object, time window, or operation class. It is not the default v1 custody model. |

---

## Authority rules

1. **Human trust lives on the root.** Vouches, Steward, Vouched Human, founding credentials, and human verification attach to the root Humanity Card, not to every child object.
2. **Child objects inherit control, not verification.** A child can say "Controlled by @handle"; it cannot claim to be a separate human or vouch for others.
3. **Child edits require the root key by default.** Create, update, rotate, revoke, replace, and disable-child operations are parent-signed until delegated capabilities ship.
4. **Child QRs stay individually revocable.** Revoking one child QR or printed item must not revoke sibling children unless the root card is disabled.
5. **Disabling the root is a cascade.** If the root card is disabled or suspended, child objects and their QRs must not continue presenting active trust.
6. **No operator key custody.** The reference operator must not store plaintext private keys. Recovery must use user-held backup and recovery credentials.

---

## Custody and recovery

Root-key loss is more serious in the child-object model because one key controls a larger tree. That is a feature only if recovery is treated as core onboarding, not advanced settings.

| Situation | Product requirement |
|-----------|---------------------|
| First root card | Show backup and recovery as the control seatbelt. |
| Steward, Vouched Human, or organizer root | Strongly require encrypted backup and recovery key before encouraging more public objects. |
| Many child objects or paid/printed artifacts | Gate creation or checkout behind backup/recovery confirmation where feasible. |
| Lost owner key with backup/recovery | Import once; regain control of the root and its children. |
| Lost owner key with no backup/recovery | Be honest: the operator cannot edit, revoke, or recover the tree for the user. |

Recommended copy pattern:

> Your Humanity Card key controls your public objects. Save a backup once, and you keep control of the whole tree.

---

## Resolution model

```text
Root Humanity Card
  profile_id
  owner_public_key
  recovery_public_key?
  verification summary
  |
  | parent-signed create/update/revoke
  v
Child object
  object_id (future) or v1 print_artifact_id / template scope
  object type + public fields
  lifecycle status
  |
  v
QR credentials
  qr_id
  scope: card | print_artifact | future child scope
  active / revoked / replaced / expired
```

### Current implementation bridge

The shipped v1 bridge is `scope: "print_artifact"`:

- It is controlled by the parent card owner or recovery key.
- It can be revoked independently from sibling QRs.
- It renders object-forward scan UI.
- It does not require a separate private key.

Status plates and lost-item relays currently use full card templates in the create flow. The target model is to make them child objects under a root card, while preserving legacy flat cards as valid.

---

## Public scan copy

Scanners should see the object first and the root relationship second:

- **Object:** "Printed object", "Status plate", "Lost item relay", "Live object".
- **Relationship:** "Controlled by @handle".
- **Limits:** "Holding this object does not prove you are the card owner."
- **Trust:** Human trust belongs to the root card and must not be printed as a mutable claim on the object.

Avoid copy that makes a child object sound like a separate verified person.

---

## Delegated child capabilities (future)

Delegation should be added only when the product need is real:

| Need | Possible capability |
|------|---------------------|
| Event volunteer updates one sign | Can update one child object's status until a deadline. |
| Shop employee replaces one printed item QR | Can replace QR for one `print_artifact_id`. |
| Organizer can revoke emergency campaign objects | Can revoke a bounded child set, not the root card. |

Delegated capabilities must be root-signed, scoped, expiring, revocable, and clearly separated from human vouch authority.

---

## Migration and compatibility

- Existing root cards remain valid.
- Existing multiple-card wallets remain valid for testing, separate roles, and legacy pilots.
- New product surfaces should prefer "one root card, many child objects" over encouraging users to create many keyed cards.
- Protocol fields such as `profile_id`, `qr_id`, `scope`, and `print_artifact_id` should not be renamed in small slices; map them into the child-object model.

---

## Implementation sequence

1. **Shared taxonomy (first slice):** centralize QR scope / child-object copy so scan pages describe `print_artifact` as a printed object controlled by a root card.
2. **Device cache:** carry `scan.qr.scope` into wallet/network cache so hub rows can distinguish root cards from child objects.
3. **Backup gating copy:** make root backup/recovery harder to skip before many child objects, merch checkout, or steward operations.
4. **Child object endpoints:** add parent-signed create/update/revoke routes once the data model is frozen.
5. **Delegated capabilities:** add scoped, expiring, root-signed child keys only after real team/event use cases demand them.

