import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  cardQrBindingFromCardDocument,
  cardQrBindingFromSession,
  cardQrBindingFromStatusPayload,
  isValidCardQrBinding,
  resolveCardQrBinding,
  sessionCardQrId,
} from "../../site/js/created-card-qr-binding-core.mjs";

const repoRoot = path.join(fileURLToPath(new URL("../..", import.meta.url)));

describe("card QR public-copy binding", () => {
  it("accepts only a non-empty qr id plus integer epoch >= 1", () => {
    expect(isValidCardQrBinding({ active_qr_id: "qr_live", epoch: 2 })).toBe(true);
    expect(isValidCardQrBinding({ active_qr_id: "qr_live", epoch: 1 })).toBe(true);
    expect(isValidCardQrBinding({ active_qr_id: "qr_live", epoch: 0 })).toBe(false);
    expect(isValidCardQrBinding({ active_qr_id: "", epoch: 2 })).toBe(false);
    expect(isValidCardQrBinding({ active_qr_id: "qr_live", epoch: 2.5 })).toBe(false);
    expect(isValidCardQrBinding(null)).toBe(false);
  });

  it("does not invent epoch 1 from session qr_id alone", () => {
    expect(sessionCardQrId({ qr_id: "qr_live" })).toBe("qr_live");
    expect(cardQrBindingFromSession({ qr_id: "qr_live" })).toBeNull();
    expect(cardQrBindingFromSession({ qr_id: "qr_live", qr_epoch: 3 })).toEqual({
      active_qr_id: "qr_live",
      epoch: 3,
    });
  });

  it("reads epoch from status (qr_credentials) not poisoned card JSON", () => {
    expect(
      cardQrBindingFromStatusPayload(
        { scan: { qr_id: "qr_live", qr: { epoch: 3, status: "active" } } },
        "qr_fallback"
      )
    ).toEqual({ active_qr_id: "qr_live", epoch: 3 });
    expect(
      cardQrBindingFromCardDocument({
        qr: { active_qr_id: "qr_live", epoch: 1 },
      })
    ).toEqual({ active_qr_id: "qr_live", epoch: 1 });
  });

  it("prefers session, then status, and never falls back to hardcoded epoch 1", async () => {
    await expect(
      resolveCardQrBinding({
        profileId: "prof_1",
        session: { qr_id: "qr_live" },
      })
    ).rejects.toThrow(/QR epoch/);

    const fromSession = await resolveCardQrBinding({
      profileId: "prof_1",
      session: { qr_id: "qr_live", qr_epoch: 4 },
      fetchStatus: async () => {
        throw new Error("status must not run when session epoch is present");
      },
    });
    expect(fromSession).toEqual({ active_qr_id: "qr_live", epoch: 4 });

    const fromStatus = await resolveCardQrBinding({
      profileId: "prof_1",
      session: { qr_id: "qr_live" },
      fetchStatus: async () =>
        new Response(
          JSON.stringify({
            scan: { qr_id: "qr_live", qr: { epoch: 3 } },
          }),
          { status: 200 }
        ),
      fetchCard: async () =>
        new Response(
          JSON.stringify({ qr: { active_qr_id: "qr_live", epoch: 1 } }),
          { status: 200 }
        ),
    });
    expect(fromStatus).toEqual({ active_qr_id: "qr_live", epoch: 3 });
  });
});

describe("created publish paths do not hardcode qr.epoch 1", () => {
  it("manifesto update and focused-object resolve binding instead of epoch: 1", () => {
    const manifesto = fs.readFileSync(
      path.join(repoRoot, "site/js/created-manifesto-update.mjs"),
      "utf8"
    );
    const focused = fs.readFileSync(
      path.join(repoRoot, "site/js/created-focused-object.mjs"),
      "utf8"
    );
    const rotate = fs.readFileSync(
      path.join(repoRoot, "site/js/created-qr-rotate.mjs"),
      "utf8"
    );
    expect(manifesto).toContain("resolveCreatedCardQrBinding");
    expect(manifesto).not.toMatch(/epoch:\s*1/);
    expect(focused).toContain("resolveCreatedCardQrBinding");
    expect(focused).not.toMatch(/epoch:\s*1/);
    expect(rotate).toContain("resolveCreatedCardQrBinding");
  });
});
