import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  assessQualityLoopInventory,
  formatQualityLoopPreflightReport,
  QUALITY_LOOP_INVENTORY,
} from "../scripts/ws-quality-loop-inventory-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

describe("ws-quality-loop-inventory-core", () => {
  it("defines L1–L8 inventory rows", () => {
    expect(QUALITY_LOOP_INVENTORY.map((r) => r.id)).toEqual([
      "L1",
      "L2",
      "L3",
      "L4",
      "L5",
      "L6",
      "L7",
      "L8",
    ]);
  });

  it("assessQualityLoopInventory passes on repo package.json + test files", () => {
    const report = assessQualityLoopInventory(
      packageJson.scripts ?? {},
      (rel) => existsSync(join(root, rel)),
      (rel) => readFileSync(join(root, rel), "utf8")
    );
    expect(report.engineeringReady).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.rows.every((r) => r.automatedOk && r.manualDocOk)).toBe(true);
  });

  it("formatQualityLoopPreflightReport lists Q2 next step", () => {
    const report = assessQualityLoopInventory(
      packageJson.scripts ?? {},
      (rel) => existsSync(join(root, rel)),
      (rel) => readFileSync(join(root, rel), "utf8")
    );
    const text = formatQualityLoopPreflightReport(report);
    expect(text).toContain("WS-QUALITY Q1");
    expect(text).toContain("Q2 Repair");
    expect(text).toContain("verify:desk");
  });
});
