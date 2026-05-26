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

Aligned with [`docs/V1_PRODUCT_TRUST_MODEL.md`](V1_PRODUCT_TRUST_MODEL.md). Order matters for **strangers** scanning an unfamiliar artifact (especially a **live object** sticker):

| Priority | Question | Wrong takeaway to prevent |
|----------|----------|---------------------------|
| 1 | **Is this a real Humanity check right now?** | “Cool pink QR” with no host trust |
| 2 | **What is this object saying *at this moment*?** | Steward `@handle` treated as the headline |
| 3 | **Is it still valid or dead?** | Multiple conflicting “Active” labels |
| 4 | **What does this *not* prove?** | Limits buried under chips and fact grids |
| 5 | *(optional)* Who operates it / can I go deeper? | Handle, issued date, credential code as hero content |

**Personal card scans** still surface handle and human trust (vouch, live control) prominently once the five-second gate is clear. **Live object** and **status plate** scans should put the **object message** (manifesto or plate lines) ahead of the steward handle—see § Scan type templates.

Full trust-model checklist (depth for the curious):

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
| QR zone | White inset, brand border (`#DB1B43`), **50.8 mm** trim (2 in) — `site/js/qr-print-sticker.mjs` |
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
| Brand mark | Soft transparent brand-red dot in top-left frame margin (not on data modules) |
| Closed renderer | `renderHumanityQrFrameMarkup` (Worker), `renderHumanityQrFrameToCanvas` (browser) |

**Engineering rule:** Do not fork frame styling in product pages; tune `qrFrameMetrics()` in `qr-branding.mjs` only.

**Shipped (Phase F):** Short credential code (`HC-XXXX-XXXX`) under on-page QR and on print stickers; same value in `scan.qr.credential_code` on status JSON. Derived in `site/js/qr-credential-code.mjs` (not secret).

**Shipped (Phase G):** Print QA watermark for fulfillment proofs — diagonal `HUMANITY PRINT PROOF` / `DO NOT SHIP` overlay via `site/js/qr-print-qa-watermark.mjs`; `renderPrintStickerSvg(..., { qaWatermark: true })` or Worker `renderPrintProofStickerFromScanUrl`. Customer DIY print sheets omit the watermark; operator proof exports include it.

---

## Resolver layer (scan page)

The scan page is **live Worker HTML** at `GET /c/{profile_id}?q={qr_id}`—not the static Pages site. Implementation layout: [`docs/M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md).

Deploy check: response header `X-HC-Scan-UI` (e.g. `pass-v21` for Live check hero).

**Design reference (target density and hierarchy):** `assets/Nerd Mobile Post Scan Render.png` — single hero, one status bar, proof/limit modules below, QR secondary.

### Product principle (resolver UI)

**Subtract and reorder; do not add more chrome.** The most important first-scan moment—especially for a **live object** sticker—is:

> **Trusted host + live status + the object’s message + one honest limit.**

Everything else is credibility garnish for the curious minority. Emotional target: *competent and unusual*, not marketing-loud ([`docs/VISUAL_IDENTITY_PRINCIPLES.md`](VISUAL_IDENTITY_PRINCIPLES.md)).

### Information architecture

Optimize for **strangers scanning in the wild**, then depth for the curious.

#### Shipped today (`pass-v21` — Phase 1)

Single **Live check** hero (`renderScanHeroSection` in `scan-html.ts`) plus grouped lists and limits `<details>`. Phase 1 removed the dual-card stack, “Network status” kicker, duplicate ACTIVE badge, “This QR is active” eyebrow, and facts-grid status/limits rows.

#### Target order (Phases 2–3)

Merge layers 1–2 into one **Live check** hero for active scans, then progressive disclosure:

| Zone | Content | Notes |
|------|---------|--------|
| **A. Page chrome** | **Status dot only** (link home) | No frosted top bar; no `humanity.llc` wordmark above the card (`pass-v26`) |
| **B. Live check hero** | Single status + object message (H1) + one limit line + resolver verified line | Replaces separate safety header + status panel for typical active scans |
| **C. Steward strip** | `Controlled by @handle` · optional expiry | One muted line |
| **D. What this proves** | Up to three bullets (live, signed, revocable) | Only signals that are true for this scan |
| **E. What this does not prove** | Warm limit module + link to policy | Match Nerd mock; canonical Level 0 copy |
| **F. This QR** | Small QR, credential code, copy link | Collapsible on mobile; subordinate to status |
| **G. Trust groups** | Card / Human / This QR / Live control | Hide or collapse empty sections |
| **H. Footer** | Trust model, no analytics | Quiet |

**Hierarchy** (from visual identity): **current status and object message first**; steward handle and human trust next for personal cards; QR is a doorway, not the trust signal—do not let the on-page QR dominate interpretation.

Pass card (flip) markup remains in `scan-html.ts` for reference only; target shipped HTML is a **flat hero + modules** ([`docs/M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md)).

