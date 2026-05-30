/**
 * Safari ITP storage notice emphasis card (P2-1).
 * @see docs/SAFARI_KEYS_CUSTODY.md P2-1
 */

import {
  SAFARI_ITP_NOTICE_DETAIL_BROWSER,
  SAFARI_ITP_NOTICE_DETAIL_STANDALONE,
  SAFARI_ITP_NOTICE_EYEBROW,
  SAFARI_ITP_NOTICE_TITLE,
} from "./device-ownership-copy-core.mjs";
import {
  emphasisCardActionsHtml,
  emphasisCardBodyHtml,
  emphasisCardCtaSecondary,
  escapeEmphasisHtml,
} from "./device-emphasis-card-html.mjs";

/**
 * @param {{ standalone: boolean }} opts
 */
export function safariItpStorageNoticeCardBodyHtml(opts) {
  const detail = opts.standalone
    ? SAFARI_ITP_NOTICE_DETAIL_STANDALONE
    : SAFARI_ITP_NOTICE_DETAIL_BROWSER;

  return emphasisCardBodyHtml({
    eyebrow: escapeEmphasisHtml(SAFARI_ITP_NOTICE_EYEBROW),
    title: escapeEmphasisHtml(SAFARI_ITP_NOTICE_TITLE),
    detail: escapeEmphasisHtml(detail),
    dot: "info",
    actionsHtml: emphasisCardActionsHtml([
      emphasisCardCtaSecondary("Got it", "data-safari-itp-notice-dismiss"),
    ]),
  });
}
