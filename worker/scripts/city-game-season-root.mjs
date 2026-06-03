#!/usr/bin/env node
/**
 * Season root setup helper — game-operator keypair + create checklist.
 *
 * Usage:
 *   npm run city-game:season-root
 *
 * The game-operator public key is registered as issuer_public_key on the season root card
 * (same field as organizer revoke — different UI and API surface).
 *
 * Self-serve organizers still generate/paste the key at /create/ — then register nodes on /created/.
 */

import * as ed from "@noble/ed25519";
import { base58 } from "@scure/base";

import { formatSeasonSetupNextSteps } from "../../site/js/city-game-terminal-mint-deprecation-core.mjs";

function encodeBase58(bytes) {
  return base58.encode(bytes);
}

async function main() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  const publicKeyBase58 = encodeBase58(publicKey);
  const privateKeyBase58 = encodeBase58(privateKey);

  console.log("City game — season root setup\n");
  console.log("=== Game-operator keypair (generate once; store offline) ===");
  console.log("PUBLIC (register at create):", publicKeyBase58);
  console.log("\nPRIVATE (operator custody only — never commit):");
  console.log(privateKeyBase58);
  console.log("\n=== Self-serve organizers (new seasons) ===");
  console.log("1. Paste PUBLIC at /create/ under Organizer / issuer.");
  console.log("2. Save owner + recovery keys per SAFARI_KEYS_CUSTODY.md.");
  console.log("3. On /created/ Live · Manage — Add game node · bulk import · rules publish.");
  console.log("4. Store game-operator PRIVATE offline — paste at /game-operator/ only.");
  console.log("\n=== Cedar Rapids pilot / engineering only ===");
  console.log("5. Record season_root_profile_id in site/data/city-game-cr-season-01.json.");
  console.log("6. Mint nodes: npm run city-game:mint-node -- --all  (pilot season only)");
  console.log("7. Local D1 bootstrap: npm run city-game:seed-local -- --write-season");
  console.log("8. Flip state at /game-operator/ (local CITY_GAME_ENABLED=1).");
  console.log("\n" + formatSeasonSetupNextSteps());
  console.log("\nCustody brief: docs/CITY_GAME_OPERATOR_CUSTODY.md");
  console.log("Runbook: docs/CITY_GAME_OPERATOR_RUNBOOK.md");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
