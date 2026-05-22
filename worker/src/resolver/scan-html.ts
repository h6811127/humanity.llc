import type { ScanPageKind, ScanViewModel, StatusTone } from "./scan-state";

const RED = "#db1b43";

export function renderScanPage(vm: ScanViewModel, origin: string): string {
  const title = pageTitle(vm);
  const blocks = [
    vm.showCardBlock ? renderCardBlock(vm) : "",
    vm.showHumanTrustBlock ? renderHumanTrustBlock(vm) : "",
    vm.showArtifactBlock ? renderArtifactBlock(vm) : "",
    vm.showLiveControlBlock ? renderLiveControlBlock(vm) : "",
    renderLimitationsBlock(vm, origin),
  ].join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="color-scheme" content="light" />
  <meta name="theme-color" content="#ffffff" />
  <title>${escapeHtml(title)} · humanity.llc</title>
  <style>${SCAN_CSS}</style>
</head>
<body>
  <main class="scan">
    <header class="scan-head">
      <div class="scan-brand">
        <span class="scan-dot" aria-hidden="true"></span>
        <span>humanity.llc</span>
      </div>
      <span class="badge badge-${vm.primaryBadge.tone}">${escapeHtml(vm.primaryBadge.label)}</span>
    </header>
    <p class="scan-lead">${escapeHtml(scanLead(vm))}</p>
    <div class="trust-stack" role="region" aria-label="Trust state at scan time">
      ${blocks}
    </div>
    ${renderFooter(vm, origin)}
  </main>
</body>
</html>`;
}

function scanLead(vm: ScanViewModel): string {
  switch (vm.kind) {
    case "active":
      return "Live status at scan time. Read each block separately—card, human trust, and QR are not the same thing.";
    case "unknown_profile":
      return "This scan link does not match a registered card on this operator.";
    case "unknown_qr":
      return "This card exists, but this QR credential is not recognized.";
    case "profile_qr_mismatch":
      return "This QR does not belong to the profile in the URL.";
    case "malformed":
      return "This scan link is missing a valid profile or QR id.";
    case "card_revoked":
      return "The card was revoked. Printed QRs may still exist physically.";
    case "card_suspended":
      return "The card is suspended under published operator rules.";
    case "card_expired":
      return "The card has expired.";
    case "qr_revoked":
      return "This QR credential was revoked. Other QRs on the same card may still be active.";
    case "qr_expired":
      return "This QR credential has expired.";
    case "qr_replaced":
      return "This QR was replaced by a newer credential on the same card.";
    default:
      return "Resolver status at scan time.";
  }
}

function pageTitle(vm: ScanViewModel): string {
  if (vm.kind === "active" && vm.handle) return `@${vm.handle}`;
  return vm.primaryBadge.label;
}

function renderCardBlock(vm: ScanViewModel): string {
  const status = vm.cardStatus ? formatCardStatus(vm.cardStatus) : "Unknown";
  const handle = vm.handle ? `@${escapeHtml(vm.handle)}` : "—";
  const manifesto = vm.manifestoLine
    ? `<p class="trust-value manifesto">${escapeHtml(vm.manifestoLine)}</p>`
    : "";
  const profileRow = vm.profileId
    ? trustRow(
        "Profile ID",
        `<span class="mono">${escapeHtml(vm.profileId)}</span>`
      )
    : "";

  const proves = cardProves(vm);
  const notProves = cardNotProves(vm);

  return `<section class="trust-block trust-block-card" aria-labelledby="trust-card-h">
  <h2 id="trust-card-h" class="trust-block-title">1 · Card status</h2>
  <p class="trust-block-desc">Whether the resolver recognizes the Humanity Card right now.</p>
  <div class="trust-dl">
    ${trustRow("Status", `<strong>${escapeHtml(status)}</strong>`)}
    ${vm.handle ? trustRow("Handle", handle) : ""}
    ${profileRow}
  </div>
  ${manifesto}
  <div class="trust-boundary trust-boundary-proves">
    <p class="trust-boundary-label">Proves</p>
    <p>${escapeHtml(proves)}</p>
  </div>
  <div class="trust-boundary trust-boundary-not">
    <p class="trust-boundary-label">Does not prove</p>
    <p>${escapeHtml(notProves)}</p>
  </div>
</section>`;
}

function renderHumanTrustBlock(vm: ScanViewModel): string {
  const label = escapeHtml(vm.verificationLabel);
  const method = vm.verificationMethod
    ? formatMethod(vm.verificationMethod)
    : "—";
  const vouchRow =
    vm.vouchCount > 0
      ? trustRow(
          "Accepted vouches",
          `<strong>${vm.vouchCount}</strong>${vm.latestVouchAt ? ` · latest ${escapeHtml(formatRecency(vm.latestVouchAt))}` : ""}`
        )
      : trustRow("Accepted vouches", "0");

  const humanProves = humanProvesText(vm);
  const humanNot = humanNotProvesText(vm);

  return `<section class="trust-block trust-block-human" aria-labelledby="trust-human-h">
  <h2 id="trust-human-h" class="trust-block-title">2 · Human trust</h2>
  <p class="trust-block-desc">Social trust under published rules—not a hidden score or legal ID.</p>
  <p class="trust-label-pill">${label}</p>
  <div class="trust-dl">
    ${trustRow("Method", escapeHtml(method))}
    ${vouchRow}
  </div>
  <div class="trust-boundary trust-boundary-proves">
    <p class="trust-boundary-label">Proves</p>
    <p>${escapeHtml(humanProves)}</p>
  </div>
  <div class="trust-boundary trust-boundary-not">
    <p class="trust-boundary-label">Does not prove</p>
    <p>${escapeHtml(humanNot)}</p>
  </div>
</section>`;
}

function renderArtifactBlock(vm: ScanViewModel): string {
  const qrStatus = vm.qrStatus ? formatQrStatus(vm.qrStatus) : "Unknown";
  const scope = vm.qrScope ? formatScope(vm.qrScope) : "—";
  const scopeNote =
    vm.qrScope === "print_artifact"
      ? `<p class="trust-note">Printed-item QR: revoking this credential does not revoke sibling items unless you revoke the whole card.</p>`
      : `<p class="trust-note">Card-scoped QR: points at this card's active credential epoch.</p>`;

  const qrIdRow = vm.qrId
    ? trustRow("QR ID", `<span class="mono">${escapeHtml(vm.qrId)}</span>`)
    : "";
  const epochRow =
    vm.qrEpoch != null ? trustRow("Epoch", String(vm.qrEpoch)) : "";

  return `<section class="trust-block trust-block-artifact" aria-labelledby="trust-artifact-h">
  <h2 id="trust-artifact-h" class="trust-block-title">3 · This QR credential</h2>
  <p class="trust-block-desc">Status of the <em>printed or displayed</em> QR—not the person holding it.</p>
  <div class="trust-dl">
    ${trustRow("QR status", `<strong>${escapeHtml(qrStatus)}</strong>`)}
    ${trustRow("Scope", escapeHtml(scope))}
    ${epochRow}
    ${qrIdRow}
  </div>
  ${scopeNote}
  <div class="trust-boundary trust-boundary-proves">
    <p class="trust-boundary-label">Proves</p>
    <p>This QR resolves to a Humanity Card and shows this credential's state at scan time.</p>
  </div>
  <div class="trust-boundary trust-boundary-not">
    <p class="trust-boundary-label">Does not prove</p>
    <p>The person holding this sticker, card, or screen is the card owner or controls the private key.</p>
  </div>
</section>`;
}

