# M5.5  -  Owner key portability (revoke from any device)

**Status:** Core owner-portability flow shipped in repo; deploy/manual checks remain  
**Blocks:** Revoke anytime / any device after create session ends  
**Does not block:** M5 stranger tests, public create announce, or commerce milestones  

**Related:** `docs/ROOT_CARD_AND_CHILD_OBJECTS.md`, `docs/V1_0_ARCHITECTURE_ROADMAP.md` §M5.5, `docs/Technical Standards v1.0.md` §10.1 (recovery key), §12.1 (encrypted export), `docs/M4_CREATED_REVOKE_UI.md` (current session-only revoke), [`OWNERSHIP_RESTORE_UX_PLAN.md`](OWNERSHIP_RESTORE_UX_PLAN.md) (view-mode restore + recovery-first UX)

---

## Problem (today)

Phase A ships:

- **Revoke API**  -  owner-signed `POST …/revoke` (M4.1).
- **Revoke UI**  -  `/created/` signs in-browser **only while `sessionStorage` still holds the create key**.

If the user closes the tab, switches devices, or clears site data, they **cannot sign a new revocation**. The card/QR may still be **active on the resolver** until someone with a key revokes it.

**Revoked state is permanent** once applied; the gap is **access to the signing key**, not TTL on revoke.

---

## Product goal

> A root card owner can **revoke (and later: rotate QR, vouch, export, and manage child objects)** from a **new browser or device** without creating a duplicate card.

Two complementary paths (ship both; user may use one or both):

| Path | User story | Standards alignment |
|------|------------|---------------------|
| **A. Encrypted key export / import** | “I saved a backup file at create; I import it on my laptop to revoke the root or one child object.” | Export bundle §12.1  -  encrypted private key **if user opts in** |
| **B. Recovery key** | “I lost my phone but I wrote down a recovery code; I can still recover root/child lifecycle control.” | Revocation §10.1  -  **accepted recovery key**; live control §challenge |

Neither path uploads plaintext private keys to the resolver.

---

## Threat model (export/import  -  Phase 1)

### Assets

- **Owner Ed25519 private key**  -  can sign revoke, future vouch/rotate.
- **Encrypted backup file**  -  ciphertext + public metadata (`profile_id`, `public_key`, KDF salt, IV).
- **Passphrase**  -  never stored by humanity.llc; user memory or password manager only.

### Trust boundaries

| Party | Trust |
|-------|--------|
| humanity.llc resolver | Sees signed revocations only; **never** receives passphrase or plaintext private key |
| humanity.llc Pages | Runs client JS; must not log keys/passphrase; no upload of backup by default |
| User device / browser | Holds session key; writes backup file to disk/downloads |
| Attacker with backup file | Must guess passphrase (PBKDF2 310k iter + AES-GCM) |
| Attacker with session only | Can revoke until session ends (same as Phase A) |

### What export/import allows

- Decrypt backup **client-side** → load key into `sessionStorage` → use existing revoke UI.
- Revoke from **another device** after import on `/created/?profile_id=…&qr_id=…`.

### What it does **not** allow (Phase 1)

- humanity.llc staff recovering your passphrase or key.
- Automatic iCloud/Drive upload (user must not treat backup like a normal doc without encryption awareness).
- Recovery if **both** device key and backup/passphrase are lost.
- Revoke or child-object edit without either session key **or** backup+passphrase.

### Child-object implication

In the target model, one root key controls many child objects. That makes backup/recovery more important, not less: importing one root backup should restore control over the whole object tree. Product copy should treat backup/recovery as a setup seatbelt before users create many public objects or paid printed artifacts.

### Crypto (v1 backup file)

- **KDF:** PBKDF2-SHA256, 310,000 iterations, random 16-byte salt.
- **Cipher:** AES-256-GCM, random 12-byte IV.
- **Encoding:** private key as base58 in plaintext inside AEAD; file format `humanity_card_key_backup` v1.0.

### Residual risks (accepted for v1)

- Weak passphrases → offline brute force on stolen file.
- Malware on device reading file or clipboard.
- User stores backup in synced folder without understanding exposure.
- Phishing: “upload your backup to verify” (out of scope for product; educate in copy).

### Recovery key (Phase 2  -  not shipped yet)

Separate threat model when **5.5.3–5.5.4** ship: one-time recovery code, recovery pubkey on card, no recovery private key on server.

---

## Milestone steps

### 5.5.1  -  Encrypted owner key export (opt-in at create)

**UI:** `/create/` and `/created/`  -  “Save encrypted backup” with passphrase (or OS keychain where available).

**Artifact:** Downloadable file (e.g. `humanity-card-backup.json` or `.hcbackup`) containing:

- `profile_id`, `public_key`, encrypted private key blob, KDF params, protocol version.
- **Not** uploaded to humanity.llc servers by default.

**Exit:**

- [x] `site/js/key-backup.mjs` + tests (`worker/tests/key-backup.test.ts`)
- [x] Download UI on `/created/` when session has key
- [x] Copy warns: lose passphrase = lose backup; we cannot recover (in UI)
- [ ] Deploy Pages and verify download on production

### 5.5.2  -  Import key on owner surface

**UI:** `/created/` or new `/manage/`  -  “Import backup” → unlock → show same Owner controls (revoke QR / card).

**Exit:**

- [x] Import UI on `/created/` (`key-backup-ui.mjs`) unlocks owner controls
- [x] Hub import (`device-hub-import.mjs`) loads keys into this tab + **Open card controls** → `/created/`
- [ ] Import + revoke QR works on second device (manual test after deploy)
- [x] Wrong passphrase fails clearly (`decryptBackup` error message)

### 5.5.3  -  Recovery key at create (optional)

**UI:** At create, optional “Generate recovery key”  -  show once (copy + confirm), user confirms they saved it.

**Resolver:** Store **recovery public key** on card row + in signed card document; recovery revocations verified per §10.1.

**Exit:**

- [x] Generate recovery key at create (default on) + one-time reveal on `/created/`
- [x] Import recovery private key on `/created/` unlocks revoke
- [x] Revoke API accepts recovery-signed document (`revoke.test.ts`)
- [ ] Production: apply migration `0003_recovery_public_key.sql` + Worker deploy

### 5.5.4  -  Wire recovery into revoke API

**Worker:** `handlePostRevoke` accepts signatures from `cards.public_key` **or** registered recovery public key.

**Exit:**

- [x] Fixture + test: revocation signed by recovery key updates status.
- [x] Invalid signing key → 401 (owner-only check extended to allowed keys).

### 5.5.5  -  Copy, data policy, and threat model

**Exit:**

- [x] `/create/`, `/created/`, data policy explain: session-only vs backup vs recovery.
- [x] No implication that humanity.llc can revoke on the user’s behalf.
- [x] Stranger test script updated: “lose tab without backup = cannot revoke from web UI.”

---

## Explicit non-goals (M5.5)

- Cloud-synced keys or account email login (Phase A–C).
- Operator-assisted “unlock my card” support backdoor.
- Automatic key upload to D1.

---

## Suggested build order

1. **5.5.1 + 5.5.2** (export/import)  -  unblocks most “second device” needs.  
2. **5.5.3 + 5.5.4** (recovery key)  -  unblocks “lost device, have code”.  
3. Align with **M10.2** full export bundle when federation/export milestone starts.

---

## Phase A exit criteria (unchanged)

Stranger tests passed 2026-05-27 (session-only revoke acceptable at gate). M5.5 is the **first trust UX upgrade** after optional M5.3 public announce, before or in parallel with M6 vouches (product priority TBD).
