/**
 * Creates a public lost-item relay showcase card and writes site/data/showcase-lost-item.json
 *
 * Usage:
 *   API_ORIGIN=https://humanity.llc npm run site:seed-showcase-lost-item
 *   API_ORIGIN=http://127.0.0.1:8787 npm run site:seed-showcase-lost-item
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createShowcaseWithHandleRetry,
  newShowcaseKeypair,
  randomBase58,
  showcaseScanUrl,
  signDocument,
  withProtocolFields,
} from "./seed-showcase-core.mjs";

const apiOrigin = process.env.API_ORIGIN || "https://humanity.llc";
const outPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../site/data/showcase-lost-item.json"
);

async function main() {
  const { privateKey, publicKeyBase58 } = await newShowcaseKeypair();
  const profileId = randomBase58(24);
  const qrId = `qr_${randomBase58(16)}`;
  const now = new Date().toISOString();
  const manifesto = "[relay] House keys\nLost - contact owner through relay";
  const scanUrl = showcaseScanUrl(apiOrigin, profileId, qrId);
  const expiresAt = new Date(now);
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 2);

  const { handle } = await createShowcaseWithHandleRetry({
    apiOrigin,
    handleBase: "keys_relay_showcase",
    buildPayload: async (handle) => {
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

      return { card, qr_credential: qr };
    },
  });

  const payload = {
    profile_id: profileId,
    qr_id: qrId,
    handle,
    label: "Lost item · House keys relay",
    manifesto_line: manifesto,
    scan_url: scanUrl,
    created_at: now,
    note: "M5 stranger-test lost-item relay showcase - owner key not stored.",
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${outPath}`);
  console.log(`Handle: @${handle}`);
  console.log(`Live scan: ${scanUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
