/**
 * Hub emphasis when `hc_wallet` parse fails (Safari P1-4 · R7).
 */
import {
  emphasisCardShellHtml,
} from "./device-emphasis-card-html.mjs";
import {
  WALLET_CORRUPT_HUB_DETAIL,
  WALLET_CORRUPT_HUB_EYEBROW,
  WALLET_CORRUPT_HUB_TITLE,
} from "./device-ownership-copy-core.mjs";
import { isWalletStorageCorrupt } from "./device-wallet.mjs";
import {
  scrollToHubImportForm,
  walletCorruptActionsHtml,
  WALLET_CORRUPT_IMPORT_ATTR,
} from "./device-wallet-corrupt-core.mjs";

const HOST_ID = "device-hub-wallet-corrupt";

function ensureHost() {
  let host = document.getElementById(HOST_ID);
  if (host) return host;
  const anchor =
    document.getElementById("device-hub-saved-items-section") ||
    document.getElementById("device-hub-saved-group");
  if (!(anchor instanceof HTMLElement)) return null;
  host = document.createElement("section");
  host.id = HOST_ID;
  host.className = "device-hub-section device-hub-wallet-corrupt-section";
  host.hidden = true;
  anchor.insertBefore(host, anchor.firstChild);
  return host;
}

let actionsBound = false;

function bindActions(host) {
  if (actionsBound) return;
  actionsBound = true;
  host.addEventListener("click", (e) => {
    const btn =
      e.target instanceof Element
        ? e.target.closest(`[${WALLET_CORRUPT_IMPORT_ATTR}]`)
        : null;
    if (!btn) return;
    e.preventDefault();
    scrollToHubImportForm();
  });
}

export function renderHubWalletCorruptCard() {
  const host = ensureHost();
  if (!host) return false;

  if (!isWalletStorageCorrupt()) {
    host.hidden = true;
    host.innerHTML = "";
    return true;
  }

  host.hidden = false;
  host.setAttribute("role", "alert");
  host.innerHTML = emphasisCardShellHtml({
    modifier: "urgent",
    className: "device-hub-wallet-corrupt",
    eyebrow: WALLET_CORRUPT_HUB_EYEBROW,
    title: WALLET_CORRUPT_HUB_TITLE,
    detail: WALLET_CORRUPT_HUB_DETAIL,
    dot: "urgent",
    actionsHtml: walletCorruptActionsHtml(),
  });
  bindActions(host);
  return true;
}
