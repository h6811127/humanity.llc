import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  LANDING_COPY_CONTRACT_VERSION,
  LANDING_FORBIDDEN_SNIPPETS,
  LANDING_REQUIRED_SNIPPETS,
  LANDING_SECTION_ORDER_MARKERS,
  LANDING_STYLES_CACHE_BUST,
} from "../../site/js/landing-copy-contract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const indexPath = join(root, "site/index.html");
const stylesPath = join(root, "site/styles.css");

describe("landing copy contract (regression lock)", () => {
  const html = readFileSync(indexPath, "utf8");
  const styles = readFileSync(stylesPath, "utf8");

  it(`contract version is ${LANDING_COPY_CONTRACT_VERSION}`, () => {
    expect(LANDING_COPY_CONTRACT_VERSION).toBeGreaterThan(0);
  });

  for (const snippet of LANDING_REQUIRED_SNIPPETS) {
    it(`requires: ${snippet.slice(0, 48)}${snippet.length > 48 ? "…" : ""}`, () => {
      expect(html).toContain(snippet);
    });
  }

  for (const snippet of LANDING_FORBIDDEN_SNIPPETS) {
    it(`forbids: ${snippet.slice(0, 48)}${snippet.length > 48 ? "…" : ""}`, () => {
      expect(html).not.toContain(snippet);
    });
  }

  it("launch doors precede How it works in DOM order", () => {
    const [launch, how] = LANDING_SECTION_ORDER_MARKERS;
    expect(html.indexOf(launch)).toBeGreaterThan(-1);
    expect(html.indexOf(how)).toBeGreaterThan(-1);
    expect(html.indexOf(launch)).toBeLessThan(html.indexOf(how));
  });

  it("styles include launch-doors layout rules", () => {
    expect(styles).toContain(".landing-launch-doors-title");
    expect(styles).toContain(".landing-hero-privacy");
  });

  it("index.html documents contract anchor comment", () => {
    expect(html).toContain("landing-copy-contract");
  });

  it("styles cache bust matches contract", () => {
    expect(html).toContain(`styles.css?v=${LANDING_STYLES_CACHE_BUST}`);
  });
});
