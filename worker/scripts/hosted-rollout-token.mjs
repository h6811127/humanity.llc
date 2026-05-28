/**
 * Validate OPERATOR_AUDIT_TOKEN for HTTP Authorization headers (ASCII / ByteString only).
 * @see hosted-rollout-step3.mjs · hosted-rollout-step4.mjs
 */

/**
 * @param {string | undefined} token
 * @param {string} [label]
 * @returns {string | null}
 */
export function normalizeOperatorAuditToken(token, label = "OPERATOR_AUDIT_TOKEN") {
  const trimmed = token?.trim();
  if (!trimmed) return null;
  assertAsciiBearerToken(trimmed, label);
  return trimmed;
}

/**
 * @param {string} token
 * @param {string} [label]
 */
export function assertAsciiBearerToken(token, label = "OPERATOR_AUDIT_TOKEN") {
  for (let i = 0; i < token.length; i++) {
    const code = token.charCodeAt(i);
    if (code > 255) {
      const hint =
        code === 0x2026
          ? " Looks like a placeholder ellipsis (…) — paste the exact ASCII token from wrangler secret, not doc examples."
          : "";
      throw new Error(
        `${label} must be ASCII-only for HTTP headers. Invalid character U+${code
          .toString(16)
          .toUpperCase()} at index ${i}.${hint}`
      );
    }
  }
}
