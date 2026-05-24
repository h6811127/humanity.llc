import { describe, expect, it } from "vitest";
import { splitManifestoDisplay } from "../src/resolver/manifesto-display";

describe("splitManifestoDisplay", () => {
  it("splits two-line status plate manifesto", () => {
    const r = splitManifestoDisplay("Studio door\nOpen until 9 PM");
    expect(r.isStatusPlate).toBe(true);
    expect(r.objectLabel).toBe("Studio door");
    expect(r.statusLine).toBe("Open until 9 PM");
  });

  it("treats single line as general card", () => {
    const r = splitManifestoDisplay("Open studio all week");
    expect(r.isStatusPlate).toBe(false);
    expect(r.statusLine).toBe("Open studio all week");
  });
});
