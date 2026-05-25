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

export function initShellChrome() {
  if (!chrome) return;
  document.body.classList.add("has-shell-chrome");
  syncShellChromeInset();
  window.addEventListener("resize", syncShellChromeInset);
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => syncShellChromeInset());
    ro.observe(chrome);
  }
}

initShellChrome();
