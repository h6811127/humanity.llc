import { describe, expect, it } from "vitest";

import { resolveLandingContinue } from "../../site/js/landing-progress-core.mjs";

describe("resolveLandingContinue", () => {
  it("empty wallet → Create with neutral legend", () => {
    const r = resolveLandingContinue({ wallet: [], pins: [], setupDone: {} });
    expect(r.label).toBe("Create your first live object");
    expect(r.href).toBe("/create/");
    expect(r.legendStep).toBe(1);
    expect(r.legendDone).toEqual([]);
  });

  it("unsaved tab keys → Save keys via wallet hub", () => {
    const r = resolveLandingContinue({
      wallet: [],
      unsavedTabKeys: true,
    });
    expect(r.label).toBe("Save keys on this device");
    expect(r.href).toBe("/wallet/");
    expect(r.legendStep).toBe(2);
    expect(r.legendDone).toEqual([1]);
  });

  it("wallet without setup done → Print via wallet hub", () => {
    const r = resolveLandingContinue({
      wallet: [{ profile_id: "p1" }],
      pins: [],
      setupDone: {},
    });
    expect(r.label).toBe("Print your QR");
    expect(r.href).toBe("/wallet/");
    expect(r.legendStep).toBe(3);
    expect(r.legendDone).toEqual([1, 2]);
  });

  it("wallet with setup done but no pins → Print", () => {
    const r = resolveLandingContinue({
      wallet: [{ profile_id: "p1" }],
      pins: [],
      setupDone: { p1: true },
    });
    expect(r.label).toBe("Print your QR");
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
