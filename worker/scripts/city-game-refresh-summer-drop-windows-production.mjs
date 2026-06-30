#!/usr/bin/env node
/**
 * WS-SCALE SC-3 ops — extend temp_drop visible_until to season window on production.
 *
 * node_04 defaults shipped with a pilot 48h window; summer open needs season-end.
 *
 *   npm run city-game:refresh-summer-drop-windows-production -- --dry-run
 *   npm run city-game:refresh-summer-drop-windows-production -- --confirm-production
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { base58 } from "@scure/base";

import { SEASON_OBJECT_IDS } from "./city-game-node-defaults.mjs";
import {
  signDocument,
  withProtocolFields,
} from "./seed-showcase-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const seedPath = join(root, "worker/.local/city-game-production-seed.json");
const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");

const TEMP_DROP_OBJECT_IDS = [SEASON_OBJECT_IDS.node_04];

const dryRun = process.argv.includes("--dry-run");
const confirm = process.argv.includes("--confirm-production");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function mergeGameMeta(current, patch) {
  return {
    ...(current?.game_meta && typeof current.game_meta === "object" ? current.game_meta : {}),
    ...(patch.game_meta ?? {}),
  };
}

async function main() {
  if (!dryRun && !confirm) {
    fail(
      "Specify --dry-run or --confirm-production.\n" +
        "  npm run city-game:refresh-summer-drop-windows-production -- --dry-run"
    );
  }

  if (!existsSync(seedPath)) {
    fail(`Missing ${seedPath}`);
  }

  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const visibleUntil = season?.window?.ends_at;
  if (!visibleUntil) {
    fail("Season JSON missing window.ends_at");
  }

  const profileId = seed.profile_id;
  const operator = {
    privateKey: base58.decode(String(seed.game_operator_private_key_b58).trim()),
    publicKeyBase58: String(seed.game_operator_public_key).trim(),
  };

  console.log("WS-SCALE — refresh temp_drop windows");
  console.log("  API:", apiOrigin);
  console.log("  Profile:", profileId);
  console.log("  visible_until →", visibleUntil);
  console.log("  Objects:", TEMP_DROP_OBJECT_IDS.join(", "));

  if (dryRun) {
    console.log("\nDry run only — pass --confirm-production to apply.");
    return;
  }

  const listRes = await fetch(
    `${apiOrigin}/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/objects`
  );
  const list = await listRes.json();
  if (!listRes.ok) {
    fail(list.message || list.error || "Could not list objects");
  }
  const byId = new Map(list.objects.map((o) => [o.object_id, o]));

  for (const objectId of TEMP_DROP_OBJECT_IDS) {
    const current = byId.get(objectId);
    if (!current) {
      fail(`Missing ${objectId} on production profile`);
    }
    const now = new Date().toISOString();
    const unsigned = withProtocolFields(
      {
        object_id: current.object_id,
        parent_profile_id: profileId,
        object_type: current.object_type,
        public_label: current.public_label,
        public_state: current.public_state,
        status: "active",
        season_id: current.season_id,
        node_role: current.node_role,
        district: current.district,
        object_streams: current.object_streams,
        game_meta: mergeGameMeta(current, {
          game_meta: { visible_until: visibleUntil },
        }),
        created_at: current.created_at,
        updated_at: now,
      },
      "child_object"
    );
    const signed = await signDocument(
      unsigned,
      operator.privateKey,
      operator.publicKeyBase58
    );
    const url = `${apiOrigin}/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/objects/${encodeURIComponent(objectId)}/game-update`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ object: signed }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      fail(data.message || data.error || `game-update failed (${res.status}) for ${objectId}`);
    }
    console.log("✓", objectId);
  }

  console.log("\nNext: npm run city-game:smoke-production -- --all");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
