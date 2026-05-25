/**
 * Shared copy for where signing keys live (tab vs saved on device).
 */

/** @typedef {'hub' | 'wallet' | 'created' | 'compact'} CustodyVariant */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * @param {CustodyVariant} variant
 * @param {{ importHref?: string }} [opts]
 */
export function keysCustodyHtml(variant, opts = {}) {
  const importHref = opts.importHref ?? "#hub-import-form";
  const learnHref = "/features/card-creation.html#keys-custody";

  const tiers = `
    <ul class="device-keys-custody-tiers">
      <li class="device-keys-custody-tier device-keys-custody-tier--tab">
        <span class="device-keys-custody-tier-title">This tab only</span>
        <span class="device-keys-custody-tier-desc">Keys sit in this browser tab. Close the tab or clear the session and they are gone.</span>
      </li>
      <li class="device-keys-custody-tier device-keys-custody-tier--saved">
        <span class="device-keys-custody-tier-title">Saved on this device</span>
        <span class="device-keys-custody-tier-desc">Written to this browser&apos;s storage. You can come back months later, open <strong>Saved on this device</strong>, and tap <strong>Use keys</strong>.</span>
      </li>
    </ul>`;

  const foot = `
    <p class="device-keys-custody-foot">
      <a href="${escapeHtml(learnHref)}">How keys work</a>
      <span aria-hidden="true"> · </span>
      <a href="${escapeHtml(importHref)}">Import backup</a>
    </p>`;

  const networkNote =
    '<p class="device-keys-custody-network">Create already registers a <strong>public card</strong> on the network. Save only copies your <strong>private key</strong> into this browser.</p>';

  if (variant === "created") {
    return `
      <div class="device-keys-custody device-keys-custody--created" role="note">
        <p class="device-keys-custody-kicker">Save your key now</p>
        <p class="device-keys-custody-lead">
          You can revoke and update from <strong>this tab</strong> right now. To keep that power after you close the tab,
          tap <strong>Save on this device</strong> below.
        </p>
        ${networkNote}
        ${tiers}
        ${foot}
      </div>`;
  }

  if (variant === "wallet") {
    return `
      <div class="device-keys-custody device-keys-custody--wallet" role="note">
        <p class="device-keys-custody-kicker">Your signing keys</p>
        <p class="device-keys-custody-lead">
          Cards listed here have private keys in <strong>this browser</strong>. humanity.llc does not store them on servers.
          Clearing site data for this site removes them.
        </p>
        ${networkNote}
        ${tiers}
        ${foot}
      </div>`;
  }

  if (variant === "compact") {
    return `
      <div class="device-keys-custody device-keys-custody--compact" role="note">
        <p class="device-keys-custody-lead">
          <strong>Keys are critical.</strong> Tab only until you save · saved cards persist in this browser until you clear site data.
          <a href="${escapeHtml(learnHref)}">Learn more</a>
        </p>
      </div>`;
  }

  return `
    <div class="device-keys-custody device-keys-custody--hub" role="note">
      <p class="device-keys-custody-kicker">Keys control your card</p>
      <p class="device-keys-custody-lead">
        Revoke, update, and live proof need the <strong>private key</strong> in this browser. The network never holds it.
      </p>
      ${networkNote}
      ${tiers}
      ${foot}
    </div>`;
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
  el.innerHTML = keysCustodyHtml(variant, opts);
}
