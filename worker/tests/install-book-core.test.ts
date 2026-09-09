import { describe, expect, it } from "vitest";

import {
  INSTALL_BOOK_MAILTO,
  buildInstallBookMailto,
  listMissingInstallBookFields,
} from "../../site/js/install-book-core.mjs";

const complete = {
  place: "NewBo café door",
  neighborhood: "NewBo",
  scannerLine: "Open · Thu–Sun until 9 PM",
  contact: "Ada · ada@example.com",
  hosted: false,
};

describe("install-book-core", () => {
  it("requires place, neighborhood, scanner line, and contact", () => {
    const missing = listMissingInstallBookFields({});
    expect(missing.map((m) => m.id)).toEqual([
      "install-place",
      "install-neighborhood",
      "install-scanner-line",
      "install-contact",
    ]);
    expect(buildInstallBookMailto({}).ok).toBe(false);
  });

  it("builds an invoice mailto, not a checkout", () => {
    const result = buildInstallBookMailto(complete);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.href.startsWith(`mailto:${INSTALL_BOOK_MAILTO}?`)).toBe(true);
    expect(result.subject).toBe("Live object install — NewBo café door");
    expect(result.body).toContain("Scanners should see: Open · Thu–Sun until 9 PM");
    expect(result.body).toContain("no — plate only");
    expect(result.body).toContain("$250 print + place. Invoice, not a card form.");
    expect(result.body).toContain("Create stays free.");
    expect(result.href).not.toMatch(/stripe|checkout|card form/i);
  });

  it("marks hosted as invoice after install when checked", () => {
    const result = buildInstallBookMailto({ ...complete, hosted: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body).toContain("yes — invoice after install");
  });
});
