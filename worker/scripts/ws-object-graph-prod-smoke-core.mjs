/**
 * WS-OBJECT-GRAPH-PROD-SMOKE — assertion helpers (read-only prod checks).
 * @see docs/WS_OBJECT_GRAPH_PROD_SMOKE_V1.md
 */

export const CR_WITNESS_EDGE_ID = "edge_cr_witness_10_07";
export const CR_UNLOCK_EDGE_ID = "edge_cr_unlock_04_07";

export const PROD_PROFILE_ID = "GcP3Ee17yGqMHdidhEVMYBzq";
export const PROD_CABINET_QR = "qr_gEPR1PfPPB2z3ze1";
export const PROD_LIBRARY_QR = "qr_6zs7Jej5m4ZV4U7e";
export const PROD_RIVER_QR = "qr_aMr8qJGBF9xpC1gu";

export const CR_WITNESS_EDGE_LABEL =
  "Library witness vouch opens cabinet path";
export const CR_UNLOCK_EDGE_LABEL =
  "River Lantern unlocks Czech Village cabinet";

/**
 * @param {unknown} statusBody
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertWitnessEdgePending(statusBody) {
  const rel = statusBody?.scan?.relationships;
  if (!Array.isArray(rel)) {
    return { ok: false, message: "scan.relationships missing" };
  }
  const row = rel.find((entry) => entry.edge_id === CR_WITNESS_EDGE_ID);
  if (!row) {
    return { ok: false, message: `${CR_WITNESS_EDGE_ID} not in relationships[]` };
  }
  if (row.satisfied !== false) {
    return { ok: false, message: `${CR_WITNESS_EDGE_ID} satisfied=${row.satisfied}` };
  }
  if (row.kind !== "witnesses") {
    return { ok: false, message: `expected kind witnesses, got ${row.kind}` };
  }
  return { ok: true };
}

/**
 * @param {unknown} statusBody
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertWitnessEdgeSatisfied(statusBody) {
  const rel = statusBody?.scan?.relationships;
  if (!Array.isArray(rel)) {
    return { ok: false, message: "scan.relationships missing" };
  }
  const row = rel.find((entry) => entry.edge_id === CR_WITNESS_EDGE_ID);
  if (!row) {
    return { ok: false, message: `${CR_WITNESS_EDGE_ID} not in relationships[]` };
  }
  if (row.satisfied !== true) {
    return { ok: false, message: `${CR_WITNESS_EDGE_ID} satisfied=${row.satisfied}` };
  }
  return { ok: true };
}

/**
 * @param {unknown} statusBody
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertUnlockEdgePending(statusBody) {
  const rel = statusBody?.scan?.relationships;
  if (!Array.isArray(rel)) {
    return { ok: false, message: "scan.relationships missing" };
  }
  const row = rel.find((entry) => entry.edge_id === CR_UNLOCK_EDGE_ID);
  if (!row) {
    return {
      ok: false,
      message: `${CR_UNLOCK_EDGE_ID} not in relationships[] — run city-game:seed-relationship-edge-unlock:remote`,
    };
  }
  if (row.satisfied !== false) {
    return { ok: false, message: `${CR_UNLOCK_EDGE_ID} satisfied=${row.satisfied}` };
  }
  if (row.kind !== "unlocks") {
    return { ok: false, message: `expected kind unlocks, got ${row.kind}` };
  }
  return { ok: true };
}

/**
 * @param {unknown} statusBody
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertUnlockEdgeSatisfied(statusBody) {
  const rel = statusBody?.scan?.relationships;
  if (!Array.isArray(rel)) {
    return { ok: false, message: "scan.relationships missing" };
  }
  const row = rel.find((entry) => entry.edge_id === CR_UNLOCK_EDGE_ID);
  if (!row) {
    return {
      ok: false,
      message: `${CR_UNLOCK_EDGE_ID} not in relationships[]`,
    };
  }
  if (row.satisfied !== true) {
    return { ok: false, message: `${CR_UNLOCK_EDGE_ID} satisfied=${row.satisfied}` };
  }
  if (row.kind !== "unlocks") {
    return { ok: false, message: `expected kind unlocks, got ${row.kind}` };
  }
  return { ok: true };
}

/**
 * @param {unknown} statusBody
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertDualGateCabinetSatisfied(statusBody) {
  const witness = assertWitnessEdgeSatisfied(statusBody);
  if (!witness.ok) return witness;
  const unlock = assertUnlockEdgeSatisfied(statusBody);
  if (!unlock.ok) return unlock;
  return { ok: true };
}

/**
 * Local dev belt — unlock edge may already be satisfied from prior game progress.
 * @param {unknown} statusBody
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertUnlockEdgePresent(statusBody) {
  const rel = statusBody?.scan?.relationships;
  if (!Array.isArray(rel)) {
    return { ok: false, message: "scan.relationships missing" };
  }
  const row = rel.find((entry) => entry.edge_id === CR_UNLOCK_EDGE_ID);
  if (!row) {
    return {
      ok: false,
      message: `${CR_UNLOCK_EDGE_ID} not in relationships[] — run npm run city-game:seed-relationship-edges`,
    };
  }
  if (row.kind !== "unlocks") {
    return { ok: false, message: `expected kind unlocks, got ${row.kind}` };
  }
  return { ok: true };
}

/**
 * @param {unknown} statusBody
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertDualGateCabinetStatus(statusBody) {
  const rel = statusBody?.scan?.relationships;
  if (!Array.isArray(rel) || rel.length < 2) {
    return {
      ok: false,
      message: `expected ≥2 relationships[], got ${rel?.length ?? 0}`,
    };
  }
  const witness = assertWitnessEdgePending(statusBody);
  if (!witness.ok) return witness;
  const unlock = assertUnlockEdgePending(statusBody);
  if (!unlock.ok) return unlock;
  return { ok: true };
}

/**
 * Local belt — witness pending + unlock edge wired (satisfied may be true).
 * @param {unknown} statusBody
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertDualGateCabinetStatusLocal(statusBody) {
  const rel = statusBody?.scan?.relationships;
  if (!Array.isArray(rel) || rel.length < 2) {
    return {
      ok: false,
      message: `expected ≥2 relationships[], got ${rel?.length ?? 0}`,
    };
  }
  const witness = assertWitnessEdgePending(statusBody);
  if (!witness.ok) return witness;
  const unlock = assertUnlockEdgePresent(statusBody);
  if (!unlock.ok) return unlock;
  return { ok: true };
}

/**
 * @param {string} html
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertWitnessGraphHtml(html) {
  if (!html.includes('id="scan-object-graph-heading"')) {
    return { ok: false, message: "graph heading missing" };
  }
  if (!html.includes("How this place connects")) {
    return { ok: false, message: "graph heading copy missing" };
  }
  if (!html.includes("Missing")) {
    return { ok: false, message: "Missing status missing" };
  }
  if (!html.includes(CR_WITNESS_EDGE_LABEL)) {
    return { ok: false, message: "witness edge label missing" };
  }
  if (!html.includes("Not yet open — visit")) {
    return { ok: false, message: "hero pending note missing" };
  }
  return { ok: true };
}

/**
 * @param {string} html
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertDualGateCabinetHtml(html) {
  const witness = assertWitnessGraphHtml(html);
  if (!witness.ok) return witness;
  if (!html.includes(CR_UNLOCK_EDGE_LABEL)) {
    return { ok: false, message: "unlock edge label missing" };
  }
  if (!html.includes("Before you can open this")) {
    return { ok: false, message: "required_by group missing" };
  }
  const rowCount = (html.match(/class="scan-object-graph-row/g) ?? []).length;
  if (rowCount < 2) {
    return { ok: false, message: `expected ≥2 graph rows, got ${rowCount}` };
  }
  if (html.includes("Vouch pending from node_10")) {
    return { ok: false, message: "legacy vouch chip still visible" };
  }
  if (html.includes("Unlocked by node_04")) {
    return { ok: false, message: "legacy unlock chip still visible" };
  }
  return { ok: true };
}

/**
 * D3 — both signed edges satisfied on cabinet scan.
 * @param {string} html
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertDualGateCabinetHtmlOpen(html) {
  if (!html.includes('id="scan-object-graph-heading"')) {
    return { ok: false, message: "graph heading missing" };
  }
  const liveCount = (html.match(/>\s*Live\s*</g) ?? []).length;
  if (liveCount < 2) {
    return { ok: false, message: `expected ≥2 Live graph rows, got ${liveCount}` };
  }
  if (html.includes("Not yet open — visit")) {
    return { ok: false, message: "hero still shows pending visit note" };
  }
  if (html.includes("Vouch pending from node_10")) {
    return { ok: false, message: "legacy vouch chip visible after dual-gate open" };
  }
  if (html.includes("Unlocked by node_04")) {
    return { ok: false, message: "legacy unlock chip visible after dual-gate open" };
  }
  return { ok: true };
}

/**
 * @param {unknown} statusBody
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertLegacyVouchFallback(statusBody, html) {
  const rel = statusBody?.scan?.relationships;
  if (Array.isArray(rel) && rel.length > 0) {
    return { ok: false, message: "relationships[] should be empty after revoke" };
  }
  if (html.includes('id="scan-object-graph-heading"')) {
    return { ok: false, message: "graph block should be hidden after revoke" };
  }
  if (!html.includes("Vouch pending from node_10")) {
    return { ok: false, message: "legacy vouch chip missing" };
  }
  return { ok: true };
}

/**
 * @param {unknown} statusBody
 * @param {string} edgeId
 * @returns {boolean}
 */
