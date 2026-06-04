import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  browserAlertBackgroundCopy,
  browserAlertWhileOpenCopy,
} from "../../site/js/device-shell-copy-core.mjs";

const REPO_ROOT = join(import.meta.dirname, "../..");
const DEVICE_OS_QA = join(REPO_ROOT, "docs/DEVICE_OS_QA.md");

describe("WS-NOTIF N4 field sign-off guards", () => {
  it("DEVICE_OS_QA.md defines P0-N Android Chrome PWA matrix rows", () => {
    const doc = readFileSync(DEVICE_OS_QA, "utf8");
    expect(doc).toContain("### P0-N · Notifications v2");
    for (const row of ["P0-N1", "P0-N2", "P0-N3", "P0-N4"]) {
      expect(doc).toContain(row);
    }
    expect(doc).toContain("notify:field-signoff");
    expect(doc).toMatch(/Chrome.*not Safari|not Safari/i);
  });

  it("documents P0-N2 background OS as non-functional (deferred)", () => {
    const qa = readFileSync(DEVICE_OS_QA, "utf8");
    const v2 = readFileSync(
      join(REPO_ROOT, "docs/NOTIFICATION_SYSTEM_V2.md"),
      "utf8"
    );
    expect(qa).toMatch(/P0-N2.*NON-FUNCTIONAL|NON-FUNCTIONAL.*P0-N2/is);
    expect(v2).toMatch(/Background OS alert.*Non-functional/is);
    expect(qa).toMatch(/P0-N2 excluded/i);
  });

  it("background alert copy on Android PWA names Chrome, not Safari", () => {
    const compact = browserAlertBackgroundCopy(true, "standalone", {
      companionBrowser: "Chrome",
    });
    const full = browserAlertBackgroundCopy(false, "standalone", {
      companionBrowser: "Chrome",
    });
    expect(compact).toMatch(/Chrome/i);
    expect(full).toMatch(/Chrome/i);
    expect(compact).not.toMatch(/Safari/i);
    expect(full).not.toMatch(/Safari/i);
  });

  it("while-open copy on Android PWA mentions foreground strip for Chrome", () => {
    const copy = browserAlertWhileOpenCopy("standalone", { companionBrowser: "Chrome" });
    expect(copy).toMatch(/foreground strip/i);
    expect(copy).toMatch(/Chrome/i);
    expect(copy).not.toMatch(/Safari/i);
  });
});
