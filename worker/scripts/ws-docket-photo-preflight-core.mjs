/**
 * WS-DOCKET photo Phase 2 engineering preflight.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DOCKET_CASE_IDS,
  validateDocketCase,
  validateDocketPhotoLicenseChecklist,
} from "../../site/js/docket-case-core.mjs";
import {
  DOCKET_PHOTO_KIT_REL,
  assertStarterFourPhotosNotLicensed,
  resolveDocketPhotoSlot,
} from "../../site/js/docket-photo-core.mjs";

/**
 * @param {string} root
 */
export function assessWsDocketPhotoPreflight(root) {
  /** @type {{ id: string; label: string; met: boolean; detail: string }[]} */
  const rows = [];

  const kit = existsSync(join(root, DOCKET_PHOTO_KIT_REL));
  rows.push({
    id: "PH-kit",
    label: DOCKET_PHOTO_KIT_REL,
    met: kit,
    detail: kit ? "npm run ws-docket:photo-kit" : "missing — npm run ws-docket:photo-kit",
  });

  const core = existsSync(join(root, "site/js/docket-photo-core.mjs"));
  rows.push({
    id: "PH-core",
    label: "docket-photo-core.mjs",
    met: core,
    detail: core ? "present" : "missing",
  });

  const pkg = readFileSync(join(root, "package.json"), "utf8");
  rows.push({
    id: "PH-npm-kit",
    label: "package.json ws-docket:photo-kit",
    met: pkg.includes('"ws-docket:photo-kit"'),
    detail: pkg.includes('"ws-docket:photo-kit"') ? "wired" : "missing",
  });
  rows.push({
    id: "PH-npm-preflight",
    label: "package.json ws-docket:photo-preflight",
    met: pkg.includes('"ws-docket:photo-preflight"'),
    detail: pkg.includes('"ws-docket:photo-preflight"') ? "wired" : "missing",
  });

  const checklist = JSON.parse(
    readFileSync(join(root, "site/data/docket-photo-license-checklist.json"), "utf8")
  );
  const checklistOk = validateDocketPhotoLicenseChecklist(checklist).ok;
  rows.push({
    id: "PH-checklist-valid",
    label: "photo checklist validates",
    met: checklistOk,
    detail: checklistOk ? "ok" : "invalid",
  });

  const starterGate = assertStarterFourPhotosNotLicensed(checklist);
  rows.push({
    id: "PH-starter-off",
    label: "Starter-four stay not_licensed",
    met: starterGate.ok,
    detail: starterGate.ok
      ? "monogram gate"
      : (starterGate.errors ?? []).join("; "),
  });

  let casesPhotoNull = true;
  for (const id of DOCKET_CASE_IDS) {
    const raw = JSON.parse(
      readFileSync(join(root, `site/data/docket-case-${id}.json`), "utf8")
    );
    if (!validateDocketCase(raw).ok) casesPhotoNull = false;
    if (raw.photo_ref != null) casesPhotoNull = false;
  }
  rows.push({
    id: "PH-cases-null",
    label: "Case JSON photo_ref null",
    met: casesPhotoNull,
    detail: casesPhotoNull ? "all null" : "unexpected photo_ref",
  });

  const licensedDemo = resolveDocketPhotoSlot({
    photoRef: "/assets/red_qr_transparent_bg.png",
    licenseStatus: "licensed",
    checklistPhotoRef: "/assets/red_qr_transparent_bg.png",
  });
  rows.push({
    id: "PH-resolve-licensed",
    label: "resolveDocketPhotoSlot licensed path",
    met: licensedDemo.mode === "photo",
    detail: licensedDemo.mode,
  });

  const failOpen = resolveDocketPhotoSlot({
    photoRef: "/assets/red_qr_transparent_bg.png",
    licenseStatus: "not_licensed",
  });
  rows.push({
    id: "PH-fail-open",
    label: "fail open to monogram without license",
    met: failOpen.mode === "monogram",
    detail: failOpen.mode,
  });

  const stewardJs = readFileSync(join(root, "site/js/docket-steward-page.mjs"), "utf8");
  rows.push({
    id: "PH-steward-ui",
    label: "Steward mounts photos panel",
    met: stewardJs.includes("mountDocketPhotosPanel"),
    detail: stewardJs.includes("mountDocketPhotosPanel") ? "wired" : "missing",
  });

  return { rows, engineeringMet: rows.every((r) => r.met) };
}

/**
 * @param {ReturnType<typeof assessWsDocketPhotoPreflight>} report
 */
export function formatWsDocketPhotoPreflightReport(report) {
  const lines = [
    "WS-DOCKET photo Phase 2 preflight",
    "Canon: docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § Photographs",
    "",
  ];
  for (const row of report.rows) {
    lines.push(`  ${row.met ? "☑" : "☐"} ${row.label} — ${row.detail}`);
  }
  lines.push(
    "",
    report.engineeringMet
      ? "✅ WS-DOCKET photo Phase 2 engineering preflight PASS"
      : "✗ WS-DOCKET photo Phase 2 engineering preflight FAIL — fix ☐ rows above",
    "",
    "Next:",
    "  npm run ws-docket:photo-kit",
    "  Open /docket/{id}/steward/#photos",
    "  Keep starter-four not_licensed until a real license pack"
  );
  return lines.join("\n");
}
