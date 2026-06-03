import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  applyCustodyPhaseCGatePass,
  applySupportMacrosO4Pass,
  applyWeekendScheduleO3Pass,
  assessOperatorOpsReady,
  custodyPhaseCGateReady,
  CUSTODY_PHASE_C_HEADER,
  SUPPORT_MACROS_O4_PENDING,
  WEEKEND_SCHEDULE_O3_PENDING,
} from "../scripts/city-game-operator-ops-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const custodySample = readFileSync(join(root, "docs/CITY_GAME_OPERATOR_CUSTODY.md"), "utf8");

describe("city-game-operator-ops-core", () => {
  it("assesses operator ops gates against signed canon docs", () => {
    const ops = assessOperatorOpsReady({
      custodyDoc: custodySample,
      weekendScheduleDoc: readFileSync(
        join(root, "docs/CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md"),
        "utf8"
      ),
      supportMacrosDoc: readFileSync(join(root, "docs/CITY_GAME_SUPPORT_MACROS.md"), "utf8"),
      installMapDoc: readFileSync(join(root, "docs/CITY_GAME_NODE_INSTALL_MAP.md"), "utf8"),
      launchChecklistDoc: readFileSync(join(root, "docs/CITY_GAME_LAUNCH_CHECKLIST.md"), "utf8"),
    });
    expect(ops.o1.docReady).toBe(true);
    expect(ops.o1.checklistSigned).toBe(true);
    expect(ops.o2.installMap.qrReady).toBe(true);
    expect(ops.o2.installMap.contactsReady).toBe(false);
    expect(ops.o2.checklistSigned).toBe(false);
    expect(ops.o3.docReady).toBe(true);
    expect(ops.o3.checklistSigned).toBe(true);
    expect(ops.o4.docReady).toBe(true);
    expect(ops.o4.checklistSigned).toBe(true);
  });

  it("marks custody Phase C gate rows", () => {
    expect(custodyPhaseCGateReady(custodySample)).toBe(true);

    const custodyPendingFixture = `${CUSTODY_PHASE_C_HEADER}

| Game-operator **private** key in offline custody | ☐ |
| Season root **owner + recovery** keys in offline custody | ☐ |
| \`season_root_profile_id\` set in season JSON | ☐ |
| All 15 node QRs issued and tracked in install map | ☐ |
| Weekend operator roster assigned | ☐ |
| \`node_14\` care-loop steward contacts filled | ☐ |

## Later
`;
    expect(custodyPhaseCGateReady(custodyPendingFixture)).toBe(false);
    const updated = applyCustodyPhaseCGatePass(custodyPendingFixture, { dateIso: "2026-06-04" });
    expect(updated).toContain(CUSTODY_PHASE_C_HEADER);
    expect(custodyPhaseCGateReady(updated)).toBe(true);
  });

  it("marks O3 and O4 doc sign-off rows", () => {
    const schedule = `tail\n${WEEKEND_SCHEDULE_O3_PENDING}\n`;
    const macros = `tail\n${SUPPORT_MACROS_O4_PENDING}\n`;
    expect(applyWeekendScheduleO3Pass(schedule, { dateIso: "2026-06-04" })).toContain("☑");
    expect(applySupportMacrosO4Pass(macros, { dateIso: "2026-06-04" })).toContain("☑");
  });
});
