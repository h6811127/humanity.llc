/**
 * HTML builders for hc-emphasis-card (docs/HC_EMPHASIS_CARD_ROLLOUT.md).
 */

/** @param {string} s */
export function escapeEmphasisHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * @param {{ eyebrow: string, title?: string, detail: string, dot?: 'success'|'info'|'warn'|'urgent', actionsHtml?: string }} opts
 */
export function emphasisCardBodyHtml(opts) {
  const dot = opts.dot ?? "info";
  const titleBlock = opts.title
    ? `<p class="hc-emphasis-card__title">${opts.title}</p>`
    : "";
  const actions = opts.actionsHtml ?? "";
  return `
    <div class="hc-emphasis-card__main">
      <span class="hc-emphasis-card__dot hc-emphasis-card__dot--${dot}" aria-hidden="true"></span>
      <div class="hc-emphasis-card__copy">
        <p class="hc-emphasis-card__eyebrow">${opts.eyebrow}</p>
        ${titleBlock}
        <p class="hc-emphasis-card__detail">${opts.detail}</p>
      </div>
    </div>
    ${actions}`;
}

/**
 * @param {string[]} buttonsHtml
 */
export function emphasisCardActionsHtml(buttonsHtml) {
  if (!buttonsHtml.length) return "";
  return `<div class="hc-emphasis-card__actions">${buttonsHtml.join("")}</div>`;
}

/**
 * @param {string} label
 * @param {string} attrs
 */
export function emphasisCardCtaButton(label, attrs = "") {
  return `<button type="button" class="hc-emphasis-card__cta" ${attrs}>${escapeEmphasisHtml(label)}</button>`;
}

/**
 * @param {string} label
 * @param {string} href
 * @param {string} [attrs]
 */
export function emphasisCardCtaLink(label, href, attrs = "") {
  return `<a class="hc-emphasis-card__cta" href="${escapeEmphasisHtml(href)}" ${attrs}>${escapeEmphasisHtml(label)}</a>`;
}

/**
 * @param {string} label
 * @param {string} [attrs]
 */
export function emphasisCardCtaSecondary(label, attrs = "") {
  return `<button type="button" class="hc-emphasis-card__cta hc-emphasis-card__cta--secondary" ${attrs}>${escapeEmphasisHtml(label)}</button>`;
}

/**
 * @param {string} label
 * @param {string} href
 * @param {string} [attrs]
 */
export function emphasisCardCtaLinkSecondary(label, href, attrs = "") {
  return `<a class="hc-emphasis-card__cta hc-emphasis-card__cta--secondary" href="${escapeEmphasisHtml(href)}" ${attrs}>${escapeEmphasisHtml(label)}</a>`;
}
