import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  STATUS_PARTIAL_LOAD_ARIA_LABEL,
  STATUS_PARTIAL_LOAD_EXPLAINER,
} from "../../site/js/device-status-load-error.mjs";

const siteJsDir = path.join(fileURLToPath(new URL("../..", import.meta.url)), "site/js");

describe("device-status partial load (P2 Step 3)", () => {
  it("exports partial Layer 2 copy without protocol jargon", () => {
    expect(STATUS_PARTIAL_LOAD_EXPLAINER.now).toMatch(/open the device hub/i);
    expect(STATUS_PARTIAL_LOAD_EXPLAINER.next).toMatch(/refresh/i);
    expect(STATUS_PARTIAL_LOAD_EXPLAINER.now).not.toMatch(/device-status\.mjs/i);
    expect(STATUS_PARTIAL_LOAD_ARIA_LABEL).toMatch(/basic hub available/i);
  });

  it("bootstrap-inner routes partial failure when core loaded first", () => {
    const src = fs.readFileSync(
      path.join(siteJsDir, "device-status-bootstrap-inner.mjs"),
      "utf8"
    );
    expect(src).toMatch(/statusCoreLoaded\s*=\s*true/);
    expect(src).toMatch(/wireStatusPartialLoadDot/);
    expect(src).toMatch(/if\s*\(\s*statusCoreLoaded\s*\)/);
  });

  it("partial wire does not schedule load-error coach card", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-status-load-error.mjs"), "utf8");
    const partialFn = src.slice(
      src.indexOf("export function wireStatusPartialLoadDot"),
      src.indexOf("export function wireStatusLoadErrorDot")
    );
    expect(partialFn).toMatch(/deviceStatusPartial/);
    expect(partialFn).not.toMatch(/scheduleLoadErrorCoachCard/);
    expect(partialFn).not.toMatch(/statusLoadErrorWired/);
  });

  it("partial click fallback only intercepts real hub sheets", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-status-load-error.mjs"), "utf8");
    const partialClickHandler = src.slice(
      src.indexOf("function wirePartialLoadHubOpen"),
      src.indexOf("/**\n * Core loaded but device-status.mjs failed")
    );

    const sheetGuard = partialClickHandler.indexOf('classList.contains("device-hub--sheet")');
    const preventDefault = partialClickHandler.indexOf("event.preventDefault()");

    expect(sheetGuard).toBeGreaterThan(-1);
    expect(preventDefault).toBeGreaterThan(-1);
    expect(sheetGuard).toBeLessThan(preventDefault);
  });
});
