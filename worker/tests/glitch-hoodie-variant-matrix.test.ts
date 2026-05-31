import { describe, expect, it } from "vitest";
import {
  resolveGlitchHoodiePrintifyVariantId,
  GLITCH_HOODIE_VARIANT_MATRIX,
} from "../src/print/glitch-hoodie-variant-matrix";

describe("glitch-hoodie-variant-matrix", () => {
  it("includes 42 enabled Printify variants", () => {
    expect(GLITCH_HOODIE_VARIANT_MATRIX.length).toBe(42);
  });

  it("resolves white-xl Printify id", () => {
    expect(resolveGlitchHoodiePrintifyVariantId("white-xl")).toBe(68884);
  });

  it("returns null for unknown key", () => {
    expect(resolveGlitchHoodiePrintifyVariantId("unknown-xxl")).toBeNull();
  });
});
