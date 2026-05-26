/**
 * Post-create setup wizard (Phase 1).
 * @see docs/CARD_WORKSPACE_UX.md
 */

import { isWalletSaved } from "./device-wallet.mjs";
import { clearFreshUrlParam } from "./created-workspace.mjs";
import { markSetupDone } from "./created-mode.mjs";
import { stewardFocusKeyFromHash } from "./created-tabs.mjs";

const STEPS = ["save", "qr", "test", "done"];

/**
 * @param {{
 *   profileId: string,
 *   runSave?: () => boolean | null,
 *   refreshSave?: () => void,
 *   getScanUrl?: () => string | null,
 *   onComplete: () => void,
 *   onStewardDeepLink?: () => void,
 *   triggerDownloadQr?: () => void,
 * }} opts
 */
export function initCreatedSetup(opts) {
  const {
    profileId,
    runSave,
    refreshSave,
    getScanUrl,
    onComplete,
    onStewardDeepLink,
    triggerDownloadQr,
  } = opts;

  const root = document.getElementById("created-setup-root");
  if (!root) return;

  const stewardFocus = stewardFocusKeyFromHash();
  if (stewardFocus && isWalletSaved(profileId) && onStewardDeepLink) {
    onStewardDeepLink();
    return;
  }

  const panels = [...root.querySelectorAll("[data-setup-panel]")];
  const indicators = [...root.querySelectorAll("[data-setup-step]")];
  const backBtn = document.getElementById("created-setup-back");
  const continueBtn = document.getElementById("created-setup-continue");
  const feedbackEl = document.getElementById("created-setup-feedback");
  const keysStrip = document.getElementById("created-keys-strip");
  const keysMount = document.getElementById("created-setup-keys-mount");
  const qrPreviewWrap = document.getElementById("created-setup-qr-preview");
  const setupQrImg = document.getElementById("created-setup-qr-img");
  const doneBtn = document.getElementById("created-setup-finish");

  if (keysStrip && keysMount) {
    keysMount.appendChild(keysStrip);
    keysStrip.hidden = false;
  }

  function syncSetupQrPreview() {
    const src =
      document.getElementById("created-qr-preview-img")?.src ||
      document.getElementById("qr-img")?.src;
    if (!src || !setupQrImg || !qrPreviewWrap) return;
    setupQrImg.src = src;
    setupQrImg.alt = "Your scan QR";
    qrPreviewWrap.hidden = false;
  }

  let stepIndex = 0;
  let feedbackTimer = null;
  let liveTransitionTimer = null;

  function showFeedback(message, isError = false) {
    if (!feedbackEl) return;
    feedbackEl.hidden = false;
    feedbackEl.textContent = message;
    feedbackEl.classList.toggle("created-setup-feedback--error", isError);
    if (feedbackTimer) window.clearTimeout(feedbackTimer);
    feedbackTimer = window.setTimeout(() => {
      feedbackEl.hidden = true;
    }, isError ? 8000 : 5000);
  }

  function currentStep() {
    return STEPS[stepIndex] ?? "save";
  }

  function scrollToCurrentPanel() {
    const panel = root.querySelector(`[data-setup-panel="${currentStep()}"]`);
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function writeStepHistory(replace = true) {
    const state = { setup: true, setupStep: stepIndex };
    const url = new URL(location.href);
    url.hash = stepIndex === 0 ? "setup" : `setup-${currentStep()}`;
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    if (replace) {
      history.replaceState(state, "", nextUrl);
    } else {
      history.pushState(state, "", nextUrl);
    }
  }

  function syncIndicators() {
    const step = currentStep();
    indicators.forEach((el) => {
      const id = el.getAttribute("data-setup-step");
      const idx = STEPS.indexOf(id);
      el.classList.toggle("is-current", id === step);
      el.classList.toggle("is-done", idx >= 0 && idx < stepIndex);
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.setupPanel !== step;
    });
    if (backBtn) {
      backBtn.hidden = stepIndex === 0;
      backBtn.disabled = stepIndex === 0;
    }
    if (continueBtn) continueBtn.hidden = step === "done";
    if (doneBtn) doneBtn.hidden = step !== "done";
  }

  function canLeaveSaveStep() {
    return isWalletSaved(profileId);
  }

  function goToStep(index, { pushHistory = false } = {}) {
    const prevStep = currentStep();
    stepIndex = Math.max(0, Math.min(index, STEPS.length - 1));
    syncIndicators();
    if (currentStep() === "save" && keysStrip) {
      keysStrip.hidden = false;
    }
    if (currentStep() === "qr") syncSetupQrPreview();
    if (currentStep() === "done" && prevStep !== "done") {
      const donePanel = root.querySelector('[data-setup-panel="done"]');
      if (donePanel) {
        donePanel.classList.add("is-live-transition");
        if (liveTransitionTimer) window.clearTimeout(liveTransitionTimer);
        liveTransitionTimer = window.setTimeout(() => {
          donePanel.classList.remove("is-live-transition");
        }, 950);
      }
      showFeedback("Object now resolves live on the network.");
    }
    scrollToCurrentPanel();
    writeStepHistory(!pushHistory);
  }

  syncSetupQrPreview();

  function advance() {
    const step = currentStep();
    if (step === "save") {
      if (!canLeaveSaveStep()) {
        if (keysStrip) keysStrip.hidden = false;
        keysStrip?.scrollIntoView({ behavior: "smooth", block: "start" });
        if (runSave) {
          const saved = runSave();
          refreshSave?.();
          if (saved) {
            showFeedback("Saved on this device.");
            goToStep(stepIndex + 1, { pushHistory: true });
            return;
          }
        }
        showFeedback(
          "Save your control key on this device before continuing.",
          true
        );
        return;
      }
      goToStep(stepIndex + 1, { pushHistory: true });
      return;
    }
    if (step === "qr") {
      goToStep(stepIndex + 1, { pushHistory: true });
      return;
    }
    if (step === "test") {
      const url = getScanUrl?.();
      if (!url || !url.startsWith("http")) {
        showFeedback("Scan link is not ready yet.", true);
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      showFeedback("Opened scan page — check it from another device, then continue.");
      goToStep(stepIndex + 1, { pushHistory: true });
      return;
    }
  }

  function complete() {
    markSetupDone(profileId);
    clearFreshUrlParam();
    onComplete();
  }

  continueBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    advance();
  });

  backBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (stepIndex <= 0) return;
    goToStep(stepIndex - 1);
  });

  window.addEventListener("popstate", (event) => {
    if (root.hidden) return;
    const nextStep = event.state?.setupStep;
    if (typeof nextStep === "number" && event.state?.setup) {
      stepIndex = Math.max(0, Math.min(nextStep, STEPS.length - 1));
      syncIndicators();
      if (currentStep() === "qr") syncSetupQrPreview();
      scrollToCurrentPanel();
    }
  });

  doneBtn?.addEventListener("click", () => complete());

  root.querySelector("[data-setup-action=save]")?.addEventListener("click", () => {
    if (keysStrip) keysStrip.hidden = false;
    if (!runSave) {
      showFeedback(
        "No signing keys in this tab. Finish create in this tab first.",
        true
      );
      return;
    }
    const saved = runSave();
    refreshSave?.();
    if (saved) {
      showFeedback("Saved on this device.");
      syncIndicators();
    } else {
      showFeedback("Could not save yet. Check the form above.", true);
    }
  });

  root.querySelector("[data-setup-action=download-qr]")?.addEventListener("click", () => {
    if (triggerDownloadQr) {
      triggerDownloadQr();
      showFeedback("Downloading QR image…");
    } else {
      showFeedback("QR download is not ready yet.", true);
    }
  });

  root.querySelector("[data-setup-action=test-scan]")?.addEventListener("click", () => {
    const url = getScanUrl?.();
    if (url && url.startsWith("http")) {
      window.open(url, "_blank", "noopener,noreferrer");
      showFeedback("Opened scan page in a new tab.");
    } else {
      showFeedback("Scan link is not ready yet.", true);
    }
  });

  window.addEventListener("hc-device-hub-changed", () => {
    if (currentStep() === "save") syncIndicators();
  });
  window.addEventListener("hc-created-qr-ready", syncSetupQrPreview);

  if (canLeaveSaveStep()) {
    stepIndex = 1;
  }
  syncIndicators();
  if (currentStep() === "qr") syncSetupQrPreview();
  writeStepHistory(true);
}
