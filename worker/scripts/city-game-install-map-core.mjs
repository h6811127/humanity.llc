/**
 * O2 install map — registry assessment + sign-off helpers.
 * @see docs/CITY_GAME_NODE_INSTALL_MAP.md
 */

import { INSTALL_QA_REQUIRED_NODE_COUNT } from "./city-game-smoke-local-core.mjs";
import { LAUNCH_CHECKLIST_O2_PENDING } from "./city-game-launch-checklist-core.mjs";

export const INSTALL_MAP_REL = "docs/CITY_GAME_NODE_INSTALL_MAP.md";
export const LAUNCH_CHECKLIST_REL = "docs/CITY_GAME_LAUNCH_CHECKLIST.md";

/**
 * @param {string} line
 */
export function parseInstallMapRow(line) {
  const parts = line.split("|").map((part) => part.trim());
  if (!/^node_\d+$/.test(parts[1] ?? "")) return null;
  return {
    node_id: parts[1],
    installed: (parts[5] ?? "").startsWith("☑"),
    qrIssued: (parts[6] ?? "").startsWith("☑"),
    line,
  };
}

/**
 * @param {string} content
 */
export function parseInstallMapRegistry(content) {
  /** @type {Array<{ node_id: string; installed: boolean; qrIssued: boolean; line: string }>} */
  const rows = [];
  for (const line of content.split("\n")) {
    const row = parseInstallMapRow(line);
    if (row) rows.push(row);
  }
  return rows;
}

/**
 * @param {string} content
 */
export function installMapNode14ContactsReady(content) {
  const section = content.split("## node_14 care loop")[1]?.split("\n##")[0] ?? "";
  if (!section.includes("Primary maintainer")) return false;
  return !/\[fill\]/.test(section);
}

/**
 * @param {{
 *   installMapDoc?: string | null;
 *   localSeed?: { nodes?: Array<{ node_id?: string; scan_url?: string; local_scan_url?: string }> } | null;
 * }} input
 */
export function assessInstallMapReady(input) {
  const content = input.installMapDoc ?? "";
  const rows = parseInstallMapRegistry(content);
  /** @type {string[]} */
  const issues = [];
  /** @type {string[]} */
  const warnings = [];

  if (rows.length < INSTALL_QA_REQUIRED_NODE_COUNT) {
    issues.push(
      `Install map has ${rows.length}/${INSTALL_QA_REQUIRED_NODE_COUNT} registry rows — fill ${INSTALL_MAP_REL}`
    );
  }

  const qrPending = rows.filter((row) => !row.qrIssued).map((row) => row.node_id);
  const installedPending = rows.filter((row) => !row.installed).map((row) => row.node_id);
  const localNodes = input.localSeed?.nodes ?? [];
  const localWithUrl = localNodes.filter(
    (node) => node.node_id && (node.scan_url || node.local_scan_url)
  );

  if (input.localSeed && localWithUrl.length >= INSTALL_QA_REQUIRED_NODE_COUNT && qrPending.length) {
    warnings.push(
      `Local seed has ${localWithUrl.length} nodes — run npm run city-game:install-map-sign-off -- --mark-qr-issued --apply`
    );
  } else if (!input.localSeed && qrPending.length) {
    warnings.push("No local seed — npm run city-game:seed-local before marking QR issued");
  }

  const contactsReady = installMapNode14ContactsReady(content);
  if (!contactsReady) {
    warnings.push("node_14 steward contacts still have [fill] placeholders");
  }

  const qrReady = qrPending.length === 0 && rows.length >= INSTALL_QA_REQUIRED_NODE_COUNT;
  const installedReady =
    installedPending.length === 0 && rows.length >= INSTALL_QA_REQUIRED_NODE_COUNT;
  const readyForPhysicalQa = qrReady && installedReady && contactsReady;

  return {
    readyForPhysicalQa,
    qrReady,
    installedReady,
    contactsReady,
    rowCount: rows.length,
    qrPending,
    installedPending,
    issues,
    warnings,
  };
}

/**
 * @param {ReturnType<typeof assessInstallMapReady>} map
 * @returns {string}
 */
