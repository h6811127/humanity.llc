import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPagePath = join(root, "site/play/season/index.html");

describe("play/season public networks page", () => {
  const html = readFileSync(seasonPagePath, "utf8");

  it("uses Find public networks title and discovery framing", () => {
    expect(html).toContain("<title>Find public networks · humanity.llc</title>");
    expect(html).toContain("<h1>Find public networks</h1>");
    expect(html).toContain(
      "Open public networks that expose live places, game nodes, resources, or status."
    );
    expect(html).toContain('id="public-networks-search"');
    expect(html).toContain('id="public-networks-categories"');
    expect(html).toContain('id="public-networks-results"');
    expect(html).toContain("/js/public-networks-portal.mjs");
    expect(html).not.toContain("city-game-season-portal.mjs");
    expect(html).toContain("This is not a map");
    expect(html).toContain("One live network today: Cedar Rapids");
    expect(html).toContain("A network is a shared board of places");
    expect(html).not.toContain('content="noindex, nofollow"');
  });

  it("loads scoped portal styles without device shell", () => {
    expect(html).toContain("/css/public-networks-portal.css");
    expect(html).not.toContain("device-shell.css");
  });
});
