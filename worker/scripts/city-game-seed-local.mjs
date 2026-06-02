#!/usr/bin/env node
/**
 * Local Cedar Rapids season bootstrap — season root card + 15 game_node objects + QRs.
 *
 * Prerequisites:
 *   npm run worker:migrate:local
 *   CITY_GAME_ENABLED=1 in worker/.dev.vars (local only)
 *   npm run worker:dev  →  http://127.0.0.1:8787
 *
 * Usage:
 *   API_ORIGIN=http://127.0.0.1:8787 npm run city-game:seed-local
 *   API_ORIGIN=http://127.0.0.1:8787 npm run city-game:seed-local -- --write-season
 *
 * Writes operator keys + scan URLs to worker/.local/city-game-seed.json (gitignored).
 * Never commit that file.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildAllGameNodeTemplates,
} from "./city-game-node-defaults.mjs";
import {
  createShowcaseWithHandleRetry,
  newShowcaseKeypair,
  randomBase58,
  signDocument,
  withProtocolFields,
} from "./seed-showcase-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const outPath = join(root, "worker/.local/city-game-seed.json");

const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:8787").replace(/\/$/, "");
const scanOrigin = (
  process.env.SCAN_ORIGIN ||
  (isLocalOrigin(apiOrigin) ? "https://humanity.llc" : apiOrigin)
).replace(/\/$/, "");
const devVarsPath = join(root, "worker/.dev.vars");

function localCityGameEnabled() {
  if (process.env.CITY_GAME_ENABLED === "1") return true;
  if (!existsSync(devVarsPath)) return false;
  const text = readFileSync(devVarsPath, "utf8");
  return /^\s*CITY_GAME_ENABLED\s*=\s*1\s*$/m.test(text);
}

const writeSeason = process.argv.includes("--write-season");

function isLocalOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function apiHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (isLocalOrigin(apiOrigin)) {
    headers.Origin = apiOrigin;
  }
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
  if (!isLocalOrigin(apiOrigin)) return null;
  return `${apiOrigin}/c/${profileId}?q=${qrId}`;
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
  const payload = scanUrl(profileId, qrId);
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
        payload,
      },
      "qr_credential"
    ),
    owner.privateKey,
    owner.publicKeyBase58
  );
}

async function main() {
  console.log("Cedar Rapids city game — local seed");
  console.log("API:", apiOrigin);
  if (scanOrigin !== apiOrigin) {
    console.log("Scan payloads:", scanOrigin, "(local browser testing:", apiOrigin + "/c/…)");
  }

  const health = await fetch(`${apiOrigin}/.well-known/hc/v1/health`).catch(() => null);
  if (!health?.ok) {
    console.error("\nResolver not reachable. Start local worker first:");
    console.error("  npm run worker:migrate:local");
    console.error("  npm run worker:dev");
    process.exit(1);
  }
  const healthBody = await health.json().catch(() => ({}));
  if (healthBody.database === "schema_missing") {
    console.error("\nD1 schema missing. Run: npm run worker:migrate:local");
    process.exit(1);
  }

  if (!localCityGameEnabled() && !process.argv.includes("--skip-flag-check")) {
    console.warn(
      "\n⚠ Set CITY_GAME_ENABLED=1 in worker/.dev.vars (local only) so scan pages render the game template."
    );
    console.warn("  See docs/CITY_GAME_LOCAL_DEV.md · re-run with --skip-flag-check to ignore.\n");
  }

  const seasonRaw = readFileSync(seasonPath, "utf8");
  const season = JSON.parse(seasonRaw);
  if (season.season_root_profile_id && !process.argv.includes("--force")) {
    console.error(
      `\nseason_root_profile_id already set (${season.season_root_profile_id}).`
    );
    console.error("Use --force to mint another local season, or clear the field first.");
    process.exit(1);
  }

  const owner = await newShowcaseKeypair();
  const operator = await newShowcaseKeypair();
  const profileId = randomBase58(24);
  const rootQrId = `qr_${randomBase58(16)}`;
  const now = new Date().toISOString();
  const manifesto = `${season.title} · Cedar Rapids Season 1\nOperator card — child game nodes only`;
  const rootScanUrl = scanUrl(profileId, rootQrId);
  const expiresAt = new Date(now);
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 2);

  console.log("\n=== Creating season root card ===");
  const { handle } = await createShowcaseWithHandleRetry({
    apiOrigin,
    handleBase: "cedar_rapids_wake_s01",
    buildPayload: async (handleName) => {
      const card = await signDocument(
        withProtocolFields(
          {
            profile_id: profileId,
            public_key: owner.publicKeyBase58,
            handle: handleName,
            manifesto_line: manifesto,
            issuer_public_key: operator.publicKeyBase58,
            created_at: now,
            updated_at: now,
            status: "active",
            verification: {
              level: 1,
              label: "Registered",
              method: "registered",
              verified_at: now,
              vouch_count: 0,
              latest_accepted_vouch_at: null,
            },
            badges: [],
            qr: { active_qr_id: rootQrId, epoch: 1 },
            links: { standards: "https://humanity.llc/standards/v1" },
          },
          "humanity_card"
        ),
        owner.privateKey,
        owner.publicKeyBase58
      );

      const qr = await signDocument(
        withProtocolFields(
          {
            qr_id: rootQrId,
            profile_id: profileId,
            nonce: `nonce_${randomBase58(12)}`,
            epoch: 1,
            scope: "card",
            resolver_hint: scanOrigin,
            issued_at: now,
            expires_at: expiresAt.toISOString(),
            status: "active",
            payload: rootScanUrl,
          },
          "qr_credential"
        ),
        owner.privateKey,
        owner.publicKeyBase58
      );

      return { card, qr_credential: qr };
    },
  });

  console.log("Season root @%s · profile_id %s", handle, profileId);
  console.log("Game-operator public:", operator.publicKeyBase58);

  const templates = buildAllGameNodeTemplates(season.nodes, season.season_id);
  const nodeRows = [];

  console.log("\n=== Minting %d game_node objects ===", templates.length);
  for (const template of templates) {
    const signedObject = await signGameNodeObject(owner, profileId, template, now);
    const createRes = await postJson(
      `/.well-known/hc/v1/cards/${profileId}/objects`,
      { object: signedObject }
    );
    if (!createRes.ok) {
      if (createRes.body?.error === "OBJECT_EXISTS") {
        console.error(`\nCreate failed for ${template.node_id}: object_id already in local D1.`);
        console.error("Stable object_ids (obj_cr_node_*) allow only one local season per database.");
        console.error("Options:");
        console.error("  • Reuse worker/.local/city-game-seed.json from the first seed + npm run city-game:smoke-local");
        console.error("  • Reset local D1: rm -rf worker/.wrangler/state/v3/d1 && npm run worker:migrate:local");
        process.exit(1);
      }
      console.error(`\nCreate failed for ${template.node_id}:`, createRes.body);
      process.exit(1);
    }

    const qrId = `qr_${randomBase58(16)}`;
    const qrCredential = await signChildObjectQr(
      owner,
      profileId,
      template.object_id,
      qrId,
      now
    );
    const issueRes = await postJson(
      `/.well-known/hc/v1/cards/${profileId}/objects/${template.object_id}/issue-qr`,
      { qr_credential: qrCredential }
    );
    if (!issueRes.ok) {
      const msg = JSON.stringify(issueRes.body);
      if (msg.includes("scope IN ('card', 'print_artifact')") || msg.includes("child_object")) {
        console.error(`\nIssue QR failed for ${template.node_id}: local D1 missing child_object QR schema.`);
        console.error("Run: npm run worker:apply-child-object-qr-schema");
        console.error("Then restart worker:dev and re-run seed.");
        process.exit(1);
      }
      console.error(`\nIssue QR failed for ${template.node_id}:`, issueRes.body);
      process.exit(1);
    }

    const url = issueRes.body.scan_url || scanUrl(profileId, qrId);
    const localUrl = localDevScanUrl(profileId, issueRes.body.qr_id || qrId);
    nodeRows.push({
      node_id: template.node_id,
      object_id: template.object_id,
      public_label: template.public_label,
      qr_id: issueRes.body.qr_id || qrId,
      scan_url: url,
      ...(localUrl ? { local_scan_url: localUrl } : {}),
    });
    console.log("  ✓ %s · %s", template.node_id, localUrl || url);
  }

  const { base58 } = await import("@scure/base");
  const payload = {
    season_id: season.season_id,
    profile_id: profileId,
    handle,
    created_at: now,
    api_origin: apiOrigin,
    season_root_scan_url: rootScanUrl,
    ...(localDevScanUrl(profileId, rootQrId)
      ? { season_root_local_scan_url: localDevScanUrl(profileId, rootQrId) }
      : {}),
    game_operator_public_key: operator.publicKeyBase58,
    game_operator_private_key_b58: base58.encode(operator.privateKey),
    owner_public_key: owner.publicKeyBase58,
    owner_private_key_b58: base58.encode(owner.privateKey),
    nodes: nodeRows,
    note: "Local dev seed only — never commit. Store keys offline before production season.",
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);

  if (writeSeason) {
    season.season_root_profile_id = profileId;
    writeFileSync(seasonPath, `${JSON.stringify(season, null, 2)}\n`);
    console.log("\nUpdated %s → season_root_profile_id", seasonPath);
  } else {
    console.log(
      "\nTo record profile_id in season JSON: npm run city-game:seed-local -- --write-season"
    );
    console.log("Or paste manually:", profileId);
  }

  console.log("\nWrote %s (gitignored — do not commit)", outPath);
  console.log("\nNext:");
  console.log("  1. Save owner + game-operator keys from worker/.local/city-game-seed.json offline");
  console.log("  2. Open /game-operator/ · paste game-operator private key · load nodes");
  console.log("  3. npm run city-game:smoke-local — spot-scan node_01, node_04, node_07");
  console.log("  4. docs/CITY_GAME_INSTALL_QA.md when stickers are ready");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
