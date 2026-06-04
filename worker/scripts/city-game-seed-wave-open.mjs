#!/usr/bin/env node
/**
 * WS-SCALE SC-2 — mint wave-open nodes (node_16–node_40) into existing local seed.
 *
 * Prerequisites: prior spine seed (node_01–15) in worker/.local/city-game-seed.json
 *   npm run worker:dev  (CITY_GAME_ENABLED=1)
 *
 * Usage:
 *   API_ORIGIN=http://127.0.0.1:8787 npm run city-game:seed-wave-open
 *   npm run city-game:seed-wave-open -- --lan 192.168.1.42
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { base58 } from "@scure/base";

import { buildAllGameNodeTemplates } from "./city-game-node-defaults.mjs";
import {
  attachSiteCodesToSeedNodes,
  buildSeedSiteCodeRows,
  missingSeedSiteCodeWarnings,
} from "./city-game-seed-site-codes-core.mjs";
import {
  randomBase58,
  signDocument,
  withProtocolFields,
} from "./seed-showcase-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const siteCodesPath = join(root, "worker/.local/city-game-site-codes.json");

const WAVE_OPEN_MIN = 16;

const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:8787").replace(/\/$/, "");
const scanOrigin = (
  process.env.SCAN_ORIGIN ||
  (isLocalOrigin(apiOrigin) ? "https://humanity.llc" : apiOrigin)
).replace(/\/$/, "");

function isLocalOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function detectLanHost() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return null;
}

function resolveLanHost() {
  const lanIdx = process.argv.indexOf("--lan");
  if (lanIdx !== -1) {
    const next = process.argv[lanIdx + 1]?.trim();
    if (next && !next.startsWith("-")) return next;
  }
  if (process.env.LAN_HOST?.trim()) return process.env.LAN_HOST.trim();
  if (process.argv.includes("--lan")) return detectLanHost();
  return null;
}

const lanHost = resolveLanHost();
const localScanOrigin = lanHost
  ? `http://${lanHost.replace(/^\[/, "").replace(/\]$/, "")}:8787`
  : apiOrigin;

function apiHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (isLocalOrigin(apiOrigin)) headers.Origin = apiOrigin;
  return headers;
}

async function postJson(path, body) {
  const res = await fetch(`${apiOrigin}${path}`, {
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

function localDevScanUrl(profileId, qrId) {
  if (!isLocalOrigin(apiOrigin) && !lanHost) return null;
  return `${localScanOrigin}/c/${profileId}?q=${qrId}`;
}

function waveNodeNum(nodeId) {
  const m = /^node_(\d+)$/.exec(nodeId);
  return m ? Number(m[1]) : 0;
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

async function main() {
  console.log("Cedar Rapids — seed wave-open (node_16+)");
  console.log("API:", apiOrigin);

  if (!existsSync(seedPath)) {
    console.error("\nMissing", seedPath);
    console.error("Run spine seed first: npm run city-game:seed-local -- --write-season");
    process.exit(1);
  }

  const health = await fetch(`${apiOrigin}/.well-known/hc/v1/health`).catch(() => null);
  if (!health?.ok) {
    console.error("\nResolver not reachable. Start: npm run worker:dev");
    process.exit(1);
  }

  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const profileId = seed.profile_id?.trim();
  const privB58 = seed.owner_private_key_b58?.trim();
  const pub = seed.owner_public_key?.trim();
  if (!profileId || !privB58 || !pub) {
    console.error("Seed missing profile_id / owner keys");
    process.exit(1);
  }

  const owner = {
    privateKey: base58.decode(privB58),
    publicKeyBase58: pub,
  };

  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const existingIds = new Set((seed.nodes ?? []).map((n) => n.node_id));
  const templates = buildAllGameNodeTemplates(season.nodes, season.season_id).filter(
    (t) => waveNodeNum(t.node_id) >= WAVE_OPEN_MIN && !existingIds.has(t.node_id)
  );

  if (templates.length === 0) {
    console.log("\n☑ No pending wave nodes — seed already has", existingIds.size, "rows.");
    return;
  }

  console.log("\nMinting %d wave-open objects (profile %s)…", templates.length, profileId);
  const now = new Date().toISOString();
  /** @type {typeof seed.nodes} */
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
          "\nLocal node cap — add CITY_GAME_LOCAL_NODE_CAP=60 to worker/.dev.vars and restart worker:dev:"
        );
        console.error("  npm run city-game:local-env");
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
    const localUrl = localDevScanUrl(profileId, issueRes.body.qr_id || qrId);
    newRows.push({
      node_id: template.node_id,
      object_id: template.object_id,
      public_label: template.public_label,
      qr_id: issueRes.body.qr_id || qrId,
      scan_url: url,
      ...(localUrl ? { local_scan_url: localUrl } : {}),
    });
    console.log("  ✓ %s", template.node_id);
  }

  const mergedNodes = [...(seed.nodes ?? []), ...newRows].sort(
    (a, b) => waveNodeNum(a.node_id) - waveNodeNum(b.node_id)
  );
  const seasonForCodes = season;
  const nodesWithSiteCodes = attachSiteCodesToSeedNodes(seasonForCodes, mergedNodes);
  const siteCodeRows = buildSeedSiteCodeRows(seasonForCodes, nodesWithSiteCodes);
  for (const warning of missingSeedSiteCodeWarnings(siteCodeRows)) {
    console.warn("  ⚠ site code:", warning);
  }

  const payload = {
    ...seed,
    nodes: nodesWithSiteCodes,
    contribute_site_codes: siteCodeRows,
    wave_open_minted_at: now,
  };
  writeFileSync(seedPath, `${JSON.stringify(payload, null, 2)}\n`);
  writeFileSync(
    siteCodesPath,
    `${JSON.stringify(
      {
        season_id: season.season_id,
        profile_id: profileId,
        generated_at: now,
        note: "Sticker site codes — wave-open append",
        codes: siteCodeRows,
      },
      null,
      2
    )}\n`
  );

  console.log("\nWrote %s — %d nodes total", seedPath, mergedNodes.length);
  console.log("Next:");
  console.log("  npm run city-game:install-map-sign-off -- --mark-qr-issued --apply");
  console.log("  npm run city-game:scale-sc2");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
