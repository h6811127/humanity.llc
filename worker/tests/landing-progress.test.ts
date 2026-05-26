import { describe, expect, it } from "vitest";

import {
  createdPageHref,
  pickResumeWalletEntry,
  resolveLandingContinue,
} from "../../site/js/landing-progress-core.mjs";

describe("createdPageHref", () => {
  it("builds created URLs with fresh and setup hash", () => {
    expect(createdPageHref("p1", "qr_abc", { fresh: true, hash: "setup" })).toBe(
      "/created/?profile_id=p1&qr_id=qr_abc&fresh=1#setup"
    );
    expect(createdPageHref("p1", null, { hash: "setup-qr" })).toBe(
      "/created/?profile_id=p1#setup-qr"
    );
  });
});

describe("pickResumeWalletEntry", () => {
  it("prefers session profile when saved on device", () => {
    const wallet = [{ profile_id: "a" }, { profile_id: "b" }];
    expect(pickResumeWalletEntry(wallet, { profile_id: "b" }, {})).toEqual({
      profile_id: "b",
    });
  });

  it("prefers first profile missing setup done", () => {
    const wallet = [{ profile_id: "a" }, { profile_id: "b" }];
    expect(pickResumeWalletEntry(wallet, null, { a: true })).toEqual({
      profile_id: "b",
    });
  });
});

describe("resolveLandingContinue", () => {
  it("empty wallet → Create with neutral legend", () => {
    const r = resolveLandingContinue({ wallet: [], pins: [], setupDone: {} });
    expect(r.label).toBe("Create your first live object");
    expect(r.href).toBe("/create/");
    expect(r.legendStep).toBe(1);
    expect(r.legendDone).toEqual([]);
  });

  it("unsaved tab keys → Save keys on /created setup", () => {
    const r = resolveLandingContinue({
      wallet: [],
      unsavedTabKeys: true,
      session: { profile_id: "p_tab", qr_id: "qr_tab123456789" },
    });
    expect(r.label).toBe("Save keys on this device");
    expect(r.href).toBe(
      "/created/?profile_id=p_tab&qr_id=qr_tab123456789&fresh=1#setup"
    );
    expect(r.legendStep).toBe(2);
    expect(r.legendDone).toEqual([1]);
  });

  it("wallet without setup done → Print on setup wizard (fresh + setup-qr)", () => {
    const r = resolveLandingContinue({
      wallet: [{ profile_id: "p1", qr_id: "qr_7Xk9mP2nQ4rT6vW8" }],
      pins: [],
      setupDone: {},
    });
    expect(r.label).toBe("Print your QR");
    expect(r.href).toBe(
      "/created/?profile_id=p1&qr_id=qr_7Xk9mP2nQ4rT6vW8&fresh=1#setup-qr"
    );
    expect(r.legendStep).toBe(3);
    expect(r.legendDone).toEqual([1, 2]);
  });

  it("wallet with setup done but no pins → Print on Live deploy panel", () => {
    const r = resolveLandingContinue({
      wallet: [{ profile_id: "p1", qr_id: "qr_1" }],
      pins: [],
      setupDone: { p1: true },
    });
    expect(r.label).toBe("Print your QR");
    expect(r.href).toBe("/created/?profile_id=p1&qr_id=qr_1#deploy-print");
    expect(r.legendStep).toBe(3);
  });

  it("wallet with setup done and pins → My cards", () => {
    const r = resolveLandingContinue({
      wallet: [{ profile_id: "p1" }, { profile_id: "p2" }],
      pins: [{ profile_id: "p1" }],
      setupDone: { p1: true, p2: true },
    });
    expect(r.label).toBe("Open My cards (2 saved)");
    expect(r.href).toBe("/wallet/");
    expect(r.legendStep).toBe(4);
    expect(r.legendDone).toEqual([1, 2, 3]);
  });

  it("single saved card uses singular My cards label", () => {
    const r = resolveLandingContinue({
      wallet: [{ profile_id: "p1" }],
      pins: [{}],
      setupDone: { p1: true },
    });
    expect(r.label).toBe("Open My cards");
    expect(r.legendStep).toBe(4);
  });
});
