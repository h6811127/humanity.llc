import { describe, expect, it } from "vitest";

import {
  deterministicExplainSnapshot,
  validateExplainSnapshotInput,
} from "../src/resolver/ai-explain-core";

describe("ai-explain-core", () => {
  it("validates a well-formed public_snapshot", () => {
    const result = validateExplainSnapshotInput({
      public_snapshot: {
        text: "Studio door · Open until 9 PM",
        fields: [
          { key: "object", value: "Studio door" },
          { key: "status", value: "Open until 9 PM" },
        ],
      },
    });
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.fields).toHaveLength(2);
    }
  });

  it("rejects missing public_snapshot", () => {
    const result = validateExplainSnapshotInput({});
    expect(result).toEqual({ error: "public_snapshot is required." });
  });

  it("builds deterministic summary from fields", () => {
    const summary = deterministicExplainSnapshot({
      text: "Studio door · Open until 9 PM",
      fields: [
        { key: "object", value: "Studio door" },
        { key: "status", value: "Open until 9 PM" },
      ],
    });
    expect(summary).toContain("Studio door");
    expect(summary).toContain("Open until 9 PM");
  });
});
