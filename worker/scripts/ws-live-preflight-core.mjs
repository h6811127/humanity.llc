/**
 * WS-LIVE engineering preflight — five-layer Orders 1–6 + LO-1–LO-5 gate assessment.
 * @see docs/PRODUCT_WORKSTREAM_COORDINATION.md § WS-LIVE
 * @see docs/LIVE_OBJECT_ARCHITECTURE.md § Recommended build sequence
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  SUMMER_OPEN_NODE_COUNT,
  SUMMER_WAVE_OPEN_NODE_COUNT,
} from "./city-game-summer-scale-core.mjs";
import {
  assessLaunchChecklistReady,
  findLaunchChecklistRow,
  launchChecklistRowIsSigned,
} from "./city-game-launch-checklist-core.mjs";
import {
  assessLo4KitReady,
  LO4_KIT_REL as LO4_REFERENCE_KIT_REL,
} from "./city-game-reference-network-kit-core.mjs";

export const WS_LIVE_COORDINATION_REL = "docs/PRODUCT_WORKSTREAM_COORDINATION.md";
export const LIVE_OBJECT_ARCH_REL = "docs/LIVE_OBJECT_ARCHITECTURE.md";
export const STATUS_PLATE_PILOT_REL = "docs/STATUS_PLATE_PILOT.md";
export const LOST_ITEM_PILOT_REL = "docs/LOST_ITEM_RELAY_PILOT.md";
export const LO1_KIT_REL = "site/dev/ws-live-lo1-comprehension.html";
export const LO4_KIT_REL = LO4_REFERENCE_KIT_REL;

/** @typedef {{ id: string; label: string; met: boolean; detail: string; human?: boolean }} GateRow */

/**
 * @param {string} root
 * @param {string} rel
 */