export function statusHasActiveEdge(statusBody, edgeId) {
  return (
    Array.isArray(statusBody?.scan?.relationships) &&
    statusBody.scan.relationships.some((row) => row.edge_id === edgeId)
  );
}

/**
 * @param {string} apiOrigin
 * @param {string} profileId
 * @param {string} qrId
 */
export function cabinetScanUrl(apiOrigin, profileId, qrId) {
  const base = apiOrigin.replace(/\/$/, "");
  return `${base}/c/${profileId}?q=${qrId}`;
}

/**
 * @param {string} apiOrigin
 * @param {string} profileId
 * @param {string} qrId
 */
export function cabinetStatusUrl(apiOrigin, profileId, qrId) {
  const base = apiOrigin.replace(/\/$/, "");
  return `${base}/.well-known/hc/v1/cards/${profileId}/status?q=${qrId}`;
}

/**
 * @param {{
 *   apiOrigin?: string;
 *   profileId: string;
 *   cabinetQr: string;
 *   libraryQr?: string | null;
 *   riverQr?: string | null;
 * }} input
 */
export function resolveCabinetSmokeUrls(input) {
  const apiOrigin = (input.apiOrigin || "https://humanity.llc").replace(/\/$/, "");
  const profileId = input.profileId;
  const cabinetQr = input.cabinetQr;
  return {
    apiOrigin,
    profileId,
    cabinetQr,
    cabinetScan: cabinetScanUrl(apiOrigin, profileId, cabinetQr),
    cabinetStatus: cabinetStatusUrl(apiOrigin, profileId, cabinetQr),
    libraryScan: input.libraryQr
      ? cabinetScanUrl(apiOrigin, profileId, input.libraryQr)
      : null,
    riverScan: input.riverQr
      ? cabinetScanUrl(apiOrigin, profileId, input.riverQr)
      : null,
  };
}

