import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SITE_BUILD_META,
  DEFAULT_WORKER_BUILD_META,
  formatSiteBuildConsoleLine,
  formatCombinedBuildCopyText,
  formatSiteBuildCopyText,
  formatSiteBuildHubLabel,
  formatWorkerBuildHubLabel,
  isSiteDebugEnabled,
  parseResolverHealthBuild,
  SITE_DEBUG_FLAG_KEY,
} from "../../site/js/build-meta-browser.mjs";
import {
  renderBuildMetaModule,
  renderWorkerBuildMetaModule,
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

  it("build-meta modules are present under site/js", () => {
    expect(fs.existsSync(path.join(siteJsDir, "build-meta-core.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(siteJsDir, "build-meta-browser.mjs"))).toBe(true);
  });

  it("build-meta-browser.mjs has no Node built-in imports", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "build-meta-browser.mjs"), "utf8");
    expect(src).not.toMatch(/from\s+["']node:/);
  });

  it("device-status-bootstrap entry only statically imports load-error helper", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-status-bootstrap.mjs"), "utf8");
    const staticImports = [
      ...src.matchAll(/^import\s+.+\s+from\s+["'](\.\/[^"']+)["']/gm),
    ].map((match) => match[1]);
    expect(staticImports).toEqual(["./device-status-load-error.mjs"]);
    expect(src).toContain("device-status-bootstrap-inner.mjs");
  });

  it("device-status-bootstrap-inner imports browser build-meta only", () => {
    const src = fs.readFileSync(
      path.join(siteJsDir, "device-status-bootstrap-inner.mjs"),
      "utf8"
    );
    expect(src).toContain("build-meta-browser.mjs");
    expect(src).not.toMatch(/build-meta-core\.mjs/);
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
    expect(formatSiteBuildCopyText(meta, "/wallet/")).toContain(
      "worker.build=(unavailable)"
    );
  });

  it("parseResolverHealthBuild reads health.build", () => {
    expect(
      parseResolverHealthBuild({
        version: "1.0",
        build: {
          gitSha: "w1w1w1w",
          builtAt: "2026-05-27T12:00:00.000Z",
          source: "deploy",
        },
      })
    ).toEqual({
      gitSha: "w1w1w1w",
      builtAt: "2026-05-27T12:00:00.000Z",
      source: "deploy",
    });
    expect(parseResolverHealthBuild({ version: "1.0" })).toBeNull();
  });

  it("formatCombinedBuildCopyText and worker hub label", () => {
    const site = {
      gitSha: "a",
      builtAt: "t1",
      shellAssetVersion: 54,
      source: "deploy" as const,
    };
    const worker = {
      gitSha: "b",
      builtAt: "t2",
      source: "ci" as const,
    };
    expect(formatWorkerBuildHubLabel(worker)).toBe("Worker b · ci");
    expect(formatCombinedBuildCopyText(site, worker)).toContain("worker.gitSha=b");
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
