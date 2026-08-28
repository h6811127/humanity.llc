/**
 * WS-DOCKET chapter mint field kit.
 */
import {
  DOCKET_CHAPTER_MINT_KIT_REL,
  docketChapterMintV0Steps,
  buildDocketChapterMintReceipt,
  validateDocketChapterMintReceipt,
  isMintableDocketChildQrPair,
} from "../../site/js/docket-chapter-mint-core.mjs";

export { DOCKET_CHAPTER_MINT_KIT_REL };

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
export function buildWsDocketChapterMintKitHtml(opts = {}) {
  const origin = (opts.origin ?? "http://127.0.0.1:8788").replace(/\/$/, "");
  const steps = docketChapterMintV0Steps()
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("\n");
  const sample = buildDocketChapterMintReceipt({
    pinId: "chapter-cr-research-circle",
    profileId: "7Xk9mP2nQ4rT6vW8yZ1aB3cD",
    qrId: "qr_7Xk9mP2nQ4rT6vW8",
    objectId: "obj_docket_casefile_chapter-cr-research-circle",
    handle: "docket_chapter_cr",
    mintedAt: "2026-07-17T12:00:00.000Z",
  });
  validateDocketChapterMintReceipt(sample);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WS-DOCKET · chapter mint v0</title>
    <meta name="robots" content="noindex" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body class="page">
    <div class="page">
      <header class="top">
        <a class="top-brand" href="/">humanity.llc</a>
        <span class="form-hint">WS-DOCKET · real chapter child QR</span>
      </header>
      <main class="screen">
        <h1>Chapter child QR mint (QR-mint-v0)</h1>
        <p class="form-hint">
          Mint a real Worker <code>status_plate</code> + child QR for non-starter chapter pins.
          Never starter-four. Never city discovery. Keys stay in <code>worker/.local/</code>.
        </p>
        <h2 class="group-label">Steps</h2>
        <ol class="list list-compact">
${steps}
        </ol>
        <h2 class="group-label">Sample receipt (shape)</h2>
        <pre class="form-hint" style="white-space:pre-wrap;font-size:13px">${escapeHtml(
          JSON.stringify(
            {
              kind: sample.kind,
              pin_id: sample.pin_id,
              scan_path: sample.scan_path,
              mint_status: sample.mint_status,
              mintable: isMintableDocketChildQrPair(
                sample.parent_profile_id,
                sample.qr_id
              ),
            },
            null,
            2
          )
        )}</pre>
        <h2 class="group-label">Surfaces</h2>
        <ul class="list list-compact">
          <li><a href="${escapeHtml(origin)}/docket/chapters/">/docket/chapters/</a></li>
          <li><code>npm run ws-docket:chapter-mint -- --write-pins</code></li>
        </ul>
        <p class="form-hint">
          Engineering: <code>npm run ws-docket:chapter-mint-preflight -- --strict</code>
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
export function validateWsDocketChapterMintKitHtml(html) {
  if (!html.includes("QR-mint-v0")) throw new Error("mint kit missing title");
  if (!html.includes("starter-four") && !html.includes("Never starter")) {
    throw new Error("mint kit must fence starter-four");
  }
  if (!html.includes("chapter-mint")) {
    throw new Error("mint kit must mention chapter-mint command");
  }
  return true;
}
