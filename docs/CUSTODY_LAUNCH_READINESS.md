# Custody easy mode — launch readiness

**Status:** Active — engineering checklist before broad consumer / paid launch  
**Canonical spec:** [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) · workstream [`PRODUCT_WORKSTREAM_COORDINATION.md`](PRODUCT_WORKSTREAM_COORDINATION.md) § WS-CUSTODY

---

## Product bar

Do **not** position **device_unlock** (“This device”) as the default for all paying consumers until every **Engineering** row below is ☑ and every **Human gate** row has signed evidence.

Stewards and city-game operators may continue on **full_keys** without waiting on consumer marketing.

---

## Engineering (must be ☑)

| ID | Deliverable | Proof |
|----|-------------|-------|
| **E-C1** | Wrap at create, no owner plaintext in `hc_wallet` | `device-custody-enroll.mjs` · `npm run worker:test:custody-wrap` |
| **E-C2** | Mode-aware quiet rehydrate (no silent wrap copy) | `device-quiet-tab-rehydrate*.mjs` · custody Vitest C2 |
| **E-C3** | Migration `device_unlock` ↔ `full_keys` | `created-custody-migrate.mjs` |
| **E-C4** | Recovery import + passkey re-enroll (K11) | `device-custody-reenroll*.mjs` · `e2e:custody-device-unlock` |
| **E-C5** | Unlock window (tab session, 30 min default) | `device-custody-unlock-window*.mjs` · Vitest · wired in `activateWalletEntryGated` |
| **E-G2** | Recovery mandatory at create (K13) | `device-custody-recovery-gate-core.mjs` · `e2e:custody-create-recovery` |
| **E-G3** | WebAuthn unavailable → `full_keys` (K12) | `device-custody-create-core.mjs` · `e2e:custody-create-fallback` |
| **E-G4** | Support macros draft | [`CUSTODY_SUPPORT_MACROS.md`](CUSTODY_SUPPORT_MACROS.md) |
| **E-G1** | device_unlock comprehension copy (create + setup + unlock cancel) | `device-custody-comprehension-core.mjs` · `npm run custody:g-c1-kit` |
| **E-G5** | Checkout / paid non-recoverable copy | Shop + legal — **open** |
| **E-P32** | Durable encrypted persistence (P3-2) | **Explicitly out of v1** unless threat model + consent UX ship |

**Regression block:**

```bash
npm run custody:c1-preflight
npm run worker:test:custody
npm run e2e:custody-device-unlock
npm run e2e:custody-create-fallback
npm run e2e:custody-create-recovery
```

---

## Human gates (must be ☑)

| Gate | Evidence | Command / doc |
|------|----------|----------------|
| **G-C0** | Phase 0 metrics — top 3 drop reasons | `npm run custody:phase0-kit` → `custody:phase0-sign-off -- --pass --apply` |
| **G-C1** | Comprehension on device_unlock create + unlock + scan | [`CUSTODY_DEVICE_UNLOCK_COMPREHENSION_QA.md`](CUSTODY_DEVICE_UNLOCK_COMPREHENSION_QA.md) · `npm run custody:g-c1-kit` — **human sign-off open** |
| **G-C2** | Recovery sad path (lost passkey, no sync) | [`CUSTODY_RECOVERY_MANDATORY_QA.md`](CUSTODY_RECOVERY_MANDATORY_QA.md) |
| **G-C3** | In-app browser / desktop WebAuthn matrix | [`CUSTODY_WEBAUTHN_FALLBACK_QA.md`](CUSTODY_WEBAUTHN_FALLBACK_QA.md) |
| **G-C4** | Support trained on macros | [`CUSTODY_SUPPORT_MACROS.md`](CUSTODY_SUPPORT_MACROS.md) |
| **G-C5** | Paid checkout copy signed | Legal + shop |

---

## Explicit non-goals for v1 launch

- Operator-side key recovery
- Synced passkey as substitute for recovery save
- Universal Links / native app (S8)
- Multi-card single passkey (TBD in spec)

---

## Create entry points (audience split)

| Audience | Default at `/create/` | URL override |
|----------|----------------------|--------------|
| Consumer | `device_unlock` when WebAuthn available | `?custody=full_keys` for advanced |
| Steward / operator / integrator | `full_keys` | `?custody=full_keys` (also organizer template forces full keys) |

Document links in steward runbooks; no separate SKU page required for launch.

---

## When to update this doc

Mark rows ☑ in PR descriptions or phase sign-off commits. Bump [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) status line when all **Engineering** + **Human** rows pass.
