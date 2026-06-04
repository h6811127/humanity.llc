#!/usr/bin/env node
/**
 * WS-SCALE SC-3 (production) — append node_16–node_40 to existing production seed.
 *
 * Prerequisites:
 *   - Spine production seed (node_01–15) in worker/.local/city-game-production-seed.json
 *   - Hosted game season entitlements on season root (node_cap ≥ 40)
 *
 * Usage:
 *   npm run city-game:seed-production-wave-open -- --dry-run
 *   npm run city-game:seed-production-wave-open -- --confirm-production
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { base58 } from "@scure/base";

import {
  planProductionWaveOpenMint,
  waveNodeNum,
} from "./city-game-production-wave-open-core.mjs";
import {
  attachSiteCodesToSeedNodes,
  buildSeedSiteCodeRows,
} from "./city-game-seed-site-codes-core.mjs";
import {
  randomBase58,
  signDocument,
  withProtocolFields,
} from "./seed-showcase-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const seedPath = join(root, "worker/.local/city-game-production-seed.json");
const siteCodesPath = join(root, "worker/.local/city-game-production-site-codes.json");

const prodApi = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
const scanOrigin = (process.env.SCAN_ORIGIN || prodApi).replace(/\/$/, "");
const dryRun = process.argv.includes("--dry-run");
const confirm = process.argv.includes("--confirm-production");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function apiHeaders() {
  return { "Content-Type": "application/json" };
}

async function postJson(path, body) {
  const res = await fetch(`${prodApi}${path}`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body: data };
}

function scanUrl(profileId, qrId) {
  return `${scanOrigin}/c/${profileId}?q=${qrId}`;
}

async function signGameNodeObject(owner, profileId, template, createdAt) {
  const unsigned = withProtocolFields(
    {
      object_id: template.object_id,
      parent_profile_id: profileId,
      object_type: "game_node",
      public_label: template.public_label,
      public_state: template.public_state,
      status: "active",
      season_id: template.season_id,
      node_role: template.node_role,
      district: template.district,
      object_streams: template.object_streams,
      game_meta: template.game_meta,
      created_at: createdAt,
      updated_at: createdAt,
    },
    "child_object"
  );
  return signDocument(unsigned, owner.privateKey, owner.publicKeyBase58);
}

async function signChildObjectQr(owner, profileId, objectId, qrId, issuedAt) {
  return signDocument(
    withProtocolFields(
      {
        qr_id: qrId,
        profile_id: profileId,
        object_id: objectId,
        nonce: `nonce_${randomBase58(12)}`,
        epoch: 1,
        scope: "child_object",
        resolver_hint: scanOrigin,
        issued_at: issuedAt,
        expires_at: null,
        status: "active",
        payload: scanUrl(profileId, qrId),
      },
      "qr_credential"
    ),
    owner.privateKey,
    owner.publicKeyBase58
  );
}

/**
 * @param {ReturnType<typeof planProductionWaveOpenMint>} plan
 */
async function printDryRunReport(plan) {
  const health = await fetch(`${prodApi}/.well-known/hc/v1/health`).catch(() => null);
  console.log("Cedar Rapids — production wave-open (dry run)");
  console.log("  API:", prodApi);
  console.log("  Profile:", plan.profileId || "(missing)");
  console.log("  Resolver:", health?.ok ? "reachable" : "unreachable");
  console.log(
    "  Seed:",
    plan.existingCount,
    "rows ·",
    plan.urlCount,
    "URLs · pending mint:",
    plan.pendingCount
  );
  for (const w of plan.warnings) console.warn("  warn:", w);
  for (const i of plan.issues) console.error("  fail:", i);
  if (plan.pendingCount) {
    console.log("\nWould mint:");
    for (const id of plan.pendingNodeIds) console.log("  ·", id);
  }
  console.log("\nTo apply:");
  console.log("  npm run city-game:seed-production-wave-open -- --confirm-production");
}

