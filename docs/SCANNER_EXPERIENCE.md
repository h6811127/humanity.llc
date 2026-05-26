# Scanner experience

**Status:** Product + UX contract (resolver and recognition)  
**Audience:** Design, product, and implementation for anything a stranger sees after scanning a Humanity QR  
**Related:** [`docs/M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md) (Worker HTML layout), [`docs/QR_BRANDING.md`](QR_BRANDING.md) (optical QR modules), [`docs/V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) (what scans prove), [`docs/VISUAL_IDENTITY_PRINCIPLES.md`](VISUAL_IDENTITY_PRINCIPLES.md) (tone and hierarchy), [`docs/M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md) (validation)

---

## Purpose

Humanity must **not** normalize “scan any QR in the street.” The network should feel like **objects from a known physical software network**, not generic internet stickers.

The scanner experience has three reinforcing layers:

| Layer | Question for the scanner | Primary doc |
|-------|--------------------------|-------------|
| **Physical** | “Is this object from Humanity?” (before scan) | This doc §Physical; print specs in Technical Standards §8 |
| **Optical** | “Is this QR officially encoded?” (at scan time) | [`docs/QR_BRANDING.md`](QR_BRANDING.md) + §Optical below |
| **Resolver** | “What is true *right now*, and what does it **not** prove?” (after load) | This doc §Resolver; impl in [`docs/M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md) |

**Product sentence (scanner-facing):**

> If it looks like a Humanity object and opens on `humanity.llc`, you get a live trust check—not a hidden redirect.

---

## Cultural positioning

| Generic QR habit | Humanity habit |
|------------------|----------------|
| Scan anything that looks interesting | Scan **network objects you expect** (your card, someone showing you theirs, labeled artifacts) |
| Trust the square | Trust the **resolver moment** on a known host |
| URL in the code | **Live object** whose status can change or be revoked |

**Public copy (use on scan page, create flow, and artifact education):**

- *“Only treat pink Humanity codes on `humanity.llc` as Humanity objects. Street QRs can copy colors; always read the page.”*
- *“This scan checks live status. It does not prove the person holding the sticker owns the card.”* (Level 0 — canonical in trust model.)

Movement/marketing surfaces may be louder; the **scan page stays calm, precise, and utility-first** ([`docs/VISUAL_IDENTITY_PRINCIPLES.md`](VISUAL_IDENTITY_PRINCIPLES.md)).

---

## What a scanner must understand in under five seconds

Aligned with [`docs/V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md):

1. Card / QR status: active, revoked, suspended, expired, or unknown.
2. Human trust evidence (e.g. vouched) when present—without overclaiming “verified identity.”
3. Whether live control was proven recently (when relevant).
4. That a **printed QR is a pointer**, not proof the holder owns the card.
5. Where to read limits (“what this does not prove”).

---

## Physical layer (recognition before scan)

Stickers and cards are part of the protocol aesthetic (like NFC tap marks or payment QR frames in other markets).

### Shipped constraints (v1)

- Do **not** print mutable trust claims (e.g. “Verified Human”) on artifacts—state belongs on the resolver ([`docs/V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md) Level 0).
- Item-scoped `qr_id` per personalized print; revocation must be unmistakable on re-scan ([`docs/V1_ADVERSARIAL_REVIEW.md`](V1_ADVERSARIAL_REVIEW.md)).

### Target physical system (print + merch)

| Placement | Element |
|-----------|---------|
| QR zone | White inset, brand border (`#DB1B43`), fixed aspect (specify mm in print template) |
| Below QR | `humanity.llc` in consistent type scale |
| Optional band | `LIVE OBJECT` (teaches that status is online, not frozen on the sticker) |
| Corner / edge | Tiny Humanity mark (same family as site header) |
| Optional | Small “scan” wordmark—only if it does not imply government ID |

**Recognition test:** At arm’s length, testers identify Humanity **border + white island + pink code** before reading text—same class of recognition as Venmo/Cash App/Spotify codes.

---

## Optical layer (branded QR + signed frame)

### Shipped today

See [`docs/QR_BRANDING.md`](QR_BRANDING.md):

- Modules `#db1b43` on white, error correction **Q**
- Vector center rings (~48% opacity, ~22% width)
- Payload **only** `https://humanity.llc/c/{profile_id}?q={qr_id}` (or approved dev origin in local test)
- Single renderer path: `site/js/qr-branding.mjs` → `qr-render.mjs` (browser) and `worker/src/resolver/scan-qr.ts` (Worker)

### Signed visual frame (shipped)

