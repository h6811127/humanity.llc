# Root card and child objects

**Status:** Canonical product direction for the post-v1 object model  
**Audience:** Product, protocol, frontend, resolver, commerce, and support  
**Architecture layers:** [`LIVE_OBJECT_ARCHITECTURE.md`](LIVE_OBJECT_ARCHITECTURE.md) · [`QR_DESIGN_SPACE.md`](QR_DESIGN_SPACE.md) (public catalog)  
**Related:** [`OWNERSHIP_AND_CONTROL_MODEL.md`](OWNERSHIP_AND_CONTROL_MODEL.md) · [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) · [`Technical Standards v1.0.md`](Technical%20Standards%20v1.0.md) · [`REVOKE_AND_LIFECYCLE_V1.md`](REVOKE_AND_LIFECYCLE_V1.md) · [`MERCH_QR_LIFECYCLE_POLICY.md`](MERCH_QR_LIFECYCLE_POLICY.md)

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

## Product UX maturity (May 2026)

**Protocol and resolver:** Shipped and aligned with this doc — parent-signed `child_objects` rows, `scope: child_object` QRs, object-first scan HTML, per-object disable/revoke, no operator key custody, no scan analytics.

**Steward shell:** **Bridge complete for v1 child-object tree** (steps 13–16). Hub and **My cards** show nested children; `/create/` converges on general root; register + first scan link is one action; backup seatbelt gates growth. Legacy flat-card create remains for strangers and pilots. Remaining gap: **delegated child keys** (step 17, deferred until team/event pilots demand them).

| Layer | Maturity | Notes |
|-------|----------|--------|
| Trust / anti-surveillance | **Strong** | Same data-minimization posture; children inherit root control, not human verification |
| Protocol simplicity | **Strong** | One root key; no child private keys by default |
| Steward UX simplicity | **Strong (v1 tree shipped)** | General root + Add object on Live; nested hub rows; combined register+QR; legacy flat `/create/` templates remain |
| Cross-context robustness | **Strong** | Resolver child list + reconcile on `/created/` and hub; same-origin storage rules documented |

### Bridge vs target (steward-facing)

| Question | Flat pilot (`/create/?template=…`) | Child object (`/created/` → Add … under root) |
|----------|--------------------------------------|--------------------------------------------------|
| What gets a `profile_id`? | The plate/relay **is** the root card | Only the **general root**; children get `object_id` |
| Private keys | New owner + recovery keypair | Reuses root keys |
| First QR | Immediate at create | Register object + first scan link in one Live action (step 15) |
| Where it appears on device | **My cards** (`hc_wallet` row) | **Nested under root** in hub / **My cards** + `hc_child_objects_v1:{profile_id}` index |
| Human trust on scan | Root card’s verification | Root relationship (“Controlled by @handle”); trust stays on root |

**Product direction:** Converge new stewards on **general root first → add objects**. Keep flat pilots valid for strangers and legacy plates; do not mint a new keyed root for every door or tag when a general root already exists.

### What “feels simple” when done (steps 13–16 shipped)

1. **One visible tree** — root row in **My cards**, children nested underneath (shipped)
2. **One create story** — `/create/` emphasizes general Humanity Card; status plate / lost item are **Add object** actions (shipped)
3. **Network-backed list** — `/created/` and hub reconcile child rows from resolver truth (shipped)
4. **Shorter QR path** — register + first scan link in one Live action (shipped)
5. **Backup seatbelt** — warn/block before more objects without backup or recovery acknowledged (shipped)

---

## Device storage (same phone, PWA, other devices)

Child object **truth** lives on the resolver (D1). Child object **lists in the UI** today come from a device-only index:

| Key | Storage | Scope | Contents |
|-----|---------|--------|----------|
| `hc_child_objects_v1:{profile_id}` | `localStorage` | Per origin, per root | `{ object_id, object_type, public_label, public_state, scan_url?, status? }[]` |
| `hc_wallet` | `localStorage` | Per origin | **Root cards only** — saved keys, labels, `profile_id` |
| `hc_created` | `sessionStorage` | Per tab | Active root keys for signing |

