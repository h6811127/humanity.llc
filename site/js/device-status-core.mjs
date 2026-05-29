/**
 * Minimal status dot + hub opener (loads before device-status.mjs).
 * @see docs/STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md § P2 Step 2
 * @see docs/STATUS_INDICATOR_STEWARD_GREEN.md
 */
import { DEVICE_SHELL_ASSET_VERSION } from "./device-status-shell-modules.mjs";
import { loadWalletSummary } from "./device-wallet.mjs";
import {
  dotClassList,
  dotPageKindFromPathname,
  dotStateKey,
  deviceStateFromContext,
  statusAriaLabel,
  SHELL_DOT_NEUTRAL_EMPTY_CLASS,
  shellDotUsesNeutralEmptyWallet,
} from "./device-dot-state-core.mjs?v=67";
import { logDotDiagnostic } from "./device-dot-diagnostics.mjs";
import { closeInboxSheet } from "./device-inbox-sheet-loader.mjs?v=67";
import { syncInboxBackdropForOpenHub } from "./device-sheet-backdrop-sync.mjs?v=67";

export const DOT_STATE_CHANGED = "hc-dot-state-changed";

const HUB_OPEN_KEY = "hc_hub_open";

const NETWORK_CLASSES = [
  "pass-dot-status-network-ok",
  "pass-dot-status-network-degraded",
  "pass-dot-status-network-offline",
];
const DEVICE_CLASSES = [
  "pass-dot-status-device-none",
  "pass-dot-status-device-keys",
  "pass-dot-status-device-unsaved",
  "pass-dot-status-device-steward",
];
const OVERLAY_CLASSES = [
  "pass-dot-overlay-none",
  "pass-dot-overlay-proof_waiting",
  "pass-dot-overlay-cross_tab_keys",
  "pass-dot-overlay-card_disabled_since_visit",
];

const dotBtn = document.getElementById("brand-status-dot-btn");
const dot = document.getElementById("brand-status-dot");
const hub = document.getElementById("device-hub");

let networkStatus = "offline";

/** @type {Promise<typeof import("./device-hub-sheet.mjs")> | null} */
let hubSheetModulePromise = null;

/** @type {((open: boolean) => void) | null} */
let onHubExpandedHook = null;

function loadHubSheetModule() {
  if (!hubSheetModulePromise) {
    hubSheetModulePromise = import(`./device-hub-sheet.mjs?v=${DEVICE_SHELL_ASSET_VERSION}`);
  }
  return hubSheetModulePromise;
}

export function getNetworkStatus() {
  return networkStatus;
}

/** @param {"ok" | "degraded" | "offline"} status */
export function setNetworkStatus(status) {
  networkStatus = status;
}

/** @param {(open: boolean) => void} fn */
export function setHubExpandedHook(fn) {
  onHubExpandedHook = fn;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hapticTap() {
  try {
    navigator.vibrate?.(1);
  } catch {
    /* ignore */
  }
}

function isWalletPage() {
  return document.body.classList.contains("page-wallet");
}

function closeGlancePopoverMinimal() {
  const root =
    document.getElementById("device-hub-glance-popover") ||
    document.getElementById("wallet-hub-glance-popover");
  if (root) root.hidden = true;
  document.body.classList.remove("device-glance-popover-open");
}

function deviceStateForCore() {
  const summary = loadWalletSummary();
  return deviceStateFromContext({
    unsavedTabKeys: false,
    stewardReady: summary.stewardReady,
    savedWalletCount: summary.count,
  });
}

/** Minimal dot paint before full status module loads (overlay none). */
export function applyCoreDot() {
  if (!dot) return;
  const device = deviceStateForCore();
  const overlay = "none";
  const savedWalletCount = loadWalletSummary().count;
  const shellNeutralEmpty = shellDotUsesNeutralEmptyWallet({
    network: networkStatus,
    device,
    overlay,
    savedWalletCount,
  });
  dot.classList.remove(
    ...NETWORK_CLASSES,
    ...DEVICE_CLASSES,
    ...OVERLAY_CLASSES,
    SHELL_DOT_NEUTRAL_EMPTY_CLASS
  );
  for (const cls of dotClassList(networkStatus, device, overlay)) {
    dot.classList.add(cls);
  }
  if (shellNeutralEmpty) {
    dot.classList.add(SHELL_DOT_NEUTRAL_EMPTY_CLASS);
  }
  const dotState = dotStateKey(networkStatus, device);
  dot.dataset.dotState = dotState;
  dot.dataset.dotOverlay = overlay;
  dotBtn?.setAttribute("data-dot-state", dotState);
  dotBtn?.setAttribute("data-dot-overlay", overlay);
  dotBtn?.setAttribute(
    "aria-label",
    statusAriaLabel(networkStatus, device, overlay, {
      pageKind: dotPageKindFromPathname(location.pathname, { isWalletPage: isWalletPage() }),
    })
  );
}

export function hubSheetOpen() {
  if (hub?.classList.contains("device-hub-collapsed")) {
    return false;
  }
  return (
    document.body.classList.contains("device-hub-sheet-open") ||
    (hub && !hub.classList.contains("device-hub-collapsed"))
  );
}

export function setHubExpanded(open, { persist = true, haptic = false } = {}) {
  if (!hub) return;
  if (open) {
    closeGlancePopoverMinimal();
    syncInboxBackdropForOpenHub();
    closeInboxSheet();
  }
  void loadHubSheetModule().then((mod) => {
    if (mod.isHubSheet()) {
      mod.setHubSheetOpen(open);
    } else {
      hub.classList.toggle("device-hub-collapsed", !open);
      window.dispatchEvent(new Event("hc-live-control-poll-scope-changed"));
    }
    if (dotBtn) dotBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (persist) {
      sessionStorage.setItem(HUB_OPEN_KEY, open ? "1" : "0");
    }
    if (haptic) {
      hapticTap();
      logDotDiagnostic({
        type: "hub_toggle",
        open,
        bodyOpen: document.body.classList.contains("device-hub-sheet-open"),
        hubCollapsed: hub?.classList.contains("device-hub-collapsed") ?? null,
      });
    }
    onHubExpandedHook?.(open);
  });
}

function scrollWalletToSaved() {
  const target =
    document.getElementById("device-hub-saved-group") ||
    document.getElementById("wallet-page");
  target?.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
}

function openWalletFromChrome() {
  closeGlancePopoverMinimal();
  scrollWalletToSaved();
  hapticTap();
}

export function openHubFromChrome() {
  closeGlancePopoverMinimal();
  if (isWalletPage()) {
    openWalletFromChrome();
    return;
  }
  if (!hub) {
    location.href = "/";
    return;
  }
  hapticTap();
  if (hubSheetOpen()) {
    setHubExpanded(false, { haptic: true, persist: false });
    return;
  }
  setHubExpanded(true, { haptic: true, persist: false });
}

function wireDotAndHub() {
  if (hub) {
    sessionStorage.setItem(HUB_OPEN_KEY, "0");
    void loadHubSheetModule().then((mod) => {
      setHubExpanded(false, { persist: false });
      mod.reconcileHubSheetState();
    });
  }

  dotBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    logDotDiagnostic({ type: "dot_click" });
    openHubFromChrome();
  });

  window.addEventListener("hc-hub-sheet-close", () => {
    if (!hub) return;
    setHubExpanded(false, { haptic: false, persist: false });
  });

  applyCoreDot();
}

wireDotAndHub();
