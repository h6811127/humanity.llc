/**
 * Validate OPERATOR_AUDIT_TOKEN for HTTP Authorization headers (ASCII / ByteString only).
 * @see hosted-rollout-step3.mjs · hosted-rollout-step4.mjs
 */

/**
 * @param {string | undefined} token
 * @param {string} [label]
 * @returns {string | null}
 */
const DOC_PLACEHOLDER_TOKENS = new Set(["...", "…", "<token>", "<your-token>"]);

export function normalizeOperatorAuditToken(token, label = "OPERATOR_AUDIT_TOKEN") {
  const trimmed = token?.trim();
  if (!trimmed) return null;
  if (DOC_PLACEHOLDER_TOKENS.has(trimmed)) {
    throw new Error(
      `${label} is still a doc placeholder (${JSON.stringify(trimmed)}). ` +
        "Paste the real ASCII secret from wrangler / GitHub — do not copy the literal ... from docs."
    );
  }
  assertAsciiBearerToken(trimmed, label);
  return trimmed;
}

/**
 * Shell-safe usage hint when env assignment fails (PowerShell, fish, pasted token only).
 */
export function operatorAuditTokenShellHint() {
  return [
    "Set the token in two lines (zsh/bash):",
    "  export OPERATOR_AUDIT_TOKEN='paste-token-here'",
    "  npm run hosted:rollout:step4b -- --verify",
    "",
    "PowerShell:",
    "  $env:OPERATOR_AUDIT_TOKEN='paste-token-here'",
    "  npm run hosted:rollout:step4b -- --verify",
    "",
    "--smoke and --preflight do not require OPERATOR_AUDIT_TOKEN.",
  ].join("\n");
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