**Shipped (first slice):** read-only `GET /.well-known/hc/v1/cards/{profile_id}/objects` returns public child rows + `active_qr_id`. `/created/` Live panels fetch this on refresh and rewrite `hc_child_objects_v1:{profile_id}` from network truth (offline: keep last local index). **Hub nested rows (step 13, first slice shipped):** general root rows in **My cards** / expanded hub show nested child rows from `hc_child_objects_v1` and reconcile from network on hub render.

### Same iPhone — what to expect

| Scenario | Child list in UI | Scans / network |
|----------|------------------|-----------------|
| Same Safari tab, reload `/created/` | Persists | Works |
| Second Safari tab on same phone | **Same** `localStorage` — list persists | Works |
| Safari tab + **Add to Home Screen** PWA | **Same origin storage** as Safari (not extra quota) — see [`PWA_INSTALL.md`](PWA_INSTALL.md) | Works |
| Clear website data / private mode | Index **gone** on device; keys may be gone too | Network still has objects; re-manage only with keys + object ids |
| Export backup on phone A, import on phone B | Index on B empty until fetch/reconcile ships | Network truth unchanged |

**Clarification:** “Weirdness on a second device” meant **another browser or another physical device** (laptop, second phone, Chrome vs Safari), or **after clearing site data** — not “opening a second tab on the same iPhone.” Tabs on one phone share `localStorage` for `humanity.llc`.

### PWA / home screen — extra storage?

**No.** Install adds a home-screen launcher and standalone chrome; it does **not** allocate a separate storage bucket or larger quota. PWA and in-browser Safari on iOS share the same origin (`localStorage` ~5–10 MB total for the site). v1 intentionally ships **without** a service worker cache for shell JS ([`PWA_INSTALL.md`](PWA_INSTALL.md) § No service worker).

Future options (same privacy posture, not shipped):

- **Resolver list + reconcile (shipped, first slice)** — read-only `GET /.well-known/hc/v1/cards/{profile_id}/objects` rebuilds the device index from network truth. **This is the right fix; it is not “more PWA storage.”** PWA install does not enlarge the quota bucket — see above.
- **`IndexedDB` child index** — only if row count or metadata exceeds comfortable `localStorage` JSON size; still same origin quota, not “PWA bonus space.”

---

## My cards and hub presentation (target)

**Should child objects appear in My cards?** **Yes — as nested rows under their root, not as peer saved cards.**

Saving a child as its own `hc_wallet` entry would imply a second key, duplicate polling, and false “human card” identity. That violates the one-root-many-objects model ([`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md)).

### Row model (recommended)

```text
My cards on this device
├─ @river_studio          Root card · Steward
│    Reachable · checked 2m ago
│    [ Open controls ] [ Open scan ↗ ]
│    ├─ Studio door       Status plate · under this root
│    │    Open · Thu–Sun until 9 PM · scan link issued
│    │    [ Update status ] [ Open scan ↗ ]
│    └─ House keys        Lost item · under this root
│         [ Update message ] [ Open scan ↗ ]
```

### Differentiation rules

| Field | Root row | Child row |
|-------|----------|-----------|
| **Title** | Custom label or `@handle` | **`public_label`** (object name — “Studio door”, “House keys”) |
| **Identity line** | `{Object type} · {Registered \| Steward \| …}` | `{Status plate \| Lost item \| Printed item} · under @handle` — **no** separate verification label |
| **Trust icon** | Green/blue shield when Steward / VH | **None** or neutral object glyph — children do not inherit human trust badges |
| **Left accent** | `classifyObjectType()` tone | `status-plate`, `lost-item`, or `wearable` per [`object-taxonomy-core.mjs`](../site/js/object-taxonomy-core.mjs) |
| **Status line** | `Reachable · checked …` from root `GET …/status?q=…` | Object state + optional recency — e.g. `Open · updated 1h ago` or `Scan link not issued` |
| **Keys / Details** | Owner key preview in **Details** | **No keys** — “Signed with root key when you last opened controls” |
| **Open controls** | Loads root into `hc_created` → `/created/` | Opens `/created/` on **parent** root, scrolls to object panel (same keys) |
| **Saved in** | `hc_wallet` | Resolver + `hc_child_objects_v1:{profile_id}` until list API ships |

**Search:** Hub local search should match child `public_label` and type under the parent root ([`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md)).

