import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  applyInstallMapInstalledPass,
  applyInstallMapQrIssuedPass,
  applyLaunchChecklistO2Pass,
  assessInstallMapReady,
  parseInstallMapRegistry,
  parseInstallMapRow,
} from "../scripts/city-game-install-map-core.mjs";
import { LAUNCH_CHECKLIST_O2_PENDING } from "../scripts/city-game-launch-checklist-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const installMapSample = readFileSync(
  join(root, "docs/CITY_GAME_NODE_INSTALL_MAP.md"),
  "utf8"
);

describe("city-game-install-map-core", () => {
  it("parses install map registry rows", () => {
    const row = parseInstallMapRow(
      "| node_04 | Riverwalk River Lantern | river_spine | obj_cr_node_04_river | ☐ | ☐ | Temp drop |"
    );
    expect(row?.node_id).toBe("node_04");
    expect(row?.installed).toBe(false);
    expect(row?.qrIssued).toBe(false);
    expect(parseInstallMapRegistry(installMapSample)).toHaveLength(15);
  });

  it("assesses QR issued from doc with install and contacts still pending", () => {
    const result = assessInstallMapReady({
      installMapDoc: installMapSample,
      localSeed: {
        nodes: Array.from({ length: 15 }, (_, i) => ({
          node_id: `node_${String(i + 1).padStart(2, "0")}`,
          scan_url: "https://humanity.llc/c/p?q=qr",
        })),
      },
    });
    expect(result.qrReady).toBe(true);
    expect(result.installedReady).toBe(false);
    expect(result.contactsReady).toBe(false);
    expect(result.readyForPhysicalQa).toBe(false);
  });

  it("marks QR issued and installed columns", () => {
    const nodeIds = parseInstallMapRegistry(installMapSample).map((row) => row.node_id);
    let doc = applyInstallMapQrIssuedPass(installMapSample, nodeIds);
    const afterQr = assessInstallMapReady({ installMapDoc: doc });
    expect(afterQr.qrReady).toBe(true);
    expect(afterQr.installedReady).toBe(false);

    doc = applyInstallMapInstalledPass(doc, nodeIds);
    const afterInstalled = assessInstallMapReady({ installMapDoc: doc });
    expect(afterInstalled.installedReady).toBe(true);
  });

  it("applies launch checklist O2 pass marker", () => {
    const out = applyLaunchChecklistO2Pass(`before\n${LAUNCH_CHECKLIST_O2_PENDING}\nafter`, {
      dateIso: "2026-06-04",
    });
    expect(out).toContain("☑ **2026-06-04**");
    expect(out).not.toContain(LAUNCH_CHECKLIST_O2_PENDING);
  });
});
