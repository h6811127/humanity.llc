import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DEVICE_SHELL_E2E_SPECS } from "../scripts/device-shell-e2e-specs.mjs";

const repoRoot = join(import.meta.dirname, "../..");

describe("device-shell E2E bundle", () => {
  it("spec list is documented and wired in CI", () => {
    const doc = readFileSync(
      join(repoRoot, "docs/DEVICE_SHELL_E2E_CI_REMEDIATION.md"),
      "utf8"
    );
    const workflow = readFileSync(
      join(repoRoot, ".github/workflows/test-site.yml"),
      "utf8"
    );
    const specsModule = readFileSync(
      join(repoRoot, "worker/scripts/device-shell-e2e-specs.mjs"),
      "utf8"
    );
    expect(doc).toContain("device-shell-e2e-specs.mjs");
    expect(doc).toContain("device-shell:e2e");
    expect(workflow).toContain("npm run device-shell:e2e");
    for (const spec of DEVICE_SHELL_E2E_SPECS) {
      expect(specsModule).toContain(spec);
    }
    expect(DEVICE_SHELL_E2E_SPECS).toHaveLength(12);
  });

  it("package.json device-shell:e2e runs verify script", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["device-shell:e2e"]).toContain("device-shell-e2e-verify.mjs");
    expect(pkg.scripts["device-shell:e2e:signoff"]).toContain("--signoff");
  });

  it("verify script imports shared spec list", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/device-shell-e2e-verify.mjs"),
      "utf8"
    );
    expect(script).toContain("DEVICE_SHELL_E2E_SPECS");
    expect(script).toContain("device-shell-e2e-specs.mjs");
  });
});
