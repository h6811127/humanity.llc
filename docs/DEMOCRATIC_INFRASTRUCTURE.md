# Democratic Infrastructure

**Status:** Canonical product direction  
**Purpose:** State what Humanity Commons is building, what it is not, and why a revocable QR is useful when the first scan page looks simple.

**Related:** `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`, `docs/V1_PRODUCT_TRUST_MODEL.md`, `docs/SKEPTIC_FAQ.md`

---

## 1. Direction lock

Humanity Commons is **democratic infrastructure**, not a platform empire.

| We are building | We are not building |
|-----------------|---------------------|
| Portable trust grammar (signed card, live QR, vouches, revoke) | One global feed or social graph |
| Federated resolvers any community can run | A single identity honeypot |
| Member-governed standards over rights-affecting rules | Surveillance analytics as the business model |
| Honest scan pages that separate what is proved | “Verified human” theater on stickers or legal-ID claims |

**Power** comes from protocol adoption, repeat checks at the door, and orgs that depend on the same resolver API—not from locking users inside one app.

**Commons Pass** (community membership, events, check-in, stamps) is the **organizer layer on top of** the Humanity Card. Phase A proves the card loop; Phase D expands into org tools. See `docs/V1_0_ARCHITECTURE_ROADMAP.md`.

---

## 2. Why anyone should care about a revocable scan

A static QR that opens a “simple card page” **is** useless if that is all it ever does.

The product is not “Linktree with a red QR.” The product is a **live trust object** at scan time:

### What a scan is supposed to answer (in seconds)

1. **Is this card or printed QR still valid right now?** (active, revoked, suspended, expired, unknown)
2. **What social trust is attached?** (e.g. vouches under published rules—not a hidden score)
3. **Did the person nearby just prove control of the key?** (live control—optional, short-lived)
4. **What does this scan explicitly not prove?** (no legal ID, no “holder owns this sticker” from QR alone)

Revocation matters because **physical trust leaks**: stolen stickers, lost cards, breakups, expelled members, compromised keys. A profile link cannot say “this printed item is dead” without you trusting the platform forever. A resolver can.

**Owner actions (distinct — not one “revoke” button):** **Revoke QR** (one pointer), **Disable card** (whole profile off), **Suspend** (governance only), and (future) **Delete**. Vocabulary, scan copy, and physical-ID warnings: `docs/REVOKE_AND_LIFECYCLE_V1.md`.

### Value stack (phased)

| Layer | What the user gets | When |
|-------|-------------------|------|
| **L0 — Live status** | Current card/QR state, signed public data, clear limits copy | Phase A MVP |
| **L1 — Social trust** | Vouches, founding/steward credentials, recency | Phase A–B |
| **L2 — In-person proof** | Live control challenge (“prove you hold the key now”) | Phase A (alpha) / M7 |
| **L3 — Physical wedge** | Per-item QR on merch; revoke one sticker without killing the card | Phase B–C |
| **L4 — Community ops** | Commons Pass: membership, events, check-in, stamps | Phase D |
| **L5 — Federation** | Same card works across operators; export and exit | Phase E |

If we ship only L0 forever, skeptics are right to shrug. The roadmap exists so L0 is the **foundation**, not the **ceiling**.

### Who cares first

Groups that already need trust **without** feeding Meta, government ID, or scan analytics:

- Cooperatives and member orgs (portable member credential).
- Mutual-aid and local crews (known-in-the-group without phone dumps).
- Events and meetups (scan + optional live control demo).
- Online communities fighting bots (pseudonymous card + vouch graph, not KYC theater).

They care because the scan is a **check**, not a **profile view**: “Can I rely on this object for *this* interaction under *these* rules?”

---

## 3. Technology stance (no blockchain core)

Trust is **Ed25519-signed documents + operator-hosted resolver state**. Not a public chain, not NFT identity, not wallet-based “humanity.”

Optional transparency anchoring is **out of v1 scope** and only reconsidered if governance defines a concrete need that a database cannot meet honestly. See `docs/V1_DECISION_LOCK.md`.

Cryptography here means **signatures and inspectable state**, not cryptocurrency.

---

## 4. Honest MVP vs vision

**MVP (Phase A)** will look thin on purpose: create card, scan trust-state page, revoke, stranger-tested. That is the minimum honest loop.

**Vision** is infrastructure: federated operators, Commons Pass in real orgs, merch as distribution, second operator proving the protocol is not a single-company trap.

Do not market the empire before the loop works. Do not apologize for the loop by pretending a static profile is enough.

---

## 5. Doc map for skeptics and builders

| Question | Read |
|----------|------|
| Isn’t this just a QR profile? | `docs/SKEPTIC_FAQ.md` § Isn’t This Just A QR Profile? |
| What does each scan level prove? | `docs/V1_PRODUCT_TRUST_MODEL.md` |
| Revoke QR vs Disable card / lifecycle | `docs/REVOKE_AND_LIFECYCLE_V1.md` |
| Concrete situations | `docs/V1_USE_CASES.md` |
| Build order | `docs/V1_0_ARCHITECTURE_ROADMAP.md` |
| Federation and launch | `docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md` |
