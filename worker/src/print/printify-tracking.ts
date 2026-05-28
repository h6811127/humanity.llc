/** Parse carrier tracking from Printify order API or webhook payloads (PM-FR-34). */

export interface PrintifyTracking {
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
}

function readOptionalString(raw: unknown, maxLen: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > maxLen) return null;
  return trimmed;
}

function parseShipmentLike(raw: unknown): PrintifyTracking | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const carrier = readOptionalString(o.carrier, 80);
  const tracking_number =
    readOptionalString(o.tracking_number, 120) ??
    readOptionalString(o.number, 120) ??
    readOptionalString(o.trackingNumber, 120);
  const tracking_url =
    readOptionalString(o.tracking_url, 512) ??
    readOptionalString(o.url, 512) ??
    readOptionalString(o.trackingUrl, 512);

  if (!carrier && !tracking_number && !tracking_url) return null;

  return { carrier, tracking_number, tracking_url };
}

function pickBestTracking(candidates: PrintifyTracking[]): PrintifyTracking | null {
  if (candidates.length === 0) return null;
  const withUrl = candidates.find((c) => c.tracking_url);
  if (withUrl) return withUrl;
  const withNumber = candidates.find((c) => c.tracking_number);
  if (withNumber) return withNumber;
  return candidates[0] ?? null;
}

/** Extract tracking from Printify GET /shops/{id}/orders/{id}.json body. */
export function parsePrintifyTrackingFromOrderBody(body: unknown): PrintifyTracking | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;

  const shipments = root.shipments;
  if (Array.isArray(shipments)) {
    const parsed = shipments
      .map((item) => parseShipmentLike(item))
      .filter((item): item is PrintifyTracking => item !== null);
    return pickBestTracking(parsed);
  }

  return parseShipmentLike(root.shipment ?? root.tracking);
}

/** Extract tracking from Printify webhook resource.data. */
export function parsePrintifyTrackingFromWebhookData(data: unknown): PrintifyTracking | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;

  const shipments = root.shipments;
  if (Array.isArray(shipments)) {
    const parsed = shipments
      .map((item) => parseShipmentLike(item))
      .filter((item): item is PrintifyTracking => item !== null);
    const best = pickBestTracking(parsed);
    if (best) return best;
  }

  const shipment = root.shipment ?? root.shipping;
  return parseShipmentLike(shipment);
}

export function trackingIsEmpty(tracking: PrintifyTracking | null): boolean {
  if (!tracking) return true;
  return !tracking.carrier && !tracking.tracking_number && !tracking.tracking_url;
}

export function mergeTracking(
  existing: PrintifyTracking | null,
  incoming: PrintifyTracking | null
): PrintifyTracking | null {
  if (!incoming || trackingIsEmpty(incoming)) return existing;
  if (!existing || trackingIsEmpty(existing)) return incoming;
  return {
    carrier: incoming.carrier ?? existing.carrier,
    tracking_number: incoming.tracking_number ?? existing.tracking_number,
    tracking_url: incoming.tracking_url ?? existing.tracking_url,
  };
}
