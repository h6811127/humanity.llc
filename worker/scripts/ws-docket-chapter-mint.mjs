#!/usr/bin/env node
/**
 * Mint a real Worker child QR for the Cedar Rapids chapter discovery pin.
 *
 * Prerequisites:
 *   npm run worker:migrate:local
 *   npm run worker:dev  →  http://127.0.0.1:8787
 *
 * Usage:
 *   API_ORIGIN=http://127.0.0.1:8787 npm run ws-docket:chapter-mint
 *   API_ORIGIN=http://127.0.0.1:8787 npm run ws-docket:chapter-mint -- --write-pins
 *   API_ORIGIN=http://127.0.0.1:8787 npm run ws-docket:chapter-mint -- --force
 *   API_ORIGIN=https://humanity.llc npm run ws-docket:chapter-mint -- \
 *     --production --confirm-production-mint --replay --write-pins
 *
 * Writes keys + receipt to worker/.local/docket-chapter-mint.json (gitignored).
 * `--write-pins` updates site/data/docket-chapter-discovery-pins.json (public ids only).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createShowcaseWithHandleRetry,
  encodeBase58,
  isLocalApiOrigin,
  newShowcaseKeypair,
  randomBase58,
  signDocument,
  withProtocolFields,
} from "./seed-showcase-core.mjs";
import {
  assessDocketChapterMintExecution,
  applyDocketChapterMintReceiptToRegistry,
  buildDocketChapterChildObjectFields,
  buildDocketChapterMintReceipt,
  DOCKET_CHAPTER_MINT_OBJECT_TYPE,
  validateDocketChapterMintReceipt,
} from "../../site/js/docket-chapter-mint-core.mjs";
import { validateDocketChapterDiscoveryPins } from "../../site/js/docket-chapter-discovery-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const pinsPath = join(root, "site/data/docket-chapter-discovery-pins.json");
const writePins = process.argv.includes("--write-pins");
const force = process.argv.includes("--force");
const replay = process.argv.includes("--replay");
const production = process.argv.includes("--production");
const confirmProduction = process.argv.includes("--confirm-production-mint");

const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:8787").replace(
  /\/$/,
  ""
);
const scanOrigin = (
  process.env.SCAN_ORIGIN ||
  (isLocalApiOrigin(apiOrigin) ? "https://humanity.llc" : apiOrigin)
).replace(/\/$/, "");
const outPath = join(
  root,
  isLocalApiOrigin(apiOrigin)
    ? "worker/.local/docket-chapter-mint.json"
    : "worker/.local/docket-chapter-mint-production.json"
);

const DEFAULT_PIN_ID = "chapter-cr-research-circle";

function apiHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (isLocalApiOrigin(apiOrigin)) {
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

async function main() {
  console.log("WS-DOCKET chapter mint (QR-mint-v0)");
  console.log("API:", apiOrigin);
  console.log("Scan payloads:", scanOrigin);

  const health = await fetch(`${apiOrigin}/.well-known/hc/v1/health`).catch(
    () => null
  );
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

  if (existsSync(outPath) && !force && !replay) {
    console.error(`\nMint receipt already exists: ${outPath}`);
    console.error("Re-run with --force/--replay to mint another parent/child pair.");
    process.exit(1);
  }

  const pinsDoc = JSON.parse(readFileSync(pinsPath, "utf8"));
  const pinsCheck = validateDocketChapterDiscoveryPins(pinsDoc);
  if (!pinsCheck.ok) {
    console.error("Chapter pins registry invalid:", pinsCheck.errors.join("; "));
    process.exit(1);
  }
  const pin = (Array.isArray(pinsDoc.pins) ? pinsDoc.pins : []).find(
    (row) => row && String(row.id) === DEFAULT_PIN_ID
  );
  if (!pin) {
    console.error(`Pin ${DEFAULT_PIN_ID} not found in registry`);
    process.exit(1);
  }
  const execution = assessDocketChapterMintExecution({
    apiOrigin,
    scanOrigin,
    production,
    confirmProduction,
    replay,
    currentMintStatus: String(pin.mint_status ?? "fixture"),
  });
  if (!execution.ok) {
    console.error("\nMint guard refused execution:");
    for (const error of execution.errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  if (execution.isProduction) {
    console.log("Mode: PRODUCTION REPLAY (explicitly confirmed)");
  }

  const owner = await newShowcaseKeypair();
  const issuer = await newShowcaseKeypair();
  const profileId = randomBase58(24);
  const rootQrId = `qr_${randomBase58(16)}`;
  const childQrId = `qr_${randomBase58(16)}`;
  const now = new Date().toISOString();
  const childFields = buildDocketChapterChildObjectFields({
    pinId: DEFAULT_PIN_ID,
    profileId,
    displayLabel: String(pin.display_label ?? DEFAULT_PIN_ID),
    publicState: "Chapter teach-in · research kit commons",
    objectId: String(
      pin.live_object?.object_id ?? `obj_docket_casefile_${DEFAULT_PIN_ID}`
    ),
    createdAt: now,
  });
  const rootScanUrl = `${scanOrigin}/c/${profileId}?q=${rootQrId}`;
  const expiresAt = new Date(now);
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 2);

  console.log("\n=== Creating chapter parent card ===");
  const { handle } = await createShowcaseWithHandleRetry({
    apiOrigin,
    handleBase: "docket_chapter_cr",
    buildPayload: async (handleName) => {
      const card = await signDocument(
        withProtocolFields(
          {
            profile_id: profileId,
            public_key: owner.publicKeyBase58,
            handle: handleName,
            manifesto_line:
              "Public Docket · chapter commons parent (non-starter teach-in pin)",
            issuer_public_key: issuer.publicKeyBase58,
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

  console.log("Parent @%s · profile_id %s", handle, profileId);

  console.log("\n=== Creating %s child ===", DOCKET_CHAPTER_MINT_OBJECT_TYPE);
  let signedObject = await signDocument(
    withProtocolFields(childFields, "child_object"),
    owner.privateKey,
    owner.publicKeyBase58
  );
  let createRes = await postJson(
    `/.well-known/hc/v1/cards/${profileId}/objects`,
    { object: signedObject }
  );
  if (
    !createRes.ok &&
    createRes.body?.error === "OBJECT_EXISTS" &&
    (force || replay)
  ) {
    childFields.object_id = `${childFields.object_id}_${randomBase58(6)}`;
    console.warn(
      `object_id taken — using ${childFields.object_id} (${replay ? "--replay" : "--force"})`
    );
    signedObject = await signDocument(
      withProtocolFields(childFields, "child_object"),
      owner.privateKey,
      owner.publicKeyBase58
    );
    createRes = await postJson(
      `/.well-known/hc/v1/cards/${profileId}/objects`,
      { object: signedObject }
    );
  }
  if (!createRes.ok) {
    console.error("\nCreate child failed:", createRes.body);
    if (createRes.body?.error === "OBJECT_EXISTS") {
      console.error(
        "Re-run with --force/--replay, or reset local D1 + apply child QR schema."
      );
    }
    process.exit(1);
  }

  console.log("\n=== Issuing child QR ===");
  const childPayload = `${scanOrigin}/c/${profileId}?q=${childQrId}`;
  const qrCredential = await signDocument(
    withProtocolFields(
      {
        qr_id: childQrId,
        profile_id: profileId,
        object_id: childFields.object_id,
        nonce: `nonce_${randomBase58(12)}`,
        epoch: 1,
        scope: "child_object",
        resolver_hint: scanOrigin,
        issued_at: now,
        expires_at: null,
        status: "active",
        payload: childPayload,
      },
      "qr_credential"
    ),
    owner.privateKey,
    owner.publicKeyBase58
  );
  const issueRes = await postJson(
    `/.well-known/hc/v1/cards/${profileId}/objects/${childFields.object_id}/issue-qr`,
    { qr_credential: qrCredential }
  );
  if (!issueRes.ok) {
    console.error("\nIssue QR failed:", issueRes.status, issueRes.body);
    const msg = JSON.stringify(issueRes.body);
    if (msg.includes("scope IN ('card', 'print_artifact')") || msg.includes("child_object")) {
      console.error("Local D1 may be missing child_object QR schema.");
      console.error("Run: npm run worker:apply-child-object-qr-schema");
    }
    process.exit(1);
  }

  const receipt = buildDocketChapterMintReceipt({
    pinId: DEFAULT_PIN_ID,
    profileId,
    qrId: issueRes.body.qr_id || childQrId,
    objectId: childFields.object_id,
    handle,
    scanOrigin,
    mintedAt: now,
    apiOrigin,
  });
  const receiptCheck = validateDocketChapterMintReceipt(receipt);
  if (!receiptCheck.ok) {
    console.error("Receipt invalid:", receiptCheck.errors.join("; "));
    process.exit(1);
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        ...receipt,
        owner_public_key: owner.publicKeyBase58,
        issuer_public_key: issuer.publicKeyBase58,
        owner_private_key_base58: encodeBase58(owner.privateKey),
        note: "Private key material — never commit. Public scan_path may be written to pins with --write-pins.",
      },
      null,
      2
    ),
    "utf8"
  );
  console.log("\nWrote", outPath);
  console.log("scan_path:", receipt.scan_path);
  console.log("scan_url:", receipt.scan_url);

  if (writePins) {
    const nextDoc = applyDocketChapterMintReceiptToRegistry(pinsDoc, receipt);
    const nextCheck = validateDocketChapterDiscoveryPins(nextDoc);
    if (!nextCheck.ok) {
      console.error(
        "Updated pins failed validation:",
        nextCheck.errors.join("; ")
      );
      process.exit(1);
    }
    writeFileSync(pinsPath, `${JSON.stringify(nextDoc, null, 2)}\n`, "utf8");
    console.log("Updated", pinsPath);
  } else {
    console.log("\nPins registry unchanged. Re-run with --write-pins to publish scan_path.");
  }

  console.log("\n✅ Chapter child QR minted.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
