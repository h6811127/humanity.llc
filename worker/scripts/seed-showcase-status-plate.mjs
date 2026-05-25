/**
 * Creates (or skips) a public status-plate showcase card and writes site/data/showcase-status-plate.json
 *
 * Usage:
 *   API_ORIGIN=https://humanity.llc npm run site:seed-showcase
 *   API_ORIGIN=http://127.0.0.1:8787 npm run site:seed-showcase
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as ed from "@noble/ed25519";
import { base58 } from "@scure/base";
import canonicalize from "canonicalize";

const PROTOCOL_VERSION = "1.0";
const apiOrigin = process.env.API_ORIGIN || "https://humanity.llc";
const outPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../site/data/showcase-status-plate.json"
);

function encodeBase58(bytes) {
  return base58.encode(bytes);
}

function randomBase58(len) {
  const b = crypto.getRandomValues(new Uint8Array(len));
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[b[i] % alphabet.length];
  return out;
}

async function signDocument(unsigned, privateKey, publicKeyBase58) {
  const message = new TextEncoder().encode(canonicalize(unsigned));
  const sigBytes = await ed.signAsync(message, privateKey);
  return {
    ...unsigned,
    signature: {
      alg: "Ed25519",
      public_key: publicKeyBase58,
      signature: encodeBase58(sigBytes),
      signed_at: new Date().toISOString(),
      canonicalization: "JCS",
    },
  };
}

function withProtocolFields(payload, type) {
  return { ...payload, type, version: PROTOCOL_VERSION };
}

async function main() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  const publicKeyBase58 = encodeBase58(publicKey);
  const profileId = randomBase58(24);
  const qrId = `qr_${randomBase58(16)}`;
  const now = new Date().toISOString();
  const handle = "studio_door_showcase";
  const manifesto = "Studio door (showcase)\nOpen · Thu–Sun until 9 PM";
  const scanUrl = `${apiOrigin.replace(/\/$/, "")}/c/${profileId}?q=${qrId}`;
  const expiresAt = new Date(now);
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 2);

  const card = await signDocument(
    withProtocolFields(
      {
        profile_id: profileId,
        public_key: publicKeyBase58,
        handle,
        manifesto_line: manifesto,
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
        qr: { active_qr_id: qrId, epoch: 1 },
        links: { standards: "https://humanity.llc/standards/v1" },
      },
      "humanity_card"
    ),
    privateKey,
    publicKeyBase58
  );

  const qr = await signDocument(
    withProtocolFields(
      {
        qr_id: qrId,
        profile_id: profileId,
        nonce: `nonce_${randomBase58(12)}`,
        epoch: 1,
        scope: "card",
        resolver_hint: apiOrigin.replace(/\/$/, ""),
        issued_at: now,
        expires_at: expiresAt.toISOString(),
        status: "active",
        payload: scanUrl,
      },
      "qr_credential"
    ),
    privateKey,
    publicKeyBase58
  );

  const res = await fetch(`${apiOrigin.replace(/\/$/, "")}/.well-known/hc/v1/cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card, qr_credential: qr }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Create failed:", body);
    process.exit(1);
  }

  const payload = {
    profile_id: profileId,
    qr_id: qrId,
    handle,
    label: "Studio door · Open Thu–Sun (showcase)",
    scan_url: scanUrl,
    created_at: now,
    note: "Showcase card  -  owner key not stored. Revoke only via operator DB if needed.",
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${outPath}`);
  console.log(`Live scan: ${scanUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
