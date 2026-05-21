# Protocol, Federation, And Public Launch Strategy

**Status:** Canonical strategic architecture (supersedes implicit “founding cohort gate” and “solo resolver empire” readings across the repo)  
**Purpose:** Define how Humanity Commons grows into member-governed trust infrastructure with institutional gravity—through **open standards and federated resolvers**, not a single identity honeypot, a private invite list, or a public blockchain core.

**Read this first** when deciding product scope, launch posture, privacy boundaries, or long-term power strategy.

---

## 1. Strategic Thesis

Humanity Commons wins when **communities and systems must ask a shared trust grammar for current truth** at scan time.

That grammar is:

- A **signed Humanity Card** (public document + key on the user’s device).
- **QR credentials** that resolve to **live status** (active, revoked, suspended, unknown).
- **Vouches** and optional **live control proof** under published rules—with explicit limits on what a scan proves.

**Power** (institutional adoption, standards gravity, political legitimacy) comes from:

1. **Protocol lock-in** — public spec, portable formats, multiple implementations.
2. **Federated operators** — many resolvers, one API; no single company owns “identity.”
3. **Member governance** — rights-affecting rules ratified by people who depend on the system.
4. **Repeat dependency** — orgs, events, and tools check resolver status instead of platform login or legal ID.

**Privacy** (anti-surveillance, anti-honeypot) comes from:

1. **No legal-identity pipeline** in the core loop (no government ID, KYC, or phone-as-identity for card creation).
2. **Data minimization** on operators (see §5).
3. **No scan analytics by default** (governance required to change).
4. **Commerce firewalled** from trust status (buying merch never grants vouches).

Empire and total untraceability **pull in opposite directions**. The project accepts **pseudonymous technical accounts** (`profile_id`, public key, handle, signed public state)—not “we know nothing about anyone,” and not “we verified your legal identity.”

---

## 2. What A Resolver Is (And Is Not)

### 2.1 Resolver job

A **resolver** is a **signed bulletin board** for public trust state:

| Function | Mechanism |
|---|---|
| Serve scan results | `GET` card/QR status + signed public payloads |
| Accept card creation | Verify signature on public card document |
| Revocation | Verify owner-signed revocation; flip status |
| Vouches (when enabled) | Store and validate signed vouch credentials |
| Live control (when enabled) | Issue challenge nonce; verify owner signature |

The resolver does **not** need legal name, government ID, phone number, or email to perform these jobs.

### 2.2 Resolver is not

- A **government identity** or KYC authority.
- A **biometric** or “unique human on Earth” oracle.
- A **scan surveillance** product (no default analytics).
- A **blockchain** (unless an operator optionally anchors transparency—see §7).

### 2.3 Identity model (honest language)

| Term | Meaning |
|---|---|
| **No legal identity** | No SSN/passport/KYC in core product |
| **Pseudonymous account** | Opaque `profile_id` + Ed25519 public key + public handle/manifesto |
| **Card owner** | Whoever controls the private key |
| **Not anonymous** | Persistent ids, vouch graphs, and network logs still create correlation risk |

Subpoenas, breaches, and graph analysis still hurt. The design goal is **minimize stored attractiveness**, not promise invisibility.

---

## 3. Federated Resolvers + Open Standards

### 3.1 Architecture

```text
                    ┌─────────────────────────────┐
                    │  Technical Standards v1.0     │
                    │  (public card, QR, API)     │
                    └──────────────┬──────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
  humanity.llc              union.example.org          coop.example.org
  (reference operator)      (member resolver)          (community resolver)
         │                         │                         │
         └─────────────────────────┴─────────────────────────┘
                                   │
                          Scanners & clients
                    (same trust UI, same limits copy)
```

- **humanity.llc** runs the **reference resolver** and best reference client—not the only resolver forever.
- **Second operator** (co-op, union, club, aligned host) is a **strategic milestone**, not a nice-to-have: it proves the system is a **protocol**, not a startup database.
- **Commons Pass** communities may run **scoped resolver policy** for their members while using the same card grammar.