export function formatInstallMapPreflightReport(map) {
  const lines = ["Cedar Rapids · install map preflight (O2 / C3 prep)", ""];
  lines.push(`Registry rows: ${map.rowCount}/${INSTALL_QA_REQUIRED_NODE_COUNT}`);
  lines.push(`  QR issued: ${map.qrReady ? "☑" : "☐"}${map.qrPending.length ? ` (${map.qrPending.length} pending)` : ""}`);
  lines.push(`  Installed: ${map.installedReady ? "☑" : "☐"}${map.installedPending.length ? ` (${map.installedPending.length} pending)` : ""}`);
  lines.push(`  node_14 contacts: ${map.contactsReady ? "☑" : "☐"}`);
  lines.push(
    `  Ready for physical install QA (C3): ${map.readyForPhysicalQa ? "☑" : "☐"}`
  );
  if (map.warnings.length) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of map.warnings) lines.push(`  ⚠ ${warning}`);
  }
  if (map.issues.length) {
    lines.push("");
    lines.push("Blockers:");
    for (const issue of map.issues) lines.push(`  ✗ ${issue}`);
  }
  lines.push("");
  lines.push("After mint / export:");
  lines.push("  npm run city-game:install-map-sign-off -- --mark-qr-issued --apply");
  lines.push("After stickers placed:");
  lines.push("  npm run city-game:install-map-sign-off -- --mark-installed --apply");
  lines.push("When contacts filled:");
  lines.push("  npm run city-game:launch-checklist-sign-off -- --mark O2 --apply");
  lines.push("");
  lines.push("Then physical C3:");
  lines.push("  npm run city-game:install-qa-preflight");
  lines.push("  npm run city-game:install-qa-sign-off -- --pass --apply --phones 3 --nodes 15");
  return lines.join("\n");
}

/**
 * @param {string} line
 */
export function applyInstallMapQrIssuedRow(line) {
  const parts = line.split("|");
  if ((parts[6]?.trim() ?? "").startsWith("☑")) return line;
  return line.replace(/(\|\s*☐\s*\|\s*)☐(\s*\|)/, "$1☑$2");
}

/**
 * @param {string} line
 */
export function applyInstallMapInstalledRow(line) {
  const parts = line.split("|");
  if ((parts[5]?.trim() ?? "").startsWith("☑")) return line;
  return line.replace(/\|\s*☐(\s*\|\s*(?:☐|☑)\s*\|)/, "| ☑$1");
}

/**
 * @param {string} content
 * @param {string[]} nodeIds
 */
export function applyInstallMapQrIssuedPass(content, nodeIds) {
  let out = content;
  for (const nodeId of nodeIds) {
    const row = parseInstallMapRegistry(out).find((entry) => entry.node_id === nodeId);
    if (!row) {
      throw new Error(`install_map_row_missing_${nodeId}`);
    }
    const updated = applyInstallMapQrIssuedRow(row.line);
    out = out.replace(row.line, updated);
  }
  return out;
}

/**
 * @param {string} content
 * @param {string[]} nodeIds
 */
export function applyInstallMapInstalledPass(content, nodeIds) {
  let out = content;
  for (const nodeId of nodeIds) {
    const row = parseInstallMapRegistry(out).find((entry) => entry.node_id === nodeId);
    if (!row) {
      throw new Error(`install_map_row_missing_${nodeId}`);
    }
    const updated = applyInstallMapInstalledRow(row.line);
    out = out.replace(row.line, updated);
  }
  return out;
}

/**
 * @param {string} content
 * @param {{ dateIso: string }} opts
 */
export function applyLaunchChecklistO2Pass(content, opts) {
  if (!content.includes(LAUNCH_CHECKLIST_O2_PENDING)) {
    if (content.includes("O2 | [`CITY_GAME_NODE_INSTALL_MAP.md`]") && content.includes("☑")) {
      return content;
    }
    throw new Error("launch_checklist_o2_marker_missing");
  }
  return content.replace(
    LAUNCH_CHECKLIST_O2_PENDING,
    `| O2 | [\`CITY_GAME_NODE_INSTALL_MAP.md\`](CITY_GAME_NODE_INSTALL_MAP.md) — install status + node_14 steward contact | ☑ **${opts.dateIso}** |`
  );
}

/**
 * @param {string[]} argv
 */
export function parseInstallMapSignOffArgs(argv) {
  const apply = argv.includes("--apply");
  const markQrIssued = argv.includes("--mark-qr-issued");
  const markInstalled = argv.includes("--mark-installed");
  const markO2 = argv.includes("--mark-o2");
  let dateIso = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--date" && argv[i + 1]) {
      dateIso = argv[++i];
    }
  }

  return { apply, markQrIssued, markInstalled, markO2, dateIso };
}

/**
 * @param {{ markQrIssued: boolean; markInstalled: boolean; markO2: boolean }} parsed
 */
export function resolveInstallMapSignOffAction(parsed) {
  const actions = [parsed.markQrIssued, parsed.markInstalled, parsed.markO2].filter(Boolean);
  if (actions.length !== 1) {
    throw new Error("Specify exactly one of --mark-qr-issued, --mark-installed, or --mark-o2");
  }
  if (parsed.markQrIssued) return "mark-qr-issued";
  if (parsed.markInstalled) return "mark-installed";
  return "mark-o2";
}
