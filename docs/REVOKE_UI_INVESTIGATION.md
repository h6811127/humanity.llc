# Revoke UI investigation — `/created/` Manage tab

**Date:** 2026-05-25  
**Phase 0 fix (2026-05-26):** Hub ⋯ **Open card** loads keys via `openCardNowPage()` — see `docs/CARD_WORKSPACE_PHASE0.md`.  
**Scope:** Read-only investigation (no code changes)  
**Reported symptoms:** Revoke / Disable card buttons missing; Resolver check rows stuck on “Checking…”  
**Surface:** `/created/` → Manage → “Revoke this QR” disclosure (matches `site/created/index.html` and screenshot)

---

## Executive summary

Two separate mechanisms explain the reported UI:

| Symptom | Primary cause | Intentional? |
|---------|---------------|--------------|
| **No Revoke / Disable buttons** | `#revoke-actions` is `hidden` when this tab has **no owner or recovery signing key** in `sessionStorage` (`hc_created`). The visible copy (“Unlock a saved backup or recovery key below…”) is the designed no-key state. | **Yes** — documented in `docs/M4_CREATED_REVOKE_UI.md` and `docs/M5_5_OWNER_KEY_PORTABILITY.md` |
| **Resolver check stuck on “Checking…”** | Live status is only updated by `initOwnerRevoke()` → `refreshLiveStatus()`. That init runs inside `bootstrapOwnerTools()` **after** `await hydrateSessionFromNetwork()`. Hydration has **no try/catch**; if `fetch(getCardJsonUrl(...))` throws (network/CORS/offline), `bootstrapOwnerTools()` rejects, **`initOwnerRevoke()` never runs**, and the panel stays on the static HTML defaults (“Checking…”). | **No** — failure mode / ordering bug |

The empty pink/red bar in the screenshot is **not** a documented UI element. It is likely an empty notice or disabled danger-button chrome (see § Visual artifact).

---

## What documentation says buttons should do

### Product contract (`docs/M4_CREATED_REVOKE_UI.md`)

- **Two owner actions** when signing material is present:
  - **Revoke this QR** — `target_kind: qr_credential`
  - **Disable card** — `target_kind: card`
- **Confirm before submit** — checkbox + disabled button until checked.
- **Live status** — on load, `GET …/status?q=` shows resolver truth.
- **Exit test #5:** Reload `/created/` **without session** → revoke section **explains keys are unavailable** (not full revoke UI).

### Lifecycle vocabulary (`docs/REVOKE_AND_LIFECYCLE_V1.md`)

- Button labels **Revoke this QR** and **Disable card** are the shipped vocabulary.
- Owner surfaces: session key, encrypted backup import, recovery key import on `/created/` (§ Owner surfaces).

### Key portability (`docs/M5_5_OWNER_KEY_PORTABILITY.md`)

- Phase A: revoke only while `sessionStorage` holds the create key.
- M5.5: backup import or recovery key import **unlocks the same revoke UI** client-side.
- Explicit: “lose tab without backup = cannot revoke from web UI.”

**Conclusion:** Buttons **are supposed to appear**, but **only after** owner or recovery private key is loaded into this tab. They are **not** supposed to appear on a cold visit with only `profile_id` / `qr_id` in the URL and no imported keys.

---

## UI structure (what controls what)

```
revoke-details (disclosure)
├── owner-network-status          ← Resolver check (Card / This QR / Human trust)
├── owner-revoked-banner (hidden) ← Post-revoke notice
├── owner-no-key                  ← Shown when NO signing keys
└── revoke-actions (hidden)       ← Shown when signing keys present
    ├── revoke-display-prefs
    ├── revoke-qr-block           ← Checkbox + "Revoke this QR"
    └── revoke-card-block         ← Checkbox + "Disable card" (inside advanced <details>)
```

### Signing key gate (`site/js/created-revoke.mjs`)

```215:219:site/js/created-revoke.mjs
  function refreshAccessUi() {
    const k = keys();
    if (noKeyEl) noKeyEl.hidden = !!k;
    if (revokeActions) revokeActions.hidden = !k;
    updateConfirmButtons();
```

`keys()` returns material only if `sessionStorage` (`hc_created`) contains either:

- `owner_private_key_b58` + `owner_public_key_b58`, or  
- `recovery_private_key_b58` + `recovery_public_key_b58`

### Live status fetch (`site/js/created-revoke.mjs`)

