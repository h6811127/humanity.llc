# Research directions / infrastructure layers

**Status:** Research only  -  not on the Phase A shipping path (`create → scan → revoke`).

**Public summary:** [research-directions.html](https://humanity.llc/research-directions.html)

## Principle

One primitive: a physical thing points at **current** signed status on the resolver. Carrier layers (QR, NFC, mesh, node uplink) are different ways to reach the same URL and semantics - not different trust models.

## Live today

| Layer | Status |
|-------|--------|
| QR → resolver | **Live** (any camera, no app) |

## Carrier layers (research)

### NFC

Tap opens the same `/c/{profile_id}?q=…` URL as QR. No camera framing. Target: wristbands, badges, door tags, node front plate.

### NFC + Bluetooth mesh

One tap wakes a tag; phones and wearables relay signed status locally. Resolver remains source of truth when the network syncs. Reduces resolver fan-out in dense crowds; does not replace revocation on the server.

## The Humanity node (vision)

Concept spec sheet (public): `site/assets/humanity-node-001.png` on [research-directions.html](https://humanity.llc/research-directions.html)  -  150×150×55 mm solar node, QR + NFC, Pi 5 / NVMe / LiFePO₄ stack, mesh + LTE, live signed state UI. **Not a shipping unit.**

The **node** is the ultimate object: links, tap, relay, and edge compute in one installable artifact.

| Component | Role |
|-----------|------|
| **Raspberry Pi 5** | Edge compute: resolver client, mesh bridge, optional local cache of public status |
| **NFC** | Tap path to same card URL |
| **QR + engraved URL** | Camera path; laser-etched link on metal housing |
| **Solar + battery** | Outdoor / off-grid power; duty cycle TBD |
| **Metal enclosure** | Durable mountable object, not consumable sticker |

### Connectivity stack (later)

- **Cellular LTE**  -  resolver sync where Wi‑Fi does not reach
- **Satellite backhaul (e.g. Starlink)**  -  research only; no hardware or cost model chosen
- **Bluetooth mesh**  -  node as relay between NFC tap and nearby phones

### Open questions

- Firmware update and operator model (who runs the node?)
- Key custody on device  -  node must **not** become a second signing root without explicit design
- Whether the node only caches **public** resolver state or ever participates in owner actions
- Supply chain, engraving, and founding-drop relationship to merch stickers

## Landing page

NFC/mesh diagrams were removed from `site/index.html` (May 2026) and live on the research page only, with a list-row link under “Same idea elsewhere.”

## Related backlog

- `docs/M3_M4_EXECUTION_PLAN.md`  -  NFC/mesh called out as post–vertical-slice
- `docs/V1_USE_CASES.md`  -  full use-case catalog (not on homepage scroll)
