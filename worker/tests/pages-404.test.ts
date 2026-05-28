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
});
