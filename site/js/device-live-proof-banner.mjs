/**
 * Page-level urgent banner when live proof is waiting (steward shell pages).
 * Signing stays on /created/ — /created/ uses #live-control-proof instead.
 * @see docs/DEVICE_INBOX.md · docs/DEVICE_OS.md
 */
import {
  emphasisCardActionsHtml,
  emphasisCardBodyHtml,
  emphasisCardCtaButton,
  escapeEmphasisHtml,
} from "./device-emphasis-card-html.mjs";
import { inboxWalletEntryLabel } from "./device-inbox-core.mjs";
import {
  getLiveControlPendingForDisplay,
  getLiveControlPendingCount,
  openLiveControlProof,
} from "./device-live-control-inbox.mjs";

const banner = document.getElementById("device-live-proof-banner");

function clearLiveProofBanner() {
  if (!banner) return;
  banner.hidden = true;
  banner.innerHTML = "";
  banner.classList.remove("hc-emphasis-card", "hc-emphasis-card--urgent", "device-live-proof-banner");
}

function shouldSkipLiveProofBanner() {
  return document.body?.classList.contains("device-shell-created");
}

function foregroundAttentionStripShowing() {
  const strip = document.getElementById("device-foreground-attention");
  return strip instanceof HTMLElement && !strip.hidden && strip.innerHTML.trim() !== "";
}

export function renderLiveProofBanner() {
  if (foregroundAttentionStripShowing()) {
    clearLiveProofBanner();
    return;
  }
  if (!banner || shouldSkipLiveProofBanner()) {
    clearLiveProofBanner();
    return;
  }

  const pending = getLiveControlPendingForDisplay();
  if (getLiveControlPendingCount() === 0 || pending.length === 0) {
    clearLiveProofBanner();
    return;
  }

  const first = pending[0];
  const label = inboxWalletEntryLabel(first.entry);
  const n = pending.length;
  const title = "Prove live control";
  const detail =
    n === 1
      ? `Someone nearby scanned ${escapeEmphasisHtml(label)} and asked for live proof. Sign once from this key-holding device.`
      : `${n} cards need your signature — starting with ${escapeEmphasisHtml(label)}.`;

  banner.hidden = false;
  banner.className = "hc-emphasis-card hc-emphasis-card--urgent device-live-proof-banner";
  banner.innerHTML = emphasisCardBodyHtml({
    eyebrow: n === 1 ? "Live proof" : `${n} live proofs waiting`,
    title,
    detail,
    dot: "urgent",
    actionsHtml: emphasisCardActionsHtml([
      emphasisCardCtaButton("Prove control now", "data-live-proof-banner-prove"),
    ]),
  });

  const proveBtn = banner.querySelector("[data-live-proof-banner-prove]");
  proveBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    void openLiveControlProof(first);
  });
}

if (banner) {
  renderLiveProofBanner();
}
