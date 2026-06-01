import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRINT_TEMPLATE_ID,
  FOUNDING_PURSE_TEMPLATE_ID,
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
    expect(templateRequiresArtworkUpload(FOUNDING_PURSE_TEMPLATE_ID)).toBe(true);
    expect(templateRequiresArtworkUpload(TIER0_BATCH_PRINT_TEMPLATE_ID)).toBe(false);
  });

  it("resolves founding purse blueprint mapping from env", () => {
    expect(
      resolvePrintifyArtworkConfig(
        {
          PERSONALIZE_FOUNDING_PURSE_PRINTIFY_BLUEPRINT_ID: "900",
          PERSONALIZE_FOUNDING_PURSE_PRINTIFY_PRINT_PROVIDER_ID: "42",
          PERSONALIZE_FOUNDING_PURSE_PRINTIFY_VARIANT_ID: "12345",
          PERSONALIZE_FOUNDING_PURSE_PRINTIFY_PLACEHOLDER: "front",
          PERSONALIZE_FOUNDING_PURSE_PRINTIFY_IMAGE_SCALE: "0.4",
        },
        FOUNDING_PURSE_TEMPLATE_ID
      )
    ).toMatchObject({
      blueprint_id: 900,
      print_provider_id: 42,
      variant_id: 12345,
      placeholder_position: "front",
      image_scale: 0.4,
    });
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
