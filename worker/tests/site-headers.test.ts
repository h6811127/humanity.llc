import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** S3 hub QR scanner needs getUserMedia on shell pages (Pages _headers). */
describe("site/_headers", () => {
  it("allows camera for same-origin shell (hub in-app scanner)", () => {
    const headers = readFileSync(join(process.cwd(), "site/_headers"), "utf8");
    const globalBlock = headers.split("\n\n")[0] ?? headers;
    expect(globalBlock).toMatch(/Permissions-Policy:[^\n]*camera=\(self\)/);
    expect(globalBlock).not.toMatch(/camera=\(\)/);
  });

  it("denies camera on discover browse (near-me uses geolocation only)", () => {
    const headers = readFileSync(join(process.cwd(), "site/_headers"), "utf8");
    expect(headers).toMatch(
      /\/discover\/\*\n\s+Permissions-Policy:[^\n]*camera=\(\)/
    );
    expect(headers).toMatch(
      /\/discover\/\*\n\s+Permissions-Policy:[^\n]*geolocation=\(self\)/
    );
  });
});
