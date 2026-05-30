/**
 * Hub emphasis when `hc_wallet` parse fails (Safari P1-4 · R7).
 */
import {
  emphasisCardActionsHtml,
  emphasisCardCtaSecondary,
  emphasisCardShellHtml,
} from "./device-emphasis-card-html.mjs";
import {
  WALLET_CORRUPT_HUB_DETAIL,
  WALLET_CORRUPT_HUB_EYEBROW,
  WALLET_CORRUPT_HUB_TITLE,
} from "./device-ownership-copy-core.mjs";
import { isWalletStorageCorrupt } from "./device-wallet.mjs";

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

function scrollHubToImport() {
  const target =
    document.getElementById("hub-import-form") ??
    document.querySelector(".device-hub-import");
  target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  const details = target instanceof HTMLDetailsElement ? target : target?.closest("details");
  if (details instanceof HTMLDetailsElement) {
    details.open = true;
  }
}

let actionsBound = false;

function bindActions(host) {
  if (actionsBound) return;
  actionsBound = true;
  host.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest("[data-hub-wallet-corrupt-import]") : null;
    if (!btn) return;
    e.preventDefault();
    scrollHubToImport();
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
    actionsHtml: emphasisCardActionsHtml([
      emphasisCardCtaSecondary("Import backup", "data-hub-wallet-corrupt-import"),
    ]),
  });
  bindActions(host);
  return true;
}
