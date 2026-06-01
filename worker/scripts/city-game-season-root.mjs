#!/usr/bin/env node
/**
 * Season root setup helper — game-operator keypair + create checklist.
 *
 * Usage:
 *   npm run city-game:season-root
 *
 * The game-operator public key is registered as issuer_public_key on the season root card
 * (same field as organizer revoke — different UI and API surface).
 */

import * as ed from "@noble/ed25519";
import { base58 } from "@scure/base";

function encodeBase58(bytes) {
  return base58.encode(bytes);
}

async function main() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  const publicKeyBase58 = encodeBase58(publicKey);
  const privateKeyBase58 = encodeBase58(privateKey);

  console.log("Cedar Rapids city game — season root setup\n");
  console.log("=== Game-operator keypair (generate once; store offline) ===");
  console.log("PUBLIC (register at create):", publicKeyBase58);
  console.log("\nPRIVATE (operator custody only — never commit):");
  console.log(privateKeyBase58);
  console.log("\n=== Season root card checklist ===");
  console.log("1. Open /create/ on local or staging resolver.");
  console.log("2. Expand Organizer / issuer section → paste PUBLIC key above as issuer_public_key.");
  console.log("3. Save owner + recovery keys per SAFARI_KEYS_CUSTODY.md.");
  console.log("4. Store game-operator PRIVATE offline (password manager / hardware — not repo).");
  console.log("5. Record season root profile_id in site/data/city-game-cr-season-01.json → season_root_profile_id.");
  console.log("6. Mint nodes: npm run city-game:mint-node -- --all");
  console.log("7. Flip state at /game-operator/ (local CITY_GAME_ENABLED=1).");
  console.log("\nCustody brief: docs/CITY_GAME_OPERATOR_CUSTODY.md");
  console.log("Runbook: docs/CITY_GAME_OPERATOR_RUNBOOK.md");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