**Anti-surveillance copy:** Child rows use **updated** / **checked** (device poll or your publish action), never **scanned** or **seen by strangers** ([`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md)).

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

1. **Shared taxonomy (first slice shipped):** `object-taxonomy-core.mjs` centralizes QR scope / child-object copy; scan pages describe printed objects and child objects; lost-item relays use `[relay]` prefix via `childObjectManifestoLine()`.
2. **Device cache (shipped):** carry `scan.qr.scope` into wallet/network cache and `hc_wallet_summary` rows so hub rows can distinguish root cards from child objects.
3. **Backup gating copy (shipped):** make root backup/recovery harder to skip before many child objects, merch checkout, or steward operations.
4. **Child object endpoints (first slice shipped):** parent-signed create/update/revoke routes and `child_objects` storage.
5. **Client signing (shipped):** browser helpers in `site/js/child-object-update.mjs` sign and POST parent-signed child objects; path helpers in `site/js/child-object-api-core.mjs`; `generateChildObjectId()` in `hc-sign.mjs`.
6. **Status plate UI (first slice shipped):** `/created/` Live → **Add status plate** for general root cards; registers child objects via API and indexes them in device `localStorage` (`child-object-store-core.mjs`).
7. **Child object update UI (shipped):** publish status-line updates for registered status plates via `signChildObjectUpdate` / `postChildObjectUpdate` on `/created/`.
8. **Child object scan QR (shipped):** migration `0023_child_object_qr.sql`; `scope: child_object` + `object_id` on `qr_credentials`; `POST …/objects/{object_id}/issue-qr`; `/created/` **Issue scan link**; scan page shows object label/state from `child_objects` row (status plates use manifesto display). Tests: `issue-child-object-qr.test.ts` · `scan-context.test.ts`. **Production:** apply `0023` before deploy that selects `object_id` — [`SCAN_WORKER_1101_POSTMORTEM.md`](SCAN_WORKER_1101_POSTMORTEM.md); rollout scan smoke in `hosted-rollout-scan-smoke.mjs`.
9. **Child object disable UI (shipped):** `/created/` Live → **Disable this plate** on registered status plates; signs `POST …/objects/{object_id}/revoke`; local index marks `status: disabled`; scan shows **Object unavailable** when child is disabled.
10. **Lost-item relay child UI (shipped):** `/created/` Live → **Add lost-item relay** for general root cards; register, update return message, issue scan link, disable relay — mirrors status plate flow with `object_type: lost_item_relay` and `[relay]` scan layout via `childObjectManifestoLine()`.
11. **Browser signing fix (shipped):** `hc-sign.mjs` `requireFields()` accepts `parent_profile_id` for `child_object` payloads (create/update/revoke were failing client-side before POST).
12. **Resolver child list (first slice shipped):** read-only `GET /.well-known/hc/v1/cards/{profile_id}/objects`; `/created/` reconciles `hc_child_objects_v1` from network on Live panel refresh.
13. **Hub tree rows (first slice shipped):** nested child rows under general root in **My cards** / expanded hub; reconcile on hub render via `reconcileChildObjectsForProfileIds`; no child entries in `hc_wallet`.
14. **Create flow convergence (shipped):** `/create/` emphasizes general Humanity Card; status plate / lost item show Add-on-Live nudge when a general root with keys exists (labeled `hc-emphasis-card--info` with **Recommended path** eyebrow + paired CTA pills; compact stacked layout; E2E `e2e/create-flow-convergence.spec.ts` in device-shell CI bundle); legacy standalone pilot forms stay in a disclosure; landing copy updated.
15. **Register + first QR (first slice shipped):** `/created/` Add status plate / lost-item relay runs register + first `issue-qr` in one action (`child-object-register-issue.mjs`); per-row **Issue scan link** remains for retries and legacy rows.
16. **Backup gate (first slice shipped):** warn before a 2nd active child object without backup seatbelt; block a 3rd+ until `recovery_key_acknowledged`, encrypted backup export, or backup import (`child-object-backup-gate-core.mjs`, threshold `2`).

#### Backup gate notice visibility

**Surfaces:** `/created/` Live → **Add status plate under this root** and **Add lost-item relay under this root** (`#child-object-status-plate-backup-gate`, `#child-object-lost-item-backup-gate`). Populated by `child-object-backup-gate.mjs`.

**Contract:** A backup gate notice must occupy **zero layout** when gate logic returns no copy (`childObjectBackupGateNoticeCopy` → `null`). No empty yellow or red chrome while the steward has zero active child objects or has already saved a recovery seatbelt.

| Gate state | `hidden` | Visible copy |
|------------|----------|--------------|
| Allowed — first object, no seatbelt yet | `true` | *(none)* |
| Allowed — seatbelt satisfied | `true` | *(none)* |
| Warn — 1 active child, no seatbelt | `false` | **Save a recovery method before your tree grows** + body + **Add recovery method** |
| Blocked — 2+ active children, no seatbelt | `false` | **Save a recovery method before adding another object** + body + **Add recovery method**; submit disabled |

**Failure mode (fixed):** Placeholder markup shipped with `class="hc-notice hc-notice--warning"` and `[hidden]`. Author `.hc-notice { display: flex }` can override HTML `[hidden]` in WebKit — empty tinted bars appear above both add-object forms. Same class of bug as `#owner-revoked-banner` ([`CREATED_UI_SAFARI_HELP_REVOKE_INVESTIGATION.md`](CREATED_UI_SAFARI_HELP_REVOKE_INVESTIGATION.md) §2). **Hardening:** static HTML omits tone class until JS fills copy; CSS hides `[hidden]` and `:not(:has(.hc-notice-content))`; bump `/created/` `styles.css` cache bust after CSS changes.

**Fix rollout:**

| Step | Status | Work |
|------|--------|------|
| 1 | **Shipped** | CSS: `.child-object-backup-gate[hidden]`, `:not(:has(.hc-notice-content))`, and `.hc-notice[hidden]` in `site/styles.css` |
| 2 | **Shipped** | Vitest guard: assert hidden backup-gate rules in `worker/tests/child-object-backup-gate-core.test.ts` |
| 3 | **Shipped** | HTML/JS: no static `hc-notice--warning`; strip tone classes when hiding; `/created/` `styles.css?v=132` |
| 4 | **Shipped** | Manual QA: `/created/` Live on general root — no empty bars before first child object; warn/block copy when gate fires (confirmed prod 2026-05-30) |

17. **Delegated capabilities (deferred):** scoped, expiring, root-signed child keys — **do not implement resolver routes or steward UI** until product gates in [`DELEGATED_CHILD_CAPABILITIES_GATE.md`](DELEGATED_CHILD_CAPABILITIES_GATE.md) pass (G1–G5). **Spec prep shipped:** shape validation + `evaluateDelegatedCapabilityAccess` in [`delegation-spec.ts`](../worker/src/live-object/delegation-spec.ts). Schema RFC: [`DELEGATED_CHILD_CAPABILITY_SCHEMA.md`](DELEGATED_CHILD_CAPABILITY_SCHEMA.md).

18. **`game_node` self-serve UI (Phase E — post–Cedar Rapids pilot):** extend `/created/` Live with **Add game node** — register `object_type: game_node`, issue scan QR, season metadata editor, rules page publish. Reuses steps 6–16 signing and hub tree patterns. Terminal mint stays for CI/pilot only. Spec: [`CITY_GAME_V1_IMPLEMENTATION.md`](CITY_GAME_V1_IMPLEMENTATION.md) § Phase E.

**Sequence status:** Steps **1–16 shipped** (May 2026). Step **17** is the next **product-gated** slice, not the next default engineering slice. Step **18** follows Cedar Rapids S1 launch (Phase D gates).

