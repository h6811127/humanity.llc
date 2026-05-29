# Ownership and control model

**Status:** Product direction (documentation); implementation partially aligned  
**Audience:** Product, design, engineering, support  
**Opened:** 2026-05-29  
**Related:** [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) (canonical plain-vs-precise policy) · [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) · [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) · [`DEVICE_OS.md`](DEVICE_OS.md) · [`M5_5_OWNER_KEY_PORTABILITY.md`](M5_5_OWNER_KEY_PORTABILITY.md) · [`KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md`](KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md) · [`VOUCH_READY_KEYS_DESIGN.md`](VOUCH_READY_KEYS_DESIGN.md) · [`STEWARD_DEVICE_ROADMAP.md`](STEWARD_DEVICE_ROADMAP.md)

---

## Executive summary

Humanity’s **product** is ownership and control of public objects — stickers, wristbands, status plates, lost-item relays, membership passes. The **mechanism** is client-held Ed25519 signing keys. Those are not the same thing.

Today’s shipped UI often speaks in Layer 1 (engineer) terms — *keys*, *signing*, *session-only*, *Use keys* — because the implementation was built key-first. That is correct cryptography and a mismatched first-time user experience.

**Target philosophy:** Users should not worry about keys. They should worry about whether they **own**, can **share**, **transfer**, **revoke**, or **recover** an object. Advanced users and integrators can still inspect export material; the default path should feel closer to passkeys or TLS certificates than to a crypto wallet.

This document defines the three-layer model, maps current code and storage to it, and specifies how user-facing ownership language should replace key language over time **without** changing protocol invariants.

---

