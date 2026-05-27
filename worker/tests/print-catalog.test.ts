import { describe, expect, it } from "vitest";

import {
  getPersonalizablePrintCatalog,
  HOODIE_LIVE_OBJECT_TEMPLATE_ID,
  TIER0_BATCH_PRINT_TEMPLATE_ID,
} from "../src/print/print-catalog";

describe("print-catalog", () => {
  it("excludes Tier 0 batch from personalizable catalog", () => {
    const personalizable = getPersonalizablePrintCatalog();
    expect(personalizable.some((p) => p.template_id === TIER0_BATCH_PRINT_TEMPLATE_ID)).toBe(
      false
    );
    expect(personalizable.some((p) => p.template_id === HOODIE_LIVE_OBJECT_TEMPLATE_ID)).toBe(
      true
    );
  });
});
