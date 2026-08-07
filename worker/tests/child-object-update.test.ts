import { describe, expect, it } from "vitest";

import { CHILD_OBJECT_ID_REGEX } from "../src/resolver/child-objects";
import {
  childObjectApiUrl,
  childObjectCreatePath,
  childObjectGameContributePath,
  childObjectGameUpdatePath,
  childObjectIssueQrPath,
  childObjectRevokePath,
  childObjectUpdatePath,
  relationshipEdgesIssuePath,
  relationshipEdgesListPath,
  relationshipEdgesRevokePath,
} from "../../site/js/child-object-api-core.mjs";

const PROFILE = "cuAPt5nFYr8VCCWgPbAAupBS";
const OBJECT_ID = "obj_testChildObject01";
const EDGE_ID = "edge_testRel01";
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
    expect(childObjectIssueQrPath(PROFILE, OBJECT_ID)).toBe(
      "/.well-known/hc/v1/cards/cuAPt5nFYr8VCCWgPbAAupBS/objects/obj_testChildObject01/issue-qr"
    );
    expect(childObjectApiUrl(ORIGIN, childObjectCreatePath(PROFILE))).toBe(
      `${ORIGIN}/.well-known/hc/v1/cards/cuAPt5nFYr8VCCWgPbAAupBS/objects`
    );
  });

  it("builds game-update, contribute, and relationship-edge paths", () => {
    expect(childObjectGameUpdatePath(PROFILE, OBJECT_ID)).toBe(
      `/.well-known/hc/v1/cards/${PROFILE}/objects/${OBJECT_ID}/game-update`
    );
    expect(childObjectGameContributePath(PROFILE, OBJECT_ID)).toBe(
      `/.well-known/hc/v1/cards/${PROFILE}/objects/${OBJECT_ID}/game-contribute`
    );
    expect(relationshipEdgesListPath(PROFILE)).toBe(
      `/.well-known/hc/v1/cards/${PROFILE}/relationship-edges`
    );
    expect(relationshipEdgesIssuePath(PROFILE)).toBe(
      relationshipEdgesListPath(PROFILE)
    );
    expect(relationshipEdgesRevokePath(PROFILE, EDGE_ID)).toBe(
      `/.well-known/hc/v1/cards/${PROFILE}/relationship-edges/${EDGE_ID}/revoke`
    );
  });

  it("percent-encodes path segments that contain reserved characters", () => {
    const weirdProfile = "a/b";
    const weirdObject = "obj?x=1";
    const weirdEdge = "edge#1";
    expect(childObjectUpdatePath(weirdProfile, weirdObject)).toBe(
      "/.well-known/hc/v1/cards/a%2Fb/objects/obj%3Fx%3D1/update"
    );
    expect(relationshipEdgesRevokePath(weirdProfile, weirdEdge)).toBe(
      "/.well-known/hc/v1/cards/a%2Fb/relationship-edges/edge%231/revoke"
    );
  });

  it("accepts client-style object ids", () => {
    expect(CHILD_OBJECT_ID_REGEX.test(OBJECT_ID)).toBe(true);
    expect(CHILD_OBJECT_ID_REGEX.test("obj_clientSlice01")).toBe(true);
  });
});
