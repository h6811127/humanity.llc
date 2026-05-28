import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRINT_TEMPLATE_ID,
  HOODIE_PRINT_TEMPLATE_ID,
  TIER0_BATCH_PRINT_TEMPLATE_ID,
} from "../src/print/print-catalog";
import {
  resolvePrintifyArtworkConfig,
  templateRequiresArtworkUpload,
} from "../src/print/printify-artwork-config";

describe("printify-artwork-config", () => {
  it("marks Tier 1 templates as requiring artwork upload", () => {
    expect(templateRequiresArtworkUpload(DEFAULT_PRINT_TEMPLATE_ID)).toBe(true);
    expect(templateRequiresArtworkUpload(HOODIE_PRINT_TEMPLATE_ID)).toBe(true);
    expect(templateRequiresArtworkUpload(TIER0_BATCH_PRINT_TEMPLATE_ID)).toBe(false);
  });

  it("resolves sticker blueprint mapping from env", () => {
    expect(
      resolvePrintifyArtworkConfig(
        {
          PERSONALIZE_STICKER_PRINTIFY_BLUEPRINT_ID: "384",
          PERSONALIZE_STICKER_PRINTIFY_PRINT_PROVIDER_ID: "1",
          PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID: "17887",
          PERSONALIZE_STICKER_PRINTIFY_PLACEHOLDER: "front",
        },
        DEFAULT_PRINT_TEMPLATE_ID
      )
    ).toEqual({
      blueprint_id: 384,
      print_provider_id: 1,
      variant_id: 17887,
      placeholder_position: "front",
      image_x: 0.5,
      image_y: 0.5,
      image_scale: 1,
      image_angle: 0,
    });
  });

  it("returns null when blueprint env is incomplete", () => {
    expect(
      resolvePrintifyArtworkConfig(
        { PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID: "1" },
        DEFAULT_PRINT_TEMPLATE_ID
      )
    ).toBeNull();
  });
});
