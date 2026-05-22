import { describe, expect, it } from "vitest";

import { normalizeHandle, validateHandle } from "../src/validation/handle";
import { validateManifestoLine } from "../src/validation/manifesto";

describe("handle validation", () => {
  it("accepts valid handles", () => {
    expect(validateHandle("river_example")).toBe("river_example");
    expect(normalizeHandle("River_Example")).toBe("river_example");
  });

  it("rejects reserved handles", () => {
    expect(() => validateHandle("admin")).toThrow(/reserved/i);
  });

  it("rejects invalid format", () => {
    expect(() => validateHandle("ab")).toThrow();
    expect(() => validateHandle("1bad")).toThrow();
  });
});

describe("manifesto validation", () => {
  it("trims and accepts plain text", () => {
    expect(validateManifestoLine("  hello  ")).toBe("hello");
  });

  it("rejects HTML", () => {
    expect(() => validateManifestoLine("<b>hi</b>")).toThrow(/HTML/i);
  });
});
