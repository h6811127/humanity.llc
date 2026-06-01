import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("operator vouch audit UI case workflow", () => {
  it("exposes a case inbox alongside audit flags", () => {
    const html = readFileSync(join(root, "site/operator/vouch-audit.html"), "utf8");

    expect(html).toContain('id="case-refresh"');
    expect(html).toContain('id="case-status"');
    expect(html).toContain('id="audit-cases"');
    expect(html).toContain("Open a case to suspend");
    expect(html).toContain("/js/operator-vouch-audit.mjs?v=5");
  });

  it("wires audit flags to the operator vouch-cases API", () => {
    const src = readFileSync(join(root, "site/js/operator-vouch-audit.mjs"), "utf8");

    expect(src).toContain("/.well-known/hc/v1/operator/vouch-cases");
    expect(src).toContain("function renderCases()");
    expect(src).toContain("async function postCaseFromFlag");
    expect(src).toContain('source: "audit_flag"');
    expect(src).toContain("audit-create-case");
    expect(src).toContain("Promise.allSettled([refreshFlags(), refreshCases()])");
  });

  it("wires case detail suspension to the operator suspend endpoint", () => {
    const src = readFileSync(join(root, "site/js/operator-vouch-audit.mjs"), "utf8");

    expect(src).toContain("async function postCaseSuspend");
    expect(src).toContain("/suspend");
    expect(src).toContain("audit-case-toggle");
    expect(src).toContain("case-suspend-submit");
    expect(src).toContain("appeal_deadline");
    expect(src).toContain("cause_category");
    expect(src).toContain("renderCaseSuspendForm");
  });
});
