import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  registerChildObjectAndIssueScanLink: vi.fn(),
}));

vi.mock("../../site/js/child-object-register-issue.mjs", () => ({
  registerChildObjectAndIssueScanLink: mocks.registerChildObjectAndIssueScanLink,
}));

vi.mock("../../site/js/create-live-handoff.mjs", () => ({
  handoffToCreatedForWalletEntry: vi.fn(),
}));

vi.mock("../../site/js/device-wallet.mjs", () => ({
  loadWallet: vi.fn(() => []),
}));

function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

describe("runDeployRootAndChildCreate", () => {
  let sessionStorageMock: ReturnType<typeof makeStorage>;
  let localStorageMock: ReturnType<typeof makeStorage>;
  let replace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mocks.registerChildObjectAndIssueScanLink.mockReset();
    sessionStorageMock = makeStorage();
    localStorageMock = makeStorage();
    replace = vi.fn();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: sessionStorageMock,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: {
        origin: "https://humanity.llc",
        replace,
      },
    });
  });

  afterEach(() => {
    // @ts-expect-error test global cleanup
    delete globalThis.sessionStorage;
    // @ts-expect-error test global cleanup
    delete globalThis.localStorage;
    // @ts-expect-error test global cleanup
    delete globalThis.location;
  });

  it("reuses the matching tab root when retrying after child create failed", async () => {
    const { runDeployRootAndChildCreate } = await import(
      "../../site/js/create-deploy-submit.mjs"
    );
    sessionStorageMock.setItem(
      "hc_created",
      JSON.stringify({
        profile_id: "prof_retry",
        handle: "front-door",
        owner_private_key_b58: "priv_retry",
        owner_public_key_b58: "pub_retry",
      })
    );
    mocks.registerChildObjectAndIssueScanLink.mockResolvedValueOnce({
      objectId: "obj_sign",
      objectType: "status_plate",
      publicLabel: "Front door",
      publicState: "Open",
      createdAt: "2026-06-18T11:00:00.000Z",
      scanUrl: "https://humanity.llc/c/prof_retry?q=qr_child",
      qrId: "qr_child",
      issueFailed: false,
    });
    const runCreateCard = vi.fn(async () => {
      throw new Error("duplicate root create should not run");
    });

    await runDeployRootAndChildCreate(
      "status_plate",
      {
        objectLabel: "Front door",
        statusLine: "Open",
        relayItem: "",
        relayMessage: "",
      },
      {
        handle: "@front-door",
        wantRecovery: false,
        qrValidityDays: 365,
        organizer: { enabled: false },
        runCreateCard,
      }
    );

    expect(runCreateCard).not.toHaveBeenCalled();
    expect(mocks.registerChildObjectAndIssueScanLink).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: "prof_retry",
        privateKeyBase58: "priv_retry",
        publicKeyBase58: "pub_retry",
      })
    );
    const url = new URL(String(replace.mock.calls[0][0]));
    expect(url.searchParams.get("profile_id")).toBe("prof_retry");
    expect(url.searchParams.get("qr_id")).toBe("qr_child");
    expect(url.searchParams.get("deploy_success")).toBe("1");
  });

  it("does not promote the root QR when child issue-qr fails after create", async () => {
    const { runDeployRootAndChildCreate } = await import(
      "../../site/js/create-deploy-submit.mjs"
    );
    mocks.registerChildObjectAndIssueScanLink.mockResolvedValueOnce({
      objectId: "obj_sign",
      objectType: "status_plate",
      publicLabel: "Front door",
      publicState: "Open",
      createdAt: "2026-06-18T11:00:00.000Z",
      scanUrl: null,
      qrId: null,
      issueFailed: true,
      issueError: "issue-qr failed",
    });

    await runDeployRootAndChildCreate(
      "status_plate",
      {
        objectLabel: "Front door",
        statusLine: "Open",
        relayItem: "",
        relayMessage: "",
      },
      {
        handle: "front-door",
        wantRecovery: false,
        qrValidityDays: 365,
        organizer: { enabled: false },
        runCreateCard: vi.fn(async () => ({
          profileId: "prof_root",
          qrId: "qr_root",
          session: {
            owner_private_key_b58: "priv_root",
            owner_public_key_b58: "pub_root",
          },
        })),
      }
    );

    const url = new URL(String(replace.mock.calls[0][0]));
    expect(url.searchParams.get("profile_id")).toBe("prof_root");
    expect(url.searchParams.has("qr_id")).toBe(false);
    expect(url.searchParams.has("deploy_success")).toBe(false);
    expect(url.hash).toBe("#child-object-obj_sign");
  });
});
