/**
 * Prod dual-gate walk preflight — human D1–D3 readiness + Pages deploy gate.
 * @see docs/WS_OBJECT_GRAPH_DUAL_GATE_WALK_V1.md
 */

import {
  evaluateCabinetGraphSmoke,
  evaluateDualGateSpineOpen,
  resolveProdCabinetSmokeUrls,
} from "./ws-object-graph-prod-smoke-core.mjs";
import {
  comprehensionDualGateWalkProductionUrl,
  validateDualGateWalkKitHtml,
} from "./ws-object-graph-dual-gate-walk-core.mjs";
import { hasContributeBlockInScanHtml } from "./city-game-smoke-contribute-core.mjs";

/**
 * @param {{
 *   comprehensionStatus: number;
 *   comprehensionHtml: string;
 *   walkStatus: number;
 *   walkHtml: string;
 *   walkUrl: string;
 * }} input
 */
export function assessProdDualGatePagesDeploy(input) {
  /** @type {string[]} */
  const issues = [];
  /** @type {string[]} */
  const warnings = [];

  if (input.comprehensionStatus !== 200) {
    issues.push(`comprehension index HTTP ${input.comprehensionStatus}`);
  } else if (!input.comprehensionHtml.includes("dual-gate-walk.html")) {
    issues.push("comprehension index missing dual-gate walk link — deploy Pages");
  }

  if (input.walkStatus === 404) {
    issues.push(
      `dual-gate walk 404 at ${input.walkUrl} — npm run city-game:comprehension-kit -- --production && npm run pages:deploy`
    );
  } else if (input.walkStatus !== 200) {
    issues.push(`dual-gate walk HTTP ${input.walkStatus}`);
  } else {
    const audit = validateDualGateWalkKitHtml(input.walkHtml, input.walkUrl);
    if (!audit.ok) {
      issues.push(...audit.issues);
    }
  }

  const pagesLive =
    input.comprehensionStatus === 200 &&
    input.comprehensionHtml.includes("dual-gate-walk.html") &&
    input.walkStatus === 200 &&
    validateDualGateWalkKitHtml(input.walkHtml, input.walkUrl).ok;

  if (!pagesLive && input.walkStatus === 404) {
    warnings.push("On-disk walk kit may be ready — prod Pages not deployed yet");
  }

  return { pagesLive, issues, warnings };
}

/**
 * @param {{
 *   cabinetStatusOk: boolean;
 *   cabinetGraphRows: Array<{ step: string; ok: boolean; detail: string }>;
 *   libraryStatus: number;
 *   libraryHasContribute: boolean;
 *   riverStatus: number;
 *   riverHasContribute: boolean;
 * }} input
 */
export function assessProdDualGateScanReadiness(input) {
  /** @type {string[]} */
  const issues = [];

  if (!input.cabinetStatusOk) {
    issues.push("cabinet status fetch failed");
  }
  for (const row of input.cabinetGraphRows) {
    if (!row.ok) {
      issues.push(`D0 ${row.step}: ${row.detail}`);
    }
  }
  if (input.libraryStatus !== 200) {
    issues.push(`library scan HTTP ${input.libraryStatus}`);
  } else if (!input.libraryHasContribute) {
    issues.push("library scan missing contribute block (D1)");
  }
  if (input.riverStatus !== 200) {
    issues.push(`river scan HTTP ${input.riverStatus}`);
  } else if (!input.riverHasContribute) {
    issues.push("river scan missing contribute block (D2)");
  }

  return { scansReady: issues.length === 0, issues };
}

/**
 * Post-walk prod scan gate — D3 cabinet open; library/river scans load (contribute optional).
 *
 * @param {{
 *   cabinetStatusOk: boolean;
 *   cabinetGraphRows: Array<{ step: string; ok: boolean; detail: string }>;
 *   libraryStatus: number;
 *   riverStatus: number;
 * }} input
 */
