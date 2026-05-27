import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SITE_BUILD_META,
  DEFAULT_WORKER_BUILD_META,
  formatSiteBuildConsoleLine,
  formatSiteBuildCopyText,
  formatSiteBuildHubLabel,
  isSiteDebugEnabled,
  renderBuildMetaModule,
  renderWorkerBuildMetaModule,
  SITE_DEBUG_FLAG_KEY,
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

  it("isSiteDebugEnabled respects localStorage and URL", () => {
    const storage = { getItem: (k: string) => (k === SITE_DEBUG_FLAG_KEY ? "1" : null) };
    expect(isSiteDebugEnabled({ search: "" }, storage)).toBe(true);
    expect(
      isSiteDebugEnabled({ search: "?hc_debug=1" }, { getItem: () => null })
    ).toBe(true);
    expect(
      isSiteDebugEnabled({ search: "?foo=1" }, { getItem: () => null })
    ).toBe(false);
  });

  it("formatSiteBuildHubLabel and copy text include stamp fields", () => {
    const meta = {
      gitSha: "abc1234",
      builtAt: "2026-05-27T00:00:00.000Z",
      shellAssetVersion: DEVICE_SHELL_ASSET_VERSION,
      source: "deploy" as const,
    };
    expect(formatSiteBuildHubLabel(meta)).toBe(
      `Site abc1234 · shell ${DEVICE_SHELL_ASSET_VERSION} · deploy`
    );
    expect(formatSiteBuildCopyText(meta, "/wallet/")).toContain("site.gitSha=abc1234");
    expect(formatSiteBuildCopyText(meta, "/wallet/")).toContain("page=/wallet/");
  });

  it("device-hub-build-stamp.mjs is in shell manifest", () => {
    const manifest = fs.readFileSync(
      path.join(siteJsDir, "device-status-shell-modules.mjs"),
      "utf8"
    );
    expect(manifest).toContain('"device-hub-build-stamp.mjs"');
  });

  it("renderWorkerBuildMetaModule emits WORKER_BUILD_META TypeScript", () => {
    const meta = {
      gitSha: "abc1234",
      builtAt: "2026-05-27T00:00:00.000Z",
      source: "deploy" as const,
    };
    const src = renderWorkerBuildMetaModule(meta);
    expect(src).toContain("npm run worker:build-meta");
    expect(src).toContain('"gitSha": "abc1234"');
    expect(src).toContain("export type WorkerBuildMeta");
  });

  it("generate-worker-build-meta script exists", () => {
    const script = path.join(
      fileURLToPath(new URL("../..", import.meta.url)),
      "worker/scripts/generate-worker-build-meta.mjs"
    );
    expect(fs.existsSync(script)).toBe(true);
  });

  it("DEFAULT_WORKER_BUILD_META documents dev fallback", () => {
    expect(DEFAULT_WORKER_BUILD_META.gitSha).toBe("dev");
  });
});
