import { describe, expect, it } from "vitest";

import { CRYPTO_ERROR, CryptoVerifyError } from "../src/crypto/errors";
import {
  objectStreamsFromChildDocumentJson,
  validateObjectStreamsField,
} from "../src/validation/object-streams";

function expectMissingField(doc: Record<string, unknown>, message: RegExp | string) {
  try {
    validateObjectStreamsField(doc);
    throw new Error("expected CryptoVerifyError");
  } catch (error) {
    expect(error).toBeInstanceOf(CryptoVerifyError);
    expect((error as CryptoVerifyError).code).toBe(CRYPTO_ERROR.MISSING_REQUIRED_FIELD);
    expect((error as CryptoVerifyError).message).toMatch(message);
  }
}

describe("validateObjectStreamsField", () => {
  it("returns an empty list when the field is absent", () => {
    expect(validateObjectStreamsField({ manifesto_line: "Open" })).toEqual([]);
  });

  it("normalizes a valid object_streams array", () => {
    expect(
      validateObjectStreamsField({
        object_streams: [
          { id: "tasks", class: "care", label: "Today", value: "Water bed 3" },
        ],
      })
    ).toEqual([{ id: "tasks", class: "care", label: "Today", value: "Water bed 3" }]);
  });

  it("accepts an explicit empty array", () => {
    expect(validateObjectStreamsField({ object_streams: [] })).toEqual([]);
  });

  it("wraps null or non-array object_streams as MISSING_REQUIRED_FIELD", () => {
    expectMissingField({ object_streams: null }, "object_streams must be an array.");
    expectMissingField({ object_streams: { id: "tasks" } }, "object_streams must be an array.");
  });

  it("wraps stream shape errors as MISSING_REQUIRED_FIELD", () => {
    expectMissingField(
      {
        object_streams: [
          { id: "tasks", class: "care", label: "Today", value: "One" },
          { id: "tasks", class: "place", label: "Tools", value: "Two" },
        ],
      },
      /Duplicate object_streams id/
    );
    expectMissingField(
      {
        object_streams: [
          { id: "note", class: "narrative", label: "<b>Note</b>", value: "Open late" },
        ],
      },
      /plain text without HTML/
    );
    expectMissingField(
      {
        object_streams: [
          { id: "one", class: "place", label: "A", value: "1" },
          { id: "two", class: "care", label: "B", value: "2" },
          { id: "three", class: "narrative", label: "C", value: "3" },
          { id: "four", class: "route", label: "D", value: "4" },
          { id: "five", class: "place", label: "E", value: "5" },
        ],
      },
      /at most 4 entries/
    );
  });
});

describe("objectStreamsFromChildDocumentJson", () => {
  it("returns [] for missing or unparseable documents", () => {
    expect(objectStreamsFromChildDocumentJson(null)).toEqual([]);
    expect(objectStreamsFromChildDocumentJson(undefined)).toEqual([]);
    expect(objectStreamsFromChildDocumentJson("")).toEqual([]);
    expect(objectStreamsFromChildDocumentJson("{not-json")).toEqual([]);
  });

  it("parses streams from a child document and ignores invalid stream shapes", () => {
    expect(
      objectStreamsFromChildDocumentJson(
        JSON.stringify({
          object_streams: [{ id: "note", class: "narrative", label: "Note", value: "Open late" }],
        })
      )
    ).toEqual([{ id: "note", class: "narrative", label: "Note", value: "Open late" }]);
    expect(
      objectStreamsFromChildDocumentJson(
        JSON.stringify({
          object_streams: [{ id: "BAD ID", label: "Note", value: "Open late" }],
        })
      )
    ).toEqual([]);
  });
});