### 3.2 Operator requirements

Any operator claiming `hc/v1` compatibility MUST implement `docs/Technical Standards v1.0.md` and publish:

- Operator name and contact.
- Jurisdiction and abuse/legal process policy (high level).
- **Data retained** (see §5) and retention periods.
- Whether scan access logs exist (default: **no**).
- Governance link for suspensions on that operator.

Responses SHOULD include `X-Resolver-Operator` (or equivalent in JSON body) so scanners know **who serves this status**.

### 3.3 Portability

- `profile_id` is opaque and **portable across operators** when a user exports and re-registers—or when federation sync is defined in a later spec version.
- v1 priority: **export bundle** + documented card format so users are not locked to one host.
- Cross-operator vouch recognition is a **governance and policy** problem, not only a technical one.

### 3.4 Why not “user-hosted only”

Self-hosted cards (GitHub Pages, personal IPFS) reduce operator concentration but **fragment discovery and revocation UX**. Federation balances **plural operators** with **predictable scan behavior**.

### 3.5 Why not “one resolver forever”

A single permanent operator becomes a **capture and subpoena honeypot** and blocks institutional trust (“another platform identity company”). Federation is the path to **legitimacy and scale**.

---

## 4. Public Launch (Not A Founding Cohort Gate)

### 4.1 Launch posture

**Public launch** means:

- **Anyone** can create a Humanity Card when Phase A ships—no invite-only waitlist as the product gate.
- Specs and trust limits are public on GitHub and the website.
- The founder may build solo; the **product** does not require permission to exist.

**Founding cohort** (see `docs/FOUNDING_COHORT_PLAYBOOK.md`) is **optional**: a small group for early feedback, copy tests, and ops rehearsal—not a prerequisite for opening card creation to the world.

### 4.2 Phased build order (unchanged wedge, changed gate)

| Phase | Deliverable | Launch gate |
|---|---|---|
| **A** | Card + reference resolver + scan page + revocation (+ vouch display if ready) | **Open card creation** when stable |
| **B** | Curiosity drop (optional merch) | After A proves scan moment |
| **C** | Belonging (vouches, personalized item QR) | Public rules; not closed club |
| **D** | Commons Pass | After A–C show repeat use |
| **→** | Governance + more operators | Second resolver + member ratification milestones |

Merch remains **distribution**, not the product. See `docs/MERCH_LED_V1.md` (updated for public launch).

### 4.3 Success metrics (public launch)

| Signal | Meaning |
|---|---|
| Stranger scans → creates card | Curiosity loop works without founder present |
| Revocation understood | Users can kill a sticker QR without support ticket |
| Second operator announced | Protocol credibility |
| Org runs membership on same grammar | Institutional wedge |

Do **not** require “25–100 founding humans” before opening the resolver.

---

## 5. Data Minimization (Anti-Honeypot Rules)

These are **normative** for the reference operator and **recommended** for all operators.

### 5.1 MAY store (public trust layer)

- `profile_id`, public key, handle, manifesto (user-chosen public fields).
- Signed card document, QR credentials, status flags.
- Signed vouches and public verification summary fields.
- Signed revocation and suspension records (with public notice where required).
- Short-lived live-control challenge records (TTL minutes).

### 5.2 MUST NOT store (core loop)

- Private keys or recovery secrets.
- Government ID images or numbers.
- Phone numbers or emails **required** for card creation.
- Scan analytics (location trails, per-scan profiles, fingerprinting).
- Payment/shipping PII in the resolver DB (commerce stays in Shopify/Printify boundary).

### 5.3 Access logs

- Default: **no scan logging**.
- If operational abuse response requires minimal access logs, that MUST be a **governance-approved** policy with published retention—not a silent product decision.

### 5.4 Commerce firewall

