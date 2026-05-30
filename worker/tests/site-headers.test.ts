import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** S3 hub QR scanner needs getUserMedia on shell pages (Pages _headers). */
describe("site/_headers", () => {
  it("allows camera for same-origin shell (hub in-app scanner)", () => {
    const headers = readFileSync(join(process.cwd(), "site/_headers"), "utf8");
    expect(headers).toMatch(/Permissions-Policy:[^\n]*camera=\(self\)/);
    expect(headers).not.toMatch(/camera=\(\)/);
  });
});
