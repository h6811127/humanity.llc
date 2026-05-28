# Keys, cards, and verification

**Status:** Shipped (UI + this doc)  
**Audience:** Anyone using Humanity Cards, vouching, or multi-device flows  
**Related:** [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) · [`VOUCH_TRUST_POSITIONING.md`](VOUCH_TRUST_POSITIONING.md) · [`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md) · [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md) · [`KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md`](KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md), [`V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md)

---

## The short version

You do **not** need multiple accounts. You **do** need to understand three separate ideas:

| Idea | What it is | Where you see it |
|------|------------|------------------|
| **Root card (profile)** | One signed human/steward root on the network (`profile_id`) | Resolver, scan pages, `/created/` |
| **Child object** | Status plate, lost-item tag, printed item, sticker, hoodie, or demo controlled by a root card | Scan pages, QR lifecycle, merch flows |
| **Keys (signing)** | Ed25519 owner (+ optional recovery) keypair for the **root** card | This browser only, until you save or clear data |
| **Verification (trust label)** | Public state from the resolver: Registered, Vouched Human, Steward, … | Network row on `/created/`, Human trust on scan, chip on `/wallet/` |

**Vouching requires both:** your root card must be **Steward or Vouched Human on the network**, and **that root card’s keys must be active in this browser tab**.

Steward on the network does **not** automatically appear on a phone that never loaded those keys.

**What a vouch means (product):** A signed, public, revocable human attestation-not legal ID, not iris proof, not “verified forever.” Full framing: [`VOUCH_TRUST_POSITIONING.md`](VOUCH_TRUST_POSITIONING.md).

---

## How many cards?

**Target model:** one root Humanity Card per human/steward role, with many child objects underneath it. See [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md).

Typical patterns:

- **One root card per human** - the profile you care about, the one that can vouch and receive vouches.
- **Many child objects** - status plates, lost-item relays, stickers, hoodies, event kits, demos, and printed artifacts controlled by that root key.
- **Several root cards** - testing, demos, separate roles, or legacy pilots only; each root has its own keys and verification.

There is no server-side “main account.” The **active root card** is whichever profile’s keys are in **`sessionStorage` → `hc_created`** in **this tab**. Child objects do not get their own default private key; editing them requires the root key unless a future delegated capability says otherwise.

### Realistic scale on one browser

There is **no coded maximum** on saved root cards in `hc_wallet` (`device-wallet.mjs`). Browser `localStorage` quota (typically ~5–10 MB per origin) can hold far more full key bundles than the product is designed to steward. **Comfortable day-to-day use is roughly 1–5 saved root cards**; treat **~10+ root cards** as out of spec until the open issues below are fixed. Many child objects under one root are the intended scale direction, but polling and device UI must still budget per child/QR when those children need network checks.

**How this should feel (product):** Saving many root cards is **local convenience** (labels, hub rows, quick open to `/created/`). It is **not** permission for the reference operator to poll every card continuously. Stewards who need stranger live proof should use **Watch for live proof** (opt-in), **Check for live proof**, or stay on **`/created/`** for the active root card — not assume the network watches the whole wallet. Pins, child object scan URLs, and public scan links work **without** saving extra keys; see [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) § Optimization directions.

The following **must be addressed** before we treat large wallets as supported. They bite **before** storage quota, not after:

| Area | What happens today | Why it must be fixed |
|------|-------------------|----------------------|
| **Worker / inbox budget** | With live-proof polling, **~10+ saved root cards** on an open tab can exhaust Cloudflare’s **Workers Free daily cap (100k/day)** in minutes. Phases 1–4 shipped scoped polling, round-robin **one GET per tick**, resolver health gating, and a 15 min SW cadence - but **more saved roots or polled children still means more poll slots** when background alerts and hub refresh run. | Reference operator and stewards cannot safely leave the shell open at scale; see [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md). |
| **Shell performance** | Hub/inbox chrome uses wallet metadata and display-safe rows (S8–S9); poll paths avoid full-array copies (S8b). **`hc_wallet_network_cache`** capped at **20** rows (S6). Optional later: virtualize very large hub lists. | Residual lag at very large N or many tabs — see [`SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md`](SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md). |
| **Multi-tab** | Extra tabs with `hc_created` add cross-tab presence churn (`hc_tab_keys_presence`, capped at **20 tab rows**). That is separate from wallet size but **feels worse with many saved roots + many tabs** (storage events → chrome refresh). Each tab may also poll resolver status independently until [`DEVICE_TAB_RESOLVER_SYNC.md`](DEVICE_TAB_RESOLVER_SYNC.md) ships. | Lag and false-positive inbox paths; unified hub custody panel — [`KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md`](KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md) · [`CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md`](CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md). |

**Engineering status:** Shell perf S6–S11, resolver hot-route rate limits (O2), and large-wallet presence debounce shipped (2026-05-28). Re-test multi-tab at very large N — see [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) § Open issues.

**Live proof polling:** Automatic `GET …/live-control/challenges` requires opt-in **Watch for live proof** (`hc_watch_live_proof === "1"`; default off), hub/inbox scope, leader tab, and stays under **400 auto GETs per UTC day** on this device (manual **Check for live proof** is unlimited). At **≥10** saved root cards, auto poll focuses on the active tab’s card plus any known pending proof. See [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md).

---

## How many keys?

Per **root card**, at creation time:

| Key | Role |
|-----|------|
| **Owner key** | Signs vouches, root updates, child object updates, QR rotation, revoke/disable, and live control |
| **Recovery key** | Break-glass key that can restore control of the root and its children for supported operations |

