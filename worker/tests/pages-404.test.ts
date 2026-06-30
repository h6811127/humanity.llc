import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Pages 404 shell", () => {
  it("ships 404.html with clear not-found copy", () => {
    const html = readFileSync(join(process.cwd(), "site/404.html"), "utf8");
    expect(html).toMatch(/Page not found/i);
    expect(html).toMatch(/name="robots" content="noindex"/i);
    expect(html).not.toMatch(/Your object is live/i);
  });

  it("documents 404 behavior in _redirects", () => {
    const redirects = readFileSync(join(process.cwd(), "site/_redirects"), "utf8");
    expect(redirects).toMatch(/404\.html/i);
  });

  it("aliases /objects to /wallet for bookmarks", () => {
    const redirects = readFileSync(join(process.cwd(), "site/_redirects"), "utf8");
    expect(redirects).toMatch(/\/objects\s+\/wallet\/\s+301/);
    expect(redirects).toMatch(/\/objects\/\s+\/wallet\/\s+301/);
  });

  it("rewrites /shop/products/* to a shell outside the splat (avoids Pages .html strip loop)", () => {
    const redirects = readFileSync(join(process.cwd(), "site/_redirects"), "utf8");
    expect(redirects).toMatch(/\/shop\/products\/\*\s+\/shop\/product-detail\/\s+200/);
    expect(redirects).not.toMatch(/\/shop\/products\/\*\s+\/shop\/products\//);
    const shell = join(process.cwd(), "site/shop/product-detail/index.html");
    expect(readFileSync(shell, "utf8")).toMatch(/shop-product-detail\.mjs/);
  });

  it("rewrites /discover/{region}/pin/* to pin shell (one splat per region)", () => {
    const redirects = readFileSync(join(process.cwd(), "site/_redirects"), "utf8");
    expect(redirects).toMatch(/# DISCOVER_PIN_SPLAT_BEGIN/);
    expect(redirects).toMatch(
      /\/discover\/cedar-rapids-iowa\/pin\/\*\s+\/discover\/pin\/\s+200/
    );
    const shell = join(process.cwd(), "site/discover/pin/index.html");
    expect(readFileSync(shell, "utf8")).toMatch(/discovery-region-page\.mjs/);
  });
});
