import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEVICE_SHELL_ASSET_VERSION,
  DEVICE_STATUS_BOOTSTRAP_CACHE_BUST,
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

  it("aliases bootstrap cache-bust to shell asset version", () => {
    expect(DEVICE_STATUS_BOOTSTRAP_CACHE_BUST).toBe(DEVICE_SHELL_ASSET_VERSION);
  });

  it("maps every manifest entry with cache-bust query for Playwright", () => {
    const paths = deviceStatusShellModulePaths();
    expect(paths).toHaveLength(DEVICE_STATUS_SHELL_JS_FILES.length);
    for (const file of DEVICE_STATUS_SHELL_JS_FILES) {
      expect(paths).toContain(`/js/${file}?v=${DEVICE_SHELL_ASSET_VERSION}`);
    }
    expect(paths[0]).toBe(
      `/js/device-status-bootstrap.mjs?v=${DEVICE_SHELL_ASSET_VERSION}`
    );
  });

  it("manifest modules use DEVICE_SHELL_ASSET_VERSION on graph peer imports", () => {
    const versionPattern = /\?v=(\d+)/g;
    for (const file of DEVICE_STATUS_SHELL_JS_FILES) {
      const src = fs.readFileSync(path.join(siteJsDir, file), "utf8");
      for (const match of src.matchAll(versionPattern)) {
        const n = Number(match[1]);
        expect(
          n,
          `${file} imports ?v=${n}; expected ${DEVICE_SHELL_ASSET_VERSION}`
        ).toBe(DEVICE_SHELL_ASSET_VERSION);
      }
    }
  });
});
