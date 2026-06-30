/**
 * Agent D — game scan onboarding shell contract (PD-5 scan handoff).
 * @see worker/scripts/capture-game-scan-onboarding.ts
 */

import { PUBLIC_NETWORK_RULES_PROVE_CTA } from "./public-networks-portal-core.mjs";

export const PLAYER_FLOW_SCAN_ONBOARDING_AFTER_OPEN_REL =
  "site/dev/city-game-scan-onboarding/after-season-open.html";

export const PLAYER_FLOW_SCAN_ONBOARDING_REQUIRED = [
  "scan-game-onboarding",
  "Open board",
  PUBLIC_NETWORK_RULES_PROVE_CTA,
  "#rules-prove-title",
  "/play/cedar-rapids/map/?node=node_01",
];

export const PLAYER_FLOW_SCAN_ONBOARDING_FORBIDDEN = [
  "Open city board",
  "Season rules",
  "About this network",
];

/**
 * @param {string} html
 */
export function auditPlayerFlowScanOnboardingHtml(html) {
  const issues = [];
  for (const snippet of PLAYER_FLOW_SCAN_ONBOARDING_REQUIRED) {
    if (!html.includes(snippet)) {
      issues.push(`missing required: ${snippet}`);
    }
  }
  for (const snippet of PLAYER_FLOW_SCAN_ONBOARDING_FORBIDDEN) {
    if (html.includes(snippet)) {
      issues.push(`contains forbidden: ${snippet}`);
    }
  }
  return { ok: issues.length === 0, issues };
}
