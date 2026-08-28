/**
 * WS-DOCKET chapter pins field kit.
 */
import {
  DOCKET_CHAPTER_PINS_KIT_REL,
  DOCKET_CHAPTER_PINS_PAGE_PATH,
  docketChapterPinsV0Steps,
} from "../../site/js/docket-chapter-discovery-core.mjs";

export { DOCKET_CHAPTER_PINS_KIT_REL };

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {{ origin?: string }} [opts]
 */
export function buildWsDocketChapterPinsKitHtml(opts = {}) {
  const origin = (opts.origin ?? "http://127.0.0.1:8788").replace(/\/$/, "");
  const steps = docketChapterPinsV0Steps()
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WS-DOCKET · Chapter discovery pins</title>
    <meta name="robots" content="noindex" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body class="page">
    <div class="page">
      <header class="top">
        <a class="top-brand" href="/">humanity.llc</a>
        <span class="form-hint">WS-DOCKET · C-v3 chapter pins</span>
      </header>
      <main class="screen">
        <h1>Chapter discovery pins (non-starter)</h1>
        <p class="form-hint">
          Publish opt-in chapter fixtures on the docket branch only. Never starter-four.
          Never merge into city discovery / homepage by default.
        </p>
        <h2 class="group-label">Steps</h2>
        <ol class="list list-compact">
${steps}
        </ol>
        <h2 class="group-label">Surfaces</h2>
        <ul class="list list-compact">
          <li><a href="${escapeHtml(origin)}${DOCKET_CHAPTER_PINS_PAGE_PATH}">${DOCKET_CHAPTER_PINS_PAGE_PATH}</a></li>
          <li><a href="${escapeHtml(origin)}/data/docket-chapter-discovery-pins.json">Registry JSON</a></li>
          <li><a href="${escapeHtml(origin)}/docket/">Most Wanted roster (starter-four stay discovery off)</a></li>
        </ul>
        <p class="form-hint">
          Engineering: <code>npm run ws-docket:chapter-pins-preflight -- --strict</code>
        </p>
      </main>
    </div>
  </body>
</html>
`;
}

/**
 * @param {string} html
 */
export function validateWsDocketChapterPinsKitHtml(html) {
  if (!html.includes("Chapter discovery pins")) {
    throw new Error("chapter pins kit missing title");
  }
  if (!html.includes("starter-four") && !html.includes("Never starter-four")) {
    throw new Error("chapter pins kit must fence starter-four");
  }
  if (!html.includes("city discovery") && !html.includes("city-game")) {
    throw new Error("chapter pins kit must fence city discovery pollution");
  }
  if (!html.includes(DOCKET_CHAPTER_PINS_PAGE_PATH)) {
    throw new Error("chapter pins kit must link chapters page");
  }
  return true;
}
