import {
  buildScanFreshnessPayload,
  type ScanFreshnessPayload,
  type ScanFreshnessSource,
} from "../live-object/staleness-contract";
import type { ScanViewModel } from "./scan-state";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Freshness block for scan HTML — mirrors status JSON contract. */
export function scanFreshnessForViewModel(
  vm: ScanViewModel,
  now: Date = new Date()
): ScanFreshnessPayload {
  return buildScanFreshnessPayload({
    now,
    cacheControl: vm.cacheControl,
    kind: vm.kind,
  });
}

/** True when cached/mesh HTML or resolver HTML age exceeds max-age. */
export function shouldShowScanFreshnessBanner(input: {
  fetchedAt: string | Date;
  maxAgeSeconds: number;
  now?: Date;
  source?: ScanFreshnessSource;
}): boolean {
  if (input.source && input.source !== "resolver") return true;
  const fetchedMs =
    typeof input.fetchedAt === "string"
      ? Date.parse(input.fetchedAt)
      : input.fetchedAt.getTime();
  if (!Number.isFinite(fetchedMs)) return false;
  const nowMs = (input.now ?? new Date()).getTime();
  return (nowMs - fetchedMs) / 1000 > input.maxAgeSeconds;
}

export function renderScanFreshnessBannerMarkup(
  freshness: ScanFreshnessPayload
): string {
  const startHidden = freshness.source === "resolver";
  const hiddenAttr = startHidden ? " hidden" : "";
  return `<p class="scan-freshness-banner" id="scan-freshness-banner" role="status"${hiddenAttr} data-fetched-at="${escapeHtml(freshness.fetched_at)}" data-max-age-seconds="${freshness.max_age_seconds}" data-source="${escapeHtml(freshness.source)}">${escapeHtml(freshness.stale_disclosure)}</p>`;
}

/** Order 6 — reveal staleness when HTML age exceeds embedded max-age (CDN SWR, bfcache). */
export function renderScanFreshnessBannerScript(): string {
  return `<script>
(function () {
  var el = document.getElementById("scan-freshness-banner");
  if (!el) return;
  var fetchedAt = el.getAttribute("data-fetched-at");
  var maxAge = Number(el.getAttribute("data-max-age-seconds"));
  var source = el.getAttribute("data-source") || "resolver";
  if (!fetchedAt || !maxAge) return;
  var fetchedMs = Date.parse(fetchedAt);
  if (!Number.isFinite(fetchedMs)) return;
  function apply() {
    if (source !== "resolver") {
      el.hidden = false;
      return;
    }
    var ageSec = (Date.now() - fetchedMs) / 1000;
    el.hidden = ageSec <= maxAge;
  }
  apply();
  window.addEventListener("pageshow", apply);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") apply();
  });
})();
</script>`;
}
