# Ownership restore and view-mode UX plan

**Status:** Product direction — approved decisions (2026-05-29); implementation not started  
**Audience:** Product, design, engineering, QA  
**Opened:** Cross-device restore gap (view-only `/created/` hides all unlock paths; stranger-empty hub hides import)  
**Related:** [`OWNERSHIP_AND_CONTROL_MODEL.md`](OWNERSHIP_AND_CONTROL_MODEL.md) · [`CARD_WORKSPACE_UX.md`](CARD_WORKSPACE_UX.md) · [`M5_5_OWNER_KEY_PORTABILITY.md`](M5_5_OWNER_KEY_PORTABILITY.md) · [`KEY_LOSS_SAD_PATH_MATRIX.md`](KEY_LOSS_SAD_PATH_MATRIX.md) · [`HUB_STRANGER_ONBOARDING.md`](HUB_STRANGER_ONBOARDING.md) · [`BACKUP_PASSPHRASE_PASSWORD_MANAGER_INVESTIGATION.md`](BACKUP_PASSPHRASE_PASSWORD_MANAGER_INVESTIGATION.md) · [`QUIET_TAB_REHYDRATE.md`](QUIET_TAB_REHYDRATE.md)

---

## Executive summary

Stewards who open a card link on a **new browser** without keys see **View this card** and copy that points to **Manage** — but Manage and all restore UI are **hidden** until keys already exist. That inverts the sad path.

This plan locks **product decisions**, keeps **protocol and custody invariants** unchanged, and phases **implementation** so `/created/` becomes useful as **scannable signage** (read-only) while **Restore ownership** is always reachable from the hub and card page.

---

## Problem (current shipped behavior)

| Symptom | Root cause |
|---------|------------|
| No field to paste recovery code on new browser | Restore forms live inside `#created-control-root`, hidden when `createdMode === "view"` |
| Banner says “recovery / backup under **Manage**” | Manage tab is inside the same hidden control root |
| “Import a backup” on empty hub does nothing useful | `[data-hub-group="import"]` has `data-hub-stranger-empty-hide` → `display: none !important` when wallet empty |
| User thinks **Save ownership on this device** = cross-device backup | Save only copies keys to `localStorage` on **this browser**; D10 quiet rehydrate is same-origin only |
| Encrypted backup buried under **Export for developers** | D8 IA moved pubkey/raw import correctly but demoted primary restore discoverability |

Docs already promised view mode **unlock paths** ([`CARD_WORKSPACE_UX.md`](CARD_WORKSPACE_UX.md)); implementation and E2E K1 encoded the broken state.

---

## Locked product decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| **Primary cross-device artifact** | **Recovery code** (default UI) | One secret to save (Notes / Passwords); matches Layer 2 “Add recovery method”; already on card as `recovery_public_key` |
| **Secondary cross-device artifact** | **Encrypted backup** (advanced) | File + passphrase; power users and integrators; keep crypto path, de-emphasize in default flows |
| **Can setup complete without external save?** | **No — hard gate** | Step 4 **You're live** / **Open card controls** blocked until recovery is **acknowledged saved** (checkbox + dismiss) **or** encrypted backup exported (session flag `key_backup_exported_at`) |
| **View-only `/created/` layout** | **Read-only tabs** (Live · Manage), not restore-only hero | Cards are **scannable signage** first; room below the card for future steward content (tasks, status modules). Manage leads with **Restore ownership**; Live holds public/signage-oriented read-only content |
| **Hub restore visibility** | **Always show** restore section | Stranger-empty mode must **not** hide import/restore; empty wallet is exactly when restore is needed |

### Recovery code vs encrypted backup (why recovery wins default)

| Criterion | Recovery code | Encrypted backup |
|-----------|---------------|------------------|
| Artifacts to keep | **One** (text) | **Two** (file + passphrase) |
| Password manager | One entry | Passphrase only; file in Files/Drive |
| Mobile friction | Copy/paste | Download + file picker |
| Protocol | Shipped (M5.5.3–5.5.4) | Shipped (M5.5.1–5.5.2) |
| Operator custody | None (both) | None (both) |

Encrypted backup remains for stewards who want a file-based export and for tests (`e2e/key-loss-sad-path` K2). It is **not** the default teaching path.

### Hard gate before “You're live”

**In scope for setup wizard (step 4):**

- Cannot finish setup / enter control workspace until **at least one** external custody path is confirmed:
  - **Recovery:** `recovery_key_acknowledged` (existing dismiss flow), **or**
  - **Backup:** `key_backup_exported_at` on session (existing export event)

**Also required (existing + reinforced):**

- **Save ownership on this device** (`isWalletSaved(profile_id)`) before step 4 — already gates step 1→2; remains mandatory.

**Out of scope for gate:**

- Operator verification of save (honor system + checkbox)
- Uploading recovery or backup to humanity.llc (forbidden)

