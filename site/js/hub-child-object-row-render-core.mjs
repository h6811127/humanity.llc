/**
 * Shared HTML helpers for hub / collection child-object rows.
 */

/**
 * @param {string} value
 */
export function escapeHubRowHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * @param {{
 *   title: string,
 *   identity: string,
 *   statusLabel: string,
 *   statusTone: string,
 *   actionsHtml?: string,
 *   iconHtml: string,
 * }} parts
 */
export function hubChildObjectRowInnerHtml(parts) {
  const actions = parts.actionsHtml ?? "";
  return `<div class="hub-card-head">
      ${parts.iconHtml}
      <span class="list-content">
        <span class="list-title">${escapeHubRowHtml(parts.title)}</span>
        <span class="hub-card-identity hub-card-identity--muted">${escapeHubRowHtml(parts.identity)}</span>
        <span class="hub-card-status hub-card-status--${escapeHubRowHtml(parts.statusTone)}" role="status"><span class="hub-card-status-dot" aria-hidden="true"></span><span class="hub-card-status-label">${escapeHubRowHtml(parts.statusLabel)}</span></span>
      </span>
    </div>
    ${actions}`;
}
