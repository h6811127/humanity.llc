import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const landingPath = join(root, "site/index.html");
const practicesPath = join(root, "site/practices/index.html");

describe("Book of Weird Practices (Tier 1 landing branch)", () => {
  const landing = readFileSync(landingPath, "utf8");
  const practices = readFileSync(practicesPath, "utf8");

  it("ships muted landing micro-link sibling to Public Docket", () => {
    expect(landing).toContain('id="landing-weird-practices"');
    expect(landing).toContain('href="/practices/"');
    expect(landing).toContain("Book of Weird Practices · for people with bodies");
    expect(landing).toContain('id="landing-public-docket"');
    expect(landing).toContain('class="landing-branch-micros"');
    expect(landing).not.toMatch(/doctrine/i);
  });

  it("opens on chaptered practices list, not creed-first essay", () => {
    expect(existsSync(practicesPath)).toBe(true);
    expect(practices).toContain("<h1>For people with bodies</h1>");
    expect(practices).toContain('id="practices"');
    expect(practices).toContain('id="oracles"');
    expect(practices).toContain('id="body"');
    expect(practices).toContain('id="commons"');
    expect(practices).toContain('id="rails"');
    expect(practices).toContain("Ask a book");
    expect(practices).toContain("Mirror ten minutes");
    expect(practices).toContain("Return to a sticker");
    expect(practices).toContain("Confess to a tree");
    expect(practices).toContain("Scan as omen");
    expect(practices).toContain('class="practices-jump"');
    const listIdx = practices.indexOf('id="practices"');
    const howIdx = practices.indexOf('id="how-this-works"');
    expect(listIdx).toBeGreaterThan(-1);
    expect(howIdx).toBeGreaterThan(listIdx);
  });

  it("frames practices as optional field guide, not doctrine gate", () => {
    expect(practices).toContain("Not a doctrine");
    expect(practices).toContain("Skipping them does not fail membership");
    expect(practices).toContain('href="/docket/"');
    expect(practices).toContain("practices.css");
  });
});
