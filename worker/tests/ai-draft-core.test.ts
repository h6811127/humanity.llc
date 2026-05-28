import { describe, expect, it } from "vitest";

import {
  deterministicDraftManifesto,
  parseAiDraftPayload,
  validateDraftRequest,
} from "../src/resolver/ai-draft-core";

describe("ai-draft-core", () => {
  it("validates draft request for status_plate", () => {
    const result = validateDraftRequest({
      pilot_template: "status_plate",
      hint: "Garden gate · closed for inventory",
    });
    expect("error" in result).toBe(false);
  });

  it("rejects invalid pilot_template", () => {
    expect(validateDraftRequest({ pilot_template: "invalid" })).toEqual({
      error: "pilot_template must be status_plate, general, or lost_item_relay.",
    });
  });

  it("builds deterministic status_plate draft from hint", () => {
    const draft = deterministicDraftManifesto({
      pilot_template: "status_plate",
      hint: "Studio door, closed until Monday",
    });
    expect(draft.object_label).toBeTruthy();
    expect(draft.status_line).toBeTruthy();
    expect(draft.manifesto_line).toContain("\n");
  });

  it("accepts up to four current object_streams in request body", () => {
    const result = validateDraftRequest({
      pilot_template: "general",
      current: {
        object_streams: [
          { label: "A", value: "1", class: "place" },
          { label: "B", value: "2", class: "care" },
          { label: "C", value: "3", class: "narrative" },
          { label: "D", value: "4", class: "route" },
        ],
      },
    });
    expect("error" in result).toBe(false);
  });

  it("parses AI JSON payload for lost_item_relay", () => {
    const parsed = parseAiDraftPayload(
      {
        relay_item: "Keys",
        relay_message: "Found at front desk — thank you",
      },
      "lost_item_relay"
    );
    expect("error" in parsed).toBe(false);
    if (!("error" in parsed)) {
      expect(parsed.manifesto_line).toContain("[relay] Keys");
    }
  });
});
