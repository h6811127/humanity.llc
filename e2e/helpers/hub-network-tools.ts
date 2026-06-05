import { expect, type Page } from "@playwright/test";

import {
  HUB_NETWORK_TOOLS_ADVANCED_ID,
} from "../../site/js/device-hub-network-tools-core.mjs";

/** Expand hub Advanced / debug disclosure before interacting with network tools. */
export async function expandHubNetworkToolsAdvanced(page: Page) {
  const details = page.locator(`#${HUB_NETWORK_TOOLS_ADVANCED_ID}`);
  await expect(details).toBeAttached({ timeout: 15_000 });
  const isOpen = await details.evaluate(
    (el) => el instanceof HTMLDetailsElement && el.open
  );
  if (!isOpen) {
    await details.locator("summary").click({ timeout: 15_000 });
  }
  await expect(details).toHaveAttribute("open", "");
}
