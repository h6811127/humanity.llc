# Hybrid custody — WebAuthn fallback QA (G-C3)

**Status:** Engineering + desk proxy shipped · manual matrix for launch gate  
**Audience:** QA, support  
**Related:** [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) · [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md) **K12** · [`CUSTODY_SUPPORT_MACROS.md`](CUSTODY_SUPPORT_MACROS.md)

---

## What ships

When `PublicKeyCredential` or `navigator.credentials` is missing:

- `/create/` **Device control** disables **This device (Face ID / Touch ID)**
- **Full control keys** is auto-selected
- Hint: *This browser cannot use Face ID / Touch ID device unlock. Full control keys will be used.*

Organizer revoke enabled at create also forces **full_keys** (unchanged).

---

## Automated regression

| Check | Command |
|-------|---------|
| Pure create custody state | `worker/tests/device-custody-create-core.test.ts` |
| Create page desk proxy | `npm run e2e:custody-create-fallback` |
| Custody block | `npm run worker:test:custody` |

---

## Manual matrix (G-C3 sign-off)

Run on **real devices** after deploy. Mark pass/fail per row.

| # | Environment | WebAuthn expected | Create UI | Card saves as | Notes |
|---|-------------|-----------------|-----------|---------------|-------|
| 1 | Safari iOS (current) | Available | device_unlock default | `device_unlock` wrap | Baseline |
| 2 | Safari iOS in-app (Mail / Instagram) | Often **unavailable** | full_keys forced | `full_keys` plaintext in wallet | K12 primary |
| 3 | Desktop Chrome | Available | device_unlock default | `device_unlock` | |
| 4 | Desktop Firefox private | Varies | Observe hint + radio state | Match hint | |
| 5 | Organizer revoke checked | N/A | full_keys forced | `full_keys` | |
| 6 | Ephemeral / private browsing flag | Hidden fieldset | N/A | `full_keys` session path | `isEphemeralBrowsingStorage` |

**Pass criteria:** No dead-end create; user never believes device_unlock was saved when WebAuthn is unavailable; hint is visible before submit.

---

## Support macro

See **"Unlock to manage" but I use Face ID** and create fallback sections in [`CUSTODY_SUPPORT_MACROS.md`](CUSTODY_SUPPORT_MACROS.md).
