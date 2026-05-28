/**
 * Hub toolbar: Check network, last-checked line, Watch for live proof (Phase 5).
 */
import {
  formatHubNetworkStatusLine,
  isWatchLiveProofEnabled,
  STORAGE_WATCH_LIVE_PROOF,
} from "./device-hub-network-tools-core.mjs";

const TOOLBAR_ID = "device-hub-network-tools";
const STATUS_ID = "device-hub-network-status-line";
const CHECK_NETWORK_ID = "device-hub-check-network-btn";
const CHECK_LIVE_PROOF_ID = "device-hub-check-live-proof-btn";
const WATCH_INPUT_ID = "device-hub-watch-live-proof";

/** @typedef {{
 *   hubRoot: ParentNode,
 *   showNetwork: boolean,
 *   showLiveProof: boolean,
 *   getNetworkCheckedAt: () => number,
 *   getLiveProofCheckedAt: () => number,
 *   getAutoPollBudgetPaused?: () => boolean,
 *   getStewardQuotaPaused?: () => boolean,
 *   getLargeWalletHint?: () => string | null,
 *   getHostedTierLine?: () => string | null,
 *   onCheckNetwork: () => void | Promise<void>,
 *   onCheckLiveProof: () => void | Promise<void>,
 *   onWatchChange: (enabled: boolean) => void,
 * }} MountHubNetworkToolsConfig */

/** @param {MountHubNetworkToolsConfig} config */
export function mountHubNetworkTools(config) {
  if (!config.showNetwork && !config.showLiveProof) return;

  const section = config.hubRoot.querySelector("#device-hub-saved-items-section");
  if (!section) return;

  let toolbar = section.querySelector(`#${TOOLBAR_ID}`);
  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.id = TOOLBAR_ID;
    toolbar.className = "device-hub-network-tools";
    toolbar.innerHTML = `
      <p class="device-hub-network-tools-eyebrow">Monitoring</p>
      <p class="device-hub-network-tools-status" id="${STATUS_ID}" role="status"></p>
      <p class="device-hub-steward-tier-line" id="device-hub-steward-tier-line" role="status" hidden></p>
      <p class="device-hub-network-tools-hint" id="device-hub-large-wallet-hint" role="note" hidden></p>
      <div class="device-hub-network-tools-segment" role="group" aria-label="Network checks">
        <button type="button" class="device-hub-network-tools-segment-btn" id="${CHECK_NETWORK_ID}" hidden>
          Check network
        </button>
        <button type="button" class="device-hub-network-tools-segment-btn" id="${CHECK_LIVE_PROOF_ID}" hidden>
          Check for live proof
        </button>
      </div>
      <label class="device-hub-watch-live-proof" id="device-hub-watch-live-proof-label" hidden>
        <span class="device-hub-watch-live-proof-text">Watch for live proof</span>
        <input type="checkbox" class="device-hub-watch-live-proof-input" id="${WATCH_INPUT_ID}" />
      </label>
    `;
    const lead = section.querySelector(".device-hub-section-lead");
    if (lead) {
      lead.insertAdjacentElement("afterend", toolbar);
    } else {
      section.prepend(toolbar);
    }
  }

  const statusEl = toolbar.querySelector(`#${STATUS_ID}`);
  const checkNetworkBtn = toolbar.querySelector(`#${CHECK_NETWORK_ID}`);
  const checkLiveProofBtn = toolbar.querySelector(`#${CHECK_LIVE_PROOF_ID}`);
  const watchLabel = toolbar.querySelector("#device-hub-watch-live-proof-label");
  const watchInput = toolbar.querySelector(`#${WATCH_INPUT_ID}`);

  if (checkNetworkBtn instanceof HTMLButtonElement) {
    checkNetworkBtn.hidden = !config.showNetwork;
    if (checkNetworkBtn.dataset.hcBound !== "1") {
      checkNetworkBtn.dataset.hcBound = "1";
      checkNetworkBtn.addEventListener("click", () => {
        void config.onCheckNetwork();
      });
    }
  }

  if (checkLiveProofBtn instanceof HTMLButtonElement) {
    checkLiveProofBtn.hidden = !config.showLiveProof;
    if (checkLiveProofBtn.dataset.hcBound !== "1") {
      checkLiveProofBtn.dataset.hcBound = "1";
      checkLiveProofBtn.addEventListener("click", () => {
        void config.onCheckLiveProof();
      });
    }
  }

  if (watchInput instanceof HTMLInputElement && watchLabel instanceof HTMLLabelElement) {
    watchLabel.hidden = !config.showLiveProof;
    watchInput.checked = isWatchLiveProofEnabled();
    syncLiveProofManualButton(checkLiveProofBtn, watchInput.checked);
    if (watchInput.dataset.hcBound !== "1") {
      watchInput.dataset.hcBound = "1";
      watchInput.addEventListener("change", () => {
        const enabled = watchInput.checked;
        try {
          localStorage.setItem(STORAGE_WATCH_LIVE_PROOF, enabled ? "1" : "0");
        } catch {
          /* ignore */
        }
        syncLiveProofManualButton(checkLiveProofBtn, enabled);
        config.onWatchChange(enabled);
      });
    }
  }

  const hintEl = toolbar.querySelector("#device-hub-large-wallet-hint");
  const hostedLineEl = toolbar.querySelector("#device-hub-steward-tier-line");

  const renderStatus = () => {
    if (!statusEl) return;
    statusEl.textContent = formatHubNetworkStatusLine({
      networkCheckedAt: config.showNetwork ? config.getNetworkCheckedAt() : 0,
      liveProofCheckedAt: config.showLiveProof ? config.getLiveProofCheckedAt() : 0,
      autoPollBudgetPaused: config.getAutoPollBudgetPaused?.() === true,
      stewardQuotaPaused: config.getStewardQuotaPaused?.() === true,
      liveProofWatchOn: isWatchLiveProofEnabled(),
    });
    if (hostedLineEl instanceof HTMLElement) {
      const hostedLine = config.getHostedTierLine?.() ?? null;
      if (hostedLine) {
        hostedLineEl.textContent = hostedLine;
        hostedLineEl.hidden = false;
      } else {
        hostedLineEl.textContent = "";
        hostedLineEl.hidden = true;
      }
    }
    if (hintEl instanceof HTMLElement) {
      const hint = config.getLargeWalletHint?.() ?? null;
      if (hint) {
        hintEl.textContent = hint;
        hintEl.hidden = false;
      } else {
        hintEl.textContent = "";
        hintEl.hidden = true;
      }
    }
  };

  renderStatus();
  toolbar.dataset.hcStatusBound = "1";
  if (toolbar.dataset.hcStatusListener !== "1") {
    toolbar.dataset.hcStatusListener = "1";
    const refresh = () => renderStatus();
    window.addEventListener("hc-hub-network-checked", refresh);
    window.addEventListener("hc-live-proof-checked", refresh);
    window.addEventListener("hc-live-control-poll-budget-changed", refresh);
    window.addEventListener("hc-steward-entitlements-changed", refresh);
    window.addEventListener("hc-steward-quota-changed", refresh);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_WATCH_LIVE_PROOF && watchInput instanceof HTMLInputElement) {
        watchInput.checked = isWatchLiveProofEnabled();
        syncLiveProofManualButton(checkLiveProofBtn, watchInput.checked);
      }
    });
  }
}

/**
 * @param {HTMLButtonElement | null} btn
 * @param {boolean} watchEnabled
 */
function syncLiveProofManualButton(btn, watchEnabled) {
  if (!(btn instanceof HTMLButtonElement)) return;
  btn.hidden = watchEnabled;
}
