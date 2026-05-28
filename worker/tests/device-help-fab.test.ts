import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(fileURLToPath(new URL("../..", import.meta.url)));
const helpFabJs = path.join(repoRoot, "site/js/device-help-fab.mjs");
const stylesCss = path.join(repoRoot, "site/styles.css");

describe("device-help-fab (Safari sizing guards)", () => {
  it("ships explicit SVG width/height attributes for WebKit", () => {
    const src = fs.readFileSync(helpFabJs, "utf8");
    expect(src).toMatch(/<svg[^>]*\bwidth="18"/);
    expect(src).toMatch(/<svg[^>]*\bheight="18"/);
  });

  it("constrains FAB and icon in CSS so flex cannot blow up the glyph", () => {
    const css = fs.readFileSync(stylesCss, "utf8");
    const fabBlock = css.match(/\.device-help-fab\s*\{[^}]+\}/s)?.[0] ?? "";
    const svgBlock = css.match(/\.device-help-fab svg\s*\{[^}]+\}/s)?.[0] ?? "";
    expect(fabBlock).toContain("overflow: hidden");
    expect(fabBlock).toMatch(/\bwidth:\s*36px/);
    expect(fabBlock).toMatch(/\bheight:\s*36px/);
    expect(svgBlock).toContain("flex-shrink: 0");
    expect(svgBlock).toContain("max-width: 18px");
    expect(svgBlock).toContain("max-height: 18px");
  });
});
