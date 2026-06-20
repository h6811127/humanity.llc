import { beforeEach, describe, expect, it, vi } from "vitest";

import { childObjectsBucketKey } from "../../site/js/child-object-store-core.mjs";

const mocks = vi.hoisted(() => ({
  registerChildObjectAndIssueScanLink: vi.fn(),
}));

vi.mock("../../site/js/child-object-register-issue.mjs", () => ({
  registerChildObjectAndIssueScanLink: mocks.registerChildObjectAndIssueScanLink,
}));

vi.mock("../../site/js/device-wallet.mjs", () => ({
  loadWallet: () => [],
}));

import { runDeployRootAndChildCreate } from "../../site/js/create-deploy-submit.mjs";

function storageFor() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
}

function createCtx() {
  return {
    handle: "studio",
    wantRecovery: true,
    qrValidityDays: 30,
    organizer: { mode: "full_keys" },
    runCreateCard: vi.fn(async () => ({
      profileId: "prof_root_01",
      qrId: "qr_root_01",
      session: {
        owner_private_key_b58: "owner_private",
        owner_public_key_b58: "owner_public",
      },
    })),
  };
}

const fields = {
  objectLabel: "Studio door",
  statusLine: "Open today",
  relayItem: "Studio door",
  relayMessage: "Open today",
};

describe("runDeployRootAndChildCreate", () => {
  beforeEach(() => {
    mocks.registerChildObjectAndIssueScanLink.mockReset();
  });

  it("redirects to the minted child QR after root + child deploy succeeds", async () => {
    const localStorage = storageFor();
    const replace = vi.fn();
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("location", {
      origin: "https://humanity.llc",
      replace,
    });

    mocks.registerChildObjectAndIssueScanLink.mockResolvedValueOnce({
      objectId: "obj_child_01",
      objectType: "status_plate",
      publicLabel: "Studio door",
      publicState: "Open today",
      createdAt: "2026-06-20T11:00:00.000Z",
      scanUrl: "https://humanity.llc/c/prof_root_01?q=qr_child_01",
      qrId: "qr_child_01",
      issueFailed: false,
    });

    await runDeployRootAndChildCreate("status_plate", fields, createCtx());

    const href = String(replace.mock.calls[0]?.[0] ?? "");
    const url = new URL(href);
    expect(url.searchParams.get("qr_id")).toBe("qr_child_01");
    expect(url.searchParams.get("object_id")).toBe("obj_child_01");
  });

  it("does not substitute the root QR when child issue-qr fails", async () => {
    const localStorage = storageFor();
    const replace = vi.fn();
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("location", {
      origin: "https://humanity.llc",
      replace,
    });

    mocks.registerChildObjectAndIssueScanLink.mockResolvedValueOnce({
      objectId: "obj_child_02",
      objectType: "status_plate",
      publicLabel: "Studio door",
      publicState: "Open today",
      createdAt: "2026-06-20T11:00:00.000Z",
      scanUrl: null,
      qrId: null,
      issueFailed: true,
      issueError: "issue-qr failed",
    });

    await runDeployRootAndChildCreate("status_plate", fields, createCtx());

    const href = String(replace.mock.calls[0]?.[0] ?? "");
    const url = new URL(href);
    expect(url.searchParams.get("qr_id")).toBeNull();
    expect(href).not.toContain("qr_root_01");
    expect(url.searchParams.get("object_id")).toBe("obj_child_02");

    const rows = JSON.parse(
      localStorage.getItem(childObjectsBucketKey("prof_root_01")) ?? "[]"
    );
    expect(rows).toEqual([
      expect.objectContaining({
        object_id: "obj_child_02",
        object_type: "status_plate",
      }),
    ]);
    expect(rows[0]).not.toHaveProperty("qr_id");
    expect(rows[0]).not.toHaveProperty("scan_url");
  });
});
