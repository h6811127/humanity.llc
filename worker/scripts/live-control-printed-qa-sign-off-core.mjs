/**
 * H-12 printed QR sign-off helpers (operator).
 * @see docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md § Sign-off
 * @see docs/DEVICE_OS_QA.md § P1-LCP
 */

export const ALPHA_DOC_REL = "docs/M7_LIVE_CONTROL_ALPHA.md";
export const ALPHA_PRINTED_QA_PENDING = "printed QA pending";

/**
 * @param {string[]} argv
 */
export function parsePrintedQaSignOffArgs(argv) {
  const pass = argv.includes("--pass");
  const fail = argv.includes("--fail");
  const apply = argv.includes("--apply");
  let dateIso = new Date().toISOString().slice(0, 10);
  let phones = "";
  let printType = "";
  let qrId = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date" && argv[i + 1]) {
      dateIso = argv[++i];
    } else if (arg === "--phones" && argv[i + 1]) {
      phones = argv[++i];
    } else if (arg === "--print-type" && argv[i + 1]) {
      printType = argv[++i];
    } else if (arg === "--qr-id" && argv[i + 1]) {
      qrId = argv[++i];
    }
  }

  return { pass, fail, apply, dateIso, phones, printType, qrId };
}

/**
 * @param {{ pass: boolean; fail: boolean }} parsed
 */
export function resolvePrintedQaSignOffResult(parsed) {
  if (parsed.pass && parsed.fail) {
    throw new Error("Use only one of --pass or --fail");
  }
  if (!parsed.pass && !parsed.fail) {
    throw new Error("Specify --pass or --fail");
  }
  return parsed.pass ? "pass" : "fail";
}

/**
 * @param {{
 *   dateIso: string;
 *   phones?: string;
 *   printType?: string;
 *   qrId?: string;
 *   result: "pass" | "fail";
 * }} input
 * @returns {string[]}
 */
export function printedQaSignOffSummaryLines(input) {
  const lines = [
    "H-12 printed QR camera QA — sign-off record",
    "",
    `  Date:       ${input.dateIso}`,
    `  Print type: ${input.printType || "[paper / sticker / merch / plate]"}`,
    `  QR id:      ${input.qrId || "[qr_…]"}`,
    `  Phones:     ${input.phones || "[e.g. iPhone Safari, Pixel Chrome, …]"}`,
    `  Result:     ${input.result === "pass" ? "PASS" : "FAIL"}`,
    "",
  ];
  if (input.result === "pass") {
    lines.push(
      "On pass with --apply: updates docs/M7_LIVE_CONTROL_ALPHA.md printed-QA status.",
      "Human § A–C still required before public demo on print."
    );
  } else {
    lines.push("On fail: block public live-control demo on this print artifact.");
    lines.push("Map issues to H-04–H-10 in docs/LIVE_CONTROL_USABILITY_HARDENING.md");
  }
  lines.push("");
  return lines;
}

/**
 * @param {string} content
 * @param {{ dateIso: string }} opts
 */
export function applyAlphaDocPrintedQaPass(content, opts) {
  if (content.includes("printed QA **passed**")) {
    throw new Error("alpha_doc_already_passed");
  }
  if (!content.includes(ALPHA_PRINTED_QA_PENDING)) {
    throw new Error("alpha_doc_pending_marker_missing");
  }

  let out = content.replace(
    ALPHA_PRINTED_QA_PENDING,
    `printed QA **passed** (${opts.dateIso})`
  );

  const marker = "- Manual iPhone/Android camera scan of a printed QR —";
  const idx = out.indexOf(marker);
  if (idx >= 0) {
    const lineEnd = out.indexOf("\n", idx);
    const line = out.slice(idx, lineEnd);
    if (!line.includes("**passed**")) {
      const updated = line.replace(
        "— **runbook shipped",
        `— **passed (${opts.dateIso})** · runbook shipped`
      );
      out = out.slice(0, idx) + updated + out.slice(lineEnd);
    }
  }

  return out;
}