## Three layers (do not conflate)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 3 — Vision (what users feel)                                      │
│   “This sticker belongs to me.”                                         │
│   “This wristband belongs to me.”                                       │
│   “This lost-item relay belongs to me.”                                 │
│   Ownership feeling · physical objects · no crypto vocabulary           │
└─────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ copy + mental model
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 2 — Product (what users do)                                       │
│   Own object · Share object · Transfer object · Revoke object           │
│   Recover object · Prove control (live proof)                           │
│   No “key”, “sign”, “Ed25519”, or “sessionStorage” in default UI        │
└─────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ implements
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 1 — Engineering (how it works)                                    │
│   Owner key · recovery key · signatures · hc_created / hc_wallet        │
│   Export/import · cross-tab custody · resolver verification             │
│   Documented for engineers in KEYS_CARDS_AND_VERIFICATION.md            │
└─────────────────────────────────────────────────────────────────────────┘
```

| Layer | Question users ask | Question engineers ask |
|-------|-------------------|------------------------|
| **3** | Does this belong to me? | (Same — expressed as object + `@handle`) |
| **2** | Can I change it, share it, kill it, get it back? | Which signed operations are allowed? |
| **1** | (Should not need to ask) | Where are private keys, what signs what, what is on D1? |

**Rule for new UI:** Default surfaces use Layer 2–3 language. Layer 1 appears only in Help, data policy, feature docs, and an optional **Advanced / for developers** disclosure. Cross-cutting policy: [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) — *plain by default, precise on purpose*.

---

## What users already understand (analogies)

Billions of people use HTTPS, passkeys, Apple Secure Enclave, and TLS without knowing those names. Humanity should borrow that posture:

| Familiar system | User knows | Under the hood |
|-----------------|------------|----------------|
| HTTPS padlock | “This connection is secure” | X.509, CAs, cipher suites |
| Passkey | “Unlock with Face ID” | WebAuthn, secure enclave |
| Apple Pay | “This is my card” | Tokenization, SE keys |

Humanity equivalent:

| User-facing | Under the hood (unchanged) |
|-------------|---------------------------|
| **Save ownership on this device** | Copy owner + optional recovery material to `localStorage.hc_wallet` |
| **Add recovery method** | Generate/show recovery keypair; store recovery pubkey on card |
| **Restore ownership** | Import encrypted backup or recovery key → load into `sessionStorage.hc_created` |
| **Transfer ownership** | (Future) Signed handoff document; today: share backup with trusted party |
| **Revoke object** | Owner- or recovery-signed `POST …/revoke` |
| **Prove you control this** | Live proof challenge signed with owner key |

---

## Terminology map (migration target)

Use this table when rewriting copy or adding UI. **Engineering identifiers stay** (`hc_created`, `activateWalletEntry`, etc.); **user-visible strings** move right. See also [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) § Rename, don’t erase and § Checklist for new copy.

| Today (Layer 1 — avoid in default UI) | Target (Layer 2) | Notes |
|--------------------------------------|-------------------|-------|
| Signing key / private key | **Ownership credential** (or omit — “control”) | Never required in hero copy |
| Keys in this tab | **Control active in this tab** | Tab isolation stays; wording changes |
| Save on this device / Save control key | **Save ownership on this device** | Auto-save makes this silent |
| Use keys | **Open controls** / **Take control** | Already partially shipped as “Open controls” |
| Keys active in this tab | **You can manage this object** | Status, not mechanism |
| Default for vouching | **Default identity for attestation** | Vouch is a specialist action |
| Sign as… | **Attest as…** | Scan vouch flow |
| Clear keys from this tab | **Stop managing in this tab** | Does not delete saved ownership |
| Encrypted key backup | **Encrypted ownership backup** | File format unchanged |
| Recovery key | **Recovery method** / **Recovery code** | One-time reveal at create |
| Import backup | **Restore ownership** | Hub + `/created/` Advanced |
| No signing keys in this tab | **Ownership not loaded in this tab** | Explain what to do, not why crypto |
| Keys open in another tab | **Another tab is managing this** | Cross-tab custody |
| Steward-capable signing keys | **You can attest as steward** | Network + device both required |
| My cards (wallet) | **My objects** | URL stays `/wallet/`; alias `/objects/` → `/wallet/` |

**Keep “key” in:** data policy, technical standards, threat models, engineer docs, optional Advanced panel, and API/error codes (`INVALID_SIGNATURE` → user message without “key” where possible).

---

## Current implementation (Layer 1 audit)

The cryptography and storage model are **sound**. The gap is **presentation and defaults**, not protocol design.

### Authority model (unchanged)

One **root Humanity Card** (`profile_id`) per human/steward role. One **owner Ed25519 keypair** signs root updates and, by default, all **child objects** (status plates, lost items, print artifacts). Optional **recovery keypair** for break-glass control. See [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md).

Child objects do **not** get separate private keys in v1. “Owning” a sticker means the root owner key controls its QR lifecycle.

### Device storage

| Storage key | Scope | Contents | Product meaning |
|-------------|-------|----------|-----------------|
| `sessionStorage.hc_created` | Per tab | Active root owner (+ recovery) private keys, metadata | **Control active now** in this tab |
| `localStorage.hc_wallet` | Per origin | Saved root cards with full key bundles | **Ownership saved** on this device |
| `localStorage.hc_child_objects_v1:{profile_id}` | Per origin | Device index of child objects | **My objects list** (cache; network is truth) |
| `sessionStorage.hc_wallet_network_cache` | Per tab | Resolver status cache | Network reachability / trust labels |
| `localStorage.hc_tab_keys_presence` | Per origin | Cross-tab heartbeat | **Other tabs managing** |
| `localStorage.hc_default_vouch_profile_id` | Per origin | Vouch-ready default | Attestation default |
| `localStorage.hc_auto_save_device` | Per origin | `"0"` = off; unset/`"1"` = on | Auto **save ownership** after create |

**No server-side private keys.** Resolver stores public documents and verification state only.

### Lifecycle: create → control → recover

```mermaid
sequenceDiagram
  participant User
  participant Create as /create/
  participant Tab as sessionStorage hc_created
  participant Wallet as localStorage hc_wallet
  participant Resolver

  User->>Create: Create live object
  Create->>Create: generateKeypair() owner (+ recovery if enabled)
  Create->>Resolver: POST signed card + qr_credential
  Create->>Tab: write hc_created (tab session)
  Note over Tab: Layer 1: "session-only keys"<br/>Layer 2: control until tab closes
  alt Auto-save on (default)
    Create->>Wallet: saveSessionToWallet()
    Note over Wallet: Layer 2: ownership saved silently
  else Auto-save off
    User->>Create: Save on this device
    Create->>Wallet: saveSessionToWallet()
  end
  User->>User: Optional encrypted backup / recovery reveal
