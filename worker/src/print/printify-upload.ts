/**
 * Printify media upload + ephemeral product creation for per-order QR artwork.
 * Spec: PM-FR-13 — POST /v1/uploads/images.json then attach via product print_areas.
 */

import type { PrintifyArtworkConfig } from "./printify-artwork-config";
import type { PrintifyEnv } from "./printify-client";

const PRINTIFY_API_BASE = "https://api.printify.com/v1";

export interface PrintifyUploadResult {
  ok: true;
  upload_id: string;
}

export interface PrintifyUploadError {
  ok: false;
  code: "PRINTIFY_UPLOAD_FAILED";
  message: string;
  status?: number;
}

export interface PrintifyEphemeralProductResult {
  ok: true;
  product_id: string;
}

export interface PrintifyEphemeralProductError {
  ok: false;
  code: "PRINTIFY_PRODUCT_CREATE_FAILED";
  message: string;
  status?: number;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token.trim()}`,
    "Content-Type": "application/json",
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function encodeSvgForPrintifyUpload(svg: string): string {
  return bytesToBase64(new TextEncoder().encode(svg));
}

export async function uploadPrintifyArtworkSvg(
  env: PrintifyEnv,
  input: { file_name: string; svg: string },
  fetchImpl: typeof fetch = fetch
): Promise<PrintifyUploadResult | PrintifyUploadError> {
  const token = env.PRINTIFY_API_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      code: "PRINTIFY_UPLOAD_FAILED",
      message: "Printify credentials are not configured.",
    };
  }

  const res = await fetchImpl(`${PRINTIFY_API_BASE}/uploads/images.json`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      file_name: input.file_name,
      contents: encodeSvgForPrintifyUpload(input.svg),
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      code: "PRINTIFY_UPLOAD_FAILED",
      message: text.slice(0, 240) || `Printify upload returned ${res.status}.`,
      status: res.status,
    };
  }

  let parsed: { id?: string };
  try {
    parsed = JSON.parse(text) as { id?: string };
  } catch {
    return {
      ok: false,
      code: "PRINTIFY_UPLOAD_FAILED",
      message: "Printify upload returned non-JSON response.",
      status: res.status,
    };
  }

  const uploadId = typeof parsed.id === "string" ? parsed.id.trim() : "";
  if (!uploadId) {
    return {
      ok: false,
      code: "PRINTIFY_UPLOAD_FAILED",
      message: "Printify upload response missing image id.",
      status: res.status,
    };
  }

  return { ok: true, upload_id: uploadId };
}

export async function createPrintifyEphemeralProduct(
  env: PrintifyEnv,
  shopId: number,
  input: {
    title: string;
    artwork: PrintifyArtworkConfig;
    upload_id: string;
  },
  fetchImpl: typeof fetch = fetch
): Promise<PrintifyEphemeralProductResult | PrintifyEphemeralProductError> {
  const token = env.PRINTIFY_API_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      code: "PRINTIFY_PRODUCT_CREATE_FAILED",
      message: "Printify credentials are not configured.",
    };
  }

  const { artwork, upload_id, title } = input;
  const payload = {
    title,
    description: "Ephemeral Humanity fulfillment product — not for public sale.",
    blueprint_id: artwork.blueprint_id,
    print_provider_id: artwork.print_provider_id,
    variants: [
      {
        id: artwork.variant_id,
        price: 100,
        is_enabled: true,
      },
    ],
    print_areas: [
      {
        variant_ids: [artwork.variant_id],
        placeholders: [
          {
            position: artwork.placeholder_position,
            images: [
              {
                id: upload_id,
                x: artwork.image_x,
                y: artwork.image_y,
                scale: artwork.image_scale,
                angle: artwork.image_angle,
              },
            ],
          },
        ],
      },
    ],
  };

  const res = await fetchImpl(`${PRINTIFY_API_BASE}/shops/${shopId}/products.json`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      code: "PRINTIFY_PRODUCT_CREATE_FAILED",
      message: text.slice(0, 240) || `Printify product create returned ${res.status}.`,
      status: res.status,
    };
  }

  let parsed: { id?: string };
  try {
    parsed = JSON.parse(text) as { id?: string };
  } catch {
    return {
      ok: false,
      code: "PRINTIFY_PRODUCT_CREATE_FAILED",
      message: "Printify product create returned non-JSON response.",
      status: res.status,
    };
  }

  const productId = typeof parsed.id === "string" ? parsed.id.trim() : "";
  if (!productId) {
    return {
      ok: false,
      code: "PRINTIFY_PRODUCT_CREATE_FAILED",
      message: "Printify product create response missing product id.",
      status: res.status,
    };
  }

  return { ok: true, product_id: productId };
}
