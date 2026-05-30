/**
 * Live object card on /created/ — owner Register A mirror of scan hierarchy.
 * @see docs/MERCH_VISUAL_CHOREOGRAPHY.md § Beat 4–5
 */
import {
  CREATED_LIVE_OBJECT_LIMIT_TEASER,
  CREATED_LIVE_OBJECT_SETTLED_CLASS,
  createdLiveObjectStatusChipLabel,
} from "./created-live-object-card-core.mjs";
import { runCreatedLiveObjectArrive } from "./created-live-object-arrive.mjs";
import { runCreatedLivePublishPulse } from "./created-live-publish-pulse.mjs";

/**
 * @param {{
 *   getCardStatusText?: () => string,
 *   getHandle?: () => string | null | undefined,
 *   getManifestoLine?: () => string | null | undefined,
 *   formatManifestoTeaser?: (line: string | null | undefined) => string,
 *   getMetaLine?: () => string,
 * }} opts
 */
export function initCreatedLiveObjectCard(opts) {
  const cardEl = document.getElementById("created-live-object-card");
  const statusChipEl = document.getElementById("created-live-object-status-chip");
  const messageEl = document.getElementById("created-live-manifesto-teaser");
  const limitEl = document.getElementById("created-live-object-limit");
  const handleEl = document.getElementById("created-live-object-handle");
  const metaEl = document.getElementById("created-live-object-meta");

  if (!cardEl) {
    return {
      syncContent: () => {},
      onPublished: () => {},
      maybeRunArrive: async () => {},
    };
  }

  if (limitEl && !limitEl.textContent?.trim()) {
    limitEl.textContent = CREATED_LIVE_OBJECT_LIMIT_TEASER;
  }

  let arriveStarted = false;

  function workspaceVisible() {
    const mode = document.body.dataset.createdMode;
    return mode === "control" || mode === "view";
  }

  function syncContent() {
    const label = createdLiveObjectStatusChipLabel(opts.getCardStatusText?.() ?? "");
    if (statusChipEl) {
      if (label) {
        statusChipEl.textContent = label;
        statusChipEl.hidden = false;
      } else {
        statusChipEl.hidden = true;
      }
    }

    const rawHandle = opts.getHandle?.();
    const handleText =
      typeof rawHandle === "string" && rawHandle.trim()
        ? rawHandle.trim().startsWith("@")
          ? rawHandle.trim()
          : `@${rawHandle.trim()}`
        : "";
    if (handleEl) {
      handleEl.textContent = handleText;
      handleEl.hidden = !handleText;
    }

    const teaser = opts.formatManifestoTeaser?.(opts.getManifestoLine?.()) ?? "";
    if (messageEl) {
      messageEl.textContent = teaser;
      messageEl.hidden = !teaser;
    }

    const meta = opts.getMetaLine?.() ?? "";
    if (metaEl) {
      metaEl.textContent = meta;
      metaEl.hidden = !meta;
    }
  }

  async function maybeRunArrive() {
    if (!workspaceVisible() || arriveStarted) return;
    if (cardEl.classList.contains(CREATED_LIVE_OBJECT_SETTLED_CLASS)) {
      arriveStarted = true;
      return;
    }
    arriveStarted = true;
    syncContent();
    await runCreatedLiveObjectArrive(cardEl);
  }

  function onPublished() {
    syncContent();
    runCreatedLivePublishPulse(cardEl);
  }

  function onQrReady() {
    syncContent();
    void maybeRunArrive();
  }

  window.addEventListener("hc-created-qr-ready", onQrReady);
  window.addEventListener("hc-created-live-cta-sync", syncContent);

  syncContent();

  return { syncContent, onPublished, maybeRunArrive };
}
