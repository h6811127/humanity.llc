/**
 * Debug-gated Pages + Worker build stamp in the device hub.
 * @see docs/SITE_BUILD_VERSIONING.md — Phases 2 and 4
 */
import { SITE_BUILD_META } from "./build-meta.mjs";
import {
  formatCombinedBuildCopyText,
  formatSiteBuildHubLabel,
  formatWorkerBuildHubLabel,
  isSiteDebugEnabled,
} from "./build-meta-browser.mjs";
import {
  formatOriginDebugHubLine,
  shouldShowOriginDebugInHub,
} from "./canonical-origin-core.mjs";
import {
  formatHubWalletDebugCopyBlock,
  formatHubWalletDebugHubLine,
  gatherHubWalletDebugSnapshot,
} from "./device-hub-wallet-debug-core.mjs";
import { fetchResolverHealthBuild } from "./device-network-health.mjs";
import { resolverApiOrigin } from "./hc-sign.mjs";

const STAMP_ID = "device-hub-build-stamp";
const SITE_LABEL_ID = "device-hub-build-stamp-site";
const WORKER_LABEL_ID = "device-hub-build-stamp-worker";
const ORIGIN_LABEL_ID = "device-hub-build-stamp-origin";
const WALLET_DEBUG_LABEL_ID = "device-hub-build-stamp-wallet-debug";
const COPY_ID = "device-hub-build-stamp-copy";

/** @type {import("./build-meta-browser.mjs").WorkerBuildMeta | null} */
let cachedWorkerBuild = null;

/**
 * @param {ParentNode} hubRoot
 * @param {import("./build-meta-browser.mjs").SiteBuildMeta} [meta]
 */
export function mountHubBuildStamp(hubRoot, meta = SITE_BUILD_META) {
  const body =
    hubRoot.querySelector("#device-hub-body") ||
    hubRoot.querySelector(".device-hub-body");
  if (!body) return;

  let stamp = body.querySelector(`#${STAMP_ID}`);
  if (!stamp) {
    stamp = document.createElement("div");
    stamp.id = STAMP_ID;
    stamp.className = "device-hub-build-stamp";
    stamp.hidden = true;
    stamp.innerHTML = `
      <p class="device-hub-build-stamp-eyebrow">Build (debug)</p>
      <p class="device-hub-build-stamp-line" id="${SITE_LABEL_ID}"></p>
      <p class="device-hub-build-stamp-line device-hub-build-stamp-line--origin" id="${ORIGIN_LABEL_ID}"></p>
      <p class="device-hub-build-stamp-line device-hub-build-stamp-line--wallet-debug" id="${WALLET_DEBUG_LABEL_ID}"></p>
      <p class="device-hub-build-stamp-line device-hub-build-stamp-line--worker" id="${WORKER_LABEL_ID}"></p>
      <button type="button" class="device-hub-build-stamp-copy" id="${COPY_ID}">
        Copy build info
      </button>
    `;
    const anchor = body.querySelector("#device-hub-status-key");
    if (anchor) {
      body.insertBefore(stamp, anchor);
    } else {
      body.append(stamp);
    }

    const copyBtn = stamp.querySelector(`#${COPY_ID}`);
    if (copyBtn instanceof HTMLButtonElement) {
      copyBtn.addEventListener("click", () => {
        void copyBuildStamp(meta, copyBtn);
      });
    }
  }

  const enabled = isSiteDebugEnabled(location, localStorage);
  stamp.hidden = !enabled;

  const siteLabel = stamp.querySelector(`#${SITE_LABEL_ID}`);
  if (siteLabel) {
    siteLabel.textContent = formatSiteBuildHubLabel(meta);
  }

  const originLabel = stamp.querySelector(`#${ORIGIN_LABEL_ID}`);
  if (originLabel) {
    originLabel.hidden = !shouldShowOriginDebugInHub(location);
    originLabel.textContent = formatOriginDebugHubLine(location);
  }

  const walletDebugLabel = stamp.querySelector(`#${WALLET_DEBUG_LABEL_ID}`);
  if (walletDebugLabel) {
    walletDebugLabel.textContent = formatHubWalletDebugHubLine(readHubWalletDebugSnapshot());
  }

  if (enabled) {
    void refreshWorkerBuildLine(stamp);
  } else {
    cachedWorkerBuild = null;
    const workerLabel = stamp.querySelector(`#${WORKER_LABEL_ID}`);
    if (workerLabel) workerLabel.textContent = "";
  }
}

/**
 * @param {HTMLElement} stamp
 */
async function refreshWorkerBuildLine(stamp) {
  const workerLabel = stamp.querySelector(`#${WORKER_LABEL_ID}`);
  if (!workerLabel) return;

  workerLabel.textContent = "Worker …";
  cachedWorkerBuild = await fetchResolverHealthBuild(resolverApiOrigin());
  workerLabel.textContent = cachedWorkerBuild
    ? formatWorkerBuildHubLabel(cachedWorkerBuild)
    : "Worker (health unavailable)";
}

/**
 * @param {import("./build-meta-browser.mjs").SiteBuildMeta} meta
 * @param {HTMLButtonElement} button
 */
async function copyBuildStamp(meta, button) {
  const stamp = button.closest(`#${STAMP_ID}`);
  if (stamp instanceof HTMLElement && isSiteDebugEnabled(location, localStorage)) {
    await refreshWorkerBuildLine(stamp);
  }
  const text = [
    formatCombinedBuildCopyText(meta, cachedWorkerBuild, location.pathname),
    formatHubWalletDebugCopyBlock(readHubWalletDebugSnapshot()),
  ].join("\n");
  const previous = button.textContent;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      throw new Error("clipboard_unavailable");
    }
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = previous;
    }, 1500);
  } catch {
    button.textContent = "Copy failed";
    window.setTimeout(() => {
      button.textContent = previous;
    }, 1500);
    console.info("[humanity] build stamp\n" + text);
  }
}

function readHubWalletDebugSnapshot() {
  /** @type {string | null} */
  let walletRaw = null;
  /** @type {string | null} */
  let summaryRaw = null;
  /** @type {string | null} */
  let createdRaw = null;
  /** @type {string | null} */
  let autoSaveFailed = null;
  /** @type {string | null} */
  let persistFlag = null;
  /** @type {string | null} */
  let removedRaw = null;
  try {
    walletRaw = localStorage.getItem("hc_wallet");
    summaryRaw = localStorage.getItem("hc_wallet_summary");
    persistFlag = localStorage.getItem("hc_storage_persist_requested_v1");
    removedRaw = localStorage.getItem("hc_wallet_removed_profile_ids");
  } catch {
    /* private mode */
  }
  try {
    createdRaw = sessionStorage.getItem("hc_created");
    autoSaveFailed = sessionStorage.getItem("hc_auto_save_failed");
  } catch {
    /* private mode */
  }
  let standalone = false;
  try {
    standalone = matchMedia("(display-mode: standalone)").matches;
  } catch {
    /* ignore */
  }
  return gatherHubWalletDebugSnapshot({
    walletRaw,
    summaryRaw,
    createdRaw,
    autoSaveFailed,
    persistFlag,
    removedRaw,
    standalone,
    origin: location.origin,
  });
}
