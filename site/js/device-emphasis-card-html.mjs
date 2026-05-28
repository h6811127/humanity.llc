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
 * @param {{ eyebrow: string, title?: string, detail: string, dot?: 'success'|'info'|'warn'|'urgent', actionsHtml?: string, extraCopyHtml?: string, detailId?: string }} opts
 */
export function emphasisCardBodyHtml(opts) {
  const dot = opts.dot ?? "info";
  const titleBlock = opts.title
    ? `<p class="hc-emphasis-card__title">${opts.title}</p>`
    : "";
  const actions = opts.actionsHtml ?? "";
  const detailId = opts.detailId
    ? ` id="${escapeEmphasisHtml(opts.detailId)}"`
    : "";
  const extraCopy = opts.extraCopyHtml ?? "";
  return `
    <div class="hc-emphasis-card__main">
      <span class="hc-emphasis-card__dot hc-emphasis-card__dot--${dot}" aria-hidden="true"></span>
      <div class="hc-emphasis-card__copy">
        <p class="hc-emphasis-card__eyebrow">${opts.eyebrow}</p>
        ${titleBlock}
        <p class="hc-emphasis-card__detail"${detailId}>${opts.detail}</p>
        ${extraCopy}
      </div>
    </div>
    ${actions}`;
}

/**
 * @param {{ modifier?: 'active'|'info'|'warn'|'urgent', className?: string, id?: string, role?: string, hidden?: boolean, ariaLive?: string, afterActionsHtml?: string } & Parameters<typeof emphasisCardBodyHtml>[0]} opts
 */
export function emphasisCardShellHtml(opts) {
  const mod = opts.modifier ?? "info";
  const classes = ["hc-emphasis-card", `hc-emphasis-card--${mod}`, opts.className]
    .filter(Boolean)
    .join(" ");
  const attrs = [
    opts.id ? `id="${escapeEmphasisHtml(opts.id)}"` : "",
    opts.role ? `role="${opts.role}"` : "",
    opts.ariaLive ? `aria-live="${escapeEmphasisHtml(opts.ariaLive)}"` : "",
    opts.hidden ? "hidden" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const afterActions = opts.afterActionsHtml ?? "";
  return `<div class="${classes}" ${attrs}>${emphasisCardBodyHtml(opts)}${afterActions}</div>`;
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
