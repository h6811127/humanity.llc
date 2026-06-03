import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { childObjectBackupGateNoticeCopy } from "../../site/js/child-object-backup-gate-core.mjs";
import { loadSeasonJsonFile } from "../../site/js/city-game-season-path-core.mjs";
import {
  buildOrganizerComprehensionBrief,
  buildSelfServeSetupChecklist,
  gameOperatorCustodyComplete,
  GAME_OPERATOR_CUSTODY_ITEMS,
  GT_COMPREHENSION_SCORECARD,
  readGameOperatorCustodyAck,
  writeGameOperatorCustodyAck,
} from "../../site/js/city-game-season-setup-guide-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("city-game-season-setup-guide-core", () => {
  it("tracks game-operator custody acknowledgements", () => {
    const storage = {
      /** @type {Record<string, string>} */
      store: {},
      getItem(key) {
        return this.store[key] ?? null;
      },
      setItem(key, value) {
        this.store[key] = value;
      },
    };
    writeGameOperatorCustodyAck(storage, "profile_a", { private_offline: true });
    expect(readGameOperatorCustodyAck(storage, "profile_a").private_offline).toBe(true);
    expect(gameOperatorCustodyComplete({})).toBe(false);
    const full = Object.fromEntries(GAME_OPERATOR_CUSTODY_ITEMS.map((item) => [item.id, true]));
    expect(gameOperatorCustodyComplete(full)).toBe(true);
  });

  it("builds self-serve checklist from session and rows", () => {
    const checklist = buildSelfServeSetupChecklist({
      session: {
        profile_id: "profile_a",
        recovery_key_acknowledged: true,
        issuer_public_key: "abc123",
      },
      childObjectRows: [
        { object_type: "game_node", status: "active" },
        { object_type: "status_plate", status: "active" },
      ],
      custodyAck: Object.fromEntries(GAME_OPERATOR_CUSTODY_ITEMS.map((item) => [item.id, true])),
      rulesPublishReady: false,
      season: loadSeasonJsonFile(root, "city-game-example-season-01.json"),
    });
    expect(checklist.gameNodeCount).toBe(1);
    expect(checklist.items.find((item) => item.id === "owner_backup")?.done).toBe(true);
    expect(checklist.items.find((item) => item.id === "game_operator_custody")?.done).toBe(true);
    expect(checklist.bulkImportBlocked).toBe(false);
  });

  it("blocks bulk path when two objects exist without backup seatbelt", () => {
    const checklist = buildSelfServeSetupChecklist({
      session: { profile_id: "profile_a", issuer_public_key: "abc123" },
      childObjectRows: [
        { object_type: "game_node", status: "active" },
        { object_type: "game_node", status: "active" },
      ],
      custodyAck: {},
    });
    expect(checklist.bulkImportBlocked).toBe(true);
  });

  it("builds comprehension brief with GT rows and example season paths", () => {
    const season = loadSeasonJsonFile(root, "city-game-example-season-01.json");
    const brief = buildOrganizerComprehensionBrief(season);
    expect(brief).toContain("GT-1:");
    expect(brief).toContain("/play/example-city/");
    expect(brief).toContain("/play/example-city/comprehension/");
    expect(GT_COMPREHENSION_SCORECARD.length).toBe(7);
  });

  it("uses game-season backup gate copy when context is game_season", () => {
    expect(
      childObjectBackupGateNoticeCopy(
        { blocked: true, warn: false },
        { context: "game_season" }
      )?.title
    ).toMatch(/game nodes/i);
  });
});
