import { describe, expect, it } from "vitest";
import {
  LOST_ITEM_RELAY_PREFIX,
  parseManifestoDisplay,
  splitManifestoDisplay,
} from "../src/resolver/manifesto-display";

describe("parseManifestoDisplay", () => {
  it("splits two-line status plate manifesto", () => {
    const r = parseManifestoDisplay("Studio door\nOpen until 9 PM");
    expect(r.kind).toBe("status_plate");
    if (r.kind === "status_plate") {
      expect(r.objectLabel).toBe("Studio door");
      expect(r.statusLine).toBe("Open until 9 PM");
    }
  });

  it("parses lost item relay prefix", () => {
    const r = parseManifestoDisplay(`${LOST_ITEM_RELAY_PREFIX}Keys\nLost — relay active`);
    expect(r.kind).toBe("lost_item_relay");
    if (r.kind === "lost_item_relay") {
      expect(r.objectLabel).toBe("Keys");
      expect(r.statusLine).toBe("Lost — relay active");
    }
  });

  it("treats single line as general card", () => {
    const r = parseManifestoDisplay("Open studio all week");
    expect(r.kind).toBe("general");
  });
});

describe("splitManifestoDisplay", () => {
  it("remains compatible for status plates", () => {
    const r = splitManifestoDisplay("Studio door\nOpen until 9 PM");
    expect(r.isStatusPlate).toBe(true);
  });
});
