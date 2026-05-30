/**
 * Post-create setup wizard (Phase 1–2 protect gate).
 * @see docs/CARD_WORKSPACE_UX.md · docs/OWNERSHIP_RESTORE_UX_PLAN.md
 */

import { mountKeysCustody } from "./device-keys-custody.mjs";
import { isAutoSaveEnabled, isAutoSaveFailed } from "./device-auto-save.mjs";
import { shouldShowSessionOnlyOwnershipWarning } from "./device-ownership-notice-core.mjs";
import { findWalletEntryByProfileId, isWalletSaved } from "./device-wallet.mjs";
import { isSetupDone } from "./created-mode.mjs";
import { ownershipBackupSeatbeltSatisfied } from "./created-first-session-gate-core.mjs";
import {
  setupMinStepIndex,
  setupProgressKicker,
  shouldOmitSetupSaveStep,
} from "./created-setup-core.mjs";
import { clearFreshUrlParam } from "./created-workspace.mjs";
import { markSetupDone } from "./created-mode.mjs";
import { stewardFocusKeyFromHash } from "./created-tabs.mjs";
import { SETUP_STEP_IDS, setupStepIndexFromHash } from "./created-setup-hash.mjs";
import {
  initCreatedSetupSeatbelt,
} from "./created-setup-seatbelt.mjs";
import {
  shouldAutoAdvanceSetupTestScan,
  stewardScanOpenedFeedback,
} from "./pwa-scan-handoff-core.mjs";
import { openStewardScanPreviewFromWindow } from "./pwa-scan-handoff.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";

const STEPS = SETUP_STEP_IDS;

