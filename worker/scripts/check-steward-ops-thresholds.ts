/**
 * E6.2 daily ops check — fetch steward-ops snapshot and exit non-zero on alerts.
 *
 * Usage:
 *   OPERATOR_AUDIT_TOKEN=... API_ORIGIN=http://127.0.0.1:8787 npm run worker:check-steward-ops
 */
import {
  evaluateStewardOpsThresholds,
  stewardOpsAlertsHaveCritical,
  type StewardOpsSnapshotLike,
} from "../src/steward/ops-thresholds";
import { assertAsciiBearerToken } from "../scripts/hosted-rollout-token.mjs";

const origin = (process.env.API_ORIGIN ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const rawToken = process.env.OPERATOR_AUDIT_TOKEN?.trim();
const day = process.env.STEWARD_OPS_DAY?.trim();

async function main() {
  if (!rawToken) {
    console.error("OPERATOR_AUDIT_TOKEN is required.");
    process.exit(2);
  }
  let token: string;
  try {
    assertAsciiBearerToken(rawToken);
    token = rawToken;
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(2);
  }

  const url = new URL(`${origin}/.well-known/hc/v1/operator/steward-ops`);
  if (day) url.searchParams.set("day", day);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`steward-ops request failed (${res.status}): ${text}`);
    process.exit(2);
  }

  let snapshot: StewardOpsSnapshotLike;
  try {
    snapshot = JSON.parse(text) as StewardOpsSnapshotLike;
  } catch {
    console.error("steward-ops response was not JSON.");
    process.exit(2);
  }

  const alerts = evaluateStewardOpsThresholds(snapshot);
  if (alerts.length === 0) {
    console.log("steward-ops: no threshold alerts");
    process.exit(0);
  }

  for (const alert of alerts) {
    console.error(`[${alert.level}] ${alert.code}: ${alert.message}`);
  }

  process.exit(stewardOpsAlertsHaveCritical(alerts) ? 1 : 0);
}

void main();
