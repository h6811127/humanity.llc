/**
 * QA contract — iOS Home Screen PWA uninstall deletes app storage (hc_wallet).
 * Not automatable in CI (requires real device + OS uninstall).
 * @see docs/PWA_INSTALL.md § iPhone home screen custody
 * @see docs/DEVICE_OS_QA.md P1-PWA-U
 */

export const IOS_PWA_UNINSTALL_STORAGE_LOSS_QA_ID = "P1-PWA-U";

export const IOS_PWA_UNINSTALL_STORAGE_LOSS_SUMMARY =
  "Removing the Home Screen icon on iPhone uninstalls the PWA and deletes saved cards in that app bucket.";

/** Manual QA checklist — sign off on installed iPhone after deploy. */
export const IOS_PWA_UNINSTALL_STORAGE_LOSS_MANUAL_STEPS = [
  "Install humanity.llc to iPhone Home Screen with at least one saved card.",
  "Open the home-screen app — hub shows the saved card.",
  "Remove the icon (Edit Home Screen → minus on the icon). Confirm uninstall.",
  "Re-add from Safari if needed and open the app.",
  "Expect an empty wallet unless you import encrypted backup or recovery code.",
  "Product surfaces must warn before uninstall: install card + iPhone storage notice copy.",
];

/** Safe cache-bust paths stewards should use instead of removing the icon. */
export const IOS_PWA_SAFE_REFRESH_AFFORDANCES = [
  "pull-to-refresh",
  "hub-glance-refresh-row",
  "stale-shell-banner-reload",
];