### First-scan hero (“Live check”)

The hero answers four questions in one calm block (ASCII layout is illustrative):

```text
┌─────────────────────────────────────┐
│  ● humanity.llc          [Active]   │  host + single status (color + word)
│                                     │
│  {object message — H1}              │  manifesto or plate headline
│                                     │
│  Signed & checked just now          │  resolver verified (subtle; once)
│  Does not prove who holds this      │  one Level 0 limit line, always visible
└─────────────────────────────────────┘
```

| Hero row | Copy / behavior |
|----------|-----------------|
| Host + status | `humanity.llc` + **one** status treatment (Active / Revoked / Expired / …) |
| H1 | Scan-type-specific (see § Scan type templates) |
| Resolver | “Signed object verified by resolver” when signatures validate—**object** verified, not person |
| Limit | Single canonical bearer line in hero; no duplicate “Limits” row in a fact grid |
| Motion | One brand border pulse on hero load, then settle—`prefers-reduced-motion` respected |
| First open | “First time you opened this object on this device” as **footnote**, not competing with status |
| Offline | “Offline — status may be stale; refresh when connected.” (F2-2 banner) |

Chips (revocable, issued date, steward registered) move to **Details** or steward strip—not the hero.

### Scan type templates

Branch on `parseManifestoDisplay()` (`worker/src/resolver/manifesto-display.ts`) and scan kind. Same shell; different hero emphasis:

| Scan type | H1 (primary) | Subhero / secondary |
|-----------|--------------|---------------------|
| **Live object** (general manifesto, single line or prose) | Manifesto text | `Controlled by @handle` |
| **Status plate** (`{label}\n{status line}`) | Object label (e.g. “Studio door”) | Status line (e.g. “Open until 9 PM”) |
| **Lost item relay** (`[relay] {label}\n{line}`) | Item label | Relay status line |
| **Personal card** | `@handle` | Manifesto + trust pills (vouched, live control, QR active) |
| **Failure / minimal** | Compact headline (revoked, expired, unknown) | Facts only; grouped Card status + This QR below |

Foot copy per type (examples):

- Live object: “Scan shows live object state.”
- Status plate: “Scan shows current status for this place—not who owns the door.”
- Lost item relay: “This scan does not prove who holds the item.”

### Known UX gaps (resolved pass-v21–v24)

These were tracked during the interim dual-card layout; **fixed** in the Live check hero refresh:

| Gap | Resolution |
|-----|------------|
| Duplicate status | Single `scan-safety-strip` in hero (`pass-v21`) |
| Duplicate brand | Page chrome = dot only; wordmark only in hero (`pass-v26`; was top bar + hero until `pass-v21` consolidated hero) |
| Duplicate limits | One `scan-hero-limit` + modules / settings (`pass-v21`–`pass-v23`) |
| Hierarchy inversion | Manifesto/plate H1; collapsible `scan-hero-qr-details` (`pass-v23`) |
| “Network status” kicker | Removed (`pass-v21`) |
| Compliance density | Chips in `scan-hero-details` (`pass-v21`) |
| Empty trust group shells | `pushTrustGroup` skips empty rows (`pass-v24`) |