```222:255:site/js/created-revoke.mjs
  async function refreshLiveStatus() {
    if (!ctx.profileId || !ctx.qrId) return;
    // ...
    if (statusCardEl) statusCardEl.textContent = "Checking…";
    // ...
    try {
      const res = await fetch(getCardStatusUrl(ctx.profileId, ctx.qrId), { cache: "no-store" });
      const body = await res.json();
      // applyNetworkStatus(body, kind);
    } catch {
      // sets "Unreachable" on Card / This QR / Human trust
    }
  }
```

Initial HTML already says “Checking…”; if `refreshLiveStatus()` never runs, the user sees **indefinite Checking** (matches report).

### Bootstrap order (`site/js/created.mjs`)

```675:697:site/js/created.mjs
async function bootstrapOwnerTools() {
  if (!profileId || !activeQrId) return;

  await hydrateSessionFromNetwork();
  void refreshNetworkStatus();

  const revokeCtx = { /* ... */ };
  const revoke = initOwnerRevoke(revokeCtx);
```

```820:821:site/js/created.mjs
if (profileId && activeQrId) {
  void bootstrapOwnerTools();
}
```

`void bootstrapOwnerTools()` means **rejections are unhandled** — no fallback init for revoke.

`hydrateSessionFromNetwork()` performs an uncaught `fetch` when the session lacks `handle`, `manifesto_line`, or `created_at`:

```377:385:site/js/created.mjs
async function hydrateSessionFromNetwork() {
  if (!profileId) return;
  const existing = loadSession() || {};
  if (existing.handle && existing.manifesto_line && existing.created_at) return;

  const res = await fetch(getCardJsonUrl(profileId), {
```

Any thrown network error **aborts the entire bootstrap**, including `initOwnerRevoke()`.

---

## Root cause analysis

### 1. Missing buttons — expected behavior without keys (high confidence)

**Reproduction paths:**

| How user opens Manage | Keys in tab? | `#revoke-actions` | `#owner-no-key` |
|----------------------|--------------|-------------------|-----------------|
| Fresh link `/created/?profile_id=…&qr_id=…` after closing create tab | No | Hidden | Visible |
| Wallet → **Open card** / **Use keys** (Phase 0) | Yes when saved | Visible | Hidden |
| Wallet → **Manage** (removed; was menu link only) | No* | Hidden | Visible |
| Import encrypted backup / recovery key | Yes (after unlock) | Visible | Hidden |

\* **Pre–Phase 0:** ⋯ **Manage** was a plain link without `activateWalletEntry()`. **Shipped fix:** ⋯ **Open card** calls `openCardNowPage()` (`device-keys.mjs`), same as **Use keys**.

This matches the screenshot footer: *“Unlock a saved backup or recovery key below…”* — that string is exactly `owner-no-key` in `site/created/index.html`.

**Not a missing feature:** Docs exit test #5 explicitly describe this state.

### 2. Stuck “Checking…” — `bootstrapOwnerTools` failure before revoke init (high confidence)

**Mechanism:** Static HTML defaults are never replaced because `refreshLiveStatus()` is never registered/called.

**Likely triggers:**

1. **`hydrateSessionFromNetwork()` throws** — e.g. offline, DNS, blocked request, aborted fetch — on return visits with partial session (common when opening via **Manage** without full session fields).
2. **Less common:** `initOwnerRevoke` never reached due to earlier top-level module failure (unlikely if rest of `/created/` works).
3. **Rare:** `fetch(status)` hangs without resolving (would also leave Checking); normal failures hit `catch` → “Unreachable”.

**Note:** If `refreshLiveStatus()` runs but status `fetch` fails, UI should show **“Unreachable”**, not “Checking…”. Persistent “Checking…” strongly implies **init never ran**, not a failed status poll.

### 3. CORS gap on status GET (medium confidence — dev / preview; not primary for production)

In `worker/src/index.ts`, `GET …/status` returns `handleGetScanStatus(...)` **without** `withCors()`, unlike POST revoke/create routes.

On **local dev** (Pages `localhost:8788` → Worker `127.0.0.1:8787`), cross-origin status requests fail CORS. That normally triggers the `catch` branch (**Unreachable**), **if** `initOwnerRevoke` ran.

Still worth fixing for dev; also ensures status works from `*.pages.dev` previews calling production resolver.

### 4. Empty pink/red bar (low confidence — visual)

Candidates:

- `#owner-revoked-banner` — error-styled notice (`hc-notice--error`); should include text when shown.
- Disabled `.btn-danger` inside `#revoke-actions` if `hidden` fails to apply in a specific WebView.
- Empty `#owner-network-status-hint` before hint text is set (no background in CSS; less likely).

