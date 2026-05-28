import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STEWARD_PENDING_ACCOUNT_STORAGE_KEY } from "../../site/js/device-steward-session-core.mjs";

vi.mock("../../site/js/hc-sign.mjs", () => ({
  decodePrivateKeyBase58: () => new Uint8Array(32),
  randomBase58: () => "nonce_test",
  resolverApiOrigin: () => "https://resolver.test",
  signDocument: async (doc: unknown) => doc,
  withProtocolFields: (doc: unknown) => doc,
}));

const walletRows: Array<Record<string, unknown>> = [];

vi.mock("../../site/js/device-wallet.mjs", () => ({
  loadWallet: () => walletRows,
}));

vi.mock("../../site/js/device-keys.mjs", () => ({
  getTabSession: () => {
    const raw = sessionStorage.getItem("hc_created");
    return raw ? JSON.parse(raw) : null;
  },
  activateWalletEntry: (entry: Record<string, unknown>) => {
    sessionStorage.setItem("hc_created", JSON.stringify(entry));
    window.dispatchEvent(new Event("hc-device-hub-changed"));
  },
}));

vi.mock("../../site/js/device-steward-entitlements.mjs", () => ({
  getOrCreateStewardDeviceId: () => "dev-test-device",
  readStewardSessionToken: () => {
    const raw = sessionStorage.getItem("hc_steward_session");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed?.token === "string" ? parsed.token : null;
    } catch {
      return null;
    }
  },
  refreshStewardEntitlements: vi.fn(async () => ({})),
  writeStewardSession: (session: { token: string; account_id?: string }) => {
    sessionStorage.setItem("hc_steward_session", JSON.stringify(session));
  },
}));

function storageFor(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
}

async function importSession() {
  return import("../../site/js/device-steward-session.mjs");
}

describe("device-steward-session billing return", () => {
  let sessionStore: ReturnType<typeof storageFor>;

  beforeEach(() => {
    vi.resetModules();
    walletRows.length = 0;
    sessionStore = storageFor();
    vi.stubGlobal("sessionStorage", sessionStore);
    vi.stubGlobal("localStorage", storageFor());
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
    });
    vi.stubGlobal("location", {
      href: "https://humanity.llc/?hc_account_id=acc_TestHostedSteward1",
      search: "?hc_account_id=acc_TestHostedSteward1",
      origin: "https://humanity.llc",
    });
    vi.stubGlobal("history", { replaceState: vi.fn(), state: null });
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ token: "tok-test", account_id: "acc_TestHostedSteward1" }),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("captures pending account id from checkout return URL", async () => {
    const mod = await importSession();
    mod.captureStewardAccountIdFromUrl();
    expect(sessionStore.getItem(STEWARD_PENDING_ACCOUNT_STORAGE_KEY)).toBe(
      "acc_TestHostedSteward1"
    );
  });

  it("does not strip checkout param when link fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => JSON.stringify({ message: "Unavailable" }),
    } as Response);
    sessionStorage.setItem(
      "hc_created",
      JSON.stringify({
        profile_id: "p1",
        owner_private_key_b58: "priv",
        owner_public_key_b58: "pub",
      })
    );

    const mod = await importSession();
    const linked = await mod.tryCompleteStewardAccountLinkFromUrl();

    expect(linked).toBe(false);
    expect(history.replaceState).not.toHaveBeenCalled();
    expect(sessionStore.getItem(STEWARD_PENDING_ACCOUNT_STORAGE_KEY)).toBe(
      "acc_TestHostedSteward1"
    );
  });

  it("links account and clears pending when keys are active", async () => {
    sessionStorage.setItem(
      "hc_created",
      JSON.stringify({
        profile_id: "p1",
        owner_private_key_b58: "priv",
        owner_public_key_b58: "pub",
      })
    );

    const mod = await importSession();
    const linked = await mod.tryCompleteStewardAccountLinkFromUrl();

    expect(linked).toBe(true);
    expect(sessionStore.getItem("hc_steward_session")).toContain("tok-test");
    expect(sessionStore.getItem(STEWARD_PENDING_ACCOUNT_STORAGE_KEY)).toBeNull();
    expect(history.replaceState).toHaveBeenCalled();
  });

  it("activates wallet entry when checkout return includes profile_id", async () => {
    vi.stubGlobal("location", {
      href: "https://humanity.llc/wallet/?hc_account_id=acc_TestHostedSteward1&profile_id=p-wallet",
      search: "?hc_account_id=acc_TestHostedSteward1&profile_id=p-wallet",
      origin: "https://humanity.llc",
    });
    walletRows.push({
      profile_id: "p-wallet",
      owner_private_key_b58: "priv-wallet",
      owner_public_key_b58: "pub-wallet",
    });

    const mod = await importSession();
    expect(mod.tryActivateWalletForBillingReturn()).toBe(true);
    expect(JSON.parse(String(sessionStorage.getItem("hc_created"))).profile_id).toBe("p-wallet");
  });
});
