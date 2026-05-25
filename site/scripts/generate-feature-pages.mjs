/**
 * Generates /features/*.html from shared data. Run: node site/scripts/generate-feature-pages.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "features");

const ICONS = {
  status: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>`,
  key: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>`,
  ban: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h4"/><path d="M7 13h6"/><path d="m4 4 16 16"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m12.83 2.18 8 4.5a1 1 0 0 1 0 1.64l-8 4.5a1 1 0 0 1-1 0l-8-4.5a1 1 0 0 1 0-1.64l8-4.5a1 1 0 0 1 1 0Z"/><path d="m3.5 10.5 8 4.5 8-4.5"/><path d="m3.5 15.5 8 4.5 8-4.5"/></svg>`,
  qr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/></svg>`,
  people: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
  test: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77A6 6 0 0 1 21 12"/><path d="M9.3 17.7a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0L2.5 18.5A6 6 0 0 1 3 12"/></svg>`,
  device: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`,
  why: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
  design: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="6" rx="1"/><rect x="2" y="15" width="20" height="6" rx="1"/><path d="M6 6h.01"/><path d="M6 18h.01"/></svg>`,
  safety: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  limits: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  future: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="M2 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M12 18v4"/><path d="m19.07 19.07-2.83-2.83"/><path d="M18 12h4"/><path d="m19.07 4.93-2.83 2.83"/></svg>`,
};

const ASPECT_META = [
  { key: "why", title: "Why it matters", tone: "red", icon: "why" },
  { key: "design", title: "Design decisions", tone: "blue", icon: "design" },
  { key: "safety", title: "Safety · privacy · security", tone: "green", icon: "safety" },
  { key: "limits", title: "Limits", tone: "orange", icon: "limits" },
  { key: "future", title: "Future directions", tone: "purple", icon: "future" },
];

/** @type {Array<{slug:string,phase:string,title:string,icon:string,iconTone:string,lead:string,subHtml:string,badge:string,aspects:Record<string,string>}>} */
const FEATURES = [
  {
    slug: "card-creation",
    phase: "0",
    title: "Card creation & basic resolver",
    icon: "status",
    iconTone: "green",
    lead: "Sign a card in the browser. Resolve it on scan.",
    subHtml: `<span class="ship-badge ship-badge-live">Live</span> <a href="/create/">/create/</a> → Worker POST → D1 → scan at <code>/c/{profile_id}?q=…</code>`,
    badge: "live",
    aspects: {
      why: "Proves the core thesis: a printed QR is a <strong>live software endpoint</strong>, not a frozen link. No app install, no account gate for scanning — any camera can read current public state.",
      design: "Ed25519 keys generated in-browser; signed card + QR credential POSTed to <code>/.well-known/hc/v1/cards</code>. JCS canonicalization for cross-client parity. Profile and QR ids are base58 — stable in the printed URL forever; meaning changes via resolver status, not reprinting.",
      safety: "Private signing keys never leave the owner device unless the user exports an encrypted backup. Resolver verifies signatures on ingest and stores only public documents and status flags — not a people trail.",
      limits: "Keys start in <code>sessionStorage</code> (this tab only). <strong>Save on this device</strong> on <a href=\"/created/\">/created/</a> copies them to <code>localStorage</code> (<code>hc_wallet</code>) for other tabs — not automatic on create. Operator cannot reset your key. Printed URL exposes <code>profile_id</code> and <code>qr_id</code> (v1 privacy lock).",
      future: "Federated resolvers implementing the same <code>hc/v1</code> API; NFC/mesh carriers pointing at the same truth; optional multi-device sync without central key custody.",
    },
  },
  {
    slug: "encrypted-backups",
    phase: "0.5",
    title: "Encrypted key backups & recovery keys",
    icon: "key",
    iconTone: "blue",
    lead: "Survive a closed tab without giving us your keys.",
    subHtml: `<span class="ship-badge ship-badge-live">Live</span> on <a href="/created/">/created/</a>; hub import of <code>.hcbackup.json</code> on homepage`,
    badge: "live",
    aspects: {
      why: "Browser-held keys are powerful and fragile. Without backup, losing the create tab means losing revoke and live-control ability — the sticker still scans, but the owner cannot mutate it.",
      design: "Encrypted backup export uses a user-chosen passphrase (client-side crypto; logic mirrored in Worker tests). Optional recovery key pair can sign revoke and live-control responses separately from the owner key — useful for “break glass” without daily use.",
      safety: "Operator never receives plaintext private keys. Backup blobs are useless without the passphrase. Recovery key display is explicit — user must save it; we do not email or cloud-store secrets.",
      limits: "No “forgot password” recovery from humanity.llc. Weak passphrases or lost backups are owner responsibility. Recovery key compromise equals signing power for that card.",
      future: "Passkey-wrapped backups, hardware wallet integration, optional steward-assisted recovery ceremonies — always opt-in, never default key escrow.",
    },
  },
  {
    slug: "revoke",
    phase: "1",
    title: "Revoke",
    icon: "ban",
    iconTone: "red",
    lead: "Change the live answer without changing the ink.",
    subHtml: `<span class="ship-badge ship-badge-live">Live</span> owner revoke on <a href="/created/">/created/</a>; per-QR and whole-card scope`,
    badge: "live",
    aspects: {
      why: "Stolen merch batches, lost stickers, ended events, compromised contacts — physical objects need a kill switch. Revoke is the proof that deployment was not permanent.",
      design: "Owner signs a typed revocation payload with a one-time nonce; resolver verifies Ed25519 signature and updates D1 status. Same HTTPS URL returns “revoked” on next scan. <strong>Per-QR scope:</strong> revoke one wristband while sibling credentials on the card stay active (<code>print_artifact</code> scope).",
      safety: "No operator password override. Replay protection on nonces. Revocation records are auditable public mutations — not hidden admin flags.",
      limits: "Revoke is not key rotation on the sticker — the URL remains public. Does not prove who physically held the object. “Un-revoke” requires issuing new credentials, not toggling back silently.",
      future: "Time-bound credentials, scheduled auto-expire, policy templates for events and retail runs.",
    },
  },
  {
    slug: "live-control",
    phase: "2",
    title: "Live control",
    icon: "lock",
    iconTone: "red",
    lead: "Prove someone with the key can respond right now.",
    subHtml: `<span class="ship-badge ship-badge-live">Live</span> alpha — scan page challenge + owner sign on <a href="/created/">/created/</a>`,
    badge: "live",
    aspects: {
      why: "Revoke proves mutability; live control proves <strong>recent key possession</strong> in an in-person moment — separate from vouches, registration, or static “active” status.",
      design: "Short-lived challenge (~120s). Scanner polls; owner signs on a key-holding device. Visually separate block on scan — never mixed with human trust or card status. Success copy is explicit: does not prove legal identity or physical ownership. Proof does <strong>not</strong> mutate card, QR, or vouch state.",
      safety: "Inactive or revoked QRs cannot create challenges. Signed responses use replay-safe payloads. No phone number, email, or account login required.",
      limits: "Alpha: no persistent proof history, permissions, or access control. A stolen key can pass live control. Screenshot of success state is not prevented.",
      future: "Ephemeral permissions, event handoff, wearable rules, clearer expired/failed UX (M7 step 2+). Still bounded: never a legal-ID substitute.",
    },
  },
  {
    slug: "card-types",
    phase: "3",
    title: "Expanding card types",
    icon: "layers",
    iconTone: "gold",
    lead: "One primitive — many physical roles.",
    subHtml: `<span class="ship-badge ship-badge-partial">Partial</span> <a href="/create/?template=status_plate">status plate</a> template live; basic card live; lost-item relay is research`,
    badge: "partial",
    aspects: {
      why: "The product is not “a membership card.” The same signed object model powers a studio door plate, a festival wristband, a keys sticker, and a mutual-aid flyer — each with different scan copy and credential scope.",
      design: "<strong>Status plate (shipped pilot)</strong> — object name + live status line for doors and booths; homepage <strong>One use</strong> section + <a href=\"/studio/\">Studio blog</a>. <strong>Basic card</strong> — handle + manifesto + verification summary. <strong>Lost item relay</strong> — design only (<a href=\"/what-can-a-qr-do/lost-item-relay/\">research</a>). <strong>Print artifact</strong> — unique <code>qr_id</code> per unit via artifact intent.",
      safety: "Relay patterns must not doxx owners. Per-item QR scope limits blast radius when one sticker is stolen. Template copy stays honest about what scan proves.",
      limits: "Lost-item relay UI and contact routing not shipped. Storefront → Printify personalization path still in build.",
      future: "Template library for organizers, commerce-backed unique QRs, city-game objects (<a href=\"/what-can-a-qr-do/physical-world-multiplayer/\">research</a>).",
    },
  },
  {
    slug: "scan-ui",
    phase: "4",
    title: "Scan trust-state UI",
    icon: "qr",
    iconTone: "red",
    lead: "Mechanism-visible answers on every scan.",
    subHtml: `<span class="ship-badge ship-badge-live">Live</span> flippable pass card + grouped trust blocks`,
    badge: "live",
    aspects: {
      why: "Trust products fail when limits are buried. Scan separates card status, human trust, QR credential scope, live control, and vouch issuance — plus one “what this does not prove” panel.",
      design: "iOS-style grouped lists; bearer warning on pass card; revoked/suspended overrides hide positive verification badges. Machine-readable twin at <code>GET …/cards/{id}/status</code> matches HTML truth.",
      safety: "<strong>No scan analytics</strong> on the public page — resolver returns object state, not who scanned. Cache-Control: no-store on live scans.",
      limits: "Scan UI is server-rendered; artifact-specific layouts are minimal in v1. Holding a printed QR still does not prove ownership.",
      future: "Activity stream merge rules on scan, offline/stale banners, role-specific templates for maintainers vs game operators.",
    },
  },
  {
    slug: "vouching",
    phase: "5",
    title: "Human verification & vouching",
    icon: "people",
    iconTone: "green",
    lead: "Social attestation without legal ID.",
    subHtml: `<span class="ship-badge ship-badge-partial">Partial</span> scan truth + vouch issuance + revoke live; abuse hooks next`,
    badge: "partial",
    aspects: {
      why: "Communities need accountable human trust without KYC or buying merch. Three eligible vouchers can upgrade a card to <strong>Vouched Human</strong> — a public label backed by signed statements, not a government check.",
      design: "Public signed vouch documents; default 280-char statement template; private notes never POSTed. Abuse controls: 3-vouch threshold, 5 active vouches/voucher/year, 90-day wait, one active vouch per pair. Scan shows count + recency, not a social graph.",
      safety: "Nonce replay protection on vouch POST. Voucher must be verified human or steward. Collusion rings mitigated by quotas and operator-only cluster hooks (planned).",
      limits: "Registration alone never displays as human verification. Bootstrap requires founding stewards or verified humans to vouch first. Revoke UI lists vouches from this browser session only.",
      future: "Vouch revocation flow, steward review queue, ceremony credentials (separate path), cross-operator federation.",
    },
  },
  {
    slug: "organizer-revoke",
    phase: "6",
    title: "Organizer revoke",
    icon: "shield",
    iconTone: "orange",
    lead: "Production kill switch without the owner’s daily key.",
    subHtml: `<span class="ship-badge ship-badge-live">Live</span> <a href="/organizer-revoke/">/organizer-revoke/</a> + optional key at create`,
    badge: "live",
    aspects: {
      why: "Merch runs, festivals, and mutual-aid batches need an organizer who can disable bad prints without every volunteer holding owner keys.",
      design: "Separate organizer key pair registered at card create; signs revocations with <code>organizer_revoked</code> reason. Distinct from owner revoke — explicit handoff UI on <a href=\"/created/\">/created/</a>.",
      safety: "Organizer key is powerful — treat like a production secret. Same signature + nonce rules as owner revoke. Not DRM: URL remains scannable; status changes to revoked.",
      limits: "No fine-grained ACL yet — organizer can revoke card or QR credentials they were registered for.",
      future: "Scoped organizer permissions, time-bound organizer keys, audit log for batch operations.",
    },
  },
  {
    slug: "public-apis",
    phase: "7",
    title: "Public APIs & machine-readable state",
    icon: "link",
    iconTone: "blue",
    lead: "Same truth for humans and integrations.",
    subHtml: `<span class="ship-badge ship-badge-live">Live</span> <code>/.well-known/hc/v1/*</code> + <code>/v1/verification/vouches</code>`,
    badge: "live",
    aspects: {
      why: "Alternate clients, CI, and reviewers can verify behavior without scraping HTML. Status JSON powers vouch eligibility checks and future storefront flows.",
      design: "Open protocol version 1.0; reference operator on Cloudflare. Writes require signed bodies; reads return public card JSON, scan status, health. CORS enabled for create flow from Pages.",
      safety: "Public endpoints expose only public state. Error codes are typed (e.g. <code>VOUCH_QUOTA_EXCEEDED</code>, <code>REPLAYED_NONCE</code>) for safe client handling.",
      limits: "No bulk graph export. Rate limits and auth for operator tools still evolving.",
      future: "Webhooks for commerce, federated read replicas, signed activity stream ingestion APIs.",
    },
  },
  {
    slug: "artifact-intent",
    phase: "8",
    title: "Artifact intent (print foundation)",
    icon: "box",
    iconTone: "pink",
    lead: "Unique QR per physical unit before checkout.",
    subHtml: `<span class="ship-badge ship-badge-partial">Partial</span> POST API live; Shopify → Printify path in build`,
    badge: "partial",
    aspects: {
      why: "Personalized stickers need a planned <code>qr_id</code> per item so one stolen unit can be revoked without killing the whole card. Bridges digital create → physical print.",
      design: "Artifact intent records planned credentials before payment; must survive Shopify checkout metadata. No private keys in intent payloads.",
      safety: "Intent is pre-commit state — operator can hold orders if metadata is missing rather than auto-printing wrong QRs.",
      limits: "End-to-end merch fulfillment not live for all users. Highest-risk handoff is checkout metadata survival (documented in flow audit).",
      future: "User-safe order timeline, Printify webhook reconciler, sample QA loop for launch templates.",
    },
  },
  {
    slug: "test-harness",
    phase: "9",
    title: "Security test harness",
    icon: "test",
    iconTone: "green",
    lead: "Documented threats backed by automated tests.",
    subHtml: `<span class="ship-badge ship-badge-live">Live</span> 94 Vitest cases across crypto, revoke, vouch, live control, scan`,
    badge: "live",
    aspects: {
      why: "Recruiters and security reviewers should see boundaries enforced in CI — not only in markdown threat models.",
      design: "Shared crypto module for Worker + browser parity tests. Fake D1 layers for resolver handlers. Scan HTML regression tests for trust copy and live-control states.",
      safety: "Covers replay nonces, signature mismatch, vouch quotas, live-control expiry, verification display overrides. Adversarial review doc in repo for open questions.",
      limits: "No production penetration test report yet. Browser E2E for create flow is manual / stranger-test driven.",
      future: "Playwright smoke path, fuzzing on canonicalization, operator abuse simulation fixtures.",
    },
  },
  {
    slug: "device-hub",
    phase: "10",
    title: "On this device hub",
    icon: "device",
    iconTone: "trust",
    lead: "Returning users manage keys, pins, and shortcuts without accounts.",
    subHtml: `<span class="ship-badge ship-badge-live">Live</span> homepage + <a href="/wallet/">/wallet/</a> + shared status header on <a href="/created/">/created/</a>`,
    badge: "live",
    aspects: {
      why: "Create puts keys in one tab; strangers need the story, returners need a control center. The hub names the two storage layers and surfaces the next action (save, notice, revoke, vouch).",
      design: "<strong>Status line</strong> — segmented counts (network, saved, pinned, notice); tap expands <strong>On this device</strong>. <strong>Saved cards</strong> — Use keys, Open scan, relabel/remove. <strong>Pinned scans</strong> — public bookmarks only (<code>hc_device_pins</code>). <strong>Search</strong> — inline in hub; filters local rows only (not resolver-wide). <strong>Backup import</strong> — decrypt <code>.hcbackup.json</code> into <code>hc_wallet</code>. <strong>Focus mode</strong> — hide intro sections; keep hub + documentation.",
      safety: "Private keys stay in browser storage; pins never hold signing material. Search is client-side over data you already saved. Labels are yours — rows show <code>@handle</code> + profile id so synced browser data cannot lie silently.",
      limits: "Not cloud sync or multi-device accounts. Browser profile sync (Safari/Chrome) may copy <code>localStorage</code> incompletely — prefer explicit save per machine. No directory search for other people’s cards.",
      future: "Optional activity log on device, clearer multi-tab key handoff, federated read — still no operator custody of owner keys.",
    },
  },
  {
    slug: "studio-blog",
    phase: "11",
    title: "Studio blog & door-plate pilot",
    icon: "book",
    iconTone: "blue",
    lead: "Building the project in public — starting with a real studio door plate.",
    subHtml: `<span class="ship-badge ship-badge-live">Live</span> <a href="/studio/">/studio/</a> + homepage One use · live showcase scan when configured`,
    badge: "live",
    aspects: {
      why: "The site should explain itself the same way the product explains physical objects: short, honest cards. The studio door plate is the first object we dogfood — hours, open/closed, and line updates without reprinting.",
      design: "<a href=\"/studio/\">Studio blog</a> — card index + posts on the plate, device hub, stack, and framing. Homepage <strong>One use · status plate</strong> lists concrete scenarios (door scan, run state, special hours, revoke visibility). <strong>Try a live scan</strong> loads from <code>site/data/showcase-status-plate.json</code> when present.",
      safety: "Blog posts are static Pages content — no extra tracking. Showcase scan is a normal public resolver object; same limits as any card (no scan analytics by default).",
      limits: "Blog is manual HTML, not a CMS feed. Only status-plate create template is fully productized; other card types remain research pages.",
      future: "More pilot objects documented as cards, RSS/Atom for posts, organizer-facing build notes tied to artifact-intent launches.",
    },
  },
];

