# Merch QR lifecycle policy

**Status:** Canonical product policy (pre-fulfillment implementation)  
**Audience:** Product, ops, engineering, support  
**Purpose:** Define how QR credentials on **physical Humanity artifacts** are born, age, fail, and die — separately from digital-only QRs and separately from human verification. Supersedes informal “QR expiry” discussion for merch; engineering and copy should cite this doc before fulfillment ships.

**Canonical companions:** [`V1_DECISION_LOCK.md`](V1_DECISION_LOCK.md) · [`REVOKE_AND_LIFECYCLE_V1.md`](REVOKE_AND_LIFECYCLE_V1.md) · [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) · [`CARD_RETENTION_AND_ORPHAN_CLEANUP.md`](CARD_RETENTION_AND_ORPHAN_CLEANUP.md) · [`MERCH_LED_V1.md`](MERCH_LED_V1.md) · [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) · [`V1_IMPLEMENTATION_CONTRACTS.md`](V1_IMPLEMENTATION_CONTRACTS.md) (`scope: print_artifact`)

---

## One-sentence policy

**Printed artifact QRs never die on a calendar; they always resolve; owners and operators can change their live meaning through revoke and disable; commerce never grants trust.**

---

## Why this document exists

Digital card creation today defaults to a **time-bounded** primary QR (`expires_at`, typically up to 365 days at create). That is appropriate for events, rotation, and abandoned browser tabs.

**Merch is different:** the buyer cannot “extend expiry” on ink. A sticker on a water bottle should not flip to **QR expired** because a SaaS clock ran out. Strangers should still get an honest page — active, revoked, or “this object is no longer in service” — not a dead link.

This policy separates:

| Layer | Question it answers |
|-------|-------------------|
| **URL** | Does the camera open a Humanity page? → **Always yes** |
| **Credential time** | Does `expires_at` pass? → **No for merch** (by default) |
| **Credential state** | Is this pointer still trusted for its purpose? → **active / revoked / replaced** |
| **Card** | Is the steward profile still on the network? → **active / disabled / suspended** |
| **Human trust** | Is the holder vouched? → **Independent; never bought** |

---

## Non-negotiables (inherit from decision lock)

1. **HTTPS print payload** — `https://humanity.llc/c/{profile_id}?q={qr_id}` (camera-first).
2. **No mutable verification on print** — no “Verified Human” on the object; trust state lives on scan only.
3. **Bearer warning** — scan + packaging: holding the item ≠ owning the card.
4. **Commerce firewall** — payment does not grant vouch, hosted tier, or verification.
5. **Revoked still resolves** — minimal tombstone scan, not 404.
6. **Sibling independence** — revoking one `print_artifact` QR must not revoke others unless card-level disable applies.
7. **No scan analytics** — no per-scan trails on the operator; aggregate order/ops metrics only.

---

## Credential taxonomy

Use **`scope`** to drive lifecycle rules (see implementation contracts).

| Scope | Typical surface | Time expiry (`expires_at`) | Primary owner action |
|-------|-----------------|------------------------------|----------------------|
| `card` | Create flow, `/created/` link, wallet | **Allowed** (7–365 days default UI; extend via API) | Revoke QR · Disable card · Rotate |
| `print_artifact` | Stickers, cards, plates, event kits | **`null` (none)** for v1 merch | **Revoke this item** · Replace item QR |
| `card` (batch / curiosity) | Tier 0 mass sticker | **`null`** OR long-lived campaign credential | Operator rotate batch · Owner adopts later (Phase C) |