/**
 * @param {Record<string, unknown>} seed
 * @param {string} [apiOriginOverride]
 */
export function resolveLocalCabinetSmokeUrls(seed, apiOriginOverride) {
  const nodes = Array.isArray(seed.nodes) ? seed.nodes : [];
  /** @param {string} nodeId */
  const node = (nodeId) => nodes.find((row) => row.node_id === nodeId);
  const cabinet = node("node_07");
  const library = node("node_10");
  const river = node("node_04");
  if (!seed.profile_id || !cabinet?.qr_id) {
    throw new Error("city-game-seed.json missing profile_id or node_07 qr_id");
  }
  return {
    ...resolveCabinetSmokeUrls({
      apiOrigin: apiOriginOverride || String(seed.api_origin || "http://127.0.0.1:8787"),
      profileId: String(seed.profile_id),
      cabinetQr: String(cabinet.qr_id),
      libraryQr: library?.qr_id ? String(library.qr_id) : null,
      riverQr: river?.qr_id ? String(river.qr_id) : null,
    }),
    siteCodes: {
      witness: library?.site_code ? String(library.site_code) : null,
      quorum: river?.site_code ? String(river.site_code) : null,
    },
    labels: {
      cabinet: cabinet.public_label ? String(cabinet.public_label) : "Czech Village cabinet",
      library: library?.public_label ? String(library.public_label) : "Library witness seal",
      river: river?.public_label ? String(river.public_label) : "Riverwalk River Lantern",
    },
  };
}