function readRepoFile(root, rel) {
  const path = join(root, rel);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

/**
 * Layer 1 / Order 1 — child object graph + /created/ add hub (engineering, not human LO-1).
 * @param {string} root
 */
export function assessWsLiveOrder1Layer1(root) {
  const createdHtml = readRepoFile(root, "site/created/index.html") ?? "";
  const createdJs = readRepoFile(root, "site/js/created.mjs") ?? "";
  /** @type {GateRow[]} */
  const rows = [];

  const hubIds = [
    "child-object-add-hub",
    "child-object-add-status-plate",
    "child-object-add-lost-item",
    "child-object-status-plate-form",
    "child-object-lost-item-form",
  ];
  for (const id of hubIds) {
    rows.push({
      id: `L1-${id}`,
      label: `/created/ #${id}`,
      met: createdHtml.includes(`id="${id}"`),
      detail: createdHtml.includes(`id="${id}"`) ? "present" : "missing from created/index.html",
    });
  }

  rows.push({
    id: "L1-add-hub-wired",
    label: "created.mjs syncChildObjectAddHub",
    met: createdJs.includes("syncChildObjectAddHub"),
    detail: createdJs.includes("syncChildObjectAddHub") ? "wired" : "not imported/called",
  });

  const showcaseFiles = [
    "site/data/showcase-status-plate.json",
    "site/data/showcase-lost-item.json",
  ];
  for (const rel of showcaseFiles) {
    rows.push({
      id: `L1-${rel.split("/").pop()}`,
      label: rel,
      met: existsSync(join(root, rel)),
      detail: existsSync(join(root, rel)) ? "on disk" : "missing — run site:seed-showcase*",
    });
  }

  const vitestPaths = [
    "worker/tests/created-child-object.test.ts",
    "worker/tests/issue-child-object-qr.test.ts",
    "worker/tests/live-object-child-scan.test.ts",
    "worker/tests/created-child-object-add-hub-core.test.ts",
  ];
  for (const rel of vitestPaths) {
    rows.push({
      id: `L1-test-${rel.split("/").pop()?.replace(".test.ts", "")}`,
      label: rel,
      met: existsSync(join(root, rel)),
      detail: existsSync(join(root, rel)) ? "test file exists" : "missing regression",
    });
  }

  const pilotDocs = [STATUS_PLATE_PILOT_REL, LOST_ITEM_PILOT_REL];
  for (const rel of pilotDocs) {
    rows.push({
      id: `LO-1-doc-${rel}`,
      label: rel,
      met: existsSync(join(root, rel)),
      detail: existsSync(join(root, rel)) ? "pilot runbook present" : "missing",
    });
  }

  const engineeringMet = rows.filter((r) => !r.id.startsWith("LO-1-doc")).every((r) => r.met);
  return { rows, engineeringMet };
}

/**
 * Orders 2–5 — live-object + city-game module regression files exist.
 * @param {string} root
 */
export function assessWsLiveLayerRegressionFiles(root) {
  /** @type {GateRow[]} */
  const rows = [];
  const groups = {
    "L2-verbs": [
      "worker/tests/live-object-scan-capabilities.test.ts",
      "worker/tests/lost-item-offer.test.ts",
    ],
    "L3-streams": ["worker/tests/live-object-stream-policy.test.ts"],
    "L4-time": ["worker/tests/live-object-time-policy.test.ts"],
    "L5-network": [
      "worker/tests/live-object-network-graph.test.ts",
      "worker/tests/network-graph-core.test.ts",
    ],
    "L6-spec": [
      "worker/tests/live-object-staleness-contract.test.ts",
      "worker/tests/live-object-delegation-spec.test.ts",
      "worker/tests/live-object-succession-spec.test.ts",
    ],
  };

  for (const [group, files] of Object.entries(groups)) {
    for (const rel of files) {
      rows.push({
        id: `${group}-${rel.split("/").pop()}`,
        label: rel,
        met: existsSync(join(root, rel)),
        detail: existsSync(join(root, rel)) ? "ok" : "missing",
      });
    }
  }

  return { rows, engineeringMet: rows.every((r) => r.met) };
}

/**
 * LO-2 — Cedar Rapids field launch engineering (human C5 separate).
 * @param {string} root
 */
export function assessWsLiveLo2FieldLaunch(root) {
  const wrangler = readRepoFile(root, "worker/wrangler.toml") ?? "";
  const seasonRaw = readRepoFile(root, "site/data/city-game-cr-season-01.json");
  /** @type {GateRow[]} */
  const rows = [];

  rows.push({
    id: "LO-2-city-game-enabled",
    label: "CITY_GAME_ENABLED=1 in wrangler.toml",
    met: /CITY_GAME_ENABLED\s*=\s*"1"/.test(wrangler),
    detail: /CITY_GAME_ENABLED\s*=\s*"1"/.test(wrangler) ? "enabled" : "not enabled",
  });

  let season = null;
  try {
    season = seasonRaw ? JSON.parse(seasonRaw) : null;
  } catch {
    season = null;
  }

  rows.push({
    id: "LO-2-season-root",
    label: "season_root_profile_id set",
    met: Boolean(season?.season_root_profile_id?.trim()),
    detail: season?.season_root_profile_id?.trim() || "unset",
  });

  rows.push({
    id: "LO-2-season-window",
    label: "season window starts_at + ends_at",
    met: Boolean(season?.window?.starts_at?.trim() && season?.window?.ends_at?.trim()),
    detail:
      season?.window?.starts_at && season?.window?.ends_at
        ? `${season.window.starts_at} → ${season.window.ends_at}`
        : "unset",
  });

  const nodeCount = Array.isArray(season?.nodes) ? season.nodes.length : 0;
  const seasonFootprintMet =
    nodeCount === SUMMER_OPEN_NODE_COUNT || nodeCount === SUMMER_WAVE_OPEN_NODE_COUNT;
  rows.push({
    id: "LO-2-pilot-nodes",
    label: `Season registry (${SUMMER_OPEN_NODE_COUNT} pilot or ${SUMMER_WAVE_OPEN_NODE_COUNT} wave-open)`,
    met: seasonFootprintMet,
    detail: `${nodeCount} nodes in city-game-cr-season-01.json`,
  });

  const checklist = readRepoFile(root, "docs/CITY_GAME_LAUNCH_CHECKLIST.md") ?? "";
  const e1Line = findLaunchChecklistRow(checklist, "E1");
  const e4Line = findLaunchChecklistRow(checklist, "E4");
  const e1Signed = e1Line ? launchChecklistRowIsSigned(e1Line) : false;
  const e4Signed = e4Line ? launchChecklistRowIsSigned(e4Line) : false;
  rows.push({
    id: "LO-2-launch-checklist-e1",
    label: "Launch checklist E1 verify:city-game",
    met: e1Signed,
    detail: e1Signed ? "signed in checklist" : "open — run verify:city-game",
  });
  rows.push({
    id: "LO-2-launch-checklist-e4",
    label: "Launch checklist E4 worker deploy",
    met: e4Signed,
    detail: e4Signed ? "signed in checklist" : "open — CITY_GAME_ENABLED deploy",
  });

  const launchReady = assessLaunchChecklistReady({ launchChecklistDoc: checklist });
  rows.push({
    id: "LO-2-launch-checklist-c5",
    label: "Launch checklist C5 (human)",
    met: launchReady.c5Signed,
    detail: launchReady.c5Signed ? "signed" : "pending human gates",
    human: true,
  });

  rows.push({
    id: "LO-2-smoke-script",
    label: "city-game:smoke-production script",
    met: existsSync(join(root, "worker/scripts/city-game-smoke-production.mjs")),
    detail: "npm run city-game:smoke-production",
  });

  const engineeringMet = rows.filter((r) => !r.human).every((r) => r.met);
  return { rows, engineeringMet };
}

/**
 * LO-3 — summer wave-open footprint (40 nodes) — separate from 15-node pilot verify gate.
 * @param {string} root
 */
export function assessWsLiveLo3Footprint(root) {
  const wavePath = join(root, "site/data/city-game-cr-season-01-wave-open-nodes.json");
  const seasonRaw = readRepoFile(root, "site/data/city-game-cr-season-01.json");
  /** @type {GateRow[]} */
  const rows = [];

  let seasonCount = 0;
  try {
    const season = seasonRaw ? JSON.parse(seasonRaw) : null;
    seasonCount = Array.isArray(season?.nodes) ? season.nodes.length : 0;
  } catch {
    seasonCount = 0;
  }

  rows.push({
    id: "LO-3-wave-open-json",
    label: "wave-open nodes JSON (16–40 scaffold)",
    met: existsSync(wavePath),
    detail: existsSync(wavePath) ? "site/data/city-game-cr-season-01-wave-open-nodes.json" : "missing",
  });

  rows.push({
    id: "LO-3-merged-footprint",
    label: `Merged season JSON (${SUMMER_WAVE_OPEN_NODE_COUNT} nodes target)`,
    met: seasonCount === SUMMER_WAVE_OPEN_NODE_COUNT,
    detail: `${seasonCount}/${SUMMER_WAVE_OPEN_NODE_COUNT} — run city-game:merge-wave-open when scaling`,
    human: seasonCount !== SUMMER_WAVE_OPEN_NODE_COUNT,
  });

  rows.push({
    id: "LO-3-install-qa",
    label: "Install QA runbook",
    met: existsSync(join(root, "docs/CITY_GAME_INSTALL_QA.md")),
    detail: "human B7 gate — see CITY_GAME_INSTALL_QA.md P2",
    human: true,
  });

  const engineeringMet = rows.filter((r) => !r.human).every((r) => r.met);
  return { rows, engineeringMet };
}

/**
 * LO-1 kit — field walk page for printed pilots.
 * @param {string} root
 */
export function assessWsLiveLo1Kit(root) {
  const kitExists = existsSync(join(root, LO1_KIT_REL));
  return {
    rows: [
      {
        id: "LO-1-kit-page",
        label: LO1_KIT_REL,
        met: kitExists,
        detail: kitExists ? "run npm run ws-live:lo1-kit" : "missing — run npm run ws-live:lo1-kit",
      },
    ],
    engineeringMet: kitExists,
  };
}

/**
 * LO-4 — reference network teaching package (engineering → human C2 sign-off).
 * @param {string} root
 */
export function assessWsLiveLo4ReferenceNetwork(root) {
  const kitExists = existsSync(join(root, LO4_KIT_REL));
  const coreRel = "site/js/city-game-reference-network-core.mjs";
  const coreTestRel = "worker/tests/city-game-reference-network-core.test.ts";
  const coreExists = existsSync(join(root, coreRel));
  const coreTestExists = existsSync(join(root, coreTestRel));
  const coreSource = readRepoFile(root, coreRel) ?? "";
  const scorecardMet =
    coreSource.includes("LO4_SCORECARD_ROWS") &&
    coreSource.includes('"RN-1"') &&
    coreSource.includes('"RN-5"');
  const teaching = assessLo4KitReady(root);

  /** @type {GateRow[]} */
  const rows = [
    {
      id: "LO-4-kit-page",
      label: LO4_KIT_REL,
      met: kitExists,
      detail: kitExists
        ? "npm run city-game:reference-network-kit"
        : "missing — npm run city-game:reference-network-kit",
    },
    {
      id: "LO-4-reference-network-core",
      label: coreRel,
      met: coreExists && coreTestExists,
      detail:
        coreExists && coreTestExists
          ? `${coreTestRel} regression`
          : "core module or test missing",
    },
    {
      id: "LO-4-rn-scorecard",
      label: "RN-1–RN-5 scorecard documented",
      met: scorecardMet,
      detail: scorecardMet ? "LO4_SCORECARD_ROWS in reference-network-core" : "scorecard rows missing",
    },
    {
      id: "LO-4-teaching-package",
      label: "Seven-surface teaching package (season JSON)",
      met: teaching.ready,
      detail: teaching.ready
        ? "network_charter + spine probes valid"
        : teaching.issues.join("; ") || "validation failed",
    },
    {
      id: "LO-4-integrated-comprehension",
      label: "LO-4 integrated stranger walk (human · C2)",
      met: false,
      detail: `≥${teaching.minStrangers} strangers · rules-first · RN-1–RN-5 · game node + status plate · ${LO4_KIT_REL}`,
      human: true,
    },
  ];

  const engineeringMet = rows.filter((r) => !r.human).every((r) => r.met);
  return { rows, engineeringMet };
}

/**
 * LO-5 — public copy honesty (PSO page still research until launch).
 * @param {string} root
 */
export function assessWsLiveLo5PublicCopy(root) {
  const psoHtml = readRepoFile(root, "site/what-can-a-qr-do/physical-software-objects/index.html") ?? "";
  const saysResearch = /Research,\s*not shipping yet/i.test(psoHtml);
  return {
    rows: [
      {
        id: "LO-5-pso-research-banner",
        label: "PSO page research banner (pre-launch expected)",
        met: saysResearch,
        detail: saysResearch
          ? "honest until LO-2 C5 — then update copy + LO-5"
          : "remove research banner only after LO-2 field launch signed",
      },
    ],
    engineeringMet: true,
  };
}

/**
 * @param {{
 *   order1: ReturnType<typeof assessWsLiveOrder1Layer1>;
 *   layers: ReturnType<typeof assessWsLiveLayerRegressionFiles>;
 *   lo2: ReturnType<typeof assessWsLiveLo2FieldLaunch>;
 *   lo3: ReturnType<typeof assessWsLiveLo3Footprint>;
 *   lo1Kit: ReturnType<typeof assessWsLiveLo1Kit>;
 *   lo4: ReturnType<typeof assessWsLiveLo4ReferenceNetwork>;
 *   lo5: ReturnType<typeof assessWsLiveLo5PublicCopy>;
 * }} input
 */
export function wsLiveEngineeringReady(input) {
  return (
    input.order1.engineeringMet &&
    input.layers.engineeringMet &&
    input.lo1Kit.engineeringMet &&
    input.lo4.engineeringMet
  );
}

/**
 * @param {{
 *   order1: ReturnType<typeof assessWsLiveOrder1Layer1>;
 *   layers: ReturnType<typeof assessWsLiveLayerRegressionFiles>;
 *   lo2: ReturnType<typeof assessWsLiveLo2FieldLaunch>;
 *   lo3: ReturnType<typeof assessWsLiveLo3Footprint>;
 *   lo1Kit: ReturnType<typeof assessWsLiveLo1Kit>;
 *   lo4: ReturnType<typeof assessWsLiveLo4ReferenceNetwork>;
 *   lo5: ReturnType<typeof assessWsLiveLo5PublicCopy>;
 * }} input
 */
export function formatWsLivePreflightReport(input) {
  const lines = [
    "WS-LIVE preflight — physical software objects + five-layer stack",
    `Canon: ${LIVE_OBJECT_ARCH_REL} · ${WS_LIVE_COORDINATION_REL}`,
    "",
    "── Five layers (engineering files) ──",
  ];

  for (const row of input.order1.rows) {
    lines.push(`  ${row.met ? "☑" : "☐"} [L1/Order 1] ${row.label} — ${row.detail}`);
  }
  for (const row of input.layers.rows) {
    lines.push(`  ${row.met ? "☑" : "☐"} ${row.label} — ${row.detail}`);
  }

  lines.push("", "── LO-1 Order 1 pilot (engineering → human sign-off) ──");
  for (const row of input.lo1Kit.rows.filter((r) => r.id.startsWith("LO-1"))) {
    lines.push(`  ${row.met ? "☑" : "☐"} ${row.label} — ${row.detail}`);
  }
  lines.push(
    "  ☐ Human — printed status plate + lost-item relay ([STATUS_PLATE_PILOT.md](docs/STATUS_PLATE_PILOT.md))"
  );

  lines.push("", "── LO-2 Cedar Rapids field launch ──");
  for (const row of input.lo2.rows) {
    lines.push(`  ${row.met ? "☑" : "☐"} ${row.label} — ${row.detail}`);
  }
  lines.push("  ☐ Human — C5 launch checklist signed (CITY_GAME_LAUNCH_CHECKLIST.md)");

  lines.push("", "── LO-3 summer footprint (~40 nodes) ──");
  for (const row of input.lo3.rows) {
    const prefix = row.human ? "☐ human" : row.met ? "☑" : "☐";
    lines.push(`  ${prefix} ${row.label} — ${row.detail}`);
  }

  lines.push("", "── LO-4 reference network (C2 engineering → human) ──");
  for (const row of input.lo4.rows) {
    const prefix = row.human ? "☐ human" : row.met ? "☑" : "☐";
    lines.push(`  ${prefix} ${row.label} — ${row.detail}`);
  }

  lines.push("", "── LO-5 ──");
  for (const row of input.lo5.rows) {
    const prefix = row.human ? "☐ human" : row.met ? "☑" : "☐";
    lines.push(`  ${prefix} ${row.label} — ${row.detail}`);
  }

  const eng = wsLiveEngineeringReady(input);
  lines.push(
    "",
    eng
      ? "✅ WS-LIVE engineering preflight PASS (human LO-1–LO-4 still open)"
      : "✗ WS-LIVE engineering preflight FAIL — fix ☐ rows above",
    "",
    "Next commands:",
    "  npm run ws-live:lo1-kit                 # regenerate LO-1 field walk (phones)",
    "  npm run city-game:reference-network-kit # regenerate LO-4 teaching kit",
    "  npm run verify:live:fast                # CI belt",
    "  npm run verify:live              # pre-merge belt",
    "  npm run city-game:launch-preflight  # LO-2 detail"
  );

  return lines.join("\n");
}

/**
 * @param {string} root
 */
export function assessWsLivePreflight(root) {
  const order1 = assessWsLiveOrder1Layer1(root);
  const layers = assessWsLiveLayerRegressionFiles(root);
  const lo2 = assessWsLiveLo2FieldLaunch(root);
  const lo3 = assessWsLiveLo3Footprint(root);
  const lo1Kit = assessWsLiveLo1Kit(root);
  const lo4 = assessWsLiveLo4ReferenceNetwork(root);
  const lo5 = assessWsLiveLo5PublicCopy(root);
  return { order1, layers, lo2, lo3, lo1Kit, lo4, lo5 };
}
