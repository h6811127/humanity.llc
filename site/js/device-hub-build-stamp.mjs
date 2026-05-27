/**
 * Debug-gated Pages build stamp in the device hub.
 * @see docs/SITE_BUILD_VERSIONING.md — Phase 2
 */
import { SITE_BUILD_META } from "./build-meta.mjs";
import {
  formatSiteBuildCopyText,
  formatSiteBuildHubLabel,
  isSiteDebugEnabled,
} from "./build-meta-core.mjs";

const STAMP_ID = "device-hub-build-stamp";
const LABEL_ID = "device-hub-build-stamp-label";
const COPY_ID = "device-hub-build-stamp-copy";

/**
 * @param {ParentNode} hubRoot
 * @param {import("./build-meta-core.mjs").SiteBuildMeta} [meta]
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
      <p class="device-hub-build-stamp-line" id="${LABEL_ID}"></p>
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

  const enabled = isSiteDebugEnabled();
  stamp.hidden = !enabled;

  const label = stamp.querySelector(`#${LABEL_ID}`);
  if (label) {
    label.textContent = formatSiteBuildHubLabel(meta);
  }
}

/**
 * @param {import("./build-meta-core.mjs").SiteBuildMeta} meta
 * @param {HTMLButtonElement} button
 */
async function copyBuildStamp(meta, button) {
  const text = formatSiteBuildCopyText(meta, location.pathname);
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
