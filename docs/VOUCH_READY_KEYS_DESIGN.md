# Vouch-ready keys (design draft)

**Status:** Phases 1–5 shipped; optional PIN/device unlock before sign shipped (option E, opt-in per card)  
**Audience:** Product, security review, implementers  
**Vouch positioning:** [`VOUCH_TRUST_POSITIONING.md`](VOUCH_TRUST_POSITIONING.md) · **Threat model:** [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md)  
**Related:** [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md), [`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md), [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md)

---

## Problem

Stewards (and Vouched Humans) who vouch in the field often:

1. Open someone’s **scan** link (`/c/{profile}?q=…`).
2. See “signing keys are not active in this tab” even though their **Steward** card is saved on the device.
3. Leave the scan → **Saved cards** → **Use keys** → land on **`/created/`** → **Return to scan to vouch** → finally submit.

That round trip is correct mechanically but **feels like a homepage detour** for a task that already happened on the scan page. The network already knows they are a Steward; the gap is purely **device session** (`hc_created` empty in this tab).

We want vouching to feel like: *scan → attest → submit*, without implying weaker security or skipping in-person intent.

---

## What cannot change (security floor)

| Invariant | Why |
|-----------|-----|
| **Vouches are owner-signed** | Resolver verifies Ed25519 on the voucher’s card `public_key`. No server-side “vouch on behalf of” API. |
| **Private keys stay on device** | Only signed JSON is POSTed. Auto-activation does not upload keys. |
| **Explicit submit** | Checkbox + **Submit vouch** remain required. Auto-keys must not auto-submit a vouch. |
| **Eligibility on network** | Steward / Vouched Human + quotas + 90-day rule (stewards exempt) stay server-side. |
| **Same-origin wallet** | Only `humanity.llc` (or dev origin) JavaScript can read `hc_wallet`. A random scan page cannot pull another site’s storage. |

Auto-loading keys into the tab is **not a new trust claim**. It is the same operation as **Use keys** (`activateWalletEntry` in `site/js/device-keys.mjs`), triggered earlier and without navigating away from scan.

---

## Threat model: is auto-activate a new risk?

### Risks that do **not** increase vs today

| Threat | Today (manual Use keys) | With vouch-ready keys |
|--------|-------------------------|------------------------|
| **XSS on humanity.llc** | Steals `hc_created` / `hc_wallet` if present | Same - keys already in storage when saved |
| **Malicious scan URL** | Cannot read wallet without same-origin JS | Same - scan HTML is our origin; vouch script only activates from local wallet |
| **Wrong person vouched** | User still confirms statement + checkbox | Same - submit is manual |
| **Network impersonation** | Status fetch is HTTPS to resolver | Same |

### Risks that need **design care**

| Threat | Concern | Mitigations |
|--------|---------|-------------|
| **Shared / borrowed device** | Keys sit in `sessionStorage` until tab closes; auto-activate happens sooner | Opt-in per device; show “Keys active for @steward” on scan; optional **lock vouch keys** (clear session); optional **PIN/device unlock before sign** on saved card |
| **Wrong card auto-selected** | Multiple eligible saved cards → vouch signed as wrong `profile_id` | **Default vouch card** setting; if ambiguous, inline picker on scan (no silent guess) |
| **Accidental activation** | User only wanted to *view* a scan, not sign | Only activate when opening scan **and** user opted in, or single eligible steward card; never activate on passive embeds |
| **Cross-tab surprise** | Tab A has keys; Tab B auto-activates duplicate | Reuse `device-tab-presence` / cross-tab copy: “Keys already active in another tab” |
| **Stale wallet keys** | Saved keys no longer match network card | After activate, status fetch + `CARD_INVALID_SIGNATURE` path; prompt re-save / re-import |

### What auto-activate must **never** do

- Pull keys from cloud or email links without user having saved them locally first.
- Activate on a **revoked / suspended** card without showing ineligible state.
- Activate the **vouchee’s** profile (self-vouch) when scanning own QR.
- Bypass **90-day wait** (server) or **5 vouches/year** (server).

**Conclusion:** Auto-activate is **acceptable** if it is **opt-in**, **visible**, and **ambiguous-safe**. It is not a substitute for passkeys or HSMs; it optimizes UX for people who already chose to store signing keys on this device.

---

## Design principles

1. **Scan-first** - Prefer activating keys **on the scan page** (or inline panel), not routing through `/created/` unless the user wants to manage the card.
2. **Explicit opt-in** - Default off; steward sets “use this card when I vouch” once per device (or per saved row).
3. **Transparent state** - Always show *which* `profile_id` / handle will sign; same strip as today’s “Keys active on this device · Steward”.
4. **Fail closed on ambiguity** - 0 eligible → current explainer; 2+ eligible → picker, not silent pick-first.
5. **Reversible** - “Stop using keys in this tab” clears `hc_created` without deleting wallet.

---

## Options (brainstorm matrix)

| Option | UX | Security | Complexity |
|--------|----|----------|------------|
| **A. Status quo** | Wallet → Use keys → `/created/` → return | Baseline | Shipped |
| **B. “Use keys here” on scan** | One button on explainer; stay on scan | Same as A, fewer steps | Low |
| **C. Opt-in auto-activate on scan** | Scan loads → keys appear if default vouch card set | +shared-device if opt-in careless | Medium |
| **D. “Vouch mode” session flag** | Toggle on wallet: “While on, every scan loads my steward keys” | Keys in tab longer by intent | Medium |
| **E. Passkey / unlock gate before activate** | Auto-activate only after device PIN/biometric | Stronger shared-device story | High (new subsystem) |

**Recommendation for v1:** ship **B** quickly, then **C** behind a wallet toggle **“Default card for vouching”** (stores `profile_id` in `localStorage`, e.g. `hc_default_vouch_profile_id`).

**E** shipped as opt-in per saved card: PIN or device WebAuthn unlock required before taking control in a tab and before `Sign and submit` (`device-control-activation.mjs`, `vouch-sign-lock.mjs`).

**Planned extension (WS-CUSTODY):** **`device_unlock`** custody mode uses WebAuthn as the **primary wrap/unlock** at create — not only a gate on plaintext keys. D6 is foundation; see [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) § D6 vs device_unlock.

---

## Proposed feature: Vouch-ready keys

### User-facing behavior (target)

1. Steward saves card on device (already required).
2. On **Saved cards**, sets **Default for vouching** on one row (or only possible if exactly one Steward/Vouched Human).
3. Opens any **active** vouchee scan in the **same browser profile**.
4. Scan page:
   - If `hc_created` already has that default card’s keys → show vouch form (today).
   - Else if opt-in default exists and wallet row has keys → **silently** `activateWalletEntry` → show vouch form **without** leaving scan.
   - Else if one eligible card only → show **Use keys here** (B).
   - Else → show picker: “Vouch as @a / @b” (each calls activate + refresh).

5. Optional chip: **Keys active for vouching as @handle** with **Stop** (clear session).

### Settings (local only)

| Key | Storage | Meaning |
|-----|---------|---------|
| `hc_default_vouch_profile_id` | `localStorage` | Profile to auto-activate on scan when keys missing |
| `hc_vouch_auto_activate` | `localStorage` | `"1"` = honor default on scan; `"0"` or absent = manual only |

Wallet UI copy: *“When I open someone’s scan, load this card’s keys in that tab so I can vouch without visiting Saved cards first.”*

### Scan page logic (technical sketch)

```
on scan load (vouch-issue.mjs init):
  rememberVouchReturnUrl()  // keep for /created/ deep links

  if hc_created has owner keys:
    proceed as today (eligibility checks)

  else if hc_vouch_auto_activate && hc_default_vouch_profile_id:
    entry = wallet.find(profile_id match)
    if entry && network-eligible(entry) && entry !== vouchee:
      activateWalletEntry(entry)   // session only, no navigate
      re-run init or refresh UI

  else:
    showNoKeysExplainer() with:
      - "Use keys here" per eligible row (B)
      - link to set default on wallet if multiple
```

Network eligibility should reuse `getCardStatusUrl` + `isEligibleVoucherState` (already in `vouch-issue.mjs`).

### `/created/` role after this

`/created/` remains the **control plane** (revoke, QR, live control, recovery). **Vouch mode** should not *require* `/created/` as a turnstile. Optional banner “Return to scan” stays for users who landed there from old flows.

---

## UX copy (draft)

| Surface | Copy |
|---------|------|
| Wallet row action | **Set as default for vouching** / **Default for vouching ✓** |
| Wallet help | Loads signing keys automatically when you open a scan link in this browser. Keys stay in this tab until you close it or tap Stop on the scan. |
| Scan (activated) | Keys ready · Vouching as **@steward_handle** · [Stop] |
| Scan (ambiguous) | Choose which card signs this vouch: [@a] [@b] |
| Scan (opt-in off) | **Use keys here** for **@handle** (no redirect) |
| Scan page chrome dot (planned) | At-a-glance **your device** state; tap → scan glance — [`SCAN_PAGE_DEVICE_DOT.md`](SCAN_PAGE_DEVICE_DOT.md) |

---

## Implementation phases

| Phase | Deliverable | Tests |
|-------|-------------|-------|
| **1** | **Use keys here** on scan explainer (`activateWalletEntry` + re-init, no `navigateTo`) | Shipped (`vouch-issue.mjs?v=6`, `vouch-explainer-actions`) |
| **2** | Wallet **Default for vouching** + `hc_default_vouch_profile_id` | Shipped (`vouch-ready-keys.mjs`, hub ⋯ menu) |
| **3** | Opt-in auto-activate on scan when default set | Shipped (`vouch-issue.mjs?v=7`) |
| **4** | “Stop” on scan + cross-tab notice when auto-activated | Shipped (`scan-tab-keys.mjs`, `scan-cross-tab-banner`) |
| **5** | Multi-card picker copy + **Switch to default** when wrong keys active | Shipped (`vouch-issue.mjs?v=10`) |
| **6** | Progressive device dot + scan glance in page chrome | Shipped (`pass-v29`) — [`SCAN_PAGE_DEVICE_DOT.md`](SCAN_PAGE_DEVICE_DOT.md) |

Worker/API: **no change** for vouch-ready keys.

---

## Open questions

1. **Steward-only auto?** Restrict opt-in to `steward` network state first, or include `verified_human` after 90-day wait?
2. **Auto-activate when keys are for a *different* saved card?** Replace session or show “Switch to @default for vouching?”
3. **iOS Safari / IT PWA** - `sessionStorage` per tab is reliable; document “same tab” for QR opens from Camera app.
4. **Audit log** - Log `auto_activate_vouch_keys` in `hc_device_activity` for support/debug?
5. **Founding / governance** - Any policy that stewards must confirm identity on `/created/` before first vouch on a new device? (Could require one manual **Use keys** before enabling auto.)

---

## Non-goals

- Server-stored signing keys or “steward session” cookies.
- Auto-submit vouch on scan open.
- Syncing keys across devices without backup import.
- Replacing in-person attestation checkbox.

---

## Decision log (to fill after review)

| Date | Decision |
|------|----------|
| TBD | Ship B only vs B+C |
| TBD | PIN gate before auto-activate (defer?) |
| TBD | Steward-only opt-in vs all eligible vouchers |

---

## References

- `site/js/device-keys.mjs` - `activateWalletEntry`, `openCardNowPage`
- `site/js/vouch-issue.mjs` - scan vouch gate
- `docs/KEYS_CARDS_AND_VERIFICATION.md` - network vs device layers