function renderLiveControlBlock(vm: ScanViewModel): string {
  const status = vm.liveControlAvailable
    ? "Proven recently"
    : "Not shown on this scan";
  const body = vm.liveControlAvailable
    ? "A live control proof was completed in the last few minutes."
    : "No live control challenge was requested. A static QR alone cannot show that someone nearby holds the card key.";

  return `<section class="trust-block trust-block-live trust-block-muted" aria-labelledby="trust-live-h">
  <h2 id="trust-live-h" class="trust-block-title">4 · Live control</h2>
  <p class="trust-block-desc">Optional in-person key proof—separate from card and QR status.</p>
  <div class="trust-dl">
    ${trustRow("On this scan", `<strong>${escapeHtml(status)}</strong>`)}
  </div>
  <p class="trust-note">${escapeHtml(body)}</p>
  <div class="trust-boundary trust-boundary-not">
    <p class="trust-boundary-label">Does not prove</p>
    <p>Legal identity, unique humanity, or that the holder owns a physical object.</p>
  </div>
</section>`;
}

function renderLimitationsBlock(vm: ScanViewModel, origin: string): string {
  return `<section class="trust-block trust-block-limits" aria-labelledby="trust-limits-h">
  <h2 id="trust-limits-h" class="trust-block-title">5 · Limits &amp; logging</h2>
  <p class="limit-warn"><strong>Bearer warning.</strong> This QR resolves to a Humanity Card. It does not prove the person holding this item is the card owner.</p>
  <ul class="limit-list">
    <li>Not government ID, KYC, employment verification, or age proof</li>
    <li>Not bot-proof or guaranteed-unique humanity</li>
    <li>Merch or a scan alone does not grant vouched or steward status</li>
    <li><strong>No scan analytics</strong> on this page by default (reference operator policy)</li>
  </ul>
  <p class="limit-meta">Scanned at resolver: ${escapeHtml(OPERATOR)} · protocol ${escapeHtml(PROTOCOL)}</p>
  <p class="limit-link"><a href="${escapeHtml(origin)}/data-policy.html">Operator data policy</a></p>
</section>`;
}