Third parties must not ship lookalike “Humanity pink” QRs that encode non-Humanity URLs. Legitimacy cues ([`docs/QR_BRANDING.md`](QR_BRANDING.md)):

| Element | Role |
|---------|------|
| Standard outer frame | Thin brand border + rounded corners (`renderHumanityQrFrameSvg`) |
| Footer microtype | Always `humanity.llc` under the code |
| `LIVE OBJECT` band | Behavioral cue: status is live on the network |
| Network glyph | Concentric circles in top-left frame corner (not in data modules) |
| Closed renderer | `renderHumanityQrFrameMarkup` (Worker), `renderHumanityQrFrameToCanvas` (browser) |

**Engineering rule:** Do not fork frame styling in product pages; tune `qrFrameMetrics()` in `qr-branding.mjs` only.

**Optional later:** Short issuer code under QR derived from `profile_id` + `qr_id` for humans to compare with resolver JSON; print QA watermark for fulfillment pipeline.

---

## Resolver layer (scan page)

The scan page is **live Worker HTML** at `GET /c/{profile_id}?q={qr_id}`—not the static Pages site. Implementation layout: [`docs/M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md).

Deploy check: response header `X-HC-Scan-UI` (e.g. `pass-v5`).

### Information architecture (target order)

Optimize for **strangers scanning in the wild**, then depth for the curious.

1. **Scanner safety header** (above the pass card) — *planned; not all rows shipped*
2. **Pass card (front)** — handle, manifesto, trust pills, this object’s QR, bearer foot
3. **Pass card (back)** — short limits only (no long copy; clips)
4. **Grouped lists** — Card status, Human trust, This QR, Live control, Limitations
5. **Limits `<details>`** — full “does not prove” copy at bottom

**Hierarchy** (from visual identity): card status and handle first; QR is a doorway, current status is the point—do not let the QR dominate trust interpretation.

### Scanner safety header (spec)

Aggressive, calm trust chrome—**safer than opening a random URL**.

| Row | Copy / behavior | Notes |
|-----|-----------------|-------|
| Network badge | “Humanity object” + handle | Not “verified identity” |
| Status strip | Large: Active / Revoked / Expired / Suspended / Unknown | Color + icon + label; never color alone |
| Fact chips | Steward registered · Revocable · Credential issued *date* | Use `issued_at` from credential; no server “scan count” by default |
| First open on device | “First time you opened this object on this device” vs “You opened this before on this device” | `sessionStorage` key `hc_first_scan_{profile_id}_{qr_id}` — no scan analytics |
| Resolver check | “Signed object verified by resolver” when signatures validate | Wording: **object** verified, not “person verified” |
| Subtle open animation | One brand pulse on border, then settle to status color | Signals live check completed—not decorative loop |
| Offline | “Offline — status may be stale; refresh when connected.” | Client banner when `navigator.onLine === false` ([`docs/FLOW_2_QR_SCAN_REPAIR_SPEC.md`](FLOW_2_QR_SCAN_REPAIR_SPEC.md) slice 3) |

**Shipped today (M3):** bearer line above card; grouped trust blocks; limits in `scan-limits-settings`; live control interactive block; governance links on suspension.

### Trust blocks (alignment)

| Block | Scanner takeaway |
|-------|------------------|
| Card status | Is this card active, revoked, or suspended? |
| Human trust | Social evidence (vouches)—**Vouched Human**, not “Verified Human” in UI unless governance approves |
| This QR | Is **this** credential active/revoked/expired? Item-scoped revocation copy for print |
| Live control | Recent key-control evidence only—not legal ID ([`docs/M7_LIVE_CONTROL_ALPHA.md`](M7_LIVE_CONTROL_ALPHA.md)) |
| Limitations | Not government ID; no default scan analytics; data policy |

**Required Level 0 line** (all scan HTML):

> This QR resolves to a Humanity Card. It does not prove the person holding this item is the card owner.

### Machine-readable twin

Scanners (and future verifier apps) should not scrape HTML:

```bash
curl -sS "https://humanity.llc/.well-known/hc/v1/cards/{profile_id}/status?q={qr_id}"
```

Same trust state as HTML (`buildScanViewModel`). See [`docs/M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md) § Machine-readable status.

### Live control (scanner role)

Primary CTA for strangers: **Ask owner to prove control**. Scanner-facing copy must stay separate from owner prove flow. See M7 doc for challenge/session rules.

---

## External links and redirects (policy)

**Current safety win:** v1 scan QRs encode only `humanity.llc/c/…`—camera apps land on the resolver; there is no off-domain payload in the code.

