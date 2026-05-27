import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const sheetPages = [
  "site/index.html",
  "site/create/index.html",
  "site/created/index.html",
];

function readPage(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("device hub sheet header", () => {
  it("keeps Create out of the top status rail", () => {
    for (const path of sheetPages) {
      const html = readPage(path);
      const statusHead = html.match(
        /<div class="device-hub-status-head">[\s\S]*?<\/div>\s*<\/div>/
      )?.[0];
      expect(statusHead, path).toBeTruthy();
      expect(statusHead).not.toContain("device-hub-create-btn");
    }
  });

  it("puts the compact Create action beside saved items", () => {
    for (const path of sheetPages) {
      const html = readPage(path);
      const sectionHeader = html.match(
        /<div class="device-hub-section-header">[\s\S]*?<\/a>\s*<\/div>/
      )?.[0];
      expect(sectionHeader, path).toBeTruthy();
      expect(sectionHeader).toContain('class="device-hub-create-btn"');
      expect(sectionHeader).toContain('aria-label="Create a live card"');
      expect(sectionHeader).toContain("device-hub-create-label");
      expect(sectionHeader).toContain(">New</span>");
    }
  });
});
