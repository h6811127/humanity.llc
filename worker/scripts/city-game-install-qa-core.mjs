/**
 * C3 physical install QA — engineering preflight + human sign-off helpers.
 * @see docs/CITY_GAME_INSTALL_QA.md
 */

import {
  INSTALL_QA_REQUIRED_NODE_COUNT,
  INSTALL_QA_SPOT_NODE_IDS,
} from "./city-game-smoke-local-core.mjs";

export const INSTALL_QA_REL = "docs/CITY_GAME_INSTALL_QA.md";
export const LAUNCH_CHECKLIST_REL = "docs/CITY_GAME_LAUNCH_CHECKLIST.md";

export const INSTALL_QA_PHYSICAL_PENDING =
  "| Physical install (≥3 phones × 15 nodes) | ☐ Pending | |";
export const INSTALL_QA_LAUNCH_P2_PENDING =
  "| P2 | [`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md) — ≥3 phones × 15 nodes | ☐ |";
export const INSTALL_QA_E2_PENDING =
  "| E2 | Scenario spot-checks below on **one** phone against local or staging URLs | Same expected copy as production template | ☐ |";

/**
 * @param {string[]} argv
 */
export function parseInstallQaSignOffArgs(argv) {
  const pass = argv.includes("--pass");
  const fail = argv.includes("--fail");
  const scenarioPass = argv.includes("--scenario-pass");
  const apply = argv.includes("--apply");
  let dateIso = new Date().toISOString().slice(0, 10);
  let phones = "";
  let nodes = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date" && argv[i + 1]) {
      dateIso = argv[++i];
    } else if (arg === "--phones" && argv[i + 1]) {
      phones = argv[++i];
    } else if (arg === "--nodes" && argv[i + 1]) {
      nodes = argv[++i];
    }
  }

  return { pass, fail, scenarioPass, apply, dateIso, phones, nodes };
}

/**
 * @param {{ pass: boolean; fail: boolean; scenarioPass: boolean }} parsed
 */
export function resolveInstallQaSignOffResult(parsed) {
  if ([parsed.pass, parsed.fail, parsed.scenarioPass].filter(Boolean).length !== 1) {
    throw new Error("Specify exactly one of --pass, --fail, or --scenario-pass");
  }
  if (parsed.scenarioPass) return "scenario-pass";
  return parsed.pass ? "pass" : "fail";
}

/**
 * @param {{
 *   dateIso: string;
 *   phones?: string;
 *   nodes?: string;
 *   result: "pass" | "fail" | "scenario-pass";
 * }} input
 * @returns {string[]}
 */
export function installQaSignOffSummaryLines(input) {
  const lines = [
    input.result === "scenario-pass"
      ? "C3 install QA — E2 scenario spot-check sign-off"
      : "C3 physical install QA — sign-off record",
    "",
    `  Date:   ${input.dateIso}`,
  ];
  if (input.result !== "scenario-pass") {
    lines.push(`  Phones: ${input.phones || "[≥3]"}`);
    lines.push(`  Nodes:  ${input.nodes || "[15]"}`);
  }
  lines.push(`  Result: ${input.result === "fail" ? "FAIL" : "PASS"}`);
  lines.push("");
  if (input.result === "scenario-pass") {
    lines.push(
      "On --scenario-pass --apply: marks INSTALL_QA E2 (one-phone spot checks).",
      "Next: place stickers, then npm run city-game:install-qa-sign-off -- --pass --apply"
    );
  } else if (input.result === "pass") {
    lines.push(
      "On pass with --apply: updates install QA + launch checklist P2.",
      "Engineering gate: npm run city-game:install-qa-preflight",
      "Production scan smoke (after CITY_GAME_ENABLED=1): npm run city-game:smoke-production"
    );
  } else {
    lines.push(
      "On fail: fix placement/resolver, re-run npm run city-game:smoke-local, re-test all 15 nodes."
    );
  }
  lines.push("");
  return lines;
}

/**
 * @param {string} content
 */
export function installQaDocHasEngineeringPreflightPass(content) {
  return (
    content.includes("Engineering preflight (`verify:city-game`) | ☑") &&
    content.includes("Local proof gate (`city-game:proof-local`) | ☑")
  );
}

/**
 * @param {string} content
 */
export function installQaDocHasE2Pass(content) {
  if (content.includes(INSTALL_QA_E2_PENDING)) return false;
  return content.includes("| E2 | Scenario spot-checks") && content.includes("☑");
}

