import { describe, expect, it } from "vitest";

import {
  bumpCollectiveProgress,
  collectiveStreamValue,
  evolveRiverLanternAntiHoarding,
  fragmentLatticeProgress,
  gameNodeContributeMode,
  gameNodeShowsContribute,
  isCollectiveQuorumComplete,
  issueWitnessSunsetPass,
  markFragmentNodeClaimed,
  openFinaleSwitch,
  patchesForFragmentContribute,
  patchesForQuorumUnlock,
  recordFragmentOnFinale,
  riverLanternNeedsAntiHoardingEvolve,
  unlockCabinetFromRiver,
} from "../src/city-game/unlock-engine";

describe("unlock-engine", () => {
  it("formats collective stream values", () => {
    expect(collectiveStreamValue(4, 20)).toBe("4 / 20");
  });

  it("bumps collective progress and updates relay stream", () => {
    const doc = {
      public_state: "Seed clue live",
      object_streams: [
        { id: "relay", class: "route", label: "Collective", value: "4 / 20" },
      ],
      game_meta: { collective_progress: 4, collective_target: 20 },
    };
    const out = bumpCollectiveProgress(doc);
    expect(out.meta.collective_progress).toBe(5);
    expect(out.reachedTarget).toBe(false);
    const streams = out.doc.object_streams as { value: string }[];
    expect(streams[0].value).toBe("5 / 20");
  });

  it("caps progress at target and marks reachedTarget", () => {
    const doc = {
      public_state: "Almost there",
      object_streams: [
        { id: "relay", label: "Collective", value: "19 / 20" },
        { id: "bulletin", label: "Clue", value: "Lantern path waking" },
      ],
      game_meta: { collective_progress: 19, collective_target: 20 },
    };
    const out = bumpCollectiveProgress(doc);
    expect(out.meta.collective_progress).toBe(20);
    expect(out.reachedTarget).toBe(true);
    expect(out.doc.public_state).toContain("Evolved together");
    const streams = out.doc.object_streams as { label: string; value: string }[];
    expect(streams.find((s) => s.label === "Clue")?.value).toContain("Evolved clue");
  });

  it("evolves River Lantern anti-hoarding copy at quorum", () => {
    const doc = {
      public_state: "Seed clue live",
      object_streams: [{ id: "bulletin", label: "Clue", value: "Lantern path waking" }],
      game_meta: { collective_progress: 20, collective_target: 20 },
    };
    expect(riverLanternNeedsAntiHoardingEvolve(doc)).toBe(true);
    const evolved = evolveRiverLanternAntiHoarding(doc);
    expect(riverLanternNeedsAntiHoardingEvolve(evolved)).toBe(false);
    expect(isCollectiveQuorumComplete({ collective_progress: 20, collective_target: 20 } as never)).toBe(
      true
    );
  });

  it("shows contribute for temp_drop below target", () => {
    expect(
      gameNodeShowsContribute(
        { collective_progress: 4, collective_target: 20 } as never,
        "temp_drop",
        "node_04"
      )
    ).toBe(true);
    expect(
      gameNodeContributeMode(
        "node_04",
        { collective_progress: 4, collective_target: 20 } as never,
        "temp_drop"
      )
    ).toBe("quorum");
    expect(
      gameNodeShowsContribute(
        { collective_progress: 20, collective_target: 20 } as never,
        "temp_drop",
        "node_04"
      )
    ).toBe(false);
    expect(
      gameNodeShowsContribute(
        { unlocked_by: [] } as never,
        "relay_gate",
        "node_08"
      )
    ).toBe(false);
    expect(
      gameNodeShowsContribute(
        { unlocked_by: [] } as never,
        "relay_gate",
        "node_01"
      )
    ).toBe(true);
  });

  it("shows fragment contribute until node marks itself claimed", () => {
    expect(
      gameNodeContributeMode(
        "node_09",
        { unlocked_by: [] } as never,
        "lore_archive"
      )
    ).toBe("fragment");
    expect(
      gameNodeContributeMode(
        "node_09",
        { unlocked_by: ["node_09"] } as never,
        "lore_archive"
      )
    ).toBe(null);
  });

  it("shows scarcity contribute while sunset passes remain", () => {
    expect(
      gameNodeContributeMode(
        "node_10",
        { scarcity_remaining: 11 } as never,
        "witness"
      )
    ).toBe("scarcity");
    expect(
      gameNodeContributeMode(
        "node_10",
        { scarcity_remaining: 0 } as never,
        "witness"
      )
    ).toBe(null);
  });

  it("issues sunset pass and activates witness vouch targets", () => {
    const out = issueWitnessSunsetPass(
      {
        public_state: "Witness seal open",
        game_meta: { scarcity_remaining: 2, vouch_active_for: [] },
        object_streams: [
          { id: "relay", label: "Passes", value: "2 sunset passes remain" },
          { id: "bulletin", label: "Vouch", value: "Issues trust for cabinet path" },
        ],
      },
      "node_10"
    );
    expect(out.meta.scarcity_remaining).toBe(1);
    expect(out.meta.vouch_active_for).toContain("node_07");
    expect(out.depleted).toBe(false);

    const depleted = issueWitnessSunsetPass(out.doc, "node_10");
    expect(depleted.meta.scarcity_remaining).toBe(0);
    expect(depleted.depleted).toBe(true);
    expect(depleted.doc.public_state).toContain("closed for the night");
  });

  it("records fragments on finale and opens when lattice complete", () => {
    const finale = {
      public_state: "Finale switch dormant",
      game_meta: { unlocked_by: [] },
      object_streams: [{ id: "bulletin", label: "Need", value: "0 / 3 fragments" }],
    };
    const afterOne = recordFragmentOnFinale(finale, "node_09");
    expect(afterOne.latticeComplete).toBe(false);
    expect(fragmentLatticeProgress(normalizeMeta(afterOne.doc)).claimed).toBe(1);

    const afterTwo = recordFragmentOnFinale(afterOne.doc, "node_11");
    expect(afterTwo.latticeComplete).toBe(false);

    const afterThree = recordFragmentOnFinale(afterTwo.doc, "node_01");
    expect(afterThree.latticeComplete).toBe(true);

    const opened = openFinaleSwitch(afterThree.doc);
    expect(opened.public_state).toContain("Finale switch live");
  });

  it("marks fragment node claimed", () => {
    const out = markFragmentNodeClaimed(
      {
        public_state: "Fragment live",
        game_meta: { unlocked_by: [] },
        object_streams: [{ id: "relay", label: "Fragment", value: "1 of 3 live" }],
      },
      "node_09"
    );
    expect((out.game_meta as { unlocked_by: string[] }).unlocked_by).toContain("node_09");
  });

  it("returns finale patch target for fragment nodes", () => {
    expect(patchesForFragmentContribute("node_09")?.finaleNodeId).toBe("node_13");
    expect(patchesForFragmentContribute("node_04")).toBeNull();
  });

  it("returns node_07 patch after node_04 quorum", () => {
    const patches = patchesForQuorumUnlock("node_04");
    expect(patches).toHaveLength(1);
    expect(patches[0].toNodeId).toBe("node_07");
    expect(patches[0].objectId).toBe("obj_cr_node_07_cabinet");

    const unlocked = patches[0].transform({
      public_state: "Locked",
      game_meta: { unlocked_by: [] },
      object_streams: [
        { id: "relay", label: "Path", value: "Hidden" },
        { id: "territory", label: "Gate", value: "Locked" },
        { id: "bulletin", label: "Choice", value: "Private now vs shared ending" },
      ],
    });
    const meta = unlocked.game_meta as { unlocked_by: string[] };
    expect(meta.unlocked_by).toContain("node_04");
    expect(unlocked.public_state).toContain("Unlocked together");
    const streams = unlocked.object_streams as { label: string; value: string }[];
    expect(streams.find((s) => s.label === "Choice")?.value).toContain("Shared ending");
  });

  it("unlockCabinetFromRiver is idempotent for unlocked_by", () => {
    const doc = {
      public_state: "Locked",
      game_meta: { unlocked_by: ["node_04"] },
      object_streams: [],
    };
    const out = unlockCabinetFromRiver(doc);
    expect((out.game_meta as { unlocked_by: string[] }).unlocked_by).toEqual(["node_04"]);
  });
});

function normalizeMeta(doc: Record<string, unknown>) {
  return (doc.game_meta ?? { unlocked_by: [] }) as { unlocked_by: string[] };
}
