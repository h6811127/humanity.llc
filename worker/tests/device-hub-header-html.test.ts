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

  it("renders the status header as a primary line with subordinate counts", () => {
    const src = readPage("site/js/device-status.mjs");
    const css = readPage("site/css/device-shell.css");

    expect(src).toContain("hubStatusLineItemsFromSegments");
    expect(src).toContain("device-hub-status-line");
    expect(src).toContain("device-hub-status-item");
    expect(src).not.toContain("style=\"display:flex;flex-wrap:wrap");
    expect(css).toMatch(/\.device-hub-status-line\s*\{[\s\S]*flex-wrap:\s*nowrap/);
    expect(css).toContain(".device-hub-status-item--zero");
  });

  it("keeps Close stronger than Home with 40px-plus tap targets", () => {
    const css = readPage("site/css/device-shell.css");
    const darkCss = readPage("site/css/theme-dark.css");

    expect(css).toMatch(/\.device-hub-home-btn\s*\{[\s\S]*width:\s*40px;[\s\S]*height:\s*40px;/);
    expect(css).toMatch(
      /\.device-hub-sheet-close\s*\{[\s\S]*width:\s*42px;[\s\S]*height:\s*42px;/
    );
    expect(css).toMatch(
      /\.device-hub-home-btn\s*\{[\s\S]*background:\s*rgba\(120,\s*120,\s*128,\s*0\.08\)/
    );
    expect(css).toMatch(/\.device-hub-sheet-close\s*\{[\s\S]*box-shadow:/);
    expect(darkCss).toMatch(
      /html\[data-theme="dark"\] \.device-hub-home-btn\s*\{[\s\S]*surface-popover-fg-muted/
    );
  });
});