/**
 * @param {Array<{ node_id?: string; scan_url?: string; local_scan_url?: string }>} nodes
 */
export function countSeedNodes(nodes) {
  return nodes.filter((n) => n.node_id && (n.scan_url || n.local_scan_url)).length;
}

/**
 * @param {Array<{ node_id?: string }>} nodes
 * @param {string[]} requiredIds
 */
export function missingSpotNodes(nodes, requiredIds = INSTALL_QA_SPOT_NODE_IDS) {
  const have = new Set(nodes.map((n) => n.node_id).filter(Boolean));
  return requiredIds.filter((id) => !have.has(id));
}

/**
 * @param {{
 *   installQaDoc?: string | null;
 *   localSeed?: { nodes?: Array<{ node_id?: string }> } | null;
 *   productionSeed?: { nodes?: Array<{ node_id?: string; scan_url?: string }> } | null;
 *   humanSignedOff?: boolean;
 * }} input
 */
export function assessInstallQaEngineeringReady(input) {
  const issues = [];
  const warnings = [];
  const installQa = input.installQaDoc ?? "";

  if (!installQaDocHasEngineeringPreflightPass(installQa)) {
    issues.push(
      "Install QA doc missing E0/E1 pass markers — run npm run verify:city-game and npm run city-game:proof-local"
    );
  }

  const localNodes = input.localSeed?.nodes ?? [];
  const localCount = countSeedNodes(localNodes);
  if (!input.localSeed) {
    warnings.push("No local seed — npm run city-game:seed-local -- --write-season for LAN install QA");
  } else if (localCount < INSTALL_QA_REQUIRED_NODE_COUNT) {
    issues.push(
      `Local seed has ${localCount}/${INSTALL_QA_REQUIRED_NODE_COUNT} nodes — npm run city-game:seed-local`
    );
  } else {
    const missing = missingSpotNodes(localNodes);
    if (missing.length) {
      issues.push(`Local seed missing spot nodes: ${missing.join(", ")}`);
    }
  }

  const prodNodes = input.productionSeed?.nodes ?? [];
  const prodCount = countSeedNodes(prodNodes);
  let productionSeedReady = false;
  if (!input.productionSeed) {
    warnings.push(
      "No production seed — npm run city-game:seed-production -- --confirm-production (after ops sign-off)"
    );
  } else if (prodCount < INSTALL_QA_REQUIRED_NODE_COUNT) {
    warnings.push(
      `Production seed has ${prodCount}/${INSTALL_QA_REQUIRED_NODE_COUNT} nodes — finish mint + export-qr-pack`
    );
  } else {
    productionSeedReady = true;
    const missing = missingSpotNodes(prodNodes);
    if (missing.length) {
      warnings.push(`Production seed missing spot nodes: ${missing.join(", ")}`);
    }
  }

  const ready = issues.length === 0;
  return {
    ready,
    localSeedReady: Boolean(input.localSeed) && localCount >= INSTALL_QA_REQUIRED_NODE_COUNT,
    productionSeedReady,
    issues,
    warnings,
  };
}

/**
 * @param {{
 *   ready: boolean;
 *   localSeedReady: boolean;
 *   productionSeedReady: boolean;
 *   issues: string[];
 *   warnings: string[];
 *   humanSignedOff?: boolean;
 *   installMap?: {
 *     qrReady: boolean;
 *     installedReady: boolean;
 *     contactsReady: boolean;
 *     readyForPhysicalQa: boolean;
 *   };
 *   e2SignedOff?: boolean;
 *   walkKit?: { ready: boolean; linked: number; registry: number };
 * }} c3
 * @returns {string}
 */
