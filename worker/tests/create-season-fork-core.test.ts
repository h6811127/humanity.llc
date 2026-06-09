import { describe, expect, it } from "vitest";

import {
  GAME_SEASON_FORK_DEDICATED,
  GAME_SEASON_FORK_EXISTING,
  gameSeasonForkCardCopy,
  readGameSeasonForkChoice,
  resolveGameSeasonSubmitStrategy,
  shouldShowGameSeasonCreateFork,
} from "../../site/js/create-season-fork-core.mjs";
import {
  gameSeasonIdFieldUiState,
  gameSeasonSubmitButtonLabel,
} from "../../site/js/create-season-fork-ui-core.mjs";

const deployRoot = {
  pilot_template: "general",
  profile_id: "p_deploy",
  owner_private_key_b58: "priv",
};

const seasonRoot = {
  pilot_template: "general",
  profile_id: "p_season",
  owner_private_key_b58: "priv",
  issuer_public_key: "org_pub",
};

describe("resolveGameSeasonSubmitStrategy", () => {
  it("redirects when a season root with organizer key exists", () => {
    expect(
      resolveGameSeasonSubmitStrategy({
        searchParams: new URLSearchParams("intent=game"),
        walletEntries: [seasonRoot],
      })
    ).toBe("redirect_live");
  });

  it("requires fork choice when no season root exists", () => {
    expect(
      resolveGameSeasonSubmitStrategy({
        searchParams: new URLSearchParams("intent=game"),
        walletEntries: [deployRoot],
      })
    ).toBe("fork_choose");
  });

  it("continues on deploy root when fork is existing", () => {
    expect(
      resolveGameSeasonSubmitStrategy({
        searchParams: new URLSearchParams(`intent=game&season_account=${GAME_SEASON_FORK_EXISTING}`),
        walletEntries: [deployRoot],
      })
    ).toBe("use_existing_account");
  });

  it("creates dual-skin root when fork is existing and wallet is empty", () => {
    expect(
      resolveGameSeasonSubmitStrategy({
        searchParams: new URLSearchParams(`intent=game&season_account=${GAME_SEASON_FORK_EXISTING}`),
        walletEntries: [],
      })
    ).toBe("create_dual_skin_root");
  });

  it("creates season-only root when fork is dedicated", () => {
    expect(
      resolveGameSeasonSubmitStrategy({
        searchParams: new URLSearchParams(`intent=game&season_account=${GAME_SEASON_FORK_DEDICATED}`),
        walletEntries: [deployRoot],
      })
    ).toBe("create_season_only_root");
  });
});

describe("gameSeasonForkCardCopy", () => {
  it("labels both fork paths", () => {
    expect(gameSeasonForkCardCopy(GAME_SEASON_FORK_EXISTING).title).toContain("@handle");
    expect(gameSeasonForkCardCopy(GAME_SEASON_FORK_DEDICATED).title).toContain("Separate season");
  });
});

describe("fork ui helpers", () => {
  it("shows fork panel only for fork_choose", () => {
    expect(shouldShowGameSeasonCreateFork("fork_choose")).toBe(true);
    expect(shouldShowGameSeasonCreateFork("create_dual_skin_root")).toBe(false);
  });

  it("parses season_account param", () => {
    expect(readGameSeasonForkChoice(new URLSearchParams("season_account=existing"))).toBe(
      GAME_SEASON_FORK_EXISTING
    );
  });

  it("labels submit paths", () => {
    expect(gameSeasonSubmitButtonLabel("use_existing_account")).toContain("set up season");
    expect(gameSeasonSubmitButtonLabel("create_dual_skin_root")).toContain("Create @handle");
    expect(gameSeasonSubmitButtonLabel("create_season_only_root")).toContain("season @handle");
  });

  it("never shows season id on /create/ — canonical home is Live When panel", () => {
    expect(gameSeasonIdFieldUiState("create_dual_skin_root").showSeasonIdField).toBe(false);
    expect(gameSeasonIdFieldUiState("use_existing_account").showSeasonIdField).toBe(false);
    expect(gameSeasonIdFieldUiState("create_season_only_root").showSeasonIdField).toBe(false);
    expect(gameSeasonIdFieldUiState("create_season_only_root").redirectHint).toContain("Live");
  });
});
