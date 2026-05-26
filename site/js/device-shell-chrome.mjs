/**
 * Floating shell chrome inset (minimal dot + Create bar).
 * Document scroll-edge hide/show removed - caused landing jank and layout thrash on WebKit.
 * Shell pages ship `has-shell-chrome` on `<body>` in HTML (`/`, `/create/`, `/wallet/`) so
 * `.page` gets `padding-top: var(--shell-chrome-h)` on first paint (`:root` calc matches
 * the minimal bar); this module measures bar height and only increases the inset (floor).
 * @see docs/UI_UX_SAFE_REBUILD_IMPLEMENTATION.md Step 5
 * @see docs/UI_UX_REVERTED_FEATURES_CATALOG.md §5
 */
const chrome = document.getElementById("top-chrome");

/** Largest measured chrome bar height - never shrink (avoids scroll jump). */
let chromeInsetFloor = 0;

function chromeInsetPx() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--shell-chrome-h").trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

export function syncShellChromeInset() {
  if (!chrome) return;
  const bar = chrome.querySelector(".top-chrome-bar");
  const h = Math.ceil((bar || chrome).getBoundingClientRect().height);
  if (h > chromeInsetFloor) chromeInsetFloor = h;
  if (chromeInsetFloor > chromeInsetPx()) {
    document.documentElement.style.setProperty("--shell-chrome-h", `${chromeInsetFloor}px`);
  }
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
