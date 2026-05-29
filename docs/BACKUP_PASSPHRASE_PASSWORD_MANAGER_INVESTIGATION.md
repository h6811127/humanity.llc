# Backup passphrase + password manager investigation

**Status:** Investigation (2026-05-29)  
**Audience:** Product, engineering, QA  
**Related:** [`M5_5_OWNER_KEY_PORTABILITY.md`](M5_5_OWNER_KEY_PORTABILITY.md) · [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md) · [`OWNERSHIP_RESTORE_UX_PLAN.md`](OWNERSHIP_RESTORE_UX_PLAN.md) · `site/js/key-backup-ui.mjs` · `site/js/key-backup.mjs`

---

## Questions answered

1. **Do users need both a “key” and a backup file to restore?**
2. **Does Apple Passwords reliably save the backup passphrase today?**
3. **What about Android password managers?**
4. **How do we ensure password-manager integration works?**

---

## Restore paths (what users actually need)

Humanity ships **three independent custody paths**. Users do **not** need all of them — pick at least one before losing the create tab.

| Path | What to save | Restore on new device | Cross-device? |
|------|----------------|----------------------|---------------|
| **A. Save on this device** | Nothing extra — copies keys into `localStorage.hc_wallet` | Open site on **same browser profile**; D10 quiet rehydrate loads control | Same browser only |
| **B. Encrypted backup** | **Two parts together:** (1) `.hcbackup.json` file, (2) passphrase | Import file + passphrase on `/created/` or hub | Yes |
| **C. Recovery key** | One-time Base58 recovery code (if enabled at create) | Paste code under Manage → Export for developers → Import raw recovery key | Yes |

### Encrypted backup = file + passphrase (not file + separate “key”)

The `.hcbackup` file holds **encrypted** owner key material (AES-GCM + PBKDF2). The passphrase **unlocks** that file. Neither humanity.llc nor the file alone is enough without the passphrase.

- **Wrong mental model:** “I saved the passphrase in Passwords, so I’m backed up.”
- **Correct mental model:** “I have the **file** in Files/Drive **and** the **passphrase** in Passwords.”

### Recovery key is an alternative, not an add-on

If the user saved the **recovery code** at create, they can restore with **only that text** — no `.hcbackup` file and no backup passphrase.

They do **not** need recovery key **and** encrypted backup unless they want redundant backups.

---

## User report: Apple Passwords fills field but nothing is saved

**Observed:** On iPhone Safari, Apple may suggest or fill a strong password in the export passphrase fields, but after submit + restart, the passphrase does not appear in Passwords search.

**Verdict:** Expected with current markup and flow. Copy that mentions “password manager” assumes manual save or browser heuristics we have **not** implemented correctly.

---

## Root causes (code + platform)

### 1. Form-level `autocomplete="off"` blocks child hints

Export form (`site/created/index.html`):

```html
<form id="export-backup-form" … autocomplete="off">
  <input … autocomplete="new-password" />
  <input … autocomplete="new-password" />
</form>
```

MDN and Apple docs: child `autocomplete` values should signal intent, but a form-wide `off` is a common reason browsers **skip save prompts** or treat the form as non-credential.

### 2. No username / account identifier field

Apple Passwords and Google Password Manager store **website credentials** as **username + password** pairs tied to an origin (`humanity.llc`).

Our export form has **only password fields**. Browsers often:

- Offer **Generate Strong Password** (fills the field), but
- **Do not prompt to save** because there is no `autocomplete="username"` (or `type="email"`) sibling.

