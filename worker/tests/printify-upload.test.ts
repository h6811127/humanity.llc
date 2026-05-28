import { describe, expect, it } from "vitest";

import { encodeSvgForPrintifyUpload } from "../src/print/printify-upload";

describe("encodeSvgForPrintifyUpload", () => {
  it("base64-encodes SVG bytes for Printify contents field", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
    const encoded = encodeSvgForPrintifyUpload(svg);
    expect(encoded).toBe(btoa(svg));
    expect(atob(encoded)).toBe(svg);
  });
});