async function main() {
  if (!dryRun && !confirm) {
    fail(
      "Specify --dry-run (plan only) or --confirm-production (live mint on humanity.llc).\n" +
        "  npm run city-game:seed-production-wave-open -- --dry-run"
    );
  }

  if (!existsSync(seedPath)) {
    fail(`Missing ${seedPath}\nRun: npm run city-game:seed-production -- --confirm-production`);
  }

  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const plan = planProductionWaveOpenMint({ season, seed });

  if (dryRun) {
    await printDryRunReport(plan);
    process.exit(plan.issues.length ? 1 : plan.pendingCount ? 2 : 0);
  }

  const health = await fetch(`${prodApi}/.well-known/hc/v1/health`).catch(() => null);
  if (!health?.ok) {
    fail(`Production resolver unreachable at ${prodApi}`);
  }

  if (plan.issues.length) {
    for (const i of plan.issues) console.error(i);
    process.exit(1);
  }

  const profileId = plan.profileId;
  const owner = {
    privateKey: base58.decode(seed.owner_private_key_b58.trim()),
    publicKeyBase58: seed.owner_public_key.trim(),
  };
  const templates = plan.pendingTemplates;

  console.log("Cedar Rapids — production wave-open (node_16+)");
  console.log("API:", prodApi);
  console.log("Profile:", profileId);

  if (templates.length === 0) {
    console.log("\n☑ No pending wave nodes — production seed has", plan.existingCount, "rows.");
    return;
  }

  console.log("\nMinting %d wave-open objects…", templates.length);
  const now = new Date().toISOString();
  const newRows = [];

  for (const template of templates) {
    const signedObject = await signGameNodeObject(owner, profileId, template, now);
    const createRes = await postJson(
      `/.well-known/hc/v1/cards/${profileId}/objects`,
      { object: signedObject }
    );
    if (!createRes.ok) {
      if (createRes.body?.error === "OBJECT_EXISTS") {
        console.warn("  ⚠ %s already in D1 — skipping create", template.node_id);
      } else if (createRes.body?.error === "game_season_quota_exceeded") {
        console.error(`\nCreate failed for ${template.node_id}:`, createRes.body);
        console.error(
          "\nLink season root to hosted_game_season_v1 (or raise node_cap) before wave mint."
        );
        process.exit(1);
      } else {
        console.error(`\nCreate failed for ${template.node_id}:`, createRes.body);
        process.exit(1);
      }
    }

    const qrId = `qr_${randomBase58(16)}`;
    const qrCredential = await signChildObjectQr(owner, profileId, template.object_id, qrId, now);
    const issueRes = await postJson(
      `/.well-known/hc/v1/cards/${profileId}/objects/${template.object_id}/issue-qr`,
      { qr_credential: qrCredential }
    );
    if (!issueRes.ok) {
      console.error(`\nIssue QR failed for ${template.node_id}:`, issueRes.body);
      process.exit(1);
    }

    const url = issueRes.body.scan_url || scanUrl(profileId, qrId);
    newRows.push({
      node_id: template.node_id,
      object_id: template.object_id,
      public_label: template.public_label,
      qr_id: issueRes.body.qr_id || qrId,
      scan_url: url,
    });
    console.log("  ✓ %s", template.node_id);
  }

  const mergedNodes = [...(seed.nodes ?? []), ...newRows].sort(
    (a, b) => waveNodeNum(a.node_id) - waveNodeNum(b.node_id)
  );
  const nodesWithSiteCodes = attachSiteCodesToSeedNodes(season, mergedNodes);
  const siteCodeRows = buildSeedSiteCodeRows(season, nodesWithSiteCodes);

  writeFileSync(
    seedPath,
    `${JSON.stringify(
      {
        ...seed,
        nodes: nodesWithSiteCodes,
        contribute_site_codes: siteCodeRows,
        wave_open_minted_at: now,
      },
      null,
      2
    )}\n`
  );
  writeFileSync(
    siteCodesPath,
    `${JSON.stringify(
      {
        season_id: season.season_id,
        profile_id: profileId,
        generated_at: now,
        note: "Production sticker site codes — wave-open append",
        codes: siteCodeRows,
      },
      null,
      2
    )}\n`
  );

  console.log("\nWrote %s — %d nodes total", seedPath, mergedNodes.length);
  console.log("Next:");
  console.log("  npm run city-game:scale-sc3");
  console.log("  npm run city-game:smoke-production");
  console.log("  npm run city-game:smoke-production -- --all");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