function renderFooter(vm: ScanViewModel, origin: string): string {
  const jsonLink =
    vm.profileId && vm.kind === "active"
      ? `<a class="footer-link" href="${escapeHtml(origin)}/.well-known/hc/v1/cards/${escapeHtml(vm.profileId)}">Public card JSON</a>`
      : "";
  const createCta =
    vm.kind === "unknown_profile" || vm.kind === "malformed"
      ? `<a class="footer-cta" href="${escapeHtml(origin)}/create/">Create a live object</a>`
      : `<a class="footer-cta secondary" href="${escapeHtml(origin)}/">About humanity.llc</a>`;

  return `<footer class="scan-foot">
  ${createCta}
  ${jsonLink}
</footer>`;
}

function trustRow(label: string, valueHtml: string): string {
  return `<div class="trust-row"><dt>${escapeHtml(label)}</dt><dd>${valueHtml}</dd></div>`;
}

function cardProves(vm: ScanViewModel): string {
  if (vm.kind === "active") {
    return "The resolver recognizes this card and returns current public fields at scan time.";
  }
  if (vm.kind.startsWith("card_") || vm.kind.startsWith("qr_")) {
    return "The resolver returns an explicit status for this card or QR—not a silent broken link.";
  }
  return "Nothing beyond what is shown in the other blocks.";
}

function cardNotProves(vm: ScanViewModel): string {
  return "Legal identity, employment eligibility, or that anyone nearby owns or controls this card.";
}

function humanProvesText(vm: ScanViewModel): string {
  if (vm.vouchCount >= 3 || vm.verificationState === "verified_human") {
    return `Vouched by ${vm.vouchCount} humans under published Humanity Commons rules.`;
  }
  if (vm.verificationLabel === "Registered") {
    return "The card is registered on this operator with no accepted vouches shown yet.";
  }
  return `Current label: ${vm.verificationLabel} (method: ${vm.verificationMethod ?? "none"}).`;
}

function humanNotProvesText(vm: ScanViewModel): string {
  return "Legal name, government ID, age, immigration status, or that every voucher was honest.";
}

