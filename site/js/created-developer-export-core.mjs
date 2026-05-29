/**
 * Pure state for /created/ developer export pubkey preview (D8).
 */

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function ownerPubkeyPreviewState(session) {
  const pub = session?.owner_public_key_b58;
  const show = typeof pub === "string" && pub.length > 0;
  return {
    show,
    publicKeyBase58: show ? String(pub) : "",
  };
}
