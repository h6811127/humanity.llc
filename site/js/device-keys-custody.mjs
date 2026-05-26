/**
 * Shared copy for where signing keys live (tab vs saved on device).
 */

import { HC_CAUTION_ICON, HC_INFO_ICON } from "./hc-notice-icons.mjs";
import {
  dismissKeysCustodyNotice,
  isKeysCustodyNoticeDismissed,
} from "./device-keys-custody-core.mjs";

/** @typedef {'hub' | 'wallet' | 'created' | 'compact'} CustodyVariant */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
  return `<button type="button" class="hc-notice-ack" data-keys-custody-ack>Acknowledge</button>`;
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

  if (variant === "hub") {
    return `
      <div class="hc-notice hc-notice--info device-keys-custody device-keys-custody--hub" role="note">
        <span class="hc-notice-icon">${HC_INFO_ICON}</span>
        <div class="hc-notice-content">
          <p class="hc-notice-title">Your browser holds the private key</p>
          <p class="hc-notice-body">
            That is what lets you update, revoke, and prove control. The network never receives it.
          </p>
          <div class="hc-notice-actions">
            ${custodyAckButton()}
          </div>
        </div>
      </div>`;
  }

  if (variant === "created") {
    return `
      <div class="hc-notice hc-notice--warning device-keys-custody device-keys-custody--created" role="note">
        <span class="hc-notice-icon">${HC_CAUTION_ICON}</span>
        <div class="hc-notice-content">
          <p class="hc-notice-title">Save your key on this device</p>
          <p class="hc-notice-body">
            You can sign from this tab now. Tap <strong>Save on this device</strong> below to keep that ability after you close the tab.
          </p>
          ${tiersDl}
          ${networkNote}
          ${foot}
        </div>
      </div>`;
  }

  if (variant === "wallet") {
    return `
      <div class="hc-notice hc-notice--info device-keys-custody device-keys-custody--wallet" role="note">
        <span class="hc-notice-icon">${HC_INFO_ICON}</span>
        <div class="hc-notice-content">
          <p class="hc-notice-title">Your browser holds the private key</p>
          <p class="hc-notice-body">
            That is what lets you update, revoke, and prove control. The network never receives it.
          </p>
          <div class="hc-notice-actions">
            ${custodyAckButton()}
          </div>
          ${foot}
        </div>
      </div>`;
  }

  return `
    <div class="hc-notice hc-notice--warning hc-notice--compact device-keys-custody device-keys-custody--compact" role="note">
      <span class="hc-notice-icon">${HC_CAUTION_ICON}</span>
      <p class="hc-notice-body">
        <strong>Keys are critical.</strong> Tab only until you save · saved cards persist in this browser until you clear site data.
        <a href="${escapeHtml(learnHref)}">Learn more</a>
      </p>
    </div>`;
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