Copy pattern: *“Save a recovery code outside this browser — we cannot restore your object for you.”*

---

## Architecture constraints (unchanged)

These are **not** negotiable in this plan:

| Invariant | Implication for restore UX |
|-----------|------------------------------|
| Ed25519 owner signing in browser | Restore = load keys into `hc_created` (+ merge `hc_wallet` on save/import) |
| Resolver never holds private keys | No “email my recovery link” from operator |
| Recovery revoke | Recovery private key must match `recovery_public_key` on card JSON |
| M5.5 non-goals | No cloud-synced keys, no account email login as v1 restore |
| Layer 2 copy | **Restore ownership** / **Recovery code** — not “import private key” in hero |
| Quiet tab rehydrate (D10) | Same browser only; does not replace cross-device restore |

**Passkeys / Apple Passwords:** Unlock and storage helpers only — see [`BACKUP_PASSPHRASE_PASSWORD_MANAGER_INVESTIGATION.md`](BACKUP_PASSPHRASE_PASSWORD_MANAGER_INVESTIGATION.md). Not a substitute for saving recovery code outside the browser.

---

## Custody model (teach once)

```text
Same browser                    New browser / new device
─────────────────────          ─────────────────────────────
Save ownership on device  →   Recovery code (primary)
D10 quiet rehydrate         →   OR .hcbackup + passphrase (advanced)
                              OR original create tab (if still open)
```

| User phrase | Truth |
|-------------|-------|
| “I saved it on my phone” | Keys in **this browser’s** wallet |
| “I’m backed up” | Only if recovery code or backup file+passphrase saved **outside** the tab |
| “humanity.llc reset my password” | **Never** — not offered |

---

## View mode UX — read-only workspace

### Goals

1. **Restore** is visible without prior keys.
2. **Card page stays useful** as signage (QR, handle, scan link, public status).
3. **Layout matches control mode** so future modules (Today’s tasks, object streams, print hints) land in the same tab real estate.

### Mode matrix (target)

| Mode | Tabs | Restore | Revoke / sign / rotate |
|------|------|---------|-------------------------|
| **setup** | Wizard only | Recovery reveal in wizard; export backup optional advanced | After keys in tab |
| **control** | Live · Manage | Manage (reveal again if keys in tab) | Enabled |
| **view** | Live · Manage (read-only) | **Manage — top panel** | Hidden / disabled with clear copy |

### View mode — **Manage** tab (read-only)

**Order of panels:**

1. **Restore ownership** (primary)
   - **Recovery code** (default): paste + submit → `import-recovery-form` behavior
   - **Advanced:** encrypted backup file + passphrase (collapsed disclosure)
   - Success → load `hc_created`, merge wallet, transition to **control** mode
2. **Network snapshot** (read-only): resolver card/QR status, revoked banner if applicable — **inspect only**, no revoke buttons
3. **Links:** My objects, architecture / help — no “Export for developers” as the only path to restore

**Not in view Manage (or disabled with explanation):**

- Revoke QR / disable card
- Rotate / extend QR
- Live proof ask
- Child object add

### View mode — **Live** tab (read-only)

**Ship in Phase 1:**

- Card identity (handle, manifesto teaser, profile id copy)
- QR preview + scan URL (read-only)
- Short **What scanners see** summary from resolver (same data as control, no edit controls)

**Phase 2+ (signage / steward OS on the card):**

- **Today’s tasks** (inbox-derived or card-scoped actions)
- Object stream / status plate summaries
- Merch / print / deploy hints tied to this `profile_id`

Live tab is the **public object surface**; Manage tab is **custody + operational read-only**. Network-heavy revoke tooling stays Manage-only.

### Hero and banner copy (view mode)

| Element | Target copy |
|---------|-------------|
| Hero title | **View this object** (or keep **View this card** until object-first rename) |
| Eyebrow | **View only** |
| Lead | **Restore ownership** below to manage this object from this browser. |
| Remove | “Under **Manage**” when Manage was hidden — replace with visible tabs |

### DOM / wiring notes (engineering)

- Move **restore forms** outside `#created-control-root` **or** show `#created-control-root` in view mode with `data-created-mode="view"` and disabled control sections.
- Initialize `initKeyBackupUi` / `initRecoveryKeyUi` in view boot path (today: forms exist but parent is `hidden`).
- `applyCreatedWorkspaceMode("view")` must **not** hide tab nav; only disable signing actions.

---

## Hub — restore always visible

### Policy

The **Backup / Restore** group is **exempt** from stranger-empty hiding.

| Surface | Change |
|---------|--------|
| `/`, `/wallet/`, `/create/`, `/created/` hub | Remove `data-hub-stranger-empty-hide` from import group **or** add `data-hub-restore-always` override in CSS |
| Empty hint link `#hub-import-form` | Must scroll/open a **visible** form |
| Stranger-empty | Still hides monitoring, custody education, shortcuts, activity log, dot legend |

