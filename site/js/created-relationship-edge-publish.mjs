/**
 * Sign + POST RelationshipEdge documents from /created/ (browser).
 */

import {
  childObjectApiUrl,
  relationshipEdgesIssuePath,
  relationshipEdgesListPath,
} from "./child-object-api-core.mjs";
import {
  decodePrivateKeyBase58,
  resolverApiOrigin,
  signDocument,
  withProtocolFields,
} from "./hc-sign.mjs";
import { resolverErrorMessage } from "./resolver-user-error-core.mjs";
import { buildScanGraphRelationshipEdgesFromUnlockDraft } from "./created-relationship-edge-publish-core.mjs";

const PAYLOAD_TYPE_RELATIONSHIP_EDGE = "relationship_edge";

/**
 * @param {Record<string, unknown>} unsigned
 * @param {string} privateKeyBase58
 * @param {string} publicKeyBase58
 */
export async function signRelationshipEdge(unsigned, privateKeyBase58, publicKeyBase58) {
  const privateKey = decodePrivateKeyBase58(privateKeyBase58);
  const payload = withProtocolFields(unsigned, PAYLOAD_TYPE_RELATIONSHIP_EDGE);
  return signDocument(payload, privateKey, publicKeyBase58);
}

/**
 * @param {string} profileId
 */
export async function fetchRelationshipEdges(profileId) {
  const url = childObjectApiUrl(resolverApiOrigin(), relationshipEdgesListPath(profileId));
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      resolverErrorMessage(data, {
        status: res.status,
        requestUrl: url,
        fallback: "Could not load relationship edges.",
      })
    );
  }
  return Array.isArray(data.relationship_edges) ? data.relationship_edges : [];
}

/**
 * @param {string} profileId
 * @param {Record<string, unknown>} signedEdge
 */
export async function postRelationshipEdge(profileId, signedEdge) {
  const url = childObjectApiUrl(resolverApiOrigin(), relationshipEdgesIssuePath(profileId));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ relationship_edge: signedEdge }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      resolverErrorMessage(data, {
        status: res.status,
        requestUrl: url,
        fallback: "Could not publish relationship edge.",
      })
    );
  }
  return data;
}

/**
 * @param {{
 *   profileId: string;
 *   seasonId: string;
 *   season: Record<string, unknown>;
 *   templateRows: Array<{ node_id: string; object_id?: string; role?: string; label?: string }>;
 *   unlockEdges: Array<{ from: string; to: string; label?: string }>;
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 *   skipExisting?: boolean;
 * }} input
 */
export async function publishRelationshipEdgesFromUnlockDraft(input) {
  const built = buildScanGraphRelationshipEdgesFromUnlockDraft({
    season: input.season,
    profileId: input.profileId,
    seasonId: input.seasonId,
    templateRows: input.templateRows,
    unlockEdges: input.unlockEdges,
  });
  if (!built.ok && !built.edges.length) {
    return { ok: false, issues: built.issues, published: [], skipped: [] };
  }

  const live = input.skipExisting === false ? [] : await fetchRelationshipEdges(input.profileId);
  const liveIds = new Set(
    live.filter((row) => row.status !== "revoked").map((row) => String(row.edge_id))
  );

  /** @type {Array<{ edge_id: string; kind: string }>} */
  const published = [];
  /** @type {Array<{ edge_id: string; reason: string }>} */
  const skipped = [];
  /** @type {string[]} */
  const issues = [...built.issues];

  for (const row of built.edges) {
    if (input.skipExisting !== false && liveIds.has(row.edge_id)) {
      skipped.push({ edge_id: row.edge_id, reason: "already active on Live" });
      continue;
    }
    try {
      const signed = await signRelationshipEdge(
        row.unsigned,
        input.privateKeyBase58,
        input.publicKeyBase58
      );
      await postRelationshipEdge(input.profileId, signed);
      published.push({ edge_id: row.edge_id, kind: row.kind });
    } catch (err) {
      issues.push(
        `${row.edge_id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return {
    ok: issues.length === 0 && (published.length > 0 || skipped.length > 0),
    issues,
    published,
    skipped,
  };
}
