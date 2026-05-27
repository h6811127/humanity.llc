import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SITE_BUILD_META,
  formatSiteBuildConsoleLine,
  renderBuildMetaModule,
} from "../../site/js/build-meta-core.mjs";
import { DEVICE_SHELL_ASSET_VERSION } from "../../site/js/device-status-shell-modules.mjs";
import { SITE_BUILD_META } from "../../site/js/build-meta.mjs";

const siteJsDir = path.join(fileURLToPath(new URL("../..", import.meta.url)), "site/js");

describe("site build meta", () => {
  it("committed build-meta.mjs shell version matches DEVICE_SHELL_ASSET_VERSION", () => {
    expect(SITE_BUILD_META.shellAssetVersion).toBe(DEVICE_SHELL_ASSET_VERSION);
  });

  it("renderBuildMetaModule emits importable SITE_BUILD_META", () => {
    const meta = {
      gitSha: "abc1234",
      builtAt: "2026-05-27T00:00:00.000Z",
      shellAssetVersion: DEVICE_SHELL_ASSET_VERSION,
      source: "deploy" as const,
    };
    const src = renderBuildMetaModule(meta);
    expect(src).toContain("docs/SITE_BUILD_VERSIONING.md");
    expect(src).toContain('"gitSha": "abc1234"');
    expect(src).toContain(`"shellAssetVersion": ${DEVICE_SHELL_ASSET_VERSION}`);
  });

  it("formatSiteBuildConsoleLine matches bootstrap log shape", () => {
    const line = formatSiteBuildConsoleLine({
      gitSha: "abc1234",
      builtAt: "2026-05-27T00:00:00.000Z",
      shellAssetVersion: 52,
      source: "deploy",
    });
    expect(line).toBe(
      "[humanity] site build abc1234 shell=52 2026-05-27T00:00:00.000Z"
    );
  });

  it("generate-build-meta script exists", () => {
    const script = path.join(
      fileURLToPath(new URL("../..", import.meta.url)),
      "worker/scripts/generate-build-meta.mjs"
    );
    expect(fs.existsSync(script)).toBe(true);
  });

  it("DEFAULT_SITE_BUILD_META documents dev fallback fields", () => {
    expect(DEFAULT_SITE_BUILD_META.source).toBe("dev");
    expect(DEFAULT_SITE_BUILD_META.gitSha).toBe("dev");
  });

  it("build-meta-core.mjs is present under site/js", () => {
    expect(fs.existsSync(path.join(siteJsDir, "build-meta-core.mjs"))).toBe(true);
  });
});
