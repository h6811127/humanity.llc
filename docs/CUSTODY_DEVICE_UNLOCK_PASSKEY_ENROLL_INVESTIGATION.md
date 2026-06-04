# Investigation: device_unlock passkey enroll fails on mobile PWA

**Status:** Fix 1 step 1 shipped (`bytesToBase64` ArrayBuffer coercion + Vitest in `device-custody-wrap-core`); setup `runSave` / quiet autosave hardening still open  
**Date:** 2026-06-04  
**Surfaces:** `/create/` auto-save, `/created/` setup save, custody migrate re-enroll  
**Related:** [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) · [`CUSTODY_LAUNCH_READINESS.md`](CUSTODY_LAUNCH_READINESS.md) · [`SYSTEM_INVARIANTS.md`](SYSTEM_INVARIANTS.md) § Hybrid `device_unlock`

---

## Symptoms (reported)

| Platform | When | What user sees |
|----------|------|----------------|
| **iPhone PWA** | After completing system passkey / Face ID during create (device_unlock) | `undefined is not a function (near '...b of bytes...')` |
| **Android PWA** | After tapping create (device_unlock path) | Blank screen (workspace not visible) |

Consumer create defaults to **This device** (`device_unlock`) when WebAuthn is available. Auto-save runs **before** navigation to `/created/` and calls `navigator.credentials.create` to enroll a passkey and wrap the owner key.

---

## Root cause (primary)

### `bytesToBase64` iterates a Web Crypto `ArrayBuffer`

After a successful passkey create + PRF, `enrollDeviceUnlockAndBuildWalletEntry` encrypts the owner key and persists base64 fields:

```56:66:site/js/device-custody-enroll.mjs
  const aesKey = await importAesGcmKey(prfResult.prfKeyBytes);
  const { iv, ciphertext } = await encryptOwnerPrivateKeyB58(aesKey, ownerKey);

  /** @type {import("./device-custody-mode-core.mjs").WrappedOwnerKeyV1} */
  const wrapped_owner_key = {
    version: WRAPPED_OWNER_KEY_VERSION,
    credential_id: prfResult.credentialId,
    prf_salt: bytesToBase64(prfSalt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
  };
```

`encryptOwnerPrivateKeyB58` returns `ciphertext` from `crypto.subtle.encrypt`, which per Web Crypto is an **`ArrayBuffer`**, not a `Uint8Array`:

```10:14:site/js/device-custody-wrap-core.mjs
export async function encryptOwnerPrivateKeyB58(aesKey, privateKeyB58) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(String(privateKeyB58));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, plain);
  return { iv, ciphertext };
}
```

`bytesToBase64` uses `for...of` over the argument:

```34:37:site/js/device-custody-wrap-core.mjs
export function bytesToBase64(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
```

**`ArrayBuffer` is not iterable** in JavaScript. Engines throw when the loop runs:

| Engine | Typical message |
|--------|-----------------|
| V8 (Node / Chrome) | `TypeError: bytes is not iterable` |
| WebKit (Safari / iOS PWA) | `undefined is not a function (near '...b of bytes...')` — matches user report |

### Failure happens only after passkey UI succeeds

Earlier enroll steps use `Uint8Array` inputs and succeed:

- `prf_salt` — `Uint8Array` from `getRandomValues`
- `iv` — `Uint8Array` from `getRandomValues`
- `credential_id` — `Uint8Array(credential.rawId)` via `bytesToBase64Url`

Only **`ciphertext`** triggers the crash. That matches “passkey finished, then error.”

### Why tests did not catch it

`worker/tests/device-custody-wrap-core.test.ts` round-trips encrypt/decrypt but **never calls `bytesToBase64` on `ciphertext` from `encryptOwnerPrivateKeyB58`**. The base64 unit test uses a `Uint8Array([1, 2, 3])` only.

E2E custody specs cover recovery mandatory and WebAuthn-unavailable fallback; **no test performs a real or mocked PRF enroll** through `device-custody-enroll.mjs`.

---

## Disconfirmation attempts

| Hypothesis | Result |
|------------|--------|
| PRF missing / `getClientExtensionResults` broken | **Ruled out for iPhone** — error string points at `bytesToBase64` loop, not PRF branch; PRF failure returns `{ ok: false, fallbackFullKeys: true }` without reaching `bytesToBase64(ciphertext)`. |
| Failure in `bytesToBase64Url` / `credential.rawId` | **Ruled out** — `rawId` wrapped in `new Uint8Array(...)` before base64url encode. |
| `importAesGcmKey` / AES encrypt | **Ruled out** — repro reaches encrypt; only encoding step fails. |
| Recovery gate blocks before passkey | **Ruled out for post-passkey error** — gate throws a clear string error before WebAuthn. |

**Local repro (Node 20, same modules):**

```bash
node --input-type=module -e "
import { bytesToBase64, encryptOwnerPrivateKeyB58, importAesGcmKey } from './site/js/device-custody-wrap-core.mjs';
const aesKey = await importAesGcmKey(crypto.getRandomValues(new Uint8Array(32)));
const { ciphertext } = await encryptOwnerPrivateKeyB58(aesKey, 'test');
bytesToBase64(ciphertext);
"
# TypeError: bytes is not iterable
```