**Rule:** Fulfillment MUST NOT mint `print_artifact` credentials with a calendar `expires_at` unless a future **explicit event SKU** is labeled “timed admission” in storefront copy (see [§ Creative ideas](#creative-ideas-optional-phases) · idea **#7**).

---

## Product hardening before checkout (recommended sequence)

Do **not** turn on live Shopify checkout (`checkout_open: true`) until the digital trust loop is boringly honest. Merch multiplies confusion and support load when scan/create/revoke UX is still wrong.

| Order | Gate | Doc |
|-------|------|-----|
| 1 | **M5 stranger test** — 3 people outside your network complete scan → create → revoke without coaching | [`M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md) |
| 2 | **Production P0 fixes** deployed and re-verified (e.g. `/created/` fake ID, disabled-since-visit false positive) | [`PRODUCTION_SAD_PATH_QA_2026-05-26.md`](PRODUCTION_SAD_PATH_QA_2026-05-26.md) |
| 3 | **Safari / device shell** smoke (P0-W) | [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) |
| 4 | **One vertical pilot** on a real object (status plate, lost-item relay) | [`PHASE_A_STRANGER_PATH_PRIORITIES.md`](PHASE_A_STRANGER_PATH_PRIORITIES.md) |
| 5 | **Shop stays interest-only** until founding brief + this policy gates pass | [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md) |
| 6 | Shopify metadata spike + physical QR print QA | [`V1_ASSUMPTION_REGISTER.md`](V1_ASSUMPTION_REGISTER.md) A-001, A-004 |
| 7 | **`checkout_open: true`** + fulfillment mint per this policy | [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) |

**Hosted steward billing** (Stripe subscription) is a **separate lane** from merch: commerce must never grant `steward.hosted` ([`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) commerce firewall).

---

## Tier 0 vs Tier 1 (founding drop)

### Tier 0 — Curiosity (mass walking ad)

| Field | Policy |
|-------|--------|
| **Goal** | Stranger scans → understands hook → creates card or joins interest |
| **QR model** | **Batch / campaign QR** acceptable for first drop: one or few `qr_id`s printed on many units |
| **Expiry** | **No time expiry** on campaign credential |
| **Profile** | May point at a **curiosity landing** profile (movement line) OR a neutral demo profile — not a buyer’s personal card |
| **Revoke** | Operator can **rotate batch** (new `qr_id`, old → `replaced`) if campaign ends or art misprinted |
| **Buyer expectation** | Copy: “This QR is a **door**, not your identity. Create your own card for a personal object.” |
| **Risk** | Stolen batch sticker affects all units sharing that `qr_id` → mitigate with second drop using per-item QRs |

**Exit before scaling print run:** physical scan QA (≥3 phones), comprehension test (merch ≠ vouched), batch rotate drill once.

### Tier 1 — Belonging (personalized artifact)

| Field | Policy |
|-------|--------|
| **Goal** | Holder wears **their** handle / object story; scan shows real card + vouch state |
| **QR model** | **One `qr_id` per physical item** (`scope: print_artifact`) |
| **Expiry** | **`expires_at` null** |
| **Prerequisite** | Active Humanity Card + artifact intent + metadata spike (Shopify → paid webhook) |
| **Revoke** | Owner revokes **this item only**; other stickers on same profile stay active |
| **Buyer expectation** | Copy: “This sticker points at **your** public card. You can revoke **this sticker** if it’s lost or gifted.” |

**Hard rule unchanged:** buying Tier 1 does not make you **Vouched Human**.

---

## Lifecycle states (merch-specific)

Same resolver primitive as [`REVOKE_AND_LIFECYCLE_V1.md`](REVOKE_AND_LIFECYCLE_V1.md); merch emphasizes these transitions:

```text
                    ┌─────────────────────────────────────┐
                    │  mint at fulfillment (no expires_at) │
                    └─────────────────┬───────────────────┘
                                      ▼
                                 ┌─────────┐
                           ┌────│ active  │────┐
                           │    └─────────┘    │
              owner revoke │         │         │ replace / rotate
                           ▼         │         ▼
                      ┌─────────┐    │    ┌──────────┐
                      │ revoked │    │    │ replaced │──► new qr_id on reprint
                      └─────────┘    │    └──────────┘
                           │         │
                           │    disable card (owner)
                           │         ▼
                           │    ┌──────────────┐
                           └───►│ card disabled │ (all item QRs inactive)
                                └──────────────┘
```

| Transition | Who | Scanner sees (target) |
|------------|-----|------------------------|
| **Active** | — | Full or curiosity layout per template |
| **Revoke this item** | Owner (or recovery key) | Minimal: “This QR is no longer valid” · optional short reason |
| **Replace item** | Owner or ops (reprint) | Old QR → `replaced` + link to “get a new sticker” (no PII) |
| **Disable card** | Owner | “This card has been disabled” · no human-trust block |
| **Suspend** | Governance | “Suspended under public rules” |
| **Unknown** | Purged orphan / never existed | Honest not-found path (see orphan §) |

**Never for standard merch:** silent 404, “link expired” with no explanation, or implying revoke deleted the ink.

---

## Time expiry: what we allow and forbid

| Context | Calendar expiry? |
|---------|------------------|
| Default **create** flow QR (`scope: card`) | **Yes** (product choice 7–365 days) |
| **Founding merch** (`scope: print_artifact`) | **No** (`expires_at` null) |
| **Tier 0 batch** campaign QR | **No** |
| **Event ticket** SKU (future, labeled) | **Yes** — only if product title + scan say “valid until …” |
| **Live-control challenge** | **Yes** (minutes) — different primitive |

**Scan copy when `expires_at` is null:** Do not show “QR expires …” on artifact scans; show **“This object QR does not expire”** in limits/footer if we need to contrast with digital QRs.

---

## Revoke, reprint, and support

### Owner-initiated

| Situation | Action | Physical world |
|-----------|--------|----------------|
| Sticker lost / stolen | **Revoke this QR** | Old ink still scans → revoked page |
| Gave sticker to friend | **Revoke** + optional **Replace** for self | Friend’s scan shows revoked; friend should create own card |
| Compromised backup keys | Revoke item QRs + rotate card QRs + recovery hygiene | See `M5_5_OWNER_KEY_PORTABILITY.md` |
| Leaving the network | **Disable card** | All printed items show disabled |

### Operator / support (commerce)

| Situation | Action | Commerce |
|-----------|--------|----------|
| Misprint (unscannable) | Reprint or refund; **no** resolver change if QR never issued | Shopify refund macro |
| Wrong QR printed | Revoke bad `qr_id`; issue replacement credential; reprint | Link order ↔ `artifact_intent_id` |
| Never claimed personalized order | Hold fulfillment; do not mint item QR until card link confirmed | Manual approval gate |
| Buyer demands “delete my data” | Card disable + future user-initiated delete spec; commerce export separate | Split identity vs order export (`V1_DECISION_LOCK`) |

### Reprint policy (customer-facing draft)

- **Misprint / damaged in shipping:** free reprint or refund within **[30]** days.
- **Owner revoked QR:** reprint is a **new order** (new `qr_id`); we do not “un-revoke” ink.
- **Batch Tier 0 obsolete:** operator may publish “Generation 2” sticker; Gen 1 scans show **replaced** + curiosity CTA, not shame language.

---

## Orphan purge interaction

[`CARD_RETENTION_AND_ORPHAN_CLEANUP.md`](CARD_RETENTION_AND_ORPHAN_CLEANUP.md): profiles purge after 90 days only if **no live QR** (`expires_at` null **or** future-dated counts as live).

| Scenario | Purge? |
|----------|--------|
| Merch `print_artifact` with `expires_at: null`, status active | **Protected** |
| Abandoned create (never saved keys), no vouches, no live QR | Eligible |
| Tier 0 campaign profile maintained by operator | **Protected** while campaign QR active |
| Buyer never created card; only bought Tier 0 batch | N/A — batch QR not tied to their profile |

**Printed sticker outlives network row:** If a profile is purged as orphan, scan shows **unknown / not found** — acceptable for **abandoned** registrations per retention doc. **Not acceptable** for paid merch tied to a maintained card → fulfillment must only mint QRs on **linked** profiles (Tier 1).

---

## Fulfillment pipeline (policy hooks)

Aligns with [`V1_IMPLEMENTATION_CONTRACTS.md`](V1_IMPLEMENTATION_CONTRACTS.md):

1. **`artifact_intent`** created (preview QR IDs planned, no secrets in cart).
2. Shopify paid webhook → validate metadata → **idempotent** Printify submit.
3. **Mint** `print_artifact` rows: `expires_at: null`, distinct `qr_id` per unit.
4. Artwork encodes HTTPS URL only — no order id, email, or shipping in QR.
5. Manual production approval until QA automation exists.

**Gate:** No production run until [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) physical scan QA passes.

---

## Scan page behavior by artifact type

| Scan context | Hero emphasis | Human trust block | Curiosity CTA |
|--------------|---------------|-------------------|---------------|
| Tier 0 batch (curiosity profile) | Movement / hook | Optional founding line, not buyer-specific | **Create card** · **Get the drop** |
| Tier 1 item (owner card) | Owner manifesto / object name | Show `Registered` / `Vouched Human` per policy | Still show “Create yours” for strangers |
| Revoked item | “This QR is no longer valid” | Hidden (privacy-forward) | “Create a card” only |
| Replaced item | “This sticker was replaced” | Hidden | Link to shop / rotate story |

**Limits block (merch):** Always include bearer warning + “Buying merch does not verify you” on curiosity paths; shorten on owner-owned scans but never remove bearer line entirely.

---

## Metrics (allowed without scan surveillance)

| Metric | Source | Use |
|--------|--------|-----|
| Orders, refunds, reprints | Shopify / support | Ops health |
| Scan→create conversion | **Aggregate** landing analytics (governance-approved) or M5-style manual studies | Funnel |
| Revoke rate per SKU | Resolver counts (no scanner identity) | Quality / theft patterns |
| Comprehension test pass rate | Research | Copy gates |

**Forbidden:** per-scan identity trails, “last scanned by,” heatmaps on resolver.

---

## Creative ideas (optional phases)

These are **product experiments**, not v1 commitments. Each must pass commerce-firewall and no-analytics rules before build. Full narrative below; use the index when prioritizing roadmaps.

| # | Name | Bridges | Typical phase |
|---|------|---------|---------------|
| 1 | Sticker generations | Curiosity → collectibility | Tier 0b |
| 2 | Adopt this object | Curiosity → belonging | Phase C |
| 3 | Gift mode | Commerce → recipient card | Tier 1+ |
| 4 | Lost & found relay | Object story / pilot | Phase A vertical |
| 5 | Second life revoke (`gifted`) | Revoke UX | Near-term copy |
| 6 | Rotating curiosity plate | Studios / events | Ops-friendly |
| 7 | Event ticket exception SKU | **Only** timed merch QR | Labeled SKU only |
| 8 | Reprint token | Support / theft | Tier 1 ops |
| 9 | Scan-activated warranty | Delivery proof (no surveillance) | Fulfillment |
| 10 | Community batch sunset | Campaign end without “broken link” | Tier 0 ops |
| 11 | Dual QR card (inside fold) | Education | Physical product design |
| 12 | Proof of curiosity badge | Campaign label (non-verification) | Copy/governance |

### 1. **Sticker generations** (Tier 0 → 0b)

Print **Series A / Series B** with different batch `qr_id`s. Scans show: “You found Series B — earlier stickers still work but this series funds [X].” Creates collectibility without expiring old ink.

### 2. **Adopt this object** (batch → personal)

Tier 0 buyer creates a card, then **claims** the campaign QR in wallet → resolver **replaces** batch pointer with their `print_artifact` (or issues sibling QR for “same sticker, now mine”). Bridges curiosity to belonging without reprinting.

### 3. **Gift mode**

Checkout attaches item QR to **recipient profile_id** (recipient must have card). Giver’s scan copy: “This sticker belongs to @handle.” Revoke rights stay with **owner of profile**, not gifter.

### 4. **Lost & found relay** (object story)

`print_artifact` scan shows **message + contact relay** (email/phone never in QR — owner sets relay in card). Revoke on recovery. Pairs with lost-item showcase in M5 vertical pilot.

### 5. **“Second life” revoke copy**

When owner revokes because they **gave the item away**, optional reason `gifted` → scan says: “Owner marked this sticker as given away — scan doesn’t mean they still claim it.” Reduces stranger confusion without proving new owner.

### 6. **Rotating curiosity plate**

One office/status plate with **replaceable QR tile** (magnetic overlay). Resolver `replaced` old tile IDs; plate frame copy explains rotation. Good for studios without reprinting whole plaque.

### 7. **Event ticket exception SKU**

Explicit **timed** credential: `expires_at` set, packaging says “Valid for [Event Name] weekend only.” Same URL after expiry shows **qr_expired** with event-appropriate copy — the **only** default merch-shaped product allowed to time-expire.

### 8. **Reprint token**

Owner pays support fee → ops mint **one** replacement `qr_id` tied to same profile; old → `replaced`. Wallet shows “Sticker 2 of 2 for this object intent.” Prevents infinite free reprints without blocking legitimate theft response.

### 9. **Scan-activated warranty (no surveillance)**

QR includes no warranty data; owner taps “Mark artifact received” in wallet after delivery → flips `artifact_received_at` on intent. Support macro: no reprint after 30 days unless manufacturing defect. **No** “prove you scanned today.”

### 10. **Community batch with sunset narrative**

Campaign QR eventually moves to `replaced` with copy: “This drop ended — the network still answers this URL.” Differs from **expiry** (which implies broken product); **replacement** is honest continuity.

### 11. **Dual QR card (inside fold)**

Outside: curiosity batch URL. Inside fold: owner’s personal `print_artifact` after they create a card (insert shipped later). Teaches two-layer model physically.

### 12. **“Proof of curiosity” badge (non-verification)**

Optional **non-trust** badge on scan: “Scanned from a founding sticker” for analytics-free campaigns — must not be confused with Vouched Human; governance labels it `Founding Artifact` not `Founding Human` if buyer has no vouches.

---

## Open decisions (owner / governance)

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| D-M1 | Tier 0 first run: batch vs per-item | Batch only · Per-item only · Batch then Gen 2 per-item | **Batch** for first 500; per-item before personalized Tier 1 |
| D-M2 | Campaign profile ownership | Operator-owned demo profile · Rotating `@founding_signal` | Operator-owned; clear “not a person” copy |
| D-M3 | `replaced` scan CTA | Shop · Create · None | Shop + Create for curiosity; minimal for Tier 1 |
| D-M4 | Reprint fee | Free once · Paid · Subscription perk | Free once for misprint; paid reprint after owner revoke |
| D-M5 | Null `expires_at` in protocol docs | Require explicit `lifetime: artifact` field vs null only | Null + `scope: print_artifact` for v1 |

---

## Implementation checklist (when coding starts)

| Step | Owner | Status | Doc / test |
|------|-------|--------|------------|
| Resolver: `print_artifact` ignores calendar expiry | Engineering | **Shipped** | `worker/src/resolver/merch-qr-policy.ts` · `scan-state.ts` |
| Scan UI: no “Valid until” on artifact; limits + group copy | Engineering | **Shipped** | `scan-html.ts` · `worker/tests/merch-qr-lifecycle.test.ts` |
| Mint validation helper for `expires_at: null` on artifact | Engineering | **Shipped** (helper) | `validatePrintArtifactMintExpiry` — wire at fulfillment mint |
| Fulfillment mint sets `scope: print_artifact`, `expires_at: null` | Engineering | **Shipped** | `POST …/print-artifact-qrs` · `POST …/print/orders/{id}/mint` · `fulfillment-mint.ts` |
| Artifact intent preview + cart attach metadata (A-001 spike) | Engineering | **Shipped** | `POST /v1/store/artifact-intents` · `…/attach` · migration `0014_artifact_intents.sql` |
| Shopify paid webhook → commerce order link (O-001) | Engineering | **Shipped** | `POST /v1/webhooks/shopify/orders` · migration `0015_commerce_order_links.sql` |
| Print fulfillment queue + catalog + artwork (O-002) | Engineering | **Shipped** (queue + live submit) | `POST /v1/print/orders` · `printify-client.ts` · `PRINTIFY_SUBMIT_ENABLED` gate |
| Printify webhook status sync (O-003) | Engineering | **Shipped** (webhook slice) | `POST /v1/print/webhooks/printify` · migration `0018_printify_webhook_receipts.sql` · reconciliation polling deferred |
| Operator fulfillment lookup chain (O-003) | Engineering | **Shipped** | `GET /v1/operator/fulfillment/lookup` · Shopify/commerce/intent/print order ids |
| Orphan purge respects null expiry | Engineering | **Shipped** (existing) | `orphan-purge.test.ts` |
| Tier 0 batch rotate runbook | Ops | **Shipped** | [`TIER0_CAMPAIGN_QR_RUNBOOK.md`](TIER0_CAMPAIGN_QR_RUNBOOK.md) |
| Support macros: misprint vs revoke vs reprint | Ops | **Shipped** (draft) | [`MERCH_SUPPORT_MACROS.md`](MERCH_SUPPORT_MACROS.md) |
| Comprehension test includes “sticker doesn’t expire” | Product | Pending | `LAUNCH_LANGUAGE_KIT.md` § Sticker FAQ · question 12 in tier-specific test |

---

## Launch gates (add to founding brief)

Before `checkout_open: true` on production:

- [ ] This policy linked from internal launch checklist
- [ ] Fulfillment spec refuses `expires_at` on `print_artifact` mint
- [ ] Scan comprehension includes: URL always works; merch QR doesn’t calendar-expire; revoke ≠ erase ink; merch ≠ vouched
- [ ] Reprint/refund macros drafted in support doc
- [ ] One batch rotate drill (Tier 0) or one per-item revoke drill (Tier 1) completed in staging

---

## Related documents

| Doc | Use |
|-----|-----|
| [`MERCH_LED_V1.md`](MERCH_LED_V1.md) | GTM phases A–D |
| [`FOUNDING_DROP_BRIEF.md`](FOUNDING_DROP_BRIEF.md) | Pre-launch gates · QR model table |
| [`SHOP_TIER0_IMPLEMENTATION.md`](SHOP_TIER0_IMPLEMENTATION.md) | Interest-only shop · `checkout_open` |
| [`LAUNCH_LANGUAGE_KIT.md`](LAUNCH_LANGUAGE_KIT.md) | § Sticker FAQ (customer copy) |
| [`REVOKE_AND_LIFECYCLE_V1.md`](REVOKE_AND_LIFECYCLE_V1.md) | Revoke QR vs disable card |
| [`V1_DECISION_LOCK.md`](V1_DECISION_LOCK.md) | Locked merch expiry row |
| [`V1_IMPLEMENTATION_CONTRACTS.md`](V1_IMPLEMENTATION_CONTRACTS.md) | `print_artifact` mint rules |
| [`V1_ASSUMPTION_REGISTER.md`](V1_ASSUMPTION_REGISTER.md) | A-004 print QA · A-006 per-item QR · A-012G comprehension |
| [`CARD_RETENTION_AND_ORPHAN_CLEANUP.md`](CARD_RETENTION_AND_ORPHAN_CLEANUP.md) | Orphan purge vs live merch QR |
| [`M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md) | Gate before money |
| [`PRODUCTION_SAD_PATH_QA_2026-05-26.md`](PRODUCTION_SAD_PATH_QA_2026-05-26.md) | Trust bugs before checkout |
| [`TIER0_CAMPAIGN_QR_RUNBOOK.md`](TIER0_CAMPAIGN_QR_RUNBOOK.md) | Batch sticker QR + rotate drill |
| [`MERCH_SUPPORT_MACROS.md`](MERCH_SUPPORT_MACROS.md) | Support reply templates |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-26 | Initial policy draft (planning) |
| 2026-05-26 | Hardening sequence, creative ideas index, cross-links across docs |
| 2026-05-26 | Resolver + scan UI: `merch-qr-policy.ts`, tests (`merch-qr-lifecycle.test.ts`) |
| 2026-05-26 | `POST …/print-artifact-qrs` mint API (`issue-print-artifact-qr.ts`) |
| 2026-05-26 | Tier 0 null `expires_at` on card-scoped batch QRs; runbook + support macros |