Needs DevTools inspection on the failing device to confirm which node paints the bar.

---

## Flow diagram

```mermaid
sequenceDiagram
  participant User
  participant Created as created.mjs
  participant Hydrate as hydrateSessionFromNetwork
  participant Revoke as created-revoke.mjs
  participant API as Worker GET /status

  User->>Created: Load /created/?profile_id&qr_id
  Created->>Created: Top-level QR render (await)
  Created->>Hydrate: bootstrapOwnerTools()
  alt Session missing handle/manifesto/created_at
    Hydrate->>API: GET /cards/{id} (card JSON)
    alt Network error / throw
      Hydrate--xCreated: Unhandled rejection
      Note over Revoke: initOwnerRevoke NEVER runs
      User sees static Checking…
    end
  end
  Created->>Revoke: initOwnerRevoke()
  Revoke->>Revoke: refreshAccessUi() keys?
  alt No keys in sessionStorage
    Revoke->>User: owner-no-key visible, revoke-actions hidden
  else Has keys
    Revoke->>User: revoke-actions visible (buttons disabled until checkbox)
  end
  Revoke->>API: GET /status?q=qr_id
  API-->>Revoke: scan JSON
  Revoke->>User: Card / QR / Human trust labels updated
```

---

## Verification checklist (for whoever fixes or QA)

1. **Confirm signing keys in tab**  
   DevTools → Application → Session Storage → `hc_created` → presence of `owner_private_key_b58` or `recovery_private_key_b58`.

2. **Confirm bootstrap completed**  
   Console: look for unhandled promise rejection from `bootstrapOwnerTools` / `hydrateSessionFromNetwork`.

3. **Confirm status request**  
   Network: `GET /.well-known/hc/v1/cards/{profile_id}/status?q={qr_id}`  
   - Not sent → init did not run (stuck Checking).  
   - Failed CORS → should be Unreachable if init ran.  
   - 200 → should update rows; if not, JS error after fetch.

4. **Reproduce wallet path**  
   - **Manage** only → expect no buttons + possible stuck Checking.  
   - **Control card** → expect buttons (if wallet entry has keys) + status update.

5. **Unlock path**  
   Import backup or recovery key → `onKeysUnlocked` calls `revoke?.refresh()` — buttons and status should appear without reload.

---

## Recommended fixes (documentation only — not implemented)

| Priority | Issue | Suggested direction |
|----------|--------|---------------------|
| P0 | Stuck Checking when hydrate throws | Wrap `hydrateSessionFromNetwork` in try/catch inside `bootstrapOwnerTools`, or call `initOwnerRevoke` before/without awaiting hydrate; ensure `refreshLiveStatus()` always runs when `profileId` + `qrId` exist. |
| P1 | Manage link without keys | On **Manage** click, call `activateWalletEntry(entry)` when wallet has keys (same as Control card), or show inline CTA “Load keys to revoke”. |
| P2 | Status GET CORS | Wrap `handleGetScanStatus` response with `withCors(request, res)` in `worker/src/index.ts`. |
| P3 | UX clarity | When `#revoke-actions` is hidden, avoid layout that looks like a broken empty button; ensure hint explicitly says “Import backup below” (already partial). |

---

## Files referenced

| File | Role |
|------|------|
| `site/created/index.html` | Revoke disclosure markup, default “Checking…” copy |
| `site/js/created-revoke.mjs` | Key gate, status poll, revoke POST |
| `site/js/created.mjs` | Bootstrap order, hydration, `void bootstrapOwnerTools()` |
| `site/js/device-keys.mjs` | `activateWalletEntry` / `openCardNowPage` |
| `site/js/device-hub-ui.mjs` | Manage vs Control card navigation |
| `worker/src/index.ts` | Status route without `withCors` |
| `docs/M4_CREATED_REVOKE_UI.md` | Shipped revoke UI contract |
| `docs/M5_5_OWNER_KEY_PORTABILITY.md` | Backup / recovery unlock paths |
| `docs/REVOKE_AND_LIFECYCLE_V1.md` | Product labels and owner surfaces |

---

## Answer to “are buttons supposed to be there?”

**Yes, when this browser tab has a signing key** (create session, wallet **Control card**, encrypted backup import, or recovery key import).  

**No, when only profile/QR IDs are in the URL** — documentation and shipped HTML intentionally show the unlock hint instead. The screenshot matches the **no-key** state; the defect is likely the **non-updating Resolver check** caused by bootstrap failing before revoke JS initializes, compounded by **Manage** not loading saved wallet keys.
