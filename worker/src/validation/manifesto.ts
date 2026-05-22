import { CRYPTO_ERROR, CryptoVerifyError } from "../crypto/errors";

const HTML_TAG = /<[^>]+>/;

export function validateManifestoLine(raw: string): string {
  const line = raw.trim();
  if (line.length < 1 || line.length > 280) {
    throw new CryptoVerifyError(
      CRYPTO_ERROR.MISSING_REQUIRED_FIELD,
      "Manifesto line must be 1–280 characters after trimming."
    );
  }
  if (HTML_TAG.test(line)) {
    throw new CryptoVerifyError(
      CRYPTO_ERROR.MISSING_REQUIRED_FIELD,
      "Manifesto line must be plain text without HTML markup."
    );
  }
  return line;
}
