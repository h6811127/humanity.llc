/**
 * Compact device summary under header — expand for quick list or open /wallet/.
 */
import { getDeviceCounts } from "./device-counts.mjs";
import { loadWallet, walletEntrySubtitle } from "./device-wallet.mjs";
import { loadPins } from "./device-pins.mjs";

const STRIP_MAX = 4;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const strip = document.getElementById("device-strip");
const toggle = document.getElementById("device-strip-toggle");
const labelEl = document.getElementById("device-strip-label");
const panel = document.getElementById("device-strip-panel");
const savedUl = document.getElementById("device-strip-saved");
const pinsUl = document.getElementById("device-strip-pins");
const hubLink = document.getElementById("device-strip-hub-link");

if (!strip) {
  /* not on this page */
} else {
  function setExpanded(open) {
    strip.classList.toggle("is-expanded", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
    if (panel) panel.hidden = !open;
  }

  function renderPanelLists() {
    const wallet = loadWallet().slice(0, STRIP_MAX);
    const pins = loadPins().slice(0, STRIP_MAX);
    const counts = getDeviceCounts();

    if (savedUl) {
      savedUl.innerHTML = "";
      if (wallet.length === 0) {
        savedUl.hidden = true;
      } else {
        savedUl.hidden = false;
        for (const entry of wallet) {
          const li = document.createElement("li");
          li.className = "device-strip-row";
          li.innerHTML = `<a href="/wallet/">
            <span class="device-strip-row-title">${escapeHtml(entry.label)}</span>
            <span class="device-strip-row-sub">${escapeHtml(walletEntrySubtitle(entry))}</span>
          </a>`;
          savedUl.appendChild(li);
        }
        if (counts.saved > STRIP_MAX) {
          const more = document.createElement("li");
          more.className = "device-strip-more";
          more.innerHTML = `<a href="/wallet/">+${counts.saved - STRIP_MAX} more saved</a>`;
          savedUl.appendChild(more);
        }
      }
    }

    if (pinsUl) {
      pinsUl.innerHTML = "";
      if (pins.length === 0) {
        pinsUl.hidden = true;
      } else {
        pinsUl.hidden = false;
        for (const pin of pins) {
          const li = document.createElement("li");
          li.className = "device-strip-row";
          li.innerHTML = `<a href="${escapeHtml(pin.scan_url)}" target="_blank" rel="noopener noreferrer">
            <span class="device-strip-row-title">${escapeHtml(pin.label)}</span>
            <span class="device-strip-row-sub">Pinned scan ↗</span>
          </a>`;
          pinsUl.appendChild(li);
        }
        if (counts.pins > STRIP_MAX) {
          const more = document.createElement("li");
          more.className = "device-strip-more";
          more.innerHTML = `<a href="/wallet/">+${counts.pins - STRIP_MAX} more pins</a>`;
          pinsUl.appendChild(more);
        }
      }
    }
  }

  function refresh() {
    const counts = getDeviceCounts();
    if (counts.total === 0) {
      strip.hidden = true;
      document.body.classList.remove("has-device-strip");
      setExpanded(false);
      return;
    }

    strip.hidden = false;
    document.body.classList.add("has-device-strip");
    if (labelEl) labelEl.textContent = counts.label;
    renderPanelLists();
  }

  toggle?.addEventListener("click", () => {
    const open = !strip.classList.contains("is-expanded");
    setExpanded(open);
    if (open && hubLink) {
      hubLink.hidden = !document.getElementById("device-hub");
    }
  });

  hubLink?.addEventListener("click", (e) => {
    const hub = document.getElementById("device-hub");
    if (!hub) return;
    e.preventDefault();
    setExpanded(false);
    hub.scrollIntoView({ behavior: "smooth", block: "start" });
    hub.classList.add("device-hub-highlight");
    window.setTimeout(() => hub.classList.remove("device-hub-highlight"), 1600);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && strip.classList.contains("is-expanded")) {
      setExpanded(false);
    }
  });

  refresh();
  window.addEventListener("storage", (e) => {
    if (e.key === "hc_wallet" || e.key === "hc_device_pins") refresh();
  });
  window.addEventListener("hc-device-hub-changed", refresh);
}
