# Custody hybrid — device unlock (easy) + full keys (steward)

**Status:** C1–C4 shipped (engineering) · synced passkey / P3-2 threat model TBD · **G-C4** support macros draft  
**Audience:** Product, engineering, support, QA  
**Related:** [`OWNERSHIP_AND_CONTROL_MODEL.md`](OWNERSHIP_AND_CONTROL_MODEL.md) · [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) · [`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md) · [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md) · [`M5_5_OWNER_KEY_PORTABILITY.md`](M5_5_OWNER_KEY_PORTABILITY.md) · [`VOUCH_READY_KEYS_DESIGN.md`](VOUCH_READY_KEYS_DESIGN.md) · [`DEVICE_LITE_MOBILE_PLAN.md`](DEVICE_LITE_MOBILE_PLAN.md) · [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md) · [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) · [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md)

---

## Executive summary

**Problem:** Shipped custody (raw Ed25519 keys in `hc_wallet` / `hc_created`, tab-local signing, Safari rehydrate) is **steward-grade**. Nontechnical and paying customers expect passkey-like behavior: *unlock with Face ID, manage my object, recover on a new phone* — without learning tab vs wallet, restore CTAs, or PWA vs Camera Safari.

**Direction:** **One protocol, two unlock paths** — not two products on the network.

| Mode | User-facing name | Unlock | Audience |
|------|------------------|--------|----------|
| **`device_unlock`** | **This device** (Face ID / Touch ID) | WebAuthn → decrypt wrapped key → `hc_created` | Default for new consumer creates |
| **`full_keys`** | **Full control** | Raw keys in `hc_wallet`; quiet rehydrate when safe | Operators, developers, multi-card stewards |

Once `hc_created` holds the owner private key, **all signing surfaces are identical** (revoke, vouch, live proof, child objects). Max functionality is preserved; accessibility is about **how keys enter the session**, not which features exist.

**Shipped today (foundation only):** D6 optional WebAuthn **sign-lock** gates control activation but **does not wrap keys** (`vouch-sign-lock.mjs`, `device-control-activation-core.mjs`). Quiet tab rehydrate (D10) silently copies **plaintext** wallet rows into session when gates pass.

**Not scheduled in code yet:** Wrapped-key storage, passkey-at-create default, mode-aware rehydrate, consumer vs steward create entry split.

---

## Product sentence

> **Strangers stay keyless.** **Consumers** control objects with **this device** (platform passkey). **Stewards and operators** may opt into **full control keys** for export, terminal paste, and multi-card ops. **Recovery is the product** — passkey sync is not a substitute for a saved recovery method.

---

## Architecture (single signing pipeline)

```text
                    Same Humanity Card (profile_id)
                              │
              ┌───────────────┴───────────────┐
              │                               │
     device_unlock                      full_keys
   "Unlock this device"              "Full ownership keys"
              │                               │
    WebAuthn → unwrap → hc_created    raw keys in hc_wallet
              │                               │
              └───────────────┬───────────────┘
                              │
              Same sign / vouch / revoke / live proof / child APIs
```

### Planned wallet row shape (Layer 1 — implementers)

| Field | `device_unlock` | `full_keys` |
|-------|-----------------|-------------|
| `custody_mode` | `"device_unlock"` | `"full_keys"` |
| `owner_private_key_b58` | **Absent** (never plaintext in `localStorage`) | Present (today’s model) |
| `wrapped_owner_key` | `{ credential_id, ciphertext, kdf?, iv?, version }` | Absent |
| Network `profile_id`, `public_key` | Unchanged | Unchanged |

**Invariant:** A wallet row is **either** wrapped **or** raw — never both.

### Unlock → session (device_unlock)

```text
Shell boot / scan / Open controls
  → hc_created empty, wallet row is device_unlock
  → "Unlock to manage" (Layer 2 — not "restore control")
  → navigator.credentials.get (WebAuthn)
  → decrypt Ed25519 private key in memory
  → populate hc_created (same as activateWalletEntry today)
  → user signs as today
```

**Session lifetime tradeoff** (must pick per phase — see § Unlock window):

| Strategy | UX | Security |
|----------|-----|----------|
| Unlock once per tab session | Good for consumers | New tab / Camera QR → prompt again |
| Unlock window (15–60 min) | Better field stewards who chose device_unlock | Closer to keys-in-tab exposure |
| Decrypt on every signature | Strongest | Unusable for frequent vouch |

---

## D6 (shipped) vs P3 / device_unlock (planned)

| | **D6 sign-lock (shipped)** | **device_unlock (planned)** |
|--|---------------------------|----------------------------|
| Keys in `hc_wallet` | Plaintext | Wrapped only |
| WebAuthn role | Gate before copy to session | Primary unlock + wrap at create |
| Opt-in | Per-card, Advanced | Default at create for consumers |
| Module | `vouch-sign-lock.mjs` | TBD — extend or replace wrap layer |

P3-1 in [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) is subsumed by this spec’s **Phase 1–2**. P3-2 (optional encrypted persistence outside ITP) maps to **Phase 4**.

---

## Capability matrix

| Capability | device_unlock | full_keys |
|------------|---------------|-----------|
| Create, save, revoke, vouch, live proof | ✓ | ✓ |
| Child objects, print checkout (with recovery gate) | ✓ | ✓ |
| Multi-card on one phone | ✓ (unlock per card or one device passkey — TBD) | ✓ |
| Export raw key / `.hcbackup` / pubkey preview | One-way migration export only | ✓ (Advanced) |
| Operator terminal paste (city game, scripts) | ✗ | ✓ |
| Headless / CI signing | ✗ | ✓ |
| Delegated child keys (step 17, deferred) | TBD — likely keys-only | ✓ |
| Hosted steward session link (`link_proof`) | ✓ after unlock | ✓ |

---

## Audience split (consumer vs steward SKU)

Hybrid **does not** mean one Settings toggle for everyone. Prefer **create entry points**:

| SKU / entry | Default custody | Recovery | Notes |
|-------------|-----------------|----------|-------|
| **Consumer live object** (sticker, member pass) | `device_unlock` | **Mandatory** before print / Nth child | Single-object guided UX; in-app scan default |
| **Steward / hosted tier** | Keep existing `full_keys` for returning users | Strong gate; backup + recovery | Multi-card, vouch-ready, terminal ops |
| **City game operator** | `full_keys` | Offline ops runbook | Terminal paste at `/game-operator/` |
| **Developer / integrator** | `full_keys` | Export for developers (D8) | Explicit opt-in at create |

See [`PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md`](PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md) — hosted tier upgrades **delivery and caps**, not cloud key custody.

---

## Recovery is the product

Passkey sync (iCloud Keychain, Google Password Manager) is **vendor-opaque**. Easy-mode users are **more likely to skip recovery** because biometrics feel sufficient. That produces a **worse** sad path than keys mode unless recovery is non-optional.

| Requirement | Policy |
|-------------|--------|
| Recovery at create | **Mandatory** for `device_unlock` — not Manage → Advanced |
| Paid print / child object gate | Extend [`child-object-backup-gate.mjs`](../../site/js/child-object-backup-gate.mjs) — recovery **or** verified backup ack |
| Comprehension | User proves they saved recovery (ack + optional spot-check) before Live / checkout |
| Copy | Never imply Apple/Google backs up Humanity ownership — platform sync ≠ operator recovery |
| Operator | humanity.llc **never** recovers keys — [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) |

Recommended copy (Layer 2):

> Save a recovery method once. Your phone can unlock this object, but only you can restore it if the phone is gone.

---

## What easy mode does **not** fix (scope honesty)

| Gap | Notes |
|-----|-------|
| **Comprehension** | Vouch vs verify vs live proof; root vs child; revoke QR vs disable card — parallel D9 work |
| **Camera → Safari** | Still opens new tab; device_unlock → **Unlock to manage** instead of silent rehydrate — better copy, still a prompt. Long-term: in-app scan (S3 shipped), dual QR (S7), native UL (S8 future) |
| **XSS on same origin** | Malicious site JS can trigger WebAuthn if user approves — same class as keys mode once session populated |
| **Physical QR** | Ink still resolves; revoke changes network state, not sticker |
| **Federation** | Passkeys bind to `rpId` per origin — federated operators need per-origin credentials or centralized create |
| **No operator recovery** | By design — [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) |

---

## Blind spots and tradeoffs (decision record)

### WebAuthn is a lock today, not a vault

Wrapping requires crypto not fully shipped: WebAuthn **PRF** (uneven support) or encrypt-with-random-DEK + WebAuthn-gated decrypt in JS. Threat model doc required before Phase 1 code.

### Two modes = two support playbooks (short term)

| Symptom | device_unlock | full_keys |
|---------|---------------|-----------|
| Can’t sign on scan | WebAuthn canceled / unavailable / wrong rpId | Restore control / rehydrate gates |
| New phone | Passkey sync? Recovery code? Re-enroll? | Import `.hcbackup` |
| Shared iPad | Whoever’s passkey unlocks | Sign-lock optional |

Support load **rises** until one mode dominates or entry points split cleanly.

### Commerce and liability

Paid customers expect account recovery. Terms and checkout must state **non-recoverable by operator** in plain language. device_unlock increases false confidence unless recovery gates **before money**.

### Environment matrix

WebAuthn missing or broken: in-app browsers (mail, social), some desktop, corporate MDM. **Fallback:** honest `full_keys` path at create — not a dead end.

### Privacy

Platform handles biometrics; Humanity stores wrapped blobs. Product copy should clarify (EU/UK review) — no biometric storage by operator.

### Alternative lower-risk path (UX-only hybrid)

Before wrap crypto: **one custody model** (keys + auto-save + aggressive rehydrate) + **consumer UX tier** (guided single-object, hide Manage complexity, in-app scan default) — same philosophy as Smooth mode ([`DEVICE_LITE_MOBILE_PLAN.md`](DEVICE_LITE_MOBILE_PLAN.md)). Does not fix Safari tab pain as well as device_unlock; ships faster. **Phase 0** validates whether comprehension + recovery + scan entry fixes most drops.

---

## Phased rollout

```text
Phase 0 — De-risk (no wrap crypto) — **in progress**
  → Comprehension + funnel metrics with nontechnical users (extend D9)
  → Mandatory recovery UX on existing keys model
  → In-app scan + dual QR as default print story (S3/S7 shipped — product default TBD)
  → Support taxonomy: custody vs comprehension vs Safari vs commerce
```

**Runbook:** [`CUSTODY_PHASE0_RUNBOOK.md`](CUSTODY_PHASE0_RUNBOOK.md) · **Preflight:** `npm run custody:phase0-preflight` · **Kit:** `npm run custody:phase0-kit`

Phase 1 — device_unlock MVP (new cards only)
  → Passkey enroll at create; wrap owner key; no plaintext in hc_wallet
  → WebAuthn unlock → hc_created (reuse D6 plumbing where possible)
  → full_keys unchanged for existing rows
  → Fallback when WebAuthn unavailable → full_keys with honest copy

Phase 2 — Mode-aware rehydrate
  → device_unlock: gated unlock instead of silent quiet rehydrate
  → full_keys: keep D10 behavior
  → Layer 2: "Unlock to manage" not "Ownership not loaded in this tab"

Phase 3 — Migration bridges
  → device_unlock → full_keys: one-time export + custody_mode switch
  → full_keys → device_unlock: wrap keys, delete plaintext (optional wizard)

Phase 4 — Cross-device easy mode (hard)
  → Synced passkey and/or recovery re-enroll; P3-2 encrypted persistence threat model
  → Native app / Universal Links (S8) if Camera→Safari remains top drop
```

### Launch gates (general / paying audience)

| Gate | Evidence |
|------|----------|
| **G-C0** | Phase 0 metrics — top 3 drop reasons documented | Product |
| **G-C1** | Nontechnical comprehension pass on device_unlock create + unlock + scan | D9-style runbook |
| **G-C2** | Recovery mandatory + tested sad path (lost passkey, no sync) | E2E + manual |
| **G-C3** | WebAuthn fallback path QA (desktop, in-app browser denial) | Manual matrix |
| **G-C4** | Support macros for both custody modes | [`CUSTODY_SUPPORT_MACROS.md`](CUSTODY_SUPPORT_MACROS.md) |
| **G-C5** | Checkout / paid copy — non-recoverable operator | Legal + shop |

**Do not** position broad consumer launch until **G-C1–G-C3** pass.

---

## Mode-aware quiet rehydrate (Phase 2)

Today [`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md) copies plaintext wallet rows into `hc_created` when `shouldQuietTabRehydrate()` passes.

| `custody_mode` | Empty session behavior |
|----------------|------------------------|
| `full_keys` | Current D10 silent rehydrate + Restore CTA when blocked |
| `device_unlock` | **No silent plaintext copy** — prompt WebAuthn (or unlock window if session flag set) |

Scan script order unchanged: gate unlock **before** `vouch-issue.mjs` / live-control (`scan-tab-keys.mjs`).

---

## Federation and hosted tier

| Concern | Rule |
|---------|------|
| `rpId` | Passkeys scoped per WebAuthn relying party — federated operator origins need separate credentials or reference-operator create |
| Steward session link | `linkStewardAccountWithActiveKeys` still requires owner signature in tab — device_unlock must unlock first |
| Entitlements | No change — [`HOSTED_TIER_ENTITLEMENTS_AND_METERING.md`](HOSTED_TIER_ENTITLEMENTS_AND_METERING.md) |

---

## Engineering invariants (hybrid — add to SYSTEM_INVARIANTS when implemented)

1. **Private keys never uploaded** to resolver (unchanged).
2. **`device_unlock` rows never store plaintext `owner_private_key_b58` in `localStorage`.**
3. **`hc_created` per tab** remains signing session; device_unlock populates it only after successful WebAuthn unlock (or unlock window policy).
4. **Owner-signed mutations** unchanged.
5. **Recovery and backup** remain client-side; operator never holds passphrases or wrapped key plaintext.
6. **Explicit non-fix:** Server-side key custody — contradicts trust model.

---

## Module map (planned + shipped foundation)

| Concern | Module (shipped) | Phase |
|---------|------------------|-------|
| WebAuthn gate | `vouch-sign-lock.mjs`, `device-control-activation-core.mjs` | D6 shipped |
| Quiet rehydrate | `device-quiet-tab-rehydrate*.mjs` | D10 shipped; **C2** device_unlock gate shipped |
| Scan order | `scan-tab-keys.mjs` | C2 — unlock before vouch via `activateWalletEntryGated` |
| Layer 2 copy | `device-ownership-copy-core.mjs` | **C2** unlock strings shipped |
| Wrap / unwrap | `device-custody-wrap-core.mjs`, `device-custody-unlock.mjs` | C1 shipped |
| Migration bridges | `device-custody-migrate-core.mjs`, `device-custody-migrate.mjs`, `created-custody-migrate.mjs` | C3 shipped |
| Cross-device re-enroll | `device-custody-reenroll-core.mjs`, `device-custody-reenroll.mjs`, recovery import strip | **C4 shipped** |
| Create enroll | `create-card.mjs`, `device-custody-enroll.mjs`, `device-custody-save.mjs` | C1 shipped |
| Backup gate | `child-object-backup-gate*.mjs` | Recovery hard gate Phase 0 |

---

## Regression (when implemented)

```bash
# Existing custody block (must not regress full_keys)
npm run e2e:key-loss-sad-path
npm run e2e:safari-keys-persistence
npm run e2e:scan-page-dot
npm run ownership-restore:verify
npm run worker:test -- worker/tests/device-quiet-tab-rehydrate.test.ts worker/tests/device-tab-session.test.ts

# C1 wrap + C2 mode-aware rehydrate (WS-CUSTODY)
npm run custody:c1-preflight
npm run worker:test:custody-wrap
npm run worker:test:custody
npm run e2e:custody-device-unlock
```

---

## Related workstreams

| ID | Doc | Role |
|----|-----|------|
| **WS-CUSTODY** | [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md) § WS-CUSTODY | **C0 in progress** — [`CUSTODY_PHASE0_RUNBOOK.md`](CUSTODY_PHASE0_RUNBOOK.md) |
| Safari keys P0–P2 | [`SAFARI_KEYS_CUSTODY.md`](SAFARI_KEYS_CUSTODY.md) | Shipped mitigations for full_keys |
| Smooth mode | [`DEVICE_LITE_MOBILE_PLAN.md`](DEVICE_LITE_MOBILE_PLAN.md) | Same keys, calmer UX — complementary |
| Scan handoff | [`STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md`](STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md) | Camera / PWA / in-app scan |

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-06-03 | Adopt hybrid custody: `device_unlock` default for consumer create, `full_keys` for stewards/operators; one protocol, two unlock paths |
| 2026-06-03 | Recovery mandatory for device_unlock; passkey sync not sufficient |
| 2026-06-03 | Phase 0 de-risk before wrap crypto; D6 is gate-only, not vault |
| 2026-06-03 | P3-1/P3-2 tracked here; WS-CUSTODY owns implementation |