### Scanner safety header (spec — interim + merged target)

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

**Shipped (M3 + Phase B):** scanner safety header; bearer line above status panel; grouped trust blocks; limits in `scan-limits-settings`; live control interactive block; governance links on suspension; offline banner (F2-2).

**Target:** safety header content **folds into** the Live check hero (§ First-scan hero); no second bordered card above the message.

### Visual direction (resolver)

Align with [`docs/VISUAL_IDENTITY_PRINCIPLES.md`](VISUAL_IDENTITY_PRINCIPLES.md) § Scan page visual spec:

| Topic | Direction |
|-------|-----------|
| **Spacing** | One primary card: 24–28px internal padding; 28–32px gap before secondary modules; avoid back-to-back bordered cards |
| **Typography** | H1 (message): 22–26px semibold; status: one pill or bar; meta/chips: 13–14px muted |
| **Color** | Brand red: dot, frame accent, primary CTA—not every badge; green **only** for active / verified-now |
| **QR** | Max ~88–96px beside message on wide viewports; full-width but subordinate on narrow; optional collapse behind “Show QR” |
| **Motion** | One-shot hero border pulse on load; no decorative loops |

### Trust blocks (alignment)

Below the hero, **Check at scan time** (`pass-v25`) surfaces four thick disclosure rows—each with a colored icon, title, and one-line peek (e.g. `Active`, `Registered`) before the full grouped list inside. Vouch follows when the scan is active and human trust is shown.

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

**Enforcement (Phase C):** `validateOfficialScanUrl` / `assertOfficialScanUrl` in `site/js/qr-scan-url-lock.mjs`; wired into `qr-render.mjs`, `qr-branding.mjs` (`renderHumanityQrFrameToCanvas`), `scan-qr.ts`, and `resolveScanUrl()`. Tests: `worker/tests/qr-scan-url-lock.test.ts`.

**Enforcement (Phase E):** `GET /c/{profile_id}/out?t=…` interstitial (`worker/src/resolver/scan-out.ts`); HMAC tokens in `scan-out-token.ts`; `guardScanResponse` + blocked redirect query params in `scan-redirect-guard.ts`. Continue only via `&go=1` after explicit tap. Tests: `worker/tests/scan-out.test.ts`.

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
- **Duplicate status chrome** (e.g. green Active strip + red ACTIVE badge + grid “Status: Active”)
- **QR larger than the object message** on live object scans
- **Infrastructure kickers** (“Network status”) between two trust cards on first paint

---

## Roadmap

### Recognition, safety, and print (shipped)

| Phase | Deliverable | Reduces |
|-------|-------------|---------|
| **A** | `renderHumanityQrFrame()` + footer + `LIVE OBJECT` + update [`docs/QR_BRANDING.md`](QR_BRANDING.md) | Lookalike QRs — **shipped** |
| **B** | Scanner safety header, session “first seen,” status strip reorder | Over-trust, unclear revoke — **shipped** |
| **C** | Host-lock lint in tests + generator docs | Malicious payloads — **shipped** (`site/js/qr-scan-url-lock.mjs`) |
| **D** | Print sticker SVG template (50.8 mm trim + bleed) | Physical impersonation — **shipped** (`site/js/qr-print-sticker.mjs`) |
| **E** | `/c/…/out` interstitial + redirect ban in Worker | Weaponized branding — **shipped** (`scan-out.ts`, `scan-redirect-guard.ts`) |
| **F** | Short credential code on print + status JSON | Supply-chain / advanced fakes — **shipped** (`qr-credential-code.mjs`, print sticker, scan HTML, `scan.qr.credential_code`) |

Phases **A–F** are shipped for the reference network. **E** remains mandatory before any external destination product feature ships.

