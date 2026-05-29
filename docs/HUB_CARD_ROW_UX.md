# Hub saved card row UX

**Status:** Phases 1–4 shipped (May 2026) — [`HUB_CARD_3D_AND_SHEET_GLASS.md`](HUB_CARD_3D_AND_SHEET_GLASS.md)  
**Scope:** Saved card rows in the device hub (`/`, `/wallet/`, `/created/`) - `renderSavedRows()` in `site/js/device-hub-ui.mjs`  
**Companions:** [`DEVICE_HUB_AND_LOCAL_SEARCH.md`](DEVICE_HUB_AND_LOCAL_SEARCH.md), [`KEYS_CARDS_AND_VERIFICATION.md`](KEYS_CARDS_AND_VERIFICATION.md), [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md), [`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md)

---

## Problem (May 2026)

Saved card rows accumulated overlapping UI: handle repeated in title, sub-line, and **Details**; separate **network** and **verification** pills plus a **liveliness** line; two button rows. The list read as cluttered and implied scan surveillance when copy said **seen**.

---

## Design goals

1. **One glance** - identity, trust + object type, unified network status, primary actions.
2. **Progressive depth** - keys, profile id, last saved, vouch default only in **Details** (collapsed by default).
3. **Control-first** - steward actions grouped under ⋯ **QR & lifecycle**; **Prove live** stays inline when pending (Phase 2).
4. **Semantic copy** - operational language, not cryptographic jargon ([`PRODUCT_LANGUAGE_STRATEGY.md`](PRODUCT_LANGUAGE_STRATEGY.md) § Steward hub).
5. **Policy-aligned** - never imply operator scan logging or stranger scan trails.
6. **Budget-aligned** - **Reachable · checked … ago** reflects the last **device-initiated** status fetch (hub expand, **Check network**, or cache TTL), not continuous operator monitoring. Multi-card auto-polling is opt-in (**Watch for live proof**); see [`DEVICE_OS_REQUEST_BUDGET.md`](DEVICE_OS_REQUEST_BUDGET.md).

---

## Collapsed row anatomy (Phases 1–3 shipped)

```text
┌─────────────────────────────────────────────────┐
│ [trust icon]  Title (@handle or custom label)  [⋯]
│               Object type · Verification label
│               ● Reachable · checked 2m ago      ← single status line
│  [ Prove live ]  (inline when inbox pending)
│  [ Open controls ]  [ Open scan ↗ ]
└─────────────────────────────────────────────────┘
```

| Zone | Content | Notes |
|------|---------|--------|
| **Title** | Custom `label` if distinct from `handle`; else `@handle` | No duplicate handle on the default row |
| **Identity line** | `{object type} · {Registered \| Steward \| …}` | Trust paired with type, not with network |
| **Status line** | One phrase: reachability + recency | Replaces separate network pill + liveliness line |
| **Details** | Last saved, key preview, `@handle`, profile id snippet, default-for-vouching | `<details>` summary **Details** (not **More**) |
| **Actions** | Open controls, Open scan, ⋯ menu (QR & lifecycle), inline **Prove live** when pending | Steward pills moved to ⋯ (Phase 2) |

---

## Unified status line (copy)

Built by `hubCardStatusLine()` in `site/js/device-hub-card-row-core.mjs`. Uses resolver `scan.kind` / `card.status` the same way as `networkStatusChip()`, but **does not** show **Live State Active** on the row (that label was redundant with reachability).

| Condition | Status line (examples) |
|-----------|-------------------------|
| `scan.kind === active` (or network active) | `Reachable · checked 2m ago` |
| `scan.kind === qr_revoked` | `QR revoked · checked 1m ago` |
| `scan.kind === card_revoked` | `Disabled on network · checked 1m ago` |
| Poll in flight / unknown | `Checking network…` |
| Fetch error / offline | `Can't reach resolver` (optional `· checked …` if a prior check exists) |
| No successful check yet | `Not checked yet` (no recency suffix) |

Recency suffix uses **checked**, not **seen** - see [Recency wording and data policy](#recency-wording-and-data-policy).

---

## Recency wording and data policy

### What “checked Xm ago” means

| User might think | What it actually is |
|------------------|---------------------|
| Someone scanned my QR 1m ago | **This browser** last successfully called `GET …/cards/{profile_id}/status?q=…` for that saved card |
| Operator scan log | **No** - reference network v1 does not access-log scan routes ([`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md), [`V1_DECISION_LOCK.md`](V1_DECISION_LOCK.md)) |
| Synced across devices | **No** - timestamp lives in session `hc_wallet_network_cache` (~5 min TTL) |

Implementation: `getCachedNetworkSeenAt()` → `entry.at` set in `refreshWalletNetworkStatuses()` when this device stores a poll result (`site/js/device-wallet-network.mjs`).

### What would violate policy

| Feature | Risk |
|---------|------|
| **Last scanned** from resolver/D1 | Implies operator per-scan storage without governance |
| Scan counts / unique scanners | Scan analytics |
| UI copy **Last scan 1m ago** | False claim even if storage were innocent |
| **Seen 1m ago** on saved rows | Misleading; reads as stranger scan activity |

### Separate from device activity

`hc_device_activity` logs **your** actions on this browser (Open controls, save, pin, …). **Checked** recency is **network poll** time only. Do not merge the two in copy or UI.

### Storage name note

`hc_wallet_last_seen_network` is a **device alert baseline** (card-disabled-since-visit), not “last time someone scanned.” Do not rename the key without a migration plan; document intent in [`DEVICE_OS.md`](DEVICE_OS.md) hub checklist.

---

## Phased delivery

### Phase 1 - Information consolidation (shipped)

- [x] `hubCardStatusLine()` - one status line; remove header network + verification pills and `.hub-card-live`.
- [x] `hubCardTitle()` - dedupe handle vs label.
- [x] Identity line - object type · verification.
- [x] `hubCardSubHtml()` - **Details** only; handle only inside expanded body when needed.
- [x] Recency copy - **checked** not **seen**.
- [x] Docs - this file, hub doc, keys doc, data policy cross-link.
- [x] Tests - `device-hub-card-row-core` unit tests; update wallet e2e expectations.

### Phase 2 - Action slimming (shipped)

- [x] `partitionHubCardControls()` - **Prove live** inline; **Update status** / **Revoke QR** / **New QR** (and revoke-state) under ⋯ **QR & lifecycle**.
- [x] Collapsed row shows **Open controls** + **Open scan** (+ inline prove live when pending).

### Phase 3 - Visual polish (shipped)

- [x] Typography ladder - title 15px / identity 12px / status 12px / Details summary 11px (`--hub-row-*` on `.hub-card-item`, `--hub-card-*` in `device-shell.css`).
- [x] Status dot - 7px with soft ring on ok/warn; flat dot for muted/offline.
- [x] Tighter row rhythm - 5px card gap, compact head/controls/actions padding; 34px trust icon.
- [x] Shell + dark theme - label tokens in `device-shell.css`; identity/status/menu in `theme-dark.css`.

### Phase 4 - Tier-3 depth + sheet glass (shipped)

- [x] **Step 1:** `.hub-card-item` uses emphasis-card tier-3 tokens (hairline, `--hc-emphasis-card-shadow`, info glass fill, backdrop); opaque fallback per alignment doc.
- [x] **Step 2:** Hub bottom sheet medium frosted transparency (light + dark).
- [x] **Step 3:** Cache bust shell pages.
- [x] **Step 4:** Vitest regression + wallet e2e (see [`HUB_CARD_3D_AND_SHEET_GLASS.md`](HUB_CARD_3D_AND_SHEET_GLASS.md) § QA).

### Phase 5 - Action hierarchy (shipped)

- [x] **Prove live** stays brand red (`.hub-card-control--primary`) when inbox pending.
- [x] **Open controls** (`.hub-use-keys`) uses popover control surface — not brand red. See [`HUB_SHEET_VISUAL_REFRESH.md`](HUB_SHEET_VISUAL_REFRESH.md) § Red budget.
- [x] **Open scan** remains tertiary / neutral beside Open controls.

### Phase 6 - Nested child object rows (first slice shipped)

Child objects under a root should **not** become separate `hc_wallet` entries. Under each root row:

- [x] **Title** = `public_label` (object name), not `@handle`
- [x] **Identity** = `{Status plate | Lost item | …} · under @handle` — no Steward/VH shield on child
- [x] **Status** = object state + steward publish recency — never **scanned** / **seen**
- [x] **Actions** = update state, open object scan — **Open controls** on parent only
- [x] **Visual** = indent or nested list; reuse left accent tones (`status-plate`, `lost-item`)

Spec: [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) § My cards and hub presentation. Depends on resolver child list + reconcile (same doc § Implementation sequence steps 12–13). Helpers: `site/js/hub-child-object-row-core.mjs`; render: `site/js/device-hub-ui.mjs`.

---

## Regression

When touching row markup or status copy:

```bash
npm run worker:test:device
npm run e2e -- e2e/device-os-wallet.spec.ts
```

Manual: [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) - revoked since visit, QR-only revoke, multi-card wallet.

---

## Implementation map

| Piece | Location |
|-------|----------|
| Row copy + status line | `site/js/device-hub-card-row-core.mjs` |
| Nested child row copy | `site/js/hub-child-object-row-core.mjs` |
| Control list + inline/menu split | `site/js/device-hub-controls-core.mjs` |
| DOM render + poll apply | `site/js/device-hub-ui.mjs` |
| Network cache + `entry.at` | `site/js/device-wallet-network.mjs` |
| Chip labels (hub status line only; not row pills) | `site/js/device-wallet-network-core.mjs` - `networkStatusChip()` still used elsewhere |
| Row CSS + tokens | `site/styles.css`, `site/css/device-shell.css`, `site/css/theme-dark.css` |
