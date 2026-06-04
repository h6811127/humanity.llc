import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("verify-desk script", () => {
  it("package.json exposes desk belt npm scripts", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8")
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.["verify:desk"]).toContain("verify-desk.mjs");
    expect(pkg.scripts?.["verify:desk:fast"]).toContain("--fast");
  });

  it("verify-desk.mjs documents CI workflow", () => {
    const src = readFileSync(
      join(process.cwd(), "worker/scripts/verify-desk.mjs"),
      "utf8"
    );
    expect(src).toContain("verify-desk.yml");
    expect(src).toContain("--fast");
    expect(src).toContain("--custody");
  });
});