### Resolver UI refresh

Implementation detail: [`docs/M3_SCAN_PAGE_UI.md`](M3_SCAN_PAGE_UI.md) § UI refresh phases. Current header: `X-HC-Scan-UI: pass-v26`.

| Phase | Deliverable | Outcome |
|-------|-------------|---------|
| **0** | Fixtures + sketches: live object demo, status plate, revoked QR; compare to Nerd mock | Align design before code |
| **1** | **Hero consolidation** for active scans: single Live check card; dedupe status/limits/brand; demote QR; CSS spacing pass | **Shipped** |
| **2** | Scan-type templates: status plate, lost item relay, personal card heroes | **Shipped** — `buildScanHeroMain()` |
| **3** | Below-fold: collapsible trust groups; “proves / does not prove” modules | **Shipped** — `renderScanTrustModules()`, `scan-trust-details` |
| **4** | M5 stranger test + live object fixture; HTML snapshot tests; `X-HC-Scan-UI` bump | **Shipped** (`pass-v23`) — automated hero template tests; M5 strangers still manual |
| **5** | Omit empty trust groups; M5 showcase seed + landing | **Shipped** (`pass-v24`) — [`docs/M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md) step 10 |
| **6** | Trust-tool rows: icon + peek summaries, “Check at scan time” section, above show-link | **Shipped** (`pass-v25`) — `scan-group-summary` in `scan-html.ts` |

---

## Validation

### Stranger test (exit gate)

[`docs/M5_STRANGER_TEST_RUNBOOK.md`](M5_STRANGER_TEST_RUNBOOK.md): three outsiders explain proves / does-not-prove in one sentence; at least one revokes QR and re-scans. Include at least one **live object** or pilot sticker scan—not only self-created cards.

### Success criteria (first scan)

A stranger scanning a **live object** demo or pilot sticker should be able to say:

| | Example good answer |
|---|---------------------|
| **Proves** | “It’s an active live object on humanity.llc—the network just checked it.” |
| **Does not prove** | “Not that the person holding it owns it or is government-verified.” |

They should **not** need to reconcile multiple “Active” labels or read a disclaimer sandwiched between two cards.

**Pass signals:** “Live status on humanity.llc.” **Fail signals:** “It verified they’re human.” “Sticker proves identity.” “Like Instagram.”

**UX yellow flags (copy or layout fix):** tester asks which “Active” is authoritative; thinks `@handle` is the object’s name when manifesto carries the message; believes the on-page QR size implies stronger proof.

### Recognition test (when frame ships)

Show mixed QRs at phone distance; target &lt;1s Humanity identification without reading text.

### Automated checks

```bash
npm run worker:test -- worker/tests/scan-qr-branding.test.ts worker/tests/scan.test.ts worker/tests/scan-safety.test.ts worker/tests/scan-m5-showcase-paths.test.ts worker/tests/site-showcase-data.test.ts worker/tests/scan-hero-snapshot.test.ts worker/tests/qr-scan-url-lock.test.ts worker/tests/qr-print-sticker.test.ts worker/tests/qr-credential-code.test.ts worker/tests/scan-out.test.ts
```

---

## Implementation map

| Concern | Path |
|---------|------|
| Scan HTML | `worker/src/resolver/scan-html.ts` |
| Scan URL host lock | `site/js/qr-scan-url-lock.mjs` |
| Print sticker template | `site/js/qr-print-sticker.mjs`, `renderPrintStickerFromScanUrl` in `scan-qr.ts` |
| Credential code + verifier | `site/js/qr-credential-code.mjs`, `/verify/` |
| External link interstitial | `worker/src/resolver/scan-out.ts`, `scan-out-token.ts`, `scan-out-html.ts` |
| Redirect ban | `worker/src/resolver/scan-redirect-guard.ts` |
| Scanner safety header | `worker/src/resolver/scan-safety.ts` |
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
