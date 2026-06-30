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
const siteRoot = path.join(fileURLToPath(new URL("../..", import.meta.url)), "site");

const SHELL_HTML_PAGES = [
  "index.html",
  "create/index.html",
  "created/index.html",
  "wallet/index.html",
];

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

  it("shell HTML pages use DEVICE_SHELL_ASSET_VERSION on status bootstrap", () => {
    const expected = `device-status-bootstrap.mjs?v=${DEVICE_SHELL_ASSET_VERSION}`;
    for (const page of SHELL_HTML_PAGES) {
      const html = fs.readFileSync(path.join(siteRoot, page), "utf8");
      expect(html, page).toContain(expected);
    }
  });

  it("since-visit gate reads versioned wallet network truth (singleton regression)", () => {
    const v = DEVICE_SHELL_ASSET_VERSION;
    const read = (name) =>
      fs.readFileSync(path.join(siteJsDir, name), "utf8");
    expect(read("device-wallet-since-visit-gate.mjs")).toContain(
      `device-wallet-network-truth.mjs?v=${v}`
    );
    expect(read("device-inbox-card-disabled.mjs")).toContain(
      `device-wallet-since-visit-gate.mjs?v=${v}`
    );
    expect(read("device-wallet-network.mjs")).toContain(
      `device-wallet-since-visit-gate.mjs?v=${v}`
    );
    expect(read("device-live-control-inbox.mjs")).toContain(
      `device-wallet-since-visit-gate.mjs?v=${v}`
    );
    expect(read("device-relay-offer-inbox.mjs")).toContain(
      `device-wallet-since-visit-gate.mjs?v=${v}`
    );
    expect(read("device-browser-notifications.mjs")).toContain(
      `device-wallet-since-visit-gate.mjs?v=${v}`
    );
    expect(read("device-browser-notifications-sw.mjs")).toContain(
      `device-wallet-since-visit-gate.mjs?v=${v}`
    );
    expect(read("scan-live-proof-owner-watch.mjs")).toContain(
      `device-wallet-since-visit-gate.mjs?v=${v}`
    );
    expect(read("scan-page-dot.mjs")).toContain(
      `device-wallet-since-visit-gate.mjs?v=${v}`
    );
  });

  it("custody status graph cache-busts copy chain (partial-load regression)", () => {
    const v = DEVICE_SHELL_ASSET_VERSION;
    const read = (name) =>
      fs.readFileSync(path.join(siteJsDir, name), "utf8");
    expect(read("device-dot-state-core.mjs")).toContain(
      `device-ownership-copy-core.mjs?v=${v}`
    );
    expect(read("device-ownership-copy-core.mjs")).toContain(
      `device-custody-mode-core.mjs?v=${v}`
    );
    expect(read("device-status.mjs")).toContain(`device-dot-state-core.mjs?v=${v}`);
    expect(read("device-status.mjs")).toContain(
      `device-wallet-corrupt-core.mjs?v=${v}`
    );
    expect(read("device-status-core.mjs")).toContain(`device-dot-state-core.mjs?v=${v}`);
  });
});
