/**
 * Floating shell chrome inset (minimal dot + Create bar).
 * @see docs/SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md — Phase 1.2–1.3
 */
import { shouldAttachDocumentScrollChromeEffects } from "./device-shell-chrome-core.mjs";

const chrome = document.getElementById("top-chrome");

/** Largest measured chrome bar height — never shrink (avoids scroll jump). */
let chromeInsetFloor = 0;

export function syncShellChromeInset() {
  if (!chrome) return;
  const bar = chrome.querySelector(".top-chrome-bar");
  const h = Math.ceil((bar || chrome).getBoundingClientRect().height);
  if (h > chromeInsetFloor) chromeInsetFloor = h;
  document.documentElement.style.setProperty("--shell-chrome-h", `${chromeInsetFloor}px`);
}

function initScrollEdgeChrome() {
  if (!chrome) return;
  if (!shouldAttachDocumentScrollChromeEffects()) return;

  const bar = chrome.querySelector(".top-chrome-bar");
  if (!bar) return;

  let lastY = window.scrollY;
  let ticking = false;
  let scrollIdleTimer = null;
  let edgeHidden = false;
  const threshold = 36;
  const scrollIdleMs = 120;
  const hideDeltaPx = 10;
  const showDeltaPx = 10;
  const bottomGuardPx = 72;

  const markScrolling = () => {
    document.body.classList.add("shell-is-scrolling");
    if (scrollIdleTimer) clearTimeout(scrollIdleTimer);
    scrollIdleTimer = window.setTimeout(() => {
      document.body.classList.remove("shell-is-scrolling");
      scrollIdleTimer = null;
    }, scrollIdleMs);
  };

  const setEdgeHidden = (next) => {
    if (edgeHidden === next) return;
    edgeHidden = next;
    chrome.classList.toggle("top-chrome--edge-hidden", next);
  };

  const maxScrollY = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  const update = () => {
    ticking = false;
    if (
      document.body.classList.contains("device-hub-sheet-open") ||
      chrome.classList.contains("top-chrome--hub-locked")
    ) {
      return;
    }
    const y = window.scrollY;
    const nearTop = y <= threshold;
    const nearBottom = y >= maxScrollY() - bottomGuardPx;

    if (nearTop) {
      setEdgeHidden(false);
    } else if (!nearBottom) {
      if (!edgeHidden && y > lastY + hideDeltaPx && y > threshold) {
        setEdgeHidden(true);
      } else if (edgeHidden && y < lastY - showDeltaPx) {
        setEdgeHidden(false);
      }
    }
    lastY = y;
  };

  window.addEventListener(
    "scroll",
    () => {
      markScrolling();
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
}

export function initShellChrome() {
  if (!chrome) return;
  document.body.classList.add("has-shell-chrome");
  const scrollEffects = shouldAttachDocumentScrollChromeEffects();
  if (!scrollEffects) {
    document.body.classList.add("shell-scroll-chrome-off");
    syncShellChromeInset();
    return;
  }
  syncShellChromeInset();
  initScrollEdgeChrome();
  window.addEventListener("resize", syncShellChromeInset);
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => syncShellChromeInset());
    ro.observe(chrome);
  }
}

initShellChrome();
