import { describe, expect, it } from "vitest";

import {
  PILOT_STEWARD_COPY,
  applyHubControlPlainLabels,
  formatRevokeSummarySub,
  normalizePilotTemplate,
  revokeNetworkHintForPilot,
  stewardCopyForPilot,
} from "../../site/js/pilot-steward-copy.mjs";

describe("pilot-steward-copy", () => {
  it("normalizes unknown pilots to general", () => {
    expect(normalizePilotTemplate("status_plate")).toBe("status_plate");
    expect(normalizePilotTemplate(undefined)).toBe("general");
  });

  it("status plate uses plain turn-off tag language", () => {
    const copy = stewardCopyForPilot("status_plate");
    expect(copy.revokeQrBtn).toBe("Turn off this tag");
    expect(copy.hubRevokeQr).toBe("Turn off tag");
    expect(copy.publishBtn).toBe("Publish status update");
  });

  it("formatRevokeSummarySub simplifies status plate network line", () => {
    expect(formatRevokeSummarySub("active", "active", "active", "status_plate")).toMatch(
      /Plate is live/
    );
    expect(formatRevokeSummarySub("qr_revoked", "active", "revoked", "general")).toMatch(
      /QR revoked/
    );
  });

  it("revokeNetworkHintForPilot returns plate-specific hints", () => {
    expect(revokeNetworkHintForPilot("status_plate", "active")).toMatch(/Turning off the tag/);
    expect(revokeNetworkHintForPilot("general", "active")).toBeNull();
  });

  it("applyHubControlPlainLabels maps hub menu labels", () => {
    const out = applyHubControlPlainLabels(
      [
        { id: "update-status", label: "Update status" },
        { id: "revoke-qr", label: "Revoke QR" },
      ],
      "status_plate"
    );
    expect(out[0].label).toBe(PILOT_STEWARD_COPY.status_plate.hubUpdateStatus);
    expect(out[1].label).toBe(PILOT_STEWARD_COPY.status_plate.hubRevokeQr);
  });
});
