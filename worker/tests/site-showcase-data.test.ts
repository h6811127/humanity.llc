import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SITE_DATA = join(process.cwd(), "site/data");

const SHOWCASE_FILES = [
  "showcase-status-plate.json",
  "showcase-live-object.json",
  "showcase-lost-item.json",
] as const;

/** M5 runbook step 10 - landing showcase JSON must stay link-complete. */
describe("site showcase data (M5 landing)", () => {
  for (const file of SHOWCASE_FILES) {
    it(`${file} has public scan_url for profile + qr`, () => {
      const raw = readFileSync(join(SITE_DATA, file), "utf8");
      const data = JSON.parse(raw) as {
        profile_id?: string;
        qr_id?: string;
        scan_url?: string;
        label?: string;
        object_streams?: Array<{
          id: string;
          class: string;
          label: string;
          value: string;
        }>;
      };
      expect(data.profile_id).toMatch(/^[A-Za-z0-9]+$/);
      expect(data.qr_id).toMatch(/^qr_/);
      expect(data.label?.length).toBeGreaterThan(0);
      expect(data.scan_url).toContain(`/c/${data.profile_id}`);
      expect(data.scan_url).toContain(`q=${data.qr_id}`);
      expect(data.scan_url).toMatch(/^https:\/\/humanity\.llc\//);
      if (data.object_streams?.length) {
        for (const stream of data.object_streams) {
          expect(stream.id).toMatch(/^[a-z0-9_-]{1,32}$/);
          expect(["place", "care", "narrative", "route"]).toContain(stream.class);
          expect(stream.label.length).toBeGreaterThan(0);
          expect(stream.value.length).toBeGreaterThan(0);
        }
      }
    });
  }
});
