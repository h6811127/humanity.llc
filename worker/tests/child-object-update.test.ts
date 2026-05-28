import { describe, expect, it } from "vitest";

import { CHILD_OBJECT_ID_REGEX } from "../src/resolver/child-objects";
import {
  childObjectApiUrl,
  childObjectCreatePath,
  childObjectRevokePath,
  childObjectUpdatePath,
} from "../../site/js/child-object-api-core.mjs";

const PROFILE = "cuAPt5nFYr8VCCWgPbAAupBS";
const OBJECT_ID = "obj_testChildObject01";
const ORIGIN = "http://127.0.0.1:8787";

describe("child-object-api-core", () => {
  it("builds resolver paths for create, update, and revoke", () => {
    expect(childObjectCreatePath(PROFILE)).toBe(
      "/.well-known/hc/v1/cards/cuAPt5nFYr8VCCWgPbAAupBS/objects"
    );
    expect(childObjectUpdatePath(PROFILE, OBJECT_ID)).toBe(
      "/.well-known/hc/v1/cards/cuAPt5nFYr8VCCWgPbAAupBS/objects/obj_testChildObject01/update"
    );
    expect(childObjectRevokePath(PROFILE, OBJECT_ID)).toBe(
      "/.well-known/hc/v1/cards/cuAPt5nFYr8VCCWgPbAAupBS/objects/obj_testChildObject01/revoke"
    );
    expect(childObjectApiUrl(ORIGIN, childObjectCreatePath(PROFILE))).toBe(
      `${ORIGIN}/.well-known/hc/v1/cards/cuAPt5nFYr8VCCWgPbAAupBS/objects`
    );
  });

  it("accepts client-style object ids", () => {
    expect(CHILD_OBJECT_ID_REGEX.test(OBJECT_ID)).toBe(true);
    expect(CHILD_OBJECT_ID_REGEX.test("obj_clientSlice01")).toBe(true);
  });
});
