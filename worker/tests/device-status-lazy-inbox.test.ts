import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const deviceStatusPath = path.join(
  fileURLToPath(new URL("../..", import.meta.url)),
  "site/js/device-status.mjs"
);

describe("device-status lazy inbox sheet (Phase 2.2)", () => {
  it("does not statically import device-inbox-sheet.mjs", () => {
    const src = fs.readFileSync(deviceStatusPath, "utf8");
    expect(src).not.toMatch(
      /^\s*import\s+.+\s+from\s+["']\.\/device-inbox-sheet\.mjs/i
    );
    expect(src).toMatch(/import\s*\(\s*[`'"].*device-inbox-sheet\.mjs/i);
  });
});
