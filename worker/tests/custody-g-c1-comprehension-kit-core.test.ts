import { describe, expect, it } from "vitest";

import {
  buildCustodyG1KitHtml,
  CUSTODY_G1_QA_REL,
  resolveCustodyG1KitUrls,
} from "../scripts/custody-g-c1-comprehension-kit-core.mjs";

describe("custody-g-c1-comprehension-kit-core", () => {
  it("builds kit HTML with G-C1 scorecard", () => {
    const html = buildCustodyG1KitHtml({
      createUrl: "http://127.0.0.1:8788/create/",
      origin: "http://127.0.0.1:8788",
    });
    expect(html).toContain("G1-A");
    expect(html).toContain("Unlock to manage");
    expect(html).toContain("This device");
  });

  it("resolves local kit URLs", () => {
    const urls = resolveCustodyG1KitUrls({ host: "127.0.0.1:8788" });
    expect(urls.createUrl).toContain("/create/");
    expect(urls.kitPageUrl).toContain("custody-g-c1-comprehension.html");
  });

  it("references QA doc path", () => {
    expect(CUSTODY_G1_QA_REL).toContain("CUSTODY_DEVICE_UNLOCK_COMPREHENSION_QA");
  });
});
