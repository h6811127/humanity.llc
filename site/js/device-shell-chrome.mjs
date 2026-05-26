/**
 * Floating shell chrome inset (minimal dot + Create bar).
 * Document scroll-edge hide/show removed — caused landing jank and layout thrash on WebKit.
 * @see docs/UI_UX_REVERT_PLAN.md step 1
 * @see docs/SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md
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
  document.body.classList.add("shell-scroll-chrome-off");
  syncShellChromeInset();
  window.addEventListener("resize", syncShellChromeInset);
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => syncShellChromeInset());
    ro.observe(chrome);
  }
}

initShellChrome();
