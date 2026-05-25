/**
 * Fixed shell chrome: content scrolls underneath; status row collapses on scroll down.
 */
const chrome = document.getElementById("top-chrome");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let lastScrollY = 0;
let compact = false;

export function syncShellChromeInset() {
  if (!chrome) return;
  const h = chrome.getBoundingClientRect().height;
  document.documentElement.style.setProperty("--shell-chrome-h", `${Math.ceil(h)}px`);
}

function setCompact(next) {
  if (!chrome || compact === next) return;
  compact = next;
  chrome.classList.toggle("top-chrome--compact", next);
  syncShellChromeInset();
}

function onScroll() {
  if (!chrome) return;
  const y = window.scrollY;
  if (y <= 6) {
    setCompact(false);
  } else if (y > lastScrollY + 3) {
    setCompact(true);
  } else if (y < lastScrollY - 3) {
    setCompact(false);
  }
  lastScrollY = y;
}

export function initShellChrome() {
  if (!chrome) return;
  document.body.classList.add("has-shell-chrome");
  syncShellChromeInset();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", syncShellChromeInset);
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => syncShellChromeInset());
    ro.observe(chrome);
  }
}

initShellChrome();
