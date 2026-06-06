import { describe, expect, it } from "vitest";

import {
  CREATE_ENTRY_GATE_BYPASS_KEY,
  isCreatePilotFieldKitEntry,
  readCreateEntryGateBypass,
  resolveCreateEntryGate,
  resolveCreateEntryStateId,
  sessionHasKeysForPreferredRoot,
  writeCreateEntryGateBypass,
} from "../../site/js/create-entry-state-core.mjs";
import {
  createEntryGateLiveHref,
  createEntryGatePresentation,
} from "../../site/js/create-entry-state-ui-core.mjs";

const GENERAL_ROOT = {
  pilot_template: "general",
  profile_id: "prof_entry_state_root",
  qr_id: "qr_entry_state_root",
  handle: "river_studio",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  scan_url: "https://humanity.llc/c/prof_entry_state_root?q=qr_entry_state_root",
};

const SESSION_WITH_KEYS = {
  profile_id: GENERAL_ROOT.profile_id,
  qr_id: GENERAL_ROOT.qr_id,
  handle: GENERAL_ROOT.handle,
  owner_private_key_b58: GENERAL_ROOT.owner_private_key_b58,
};

/** @type {Storage} */
const storage = {
  data: new Map(),
  getItem(key) {
    return this.data.get(key) ?? null;
  },
  setItem(key, value) {
    this.data.set(key, value);
  },
  removeItem(key) {
    this.data.delete(key);
  },
};

describe("resolveCreateEntryStateId", () => {
  it("returns wrong_context when ephemeral browsing", () => {
    expect(
      resolveCreateEntryStateId({
        searchParams: new URLSearchParams("intent=deploy"),
        walletEntries: [],
        session: null,
        ephemeralBrowsing: true,
      })
    ).toBe("wrong_context");
  });

  it("returns new_device when no saved root on deploy intent", () => {
    expect(
      resolveCreateEntryStateId({
        searchParams: new URLSearchParams("intent=deploy"),
        walletEntries: [],
        session: null,
      })
    ).toBe("new_device");
  });

  it("returns returning_session when tab session matches saved root", () => {
    expect(
      resolveCreateEntryStateId({
        searchParams: new URLSearchParams("intent=deploy"),
        walletEntries: [GENERAL_ROOT],
        session: SESSION_WITH_KEYS,
      })
    ).toBe("returning_session");
  });

  it("returns returning_wallet when root is saved but session is empty", () => {
    expect(
      resolveCreateEntryStateId({
        searchParams: new URLSearchParams("intent=deploy"),
        walletEntries: [GENERAL_ROOT],
        session: null,
      })
    ).toBe("returning_wallet");
  });

  it("returns wrong_context when keys are open in another tab", () => {
    expect(
      resolveCreateEntryStateId({
        searchParams: new URLSearchParams("intent=deploy"),
        walletEntries: [{ profile_id: GENERAL_ROOT.profile_id, handle: "river_studio" }],
        session: null,
        crossTabProfileIds: [GENERAL_ROOT.profile_id],
      })
    ).toBe("wrong_context");
  });

  it("returns pilot for field-kit template without saved root", () => {
    expect(
      resolveCreateEntryStateId({
        searchParams: new URLSearchParams("template=status_plate"),
        walletEntries: [],
        session: null,
      })
    ).toBe("pilot");
  });

  it("respects gate bypass flag", () => {
    expect(
      resolveCreateEntryStateId({
        searchParams: new URLSearchParams("intent=deploy"),
        walletEntries: [GENERAL_ROOT],
        session: null,
        gateBypass: true,
      })
    ).toBe("new_device");
  });
});

describe("resolveCreateEntryGate", () => {
  it("shows continue_live gate for returning session on deploy", () => {
    const gate = resolveCreateEntryGate({
      searchParams: new URLSearchParams("intent=deploy"),
      walletEntries: [GENERAL_ROOT],
      session: SESSION_WITH_KEYS,
    });
    expect(gate.showGate).toBe(true);
    expect(gate.stateId).toBe("returning_session");
    expect(gate.gateKind).toBe("continue_live");
    expect(gate.handoffKind).toBe("deploy_sign");
  });

  it("shows unlock_wallet gate when root saved without session", () => {
    const gate = resolveCreateEntryGate({
      searchParams: new URLSearchParams("intent=deploy"),
      walletEntries: [GENERAL_ROOT],
      session: null,
    });
    expect(gate.showGate).toBe(true);
    expect(gate.gateKind).toBe("unlock_wallet");
  });

  it("hides gate for new_device path", () => {
    const gate = resolveCreateEntryGate({
      searchParams: new URLSearchParams("intent=deploy"),
      walletEntries: [],
      session: null,
    });
    expect(gate.showGate).toBe(false);
    expect(gate.stateId).toBe("new_device");
  });
});

describe("sessionHasKeysForPreferredRoot", () => {
  it("matches profile_id and signing keys", () => {
    expect(sessionHasKeysForPreferredRoot(SESSION_WITH_KEYS, GENERAL_ROOT)).toBe(true);
    expect(
      sessionHasKeysForPreferredRoot(
        { ...SESSION_WITH_KEYS, profile_id: "other" },
        GENERAL_ROOT
      )
    ).toBe(false);
  });
});

describe("create entry gate bypass storage", () => {
  it("stores intent|template scoped bypass", () => {
    storage.data.clear();
    writeCreateEntryGateBypass(storage, new URLSearchParams("intent=deploy"));
    expect(readCreateEntryGateBypass(storage, new URLSearchParams("intent=deploy"))).toBe(
      true
    );
    expect(readCreateEntryGateBypass(storage, new URLSearchParams("intent=wear"))).toBe(
      false
    );
    expect(storage.getItem(CREATE_ENTRY_GATE_BYPASS_KEY)).toBe("deploy|");
  });
});

describe("createEntryGatePresentation", () => {
  it("uses Live continue copy for deploy sign", () => {
    const copy = createEntryGatePresentation(
      "continue_live",
      "deploy_sign",
      GENERAL_ROOT,
      "status_plate"
    );
    expect(copy.primaryLabel).toContain("@river_studio");
    expect(copy.body).toMatch(/sign/i);
  });

  it("routes wrong_context primary to wallet", () => {
    const copy = createEntryGatePresentation(
      "wrong_context",
      "deploy_sign",
      GENERAL_ROOT,
      "status_plate"
    );
    expect(copy.primaryHref).toBe("/wallet/");
  });
});

describe("isCreatePilotFieldKitEntry", () => {
  it("is true only for template deep links", () => {
    expect(isCreatePilotFieldKitEntry(new URLSearchParams("template=status_plate"))).toBe(
      true
    );
    expect(isCreatePilotFieldKitEntry(new URLSearchParams("intent=deploy"))).toBe(false);
  });
});

describe("createEntryGateLiveHref", () => {
  it("builds add-sign hash for deploy handoff", () => {
    const href = createEntryGateLiveHref(
      GENERAL_ROOT,
      "deploy_sign",
      "status_plate",
      "https://humanity.llc"
    );
    expect(href).toContain("/created/");
    expect(href).toContain("#add-status-plate");
  });
});
