/**
 * Bearer auth for operator-only resolver routes (vouch audit, future ops tools).
 * Token: OPERATOR_AUDIT_TOKEN Worker secret — never commit.
 */

export function operatorAuditAuthorized(
  request: Request,
  expectedToken: string | undefined
): boolean {
  if (!expectedToken) return false;
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const provided = auth.slice("Bearer ".length).trim();
  if (!provided || provided.length !== expectedToken.length) return false;
  // Constant-time-ish compare for equal-length strings.
  let mismatch = 0;
  for (let i = 0; i < provided.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  return mismatch === 0;
}