```

**Code anchors:**

| Step | Module |
|------|--------|
| Generate keys at create | `site/js/create-card.mjs` → `runCreateCard()` |
| Post-create tab session | same → `sessionStorage.setItem("hc_created", …)` |
| Auto-save ownership | `site/js/created-device-save.mjs`, `site/js/device-auto-save.mjs` |
| Activate saved ownership in tab | `site/js/device-keys.mjs` → `activateWalletEntry()` |
| Encrypted export | `site/js/key-backup.mjs`, `site/js/key-backup-ui.mjs` |
| Recovery reveal/import | `site/js/recovery-key-ui.mjs`, `/created/` Advanced |
| Hub import | `site/js/device-hub-import.mjs` |

### Network vs device (two layers — keep separate)

```text
NETWORK (resolver)                    THIS DEVICE (browser)
─────────────────────                   ────────────────────
profile_id, handle                      hc_created = control now
verification: Registered / Steward      hc_wallet = ownership saved
child objects + QR status               child index cache
vouches, live challenges                can sign if control loaded
```

**Vouching** needs both: eligible **network** state (Steward / Vouched Human) and **device** control in the tab. Network alone is insufficient — by design.

### Custody and notifications (shipped improvements)

Cross-tab “keys in another tab” is an **in-app custody** problem, not OS push. Unified hub panel: `#device-hub-keys-custody` ([`KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md`](KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md)).

**Product reframe:** These are **“another tab is managing your ownership”** notices, not key notifications.

### Portability (M5.5)

| Path | User story (Layer 2) | Implementation |
|------|---------------------|----------------|
| Encrypted backup | Restore ownership on a new device | `.hcbackup` PBKDF2 + AES-GCM; client-only decrypt |
| Recovery method | Lost phone, have recovery code | Recovery pubkey on card; recovery-signed revoke |

Neither uploads plaintext private keys to the resolver.

### Vouch-ready / attestation (specialist flow)

Field stewards need control loaded on scan pages without a wallet detour. Shipped: **Use keys here**, default card, auto-activate ([`VOUCH_READY_KEYS_DESIGN.md`](VOUCH_READY_KEYS_DESIGN.md)). Layer 2 framing: **“Attest on scan”** not **“load signing keys”**.

---

## Where the UI still exposes Layer 1 (gap analysis)

Priority surfaces to migrate to Layer 2 copy:

| Surface | Current exposure | Target |
|---------|------------------|--------|
| `/create/` hero | “signing key starts session-only” | “Control stays in this tab until you save ownership” | **D1** ✅ |
| Landing trust chips | “Keys in your browser” | “You own it · control stays on your device” | **D2** ✅ |
| `/created/` save strip | “Save control key”, “root signing key” | “Save ownership on this device” | **D1** ✅ |
| Hub custody panel | “Keys active”, “Keys in this tab” | “Managing here”, “Save ownership” | **D1** ✅ |
| `/wallet/` actions | “Use keys” | “Open controls” (align with hub) | **D1** ✅ |
| Scan vouch explainer | “Ed25519 signing key in this tab” | “You need control of your identity in this tab to attest” | **D7** ✅ |
| Inbox / cross-tab | “Keys open in N tabs” | “Managing in N other tabs” | **D1** ✅ |
| Help / features | Deep `sessionStorage` exposition | Move to Advanced; lead with ownership | **D2** ✅ |
| `device-keys-custody.mjs` | “Your browser holds the private key” | “Your browser holds control — the network never does” | **D1** ✅ |

**Structural gaps (not just copy):**

