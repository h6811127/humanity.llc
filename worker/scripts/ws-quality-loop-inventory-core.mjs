/**
 * WS-QUALITY Q1 — core loop inventory (L1–L8).
 * @see docs/CORE_PRODUCT_LOOP.md § Core loop inventory
 * @see docs/SAD_PATH_COVERAGE_AND_BACKLOG.md
 */

export const QUALITY_LOOP_OWNER = "WS-QUALITY";

/** @typedef {{
 *   doc: string;
 *   anchors: string[];
 * }} QualityLoopManualRef */

/** @typedef {{
 *   id: string;
 *   journey: string;
 *   npmScripts: string[];
 *   testFiles: string[];
 *   manualRefs: QualityLoopManualRef[];
 * }} QualityLoopRow */

/** @type {QualityLoopRow[]} */
export const QUALITY_LOOP_INVENTORY = [
  {
    id: "L1",
    journey: "Create card (general + child object paths)",
    npmScripts: ["e2e:custody-device-unlock"],
    testFiles: [
      "worker/tests/created-child-object.test.ts",
      "worker/tests/issue-child-object-qr.test.ts",
      "worker/tests/live-object-child-scan.test.ts",
      "worker/tests/created-child-object-add-hub-core.test.ts",
    ],
    manualRefs: [
      { doc: "docs/DEVICE_OS_QA.md", anchors: ["### P0-1", "/create/"] },
      { doc: "docs/CUSTODY_WEBAUTHN_FALLBACK_QA.md", anchors: ["WebAuthn"] },
    ],
  },
  {
    id: "L2",
    journey: "Keys in tab → save to device",
    npmScripts: ["ownership-restore:verify"],
    testFiles: [
      "worker/tests/device-wallet-save-core.test.ts",
      "worker/tests/device-quiet-tab-rehydrate.test.ts",
      "worker/tests/created-view-only-copy-core.test.ts",
    ],
    manualRefs: [{ doc: "docs/DEVICE_OS_QA.md", anchors: ["### P0-1", "### P0-2"] }],
  },
  {
    id: "L3",
    journey: "Hub / dot / inbox open",
    npmScripts: ["verify:desk:fast", "hub-card-disappeared:verify:fast"],
    testFiles: [
      "worker/tests/device-status-shell-modules.test.ts",
      "worker/tests/device-shell-boot.test.ts",
      "worker/tests/device-hub-boot.test.ts",
    ],
    manualRefs: [{ doc: "docs/DEVICE_OS_QA.md", anchors: ["### P0-3", "### P1-SD"] }],
  },
  {
    id: "L4",
    journey: "/created/ Live · manage · QR download",
    npmScripts: ["worker:test:qr-branding", "e2e:created-control"],
    testFiles: [
      "worker/tests/scan-qr-branding.test.ts",
      "worker/tests/qr-render-contract.test.ts",
      "e2e/created-control.spec.ts",
    ],
    manualRefs: [{ doc: "docs/DEVICE_OS_QA.md", anchors: ["### P0-QR"] }],
  },
  {
    id: "L5",
    journey: "Stranger scan · live proof",
    npmScripts: ["e2e:scan-page-dot", "e2e:live-control-loop"],
    testFiles: [
      "e2e/scan-page-dot.spec.ts",
      "e2e/live-control-loop.spec.ts",
      "worker/tests/scan-page-dot-contract.test.ts",
      "worker/tests/scan.test.ts",
    ],
    manualRefs: [
      { doc: "docs/DEVICE_OS_QA.md", anchors: ["### P1-SD"] },
      { doc: "docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md", anchors: ["printed QR", "camera"] },
    ],
  },
  {
    id: "L6",
    journey: "Revoke QR / card",
    npmScripts: ["e2e:scan-revoke-freshness"],
    testFiles: [
      "worker/tests/revoke.test.ts",
      "worker/tests/delegated-revoke-qr.test.ts",
      "worker/tests/scan-revoke-truth-contract.test.ts",
    ],
    manualRefs: [{ doc: "docs/DEVICE_OS_QA.md", anchors: ["### P0-2", "revoke"] }],
  },
  {
    id: "L7",
    journey: "Safari keys / ITP / quiet tab",
    npmScripts: ["e2e:safari-keys-persistence"],
    testFiles: [
      "worker/tests/device-quiet-tab-rehydrate.test.ts",
      "worker/tests/safari-itp-storage-notice-core.test.ts",
      "e2e/safari-keys-persistence.spec.ts",
    ],
    manualRefs: [{ doc: "docs/DEVICE_OS_QA.md", anchors: ["### P0-W"] }],
  },
  {
    id: "L8",
    journey: "Steward scan handoff / PWA vouch",
    npmScripts: ["steward-scan-handoff:verify:fast"],
    testFiles: [
      "worker/tests/steward-dual-qr-core.test.ts",
      "worker/tests/scan-pwa-camera-handoff-core.test.ts",
      "worker/tests/device-hub-qr-scanner-core.test.ts",
    ],
    manualRefs: [{ doc: "docs/DEVICE_OS_QA.md", anchors: ["### P1-PWA-V"] }],
  },
];

