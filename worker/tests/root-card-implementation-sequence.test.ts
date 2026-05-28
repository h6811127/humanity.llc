import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT_CARD_DOC = join(process.cwd(), "docs/ROOT_CARD_AND_CHILD_OBJECTS.md");
const GATE_DOC = join(process.cwd(), "docs/DELEGATED_CHILD_CAPABILITIES_GATE.md");

describe("root-card implementation sequence", () => {
  it("marks steps 13-16 shipped and step 17 deferred", () => {
    const src = readFileSync(ROOT_CARD_DOC, "utf8");
    expect(src).toContain("13. **Hub tree rows (first slice shipped):**");
    expect(src).toContain("16. **Backup gate (first slice shipped):**");
    expect(src).toContain("17. **Delegated capabilities (deferred):**");
    expect(src).toContain("Steps **1–16 shipped**");
    expect(src).not.toMatch(/16\. \*\*Backup gate \(planned\)/);
  });

  it("links delegated capabilities gate doc from step 17", () => {
    const src = readFileSync(ROOT_CARD_DOC, "utf8");
    expect(src).toContain("DELEGATED_CHILD_CAPABILITIES_GATE.md");
    const gate = readFileSync(GATE_DOC, "utf8");
    expect(gate).toContain("Deferred");
    expect(gate).toContain("G1");
  });
});