| Gap | Today | Target |
|-----|-------|--------|
| Session-first create | Keys land in `hc_created` before save; user may see warnings | Auto-save default **on** (shipped); deprecate scary session-only hero |
| Recovery not automatic | Optional at create; user must confirm save | **Warn only when recovery impossible** — gate child objects / print checkout (partial: `child-object-backup-gate.mjs`) |
| Multi-tab control | User must understand tab isolation | **Quiet tab rehydrate** (D10): copy saved ownership into new tabs silently when safe; cross-tab chrome only when rehydrate cannot run | **Tier 1–3 shipped** — see [`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md) |
| “My cards” naming | Protocol term | **My objects** or **What I control** when object tree is primary |
| Advanced export | Mixed into primary `/created/` | Collapse under **Advanced → Export for developers** | **D8** ✅ |

---

## Target product behaviors (passkey-like)

These are **product defaults**; implementation can phase in without protocol changes.

### 1. Create control automatically

- Generate owner (+ recovery) keypairs at create — **already shipped**.
- Do not ask the user to “create a key.”

### 2. Save ownership automatically

- **Default on:** `hc_auto_save_device` unset → auto-save to `hc_wallet` after create ([`CARD_WORKSPACE_PHASE0.md`](CARD_WORKSPACE_PHASE0.md)).
- First-time users should not need to understand tab vs saved distinction unless something fails.

### 3. Warn only when recovery is impossible

- After create: if no encrypted backup **and** no recovery method saved, show **one** clear warning — not ongoing key lectures.
- Before adding child objects or paid print: gate on backup/recovery (**shipped** for some paths via `child-object-backup-gate.mjs`).
- Copy pattern from [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md): *“Save a recovery method once — you keep control of everything under this object.”*

### 4. Let advanced users inspect/export

- Encrypted backup, recovery reveal, pubkey preview → **Advanced** on `/created/`.
- Feature docs and data policy retain Layer 1 precision.

### 5. Never imply operator recovery

- humanity.llc cannot restore lost ownership — **already** in data policy and M5.5 threat model.

### 6. Specialist flows stay explicit

- Vouch / live proof / revoke remain **explicit user actions** with confirmation.
- Auto-activate control on scan is **opt-in** (vouch-ready) — same security floor, better Layer 2 copy.

### 7. Quiet tab rehydrate (passkey-like)

- **Tier 1–3 (shipped):** One saved object, or last-active when multi-card + toggle on → shell bootstrap copies wallet row into `hc_created` without key copy; cross-tab chrome demoted for rehydrated profile ([`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md)).
- Does **not** change protocol, server custody, or `hc_created` per-tab lifetime.

---

## User journeys → architecture

### Own an object (first time)

| User sees (Layer 2) | System does (Layer 1) |
|---------------------|----------------------|
| Create a live object | `generateKeypair`, sign card, `POST /cards` |
| (Silent) Saved on this device | `saveSessionToWallet` if auto-save |
| Optional: Add recovery method | recovery keypair → `recovery_public_key` on card |
| Optional: Download encrypted backup | `key-backup.mjs` export |

### Manage an object (returning)

| User sees | System does |
|-----------|-------------|
| Open **My objects** | Read `hc_wallet`, reconcile children |
| **Open controls** | `activateWalletEntry` → `hc_created` → `/created/` |
| Update status / revoke QR | Sign with owner key in tab |
| **Stop managing in this tab** | `clearTabSessionKeys` |

### Share (public)

| User sees | System does |
|-----------|-------------|
| Print or share scan link | Public URL; no keys required for viewers |
| Stranger sees Active / Revoked | Resolver + scan HTML |

**Share ≠ transfer ownership.** Sharing a QR does not give control.

### Transfer ownership (today vs future)

| Today | Future direction |
|-------|------------------|
| Share encrypted backup + passphrase with trusted party | Signed ownership handoff document (protocol TBD) |
| Recipient **Restore ownership** on their device | Same import path |

### Revoke

| User sees | System does |
|-----------|-------------|
| Revoke this object / QR | Owner- or recovery-signed `POST …/revoke` |
| Requires control in tab or restore first | Keys in `hc_created` or unlocked via backup/recovery |

### Recover

| User sees | System does |
|-----------|-------------|
| Restore ownership | Import `.hcbackup` or paste recovery method |
| Unlock controls | Load private material into `hc_created` |

### Attest (vouch) — specialist

| User sees | System does |
|-----------|-------------|
| Attest as @handle | Owner-signed vouch document |
| Network says Steward; device needs control | Status fetch + `hc_created` |

---

## Placement in device OS architecture

Ownership language does **not** change [`DEVICE_OS.md`](DEVICE_OS.md) placement rules:

| Concern | Surface |
|---------|---------|
| Save ownership, import backup, activity | Device hub + `/wallet/` |
| Revoke, QR rotate, child object edit | `/created/` (network object controls) |
| Stranger view | Scan page only |
| Cross-tab “managing elsewhere” | Inbox + hub custody panel (not OS push) |
| Live proof signing | `/created/` only |

The hub remains **Settings + launcher** for what you own on this device, not a second homepage.

---

## Hosted tier fit

Hosted steward accounts ([`HOSTED_TIER_IMPLEMENTATION_EPICS.md`](HOSTED_TIER_IMPLEMENTATION_EPICS.md)) add **billing, entitlements, push, and session link** — not cloud key custody. `linkStewardAccountWithActiveKeys` still requires owner keys in the tab to sign `link_proof`.

**Layer 2 framing:** Hosted tier upgrades **delivery and limits** (push, poll caps), not **who holds ownership**.

---

## Phased migration (documentation → UI)

| Phase | Scope | Risk |
|-------|-------|------|
| **D0** | This doc + terminology map | None |
| **D1** | Copy pass: create, created save strip, hub custody, wallet CTAs | Low — no behavior change | **Shipped** (2026-05-29) |
| **D2** | Demote crypto detail to Help Advanced; landing + trust chips | Low | **Shipped** (2026-05-29) |
| **D3** | Rename nav labels (“My cards” → “My objects”) with redirects/aliases | Medium — bookmarks, tests | **Shipped** (2026-05-29) |
| **D4** | Session-only warnings only when auto-save fails or user opted out | Medium — test matrix | **Shipped** (2026-05-29) |
| **D5** | Stronger recovery gates before merch checkout / Nth child object | Product policy | **Shipped** (2026-05-29) |
| **D6** | Optional WebAuthn wrap around control activation (extends vouch-ready option E) | Engineering | **Shipped** (2026-05-29) |
| **D7** | Gap close-out: vouch explainer, status dot, hub segment copy | Low — copy only | **Shipped** (2026-05-29) |
| **D8** | Collapse `/created/` developer export (backup download, raw recovery import, pubkey preview) under **Export for developers** | Low — IA only | **Shipped** (2026-05-29) |
| **D9** | Comprehension gates — M7 live control, M5 stranger path, founding copy (human runbooks; see [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) § Comprehension gates) | Process | **In progress** — M7 + M5 passed; founding copy pending |
| **D9e** | Engineering prep: scan SSR + inbox aria Layer 2; device-hub feature advanced panel | Low — copy only | **Shipped** (2026-05-29) |
| **D9g** | Comprehension copy guards — live-control strings in `device-ownership-copy-core.mjs`; `npm run worker:test:comprehension` | Low — tests only | **Shipped** (2026-05-29) |
| **D9f** | Founding + steward surface copy — shop FAQ calendar expiry, wallet attestation help, feature pages, hub custody | Low — copy only | **Shipped** (2026-05-29) |
| **D9h** | Founding copy comprehension runbook + expanded shop FAQ/guards | Low — docs + tests | **Shipped** (2026-05-29) |
| **D9i** | Founding sticker FAQ gap close — full LAUNCH_LANGUAGE_KIT § Sticker FAQ on `/shop/founding/` | Low — copy + guards | **Shipped** (2026-05-29) |
| **D10** | Quiet tab rehydrate — Tier 1–3: single/last-active rehydrate + cross-tab demotion | Medium — multi-tab UX | **Shipped** — [`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md) |

**Do not migrate:** resolver APIs, document types, storage key names, or test fixture terminology without a dedicated protocol PR.

---

## Engineering invariants (do not break)

1. **Private keys never uploaded** to resolver by default.
2. **Owner-signed mutations** for revoke, vouch, child updates, live proof.
3. **`hc_created` per tab** — each tab holds its own signing session; **quiet rehydrate** (D10) may copy from `hc_wallet` on shell load when rules pass — not server-side or cross-origin session.
4. **Recovery and backup** remain client-side optional paths.
5. **Network truth** for verification labels; device truth for control.
6. **Child objects** inherit root control; no default per-child keys.

---

## Module reference (Layer 1 — for implementers)

| Concern | Primary modules |
|---------|-----------------|
| Layer 2 copy (D7 · D9g) | `device-ownership-copy-core.mjs` |
| Tab session | `device-keys.mjs` |
| Saved ownership | `device-wallet.mjs` |
| Create | `create-card.mjs`, `hc-sign.mjs` |
| Auto-save | `device-auto-save.mjs`, `created-device-save.mjs` |
| Custody UI | `device-keys-custody.mjs`, `device-hub-keys-custody*.mjs` |
| Quiet tab rehydrate (D10) | `device-quiet-tab-rehydrate*.mjs` |
| Cross-tab | `device-tab-presence.mjs`, `device-cross-tab-banner.mjs` |
| Backup/recovery | `key-backup*.mjs`, `recovery-key-ui.mjs` |
| Vouch / attestation | `vouch-issue.mjs`, `vouch-ready-keys.mjs`, `device-control-activation*.mjs` |
| Child backup gate | `child-object-backup-gate*.mjs` |
| Worker crypto | `worker/src/crypto/key-backup.ts` |

---

## Related docs

| Doc | Role |
|-----|------|
| [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) | Canonical plain-vs-precise policy; audience layers; surface rules |
| [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md) | Layer 1 reference — keys, cards, verification (keep for engineers) |
| [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) | One root, many objects; recovery as seatbelt |
| [`M5_5_OWNER_KEY_PORTABILITY.md`](M5_5_OWNER_KEY_PORTABILITY.md) | Backup + recovery threat model |
| [`KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md`](KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md) | Shipped custody panel + inbox semantics |
| [`VOUCH_READY_KEYS_DESIGN.md`](VOUCH_READY_KEYS_DESIGN.md) | Attestation without wallet detour |
| [`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md) | Passkey-like tab rehydrate from wallet |
| [`DEVICE_OS.md`](DEVICE_OS.md) | Shell placement rules |
| [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) | Trust labels vs ownership |

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-05-29 | Adopt three-layer ownership model; default UI targets Layer 2; Layer 1 docs remain canonical for engineering |
| 2026-05-29 | Protocol and storage unchanged in D0–D2; copy and information architecture only |
| 2026-05-29 | **D3 shipped** — “My objects” nav label; `/objects` → `/wallet/` alias; URL `/wallet/` unchanged |
| 2026-05-29 | Terminology map linked to canonical [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) |
| 2026-05-29 | **D7 shipped** — `site/js/device-ownership-copy-core.mjs`; hub attestation rows, import, steward link, cross-tab confirm |
| 2026-05-29 | **D8 shipped** — `/created/` Manage **Export for developers** panel; encrypted backup restore stays primary; hub default-for-attestation menu copy |
| 2026-05-29 | **D9e shipped** — scan vouch/live-control SSR Layer 2; inbox badge aria; activity log; device-hub feature advanced panel |
| 2026-05-29 | Gap table marked complete for D1–D2 default UI surfaces |
| 2026-05-29 | **D9 engineering** — `device-ownership-copy-core.mjs` live-control comprehension strings; `worker:test:comprehension` copy guards |
| 2026-05-29 | **D9f shipped** — founding sticker FAQ (no calendar expiry); wallet attestation help; device-hub feature Layer 2 + advanced panel |
| 2026-05-29 | **M7 comprehension passed** — 5/5 strangers per [`M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md`](M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md) |
| 2026-05-29 | **D9h shipped** — [`FOUNDING_COPY_COMPREHENSION_RUNBOOK.md`](FOUNDING_COPY_COMPREHENSION_RUNBOOK.md); shop FAQ F1–F3 guards |
| 2026-05-29 | **D9i shipped** — full LAUNCH_LANGUAGE_KIT Sticker FAQ on `/shop/founding/` (revoke, campaign end, misprint) |
| 2026-05-29 | **D10 Tier 3 shipped** — demote cross-tab chrome after quiet rehydrate |
| 2026-05-29 | **D10 Tier 2 shipped** — last-active profile + hub toggle for multi-card quiet rehydrate |
| 2026-05-29 | **D10 Tier 1 shipped** — quiet tab rehydrate for single saved card; [`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md) |
