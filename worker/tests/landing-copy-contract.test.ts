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
const portalStylesPath = join(root, "site/css/public-networks-portal.css");

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

  it("landing sections appear in narrative DOM order", () => {
    let prev = -1;
    for (const marker of LANDING_SECTION_ORDER_MARKERS) {
      const idx = html.indexOf(marker);
      expect(idx).toBeGreaterThan(-1);
      expect(idx).toBeGreaterThan(prev);
      prev = idx;
    }
  });

  it("discovery dashboard styles include hero, shelves, and create CTA layout", () => {
    const portalStyles = readFileSync(portalStylesPath, "utf8");
    expect(portalStyles).toContain(".landing-discovery-hero");
    expect(portalStyles).toContain(".landing-entry-shelves");
    expect(portalStyles).toContain(".landing-start-object-cta");
  });

  it("index.html documents contract anchor comment", () => {
    expect(html).toContain("landing-copy-contract");
  });

  it("styles cache bust matches contract", () => {
    expect(html).toContain(`styles.css?v=${LANDING_STYLES_CACHE_BUST}`);
  });
});
