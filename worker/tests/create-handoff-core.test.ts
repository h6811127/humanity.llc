import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  CREATE_HANDOFF_SESSION_KEY,
  buildCreateHandoffPayload,
  clearCreateHandoff,
  createHandoffAppliesToSession,
  createHandoffDetailLine,
  readCreateHandoff,
  redirectOpenStatusForDeploy,
  redirectOpenStatusForSeason,
  redirectOpenStatusForWear,
  writeCreateHandoff,
} from "../../site/js/create-handoff-core.mjs";

function installSessionStorage(seed: Record<string, string | null> = {}) {
  const storage: Record<string, string | null> = { ...seed };
  globalThis.sessionStorage = {
    getItem(key: string) {
      return storage[key] ?? null;
    },
    setItem(key: string, value: string) {
      storage[key] = String(value);
    },
    removeItem(key: string) {
      storage[key] = null;
    },
  } as Storage;
  return storage;
}

describe("create-handoff-core", () => {
  beforeEach(() => {
    installSessionStorage();
  });

  afterEach(() => {
    delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
  });

  it("builds handoff payloads with @handle labels", () => {
    const payload = buildCreateHandoffPayload("deploy_sign", {
      handle: "river_studio",
      profile_id: "prof1",
    });
    expect(payload.kind).toBe("deploy_sign");
    expect(payload.handle).toBe("@river_studio");
    expect(typeof payload.at).toBe("number");
  });

  it("round-trips valid handoffs through sessionStorage", () => {
    writeCreateHandoff({
      kind: "wear",
      handle: "@river_studio",
      at: 1_700_000_000_000,
    });
    expect(readCreateHandoff()).toEqual({
      kind: "wear",
      handle: "@river_studio",
      at: 1_700_000_000_000,
    });
    clearCreateHandoff();
    expect(readCreateHandoff()).toBeNull();
  });

  it("rejects unknown kinds and non-object payloads", () => {
    const storage = installSessionStorage({
      [CREATE_HANDOFF_SESSION_KEY]: JSON.stringify({
        kind: "deploy_status",
        handle: "@river_studio",
        at: 1,
      }),
    });
    expect(readCreateHandoff()).toBeNull();

    storage[CREATE_HANDOFF_SESSION_KEY] = JSON.stringify(["deploy_sign"]);
    expect(readCreateHandoff()).toBeNull();

    storage[CREATE_HANDOFF_SESSION_KEY] = "{not-json";
    expect(readCreateHandoff()).toBeNull();

    storage[CREATE_HANDOFF_SESSION_KEY] = JSON.stringify({
      kind: "season",
      handle: 42,
      at: "soon",
    });
    expect(readCreateHandoff()).toEqual({
      kind: "season",
      handle: "",
      at: 0,
    });
  });

  it("applies handoffs only to the matching saved account", () => {
    expect(createHandoffAppliesToSession(null, { handle: "river_studio" })).toBe(false);

    const handoff = { kind: "season" as const, handle: "@river_studio", at: 1 };
    expect(createHandoffAppliesToSession(handoff, { handle: "river_studio" })).toBe(true);
    expect(createHandoffAppliesToSession(handoff, { handle: "@river_studio" })).toBe(true);
    expect(createHandoffAppliesToSession(handoff, { handle: "other_studio" })).toBe(false);

    // Empty handles are treated as apply-all (avoid dropping handoff before session hydrates).
    expect(createHandoffAppliesToSession(handoff, { handle: "" })).toBe(true);
    expect(
      createHandoffAppliesToSession(
        { kind: "wear", handle: "", at: 1 },
        { handle: "river_studio" }
      )
    ).toBe(true);
  });

  it("keeps redirect status and detail copy task-specific", () => {
    const root = { handle: "river_studio", profile_id: "prof1" };
    expect(redirectOpenStatusForDeploy("status_plate", root)).toBe(
      "Opening @river_studio to add your sign…"
    );
    expect(redirectOpenStatusForDeploy("lost_item_relay", root)).toBe(
      "Opening @river_studio to add your return tag…"
    );
    expect(redirectOpenStatusForDeploy("status_plate", null)).toBe(
      "Opening Live to add your sign…"
    );
    expect(redirectOpenStatusForWear(root)).toBe(
      "Opening @river_studio for your wearable QR…"
    );
    expect(redirectOpenStatusForSeason(null)).toBe("Opening Live for season setup…");

    expect(createHandoffDetailLine("deploy_sign", "@river_studio")).toContain(
      "add your sign there"
    );
    expect(createHandoffDetailLine("deploy_relay", "@river_studio")).toContain(
      "add your return tag there"
    );
    expect(createHandoffDetailLine("wear", "")).toBe(
      "Continue on Live for your wearable QR."
    );
    expect(createHandoffDetailLine("season", "@river_studio")).toContain("season setup");
  });
});
