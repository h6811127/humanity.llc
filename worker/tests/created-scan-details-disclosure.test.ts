import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  countFilledObjectStreams,
  formatScanDetailsSummaryMeta,
  readScanDetailsOnboardingDone,
  shouldOpenScanDetailsDisclosure,
  writeScanDetailsOnboardingDone,
} from "../../site/js/created-scan-details-disclosure-core.mjs";

const repoRoot = path.join(fileURLToPath(new URL("../..", import.meta.url)));
const createdHtmlPath = path.join(repoRoot, "site/created/index.html");
const manifestoUpdatePath = path.join(repoRoot, "site/js/created-manifesto-update.mjs");

describe("created scan details disclosure", () => {
  it("opens on first visit and when streams already exist", () => {
    expect(
      shouldOpenScanDetailsDisclosure({ onboardingDone: false, filledStreamCount: 0 })
    ).toBe(true);
    expect(
      shouldOpenScanDetailsDisclosure({ onboardingDone: true, filledStreamCount: 2 })
    ).toBe(true);
    expect(
      shouldOpenScanDetailsDisclosure({ onboardingDone: true, filledStreamCount: 0 })
    ).toBe(false);
  });

  it("persists onboarding ack per profile in localStorage", () => {
    const storage = {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
    };
    expect(readScanDetailsOnboardingDone(storage, "prof_a")).toBe(false);
    writeScanDetailsOnboardingDone(storage, "prof_a");
    expect(readScanDetailsOnboardingDone(storage, "prof_a")).toBe(true);
    expect(readScanDetailsOnboardingDone(storage, "prof_b")).toBe(false);
  });

  it("summary meta reflects filled rows and dirty state", () => {
    expect(formatScanDetailsSummaryMeta({ filledCount: 0, dirty: false })).toBe("Optional");
    expect(formatScanDetailsSummaryMeta({ filledCount: 2, dirty: true })).toBe(
      "2 lines set · unsaved"
    );
  });

  it("counts filled object_streams from session", () => {
    expect(countFilledObjectStreams([])).toBe(0);
    expect(
      countFilledObjectStreams([
        { label: "Tasks", value: "Water beds" },
        { label: "", value: "" },
      ])
    ).toBe(1);
  });

  it("created page places publish before collapsed scan details", () => {
    const html = fs.readFileSync(createdHtmlPath, "utf8");
    expect(html).toContain('id="manifesto-update-submit"');
    expect(html).toContain('id="update-object-streams-details"');
    expect(html).toContain("Extra lines on scan card");
    expect(html).toContain('id="created-live-scanners-see-post-publish"');
    const submitIdx = html.indexOf('id="manifesto-update-submit"');
    const detailsIdx = html.indexOf('id="update-object-streams-details"');
    expect(submitIdx).toBeGreaterThan(-1);
    expect(detailsIdx).toBeGreaterThan(submitIdx);
  });

  it("manifesto update wires disclosure core", () => {
    const src = fs.readFileSync(manifestoUpdatePath, "utf8");
    expect(src).toContain("created-scan-details-disclosure-core.mjs");
    expect(src).toContain("update-object-streams-details");
    expect(src).toContain("writeScanDetailsOnboardingDone");
  });
});
