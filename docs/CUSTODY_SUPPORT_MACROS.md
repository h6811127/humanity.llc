# Hybrid custody support macros

**Status:** G-C4 draft  
**Audience:** Support / operators  
**Related:** [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) · [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md) · [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md)

---

## Before you reply

- humanity.llc **never** holds private keys, passphrases, recovery codes, or passkey material.
- **Two custody modes** ship today: **This device** (`device_unlock`) and **Full control keys** (`full_keys`). Ask which mode the user chose at create or in Manage → Device control mode.
- **iCloud Keychain / Google passkey sync** is vendor-controlled — it is **not** operator recovery and may fail silently.
- Never ask for `.hcbackup` files, recovery codes, or screen recordings of Face ID prompts in public channels.

---

## "What is This device vs full control keys?"

**Subject:** How your Humanity Card is stored on this phone

**This device (Face ID / Touch ID)** wraps your signing key behind a passkey on this phone. The raw key is not stored in the browser wallet. You unlock with biometrics when you manage or attest.

**Full control keys** stores the raw signing key in this browser (like earlier steward builds). Use this if you need export tools, terminal paste, or multi-card steward workflows.

Both modes use the same card on the network — only local unlock differs.

---

## "Unlock to manage" / Face ID keeps failing (device_unlock)

**Subject:** Cannot unlock my object on this phone

Try:

1. Confirm you are in **Safari or your Home Screen app**, not an in-app browser from mail or social apps.
2. Tap **Unlock to manage** again — canceling Face ID does not delete your object.
3. If you switched phones, passkey sync may not have copied — use **recovery + encrypted backup** (see K11 macro below).
4. Manage → **Device control mode** → switch to **Full control keys** only if you have a recovery code or `.hcbackup` and need steward tools.

Internal: check `custody_mode`, `wrapped_owner_key`, WebAuthn availability. Sad path **K10** in [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md).

---

## "New phone — recovery imported but Face ID won't work" (K11)

**Subject:** Set up Face ID on this device after recovery

Expected flow:

1. Hub → **Import recovery code** (works without the old passkey).
2. App strips the old device's passkey wrap and shows **Set up Face ID on this device**.
3. Hub → **Import encrypted backup** (`.hcbackup` + passphrase) — recovery code alone cannot enroll a new passkey.
4. Open your card → Manage → **Device control mode** → **Set up Face ID on this device**.

If the user skipped encrypted backup at create, they may be unable to re-enroll — same as key loss without backup. Operator cannot restore.

---

## "Restore control" but I use Face ID

**Subject:** Wording on scan / wallet

Copy changed in **device_unlock** mode:

- **Unlock to manage** replaces "Restore control" when the saved row is passkey-wrapped.
- **Set up Face ID on this device** appears after cross-device recovery import before backup + re-enroll.

This is expected — not a bug.

---

## "Can you reset my passkey / unlock my account?"

**Subject:** Account recovery

No. humanity.llc cannot reset passkeys, decrypt wrapped keys, or recover lost recovery secrets. See [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md).

If the user saved recovery + encrypted backup, they can self-serve on a new device. Otherwise they may need a new card.

---

## "Should I switch to full control keys?"

**Subject:** Device control mode migration

Recommend **full control keys** only for stewards, operators, or developers who need raw key export or terminal workflows.

Before switching from **This device**, confirm they have a **recovery code or encrypted backup** (Manage gate requires it).

Switch: card page → Manage → **Device control mode**.

---

## Regression index

| Mode | Automated guards |
|------|------------------|
| device_unlock unlock copy | `npm run worker:test:custody` |
| Cross-device re-enroll (K11) | `device-custody-reenroll-core.test.ts` · `device-hub-import-recovery-core.test.ts` |
| Desk proxy (no silent rehydrate) | `npm run e2e:custody-device-unlock` |