function formatCardStatus(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatQrStatus(s: string): string {
  return s.replace("_", " ");
}

function formatScope(scope: string): string {
  return scope === "print_artifact" ? "Printed item" : "Card";
}

function formatMethod(method: string): string {
  const map: Record<string, string> = {
    none: "None",
    registered: "Registered",
    vouch: "Vouch",
    ceremony: "Ceremony",
    device_proof: "Device proof",
    steward: "Steward",
  };
  return map[method] ?? method;
}

function formatRecency(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const OPERATOR = "humanity.llc";
const PROTOCOL = "1.0";

const SCAN_CSS = `
:root {
  --red: ${RED};
  --black: #000;
  --white: #fff;
  --grey: #8e8e93;
  --bg: #f5f5f7;
  --proves-bg: #f0faf4;
  --proves-border: #b8e6c8;
  --not-bg: #fafafa;
  --not-border: #e5e5ea;
  --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body { font-family: var(--font); background: var(--bg); color: var(--black); line-height: 1.45; min-height: 100dvh; }
.scan { max-width: 420px; margin: 0 auto; padding: 20px 18px 32px; }
.scan-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.scan-brand { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
.scan-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--red); flex-shrink: 0; }
.badge { font-size: 12px; font-weight: 700; padding: 5px 11px; border-radius: 100px; border: 1px solid rgba(0,0,0,0.12); white-space: nowrap; }
.badge-live { background: var(--red); border-color: var(--red); color: var(--white); }
.badge-warn { background: #fff8e6; border-color: #e6c200; color: #6b5a00; }
.badge-bad { background: #fde8ec; border-color: #f5c2cb; color: #8b1530; }
.badge-neutral { background: var(--white); color: var(--grey); }
.scan-lead { font-size: 14px; color: var(--grey); margin-bottom: 16px; line-height: 1.5; }
.trust-stack { display: flex; flex-direction: column; gap: 12px; }
.trust-block {
  background: var(--white);
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 18px;
  padding: 16px 16px 14px;
}
.trust-block-card { border-left: 4px solid var(--red); }
.trust-block-human { border-left: 4px solid #5856d6; }
.trust-block-artifact { border-left: 4px solid #007aff; }
.trust-block-live { border-left: 4px solid #8e8e93; }
.trust-block-muted { background: #fafafa; }
.trust-block-limits { border-left: 4px solid #ff9500; background: #fffdf8; }
.trust-block-title { font-size: 13px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 4px; }
.trust-block-desc { font-size: 12px; color: var(--grey); margin-bottom: 12px; line-height: 1.4; }
.trust-label-pill {
  display: inline-block;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--red);
  margin-bottom: 10px;
}
.trust-dl { margin-bottom: 10px; }
.trust-row { display: grid; grid-template-columns: 110px 1fr; gap: 8px; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.06); font-size: 14px; }
.trust-row:last-child { border-bottom: none; }
.trust-row dt { color: var(--grey); font-weight: 500; }
.trust-row dd { margin: 0; }
.trust-value.manifesto { font-size: 15px; margin: 0 0 10px; line-height: 1.45; }
.trust-note { font-size: 13px; color: var(--grey); margin: 0 0 10px; line-height: 1.45; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 11px; word-break: break-all; }
.trust-boundary { padding: 10px 12px; border-radius: 10px; margin-top: 8px; font-size: 13px; line-height: 1.45; }
.trust-boundary-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.trust-boundary-proves { background: var(--proves-bg); border: 1px solid var(--proves-border); }
.trust-boundary-proves .trust-boundary-label { color: #1a7a3a; }
.trust-boundary-not { background: var(--not-bg); border: 1px solid var(--not-border); }
.trust-boundary-not .trust-boundary-label { color: var(--grey); }
.limit-warn {
  font-size: 14px; line-height: 1.5; margin-bottom: 10px;
  padding: 10px 12px; border-left: 3px solid var(--red);
  background: rgba(219,27,67,0.05); border-radius: 0 10px 10px 0;
}
.limit-list { list-style: disc; padding-left: 18px; font-size: 13px; color: var(--grey); margin-bottom: 10px; }
.limit-list li { margin-bottom: 4px; }
.limit-meta { font-size: 11px; color: var(--grey); margin-bottom: 8px; }
.limit-link { font-size: 13px; }
.limit-link a { color: var(--red); font-weight: 600; text-decoration: none; }
.scan-foot { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.footer-cta {
  display: flex; align-items: center; justify-content: center; min-height: 48px;
  padding: 12px 18px; border-radius: 100px; background: var(--red); color: var(--white);
  font-size: 16px; font-weight: 600; text-decoration: none;
}
.footer-cta.secondary { background: var(--white); color: var(--black); border: 1px solid rgba(0,0,0,0.14); }
.footer-link { text-align: center; font-size: 13px; color: var(--grey); text-decoration: none; }
`;
