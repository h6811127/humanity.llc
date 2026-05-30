import {
  DEFAULT_PRINT_TEMPLATE_ID,
  GLITCH_HOODIE_TEMPLATE_ID,
  HOODIE_PRINT_TEMPLATE_ID,
  TIER0_BATCH_PRINT_TEMPLATE_ID,
} from "./print-catalog";
import type { PrintifyTemplateEnv } from "./printify-template-config";

export interface PrintifyArtworkConfig {
  blueprint_id: number;
  print_provider_id: number;
  variant_id: number;
  placeholder_position: string;
  image_x: number;
  image_y: number;
  image_scale: number;
  image_angle: number;
}

function parsePositiveInt(raw: string | undefined, fallback = 0): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseFloatOpt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseFloat(raw.trim());
  return Number.isFinite(n) ? n : fallback;
}

function resolveArtworkFromEnv(
  env: PrintifyTemplateEnv,
  blueprintKey: keyof PrintifyTemplateEnv,
  providerKey: keyof PrintifyTemplateEnv,
  variantKey: keyof PrintifyTemplateEnv,
  placeholderKey: keyof PrintifyTemplateEnv,
  imageXKey: keyof PrintifyTemplateEnv,
  imageYKey: keyof PrintifyTemplateEnv,
  scaleKey: keyof PrintifyTemplateEnv,
  angleKey: keyof PrintifyTemplateEnv,
  defaultPlaceholder: string
): PrintifyArtworkConfig | null {
  const blueprint_id = parsePositiveInt(env[blueprintKey] as string | undefined);
  const print_provider_id = parsePositiveInt(env[providerKey] as string | undefined);
  const variant_id = parsePositiveInt(env[variantKey] as string | undefined);
  if (!blueprint_id || !print_provider_id || !variant_id) return null;

  const placeholder =
    (env[placeholderKey] as string | undefined)?.trim() || defaultPlaceholder;

  return {
    blueprint_id,
    print_provider_id,
    variant_id,
    placeholder_position: placeholder,
    image_x: parseFloatOpt(env[imageXKey] as string | undefined, 0.5),
    image_y: parseFloatOpt(env[imageYKey] as string | undefined, 0.5),
    image_scale: parseFloatOpt(env[scaleKey] as string | undefined, 1),
    image_angle: parseFloatOpt(env[angleKey] as string | undefined, 0),
  };
}

/** Blueprint + placeholder mapping for per-order artwork upload (PM-FR-13). */
export function resolvePrintifyArtworkConfig(
  env: PrintifyTemplateEnv,
  templateId: string
): PrintifyArtworkConfig | null {
  if (templateId === TIER0_BATCH_PRINT_TEMPLATE_ID) return null;

  if (templateId === HOODIE_PRINT_TEMPLATE_ID) {
    return resolveArtworkFromEnv(
      env,
      "PERSONALIZE_HOODIE_PRINTIFY_BLUEPRINT_ID",
      "PERSONALIZE_HOODIE_PRINTIFY_PRINT_PROVIDER_ID",
      "PERSONALIZE_HOODIE_PRINTIFY_VARIANT_ID",
      "PERSONALIZE_HOODIE_PRINTIFY_PLACEHOLDER",
      "PERSONALIZE_HOODIE_PRINTIFY_IMAGE_X",
      "PERSONALIZE_HOODIE_PRINTIFY_IMAGE_Y",
      "PERSONALIZE_HOODIE_PRINTIFY_IMAGE_SCALE",
      "PERSONALIZE_HOODIE_PRINTIFY_IMAGE_ANGLE",
      "front"
    );
  }

  if (templateId === GLITCH_HOODIE_TEMPLATE_ID) {
    return resolveArtworkFromEnv(
      env,
      "PERSONALIZE_GLITCH_HOODIE_PRINTIFY_BLUEPRINT_ID",
      "PERSONALIZE_GLITCH_HOODIE_PRINTIFY_PRINT_PROVIDER_ID",
      "PERSONALIZE_GLITCH_HOODIE_PRINTIFY_VARIANT_ID",
      "PERSONALIZE_GLITCH_HOODIE_PRINTIFY_PLACEHOLDER",
      "PERSONALIZE_GLITCH_HOODIE_PRINTIFY_IMAGE_X",
      "PERSONALIZE_GLITCH_HOODIE_PRINTIFY_IMAGE_Y",
      "PERSONALIZE_GLITCH_HOODIE_PRINTIFY_IMAGE_SCALE",
      "PERSONALIZE_GLITCH_HOODIE_PRINTIFY_IMAGE_ANGLE",
      "front"
    );
  }

  if (templateId === DEFAULT_PRINT_TEMPLATE_ID) {
    return resolveArtworkFromEnv(
      env,
      "PERSONALIZE_STICKER_PRINTIFY_BLUEPRINT_ID",
      "PERSONALIZE_STICKER_PRINTIFY_PRINT_PROVIDER_ID",
      "PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID",
      "PERSONALIZE_STICKER_PRINTIFY_PLACEHOLDER",
      "PERSONALIZE_STICKER_PRINTIFY_IMAGE_X",
      "PERSONALIZE_STICKER_PRINTIFY_IMAGE_Y",
      "PERSONALIZE_STICKER_PRINTIFY_IMAGE_SCALE",
      "PERSONALIZE_STICKER_PRINTIFY_IMAGE_ANGLE",
      "front"
    );
  }

  return null;
}

export function templateRequiresArtworkUpload(templateId: string): boolean {
  return (
    templateId === DEFAULT_PRINT_TEMPLATE_ID ||
    templateId === HOODIE_PRINT_TEMPLATE_ID ||
    templateId === GLITCH_HOODIE_TEMPLATE_ID
  );
}
