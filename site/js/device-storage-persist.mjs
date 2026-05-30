/**
 * Browser hook: ask for durable localStorage after ownership save (D11).
 * @see docs/OWNERSHIP_AND_CONTROL_MODEL.md
 */
import {
  STORAGE_PERSIST_REQUESTED_KEY,
  isStoragePersistApiAvailable,
  shouldRequestStoragePersist,
  storagePersistAlreadyRequested,
  storagePersistRequestedFlagValue,
} from "./device-storage-persist-core.mjs";
import { getWalletSigningKeyCount } from "./device-wallet.mjs";

/**
 * @param {Storage | null | undefined} local
 * @param {string | null | undefined} flagValue
 */
function markPersistRequested(local, flagValue) {
  if (!local) return;
  try {
    local.setItem(STORAGE_PERSIST_REQUESTED_KEY, flagValue);
  } catch {
    /* private mode */
  }
}

/**
 * Fire-and-forget persist request (no user-visible UI).
 * @param {{ reason?: "ownership_save" | "shell_bootstrap" }} [opts]
 */
export function scheduleStoragePersistRequest(opts = {}) {
  if (typeof navigator === "undefined") return;
  const storage = navigator.storage;
  if (!isStoragePersistApiAvailable(storage)) return;

  let local = null;
  try {
    local = localStorage;
  } catch {
    return;
  }

  const alreadyRequested = storagePersistAlreadyRequested(
    local.getItem(STORAGE_PERSIST_REQUESTED_KEY)
  );
  const hasSigningKeys =
    opts.reason === "ownership_save" || getWalletSigningKeyCount() > 0;

  if (
    !shouldRequestStoragePersist({
      hasSigningKeysOnDevice: hasSigningKeys,
      persistApiAvailable: true,
      alreadyRequested,
    })
  ) {
    return;
  }

  void storage.persist().then(
    (granted) => {
      markPersistRequested(local, storagePersistRequestedFlagValue(granted));
    },
    () => {
      markPersistRequested(local, "0");
    }
  );
}
