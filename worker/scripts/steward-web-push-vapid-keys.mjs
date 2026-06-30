#!/usr/bin/env node
/**
 * Generate Tier 2 Web Push VAPID keys (P-256, URL-safe base64 for wrangler).
 *
 *   npm run notify:web-push:vapid-keys
 *
 * Public → worker/wrangler.toml [vars] STEWARD_VAPID_PUBLIC_KEY
 * Private → wrangler secret put STEWARD_VAPID_PRIVATE_KEY
 */
import { webcrypto } from "node:crypto";

function encodeBase64Url(bytes) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function rawPrivateFromPkcs8(pkcs8) {
  return pkcs8.slice(-32);
}

async function main() {
  const keys = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const publicRaw = new Uint8Array(
    await webcrypto.subtle.exportKey("raw", keys.publicKey)
  );
  const privatePkcs8 = new Uint8Array(
    await webcrypto.subtle.exportKey("pkcs8", keys.privateKey)
  );
  const publicKey = encodeBase64Url(publicRaw);
  const privateKey = encodeBase64Url(rawPrivateFromPkcs8(privatePkcs8));

  console.log("# Tier 2 Web Push VAPID keys (generated once per operator)");
  console.log(`STEWARD_VAPID_PUBLIC_KEY=${publicKey}`);
  console.log("# wrangler secret put STEWARD_VAPID_PRIVATE_KEY --config worker/wrangler.toml");
  console.log(`# private (paste at prompt): ${privateKey}`);
  console.log("# optional: STEWARD_VAPID_CONTACT=mailto:push@humanity.llc");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
