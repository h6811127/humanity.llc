import { afterEach, describe, expect, it, vi } from "vitest";

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
import { syncCreateSeasonForkUi } from "../../site/js/create-season-fork.mjs";
import { CREATE_ENTRY_GATE_BYPASS_KEY } from "../../site/js/create-entry-state-core.mjs";

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

class FakeHTMLElement {
  hidden = false;
}

class FakeHTMLButtonElement extends FakeHTMLElement {
  disabled = false;
  dataset = {};
  classList = { toggle: vi.fn() };
  addEventListener = vi.fn();
  setAttribute = vi.fn();
  querySelector = vi.fn(() => ({ textContent: "" }));
}

function makeStorage(entries: [string, string][] = []) {
  const store = new Map(entries);
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
  };
}

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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("keeps fork chooser visible after entry-gate bypass with an existing season root", () => {
    const forkPanel = new FakeHTMLElement();
    const wizard = new FakeHTMLElement();
    const formMain = new FakeHTMLElement();
    const submit = new FakeHTMLButtonElement();
    const existingBtn = new FakeHTMLButtonElement();
    const dedicatedBtn = new FakeHTMLButtonElement();
    const localStorage = makeStorage([["hc_wallet", JSON.stringify([seasonRoot])]]);
    const sessionStorage = makeStorage([[CREATE_ENTRY_GATE_BYPASS_KEY, "game|"]]);

    vi.stubGlobal("HTMLElement", FakeHTMLElement);
    vi.stubGlobal("HTMLButtonElement", FakeHTMLButtonElement);
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("sessionStorage", sessionStorage);
    vi.stubGlobal("document", {
      getElementById: (id: string) => {
        if (id === "create-game-season-fork") return forkPanel;
        if (id === "create-game-season-wizard") return wizard;
        if (id === "create-form-main-fields") return formMain;
        if (id === "submit") return submit;
        if (id === "create-game-season-fork-existing") return existingBtn;
        if (id === "create-game-season-fork-dedicated") return dedicatedBtn;
        return null;
      },
    });

    syncCreateSeasonForkUi(new URLSearchParams("intent=game"));

    expect(forkPanel.hidden).toBe(false);
    expect(wizard.hidden).toBe(true);
    expect(formMain.hidden).toBe(true);
    expect(submit.disabled).toBe(true);
    expect(submit.hidden).toBe(false);
    expect(existingBtn.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
    expect(dedicatedBtn.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
  });
});
