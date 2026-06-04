/**
 * WS-NOTIF N3 — foreground U0 attention strip on steward shell pages.
 * @see docs/NOTIFICATION_SYSTEM_V2.md
 */
import {
  emphasisCardActionsHtml,
  emphasisCardBodyHtml,
  emphasisCardCtaButton,
  escapeEmphasisHtml,
} from "./device-emphasis-card-html.mjs?v=94";
import { getInboxItems } from "./device-inbox.mjs?v=94";
import { buildForegroundAttentionStripModel } from "./device-foreground-attention-core.mjs?v=94";
import { openLiveControlProof } from "./device-live-control-inbox.mjs?v=94";
import { openInboxFromChrome } from "./device-inbox-sheet-loader.mjs?v=94";

const strip = document.getElementById("device-foreground-attention");

function clearForegroundAttentionStrip() {
  if (!strip) return;
  strip.hidden = true;
  strip.innerHTML = "";
  strip.classList.remove(
    "device-foreground-attention",
    "hc-emphasis-card",
    "hc-emphasis-card--urgent"
  );
}

function shouldSkipForegroundStrip() {
  return document.body?.classList.contains("device-shell-created");
}

export function renderForegroundAttentionStrip() {
  if (!strip || shouldSkipForegroundStrip()) {
    clearForegroundAttentionStrip();
    return;
  }

  const tabVisible = document.visibilityState === "visible";
  const model = buildForegroundAttentionStripModel(getInboxItems(), { tabVisible });
  if (!model.visible || !model.kind) {
    clearForegroundAttentionStrip();
    return;
  }

  strip.hidden = false;
  strip.className =
    "device-foreground-attention hc-emphasis-card hc-emphasis-card--urgent";
  strip.innerHTML = emphasisCardBodyHtml({
    eyebrow: model.eyebrow ?? "",
    title: model.title ?? "",
    detail: escapeEmphasisHtml(model.detail ?? ""),
    dot: "urgent",
    actionsHtml: emphasisCardActionsHtml([
      emphasisCardCtaButton(model.ctaLabel ?? "Open", "data-foreground-attention-cta"),
    ]),
  });

  const cta = strip.querySelector("[data-foreground-attention-cta]");
  cta?.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      if (model.kind === "live_proof" && model.proofItem) {
        void openLiveControlProof(model.proofItem);
        return;
      }
      if (model.openInboxOnClick) {
        openInboxFromChrome("foreground_strip");
      }
    },
    { once: true }
  );
}

function bindForegroundAttentionRefresh() {
  window.addEventListener("hc-device-hub-changed", renderForegroundAttentionStrip);
  window.addEventListener("hc-live-control-inbox-changed", renderForegroundAttentionStrip);
  window.addEventListener("hc-relay-offer-inbox-changed", renderForegroundAttentionStrip);
  document.addEventListener("visibilitychange", renderForegroundAttentionStrip);
}

if (strip) {
  renderForegroundAttentionStrip();
  bindForegroundAttentionRefresh();
}
