import { describe, expect, it } from "vitest";
import {
  LOST_ITEM_RELAY_PREFIX,
  childObjectManifestoLine,
  isObjectForwardManifesto,
  parseManifestoDisplay,
  scanHeroTemplate,
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
    const r = parseManifestoDisplay(`${LOST_ITEM_RELAY_PREFIX}Keys\nLost  -  relay active`);
    expect(r.kind).toBe("lost_item_relay");
    if (r.kind === "lost_item_relay") {
      expect(r.objectLabel).toBe("Keys");
      expect(r.statusLine).toBe("Lost  -  relay active");
    }
  });

  it("treats single line as general card", () => {
    const r = parseManifestoDisplay("Open studio all week");
    expect(r.kind).toBe("general");
  });
});

describe("scanHeroTemplate", () => {
  it("chooses live_object for print_artifact scope", () => {
    const d = parseManifestoDisplay("Open studio");
    expect(scanHeroTemplate(d, "print_artifact")).toBe("live_object");
  });

  it("chooses personal_card for short card-scope manifesto", () => {
    const d = parseManifestoDisplay("Open studio");
    expect(scanHeroTemplate(d, "card")).toBe("personal_card");
  });

  it("chooses live_object for long demo-style manifesto on card scope", () => {
    const line =
      "Live object demo. Scan from another phone, then revoke this QR.";
    const d = parseManifestoDisplay(line);
    expect(isObjectForwardManifesto("card", line)).toBe(true);
    expect(scanHeroTemplate(d, "card")).toBe("live_object");
  });
});

describe("splitManifestoDisplay", () => {
  it("remains compatible for status plates", () => {
    const r = splitManifestoDisplay("Studio door\nOpen until 9 PM");
    expect(r.isStatusPlate).toBe(true);
  });
});

describe("childObjectManifestoLine", () => {
  it("adds relay prefix for lost_item_relay child objects", () => {
    expect(
      childObjectManifestoLine({
        object_type: "lost_item_relay",
        public_label: "House keys",
        public_state: "Lost — contact owner through relay",
      })
    ).toBe(`${LOST_ITEM_RELAY_PREFIX}House keys\nLost — contact owner through relay`);
    expect(parseManifestoDisplay(
      childObjectManifestoLine({
        object_type: "lost_item_relay",
        public_label: "House keys",
        public_state: "Lost — contact owner through relay",
      })
    ).kind).toBe("lost_item_relay");
  });

  it("keeps status plate labels unprefixed", () => {
    expect(
      childObjectManifestoLine({
        object_type: "status_plate",
        public_label: "Studio door",
        public_state: "Open until 9 PM",
      })
    ).toBe("Studio door\nOpen until 9 PM");
  });
});
