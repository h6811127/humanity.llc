/**
 * Phase 0 smooth mode — device shell transfer-size baseline (pure helpers).
 * @see docs/DEVICE_LITE_MOBILE_PLAN.md § Phase 0
 */

/** Shell HTML routes that load device-status-bootstrap.mjs */
export const SHELL_BASELINE_HTML_PAGES = [
  "index.html",
  "create/index.html",
  "created/index.html",
  "wallet/index.html",
];

/** CSS always loaded on the four shell pages (device-shell.css is shared). */
export const SHELL_BASELINE_SHELL_CSS = ["css/device-shell.css"];

/** Additional CSS on landing `/` only (reference for full first-paint weight). */
export const SHELL_BASELINE_LANDING_CSS = [
  "css/hc-emphasis-card.css",
  "styles.css",
  "css/device-shell.css",
  "css/theme-dark.css",
];

/**
 * @typedef {{ file: string; bytes: number; missing?: boolean }} BaselineFileRow
 * @typedef {{
 *   assetVersion: number;
 *   moduleCount: number;
 *   jsModules: BaselineFileRow[];
 *   jsBytesTotal: number;
 *   shellCss: BaselineFileRow[];
 *   shellCssBytesTotal: number;
 *   landingCss: BaselineFileRow[];
 *   landingCssBytesTotal: number;
 *   transferBytesShellGraph: number;
 *   transferBytesLandingFirstPaint: number;
 * }} ShellTransferBaseline
 */

/**
 * @param {BaselineFileRow[]} rows
 */
export function sumBaselineBytes(rows) {
  return rows.reduce((sum, row) => sum + (row.missing ? 0 : row.bytes), 0);
}

/**
 * @param {string[]} files relative to site root
 * @param {(relPath: string) => number | null} readFileSize
 * @returns {BaselineFileRow[]}
 */
export function measureBaselineFiles(files, readFileSize) {
  return files.map((file) => {
    const bytes = readFileSize(file);
    return {
      file,
      bytes: bytes ?? 0,
      ...(bytes === null ? { missing: true } : {}),
    };
  });
}

/**
 * @param {{
 *   moduleFiles: string[];
 *   assetVersion: number;
 *   readFileSize: (relPath: string) => number | null;
 * }} opts
 * @returns {ShellTransferBaseline}
 */
export function computeShellTransferBaseline(opts) {
  const jsModules = measureBaselineFiles(
    opts.moduleFiles.map((f) => `js/${f}`),
    opts.readFileSize
  );
  const shellCss = measureBaselineFiles(SHELL_BASELINE_SHELL_CSS, opts.readFileSize);
  const landingCss = measureBaselineFiles(SHELL_BASELINE_LANDING_CSS, opts.readFileSize);

  const jsBytesTotal = sumBaselineBytes(jsModules);
  const shellCssBytesTotal = sumBaselineBytes(shellCss);
  const landingCssBytesTotal = sumBaselineBytes(landingCss);

  return {
    assetVersion: opts.assetVersion,
    moduleCount: opts.moduleFiles.length,
    jsModules,
    jsBytesTotal,
    shellCss,
    shellCssBytesTotal,
    landingCss,
    landingCssBytesTotal,
    transferBytesShellGraph: jsBytesTotal + shellCssBytesTotal,
    transferBytesLandingFirstPaint: jsBytesTotal + landingCssBytesTotal,
  };
}

/**
 * @param {ShellTransferBaseline} baseline
 */
