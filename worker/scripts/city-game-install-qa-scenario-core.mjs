/**
 * C3 E2 scenario spot-check helpers.
 * @see docs/CITY_GAME_INSTALL_QA.md § Scenario spot-checks
 */

import {
  assessGameScanHtml,
  INSTALL_QA_SCENARIO_EXPECTATIONS,
  INSTALL_QA_SCENARIO_MANUAL_CHECKS,
  INSTALL_QA_SCENARIO_NODE_IDS,
  resolveSmokeScanUrl,
} from "./city-game-smoke-local-core.mjs";
import {
  applyInstallQaE2Pass,
  installQaDocHasE2Pass,
  INSTALL_QA_REL,
} from "./city-game-install-qa-core.mjs";

export { installQaDocHasE2Pass, INSTALL_QA_REL };

/**
 * @param {Array<{ node_id?: string; public_label?: string; local_scan_url?: string; scan_url?: string }>} nodes
 * @param {string[]} scenarioIds
 */
export function selectScenarioNodes(nodes, scenarioIds = INSTALL_QA_SCENARIO_NODE_IDS) {
  const byId = new Map(nodes.filter((node) => node.node_id).map((node) => [node.node_id, node]));
  return scenarioIds.map((nodeId) => byId.get(nodeId)).filter(Boolean);
}

/**
 * @param {{
 *   apiOrigin: string;
 *   nodes: Array<{ node_id?: string; public_label?: string; local_scan_url?: string; scan_url?: string }>;
 *   fetchHtml?: (url: string) => Promise<{ ok: boolean; status?: number; html?: string }>;
 * }} input
 */
export async function runInstallQaScenarioHttpChecks(input) {
  const targets = selectScenarioNodes(input.nodes);
  /** @type {string[]} */
  const missing = INSTALL_QA_SCENARIO_NODE_IDS.filter(
    (nodeId) => !targets.some((node) => node.node_id === nodeId)
  );
  /** @type {string[]} */
  const failures = [];
  /** @type {string[]} */
  const passed = [];

  for (const node of targets) {
    const nodeId = String(node.node_id);
    const url = resolveSmokeScanUrl(input.apiOrigin, node.local_scan_url, node.scan_url);
    if (!url) {
      failures.push(`${nodeId}: no scan URL`);
      continue;
    }

    const response = input.fetchHtml
      ? await input.fetchHtml(url)
      : await fetch(url, { headers: { Accept: "text/html" } })
          .then(async (res) => ({ ok: res.ok, status: res.status, html: await res.text() }))
          .catch(() => ({ ok: false, status: 0, html: "" }));

    if (!response.ok) {
      failures.push(`${nodeId}: HTTP ${response.status ?? "fetch failed"}`);
      continue;
    }

    const expect = INSTALL_QA_SCENARIO_EXPECTATIONS[nodeId] ?? {};
    const result = assessGameScanHtml(response.html ?? "", {
      nodeId,
      label: node.public_label,
      requireCoopHint: expect.requireCoopHint ?? false,
      requireContributeBlock: expect.requireContributeBlock ?? false,
      expectDormant: expect.expectDormant ?? false,
    });

    if (!result.ok) {
      failures.push(result.reason);
      continue;
    }

    passed.push(nodeId);
  }

  return {
    ok: failures.length === 0 && missing.length === 0,
    passed,
    failures,
    missing,
  };
}

/**
 * @param {{
 *   ok: boolean;
 *   passed: string[];
 *   failures: string[];
 *   missing: string[];
 *   e2SignedOff?: boolean;
 * }} report
 */
export function formatInstallQaScenarioReport(report) {
  const lines = ["Cedar Rapids · install QA scenario spot-checks (E2)", ""];
  lines.push(
    `E2 HTTP baseline: ${report.ok ? "☑" : "☐"} ${report.passed.length}/${INSTALL_QA_SCENARIO_NODE_IDS.length} nodes`
  );
  if (report.missing.length) {
    lines.push(`  Missing in seed: ${report.missing.join(", ")}`);
  }
  if (report.failures.length) {
    lines.push("");
    lines.push("Failures:");
    for (const failure of report.failures) lines.push(`  ✗ ${failure}`);
  } else if (report.passed.length) {
    lines.push(`  Passed: ${report.passed.join(", ")}`);
  }
  lines.push("");
  lines.push("Manual on one phone (still required before E2 sign-off):");
  for (const check of INSTALL_QA_SCENARIO_MANUAL_CHECKS) {
    lines.push(`  • ${check}`);
  }
  lines.push("");
  lines.push(`E2 doc marker: ${report.e2SignedOff ? "☑" : "☐"}`);
  lines.push("");
  lines.push("After HTTP + manual checks:");
  lines.push("  npm run city-game:install-qa-scenario -- --sign-off --apply");
  lines.push("");
  lines.push("Then physical C3 (stickers + 3 phones × 15 nodes):");
  lines.push("  npm run city-game:install-map-sign-off -- --mark-installed --apply");
  lines.push("  npm run city-game:install-qa-sign-off -- --pass --apply --phones 3 --nodes 15");
  return lines.join("\n");
}

/**
 * @param {string} content
 * @param {{ dateIso: string }} opts
 */
export function applyInstallQaScenarioPass(content, opts) {
  return applyInstallQaE2Pass(content, opts);
}
