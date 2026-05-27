/**
 * Shared copy for where signing keys live (tab vs saved on device).
 */

import {
  emphasisCardActionsHtml,
  emphasisCardCtaSecondary,
  emphasisCardShellHtml,
  escapeEmphasisHtml,
} from "./device-emphasis-card-html.mjs";
import {
  dismissKeysCustodyNotice,
  isKeysCustodyNoticeDismissed,
} from "./device-keys-custody-core.mjs";

/** @typedef {'hub' | 'wallet' | 'created' | 'compact'} CustodyVariant */

function escapeHtml(s) {
  return escapeEmphasisHtml(s);
}

function noticeFoot(importHref, learnHref) {
  return `
    <p class="hc-notice-foot">
      <a href="${escapeHtml(learnHref)}">How keys work</a>
      <span aria-hidden="true"> · </span>
      <a href="/help/#keys">All help</a>
      <span aria-hidden="true"> · </span>
      <a href="${escapeHtml(importHref)}">Import backup</a>
    </p>`;
}

function custodyAckButton() {
  return emphasisCardCtaSecondary("Acknowledge", "data-keys-custody-ack");
}

/**
 * @param {string} className
 * @param {{ eyebrow: string, title: string, detail: string, extraCopyHtml?: string }} copy
 */
function custodyInfoEmphasisCard(className, copy) {
  return emphasisCardShellHtml({
    modifier: "info",
    className: `device-keys-custody ${className}`,
    role: "note",
    dot: "info",
    eyebrow: copy.eyebrow,
    title: copy.title,
    detail: copy.detail,
    extraCopyHtml: copy.extraCopyHtml ?? "",
    actionsHtml: emphasisCardActionsHtml([custodyAckButton()]),
  });
}

/**
 * @param {CustodyVariant} variant
 * @param {{ importHref?: string }} [opts]
 */
export function keysCustodyHtml(variant, opts = {}) {
  const importHref = opts.importHref ?? "#hub-import-form";
  const learnHref = "/help/#keys";

  const tiersDl = `
    <dl class="device-keys-custody-dl">
      <div class="device-keys-custody-dl-row">
        <dt>This tab only</dt>
        <dd>Gone when you close this tab or clear site data for humanity.llc.</dd>
      </div>
      <div class="device-keys-custody-dl-row device-keys-custody-dl-row--saved">
        <dt>Saved on this device</dt>
        <dd>Stays in this browser until you remove the card or clear site data.</dd>
      </div>
    </dl>`;

  const foot = noticeFoot(importHref, learnHref);

  const networkNote =
    '<p class="device-keys-custody-note">Your card is already on the network. Save only stores the signing key in this browser.</p>';

  const privateKeyCopy = {
    eyebrow: "Keys custody",
    title: "Your browser holds the private key",
    detail:
      "That is what lets you update, revoke, and prove control. The network never receives it.",
  };

  if (variant === "hub") {
    return custodyInfoEmphasisCard("device-keys-custody--hub", privateKeyCopy);
  }

  if (variant === "created") {
    return emphasisCardShellHtml({
      modifier: "warn",
      className: "device-keys-custody device-keys-custody--created",
      role: "note",
      dot: "warn",
      eyebrow: "Keys on this device",
      title: "Save your key on this device",
      detail:
        "You can sign from this tab now. Tap <strong>Save on this device</strong> below to keep that ability after you close the tab.",
      extraCopyHtml: `${tiersDl}${networkNote}${foot}`,
      actionsHtml: emphasisCardActionsHtml([custodyAckButton()]),
    });
  }

  if (variant === "wallet") {
    return custodyInfoEmphasisCard("device-keys-custody--wallet", {
      ...privateKeyCopy,
      extraCopyHtml: foot,
    });
  }

  return emphasisCardShellHtml({
    modifier: "warn",
    className: "device-keys-custody device-keys-custody--compact",
    role: "note",
    dot: "warn",
    eyebrow: "Before you save",
    title: "Keys are critical",
    detail:
      "Tab only until you save · saved cards persist in this browser until you clear site data. <a href=\"${escapeHtml(learnHref)}\">Learn more</a>",
  });
}

function bindCustodyAck(el) {
  const btn = el.querySelector("[data-keys-custody-ack]");
  if (!btn) return;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    dismissKeysCustodyNotice();
    const notice = el.querySelector(".device-keys-custody");
    if (notice) notice.remove();
    else el.innerHTML = "";
  });
}

/**
 * @param {string | HTMLElement | null} target
 * @param {CustodyVariant} [variant]
 * @param {{ importHref?: string }} [opts]
 */
export function mountKeysCustody(target, variant = "hub", opts = {}) {
  const el =
    typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  if ((variant === "hub" || variant === "wallet") && isKeysCustodyNoticeDismissed()) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = keysCustodyHtml(variant, opts);
  bindCustodyAck(el);
}
