# Vouch threat model

**Status:** Canonical adversarial analysis (May 2026)  
**Audience:** Security review, stewards, integrators, implementers  
**Product framing:** [`VOUCH_TRUST_POSITIONING.md`](VOUCH_TRUST_POSITIONING.md)  
**Rules & controls:** [`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md)  
**Implementation:** `worker/src/resolver/vouch.ts`, `worker/src/db/vouch-audit.ts`

---

## 1. Scope

This document analyzes threats to **social vouch trust** on a single Humanity operator network in v1—not legal identity, not global biometric uniqueness, not commerce fulfillment.

**In scope**

- Registration → vouch issuance → **Vouched Human** summary → scan/integrator consumption
- Steward bootstrap path, device signing keys, revocation
- Operator-only abuse analytics (`listVouchAuditFlags`)

**Out of scope (separate models)**

- Live control (M7), QR possession, Printify/Shopify, federation, ceremony credentials (deferred UI)

**Security goal (realistic)**

> Make **fraudulent or mistaken elevation to Vouched Human** expensive, visible, and reversible—not impossible.

---

## 2. Assets and trust boundaries

| Asset | Why it matters | Primary boundary |
|-------|----------------|------------------|
| Voucher **owner private key** | Signs vouches, revokes | Device (`hc_created` / wallet); never on resolver |
| Vouch **signed document** | Public evidence | Resolver D1 + replay checks |
| `verification_summaries` | Scanner-facing label | Resolver recalc from active vouches |
| Steward **bootstrap state** | Can vouch without 90-day wait | Operator D1 / governance |
| Vouch **graph rows** | Sybil & collusion analysis | Operator access only; not on scan UI |
| Integrator **policy** | What “Vouched Human” gates | Third-party app (misconfiguration risk) |

---

## 3. Adversary taxonomy

| Adversary | Goal | Typical capability |
|-----------|------|---------------------|
| **Sybil farmer** | Many **Vouched Human** labels cheaply | Script card create; automate vouch if keys leak |
| **Ring coordinator** | Elevate accomplices via mutual vouches | Small clique, slow quota burn |
| **Compromised voucher** | Vouch targets without consent | Malware, phishing, stolen backup (`.hcbackup`) |
| **Rogue steward** | Fast-path trust for allies | DB or governance access; no wait period |
| **Dishonest voucher** | Harassment, false attestation, defamation | Legitimate keys; lies in public `statement` |
| **Coercer** | Force victim to seek vouches / stay vouched | Social, workplace, domestic (non-technical) |
| **Integrator / scanner** | Over-trust label (treat as KYC) | Misread UI; omit live control |
| **Platform attacker** | Forge/replay vouches, enumerate cards | Network MITM (TLS), endpoint abuse |
| **AI operator** | Scale synthetic participation | LLM content; agents with stolen keys—not iris bypass |

---

## 4. Control inventory (v1 shipped)

| Control | Mechanism | Location |
|---------|-----------|----------|
| Eligible voucher | `verified_human` or `steward`; active card | `handlePostVouch` |
| No self-vouch | `voucher_profile_id ≠ vouchee_profile_id` | `handlePostVouch` |
| Signed payload | Ed25519, `type: vouch`, canonical verify | `verifySignedDocument` |
| Nonce replay | Unique nonce per vouch | `vouchNonceUsed`, DB index |
| One active pair | Unique (voucher, vouchee) active | `activeVouchPairExists` |
| Threshold | 3 **active** vouches → **Vouched Human** | `recalculateVouchSummary` |
| Quota | 5 **issuances** / voucher / 365d (includes revoked) | `voucherIssuanceCountSince` |
| Wait (non-steward) | 90 days after voucher verification | `VOUCHER_TOO_NEW` |
| Steward wait bypass | Stewards vouch immediately | `vouch.ts` (intentional) |
| No private notes on wire | `PRIVATE_NOTE_NOT_ALLOWED` | `handlePostVouch` |
| Statement bound | 1–280 chars public | validation |
| Revocation | Voucher-signed revoke; summary recalc | `vouch-revoke.ts` |
| Audit flags (operator) | Closed loop, quota burst, shared voucher set | `vouch-audit.ts` |
| Scan honesty | Limitations row; possession ≠ owner | scan HTML / trust model |
| Private key not uploaded | Client-sign only | `vouch-issue.mjs` |

---

## 5. Threat catalog

Likelihood: **L** low · **M** medium · **H** high (for motivated attacker, v1 scale).  
Impact: **L** low · **M** medium · **H** high (trust in network / harm to vouchee).

### 5.1 Registration and Sybil creation

| ID | Threat | Path | L | I | V1 controls | Gaps / residual |
|----|--------|------|---|---|-------------|-----------------|
| R-01 | **Card farm** | Mass `create` → registered cards | H | M | Waitlist/rate limits (policy; partial) | Registration ≠ VH; farms still pollute namespace |
| R-02 | **Clique elevation** | ≥4 sybil profiles, each vouches the other 3 → all reach VH | M | H | Threshold=3; quota; 90d wait between waves | **Minimum 4-node clique** can self-elevate; audit may not flag if not closed-loop-only |
| R-03 | **Steward-backed farm** | Steward vouches many fresh cards quickly | M | H | Steward bypasses 90d wait; steward cap 3/yr; burst audit | **Steward concentration** remains; manual review still required |
| R-04 | **Multi-card same human** | One person, many `profile_id`s | H | M | No uniqueness claim | Honest copy; cross-card linking out of scope v1 |
| R-05 | **Purchased “verified” account** | Buy wallet backup with VH keys | L | H | Keys not sold by protocol | Social market for compromised backups |

### 5.2 Vouch issuance (cryptographic)

| ID | Threat | Path | L | I | V1 controls | Gaps / residual |
|----|--------|------|---|---|-------------|-----------------|
| V-01 | **Forged vouch** | POST without valid signature | L | H | `verifySignedDocument` | — |
| V-02 | **Replay nonce** | Re-submit same document | L | H | Nonce uniqueness | — |
| V-03 | **Wrong key signed** | Attacker uses another user's key material | M | H | Match voucher `public_key` | User must protect `hc_created` / backup |
| V-04 | **Stolen session keys** | XSS/malware reads `sessionStorage` | M | H | Session tab scope | No PIN before sign (deferred); **auto-activate default** increases blast radius on shared device |
| V-05 | **Backup exfiltration** | `.hcbackup` stolen | M | H | User-held export | No HSM; steward keys high value |
| V-06 | **Remote / never met** | Voucher signs without in-person contact | H | M | Checkbox + UX copy only | **No liveness proof** at vouch time |
| V-07 | **LLM statement spam** | Automated generic statements | M | L | Same crypto bar | Statements not semantically verified |
| V-08 | **Defamation / harassment** | Public 280-char attack text | M | M | Public by design | Revoke + governance; no pre-moderation v1 |

### 5.3 Collusion and graph abuse

| ID | Threat | Path | L | I | V1 controls | Gaps / residual |
|----|--------|------|---|---|-------------|-----------------|
| G-01 | **Mutual pair loop** | A↔B only vouch each other | M | M | `closed_loop_only` flag | Operator must act; not automated suspension |
| G-02 | **Rotating 3-cycle** | A→B→C→A acyclic ring | M | H | Distinct vouchers per vouchee | **Does not trigger closed_loop_only**; needs clique review / shared-set flags |
| G-03 | **Quota burst** | 5 issuances in 24h | M | M | `burst_at_quota_boundary` | Legitimate events possible; triage |
| G-04 | **Shared voucher set** | Two vouchees, ≥75% same vouchers | M | M | `shared_voucher_set` flag | Heuristic; false positives |
| G-05 | **Revoke–re-vouch quota reset** | Revoke to free slot | L | M | Quota counts **all** issuances in window | — (mitigated) |
| G-06 | **Revoke–re-vouch trust swing** | Revoke drops vouchee below VH | M | M | Summary recalc | Vouchee can re-seek vouches; churn |
| G-07 | **Outsider laundries** | Ring vouches “clean” fourth party | M | H | Need 3 distinct per target | Hard to detect without broader graph analytics |
| G-08 | **Steward ring** | Stewards only vouch each other's alts | L | H | Audit + governance | Bootstrap trust is concentrated |

### 5.4 Steward and governance

| ID | Threat | Path | L | I | V1 controls | Gaps / residual |
|----|--------|------|---|---|-------------|-----------------|
| S-01 | **Steward capture** | Operator never sunsets bootstrap keys | M | H | Documented bootstrap | **A-012G** federation / governance |
| S-02 | **Malicious steward vouch** | Fast-path bad actors | M | H | Steward quota cap 3/yr; public statement; burst audit | Key compromise still high-leverage |
| S-03 | **Steward credential theft** | Stolen steward keys | L | H | Same as V-04/V-05 | High leverage account |
| S-04 | **Suspension lag** | Bad actor stays active until manual review | M | M | `suspended` overrides display | Playbook not fully automated |

### 5.5 Coercion, mistake, and social harm

| ID | Threat | Path | L | I | V1 controls | Gaps / residual |
|----|--------|------|---|---|-------------|-----------------|
| H-01 | **Coerced vouch** | Pressure to sign | M | H | Revocation by voucher | Vouchee cannot self-revoke v1; appeal governance |
| H-02 | **Mistaken vouch** | Wrong person / wrong card | M | M | Revoke flow (session UI) | Revoke UI limited to session-issued list |
| H-03 | **Solicited vouch spam** | Vouchee begs strangers online | H | M | Quota on voucher side | Harassment not rate-limited on requests |
| H-04 | **Trust laundering** | VH vouches known scam profile | M | H | Accountability on voucher | Integrators must not equate VH with safety |

### 5.6 Scan, possession, and integrators

| ID | Threat | Path | L | I | V1 controls | Gaps / residual |
|----|--------|------|---|---|-------------|-----------------|
| I-01 | **Sticker bearer = owner** | Show VH QR on merch | H | H | Bearer warning; limitations | Users skip copy |
| I-02 | **VH = KYC** | Gate banking/hiring on label | M | H | Copy + trust model | **Integrator misuse**—policy docs only v1 |
| I-03 | **Stale trust** | Old vouches, active card | M | M | `latest_accepted_vouch_at` | Integrators must set recency policy |
| I-04 | **Cached scan** | Show old VH after revoke | M | M | Short TTL / status fetch | CDN/browser cache discipline |
| I-05 | **Profile enumeration** | Probe `profile_id` existence | M | L | Public scan URLs | By design for public cards |

### 5.7 AI-era and automation

| ID | Threat | Path | L | I | V1 controls | Gaps / residual |
|----|--------|------|---|---|-------------|-----------------|
| A-01 | **Synthetic identity content** | LLM handles, statements, outreach | H | M | Crypto bar unchanged | AI lowers **cost of personas**, not forgery of signatures |
| A-02 | **Agent with stolen keys** | Autonomous sign+POST vouches | M | H | Quota, eligibility | **Indistinguishable from legitimate steward bot** if keys compromised |
| A-03 | **Deepfake “in person”** | Remote video “proof” | M | M | Policy: met in person | Not detectable cryptographically |
| A-04 | **Biometric bypass narrative** | “VH replaces iris” marketing | M | H | Positioning docs | External hype; must repeat limitations |
| A-05 | **Platform bot swarm** | Bots without VH still abuse comments | H | M | VH optional gate | Vouch is **not** full anti-bot; pair with rate limits |

### 5.8 Operator, legal, and data

| ID | Threat | Path | L | I | V1 controls | Gaps / residual |
|----|--------|------|---|---|-------------|-----------------|
| O-01 | **D1 breach** | Export vouch graph | L | H | Access control on operator | Public statements already public |
| O-02 | **Subpoena / retention** | Legal demand for graph | M | M | Minimize PII in vouch rows | Statements may identify people in prose |
| O-03 | **Audit flag leak** | Publish cluster flags | L | M | Operator-only API | Procedure not to expose flags on scan |
| O-04 | **False steward triage** | Over-suspend from heuristics | M | M | Human review queue pending | Due process (HV-FR-40) |

---

## 6. Attack trees (high value)

### 6.1 Elevate sybil card to Vouched Human (minimum cost)

```text
Create 4+ cards (R-01)
  → Wait 90d OR compromise 1 steward (R-03, S-03)
  → Form clique: each vouches other three (R-02, G-02)
  → Optional: launder via G-07 fourth card
Detect: shared_voucher_set, burst, manual graph review
Respond: suspend cards, revoke vouches, steward review
```

### 6.2 Impersonate trust at event (possession)

```text
Print/copy victim QR (I-01)
  → Scanner sees VH on network (true for card, not holder)
  → Skip live control
Mitigate: Ask live control (M7); limitations copy
```

### 6.3 Compromised steward keys

```text
Steal backup / session (V-04, V-05)
  → Up to 3 vouches/year per steward key (quota cap)
  → No 90d wait
Detect: burst_at_quota_boundary, new voucher→unknown vouchee edges
Respond: suspend steward, rotate keys, revoke batch
```

---

## 7. Operator audit hooks (shipped)

`listVouchAuditFlags` (`worker/src/db/vouch-audit.ts`) — **not exposed on public scan**.

| Flag | Meaning | Limitation |
|------|---------|------------|
| `closed_loop_only` | Every active vouchee of V also actively vouches V back | Misses **G-02** rotating cycles |
| `burst_at_quota_boundary` | ≥5 issuances in 24h in quota window | Legitimate burst possible |
| `shared_voucher_set` | Two vouchees share ≥3 vouchers, Jaccard ≥0.75 | Heuristic |
| `directed_cycle_cluster` | SCC cycle cluster with density threshold | Heuristic; can include benign cohorts |
| `steward_issuance_burst` | Steward issued N vouches in burst window (default 3/24h) | Event onboarding can look similar |

**Steward review queue:** Step 1+2 shipped — runbook + operator API + dismiss notes API + operator UI prototype with steward entry point from `/created/` Advanced. See [`VOUCH_STEWARD_REVIEW_RUNBOOK.md`](VOUCH_STEWARD_REVIEW_RUNBOOK.md).

`GET /.well-known/hc/v1/operator/vouch-audit-flags` (Bearer `OPERATOR_AUDIT_TOKEN`) — **not exposed on public scan**.

---

## 8. Recommended responses (playbook)

| Signal | First action | Escalation |
|--------|--------------|------------|
| `closed_loop_only` | Review voucher + related IDs | Suspend if farm; request revocations |
| `burst_at_quota_boundary` | Confirm steward legitimacy | Freeze steward POST if stolen keys suspected |
| `shared_voucher_set` | Check for clique or duplicate humans | Cross-check creation IP/time (if logged—policy) |
| User report wrongful vouch | Guide voucher to revoke | Governance appeal if voucher refuses |
| Integrator KYC misuse | Document denial; publish policy snippet | No protocol change |

---

## 9. Hardening backlog (prioritized)

| Priority | Item | Addresses |
|----------|------|-----------|
| P0 | Steward review queue + runbook | G-01–G-08, S-01 | **Step 1+2 shipped** (read API + dismiss API + UI prototype) |
| P0 | Card creation rate limits + launch monitoring | R-01, A-012F | **Shipped** (create rate limit + operator monitor API + launch runbook) |
| P1 | Graph flag: **directed cycle** / clique suspicion (≥4 mutual VH set) | R-02, G-02 | **Shipped** (`directed_cycle_cluster`) |
| P1 | Per-steward vouch cap or enhanced audit for steward issuances | R-03, S-02 | **Shipped** (steward cap policy + `steward_issuance_burst`) |
| P1 | Integrator guide: recency + live control + not KYC | I-02, I-03 | **Shipped** (`VOUCH_INTEGRATOR_POLICY_GUIDE.md`) |
| P2 | Optional PIN / WebAuthn before `Sign and submit` | V-04, A-02 |
| P2 | Vouchee-initiated dispute / steward revoke | H-01 |
| P2 | Statement report + moderation policy | V-08 |
| Deferred | Ceremony path; cross-operator federation | bootstrap diversity |

---

## 10. Integrator threat model (misuse by customers)

Third parties can **create** harm without attacking the protocol:

| Misuse | Consequence | Required integrator behavior |
|--------|-------------|------------------------------|
| `Vouched Human` = KYC | Discrimination, false safety | Gate on policy object; show mechanism |
| Ignore recency | Trust stale relationships | `maxLatestVouchAgeDays` |
| Ignore revoke/suspend | Trust revoked cards | Poll status; handle `revoked` |
| Ignore possession | Trust QR holder | Require live control for handoff |
| Single global boolean | Over-trust one vendor | Inspect `vouch_count`, `method`, credentials |

See [`VOUCH_TRUST_POSITIONING.md`](VOUCH_TRUST_POSITIONING.md) § Own the trust-policy layer and [`VOUCH_INTEGRATOR_POLICY_GUIDE.md`](VOUCH_INTEGRATOR_POLICY_GUIDE.md).

---

## 11. Assumptions to validate

| ID | Assumption | If false |
|----|------------|----------|
| VT-01 | Operators triage audit flags within days | Rings persist through early growth |
| VT-02 | Users understand VH ≠ legal ID | Support load; reputational harm |
| VT-03 | 4-person clique is rare at launch scale | Revisit threshold or graph rules |
| VT-04 | Steward keys are few and guarded | Treat steward POST as highest risk |
| VT-05 | Integrators read limitations | Publish enforcement examples |

Add to program register: `docs/V1_ASSUMPTION_REGISTER.md` (VT-* series).

---

## 12. Related docs

- [`VOUCH_TRUST_POSITIONING.md`](VOUCH_TRUST_POSITIONING.md) — product promise, what we own
- [`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md) — UX, privacy, implementation map
- [`V1_ADVERSARIAL_REVIEW.md`](V1_ADVERSARIAL_REVIEW.md) § Perspective 1 — cross-cutting abuser
- [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) — Level 2 boundaries
- [`VOUCH_INTEGRATOR_POLICY_GUIDE.md`](VOUCH_INTEGRATOR_POLICY_GUIDE.md) — integrator policy object, recency, live control
- [`features/Human Verification v1.0.md`](features/Human%20Verification%20v1.0.md) — requirements & risks
