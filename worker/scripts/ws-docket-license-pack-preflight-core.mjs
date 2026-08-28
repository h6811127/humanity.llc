/**
 * WS-DOCKET license-pack-v0 engineering preflight.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DOCKET_PHOTO_LICENSE_PACK_KIT_REL,
  applyReadyDocketPhotoLicensePacksToChecklist,
  validateDocketPhotoLicensePacks,
} from "../../site/js/docket-photo-license-pack-core.mjs";
import {
  assertStarterFourPhotosNotLicensed,
  resolveDocketPhotoSlot,
} from "../../site/js/docket-photo-core.mjs";
import { validateDocketPhotoLicenseChecklist } from "../../site/js/docket-case-core.mjs";

/**
 * @param {string} root
 */
export function assessWsDocketLicensePackPreflight(root) {
  /** @type {{ id: string; label: string; met: boolean; detail: string }[]} */
  const rows = [];

  const kit = existsSync(join(root, DOCKET_PHOTO_LICENSE_PACK_KIT_REL));
  rows.push({
    id: "LP-kit",
    label: DOCKET_PHOTO_LICENSE_PACK_KIT_REL,
    met: kit,
    detail: kit
      ? "npm run ws-docket:license-pack-kit"
      : "missing — npm run ws-docket:license-pack-kit",
  });

  const core = existsSync(join(root, "site/js/docket-photo-license-pack-core.mjs"));
  rows.push({
    id: "LP-core",
    label: "docket-photo-license-pack-core.mjs",
    met: core,
    detail: core ? "present" : "missing",
  });

  const asset = existsSync(
    join(root, "site/assets/docket/license-pack-rehearsal.svg")
  );
  rows.push({
    id: "LP-asset",
    label: "license-pack-rehearsal.svg",
    met: asset,
    detail: asset ? "present" : "missing",
  });

  const pkg = readFileSync(join(root, "package.json"), "utf8");
  rows.push({
    id: "LP-npm-kit",
    label: "package.json ws-docket:license-pack-kit",
    met: pkg.includes('"ws-docket:license-pack-kit"'),
    detail: pkg.includes('"ws-docket:license-pack-kit"') ? "wired" : "missing",
  });
  rows.push({
    id: "LP-npm-preflight",
    label: "package.json ws-docket:license-pack-preflight",
    met: pkg.includes('"ws-docket:license-pack-preflight"'),
    detail: pkg.includes('"ws-docket:license-pack-preflight"')
      ? "wired"
      : "missing",
  });

  let packsOk = false;
  let packsDoc = null;
  try {
    const raw = JSON.parse(
      readFileSync(join(root, "site/data/docket-photo-license-packs.json"), "utf8")
    );
    const result = validateDocketPhotoLicensePacks(raw);
    packsOk = result.ok;
    if (result.ok) packsDoc = result.doc;
  } catch {
    packsOk = false;
  }
  rows.push({
    id: "LP-packs-valid",
    label: "docket-photo-license-packs.json validates",
    met: packsOk,
    detail: packsOk ? "ok" : "invalid",
  });

  const checklist = JSON.parse(
    readFileSync(join(root, "site/data/docket-photo-license-checklist.json"), "utf8")
  );
  const checklistOk = validateDocketPhotoLicenseChecklist(checklist).ok;
  rows.push({
    id: "LP-checklist-valid",
    label: "photo checklist validates (incl. rehearsal)",
    met: checklistOk,
    detail: checklistOk ? "ok" : "invalid",
  });

  const starterGate = assertStarterFourPhotosNotLicensed(checklist);
  rows.push({
    id: "LP-starter-off",
    label: "Starter-four stay not_licensed",
    met: starterGate.ok,
    detail: starterGate.ok
      ? "monogram gate"
      : (starterGate.errors ?? []).join("; "),
  });

  const rehearsalRow = Array.isArray(checklist.cases)
    ? checklist.cases.find(
        (c) =>
          c &&
          typeof c === "object" &&
          String(/** @type {Record<string, unknown>} */ (c).id) ===
            "rehearsal-commons"
      )
    : null;
  const rehearsalLicensed =
    rehearsalRow &&
    typeof rehearsalRow === "object" &&
    String(/** @type {Record<string, unknown>} */ (rehearsalRow).license_status) ===
      "licensed" &&
    String(/** @type {Record<string, unknown>} */ (rehearsalRow).photo_ref ?? "") ===
      "/assets/docket/license-pack-rehearsal.svg";
  rows.push({
    id: "LP-rehearsal-live",
    label: "rehearsal-commons licensed in checklist",
    met: Boolean(rehearsalLicensed),
    detail: rehearsalLicensed ? "applied" : "missing",
  });

  const slot = resolveDocketPhotoSlot({
    photoRef: "/assets/docket/license-pack-rehearsal.svg",
    licenseStatus: "licensed",
    checklistPhotoRef: "/assets/docket/license-pack-rehearsal.svg",
  });
  rows.push({
    id: "LP-resolve",
    label: "resolveDocketPhotoSlot rehearsal asset",
    met: slot.mode === "photo",
    detail: slot.mode,
  });

  let applyOk = false;
  if (packsDoc) {
    try {
      const merged = applyReadyDocketPhotoLicensePacksToChecklist(
        {
          version: 1,
          phase: 2,
          policy: "test",
          cases: [
            {
              id: "altman",
              photo_ref: null,
              license_status: "not_licensed",
              notes: "x",
            },
            {
              id: "netanyahu",
              photo_ref: null,
              license_status: "not_licensed",
              notes: "x",
            },
            {
              id: "putin",
              photo_ref: null,
              license_status: "not_licensed",
              notes: "x",
            },
            {
              id: "musk",
              photo_ref: null,
              license_status: "not_licensed",
              notes: "x",
            },
          ],
        },
        packsDoc
      );
      applyOk =
        assertStarterFourPhotosNotLicensed(merged).ok &&
        merged.cases.some(
          (c) =>
            c &&
            typeof c === "object" &&
            String(/** @type {Record<string, unknown>} */ (c).id) ===
              "rehearsal-commons" &&
            String(
              /** @type {Record<string, unknown>} */ (c).license_status
            ) === "licensed"
        );
    } catch {
      applyOk = false;
    }
  }
  rows.push({
    id: "LP-apply",
    label: "applyReady… keeps starter-four off + rehearsal on",
    met: applyOk,
    detail: applyOk ? "ok" : "failed",
  });

  const stewardJs = readFileSync(join(root, "site/js/docket-steward-page.mjs"), "utf8");
  rows.push({
    id: "LP-steward",
    label: "Steward mounts license pack slot",
    met:
      stewardJs.includes("renderDocketPhotoLicensePackStewardHtml") &&
      stewardJs.includes("DOCKET_PHOTO_LICENSE_PACKS_PATH"),
    detail: stewardJs.includes("renderDocketPhotoLicensePackStewardHtml")
      ? "wired"
      : "missing",
  });

  rows.push({
    id: "LP-faces-fence",
    label: "starter_four_faces_live false",
    met: packsDoc?.starter_four_faces_live === false,
    detail:
      packsDoc?.starter_four_faces_live === false ? "gated" : "fence broken",
  });

  return { rows, engineeringMet: rows.every((r) => r.met) };
}

/**
 * @param {ReturnType<typeof assessWsDocketLicensePackPreflight>} report
 */
export function formatWsDocketLicensePackPreflightReport(report) {
  const lines = [
    "WS-DOCKET license-pack-v0 preflight — formal photo packs",
    "Canon: docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § Photographs",
    "",
  ];
  for (const row of report.rows) {
    lines.push(`  ${row.met ? "☑" : "☐"} ${row.label} — ${row.detail}`);
  }
  lines.push(
    "",
    report.engineeringMet
      ? "✅ WS-DOCKET license-pack-v0 engineering preflight PASS"
      : "✗ WS-DOCKET license-pack-v0 engineering preflight FAIL — fix ☐ rows above",
    "",
    "Next:",
    "  npm run ws-docket:license-pack-kit",
    "  Open /docket/altman/steward/#photos",
    "  Real human likeness packs · production steward key custody · production chapter mint replay"
  );
  return lines.join("\n");
}
