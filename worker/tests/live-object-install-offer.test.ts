import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd());

describe("live object install offer", () => {
  const install = readFileSync(join(root, "site/install/index.html"), "utf8");
  const create = readFileSync(join(root, "site/create/index.html"), "utf8");
  const landing = readFileSync(join(root, "site/index.html"), "utf8");

  it("sells print-and-place without paywalling create", () => {
    expect(install).toContain("<h1>Live QR on your door</h1>");
    expect(install).toContain("$250");
    expect(install).toContain("$25 / month");
    expect(install).toContain('href="/create/?intent=deploy"');
    expect(install).toContain("Print your own — free");
    expect(install).toContain('id="install-book-form"');
    expect(install).toContain("Send install request");
    expect(install).toContain("mailto:info@humanity.llc?subject=Live%20object%20install");
    expect(install).toContain("Sign, update, and revoke stay free");
    expect(install).toMatch(/does not\s+vouch you/);
    expect(install).toContain("Invoice, not a paywall");
    expect(install).not.toMatch(/stripe|card checkout/i);
  });

  it("asks for the door facts that close an install, not a blank email", () => {
    expect(install).toContain('id="install-place"');
    expect(install).toContain('id="install-neighborhood"');
    expect(install).toContain('id="install-scanner-line"');
    expect(install).toContain('id="install-contact"');
    expect(install).toContain('src="/js/install-book.mjs?v=2"');
    expect(install).toContain("mail app, not a checkout");
  });

  it("stays off the discovery homepage", () => {
    expect(landing).not.toContain('href="/install/"');
    expect(landing).not.toContain("Book an install");
    expect(landing).not.toContain("$250");
  });

  it("is a create-chooser footnote, not a fourth door", () => {
    expect(create).toContain('href="/install/">Have us put it on your door</a>');
    expect(create).toContain('id="create-entry-chooser"');
    expect(create).toContain("/create/?intent=game\">Organize a live season</a>");
  });
});