export function assessProdDualGateScanReadinessPostWalk(input) {
  /** @type {string[]} */
  const issues = [];

  if (!input.cabinetStatusOk) {
    issues.push("cabinet status fetch failed");
  }
  for (const row of input.cabinetGraphRows) {
    if (!row.ok) {
      issues.push(`${row.step}: ${row.detail}`);
    }
  }
  if (input.libraryStatus !== 200) {
    issues.push(`library scan HTTP ${input.libraryStatus}`);
  }
  if (input.riverStatus !== 200) {
    issues.push(`river scan HTTP ${input.riverStatus}`);
  }

  return { scansReady: issues.length === 0, issues };
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} [apiOrigin]
 */
export function resolveProdDualGateWalkPreflightUrls(season, apiOrigin) {
  const urls = resolveProdCabinetSmokeUrls(apiOrigin);
  const walkUrl = comprehensionDualGateWalkProductionUrl(season, urls.apiOrigin);
  const slug = String(season.rules_path ?? "/play/cedar-rapids/").replace(/\/$/, "");
  const comprehensionUrl = `${urls.apiOrigin}${slug}/comprehension/`;
  return { ...urls, walkUrl, comprehensionUrl };
}

/**
 * @param {{
 *   season: Record<string, unknown>;
 *   localWalkHtml: string;
 *   localWalkRel: string;
 *   fetchResults: {
 *     cabinetStatus: { ok: boolean; body: unknown };
 *     cabinetHtml: { ok: boolean; html: string };
 *     libraryHtml: { ok: boolean; status: number; html: string };
 *     riverHtml: { ok: boolean; status: number; html: string };
 *     comprehension: { status: number; html: string };
 *     walk: { status: number; html: string };
 *   };
 *   postWalk?: boolean;
 * }} input
 */
export function evaluateProdDualGateWalkPreflight(input) {
  const postWalk = input.postWalk === true;
  const urls = resolveProdDualGateWalkPreflightUrls(input.season);
  const localAudit = validateDualGateWalkKitHtml(input.localWalkHtml, input.localWalkRel);
  const cabinetGraphRows = input.fetchResults.cabinetStatus.ok
    ? postWalk
      ? evaluateDualGateSpineOpen(
          input.fetchResults.cabinetStatus.body,
          input.fetchResults.cabinetHtml.html
        )
      : evaluateCabinetGraphSmoke(
          input.fetchResults.cabinetStatus.body,
          input.fetchResults.cabinetHtml.html
        )
    : [
        {
          step: postWalk ? "D3 cabinet graph" : "cabinet graph",
          ok: false,
          detail: "status unavailable",
        },
      ];

  const scans = postWalk
    ? assessProdDualGateScanReadinessPostWalk({
        cabinetStatusOk: input.fetchResults.cabinetStatus.ok,
        cabinetGraphRows,
        libraryStatus: input.fetchResults.libraryHtml.status,
        riverStatus: input.fetchResults.riverHtml.status,
      })
    : assessProdDualGateScanReadiness({
        cabinetStatusOk: input.fetchResults.cabinetStatus.ok,
        cabinetGraphRows,
        libraryStatus: input.fetchResults.libraryHtml.status,
        libraryHasContribute: hasContributeBlockInScanHtml(
          input.fetchResults.libraryHtml.html
        ),
        riverStatus: input.fetchResults.riverHtml.status,
        riverHasContribute: hasContributeBlockInScanHtml(input.fetchResults.riverHtml.html),
      });

  const pages = assessProdDualGatePagesDeploy({
    comprehensionStatus: input.fetchResults.comprehension.status,
    comprehensionHtml: input.fetchResults.comprehension.html,
    walkStatus: input.fetchResults.walk.status,
    walkHtml: input.fetchResults.walk.html,
    walkUrl: urls.walkUrl,
  });

  /** @type {string[]} */
  const issues = [];
  if (!localAudit.ok) {
    issues.push(...localAudit.issues);
  }
  issues.push(...scans.issues);
  issues.push(...pages.issues);

  const readyForHumanWalk = scans.scansReady && pages.pagesLive && localAudit.ok;
  const readyPostWalk = postWalk && readyForHumanWalk;

  return {
    readyForHumanWalk,
    readyPostWalk,
    postWalk,
    scansReady: scans.scansReady,
    pagesLive: pages.pagesLive,
    localWalkOk: localAudit.ok,
    urls,
    cabinetGraphRows,
    issues,
    warnings: pages.warnings,
  };
}
