import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEVICE_STATUS_SHELL_JS_FILES,
  deviceStatusShellModulePaths,
} from "../../site/js/device-status-shell-modules.mjs";

const siteJsDir = path.join(fileURLToPath(new URL("../..", import.meta.url)), "site/js");

describe("device status shell module manifest", () => {
  it("every manifest entry exists under site/js", () => {
    for (const file of DEVICE_STATUS_SHELL_JS_FILES) {
      const full = path.join(siteJsDir, file);
      expect(fs.existsSync(full), `missing site/js/${file}`).toBe(true);
    }
  });

  it("maps bootstrap with cache-bust query for Playwright", () => {
    const paths = deviceStatusShellModulePaths(21);
    expect(paths[0]).toBe("/js/device-status-bootstrap.mjs?v=21");
    expect(paths).toContain("/js/device-inbox-sheet-core.mjs");
    expect(paths).toContain("/js/device-hub-sheet-core.mjs");
  });
});
