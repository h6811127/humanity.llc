import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

import {
  CHILD_OBJECT_BACKUP_GATE_BLOCK_AT_ACTIVE_COUNT,
  childObjectBackupGateNoticeCopy,
  childObjectBackupGateState,
  countActiveChildObjects,
  rootHasChildObjectBackupSeatbelt,
} from "../../site/js/child-object-backup-gate-core.mjs";

describe("countActiveChildObjects", () => {
  it("ignores disabled and revoked rows", () => {
    expect(
      countActiveChildObjects([
        { object_id: "a", status: "active" },
        { object_id: "b", status: "disabled" },
        { object_id: "c", status: "revoked" },
      ])
    ).toBe(1);
  });
});

describe("rootHasChildObjectBackupSeatbelt", () => {
  it("accepts recovery acknowledgement and backup export markers", () => {
    expect(rootHasChildObjectBackupSeatbelt({ recovery_key_acknowledged: true })).toBe(true);
    expect(
      rootHasChildObjectBackupSeatbelt({ key_backup_exported_at: "2026-05-28T12:00:00.000Z" })
    ).toBe(true);
    expect(rootHasChildObjectBackupSeatbelt({ key_imported_at: "2026-05-28T12:00:00.000Z" })).toBe(
      true
    );
    expect(rootHasChildObjectBackupSeatbelt({})).toBe(false);
  });
});

describe("childObjectBackupGateState", () => {
  it("allows first object without seatbelt", () => {
    expect(
      childObjectBackupGateState({ activeCount: 0, hasSeatbelt: false })
    ).toEqual({ allowed: true, warn: false, blocked: false });
  });

  it("warns on second object without seatbelt", () => {
    expect(
      childObjectBackupGateState({ activeCount: 1, hasSeatbelt: false })
    ).toEqual({ allowed: true, warn: true, blocked: false });
  });

  it("blocks third object without seatbelt", () => {
    expect(
      childObjectBackupGateState({ activeCount: 2, hasSeatbelt: false })
    ).toEqual({ allowed: false, warn: false, blocked: true });
  });

  it("allows any count when seatbelt is satisfied", () => {
    expect(
      childObjectBackupGateState({ activeCount: 5, hasSeatbelt: true })
    ).toEqual({ allowed: true, warn: false, blocked: false });
  });

  it("uses threshold constant of 2 active objects before block", () => {
    expect(CHILD_OBJECT_BACKUP_GATE_BLOCK_AT_ACTIVE_COUNT).toBe(2);
  });
});

describe("childObjectBackupGateNoticeCopy", () => {
  it("returns block and warn copy", () => {
    expect(childObjectBackupGateNoticeCopy({ blocked: true, warn: false })?.title).toMatch(
      /recovery method/i
    );
    expect(childObjectBackupGateNoticeCopy({ blocked: false, warn: true })?.title).toMatch(
      /recovery method/i
    );
    expect(childObjectBackupGateNoticeCopy({ blocked: false, warn: false })).toBeNull();
  });
});

describe("child-object backup gate UI", () => {
  it("hidden backup-gate notices do not display (flex override guard)", () => {
    const styles = readFileSync(join(root, "site/styles.css"), "utf8");
    expect(styles).toMatch(
      /\.child-object-backup-gate\[hidden\][\s\S]*display:\s*none\s*!important/
    );
    expect(styles).toMatch(
      /\.child-object-backup-gate:not\(:has\(\.hc-notice-content\)\)[\s\S]*display:\s*none\s*!important/
    );
    expect(styles).toMatch(/\.hc-notice\[hidden\][\s\S]*display:\s*none\s*!important/);
  });

  it("created Live add-object panels ship hidden backup-gate placeholders without tone class", () => {
    const html = readFileSync(join(root, "site/created/index.html"), "utf8");
    expect(html).toContain('id="child-object-status-plate-backup-gate"');
    expect(html).toContain('id="child-object-lost-item-backup-gate"');
    expect(html).toContain('id="child-object-game-node-backup-gate"');
    expect(html).toContain('id="child-object-game-node-bulk-backup-gate"');
    expect(html).toContain('href="/styles.css?v=138"');
    expect(html).toMatch(
      /id="child-object-status-plate-backup-gate"[\s\S]*class="hc-notice child-object-backup-gate"[\s\S]*hidden/
    );
    expect(html).toMatch(
      /id="child-object-lost-item-backup-gate"[\s\S]*class="hc-notice child-object-backup-gate"[\s\S]*hidden/
    );
    expect(html).not.toMatch(
      /id="child-object-status-plate-backup-gate"[\s\S]*hc-notice--warning/
    );
  });
});
