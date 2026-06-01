import { CRYPTO_ERROR, CryptoVerifyError } from "../crypto/errors";
import {
  normalizeObjectStreams,
  parseObjectStreamsFromDocument,
} from "../../../site/js/object-streams-core.mjs";

export type ObjectPublicStream = {
  id: string;
  class: string;
  label: string;
  value: string;
};

export {
  OBJECT_STREAM_CLASSES,
  OBJECT_STREAM_LABEL_MAX,
  OBJECT_STREAM_MAX_COUNT,
  OBJECT_STREAM_VALUE_MAX,
  parseObjectStreamsFromDocument,
} from "../../../site/js/object-streams-core.mjs";

export function validateObjectStreamsField(
  doc: Record<string, unknown>
): ObjectPublicStream[] {
  if (!("object_streams" in doc)) return [];
  try {
    return normalizeObjectStreams(doc.object_streams, {
      allowAbsent: false,
    }) as ObjectPublicStream[];
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid object_streams.";
    throw new CryptoVerifyError(CRYPTO_ERROR.MISSING_REQUIRED_FIELD, msg);
  }
}

export function objectStreamsFromCardDocumentJson(
  cardDocumentJson: string | null | undefined
): ObjectPublicStream[] {
  if (!cardDocumentJson) return [];
  try {
    const doc = JSON.parse(cardDocumentJson) as Record<string, unknown>;
    return parseObjectStreamsFromDocument(doc) as ObjectPublicStream[];
  } catch {
    return [];
  }
}

export function objectStreamsFromChildDocumentJson(
  childDocumentJson: string | null | undefined
): ObjectPublicStream[] {
  if (!childDocumentJson) return [];
  try {
    const doc = JSON.parse(childDocumentJson) as Record<string, unknown>;
    return parseObjectStreamsFromDocument(doc) as ObjectPublicStream[];
  } catch {
    return [];
  }
}
