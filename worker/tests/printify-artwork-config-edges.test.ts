import { describe, expect, it } from "vitest";

import {
  FOUNDING_PURSE_TEMPLATE_ID,
  GLITCH_HOODIE_TEMPLATE_ID,
  HOODIE_PRINT_TEMPLATE_ID,
  TIER0_BATCH_PRINT_TEMPLATE_ID,
} from "../src/print/print-catalog";
import {
  resolvePrintifyArtworkConfig,
  templateRequiresArtworkUpload,
} from "../src/print/printify-artwork-config";

describe("printify-artwork-config edges", () => {
  it("requires artwork upload for glitch hoodie and founding purse, never Tier 0", () => {
    expect(templateRequiresArtworkUpload(GLITCH_HOODIE_TEMPLATE_ID)).toBe(true);
    expect(templateRequiresArtworkUpload(FOUNDING_PURSE_TEMPLATE_ID)).toBe(true);
    expect(templateRequiresArtworkUpload(TIER0_BATCH_PRINT_TEMPLATE_ID)).toBe(false);
    expect(templateRequiresArtworkUpload("unknown-template")).toBe(false);
  });

  it("returns null for Tier 0, unknown templates, and incomplete numeric env", () => {
    expect(
      resolvePrintifyArtworkConfig(
        {
          PERSONALIZE_STICKER_PRINTIFY_BLUEPRINT_ID: "384",
          PERSONALIZE_STICKER_PRINTIFY_PRINT_PROVIDER_ID: "1",
          PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID: "17887",
        },
        TIER0_BATCH_PRINT_TEMPLATE_ID
      )
    ).toBeNull();
    expect(
      resolvePrintifyArtworkConfig(
        {
          PERSONALIZE_HOODIE_PRINTIFY_BLUEPRINT_ID: "1",
          PERSONALIZE_HOODIE_PRINTIFY_PRINT_PROVIDER_ID: "2",
          PERSONALIZE_HOODIE_PRINTIFY_VARIANT_ID: "3",
        },
        "not-a-template"
      )
    ).toBeNull();
    expect(
      resolvePrintifyArtworkConfig(
        {
          PERSONALIZE_HOODIE_PRINTIFY_BLUEPRINT_ID: "0",
          PERSONALIZE_HOODIE_PRINTIFY_PRINT_PROVIDER_ID: "-1",
          PERSONALIZE_HOODIE_PRINTIFY_VARIANT_ID: "abc",
        },
        HOODIE_PRINT_TEMPLATE_ID
      )
    ).toBeNull();
  });

  it("resolves glitch hoodie and founding purse mappings from env", () => {
    expect(
      resolvePrintifyArtworkConfig(
        {
          PERSONALIZE_GLITCH_HOODIE_PRINTIFY_BLUEPRINT_ID: "10",
          PERSONALIZE_GLITCH_HOODIE_PRINTIFY_PRINT_PROVIDER_ID: "20",
          PERSONALIZE_GLITCH_HOODIE_PRINTIFY_VARIANT_ID: "30",
          PERSONALIZE_GLITCH_HOODIE_PRINTIFY_PLACEHOLDER: "back",
          PERSONALIZE_GLITCH_HOODIE_PRINTIFY_IMAGE_X: "0.25",
          PERSONALIZE_GLITCH_HOODIE_PRINTIFY_IMAGE_Y: "0.75",
          PERSONALIZE_GLITCH_HOODIE_PRINTIFY_IMAGE_SCALE: "1.5",
          PERSONALIZE_GLITCH_HOODIE_PRINTIFY_IMAGE_ANGLE: "90",
        },
        GLITCH_HOODIE_TEMPLATE_ID
      )
    ).toEqual({
      blueprint_id: 10,
      print_provider_id: 20,
      variant_id: 30,
      placeholder_position: "back",
      image_x: 0.25,
      image_y: 0.75,
      image_scale: 1.5,
      image_angle: 90,
    });

    expect(
      resolvePrintifyArtworkConfig(
        {
          PERSONALIZE_FOUNDING_PURSE_PRINTIFY_BLUEPRINT_ID: "11",
          PERSONALIZE_FOUNDING_PURSE_PRINTIFY_PRINT_PROVIDER_ID: "21",
          PERSONALIZE_FOUNDING_PURSE_PRINTIFY_VARIANT_ID: "31",
        },
        FOUNDING_PURSE_TEMPLATE_ID
      )
    ).toEqual({
      blueprint_id: 11,
      print_provider_id: 21,
      variant_id: 31,
      placeholder_position: "front",
      image_x: 0.5,
      image_y: 0.5,
      image_scale: 1,
      image_angle: 0,
    });
  });

  it("falls back image placement when env numbers are blank or non-finite", () => {
    expect(
      resolvePrintifyArtworkConfig(
        {
          PERSONALIZE_HOODIE_PRINTIFY_BLUEPRINT_ID: "384",
          PERSONALIZE_HOODIE_PRINTIFY_PRINT_PROVIDER_ID: "1",
          PERSONALIZE_HOODIE_PRINTIFY_VARIANT_ID: "42",
          PERSONALIZE_HOODIE_PRINTIFY_PLACEHOLDER: "   ",
          PERSONALIZE_HOODIE_PRINTIFY_IMAGE_X: "",
          PERSONALIZE_HOODIE_PRINTIFY_IMAGE_Y: "not-a-number",
          PERSONALIZE_HOODIE_PRINTIFY_IMAGE_SCALE: "  ",
          PERSONALIZE_HOODIE_PRINTIFY_IMAGE_ANGLE: "NaN",
        },
        HOODIE_PRINT_TEMPLATE_ID
      )
    ).toEqual({
      blueprint_id: 384,
      print_provider_id: 1,
      variant_id: 42,
      placeholder_position: "front",
      image_x: 0.5,
      image_y: 0.5,
      image_scale: 1,
      image_angle: 0,
    });
  });
});
