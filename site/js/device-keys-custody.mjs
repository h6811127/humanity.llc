/**
 * Shared copy for where ownership control lives (tab vs saved on device).
 * @see docs/OWNERSHIP_AND_CONTROL_MODEL.md D1
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
      <a href="${escapeHtml(learnHref)}">How ownership works</a>
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
 * @param {{ eyebrow: string, title: string, detail: string, extraCopyHtml?: string, afterActionsHtml?: string }} copy
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
    afterActionsHtml: copy.afterActionsHtml ?? "",
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
        <dt>Active in this tab only</dt>
        <dd>Gone when you close this tab or clear site data for humanity.llc.</dd>
      </div>
      <div class="device-keys-custody-dl-row device-keys-custody-dl-row--saved">
        <dt>Ownership saved on this device</dt>
        <dd>Stays in this browser until you remove the root card or clear site data.</dd>
      </div>
    </dl>`;

  const foot = noticeFoot(importHref, learnHref);

  const networkNote =
    '<p class="device-keys-custody-note">Your root card is already on the network. Saving only keeps control in this browser.</p>';

  const privateKeyCopy = {
    eyebrow: "Your ownership",
    title: "Your browser holds control",
    detail:
      "That is what lets you update, revoke, prove control, and manage child object QRs. The network never receives it.",
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
      eyebrow: "Control on this device",
      title: "Save ownership on this device",
      detail:
        "You can manage from this tab now. Tap <strong>Save ownership on this device</strong> below to keep control of this root card and its object QRs after you close the tab.",
      extraCopyHtml: `${tiersDl}${networkNote}${foot}`,
      actionsHtml: emphasisCardActionsHtml([custodyAckButton()]),
    });
  }

  if (variant === "wallet") {
    return emphasisCardShellHtml({
      modifier: "info",
      className: "device-keys-custody device-keys-custody--wallet",
      role: "note",
      dot: "info",
      eyebrow: privateKeyCopy.eyebrow,
      title: privateKeyCopy.title,
      detail: privateKeyCopy.detail,
      actionsHtml: emphasisCardActionsHtml([custodyAckButton()]),
      afterActionsHtml: foot,
    });
  }

  return emphasisCardShellHtml({
    modifier: "warn",
    className: "device-keys-custody device-keys-custody--compact",
    role: "note",
    dot: "warn",
    eyebrow: "Before you save",
    title: "Ownership matters",
    detail:
      "Active in this tab only until you save ownership · saved root cards persist in this browser until you clear site data. <a href=\"${escapeHtml(learnHref)}\">Learn more</a>",
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
  if (
    (variant === "hub" || variant === "wallet" || variant === "created") &&
    isKeysCustodyNoticeDismissed()
  ) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = keysCustodyHtml(variant, opts);
  bindCustodyAck(el);
}
