/**
 * Hub steward vouch guidance emphasis card (S4).
 * @see docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md § S4
 */

import {
  HUB_STEWARD_SAFARI_VOUCH_GUIDANCE_DETAIL,
  HUB_STEWARD_SAFARI_VOUCH_GUIDANCE_TITLE,
  HUB_STEWARD_VOUCH_GUIDANCE_DETAIL,
  HUB_STEWARD_VOUCH_GUIDANCE_EYEBROW,
  HUB_STEWARD_VOUCH_GUIDANCE_TITLE,
} from "./device-ownership-copy-core.mjs";
import { emphasisCardBodyHtml, escapeEmphasisHtml } from "./device-emphasis-card-html.mjs";

/**
 * @param {"pwa" | "safari"} variant
 */
export function hubStewardVouchGuidanceCardBodyHtml(variant) {
  const title =
    variant === "pwa" ? HUB_STEWARD_VOUCH_GUIDANCE_TITLE : HUB_STEWARD_SAFARI_VOUCH_GUIDANCE_TITLE;
  const detail =
    variant === "pwa"
      ? HUB_STEWARD_VOUCH_GUIDANCE_DETAIL
      : HUB_STEWARD_SAFARI_VOUCH_GUIDANCE_DETAIL;

  return emphasisCardBodyHtml({
    eyebrow: escapeEmphasisHtml(HUB_STEWARD_VOUCH_GUIDANCE_EYEBROW),
    title: escapeEmphasisHtml(title),
    detail: escapeEmphasisHtml(detail),
    dot: "info",
    actionsHtml: "",
  });
}