function esc(s) {
  return s;
}

function aspectBlock(aspect, body, open) {
  return `<details class="settings-disclosure settings-disclosure-info feature-aspect"${open ? " open" : ""}>
  <summary class="settings-summary">
    <span class="list-icon list-icon-tone-${aspect.tone}" aria-hidden="true">${ICONS[aspect.icon]}</span>
    <span class="settings-summary-text">
      <span class="settings-summary-title">${aspect.title}</span>
    </span>
    <span class="list-chevron" aria-hidden="true">›</span>
  </summary>
  <div class="settings-panel settings-panel-info-body">
    <p class="settings-panel-lead">${body}</p>
  </div>
</details>`;
}

function renderFeaturePage(f, i) {
  const prev = FEATURES[i - 1];
  const next = FEATURES[i + 1];
  const aspectsHtml = ASPECT_META.map((a, j) =>
    aspectBlock(a, esc(f.aspects[a.key]), j === 0)
  ).join("\n");

  const nav = `<section class="group">
  <div class="feature-nav">
    ${
      prev
        ? `<a href="/features/${prev.slug}.html"><span class="feature-nav-label">Previous</span><span class="feature-nav-title"><span class="phase">${prev.phase}</span> ${prev.title}</span></a>`
        : `<a href="/features-available-now.html"><span class="feature-nav-label">Back</span><span class="feature-nav-title">All features</span></a>`
    }
    ${
      next
        ? `<a href="/features/${next.slug}.html"><span class="feature-nav-label">Next</span><span class="feature-nav-title"><span class="phase">${next.phase}</span> ${next.title}</span></a>`
        : ""
    }
  </div>
</section>`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${f.title} · Features · humanity.llc</title>
    <meta name="description" content="${f.lead}" />
    <meta name="theme-color" content="#ffffff" />
    <link rel="icon" href="/assets/red_qr_transparent_bg.png" type="image/png" />
    <link rel="stylesheet" href="/styles.css?v=69" />
  </head>
  <body>
    <div class="page feature-page">
      <header class="top">
        <a class="top-brand" href="/">
          <span class="pass-dot" aria-hidden="true"></span>
          <span>humanity.llc</span>
        </a>
        <a class="top-create" href="/create/">Create</a>
      </header>
      <main class="screen">
        <section class="hero">
          <p class="hero-eyebrow">Feature <span class="phase">${f.phase}</span></p>
          <h1>${f.title}</h1>
        </section>
        <div class="feature">
          <p class="feature-lead">${f.lead}</p>
          <p class="feature-sub">${f.subHtml}</p>
        </div>
        <section class="group feature-aspects">
          <h2 class="group-label">About this feature</h2>
          <div class="feature-aspect-stack">${aspectsHtml}</div>
        </section>
        ${nav}
      </main>
    </div>
  </body>
</html>`;
}

function hubRow(f) {
  const badge =
    f.badge === "partial"
      ? `<span class="ship-badge ship-badge-partial">Partial</span>`
      : `<span class="ship-badge ship-badge-live">Live</span>`;
  return `<li class="list-row list-action">
              <a href="/features/${f.slug}.html">
                <span class="list-icon list-icon-tone-${f.iconTone}" aria-hidden="true">${ICONS[f.icon]}</span>
                <span class="list-content">
                  <span class="list-title"><span class="phase">${f.phase}</span> ${f.title}</span>
                  <span class="list-sub">${badge}</span>
                </span>
                <span class="list-chevron" aria-hidden="true">›</span>
              </a>
            </li>`;
}

function renderHub() {
  const protocolPhases = new Set(["0", "0.5", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  const protocol = FEATURES.filter((f) => protocolPhases.has(f.phase));
  const site = FEATURES.filter((f) => !protocolPhases.has(f.phase));

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Features available now · humanity.llc</title>
    <meta name="description" content="What ships today on humanity.llc — resolver protocol, device hub, studio pilot, and one page per feature." />
    <meta name="theme-color" content="#ffffff" />
    <link rel="icon" href="/assets/red_qr_transparent_bg.png" type="image/png" />
    <link rel="stylesheet" href="/styles.css?v=69" />
  </head>
  <body>
    <div class="page feature-page feature-hub">
      <header class="top">
        <a class="top-brand" href="/">
          <span class="pass-dot" aria-hidden="true"></span>
          <span>humanity.llc</span>
        </a>
        <a class="top-create" href="/create/">Create</a>
      </header>
      <main class="screen">
        <section class="hero">
          <p class="hero-eyebrow">Building now</p>
          <h1>All features available now</h1>
          <p class="hero-line">Protocol features (signed objects on the Worker) plus the Pages shell returners use every day — hub, wallet, studio blog.</p>
        </section>
        <p class="insight"><strong>For recruiters:</strong> <strong>Cloudflare Workers + D1 + Pages</strong> — Ed25519-signed writes, replay-protected mutations, mechanism-visible scan UI, <strong>On this device</strong> hub (no accounts), status-plate pilot, and <strong>94 automated Worker tests</strong>.</p>
        <section class="group">
          <h2 class="group-label">Site &amp; returning users</h2>
          <ul class="list">
            ${site.map(hubRow).join("\n")}
          </ul>
        </section>
        <section class="group">
          <h2 class="group-label">Protocol &amp; resolver</h2>
          <ul class="list">
            ${protocol.map(hubRow).join("\n")}
          </ul>
        </section>
        <section class="group">
          <h2 class="group-label">Also on the site</h2>
          <ul class="list list-compact">
            <li class="list-row list-action">
              <a href="/case-study/">
                <span class="list-icon list-icon-tone-blue" aria-hidden="true">${ICONS.book}</span>
                <span class="list-content">
                  <span class="list-title">Case study</span>
                  <span class="list-sub">Create → scan → update → revoke → live control</span>
                </span>
                <span class="list-chevron" aria-hidden="true">›</span>
              </a>
            </li>
            <li class="list-row list-action">
              <a href="/wallet/">
                <span class="list-icon list-icon-tone-trust" aria-hidden="true">${ICONS.shield}</span>
                <span class="list-content">
                  <span class="list-title">All saved cards</span>
                  <span class="list-sub">Full device wallet view</span>
                </span>
                <span class="list-chevron" aria-hidden="true">›</span>
              </a>
            </li>
          </ul>
        </section>
        <section class="group">
          <ul class="list">
            <li class="list-row list-action">
              <a href="/">
                <span class="list-icon list-icon-tone-red" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg></span>
                <span class="list-content"><span class="list-title">Back to landing</span></span>
                <span class="list-chevron" aria-hidden="true">›</span>
              </a>
            </li>
          </ul>
        </section>
      </main>
    </div>
  </body>
</html>`;
}

fs.mkdirSync(outDir, { recursive: true });
FEATURES.forEach((f, i) => {
  let html = renderFeaturePage(f, i);
  html = html.replace(/<\/motion\.motion.div>/g, "</div>").replace(/<motion\.div/g, "<div");
  fs.writeFileSync(path.join(outDir, `${f.slug}.html`), html);
});
fs.writeFileSync(path.join(root, "features-available-now.html"), renderHub());
console.log(`Wrote ${FEATURES.length} feature pages + hub`);
