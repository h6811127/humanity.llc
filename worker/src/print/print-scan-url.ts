/** Canonical scan URL for a planned print_artifact QR (merch fulfillment). */

const DEFAULT_SCAN_ORIGIN = "https://humanity.llc";

export function buildPlannedItemScanUrl(
  profileId: string,
  plannedQrId: string,
  origin: string = DEFAULT_SCAN_ORIGIN
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/c/${encodeURIComponent(profileId)}?q=${encodeURIComponent(plannedQrId)}`;
}
