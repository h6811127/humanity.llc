/**
 * WS-DOCKET chapter discovery pins engineering preflight.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DOCKET_CHAPTER_PINS_KIT_REL,
  DOCKET_CHAPTER_PINS_PAGE_PATH,
  projectDocketChapterDiscoveryPins,
  validateDocketChapterDiscoveryPins,
} from "../../site/js/docket-chapter-discovery-core.mjs";
import { DOCKET_STARTER_CASE_IDS } from "../../site/js/docket-discovery-opt-in-core.mjs";

/**
 * @param {string} root
 */
export function assessWsDocketChapterPinsPreflight(root) {
  /** @type {{ id: string; label: string; met: boolean; detail: string }[]} */
  const rows = [];

  const kit = existsSync(join(root, DOCKET_CHAPTER_PINS_KIT_REL));
  rows.push({
    id: "CH-kit",
    label: DOCKET_CHAPTER_PINS_KIT_REL,
    met: kit,
    detail: kit
      ? "npm run ws-docket:chapter-pins-kit"
      : "missing — npm run ws-docket:chapter-pins-kit",
  });

  const core = existsSync(join(root, "site/js/docket-chapter-discovery-core.mjs"));
  rows.push({
    id: "CH-core",
    label: "docket-chapter-discovery-core.mjs",
    met: core,
    detail: core ? "present" : "missing",
  });

  const page = existsSync(join(root, "site/docket/chapters/index.html"));
  rows.push({
    id: "CH-page",
    label: `site${DOCKET_CHAPTER_PINS_PAGE_PATH}index.html`,
    met: page,
    detail: page ? "branch surface" : "missing",
  });

  const registryPath = join(root, "site/data/docket-chapter-discovery-pins.json");
  let registryOk = false;
  let pinCount = 0;
  let projectedOk = false;
  try {
    const raw = JSON.parse(readFileSync(registryPath, "utf8"));
    const result = validateDocketChapterDiscoveryPins(raw);
    registryOk = result.ok;
    if (result.ok) {
      const projected = projectDocketChapterDiscoveryPins(result.doc);
      pinCount = projected.length;
      projectedOk =
        projected.length >= 1 &&
        projected.every((p) => p.pollutes_city_discovery === false);
    }
  } catch {
    registryOk = false;
  }
  rows.push({
    id: "CH-registry",
    label: "docket-chapter-discovery-pins.json validates",
    met: registryOk,
    detail: registryOk ? `${pinCount} pin(s)` : "invalid / missing",
  });
  rows.push({
    id: "CH-project",
    label: "projected pins keep city fence",
    met: projectedOk,
    detail: projectedOk ? "pollutes_city_discovery false" : "projection failed",
  });

  const pkg = readFileSync(join(root, "package.json"), "utf8");
  rows.push({
    id: "CH-npm-kit",
    label: "package.json ws-docket:chapter-pins-kit",
    met: pkg.includes('"ws-docket:chapter-pins-kit"'),
    detail: pkg.includes('"ws-docket:chapter-pins-kit"') ? "wired" : "missing",
  });
  rows.push({
    id: "CH-npm-preflight",
    label: "package.json ws-docket:chapter-pins-preflight",
    met: pkg.includes('"ws-docket:chapter-pins-preflight"'),
    detail: pkg.includes('"ws-docket:chapter-pins-preflight"')
      ? "wired"
      : "missing",
  });

  const rosterJs = readFileSync(join(root, "site/js/docket-roster.mjs"), "utf8");
  const caseCore = readFileSync(join(root, "site/js/docket-case-core.mjs"), "utf8");
  const linked =
    rosterJs.includes("renderDocketChapterPinsTeaserHtml") ||
    caseCore.includes(DOCKET_CHAPTER_PINS_PAGE_PATH) ||
    caseCore.includes("/docket/chapters/");
  rows.push({
    id: "CH-roster-link",
    label: "Roster / network goods link chapters",
    met: linked,
    detail: linked ? "wired" : "missing link",
  });

  let cityClean = false;
  try {
    const city = readFileSync(
      join(root, "site/data/discovery-cedar-rapids-iowa.json"),
      "utf8"
    );
    cityClean =
      !city.includes("docket_chapter") &&
      !city.includes("chapter-cr-research-circle") &&
      !city.includes("pin_docket_chapter_");
  } catch {
    cityClean = false;
  }
  rows.push({
    id: "CH-city-fence",
    label: "city discovery not polluted",
    met: cityClean,
    detail: cityClean
      ? "discovery-cedar-rapids-iowa.json clean"
      : "chapter pin leaked into city discovery",
  });

  let starterOff = true;
  for (const id of DOCKET_STARTER_CASE_IDS) {
    try {
      const raw = JSON.parse(
        readFileSync(join(root, `site/data/docket-case-${id}.json`), "utf8")
      );
      if (raw?.live_object?.discovery_opt_in !== false) starterOff = false;
    } catch {
      starterOff = false;
    }
  }
  rows.push({
    id: "CH-starter-off",
    label: "starter-four discovery_opt_in false",
    met: starterOff,
    detail: starterOff ? "gated" : "leak",
  });

  return { rows, engineeringMet: rows.every((r) => r.met) };
}

/**
 * @param {ReturnType<typeof assessWsDocketChapterPinsPreflight>} report
 */
export function formatWsDocketChapterPinsPreflightReport(report) {
  const lines = [
    "WS-DOCKET chapter pins preflight — non-starter C-v3 publish",
    "Canon: docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md",
    "",
  ];
  for (const row of report.rows) {
    lines.push(`  ${row.met ? "☑" : "☐"} ${row.label} — ${row.detail}`);
  }
  lines.push(
    "",
    report.engineeringMet
      ? "✅ WS-DOCKET chapter pins engineering preflight PASS"
      : "✗ WS-DOCKET chapter pins engineering preflight FAIL — fix ☐ rows above",
    "",
    "Next:",
    "  npm run ws-docket:chapter-pins-kit",
    `  Open ${DOCKET_CHAPTER_PINS_PAGE_PATH}`,
    "  Worker store · real child QR mint · license packs still deferred"
  );
  return lines.join("\n");
}
