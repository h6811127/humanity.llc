import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { DOCKET_CASE_IDS, validateDocketCase, validateDocketCasesIndex } from "../../site/js/docket-case-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const docketPath = join(root, "site/docket/index.html");
const dataDir = join(root, "site/data");

describe("Public Docket Most Wanted list (landing destination)", () => {
  const html = readFileSync(docketPath, "utf8");

  it("opens on Humanity’s Most Wanted list, not charter-first stub", () => {
    expect(html).toContain("<h1>Humanity’s Most Wanted</h1>");
    expect(html).toContain('id="wanted"');
    expect(html).toContain('class="docket-wanted-list"');
    const wantedIdx = html.indexOf('id="wanted"');
    const charterIdx = html.indexOf('id="charter"');
    expect(wantedIdx).toBeGreaterThan(-1);
    expect(charterIdx).toBeGreaterThan(wantedIdx);
  });

  it("hydrates roster from case JSON (WS-DOCKET-B)", () => {
    expect(html).toContain("docket-roster.mjs");
    expect(html).toContain("docket.css");
    expect(html).toContain("/docket/netanyahu/");
    expect(existsSync(join(dataDir, "docket-cases-index.json"))).toBe(true);
    const index = JSON.parse(
      readFileSync(join(dataDir, "docket-cases-index.json"), "utf8")
    );
    expect(validateDocketCasesIndex(index).ok).toBe(true);
    for (const id of DOCKET_CASE_IDS) {
      const raw = JSON.parse(
        readFileSync(join(dataDir, `docket-case-${id}.json`), "utf8")
      );
      expect(validateDocketCase(raw).ok).toBe(true);
    }
    expect(index.cases.map((c) => c.display_name)).toEqual(
      expect.arrayContaining([
        "Benjamin Netanyahu",
        "Vladimir Putin",
        "Sam Altman",
        "Elon Musk",
      ])
    );
  });

  it("cites ICC sources for Netanyahu and Putin in case JSON", () => {
    const netanyahu = JSON.parse(
      readFileSync(join(dataDir, "docket-case-netanyahu.json"), "utf8")
    );
    const putin = JSON.parse(
      readFileSync(join(dataDir, "docket-case-putin.json"), "utf8")
    );
    expect(JSON.stringify(netanyahu)).toContain("icc-cpi.int");
    expect(JSON.stringify(netanyahu)).toContain("starvation as a method of warfare");
    expect(JSON.stringify(putin)).toContain("Unlawful deportation of population (children)");
    expect(netanyahu.badge.label).toContain("ICC");
  });

  it("keeps nonviolence charter as secondary disclosure", () => {
    expect(html).toContain("Nonviolence charter");
    expect(html).toContain("Not a hit list");
    expect(html).toContain("We don’t overthrow people.");
    expect(html).toContain('id="closed-criteria"');
    expect(html).toContain('id="tos"');
    expect(html).toContain("Law-enforcement impersonation");
    expect(html).toContain('id="network-good"');
    expect(html).toContain("/docket/goods/research-kit/");
    expect(html).toContain("/docket/goods/qr-field-kit/");
    expect(html).toContain("/docket/chapters/");
    expect(html).toContain("/docket/accountability-day/");
  });
});
