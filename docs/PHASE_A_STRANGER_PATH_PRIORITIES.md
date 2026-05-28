# Phase A  -  Harden the stranger path (post-M5 priorities)

**Status:** Active product direction  
**Purpose:** Record what to build **after** the generic create → scan → revoke loop is proven, without expanding the design-space catalog faster than real deployments.

**Prerequisite:** `docs/M5_STRANGER_TEST_RUNBOOK.md`  -  three strangers complete the loop unassisted (**passed 2026-05-27**).

**Primary GTM after M5:** **Merch funnel Tier 1** (scan wear → create → `/shop/customize/` → unique QR on Printify product) — [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) · [`MERCH_HEADLESS_COMMERCE.md`](MERCH_HEADLESS_COMMERCE.md). Status plate / lost-item / organizer pilots below are **optional vertical hardening**, not the main launch wedge.

**Canonical loop (unchanged):** Create card → print QR → scan live status → revoke → re-scan revoked state. See `docs/M3_M4_EXECUTION_PLAN.md`.

---

## Operating rule

**One vertical, end-to-end, on real objects**  -  not more hub pages.

The site’s **What can a QR do?** walkthroughs (`site/what-can-a-qr-do/`) are **research and narrative**. They do not replace a single template strangers can print and use tomorrow on a door, sticker, or card.

Defer until a vertical pilot succeeds:

- Additional idea walkthrough pages without product support
- Gamified restore logic (e.g. “3 scans to un-revoke”) on the resolver
- NFC / mesh / Humanity node hardware
- Full maintenance CMMS or marketplace features
- **Full L3 orchestration** beyond opt-in explain (city-scale agents, cross-object AI) — see [`AI_FEATURE_DEVELOPMENT.md`](AI_FEATURE_DEVELOPMENT.md)

**Parallel (shipped):** L3 P1 opt-in scan explainer on signed `public_snapshot` — does not block Phase A pilots; strangers must tap to request.

---

## Priority verticals (highest ROI)

| Priority | Vertical | Why |
|----------|----------|-----|
| **0 (GTM)** | **Tier 1 merch funnel** (live wear → customize → order) | Post-M5 primary wedge; walking ad with **unique** QR per garment. [`MERCH_FUNNEL_MVP.md`](MERCH_FUNNEL_MVP.md) |
| **1** | **Status plate** (“open / closed / until …”) | Optional field pilot. Matches landing demo; not required before merch launch. |
| **2** | **Lost-item relay** | Emotional and clear: return contact **without** printing a phone number; revoke when recovered or abused. Site research: `site/what-can-a-qr-do/lost-item-relay/`. |
| **3** | **Organizer-signed revoke** | Unlocks civic flyers, vendor placards, market passes  -  anything where a **trusted issuer** must update or kill a printed QR. Requires signed updates/revokes, not open crowd vouch. Site research: `site/what-can-a-qr-do/civic-protest-infrastructure/`, `site/what-can-a-qr-do/local-economies/`. |

Pick **one** optional vertical for field hardening (5–10 printed QRs). **Do not** block Tier 1 merch launch on status plate pilot success.

**Current build focus:** **Manifesto / status line updates**  -  `docs/MANIFESTO_STATUS_UPDATE.md` (same QR, live public copy). Enables status plate (#1) and lost-item relay (#2) without reprinting.

Organizer revoke shipped: `docs/ORGANIZER_SIGNED_REVOKE_PILOT.md`.

---

## Concrete product work (same primitive, sharper job)

These tighten Phase A for the chosen vertical without a new “product tab”:

| Area | Direction |
|------|-----------|
| **Create / scan copy** | Name the **object** (“Studio door”, “Keys tag”) on scan UI where helpful; keep “what this does not prove” visible. **Shipped:** scanner safety chips (`Object · …` / `Item · …`) on `/c/…` per `docs/SCANNER_EXPERIENCE.md` Phase B. |
| **Scan page** | Active vs revoked in &lt;30s; **Live check** hero (manifesto/plate as H1, one status, one limit) per [`docs/SCANNER_EXPERIENCE.md`](SCANNER_EXPERIENCE.md) and [`docs/M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md) UI refresh phases. |
| **`/created/`** | Recovery gate stays; **Update status** unlocks after first in-session revoke (`created-first-revoke-gate.mjs`). |
| **Print path** | Download QR PNG + phone print steps on `/created/` (shipped); validate strangers actually print before testing revoke in the wild. |
| **Landing** | Physical software objects framing + demo revoke animation are **marketing only**  -  not resolver behavior. |

---

## Narrative stack (copy, not new surfaces)

Keep positioning layered; do not collapse into a single slogan:

| Layer | Message | Where |
|-------|---------|--------|
| Hook | Live state on real objects | Landing hero |
| Mechanism | Print once · change or revoke later | Landing hero |
| Category | Physical software objects | Landing framing + `site/what-can-a-qr-do/physical-software-objects/` |
| Catalog | What else can a QR do? | `site/what-can-a-qr-do.html` |

---

## Success signal for a vertical pilot

- Strangers answer **proves / does not prove** correctly without coaching (`docs/M5_STRANGER_TEST_RUNBOOK.md` scorecard).
- At least one pilot user **prints**, **scans from a second device**, and **revokes** within a week without founder in the room.
- Confusion notes drive **copy or one template field**, not three new idea pages.

---

## Related

| Doc | Use |
|-----|-----|
| `docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md` | Positioning synthesis + messaging matrix |
| `docs/STATUS_PLATE_PILOT.md` | Vertical #1 pilot |
| `docs/LOST_ITEM_RELAY_PILOT.md` | Vertical #2 pilot |
| `docs/ORGANIZER_SIGNED_REVOKE_PILOT.md` | Vertical #3 pilot (current) |
| `docs/M5_STRANGER_TEST_RUNBOOK.md` | Phase A exit gate |
| `docs/M5_5_OWNER_KEY_PORTABILITY.md` | If strangers fail “revoke later” |
| `docs/V1_USE_CASES.md` | Full use-case catalog (phased) |
| `docs/V1_0_ARCHITECTURE_ROADMAP.md` | Build order M0–M10 |
| `docs/REVOKE_AND_LIFECYCLE_V1.md` | Revoke semantics |
