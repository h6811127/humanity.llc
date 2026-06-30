/**
 * Shared signer context for relationship-edge seed scripts.
 */
import { existsSync, readFileSync } from "node:fs";

import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { base58 } from "@scure/base";

import { encodeBase58 } from "./seed-showcase-core.mjs";

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

/**
 * @param {string} seedPath
 * @param {string} prodSeedPath
 */
export function loadRelationshipEdgeSeedContext(seedPath, prodSeedPath) {
  if (process.env.STEWARD_PROFILE_ID && process.env.ISSUER_PRIVATE_KEY) {
    const privateKey = base58.decode(process.env.ISSUER_PRIVATE_KEY);
    return {
      stewardProfileId: process.env.STEWARD_PROFILE_ID.trim(),
      privateKey,
      publicKeyBase58: encodeBase58(ed.getPublicKey(privateKey)),
    };
  }

  /** @param {Record<string, unknown>} row */
  function fromSeedRow(row) {
    const stewardProfileId = String(row.profile_id ?? "").trim();
    const issuerPrivateKey = String(
      row.issuer_private_key ?? row.game_operator_private_key_b58 ?? ""
    ).trim();
    if (!stewardProfileId || !issuerPrivateKey) {
      return null;
    }
    const privateKey = base58.decode(issuerPrivateKey);
    return {
      stewardProfileId,
      privateKey,
      publicKeyBase58: encodeBase58(ed.getPublicKey(privateKey)),
    };
  }

  if (existsSync(seedPath)) {
    const ctx = fromSeedRow(JSON.parse(readFileSync(seedPath, "utf8")));
    if (ctx) return ctx;
  }

  if (existsSync(prodSeedPath)) {
    const ctx = fromSeedRow(JSON.parse(readFileSync(prodSeedPath, "utf8")));
    if (ctx) return ctx;
  }

  throw new Error(
    `Missing seed credentials. Run npm run city-game:seed-local, or set STEWARD_PROFILE_ID + ISSUER_PRIVATE_KEY. Expected ${seedPath} with profile_id + game_operator_private_key_b58.`
  );
}
