/**
 * Floating shell chrome inset (minimal dot + Create bar).
 */
const chrome = document.getElementById("top-chrome");

export function syncShellChromeInset() {
  if (!chrome) return;
  const bar = chrome.querySelector(".top-chrome-bar");
  const h = (bar || chrome).getBoundingClientRect().height;
  document.documentElement.style.setProperty("--shell-chrome-h", `${Math.ceil(h)}px`);
}

function initScrollEdgeChrome() {
  if (!chrome) return;
  const bar = chrome.querySelector(".top-chrome-bar");
  if (!bar) return;

  let lastY = window.scrollY;
  let ticking = false;
  let scrollIdleTimer = null;
  const threshold = 36;
  const scrollIdleMs = 120;

  const markScrolling = () => {
    document.body.classList.add("shell-is-scrolling");
    if (scrollIdleTimer) clearTimeout(scrollIdleTimer);
    scrollIdleTimer = window.setTimeout(() => {
      document.body.classList.remove("shell-is-scrolling");
      scrollIdleTimer = null;
    }, scrollIdleMs);
  };

  const update = () => {
    ticking = false;
    if (
      document.body.classList.contains("device-hub-sheet-open") ||
      chrome.classList.contains("top-chrome--hub-locked")
    ) {
      return;
    }
    const y = window.scrollY;
    const scrollingDown = y > lastY && y > threshold;
    const nearTop = y <= threshold;
    if (nearTop) {
      chrome.classList.remove("top-chrome--edge-hidden");
    } else if (scrollingDown) {
      chrome.classList.add("top-chrome--edge-hidden");
    } else {
      chrome.classList.remove("top-chrome--edge-hidden");
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
  syncShellChromeInset();
  initScrollEdgeChrome();
  window.addEventListener("resize", syncShellChromeInset);
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => syncShellChromeInset());
    ro.observe(chrome);
  }
}

initShellChrome();
