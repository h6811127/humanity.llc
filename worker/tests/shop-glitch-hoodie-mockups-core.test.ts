import { describe, expect, it } from "vitest";
import {
  GLITCH_HOODIE_DEFAULT_MOCKUP_VIEW,
  cameraLabelFromMockupSrc,
  findGlitchHoodieMockupByView,
  glitchHoodieColorMockupSlug,
  glitchHoodieBlankBackLocalCandidates,
  glitchHoodieDefaultBlankBackLocalPath,
  glitchHoodieMockupHasBlankBack,
  glitchHoodieMockupHasTransparentPreview,
  listGlitchHoodieMockupsForColor,
  normalizeGlitchMockupEntries,
  resolveDefaultGlitchHoodieMockup,
  resolveGlitchMockupPhotoSrc,
} from "../../site/js/shop-glitch-hoodie-mockups-core.mjs";

const PAYLOAD = {
  by_color: {
    Black: {
      default_view: "back",
      mockups: [
        {
          view_id: "front",
          camera_label: "front",
          position: "front",
          label: "Front",
          src: "https://images-api.printify.com/mockup/x.jpg?camera_label=front",
        },
        {
          view_id: "back",
          camera_label: "back",
          position: "back",
          label: "Back",
          src: "https://images-api.printify.com/mockup/x.jpg?camera_label=back",
          src_transparent:
            "https://images-api.printify.com/mockup/x-transparent.jpg?camera_label=back",
        },
        {
          view_id: "person-1-lifestyle",
          camera_label: "person-1-lifestyle",
          position: "other",
          label: "On model",
          src: "https://images-api.printify.com/mockup/x.jpg?camera_label=person-1-lifestyle",
        },
      ],
    },
    White: {
      mockups: [
        {
          view_id: "back",
          camera_label: "back",
          local_src: "/images/merch/white-back.jpg",
          src: "https://images-api.printify.com/mockup/white-back.jpg?camera_label=back",
        },
      ],
    },
    "Charcoal Heather": {
      mockups: [
        {
          view_id: "back",
          camera_label: "back",
          src: "https://images-api.printify.com/mockup/charcoal-back.jpg?camera_label=back",
          local_src_blank: "/images/merch/glitch-mockups/charcoal-heather-back-blank.jpg",
        },
      ],
    },
  },
};

describe("shop-glitch-hoodie-mockups-core", () => {
  it("parses camera_label from Printify mockup URL", () => {
    expect(
      cameraLabelFromMockupSrc(
        "https://images-api.printify.com/mockup/abc/champion-hoodie.jpg?camera_label=person-2-lifestyle"
      )
    ).toBe("person-2-lifestyle");
  });

  it("sorts mockups with back first", () => {
    const mockups = listGlitchHoodieMockupsForColor(PAYLOAD, "Black");
    expect(mockups[0]?.camera_label).toBe("back");
    expect(mockups.map((m) => m.camera_label)).toEqual([
      "back",
      "front",
      "person-1-lifestyle",
    ]);
  });

  it("defaults to back view", () => {
    const mockups = listGlitchHoodieMockupsForColor(PAYLOAD, "Black");
    const def = resolveDefaultGlitchHoodieMockup(mockups);
    expect(def?.camera_label).toBe(GLITCH_HOODIE_DEFAULT_MOCKUP_VIEW);
  });

  it("prefers local_src when set", () => {
    const mockups = listGlitchHoodieMockupsForColor(PAYLOAD, "White");
    expect(mockups[0]?.src).toBe("/images/merch/white-back.jpg");
  });

  it("finds mockup by view id", () => {
    const mockups = listGlitchHoodieMockupsForColor(PAYLOAD, "Black");
    expect(findGlitchHoodieMockupByView(mockups, "person-1-lifestyle")?.label).toBe("On model");
  });

  it("normalizes legacy flat front/back rows into empty list", () => {
    expect(
      normalizeGlitchMockupEntries({ front: "https://example.com/front.jpg" })
    ).toEqual([]);
  });

  it("prefers local_src_blank for src_blank", () => {
    const mockups = listGlitchHoodieMockupsForColor(PAYLOAD, "Charcoal Heather");
    expect(mockups[0]?.src_blank).toBe(
      "/images/merch/glitch-mockups/charcoal-heather-back-blank.jpg"
    );
    expect(glitchHoodieMockupHasBlankBack(mockups[0])).toBe(true);
    expect(resolveGlitchMockupPhotoSrc(mockups[0], { blankBack: true })).toBe(
      "/images/merch/glitch-mockups/charcoal-heather-back-blank.jpg"
    );
    expect(resolveGlitchMockupPhotoSrc(mockups[0], { blankBack: false })).toMatch(
      /charcoal-back/
    );
  });

  it("resolves src_transparent when frameBackground is transparent", () => {
    const mockups = listGlitchHoodieMockupsForColor(PAYLOAD, "Black");
    const back = findGlitchHoodieMockupByView(mockups, "back");
    expect(glitchHoodieMockupHasTransparentPreview(back)).toBe(true);
    expect(resolveGlitchMockupPhotoSrc(back, { frameBackground: "transparent" })).toMatch(
      /transparent/
    );
    expect(resolveGlitchMockupPhotoSrc(back, { frameBackground: "full" })).toMatch(
      /camera_label=back/
    );
  });

  it("builds color slug and blank-back path candidates", () => {
    expect(glitchHoodieColorMockupSlug("Charcoal Heather")).toBe("charcoal-heather");
    expect(glitchHoodieDefaultBlankBackLocalPath("Charcoal Heather")).toBe(
      "/images/merch/glitch-mockups/charcoal-heather-back-blank.jpg"
    );
    expect(glitchHoodieBlankBackLocalCandidates("Charcoal Heather")).toContain(
      "/images/glitch-mockups/charcoal-heather-blank-back.png"
    );
  });
});
