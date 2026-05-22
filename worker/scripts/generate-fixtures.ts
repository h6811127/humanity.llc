/**
 * Regenerate golden test fixtures (run from repo root):
 *   npm run worker:fixtures
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "../tests/fixtures");

const PROFILE_ID = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const OTHER_PROFILE = "8Ym8nQ3pR5sU7wX9zA2bC4dE6";
const TS = "2026-05-16T17:00:00.000Z";

async function main(): Promise<void> {
  const { privateKey, publicKeyBase58 } = await getTestKeypair();
  const signOpts = { privateKey, publicKeyBase58, signedAt: TS };

  mkdirSync(fixturesDir, { recursive: true });

  writeFileSync(
    join(fixturesDir, "keys.json"),
    `${JSON.stringify(
      {
        note: "TEST ONLY — never use this seed in production",
        profile_id: PROFILE_ID,
        public_key_base58: publicKeyBase58,
        seed_phrase: "humanity-commons-test-seed-v1",
      },
      null,
      2
    )}\n`
  );

  const card = await signDocument(
    withProtocolFields(
      {
        profile_id: PROFILE_ID,
        public_key: publicKeyBase58,
        handle: "founding_builder",
        manifesto_line: "Building trust without platforms.",
        created_at: TS,
        updated_at: TS,
        status: "active",
        verification: {
          level: 1,
          label: "Registered",
          method: "registered",
          verified_at: TS,
          vouch_count: 0,
          latest_accepted_vouch_at: null,
        },
        badges: [],
        qr: { active_qr_id: "qr_test_card_001", epoch: 1 },
        links: { standards: "https://humanity.llc/standards/v1" },
      },
      PAYLOAD_TYPES.HUMANITY_CARD
    ),
    signOpts
  );

  const qrCredential = await signDocument(
    withProtocolFields(
      {
        qr_id: "qr_test_card_001",
        profile_id: PROFILE_ID,
        nonce: "nonce_qr_issue_001",
        epoch: 1,
        scope: "card",
        resolver_hint: "https://humanity.llc",
        issued_at: TS,
        expires_at: "2027-05-16T17:00:00.000Z",
        status: "active",
        payload: `https://humanity.llc/c/${PROFILE_ID}?q=qr_test_card_001`,
      },
      PAYLOAD_TYPES.QR_CREDENTIAL
    ),
    signOpts
  );

  const vouch = await signDocument(
    withProtocolFields(
      {
        vouch_id: "vouch_test_001",
        voucher_profile_id: OTHER_PROFILE,
        vouchee_profile_id: PROFILE_ID,
        nonce: "nonce_vouch_001",
        statement: "I attest this is a distinct human I know.",
        method: "in_person",
        created_at: TS,
        revoked: false,
      },
      PAYLOAD_TYPES.VOUCH
    ),
    signOpts
  );

  const revocation = await signDocument(
    withProtocolFields(
      {
        profile_id: PROFILE_ID,
        target_kind: "qr_credential",
        target_qr_id: "qr_test_item_002",
        reason: "owner_revoked",
        revoked_at: TS,
        nonce: "nonce_revoke_001",
      },
      PAYLOAD_TYPES.REVOCATION
    ),
    signOpts
  );

  const badge = await signDocument(
    withProtocolFields(
      {
        badge_id: "badge_founding_001",
        badge_type: "founding_human",
        label: "Founding Human",
        issuer: "humanity.llc",
        issued_to: PROFILE_ID,
        nonce: "nonce_badge_001",
        issued_at: TS,
        evidence_uri: "https://humanity.llc/badges/founding-human",
      },
      PAYLOAD_TYPES.BADGE
    ),
    signOpts
  );

  const suspension = await signDocument(
    withProtocolFields(
      {
        profile_id: PROFILE_ID,
        cause_category: "policy_violation",
        public_notice:
          "Suspended under published bootstrap rules pending appeal.",
        appeal_deadline: "2026-06-16T17:00:00.000Z",
        suspended_at: TS,
        nonce: "nonce_suspend_001",
      },
      PAYLOAD_TYPES.SUSPENSION
    ),
    signOpts
  );

  const exportManifest = await signDocument(
    withProtocolFields(
      {
        profile_id: PROFILE_ID,
        manifest_id: "manifest_test_001",
        exported_at: TS,
        nonce: "nonce_export_001",
        includes: ["card", "qr_credentials", "vouches", "badges"],
      },
      PAYLOAD_TYPES.EXPORT_MANIFEST
    ),
    signOpts
  );

  const docs: Record<string, unknown> = {
    card,
    qr_credential: qrCredential,
    vouch,
    revocation,
    badge,
    suspension,
    export_manifest: exportManifest,
  };

  for (const [name, doc] of Object.entries(docs)) {
    writeFileSync(
      join(fixturesDir, `${name}.json`),
      `${JSON.stringify(doc, null, 2)}\n`
    );
  }

  console.log(`Wrote fixtures to ${fixturesDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
