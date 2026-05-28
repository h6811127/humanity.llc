import { describe, expect, it } from "vitest";

import { orphanKeysClearConfirmMessage } from "../../site/js/device-orphan-keys-nav-core.mjs";

describe("orphanKeysClearConfirmMessage", () => {
  it("names the card in the confirm dialog", () => {
    expect(orphanKeysClearConfirmMessage("@steward")).toContain("@steward");
    expect(orphanKeysClearConfirmMessage("")).toContain("this card");
  });
});