So **two keypairs per root card**, but vouching uses the **owner** keypair in normal flows. Child objects do not get a new keypair by default.

Per **device**, storage:

| Storage | Contents | Lifetime |
|---------|----------|----------|
| **`hc_created`** (session) | Active root card’s keys + metadata for **this tab** | Until tab closes / you clear site data |
| **`hc_wallet`** (local) | Zero or more **saved root cards** with keys (labels, `profile_id`, …); child metadata may be displayed later without new keys | Until you remove or clear site data |
| **`hc_wallet_network_cache`** (session) | Cached resolver status + **verification label** per saved root/card row; `at` = when **this device** last polled `GET …/status?q=…` (used for **checked … ago** on hub rows - not scan logging) | ~5 minutes |

**No sync between devices.** Chrome and iPhone are separate wallets unless you **export/import** a backup (`.hcbackup.json`) or create/save again on each device.

---

## Two layers (network vs device)

```text
┌─────────────────────────────────────────────────────────────┐
│ NETWORK (resolver / D1)                                     │
│  • profile_id, handle, root card active/revoked             │
│  • child object / print_artifact scopes and QR status        │
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
│  • hc_wallet = saved root cards (keys on disk, not active)  │
│  • **Use keys** (Saved cards) copies one root row →         │
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
| **Edit a child object** | Child belongs to active root and is not disabled/suspended | Root owner or recovery key in `hc_created` |

---

## Where verification appears in the UI (after this doc)

| Surface | What you see |
|---------|----------------|
| **`/created/` → On the network** | Row title = label (e.g. **Steward**). Icon: **green shield** for Steward, trust-blue shield for Vouched Human, purple people if vouches in progress, blue people for Registered. |
| **`/wallet/` saved card row** | **Title** (label or `@handle`); **identity line** (`Object type · Steward / Vouched Human / Registered`); **one status line** (e.g. **Reachable · checked 2m ago**, **QR revoked**, **Disabled on network**). Today rows are root/card rows; target child rows inherit root control without extra keys. Technical fields in collapsed **Details**. See [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md). |
| **Scan page → Human trust** | **Scanned root card’s** label (not yours). Child objects may show the root relationship, but human trust stays on the root. Steward = green shield. |
| **Scan page → Page chrome dot** | **Planned:** **Your device** at a glance (static brand for strangers). Spec: [`SCAN_PAGE_DEVICE_DOT.md`](SCAN_PAGE_DEVICE_DOT.md). Hero strip remains **object** state. |
| **Scan page → Vouch** | **Your** ability to sign. If keys missing: explains network vs keys; if saved Steward exists, names the card. |

---

## Vouching checklist (multi-device)

1. **Vouchee:** active root card scan link (`/c/{profile}?q={active_qr}`), not revoked QR, not your own `profile_id`. Child object scans can point back to a root, but child objects do not receive vouches.
2. **Voucher (you):** Steward or Vouched Human on the **network** (curl or `/created/` on a device with your keys).
3. **This phone/browser:** Set **Default for vouching** on your steward card in **Saved cards** (⋯ menu) so scans auto-load keys, or tap **Sign as…** on the scan page. Fallback: **Use keys** on `/wallet/` then **Return to scan to vouch** on `/created/`.
4. Submit the vouch on the vouchee’s **active** scan page.

**iPhone tip:** Open the scan in **Safari** (same browser where you saved the card). QR opens from Camera often start a new tab - that is fine if **Default for vouching** is set or you tap **Sign as…**. Keys do not sync across Chrome and Safari.

If step 3 is skipped, you will see **“keys not active on this device”** even when the network says Steward.

**Vouch-ready keys (optional):** On **Saved cards**, set **Default for vouching** (⋯ menu). Scan pages then auto-load that card’s keys in this tab. If keys are active in another tab, the scan shows a cross-tab notice with **Open that tab** or **Use keys here** (wallet/scan banner; vouch card uses **Sign as…**). Planned: page chrome dot mirrors viewer readiness — [`SCAN_PAGE_DEVICE_DOT.md`](SCAN_PAGE_DEVICE_DOT.md). See [`VOUCH_READY_KEYS_DESIGN.md`](VOUCH_READY_KEYS_DESIGN.md).

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
| Hub saved row copy | `site/js/device-hub-card-row-core.mjs`, `site/js/device-hub-ui.mjs` |
| Wallet network cache + poll | `site/js/device-wallet-network*.mjs` |
| Scan vouch explainer | `site/js/vouch-issue.mjs`, `worker/src/resolver/scan-html.ts` |

---

## Related docs

- [`VOUCH_TRUST_POSITIONING.md`](VOUCH_TRUST_POSITIONING.md) - what vouch proves, positioning, integrator policy
- [`VOUCH_THREAT_MODEL.md`](VOUCH_THREAT_MODEL.md) - adversarial catalog, gaps, operator playbook
- [`M6_VOUCHING_DESIGN.md`](M6_VOUCHING_DESIGN.md) - vouch rules, quotas, scan UX
- [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md) - wallet, Open controls, backup import
- [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) - root key, child objects, recovery posture, delegation direction
- [`HUB_CARD_ROW_UX.md`](HUB_CARD_ROW_UX.md) - saved row layout, **checked** recency vs scan policy
- [`DEVICE_OS.md`](DEVICE_OS.md) - two-layer product model
- [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md) - resolver polling vs saved-card count (must fix at ~10+)
- [`SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md`](SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md) - `hc_wallet` parse/cache growth on hub paths