export function formatInstallQaPreflightReport(c3) {
  const lines = ["Cedar Rapids · physical install QA preflight (C3)", ""];
  lines.push(
    `C3 engineering: ${c3.ready ? "☑" : "☐"} verify + proof-local markers, local seed ${INSTALL_QA_REQUIRED_NODE_COUNT} nodes`
  );
  lines.push(`  Local seed (${INSTALL_QA_REQUIRED_NODE_COUNT} nodes): ${c3.localSeedReady ? "☑" : "☐"}`);
  lines.push(`  Production seed (${INSTALL_QA_REQUIRED_NODE_COUNT} nodes): ${c3.productionSeedReady ? "☑" : "☐"}`);
  if (c3.installMap) {
    lines.push(
      `  Install map (O2): QR ${c3.installMap.qrReady ? "☑" : "☐"} · Installed ${c3.installMap.installedReady ? "☑" : "☐"} · node_14 ${c3.installMap.contactsReady ? "☑" : "☐"}`
    );
    lines.push(
      `  Ready for physical walk: ${c3.installMap.readyForPhysicalQa ? "☑" : "☐"}`
    );
  }
  lines.push(`  E2 scenario spot-checks: ${c3.e2SignedOff ? "☑" : "☐"}`);
  if (c3.walkKit) {
    lines.push(
      `  LAN walk kit: ${c3.walkKit.ready ? "☑" : "☐"} ${c3.walkKit.linked}/${c3.walkKit.registry} linked · npm run city-game:install-qa-walk -- --lan`
    );
  }
  if (c3.warnings.length) {
    lines.push("");
    lines.push("Warnings:");
    for (const w of c3.warnings) lines.push(`  ⚠ ${w}`);
  }
  if (c3.issues.length) {
    lines.push("");
    lines.push("Blockers:");
    for (const i of c3.issues) lines.push(`  ✗ ${i}`);
  }
  lines.push("");
  lines.push(
    `C3 human gate: ${c3.humanSignedOff ? "☑" : "☐"} ≥3 phones × 15 nodes (per-node checklist in ${INSTALL_QA_REL})`
  );
  lines.push("");
  lines.push("Before stickers / LAN walk (3 phones):");
  lines.push("  npm run city-game:install-qa-walk -- --lan");
  lines.push("  npm run city-game:dev -- --lan");
  lines.push("  npm run city-game:install-map-preflight");
  lines.push("  npm run city-game:smoke-local");
  lines.push("  npm run city-game:install-qa-scenario -- --sign-off --apply");
  lines.push("After install + CITY_GAME_ENABLED=1 on production:");
  lines.push("  npm run city-game:smoke-production");
  lines.push("");
  lines.push("After physical pass:");
  lines.push(
    "  npm run city-game:install-qa-sign-off -- --pass --apply --phones 3 --nodes 15"
  );
  return lines.join("\n");
}

/**
 * @param {string} content
 * @param {{ dateIso: string; phones?: string; nodes?: string }} opts
 */
/**
 * @param {string} content
 * @param {number} [_registryNodeCount]
 */
export function installQaDocHasPhysicalPass(content, _registryNodeCount = 15) {
  if (!content || typeof content !== "string") return false;
  return /Physical install \(≥3 phones × \d+ nodes\) \| ☑/.test(content);
}

/**
 * @param {string} content
 * @param {{ dateIso: string; phones?: string; nodes?: string }} opts
 */
export function applyInstallQaPhysicalPass(content, opts) {
  if (!content.includes(INSTALL_QA_PHYSICAL_PENDING)) {
    if (content.includes("Physical install (≥3 phones × 15 nodes) | ☑")) {
      return content;
    }
    throw new Error("install_qa_physical_marker_missing");
  }
  const detail = `${opts.phones || "≥3"} phones · ${opts.nodes || "15"} nodes`;
  return content.replace(
    INSTALL_QA_PHYSICAL_PENDING,
    `| Physical install (≥3 phones × 15 nodes) | ☑ Pass (${detail}) | ${opts.dateIso} |`
  );
}

/**
 * @param {string} content
 * @param {{ dateIso: string }} opts
 */
export function applyInstallQaE2Pass(content, opts) {
  if (!content.includes(INSTALL_QA_E2_PENDING)) {
    if (content.includes("| E2 | Scenario spot-checks") && content.includes("☑")) {
      return content;
    }
    return content;
  }
  return content.replace(
    INSTALL_QA_E2_PENDING,
    `| E2 | Scenario spot-checks below on **one** phone against local or staging URLs | Same expected copy as production template | ☑ **${opts.dateIso}** |`
  );
}

/**
 * @param {string} content
 * @param {{ dateIso: string }} opts
 */
export function applyLaunchChecklistP2Pass(content, opts) {
  if (!content.includes(INSTALL_QA_LAUNCH_P2_PENDING)) {
    if (content.includes("P2 | [`CITY_GAME_INSTALL_QA.md`]") && content.includes("☑")) {
      return content;
    }
    throw new Error("launch_checklist_p2_marker_missing");
  }
  return content.replace(
    INSTALL_QA_LAUNCH_P2_PENDING,
    `| P2 | [\`CITY_GAME_INSTALL_QA.md\`](CITY_GAME_INSTALL_QA.md) — ≥3 phones × 15 nodes | ☑ **${opts.dateIso}** |`
  );
}
