import type { GameMeta } from "./game-meta";

export type GameVouchGate = {
  required: string[];
  satisfied: string[];
  pending: string[];
  met: boolean;
};

/** True when a witness node lists `targetNodeId` in its public vouch graph. */
export function witnessVouchesForNode(
  witnessMeta: GameMeta,
  targetNodeId: string
): boolean {
  return witnessMeta.vouch_active_for.includes(targetNodeId);
}

/** Resolve vouch gate for a target game node from witness node documents. */
export function resolveGameVouchGate(
  targetNodeId: string | null,
  meta: GameMeta,
  witnessMetaByNodeId: Record<string, GameMeta> = {}
): GameVouchGate | null {
  if (!targetNodeId || !meta.vouch_requires.length) return null;

  const required = [...meta.vouch_requires];
  const satisfied: string[] = [];
  const pending: string[] = [];

  for (const witnessId of required) {
    const witnessMeta = witnessMetaByNodeId[witnessId];
    if (witnessMeta && witnessVouchesForNode(witnessMeta, targetNodeId)) {
      satisfied.push(witnessId);
    } else {
      pending.push(witnessId);
    }
  }

  return {
    required,
    satisfied,
    pending,
    met: pending.length === 0,
  };
}
