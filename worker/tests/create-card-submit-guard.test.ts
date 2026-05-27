import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const createCardPath = path.join(
  fileURLToPath(new URL("../..", import.meta.url)),
  "site/js/create-card.mjs"
);

function readValidatedCreateInputBody(src: string): string {
  const start = src.indexOf("function readValidatedCreateInput()");
  expect(start, "readValidatedCreateInput").toBeGreaterThanOrEqual(0);
  const openBrace = src.indexOf("{", start);
  let depth = 0;
  for (let i = openBrace; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error("unclosed readValidatedCreateInput body");
}

describe("create-card submit guard", () => {
  it("readValidatedCreateInput uses validation.handle after validateCreateFormFields", () => {
    const src = fs.readFileSync(createCardPath, "utf8");
    const body = readValidatedCreateInputBody(src);
    expect(body).toContain("validateCreateFormFields");
    expect(body).toMatch(/handle:\s*validation\.handle/);
    expect(body).not.toMatch(/handleResult\.normalized/);
    expect(body).not.toMatch(/\bhandleResult\b/);
  });
});
