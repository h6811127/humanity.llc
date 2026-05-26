# Keys, cards, and verification

**Status:** Shipped (UI + this doc)  
**Audience:** Anyone using Humanity Cards, vouching, or multi-device flows  
**Related:** [`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md), [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md), [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md)

---

## The short version

You do **not** need multiple accounts. You **do** need to understand three separate ideas:

| Idea | What it is | Where you see it |
|------|------------|------------------|
| **Card (profile)** | One signed identity on the network (`profile_id`) | Resolver, scan pages, `/created/` |
| **Keys (signing)** | Ed25519 owner (+ optional recovery) keypair for **one** card | This browser only, until you save or clear data |
| **Verification (trust label)** | Public state from the resolver: Registered, Vouched Human, Steward, … | Network row on `/created/`, Human trust on scan, chip on `/wallet/` |

**Vouching requires both:** your card must be **Steward or Vouched Human on the network**, and **that card’s keys must be active in this browser tab**.

Steward on the network does **not** automatically appear on a phone that never loaded those keys.

---

## How many cards?

**As many as you create.** Each create flow mints a new `profile_id`. The product does not merge them.

Typical patterns:

- **One card per human** — one profile you care about.
- **Several cards** — testing, demos, or separate roles (each has its own keys and verification).

There is no “main account.” The **active card** is whichever profile’s keys are in **`sessionStorage` → `hc_created`** in **this tab**.

---

## How many keys?

Per **card**, at creation time:

| Key | Role |
|-----|------|
| **Owner key** | Signs vouches, revokes, QR rotation, live control, card updates |
| **Recovery key** | Break-glass; can sign some operations if you configure it |

So **two keypairs per card**, but vouching uses the **owner** keypair in normal flows.

Per **device**, storage:

| Storage | Contents | Lifetime |
|---------|----------|----------|
| **`hc_created`** (session) | Active card’s keys + metadata for **this tab** | Until tab closes / you clear site data |
| **`hc_wallet`** (local) | Zero or more **saved** cards with keys (labels, `profile_id`, …) | Until you remove or clear site data |
| **`hc_wallet_network_cache`** (session) | Cached resolver status + **verification label** per saved card | ~5 minutes |

**No sync between devices.** Chrome and iPhone are separate wallets unless you **export/import** a backup (`.hcbackup.json`) or create/save again on each device.

---

## Two layers (network vs device)

```text
┌─────────────────────────────────────────────────────────────┐
│ NETWORK (resolver / D1)                                     │
│  • profile_id, handle, card active/revoked                  │
│  • verification_summaries: Registered | Vouched Human |     │
│    Steward | suspended | revoked                            │
│  • vouches, QR credentials, scan kind (active / revoked)  │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ GET status / scan HTML
                              │
┌─────────────────────────────────────────────────────────────┐
│ THIS DEVICE (browser)                                       │
│  • hc_created = keys loaded NOW (can sign)                  │
│  • hc_wallet = saved cards (keys on disk, not always active)│
│  • **Use keys** (Saved cards) copies one wallet row →       │
│    hc_created, then opens /created/                         │
└─────────────────────────────────────────────────────────────┘
```

### What each layer proves

| Action | Network needs | Device needs |
|--------|---------------|--------------|
| **View** someone’s scan | Active scan URL (`?q=qr_…` when QR-scoped) | Nothing |
| **Vouch** for someone | Voucher is Steward or Vouched Human | Voucher owner keys in `hc_created` |
| **See your Steward label** on `/created/` | `verification_summaries.state = steward` | Keys for **your** profile in this tab + status fetch |
| **See Steward on iPhone** | Same (resolver) | Save card on iPhone → **Use keys** (opens `/created/`) → **Return to scan to vouch** |

---

## Where verification appears in the UI (after this doc)

| Surface | What you see |
|---------|----------------|
| **`/created/` → On the network** | Row title = label (e.g. **Steward**). Icon: **green shield** for Steward, trust-blue shield for Vouched Human, purple people if vouches in progress, blue people for Registered. |
| **`/wallet/` saved card row** | Pills: **network** (Active / QR revoked / …) + **verification** (Steward / Vouched Human / Registered / …). |
| **Scan page → Human trust** | **Scanned card’s** label (not yours). Steward = green shield. |
| **Scan page → Vouch** | **Your** ability to sign. If keys missing: explains network vs keys; if saved Steward exists, names the card. |

---

## Vouching checklist (multi-device)

1. **Vouchee:** active scan link (`/c/{profile}?q={active_qr}`), not revoked QR, not your own `profile_id`.
2. **Voucher (you):** Steward or Vouched Human on the **network** (curl or `/created/` on a device with your keys).
3. **This phone/browser:** On the vouchee’s scan page, tap **Use keys here** for your steward card (loads `hc_created` in this tab, stays on scan). Or `/wallet/` → **Use keys** → **Return to scan to vouch** on `/created/`.
4. Submit the vouch on the vouchee’s **active** scan page.

If step 3 is skipped, you will see **“keys not active on this device”** even when the network says Steward.

**Proposed UX improvement (draft):** [`VOUCH_READY_KEYS_DESIGN.md`](VOUCH_READY_KEYS_DESIGN.md) — opt-in auto-activation of saved keys on scan so stewards need not round-trip through **Use keys** and `/created/` every time.

---

## Bootstrap (Steward without vouches)

Steward is **not** earned by vouch count. It is set on the resolver (bootstrap operator / D1) until founding-badge tooling ships. See [`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md) and [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) § Founding Trust Bootstrap.

---

## Implementation map

| Piece | Location |
|-------|----------|
| Human trust copy + icon tones | `worker/src/resolver/verification-display.ts` |
| Shared browser helpers | `site/js/human-trust-ui.mjs` |
| `/created/` icon + labels | `site/js/created.mjs`, `site/created/index.html` |
| Wallet verification chip | `site/js/device-wallet-network*.mjs`, `site/js/device-hub-ui.mjs` |
| Scan vouch explainer | `site/js/vouch-issue.mjs`, `worker/src/resolver/scan-html.ts` |

---

## Related docs

- [`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md) — vouch rules, quotas, scan UX
- [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md) — wallet, Use keys, backup import
- [`DEVICE_OS.md`](DEVICE_OS.md) — two-layer product model