/**
 * @param {string} [apiOrigin]
 */
export function resolveProdCabinetSmokeUrls(apiOrigin) {
  return resolveCabinetSmokeUrls({
    apiOrigin: apiOrigin || "https://humanity.llc",
    profileId: PROD_PROFILE_ID,
    cabinetQr: PROD_CABINET_QR,
    libraryQr: PROD_LIBRARY_QR,
    riverQr: PROD_RIVER_QR,
  });
}

/**
 * @param {unknown} statusBody
 * @param {string} html
 * @returns {Array<{ step: string; ok: boolean; detail: string }>}
 */
export function evaluateCabinetGraphSmoke(statusBody, html) {
  const rows = [
    { step: "witness edge pending", result: assertWitnessEdgePending(statusBody) },
    { step: "unlock edge pending", result: assertUnlockEdgePending(statusBody) },
    { step: "dual-gate status JSON", result: assertDualGateCabinetStatus(statusBody) },
    { step: "witness graph HTML", result: assertWitnessGraphHtml(html) },
    { step: "dual-gate cabinet HTML", result: assertDualGateCabinetHtml(html) },
  ];
  return rows.map(({ step, result }) => ({
    step,
    ok: result.ok,
    detail: result.ok ? "pass" : result.message,
  }));
}

/**
 * @param {unknown} statusBody
 * @param {string} html
 * @returns {Array<{ step: string; ok: boolean; detail: string }>}
 */
export function evaluateCabinetGraphSmokeLocal(statusBody, html) {
  const rows = [
    { step: "witness edge pending", result: assertWitnessEdgePending(statusBody) },
    { step: "unlock edge present", result: assertUnlockEdgePresent(statusBody) },
    { step: "dual-gate status JSON", result: assertDualGateCabinetStatusLocal(statusBody) },
    { step: "witness graph HTML", result: assertWitnessGraphHtml(html) },
    { step: "dual-gate cabinet HTML", result: assertDualGateCabinetHtml(html) },
  ];
  return rows.map(({ step, result }) => ({
    step,
    ok: result.ok,
    detail: result.ok ? "pass" : result.message,
  }));
}

/**
 * @param {unknown} statusBody
 * @param {string} html
 * @returns {Array<{ step: string; ok: boolean; detail: string }>}
 */
export function evaluateDualGateSpineOpen(statusBody, html) {
  const rows = [
    { step: "D3 witness edge satisfied", result: assertWitnessEdgeSatisfied(statusBody) },
    { step: "D3 unlock edge satisfied", result: assertUnlockEdgeSatisfied(statusBody) },
    { step: "D3 dual-gate status JSON", result: assertDualGateCabinetSatisfied(statusBody) },
    { step: "D3 dual-gate cabinet HTML", result: assertDualGateCabinetHtmlOpen(html) },
  ];
  return rows.map(({ step, result }) => ({
    step,
    ok: result.ok,
    detail: result.ok ? "pass" : result.message,
  }));
}