/**
 * @param {{
 *   profileId: string,
 *   runSave?: () => boolean | null,
 *   refreshSave?: () => void,
 *   getScanUrl?: () => string | null,
 *   getSession?: () => Record<string, unknown> | null,
 *   setSession?: (next: Record<string, unknown>) => void,
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
    getSession = () => null,
    setSession = () => {},
    onComplete,
    onStewardDeepLink,
    triggerDownloadQr,
  } = opts;

  const root = document.getElementById("created-setup-root");
  if (!root) return;

  const stewardFocus = stewardFocusKeyFromHash();
  if (stewardFocus && isWalletSaved(profileId) && onStewardDeepLink) {
    const walletEntry = findWalletEntryByProfileId(profileId);
    if (
      isSetupDone(profileId) ||
      ownershipBackupSeatbeltSatisfied(getSession(), walletEntry)
    ) {
      onStewardDeepLink();
      return;
    }
  }

  const panels = [...root.querySelectorAll("[data-setup-panel]")];
  const indicators = [...root.querySelectorAll("[data-setup-step]")];
  const backBtn = document.getElementById("created-setup-back");
  const continueBtn = document.getElementById("created-setup-continue");
  const feedbackEl = document.getElementById("created-setup-feedback");
  const keysStrip = document.getElementById("created-keys-strip");
  const keysMount = document.getElementById("created-setup-keys-mount");
  const custodyMount = document.getElementById("device-keys-custody-created-setup");
  const qrPreviewWrap = document.getElementById("created-setup-qr-preview");
  const setupQrImg = document.getElementById("created-setup-qr-img");
  const doneBtn = document.getElementById("created-setup-finish");
  const progressKicker = root.querySelector(".created-setup-kicker");
  const saveProgressItem = root.querySelector('[data-setup-step="save"]');

  function omitSaveStepNow() {
    return shouldOmitSetupSaveStep({
      savedOnDevice: isWalletSaved(profileId),
      autoSaveEnabled: isAutoSaveEnabled(),
      autoSaveFailed: isAutoSaveFailed(profileId),
    });
  }

  function minStepIndexNow() {
    return setupMinStepIndex(omitSaveStepNow());
  }

  function syncSetupProgressChrome() {
    const omit = omitSaveStepNow();
    if (progressKicker) {
      progressKicker.textContent = setupProgressKicker(omit);
    }
    if (saveProgressItem) {
      saveProgressItem.hidden = omit;
      saveProgressItem.setAttribute("aria-hidden", omit ? "true" : "false");
    }
  }

  syncSetupProgressChrome();

  function seatbeltSatisfiedNow() {
    return ownershipBackupSeatbeltSatisfied(
      getSession(),
      findWalletEntryByProfileId(profileId)
    );
  }

  const seatbeltCtl = initCreatedSetupSeatbelt({
    profileId,
    getSession,
    setSession,
    onSeatbeltChange: () => {
      syncSeatbeltContinue();
      refreshSave?.();
    },
  });

  function syncSeatbeltContinue() {
    if (!continueBtn || currentStep() !== "protect") return;
    const ok = seatbeltSatisfiedNow();
    continueBtn.disabled = !ok;
    continueBtn.setAttribute("aria-disabled", ok ? "false" : "true");
  }

  function syncSetupKeysCustody() {
    if (!custodyMount) return;
    const saved = isWalletSaved(profileId);
    const card = custodyMount.querySelector(".device-keys-custody--created");
    if (saved) {
      card?.remove();
      return;
    }
    const showWarn = shouldShowSessionOnlyOwnershipWarning({
      hasTabControl: true,
      savedOnDevice: saved,
      autoSaveEnabled: isAutoSaveEnabled(),
      autoSaveFailed: isAutoSaveFailed(profileId),
    });
    if (!showWarn) {
      card?.remove();
      return;
    }
    if (!card) {
      mountKeysCustody(custodyMount, "created", { importHref: "/wallet/#import" });
    }
  }

  syncSetupKeysCustody();

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
  /** Browser test-scan opens `_blank`; second Continue advances without re-opening (P0b-2). */
  let testScanPreviewOpened = false;

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
      backBtn.hidden = stepIndex <= minStepIndexNow();
      backBtn.disabled = stepIndex <= minStepIndexNow();
    }
    if (continueBtn) {
      continueBtn.hidden = step === "done";
      if (step === "protect") syncSeatbeltContinue();
      else {
        continueBtn.disabled = false;
        continueBtn.removeAttribute("aria-disabled");
      }
    }
    if (doneBtn) doneBtn.hidden = step !== "done";
    if (step === "protect") seatbeltCtl?.refresh?.();
  }

  function canLeaveSaveStep() {
    return isWalletSaved(profileId);
  }

  function goToStep(index, { pushHistory = false } = {}) {
    const prevStep = currentStep();
    stepIndex = Math.max(minStepIndexNow(), Math.min(index, STEPS.length - 1));
    if (currentStep() === "test" && prevStep !== "test") {
      testScanPreviewOpened = false;
    }
    if (prevStep === "test" && currentStep() !== "test") {
      testScanPreviewOpened = false;
    }
    syncIndicators();
    if (currentStep() === "save" && keysStrip) {
      keysStrip.hidden = false;
    }
    if (currentStep() === "qr") syncSetupQrPreview();
    if (currentStep() === "protect") {
      seatbeltCtl?.refresh?.();
      syncSeatbeltContinue();
    }
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
      const standalone = readStandaloneModeFromWindow(window);
      if (testScanPreviewOpened && !shouldAutoAdvanceSetupTestScan(standalone)) {
        goToStep(stepIndex + 1, { pushHistory: true });
        return;
      }
      if (!openStewardScanPreviewFromWindow(url, { setupWizard: true })) {
        showFeedback("Scan link is not ready yet.", true);
        return;
      }
      testScanPreviewOpened = true;
      showFeedback(stewardScanOpenedFeedback(standalone, { setupWizard: true }));
      if (shouldAutoAdvanceSetupTestScan(standalone)) {
        goToStep(stepIndex + 1, { pushHistory: true });
      }
      return;
    }
    if (step === "protect") {
      if (!seatbeltSatisfiedNow()) {
        showFeedback(seatbeltCtl?.blockMessage?.() ?? "Save a recovery path first.", true);
        syncSeatbeltContinue();
        return;
      }
      goToStep(stepIndex + 1, { pushHistory: true });
    }
  }

  function complete() {
    if (!seatbeltSatisfiedNow()) {
      showFeedback(seatbeltCtl?.blockMessage?.() ?? "Save a recovery path first.", true);
      const protectIdx = STEPS.indexOf("protect");
      if (protectIdx >= 0) goToStep(protectIdx);
      return;
    }
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
    if (stepIndex <= minStepIndexNow()) return;
    goToStep(stepIndex - 1);
  });

  window.addEventListener("popstate", (event) => {
    if (root.hidden) return;
    const nextStep = event.state?.setupStep;
    if (typeof nextStep === "number" && event.state?.setup) {
      let idx = Math.max(minStepIndexNow(), Math.min(nextStep, STEPS.length - 1));
      if (idx > STEPS.indexOf("protect") && !seatbeltSatisfiedNow()) {
        idx = STEPS.indexOf("protect");
      }
      stepIndex = idx;
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
        "Ownership not loaded in this tab. Finish create in this tab first.",
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
    if (!url || !url.startsWith("http")) {
      showFeedback("Scan link is not ready yet.", true);
      return;
    }
    const standalone = readStandaloneModeFromWindow(window);
    if (!openStewardScanPreviewFromWindow(url, { setupWizard: true })) {
      showFeedback("Scan link is not ready yet.", true);
      return;
    }
    showFeedback(stewardScanOpenedFeedback(standalone, { setupWizard: true }));
  });

  window.addEventListener("hc-device-hub-changed", () => {
    syncSetupKeysCustody();
    syncSetupProgressChrome();
    if (currentStep() === "save") syncIndicators();
    if (omitSaveStepNow() && stepIndex < minStepIndexNow()) {
      goToStep(minStepIndexNow());
    }
  });
  window.addEventListener("hc-created-qr-ready", syncSetupQrPreview);

  const hashStep = setupStepIndexFromHash(location.hash);
  if (hashStep != null) {
    let idx = hashStep > 0 && !canLeaveSaveStep() ? 0 : hashStep;
    if (idx > STEPS.indexOf("protect") && !setupOwnershipSeatbeltSatisfied(getSession())) {
      idx = STEPS.indexOf("protect");
    }
    stepIndex = Math.max(minStepIndexNow(), idx);
  } else if (canLeaveSaveStep() || omitSaveStepNow()) {
    stepIndex = Math.max(1, minStepIndexNow());
  }
  syncIndicators();
  if (currentStep() === "qr") syncSetupQrPreview();
  writeStepHistory(true);
}
