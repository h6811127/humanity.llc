/**
 * Safari persist-denied emphasis card (RC-2).
 * @see docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md RC-2
 */

import {
  STORAGE_PERSIST_DENIED_DETAIL_BROWSER,
  STORAGE_PERSIST_DENIED_DETAIL_STANDALONE,
  STORAGE_PERSIST_DENIED_EYEBROW,
  STORAGE_PERSIST_DENIED_TITLE,
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
export function storagePersistDeniedNoticeCardBodyHtml(opts) {
  const detail = opts.standalone
    ? STORAGE_PERSIST_DENIED_DETAIL_STANDALONE
    : STORAGE_PERSIST_DENIED_DETAIL_BROWSER;

  return emphasisCardBodyHtml({
    eyebrow: escapeEmphasisHtml(STORAGE_PERSIST_DENIED_EYEBROW),
    title: escapeEmphasisHtml(STORAGE_PERSIST_DENIED_TITLE),
    detail: escapeEmphasisHtml(detail),
    dot: "warn",
    actionsHtml: emphasisCardActionsHtml([
      emphasisCardCtaSecondary("Got it", "data-storage-persist-denied-dismiss"),
    ]),
  });
}