/**
 * @param {Record<string, string>} packageScripts
 * @param {(rel: string) => boolean} fileExists
 * @param {(rel: string) => string | null} readText
 */
export function assessQualityLoopInventory(packageScripts, fileExists, readText) {
  /** @type {import("./ws-quality-loop-inventory-core.mjs").QualityLoopRow & {
   *   automatedOk: boolean;
   *   manualDocOk: boolean;
   *   issues: string[];
   * }}[] */
  const rows = [];
  /** @type {string[]} */
  const issues = [];

  for (const row of QUALITY_LOOP_INVENTORY) {
    /** @type {string[]} */
    const rowIssues = [];
    let manualDocOk = true;
    let automatedOk = true;
    for (const script of row.npmScripts) {
      if (!packageScripts[script]) {
        rowIssues.push(`${row.id}: missing npm script ${script}`);
        automatedOk = false;
      }
    }
    for (const rel of row.testFiles) {
      if (!fileExists(rel)) {
        rowIssues.push(`${row.id}: missing test file ${rel}`);
        automatedOk = false;
      }
    }
    for (const ref of row.manualRefs) {
      if (!fileExists(ref.doc)) {
        rowIssues.push(`${row.id}: missing manual doc ${ref.doc}`);
        manualDocOk = false;
        continue;
      }
      const text = readText(ref.doc) ?? "";
      const missingAnchors = ref.anchors.filter((anchor) => !text.includes(anchor));
      if (missingAnchors.length) {
        rowIssues.push(`${row.id}: ${ref.doc} missing anchors: ${missingAnchors.join(", ")}`);
        manualDocOk = false;
      }
    }
    if (rowIssues.length) issues.push(...rowIssues);
    rows.push({
      ...row,
      automatedOk,
      manualDocOk,
      issues: rowIssues,
    });
  }

  const engineeringReady = rows.every((r) => r.automatedOk && r.manualDocOk);
  return { engineeringReady, rows, issues, owner: QUALITY_LOOP_OWNER };
}

/**
 * @param {ReturnType<typeof assessQualityLoopInventory>} report
 */
export function formatQualityLoopPreflightReport(report) {
  const lines = ["WS-QUALITY Q1 — core loop inventory (L1–L8)", ""];
  lines.push(`Owner: ${report.owner}`);
  lines.push(
    `Q1 engineering: ${report.engineeringReady ? "☑" : "☐"} automated gates + manual doc anchors wired`
  );
  lines.push("");
  for (const row of report.rows) {
    lines.push(
      `  ${row.id} ${row.journey.slice(0, 48)}${row.journey.length > 48 ? "…" : ""}`
    );
    lines.push(
      `    Automated: ${row.automatedOk ? "☑" : "☐"} ${row.npmScripts.join(" · ")}`
    );
    const manualSummary = row.manualRefs
      .map((ref) => `${ref.anchors.join(", ")} → ${ref.doc}`)
      .join(" · ");
    lines.push(
      `    Manual doc: ${row.manualDocOk ? "☑" : "☐"} ${manualSummary} (human pass still required)`
    );
  }
  if (report.issues.length) {
    lines.push("");
    lines.push("Blockers:");
    for (const issue of report.issues) lines.push(`  ✗ ${issue}`);
  }
  lines.push("");
  lines.push("Q1 human exit (Q2 prerequisite): run DEVICE_OS_QA P0 rows on local stack + production WebKit (P0-W)");
  lines.push("Regression belt: npm run verify:desk:fast (CI) · npm run verify:desk (pre-merge)");
  lines.push("Sad-path backlog: docs/SAD_PATH_COVERAGE_AND_BACKLOG.md");
  lines.push("Next phase: Q2 Repair — close open P0 from DEVICE_OS_QA + P1-MOTO cluster");
  return lines.join("\n");
}
