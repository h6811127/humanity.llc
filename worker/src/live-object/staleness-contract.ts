import type { ScanPageKind } from "../resolver/scan-state";
import { CACHE_ACTIVE, CACHE_INACTIVE } from "../resolver/scan-state";

/** Where scan truth was assembled (resolver today; mesh/cache later). */
export type ScanFreshnessSource = "resolver" | "cache" | "mesh";

export type ScanFreshnessPayload = {
  fetched_at: string;
  max_age_seconds: number;
  stale_disclosure: string;
  source: ScanFreshnessSource;
};

export const STALE_DISCLOSURE_RESOLVER =
  "This response was built by the resolver at fetch time. Cached or offline copies may be older — open the URL again for current signed state.";

export const STALE_DISCLOSURE_CACHE =
  "This is a cached copy of signed public state. It may be older than what the steward published last — refresh the URL when you can.";

export function maxAgeSecondsFromCacheControl(cacheControl: string): number {
  const match = cacheControl.match(/max-age=(\d+)/);
  if (match) return Number(match[1]);
  return 60;
}

export function defaultCacheControlForScanKind(kind: ScanPageKind): string {
  return kind === "active" ? CACHE_ACTIVE : CACHE_INACTIVE;
}

/** Status JSON freshness block — Order 6 staleness contract. */
export function buildScanFreshnessPayload(input: {
  now?: Date;
  cacheControl?: string;
  kind: ScanPageKind;
  source?: ScanFreshnessSource;
}): ScanFreshnessPayload {
  const cacheControl =
    input.cacheControl ?? defaultCacheControlForScanKind(input.kind);
  const source = input.source ?? "resolver";
  return {
    fetched_at: (input.now ?? new Date()).toISOString(),
    max_age_seconds: maxAgeSecondsFromCacheControl(cacheControl),
    stale_disclosure:
      source === "resolver" ? STALE_DISCLOSURE_RESOLVER : STALE_DISCLOSURE_CACHE,
    source,
  };
}