### Hub restore copy (Layer 2)

| Title | Sub |
|-------|-----|
| **Restore ownership** | Recovery code or encrypted backup file |

Import form supports **both** paths; default focus recovery paste if we add a hub recovery field in Phase 2 (optional — card page is canonical for recovery paste).

---

## Implementation phases

### Phase 1 — Fix the broken sad path (P0)

| Item | Files / areas |
|------|----------------|
| View mode shows **Live · Manage** tabs | `created-workspace.mjs`, `created/index.html` |
| **Restore ownership** panel at top of view Manage | Move or duplicate forms; `key-backup-ui.mjs`, `recovery-key-ui.mjs` |
| Hub import always visible | `device-shell.css`, `index.html`, `wallet/index.html`, `create/index.html` |
| Update view-mode banner copy | `device-ownership-copy-core.mjs`, `#no-session-detail` |
| E2E K1: expect restore panel visible, not hidden control root | `e2e/key-loss-sad-path.spec.ts` |
| Docs QA row P1-RESTORE | `DEVICE_OS_QA.md` |

**Exit:** New browser + `/created/?profile_id&qr_id` → paste recovery → control mode → revoke UI available.

### Phase 2 — Recovery-first setup hard gate

| Item | Notes |
|------|-------|
| Block step 4 until recovery acknowledged **or** backup exported | `created-setup.mjs` |
| Move recovery reveal from post-wizard Manage into **step 1–2** flow | Setup panel “Save recovery code” |
| Demote encrypted backup to **Advanced** under setup (not developers-only) | Align with D8 but separate “Advanced backup file” |
| Update “Copy once” → “Save outside this browser” | `created/index.html`, comprehension guards |

**Exit:** Cannot reach control workspace without external custody path + wallet save.

### Phase 3 — Password manager + polish

| Item | Notes |
|------|-------|
| HTML credential hints on export/import | [`BACKUP_PASSPHRASE_PASSWORD_MANAGER_INVESTIGATION.md`](BACKUP_PASSPHRASE_PASSWORD_MANAGER_INVESTIGATION.md) P0 |
| Post-export copy: file + passphrase + Passwords steps | `key-backup-ui.mjs` |
| Optional `/restore/?profile_id=` alias | Redirect or thin page → `/created/` view Manage |

### Phase 4 — Signage modules on Live (read-only)

| Item | Notes |
|------|-------|
| Today’s tasks strip | Inbox / card-scoped; read-only in view mode |
| Object stream summaries | Child objects without signing |
| Merch / deploy read-only hints | Link to shop with `profile_id` |

**Exit:** View mode useful for stewards checking signage without keys; restore still one tap away on Manage.

---

## Roadblocks (plan for, do not ignore)

| Roadblock | Mitigation |
|-----------|------------|
| Safari does not auto-save backup passphrase | Manual Passwords steps; recovery code primary |
| Two-part backup confusion | Default UI recovery-only; backup in Advanced |
| `display: none !important` on stranger-empty | Explicit restore exemption |
| View boot does not call restore init | Wire `bootstrapOwnerTools` or `bootstrapViewRestore` for all `action === "ok"` routes |
| Sign lock (D6) after restore | Existing `activateWalletEntryGated`; copy “Unlock to manage” |
| E2E assumed hidden Manage | Update K1/K5 expectations |
| Future Live tab modules calling signing APIs | Guard with `createdMode === "control"` |

---

## Explicit non-goals (this plan)

- Cloud-synced owner keys or humanity.llc account recovery
- Passkey-as-signing-key (protocol change)
- Operator “unlock my card” support
- Uploading `.hcbackup` or recovery code to server by default
- Replacing Ed25519 with WebAuthn credentials

---

## QA and regression

| ID | Manual | Automated |
|----|--------|-------------|
| **R1** | New browser `/created/` → Manage → paste recovery → control | Extend `e2e:key-loss-sad-path` |
| **R2** | Empty hub → import backup visible → import works | New E2E or extend wallet spec |
| **R3** | Setup cannot finish without recovery ack or backup export | `created-setup` unit/e2e |
| **R4** | View Live shows QR + scan link; no revoke | Manual P1-RESTORE |
| **R5** | Wrong recovery / wrong passphrase plain errors | Existing K2 tests |

Add **P1-RESTORE** section to [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) when Phase 1 ships.

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-05-29 | Primary cross-device = **recovery code**; backup = advanced |
| 2026-05-29 | **Hard gate** before You're live; wallet save + external custody required |
| 2026-05-29 | View mode = **read-only Live · Manage** tabs; restore top of Manage |
| 2026-05-29 | Hub **always show** restore section (exempt stranger-empty hide) |
| 2026-05-29 | Live tab reserved for future signage/tasks modules below card |

---

## Changelog

| Date | Notes |
|------|-------|
| 2026-05-29 | Initial plan from restore brainstorm + steward decisions |
