/**
 * Verify landing showcase cards on a live resolver expose object_streams (+ snapshot when expected).
 *
 * Usage (after re-seed):
 *   API_ORIGIN=https://humanity.llc npm run site:verify-showcase
 *   API_ORIGIN=http://127.0.0.1:8787 npm run site:verify-showcase
 *
 * @see docs/MANIFESTO_STATUS_UPDATE.md § Exit checklist
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
const siteDataDir = join(dirname(fileURLToPath(import.meta.url)), "../../site/data");

/** @typedef {{ file: string; expectSnapshot: boolean }} ShowcaseSpec */

/** @type {ShowcaseSpec[]} */
const SPECS = [
  { file: "showcase-status-plate.json", expectSnapshot: true },
  { file: "showcase-live-object.json", expectSnapshot: true },
  { file: "showcase-lost-item.json", expectSnapshot: false },
];

/**
 * @param {unknown} body
 * @param {string} label
 */
function assertActiveScan(body, label) {
  if (!body || typeof body !== "object") {
    throw new Error(`${label}: invalid JSON body`);
  }
  const scan = /** @type {{ kind?: string; error?: string }} */ (body).scan;
  if (scan?.kind !== "active") {
    throw new Error(
      `${label}: expected scan.kind active, got ${scan?.kind ?? "missing"} (${scan?.error ?? "no error"})`
    );
  }
}

/**
 * @param {Array<{ id: string; label: string; value: string }>} expected
 * @param {Array<{ id: string; label: string; value: string }> | undefined} actual
 * @param {string} label
 */
function assertStreams(expected, actual, label) {
  if (!expected.length) return;
  if (!actual?.length) {
    throw new Error(`${label}: resolver missing card.object_streams (re-seed with API_ORIGIN)`);
  }
  for (const row of expected) {
    const match = actual.find((s) => s.id === row.id);
    if (!match) {
      throw new Error(`${label}: stream id ${row.id} missing on resolver`);
    }
    if (match.label !== row.label || match.value !== row.value) {
      throw new Error(`${label}: stream ${row.id} label/value mismatch on resolver`);
    }
  }
}

/**
 * @param {boolean} expectSnapshot
 * @param {{ text?: string } | undefined} snapshot
 * @param {string} label
 */
function assertSnapshot(expectSnapshot, snapshot, label) {
  if (!expectSnapshot) return;
  if (!snapshot?.text?.trim()) {
    throw new Error(`${label}: missing card.public_snapshot.text (object_streams present)`);
  }
}

async function verifyOne(spec) {
  const path = join(siteDataDir, spec.file);
  const data = JSON.parse(readFileSync(path, "utf8"));
  const { profile_id: profileId, qr_id: qrId, label, object_streams: expectedStreams = [] } =
    data;
  if (!profileId || !qrId) {
    throw new Error(`${spec.file}: missing profile_id or qr_id`);
  }

  const url = `${apiOrigin}/.well-known/hc/v1/cards/${profileId}/status?q=${qrId}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`${label ?? spec.file}: GET status ${res.status} from ${url}`);
  }
  const body = await res.json();
  assertActiveScan(body, label ?? spec.file);
  const card = /** @type {{ object_streams?: unknown; public_snapshot?: { text?: string } }} */ (
    body.scan?.card
  );
  assertStreams(expectedStreams, card?.object_streams, label ?? spec.file);
  assertSnapshot(spec.expectSnapshot, card?.public_snapshot, label ?? spec.file);
  console.log(`OK ${label ?? spec.file} (${url})`);
}

async function main() {
  console.log(`Verifying showcase cards on ${apiOrigin}…`);
  let failed = false;
  for (const spec of SPECS) {
    try {
      await verifyOne(spec);
    } catch (err) {
      failed = true;
      console.error(String(err instanceof Error ? err.message : err));
    }
  }
  if (failed) {
    console.error(
      "\nRe-seed when cards are missing streams: npm run site:seed-showcase && npm run site:seed-showcase-live-object"
    );
    process.exit(1);
  }
  console.log("All showcase resolver checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
