import { describe, expect, it } from "vitest";

import {
  CRYPTO_ERROR,
  CryptoVerifyError,
  PAYLOAD_TYPES,
  PROTOCOL_VERSION,
  validateRequiredSignedFields,
} from "../src/crypto/index.ts";

/** Fixture profile id (Base58, length within verify window). */
const PROFILE_ID = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const TS = "2026-08-03T10:00:00.000Z";

function expectCryptoCode(fn: () => unknown, code: string): void {
  try {
    fn();
    expect.fail("expected CryptoVerifyError");
  } catch (err) {
    expect(err).toBeInstanceOf(CryptoVerifyError);
    expect((err as CryptoVerifyError).code).toBe(code);
  }
}

describe("validateRequiredSignedFields happy paths", () => {
  it("accepts child_object with parent subject + object_id", () => {
    expect(
      validateRequiredSignedFields({
        type: PAYLOAD_TYPES.CHILD_OBJECT,
        version: PROTOCOL_VERSION,
        parent_profile_id: PROFILE_ID,
        created_at: TS,
        object_id: "obj_child_1",
      })
    ).toBe(PAYLOAD_TYPES.CHILD_OBJECT);
  });

  it("accepts delegated_capability with capability_id", () => {
    expect(
      validateRequiredSignedFields({
        type: PAYLOAD_TYPES.DELEGATED_CAPABILITY,
        version: PROTOCOL_VERSION,
        parent_profile_id: PROFILE_ID,
        expires_at: TS,
        capability_id: "cap_1",
      })
    ).toBe(PAYLOAD_TYPES.DELEGATED_CAPABILITY);
  });

  it("accepts live_control_response with challenge_id", () => {
    expect(
      validateRequiredSignedFields({
        type: PAYLOAD_TYPES.LIVE_CONTROL_RESPONSE,
        version: PROTOCOL_VERSION,
        profile_id: PROFILE_ID,
        signed_at: TS,
        challenge_id: "ch_1",
      })
    ).toBe(PAYLOAD_TYPES.LIVE_CONTROL_RESPONSE);
  });

  it("accepts steward_account_link with either issued_at or expires_at", () => {
    expect(
      validateRequiredSignedFields({
        type: PAYLOAD_TYPES.STEWARD_ACCOUNT_LINK,
        version: PROTOCOL_VERSION,
        profile_id: PROFILE_ID,
        issued_at: TS,
        nonce: "n1",
      })
    ).toBe(PAYLOAD_TYPES.STEWARD_ACCOUNT_LINK);

    expect(
      validateRequiredSignedFields({
        type: PAYLOAD_TYPES.STEWARD_ACCOUNT_LINK,
        version: PROTOCOL_VERSION,
        profile_id: PROFILE_ID,
        expires_at: TS,
        nonce: "n2",
      })
    ).toBe(PAYLOAD_TYPES.STEWARD_ACCOUNT_LINK);
  });

  it("accepts relay_offer_owner_query with object_id", () => {
    expect(
      validateRequiredSignedFields({
        type: PAYLOAD_TYPES.RELAY_OFFER_OWNER_QUERY,
        version: PROTOCOL_VERSION,
        profile_id: PROFILE_ID,
        created_at: TS,
        object_id: "obj_relay_1",
      })
    ).toBe(PAYLOAD_TYPES.RELAY_OFFER_OWNER_QUERY);
  });
});

describe("validateRequiredSignedFields rejection edges", () => {
  it("rejects unknown payload types", () => {
    expectCryptoCode(
      () =>
        validateRequiredSignedFields({
          type: "not_a_real_type",
          version: PROTOCOL_VERSION,
          profile_id: PROFILE_ID,
          created_at: TS,
          nonce: "n1",
        }),
      CRYPTO_ERROR.UNKNOWN_PAYLOAD_TYPE
    );
  });

  it("rejects wrong protocol version", () => {
    expectCryptoCode(
      () =>
        validateRequiredSignedFields({
          type: PAYLOAD_TYPES.CHILD_OBJECT,
          version: "0.9",
          parent_profile_id: PROFILE_ID,
          created_at: TS,
          object_id: "obj_1",
        }),
      CRYPTO_ERROR.MISSING_REQUIRED_FIELD
    );
  });

  it("rejects invalid subject profile ids", () => {
    expectCryptoCode(
      () =>
        validateRequiredSignedFields({
          type: PAYLOAD_TYPES.CHILD_OBJECT,
          version: PROTOCOL_VERSION,
          parent_profile_id: "not-base58!!!",
          created_at: TS,
          object_id: "obj_1",
        }),
      CRYPTO_ERROR.INVALID_PROFILE_ID
    );
  });

  it("rejects missing subject fields", () => {
    expectCryptoCode(
      () =>
        validateRequiredSignedFields({
          type: PAYLOAD_TYPES.DELEGATED_CAPABILITY,
          version: PROTOCOL_VERSION,
          created_at: TS,
          capability_id: "cap_1",
        }),
      CRYPTO_ERROR.MISSING_REQUIRED_FIELD
    );
  });

  it("rejects missing timestamps and non-Z ISO values", () => {
    expectCryptoCode(
      () =>
        validateRequiredSignedFields({
          type: PAYLOAD_TYPES.LIVE_CONTROL_RESPONSE,
          version: PROTOCOL_VERSION,
          profile_id: PROFILE_ID,
          challenge_id: "ch_1",
          nonce: "n1",
        }),
      CRYPTO_ERROR.MISSING_REQUIRED_FIELD
    );

    expectCryptoCode(
      () =>
        validateRequiredSignedFields({
          type: PAYLOAD_TYPES.LIVE_CONTROL_RESPONSE,
          version: PROTOCOL_VERSION,
          profile_id: PROFILE_ID,
          signed_at: "2026-08-03T10:00:00+00:00",
          challenge_id: "ch_1",
        }),
      CRYPTO_ERROR.MISSING_REQUIRED_FIELD
    );
  });

  it("rejects missing unique ids / nonces", () => {
    expectCryptoCode(
      () =>
        validateRequiredSignedFields({
          type: PAYLOAD_TYPES.CHILD_OBJECT,
          version: PROTOCOL_VERSION,
          parent_profile_id: PROFILE_ID,
          created_at: TS,
        }),
      CRYPTO_ERROR.MISSING_REQUIRED_FIELD
    );

    expectCryptoCode(
      () =>
        validateRequiredSignedFields({
          type: PAYLOAD_TYPES.DELEGATED_CAPABILITY,
          version: PROTOCOL_VERSION,
          parent_profile_id: PROFILE_ID,
          created_at: TS,
          capability_id: "",
        }),
      CRYPTO_ERROR.MISSING_REQUIRED_FIELD
    );
  });
});
