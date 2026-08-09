import { afterEach, describe, expect, it, vi } from "vitest";

import { collectPreMintCredentialsForIntents } from "../src/commerce/fulfillment-auto-mint";
import type { ArtifactIntentRow } from "../src/db/artifact-intents";
import * as artifactIntents from "../src/db/artifact-intents";

function intentRow(
  artifactIntentId: string,
  pendingMintCredentialsJson: string | null
): ArtifactIntentRow {
  return {
    artifact_intent_id: artifactIntentId,
    profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    source_qr_id: "qr_testSource01",
    product_id: "tier1_glitch_hoodie_v1",
    print_variant_id: null,
    print_frame_background: "full",
    quantity: 1,
    planned_item_qr_ids_json: '["qr_planned01"]',
    planned_print_artifact_ids_json: '["pa_planned01"]',
    pending_mint_credentials_json: pendingMintCredentialsJson,
    status: "attached_to_cart",
    expires_at: "2099-01-01T00:00:00.000Z",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

describe("collectPreMintCredentialsForIntents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("skips missing intents and empty credential payloads", async () => {
    vi.spyOn(artifactIntents, "getArtifactIntent").mockImplementation(async (_db, id) => {
      if (id === "ai_missingIntent01") return null;
      if (id === "ai_emptyCreds0001") return intentRow(id, null);
      if (id === "ai_blankCreds0001") return intentRow(id, "   ");
      return null;
    });

    await expect(
      collectPreMintCredentialsForIntents({} as D1Database, [
        "ai_missingIntent01",
        "ai_emptyCreds0001",
        "ai_blankCreds0001",
      ])
    ).resolves.toEqual([]);
  });

  it("collects object credentials and drops malformed or non-object entries", async () => {
    const credA = { qr_id: "qr_a", type: "print_artifact_mint_v1" };
    const credB = { qr_id: "qr_b", type: "print_artifact_mint_v1" };

    vi.spyOn(artifactIntents, "getArtifactIntent").mockImplementation(async (_db, id) => {
      if (id === "ai_goodCreds00001") {
        return intentRow(id, JSON.stringify([credA, "skip-string", null, 12, credB]));
      }
      if (id === "ai_objectNotArr01") {
        return intentRow(id, JSON.stringify({ qr_id: "qr_not_array" }));
      }
      if (id === "ai_badJson0000001") {
        return intentRow(id, "{not-json");
      }
      return null;
    });

    await expect(
      collectPreMintCredentialsForIntents({} as D1Database, [
        "ai_goodCreds00001",
        "ai_objectNotArr01",
        "ai_badJson0000001",
      ])
    ).resolves.toEqual([credA, credB]);
  });

  it("concatenates credentials across multiple artifact intents in order", async () => {
    const first = { qr_id: "qr_first" };
    const second = { qr_id: "qr_second" };

    vi.spyOn(artifactIntents, "getArtifactIntent").mockImplementation(async (_db, id) => {
      if (id === "ai_firstIntent001") return intentRow(id, JSON.stringify([first]));
      if (id === "ai_secondIntent01") return intentRow(id, JSON.stringify([second]));
      return null;
    });

    await expect(
      collectPreMintCredentialsForIntents({} as D1Database, [
        "ai_firstIntent001",
        "ai_secondIntent01",
      ])
    ).resolves.toEqual([first, second]);
  });
});
