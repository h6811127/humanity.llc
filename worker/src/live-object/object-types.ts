/** Canonical child object types for Phase A live-object pilots (Layer 1). */
export const CHILD_OBJECT_TYPE_STATUS_PLATE = "status_plate";
export const CHILD_OBJECT_TYPE_LOST_ITEM_RELAY = "lost_item_relay";
export const CHILD_OBJECT_TYPE_GAME_NODE = "game_node";

export type PhaseAChildObjectType =
  | typeof CHILD_OBJECT_TYPE_STATUS_PLATE
  | typeof CHILD_OBJECT_TYPE_LOST_ITEM_RELAY;

export function isPhaseAChildObjectType(
  objectType: string | null | undefined
): objectType is PhaseAChildObjectType {
  return (
    objectType === CHILD_OBJECT_TYPE_STATUS_PLATE ||
    objectType === CHILD_OBJECT_TYPE_LOST_ITEM_RELAY
  );
}