**Threat:** Future “owner link” features or fake pink QRs that imply Humanity but open elsewhere.

### Rules (before any link-out ships)

| Rule | Requirement |
|------|-------------|
| No hidden redirect | `GET /c/…` MUST NOT `302` to external origins for user-facing flows |
| Same-origin actions | Owner actions use Humanity routes, not bare third-party URLs in QR |
| External open | Only via interstitial route, e.g. `GET /c/…/out?…` with signed, short-lived token |
| Interstitial content | Domain preview, steward handle, QR/card status, explicit **Continue** (no auto-continue) |
| Allowlist / warnings | Known domains vs elevated warning for others |
| Integrator API | Any `external_actions` in status JSON point only to interstitial URLs |

**Interstitial template:**

> This object wants to open **{domain}**  
> Steward: @{handle} · QR {status} · Not proof of identity  
> [Stay on Humanity] [Continue to {domain}]

Without interstitials, do not ship features that send scanners off-domain from trust UI.

---

## Host and payload lock

Scanners should learn:

- **Legitimate Humanity scan URLs** use host `humanity.llc` (or documented staging) and path `/c/{profile_id}?q={qr_id}`.
- Visible monospace URL under the on-card QR confirms payload ([`docs/M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md)).

**Forbidden in official generators:** homepage-only QR, marketing placeholder PNG as QR, black modules, non-Q correction with center logo, arbitrary external URLs in encoded string.

---

## Visual anti-patterns (scan surface)

From [`docs/VISUAL_IDENTITY_PRINCIPLES.md`](VISUAL_IDENTITY_PRINCIPLES.md)—do not regress:

- Passport / government ID styling
- Heavy seals or “official” state symbology
- Crypto-neon aesthetic on scan page
- Trust scores, leaderboards, follower counts
- Red alarm overload for normal limits
- Hidden fine print for “does not prove”
- Implying sticker possession = identity or ownership

---

## Roadmap

| Phase | Deliverable | Reduces |
|-------|-------------|---------|
| **A** | `renderHumanityQrFrame()` + footer + `LIVE OBJECT` + update [`docs/QR_BRANDING.md`](QR_BRANDING.md) | Lookalike QRs — **shipped** |
| **B** | Scanner safety header, session “first seen,” status strip reorder | Over-trust, unclear revoke — **next** |
| **C** | Host-lock lint in tests + generator docs | Malicious payloads |
| **D** | Print sticker SVG/PDF template (physical marks) | Physical impersonation |
| **E** | `/c/…/out` interstitial + redirect ban in Worker | Weaponized branding |
| **F** | Short credential code on print + optional verifier app | Supply-chain / advanced fakes |

Phases **A–C** are the immediate win; **E** is mandatory before any external destination feature.

---

## Validation

### Stranger test (exit gate)

[`docs/M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md): three outsiders explain proves / does-not-prove in one sentence; at least one revokes QR and re-scans.

**Pass signals:** “Live status on humanity.llc.” **Fail signals:** “It verified they’re human.” “Sticker proves identity.”

### Recognition test (when frame ships)

Show mixed QRs at phone distance; target &lt;1s Humanity identification without reading text.

### Automated checks

```bash
npm run worker:test -- worker/tests/scan-qr-branding.test.ts worker/tests/scan.test.ts
```

---

## Implementation map

| Concern | Path |
|---------|------|
| Scan HTML | `worker/src/resolver/scan-html.ts` |
| View model | `worker/src/resolver/scan-state.ts` |
| Status JSON | `worker/src/resolver/scan-status.ts` |
| Branded QR (resolver) | `worker/src/resolver/scan-qr.ts` |
| Branded QR (browser) | `site/js/qr-render.mjs`, `site/js/qr-branding.mjs` |
| Scan styles | `site/scan-pass.css` → bundle via `npm run worker:bundle-scan` |
| Trust copy | `worker/src/resolver/trust-copy.ts` (bearer line) |

Full layout checklist: [`docs/M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md).

---

## Long-term: cryptographic authenticity

Sequence (do not block A–C on this):

1. Visual consistency + resolver behavior (now)
2. Machine-readable status + signature verification in JSON (partially shipped)
3. Optional native verifier / wallet reads status + signatures
4. Federation: network badge by operator ([`docs/PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md`](PROTOCOL_FEDERATION_AND_LAUNCH_STRATEGY.md))

User-facing label preference: explain **how** state was earned; avoid “Verified Human” unless governance approves after comprehension testing.