Simulated full enroll encoding: `prf_salt`, `iv`, and `credential_id` encode OK; **only `ciphertext` fails.**

---

## Android blank screen (secondary / contributing)

Not fully reproduced in desk CI; plausible combinations:

### A. Same throw, different UX

On `/create/`, `submitCreate` catches and calls `setStatus(err.message)`. If the status line is off-screen, covered by the passkey sheet, or low contrast in PWA chrome, the page can look “blank” after dismiss even though an error was set.

### B. `/created/` route gate hides workspace (`data-created-route="pending"`)

`site/created/index.html` boots with `data-created-route="pending"`. CSS sets `display: none !important` on `#created-setup-root` and `#created-control-root` until the gate resolves to `ok`.

If `gateCreatedRoute` hangs (network) or fails silently from the user’s perspective, the hero may show only **“Checking link…”** with no wizard — reads as a blank main area.

This is **orthogonal** to the wrap bug but can appear on the same user journey after `location.replace("/created/…")`.

### C. Setup `runSave` treats a Promise as boolean

`created.mjs` passes:

```javascript
runSave: () => deviceSaveCtl.runSave() === true
```

`runSave` is **async** and returns a `Promise`, so `=== true` is always false. Setup “Save” / Continue paths can mis-report save success and strand users on step 1 even when enroll eventually fails or succeeds asynchronously. Does not explain iPhone’s explicit error but can worsen Android setup confusion.

### D. Quiet auto-save on `/created/` swallows errors

`initCreatedDeviceSave` calls `runSave({ quiet: true })` without surfacing failures. A second passkey prompt after a failed create-time enroll would fail again with no status line.

---

## Affected code paths

| Entry | Module |
|-------|--------|
| Create submit auto-save | `create-card.mjs` → `saveSessionToWalletWithCustody` → `device-custody-enroll.mjs` |
| Created setup / device save | `created-device-save.mjs` → same |
| Migrate to device_unlock | `device-custody-migrate.mjs` → `enrollDeviceUnlockAndBuildWalletEntry` |

Unlock path (`device-custody-unlock.mjs`) uses `base64ToBytes` on stored strings — not affected.

---

## Suggested fixes

### Fix 1 — Normalize binary types in `bytesToBase64` (recommended) — **step 1 shipped**

At the top of `bytesToBase64`, coerce `ArrayBuffer` / `ArrayBufferView` to `Uint8Array`:

```javascript
export function bytesToBase64(bytes) {
  const u8 =
    bytes instanceof Uint8Array
      ? bytes
      : bytes instanceof ArrayBuffer
        ? new Uint8Array(bytes)
        : ArrayBuffer.isView(bytes)
          ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
          : bytes;
  let binary = "";
  for (const b of u8) binary += String.fromCharCode(b);
  return btoa(binary);
}
```

| Pros | Cons |
|------|------|
| One place fixes enroll, migrate, any future caller | Slightly broader behavior change; needs unit tests for `ArrayBuffer` + `Uint8Array` |
| Matches mental model “bytes = binary data” | Must ensure invalid types still fail clearly |
| Aligns with `bytesToBase64Url` pattern (already uses `Uint8Array` for `rawId`) | |

**Regression:** extend `device-custody-wrap-core.test.ts` with `bytesToBase64` on encrypt output; optional Playwright mock-PRF enroll test.

---

### Fix 2 — Return `Uint8Array` from `encryptOwnerPrivateKeyB58`

Change encrypt helper only:

```javascript
const ciphertext = await crypto.subtle.encrypt(...);
return { iv, ciphertext: new Uint8Array(ciphertext) };
```

| Pros | Cons |
|------|------|
| Minimal, documents contract at crypto boundary | Does not harden `bytesToBase64` for other `ArrayBuffer` callers |
| Very small diff | `decrypt` path already accepts `Uint8Array` from `base64ToBytes` — OK, but subtle if anything assumed `ArrayBuffer` |

**Regression:** same wrap-core round-trip + enroll integration test.

---

### Additional hardening (separate PRs)

| Item | Rationale |
|------|-----------|
| `await deviceSaveCtl.runSave()` in setup/dashboard wrappers | Fixes false-negative save detection |
| Show error when quiet auto-save fails on `/created/` | Surfaces enroll failure after navigation |
| Mocked PRF enroll Vitest or e2e | Closes coverage gap that allowed C1 ship without mobile enroll |

---

## Recommended sequencing

1. **Fix 1** + wrap-core test on `encrypt` → `bytesToBase64` → `base64ToBytes` round-trip (highest leverage).
2. Setup `runSave` async wiring (UX).
3. Manual **G-C1** pass: iPhone PWA create + Android PWA create per [`CUSTODY_DEVICE_UNLOCK_COMPREHENSION_QA.md`](CUSTODY_DEVICE_UNLOCK_COMPREHENSION_QA.md).

---

## Launch impact

Until fixed, **device_unlock auto-save at create is broken** on real WebKit/Android Chrome when PRF succeeds — exactly the default consumer path. Fallback to `full_keys` only runs when enroll returns `{ fallbackFullKeys: true }` (PRF unavailable), **not** when enroll throws.

**G-C1 / G-C2 / G-C3** manual gates should be considered **blocked** for device_unlock enroll on mobile PWA.