export function formatShellBaselineReport(baseline) {
  const kb = (n) => `${(n / 1024).toFixed(1)} KiB`;
  const lines = [
    "Device shell Phase 0 baseline (standard tier, full bootstrap graph)",
    `  Asset version: ${baseline.assetVersion}`,
    `  Module count:  ${baseline.moduleCount}`,
    `  JS total:      ${kb(baseline.jsBytesTotal)} (${baseline.jsBytesTotal} bytes)`,
    `  Shell CSS:     ${kb(baseline.shellCssBytesTotal)}`,
    `  Graph transfer (JS + device-shell.css): ${kb(baseline.transferBytesShellGraph)}`,
    `  Landing first paint (JS + landing CSS stack): ${kb(baseline.transferBytesLandingFirstPaint)}`,
  ];
  const missing = [...baseline.jsModules, ...baseline.shellCss, ...baseline.landingCss].filter(
    (r) => r.missing
  );
  if (missing.length) {
    lines.push(`  Missing files: ${missing.map((r) => r.file).join(", ")}`);
  }
  return lines.join("\n");
}

/**
 * Snapshot shape written to worker/fixtures/device-shell-baseline.json.
 * @param {ShellTransferBaseline} baseline
 * @param {string} [generatedAt] ISO date
 */
export function shellBaselineToSnapshot(baseline, generatedAt = new Date().toISOString().slice(0, 10)) {
  return {
    schema: "device_shell_baseline_v1",
    generated_at: generatedAt,
    phase: "smooth_mode_phase_0",
    asset_version: baseline.assetVersion,
    module_count: baseline.moduleCount,
    js_bytes_total: baseline.jsBytesTotal,
    shell_css_bytes_total: baseline.shellCssBytesTotal,
    landing_css_bytes_total: baseline.landingCssBytesTotal,
    transfer_bytes_shell_graph: baseline.transferBytesShellGraph,
    transfer_bytes_landing_first_paint: baseline.transferBytesLandingFirstPaint,
    js_modules: baseline.jsModules.map(({ file, bytes }) => ({ file, bytes })),
  };
}

/**
 * @param {ReturnType<typeof shellBaselineToSnapshot>} current
 * @param {ReturnType<typeof shellBaselineToSnapshot>} expected
 */
export function compareShellBaselineSnapshots(current, expected) {
  /** @type {string[]} */
  const deltas = [];

  if (current.module_count !== expected.module_count) {
    deltas.push(
      `module_count ${expected.module_count} → ${current.module_count} (update snapshot after intentional graph change)`
    );
  }
  if (current.asset_version !== expected.asset_version) {
    deltas.push(`asset_version ${expected.asset_version} → ${current.asset_version}`);
  }
  if (current.js_bytes_total !== expected.js_bytes_total) {
    deltas.push(`js_bytes_total ${expected.js_bytes_total} → ${current.js_bytes_total}`);
  }
  if (current.transfer_bytes_shell_graph !== expected.transfer_bytes_shell_graph) {
    deltas.push(
      `transfer_bytes_shell_graph ${expected.transfer_bytes_shell_graph} → ${current.transfer_bytes_shell_graph}`
    );
  }

  const expectedByFile = new Map(expected.js_modules.map((r) => [r.file, r.bytes]));
  for (const row of current.js_modules) {
    const prev = expectedByFile.get(row.file);
    if (prev === undefined) {
      deltas.push(`new module ${row.file} (${row.bytes} bytes)`);
    } else if (prev !== row.bytes) {
      deltas.push(`${row.file} ${prev} → ${row.bytes} bytes`);
    }
  }
  for (const row of expected.js_modules) {
    if (!current.js_modules.some((r) => r.file === row.file)) {
      deltas.push(`removed module ${row.file}`);
    }
  }

  if (deltas.length === 0) {
    return { ok: true };
  }
  return { ok: false, deltas };
}

/** Human steps after automated Phase 0 preflight. */
export function deviceSmoothPhase0HumanNextSteps() {
  return [
    "",
    "Next (human — lab devices):",
    "  1. Run P0-SMOOTH in docs/DEVICE_OS_QA.md on 3 low-end + 3 mid devices + P0-W WebKit.",
    "  2. Record TTI and scroll jank in docs/DEVICE_SMOOTH_MODE_PHASE0_GATE.md.",
    "  3. Sign Path 1 sufficient Y/N before starting Phase 1.",
  ];
}
