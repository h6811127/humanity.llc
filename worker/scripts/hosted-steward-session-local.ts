#!/usr/bin/env npx tsx
/**
 * Mint a local steward bearer token (POST /steward/session) for curl / API debugging.
 *
 * Prerequisites:
 *   npm run worker:migrate:local
 *   npm run worker:dev  (HOSTED_STEWARD_ENABLED=1 in worker/wrangler.toml)
 *   Card for profile_id must exist in local D1 (npm run city-game:seed-local creates season root)
 *
 * Usage:
 *   npm run hosted:steward-session-local
 *   npm run hosted:steward-session-local -- --profile GcP3Ee17yGqMHdidhEVMYBzq --account acc_mygame01
 *   npm run hosted:steward-session-local -- --season cr_season_01_wake
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { base58 } from "@scure/base";

import {
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import { getTestKeypair } from "../src/crypto/ed25519";
import { randomBase58 } from "./seed-showcase-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultSeasonPath = join(root, "site/data/city-game-cr-season-01.json");
const seedJsonPath = join(root, "worker/.local/city-game-seed.json");
const fixtureKeysPath = join(root, "worker/tests/fixtures/keys.json");

function parseArg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  if (i < 0 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1]?.trim() || null;
}

function seasonRootFromJson(): string | null {
  try {
    if (!existsSync(defaultSeasonPath)) return null;
    const season = JSON.parse(readFileSync(defaultSeasonPath, "utf8")) as {
      season_root_profile_id?: string | null;
      season_id?: string;
    };
    return season.season_root_profile_id?.trim() || null;
  } catch {
    return null;
  }
}

function defaultSeasonId(): string {
  try {
    if (!existsSync(defaultSeasonPath)) return "cr_season_01_wake";
    const season = JSON.parse(readFileSync(defaultSeasonPath, "utf8")) as {
      season_id?: string;
    };
    return season.season_id?.trim() || "cr_season_01_wake";
  } catch {
    return "cr_season_01_wake";
  }
}

type OwnerKeys = {
  profileId: string;
  privateKey: Uint8Array;
  publicKeyBase58: string;
  source: string;
};

async function resolveOwnerKeys(): Promise<OwnerKeys> {
  const profileOverride = parseArg("--profile");

  if (existsSync(seedJsonPath)) {
    const seed = JSON.parse(readFileSync(seedJsonPath, "utf8")) as {
      profile_id?: string;
      owner_public_key?: string;
      owner_private_key_b58?: string;
    };
    const profileId = profileOverride || seed.profile_id?.trim();
    const privB58 = seed.owner_private_key_b58?.trim();
    const pub = seed.owner_public_key?.trim();
    if (profileId && privB58 && pub) {
      return {
        profileId,
        privateKey: base58.decode(privB58),
        publicKeyBase58: pub,
        source: seedJsonPath,
      };
    }
  }

  const { privateKey, publicKeyBase58 } = await getTestKeypair();
  let profileId = profileOverride;
  if (!profileId && existsSync(fixtureKeysPath)) {
    const fixture = JSON.parse(readFileSync(fixtureKeysPath, "utf8")) as {
      profile_id?: string;
    };
    profileId = fixture.profile_id?.trim();
  }
  profileId = profileId || seasonRootFromJson() || "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
  return {
    profileId,
    privateKey,
    publicKeyBase58,
    source: "humanity-commons-test-seed-v1 (fixtures/keys.json)",
  };
}

async function main() {
  const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:8787").replace(
    /\/$/,
    ""
  );
  const owner = await resolveOwnerKeys();
  const profileId = owner.profileId;
  const seasonRoot = seasonRootFromJson();
  if (seasonRoot && seasonRoot !== profileId && !parseArg("--profile")) {
    console.warn(
      "\n⚠ season_root_profile_id in site/data (%s) ≠ seed profile (%s).",
      seasonRoot,
      profileId
    );
    console.warn("  ?season_id= entitlements will 403 until aligned.");
    console.warn("  Fix: npm run city-game:sync-season-root\n");
  }
  const accountId = parseArg("--account") || "acc_TestHostedSteward1";
  const deviceId = parseArg("--device") || "devTestdevice1111";
  const seasonId = parseArg("--season") || defaultSeasonId();

  const capsRes = await fetch(
    `${apiOrigin}/.well-known/hc/v1/operator/capabilities`
  ).catch(() => null);
  if (!capsRes?.ok) {
    console.error(`Worker not reachable at ${apiOrigin} (capabilities ${capsRes?.status ?? "network"}).`);
    console.error("Start: npm run worker:dev");
    process.exit(1);
  }
  const caps = (await capsRes.json()) as {
    extensions?: { hosted_steward?: { status?: string } };
  };
  if (caps.extensions?.hosted_steward?.status !== "enabled") {
    console.error("Hosted steward extension disabled. Set HOSTED_STEWARD_ENABLED=1 and restart worker:dev.");
    process.exit(1);
  }

  const { privateKey, publicKeyBase58 } = owner;
  const now = Date.now();
  const unsigned = withProtocolFields(
    {
      profile_id: profileId,
      account_id: accountId,
      operator_id: "humanity.llc",
      device_id: deviceId,
      issued_at: new Date(now).toISOString(),
      expires_at: new Date(now + 5 * 60 * 1000).toISOString(),
      nonce: randomBase58(16),
    },
    PAYLOAD_TYPES.STEWARD_ACCOUNT_LINK
  );
  const linkProof = await signDocument(unsigned, { privateKey, publicKeyBase58 });

  const sessionRes = await fetch(`${apiOrigin}/.well-known/hc/v1/steward/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile_id: profileId,
      device_id: deviceId,
      link_proof: linkProof,
    }),
  });

  const sessionText = await sessionRes.text();
  if (!sessionRes.ok) {
    console.error(`POST /steward/session failed (${sessionRes.status}):`, sessionText);
    if (sessionRes.status === 401 || sessionRes.status === 403) {
      console.error(
        "\nUsually: profile_id card missing in local D1, or owner key does not match card.public_key."
      );
      console.error("For Cedar Rapids: npm run city-game:seed-local (uses a new season root + keys in seed JSON).");
    }
    process.exit(1);
  }

  const sessionBody = JSON.parse(sessionText) as { token?: string; account_id?: string };
  const token = sessionBody.token?.trim();
  if (!token) {
    console.error("Session response missing token:", sessionBody);
    process.exit(1);
  }

  console.log("\nSteward session (local)\n");
  console.log(`  signing keys: ${owner.source}`);
  console.log(`  account_id:  ${sessionBody.account_id ?? accountId}`);
  console.log(`  profile_id:  ${profileId}`);
  console.log(`  device_id:   ${deviceId}`);
  console.log(`\n  token (use as Bearer — NOT acc_… from checkout):\n`);
  console.log(token);
  console.log("\nExample entitlements + game season:\n");
  console.log(
    `curl -s -H "Authorization: Bearer ${token}" -H "X-HC-Device-Id: ${deviceId}" \\`
  );
  console.log(
    `  "${apiOrigin}/.well-known/hc/v1/steward/entitlements?season_id=${seasonId}" | jq .`
  );
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
