import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../..");
const siteJs = join(root, "site/js");

/** @param {string} dir */
function listMjsFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) {
      out.push(...listMjsFiles(path));
      continue;
    }
    if (name.name.endsWith(".mjs")) out.push(path);
  }
  return out;
}

describe("site/js Pages import guard", () => {
  it("does not static-import worker/scripts (not deployed on Pages)", () => {
    const offenders = [];
    for (const file of listMjsFiles(siteJs)) {
      const src = readFileSync(file, "utf8");
      if (/from\s+["']\.\.\/\.\.\/worker\/scripts\//.test(src)) {
        offenders.push(file.replace(`${root}/`, ""));
      }
    }
    expect(offenders).toEqual([]);
  });
});