Apple’s [Password AutoFill documentation](https://developer.apple.com/documentation/security/enabling-password-autofill-on-an-html-input-element) explicitly recommends pairing `username` with `new-password` / `current-password`.

### 3. Submit does not look like “account creation” to the browser

`key-backup-ui.mjs` calls `e.preventDefault()`, encrypts client-side, triggers a **blob download**, then `exportForm.reset()`. There is **no navigation**, no login-shaped POST, and no second page — heuristics for “save new password” often never fire.

### 4. Import side blocks autofill

| Surface | Passphrase field `autocomplete` |
|---------|----------------------------------|
| `/created/` import | `autocomplete="off"` |
| Hub import (`index.html`, `wallet/`, `create/`) | `autocomplete="off"` |

So even a correctly saved entry may not autofill on restore.

### 5. No programmatic save API on Safari / Firefox

`navigator.credentials.store(PasswordCredential)` works in **Chrome / Edge / Samsung Internet** (partial). It is **not supported** on **Safari / Safari iOS** or **Firefox** (caniuse / MDN, 2026).

We cannot rely on a single JS API for “Save to Passwords” across stewards’ phones.

### 6. UX burying (secondary)

Download lives under **Manage → Export for developers**. Discoverability is poor; password managers are unrelated but the flow feels broken when save fails after a long path.

---

## Platform matrix

| Platform | Save passphrase via autofill heuristics today | Programmatic `PasswordCredential.store` | Import autofill today |
|----------|-----------------------------------------------|----------------------------------------|------------------------|
| **Safari iOS** | Unreliable (no username; form `off`; no navigation) | ❌ Not supported | ❌ `autocomplete="off"` |
| **Safari macOS** | Same as iOS | ❌ | ❌ |
| **Chrome Android** | Better with username + `new-password`; still no nav | ✅ Often works | ❌ `autocomplete="off"` |
| **Samsung Internet** | Similar to Chrome | ✅ | ❌ |
| **Firefox (all)** | Weak | ❌ | ❌ |

---

## What works today (manual workarounds)

Until engineering ships fixes, stewards should:

1. **Download** the `.hcbackup.json` file (Files, iCloud Drive, Google Drive, etc.).
2. **Manually** add a Passwords entry:
   - **Website:** `humanity.llc`
   - **Username:** card `@handle` or short `profile_id` (e.g. first 8 chars)
   - **Password:** the backup passphrase they chose
   - **Notes (recommended):** filename + “Humanity encrypted ownership backup”
3. On restore: pick the file **and** autofill or paste the passphrase.

**Recovery key path:** save the one-time code in Passwords as a **Secure Note** or username `humanity-recovery-{handle}` with the code in the password field — still manual on iOS.

---

## Recommended engineering fixes (priority order)

### P0 — HTML credential hints (low risk)

**Export** (`export-backup-form`):

- Remove `autocomplete="off"` from the `<form>`.
- Add a visible or visually hidden username field:
  - `name="backup_account"`
  - `autocomplete="username"`
  - Value: `@handle` or `backup:{profile_id}` (set from session in `key-backup-ui.mjs`).
- Keep first passphrase: `autocomplete="new-password"`.
- Confirm field: `autocomplete="new-password"` (Apple’s documented pair) **or** remove confirm from DOM before submit if double `new-password` confuses Safari (test on device).

**Import** (created + hub):

- `autocomplete="username"` on account field (same stable id as export).
- `autocomplete="current-password"` on passphrase (not `off`).

### P1 — Post-download steward copy

After successful export, show explicit steps:

- “File downloaded — store it with your photos/files.”
- “Tap **Copy passphrase** then add to Passwords” (clipboard button).
- Do **not** imply autofill saved it until P0 is verified on iPhone.

### P2 — Chrome/Android programmatic save (optional enhancement)

After export on browsers where `window.PasswordCredential` exists:

```js
await navigator.credentials.store(
  new PasswordCredential({ id: backupAccountId, password: passphrase, name: "Humanity ownership backup" })
);
```

Feature-detect; no-op on Safari. Never replace P0/P1.

### P3 — Product IA

- Move **Download encrypted backup** out of “Export for developers” to **Manage → Encrypted backup** next to import.
- Keep pubkey / raw recovery import under developers.

### P4 — QA

| Case | Device |
|------|--------|
| Export → Passwords save prompt or manual copy path | iPhone Safari |
| Import autofill from saved entry | iPhone Safari |
| Export + `credentials.store` | Pixel Chrome |
| Import autofill | Samsung Internet |

Add to `docs/DEVICE_OS_QA.md` as **P1-BKP** when implemented.

---

## Tests to add when fixing

- Static HTML guard: export/import forms must not use form-level `autocomplete="off"`; import passphrase must be `current-password`.
- Optional Playwright: export form includes username field populated from fixture session.

Crypto paths remain covered by `worker/tests/key-backup.test.ts`.

---

## Changelog

| Date | Notes |
|------|-------|
| 2026-05-29 | Initial investigation — Apple Passwords save failure explained; platform matrix; fix backlog |
