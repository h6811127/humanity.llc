#!/usr/bin/env node
/** Reset node_04 / node_07 to pre-quorum dev state (local only). */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as ed from "@noble/ed25519";
import { base58 } from "@scure/base";

import {
  signDocument,
  withProtocolFields,
} from "./seed-showcase-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:8787").replace(/\/$/, "");

function mergeGameMeta(current, patch) {
  return {
    ...(current?.game_meta && typeof current.game_meta === "object" ? current.game_meta : {}),
    ...(patch.game_meta ?? {}),
  };
}

async function main() {
  if (!existsSync(seedPath)) {
    console.error("Missing", seedPath);
    process.exit(1);
  }
  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const profileId = seed.profile_id;
  const privateKey = base58.decode(seed.game_operator_private_key_b58);
  const publicKeyBase58 = seed.game_operator_public_key;

  const listRes = await fetch(
    `${apiOrigin}/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/objects`
  );
  const list = await listRes.json();
  if (!listRes.ok) {
    console.error(list.message || list.error || "Could not list objects");
    process.exit(1);
  }
  const byId = new Map(list.objects.map((o) => [o.object_id, o]));

  async function publish(objectId, patch) {
    const current = byId.get(objectId);
    if (!current) throw new Error(`missing ${objectId}`);
    const now = new Date().toISOString();
    const unsigned = withProtocolFields(
      {
        object_id: current.object_id,
        parent_profile_id: profileId,
        object_type: current.object_type,
        public_label: current.public_label,
        public_state: patch.public_state ?? current.public_state,
        status: "active",
        season_id: current.season_id,
        node_role: current.node_role,
        district: current.district,
        object_streams: current.object_streams,
        game_meta: mergeGameMeta(current, patch),
        created_at: current.created_at,
        updated_at: now,
      },
      "child_object"
    );
    const signed = await signDocument(unsigned, privateKey, publicKeyBase58);
    const url = `${apiOrigin}/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/objects/${encodeURIComponent(objectId)}/game-update`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ object: signed }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || data.error || `game-update failed (${res.status})`);
    }
    console.log("✓", objectId, "→", patch.public_state ?? current.public_state);
  }

  await publish("obj_cr_node_04_river", {
    public_state: "Seed clue live — share outward to evolve",
    game_meta: { collective_progress: 4, collective_target: 20, unlocked_by: [] },
  });
  await publish("obj_cr_node_07_cabinet", {
    public_state: "Locked until River Lantern quorum",
    game_meta: { unlocked_by: [], vouch_requires: ["node_10"], fragment_id: "czech_1" },
  });
  console.log("\nQuorum reset — open River Lantern scan and contribute with CR-LANTERN-7K");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