- QR payloads MUST NOT contain order IDs, emails, or shipping fields.
- Purchasing merch MUST NOT upgrade verification state.
- Printify/Shopify PII MUST NOT merge into “vouched” or “verified” without a separate, explicit, governed process.

---

## 6. Privacy vs Institutional Power

| Goal | Mechanism |
|---|---|
| **Avoid surveillance identity** | No phone/ID for card; no scan ads; export/exit |
| **Build institutional power** | Open spec, federated operators, Commons Pass in real orgs |
| **Avoid honeypot** | Minimize retention; publish what you store; no pay-to-verify |
| **Enable accountability** | Public suspension rules, appeals, steward review—not shadow scores |

Stronger identity (KYC, phone verification) may exist **at an org’s edge** under **their** resolver policy—not as humanity.llc’s global default.

---

## 7. Blockchain And Transparency Logs

### 7.1 Default position (v1)

- **No public blockchain** as the trust core.
- Card creation, vouches, and revocation use **Ed25519 signatures** and resolver state—not chain gas or wallet identity.

**Rationale:** Public chains increase **permanent traceability** and wallet-based identity; they do not solve “live status at scan” better than a minimal resolver for this product.

### 7.2 Optional future uses (non-core)

If governance approves later:

- **Transparency log** (append-only, auditable revocation/policy events)—CT-style, not NFT identity.
- **Timestamp anchoring** for export or dispute resolution.
- **Never** “buy verification on chain” or “NFT = human.”

See `docs/V1_DECISION_LOCK.md` (blockchain deferred).

---

## 8. Governance And Legitimacy

Political power for this project is **governed infrastructure**, not founder cult or token voting theater.

| Stage | Control |
|---|---|
| **Now** | Founder + documented bootstrap operators for speed |
| **Trigger** | Working public trust loop + published finances + member classes with real rights |
| **Target** | Member ratification of rights-affecting rules; worker voice on labor; steward role in trust ops |

See `docs/PUBLIC_LAUNCH_AND_GOVERNANCE_PLAN.md` for narrative, transition triggers, and decision-rights matrix (updated to align with this doc).

**Founding credentials** are **temporary bootstrap labels**, not goods for sale and not a substitute for public card access.

---

## 9. Relationship To Other Documents

| Topic | Canonical doc |
|---|---|
| Trust levels, scan copy | `docs/V1_PRODUCT_TRUST_MODEL.md` |
| API shapes | `docs/V1_IMPLEMENTATION_CONTRACTS.md`, `docs/Technical Standards v1.0.md` |
| Merch wedge, phases | `docs/MERCH_LED_V1.md` |
| Governance narrative | `docs/PUBLIC_LAUNCH_AND_GOVERNANCE_PLAN.md` |
| Enterprise phases | `docs/commons/COMMONS_ROADMAP.md` |
| Skeptic answers | `docs/SKEPTIC_FAQ.md` |
| Optional early testers | `docs/FOUNDING_COHORT_PLAYBOOK.md` (non-gating) |
| Assumptions | `docs/V1_ASSUMPTION_REGISTER.md` |

When older copy says “join founding cohort to use the product” or implies a **single eternal resolver**, treat this document as authoritative.

---

## 10. Implementation Priorities (Reference Operator)

1. Ship **minimal reference resolver**: create card, resolve scan, revoke, honest limits UI.
2. Publish **Technical Standards v1.0** and operator data policy alongside launch.
3. **Open card creation** without email gate.
4. Prove **stranger scan → create** before scaling merch or Commons Pass.
5. Document path to **second operator** (friendly co-op or aligned host).
6. Defer scan analytics, blockchain, and heavy governance UI until the trust loop is real.

---

## 11. One-Sentence Summary

> Build the **HTTP of trust status**—open spec, federated hosts, member-governed rules, minimal data—launch **publicly** when the resolver works, and grow power through **dependency and standards**, not through a private cohort or a chain.
