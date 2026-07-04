import type { ElementNode } from "@svg-animator/types";

const SAME_SPOT_TOLERANCE_PX = 4;

export function getHitElementIdsAtPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): string[] {
  const nodes = document.elementsFromPoint(clientX, clientY);
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    const hit = (node as Element).closest?.("[data-element-id]");
    if (!hit || !svg.contains(hit)) continue;
    const id = hit.getAttribute("data-element-id");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

export function filterSelectableHits(
  hitIds: string[],
  elements: ElementNode[]
): string[] {
  const byId = new Map(elements.map((el) => [el.id, el]));
  return hitIds.filter((id) => {
    const el = byId.get(id);
    return el && el.visible !== false && !el.locked;
  });
}

/** Outside-in: parent group first, then children; then other stacked elements behind. */
export function buildDeepSelectCycle(
  hitsTopToBottom: string[],
  parentOf: (id: string) => string | null
): string[] {
  if (hitsTopToBottom.length === 0) return [];

  const top = hitsTopToBottom[0];
  const chain: string[] = [];
  let cur: string | null = top;
  while (cur) {
    chain.unshift(cur);
    cur = parentOf(cur);
  }

  const chainSet = new Set(chain);
  const extras = hitsTopToBottom.filter((id) => !chainSet.has(id)).reverse();
  return [...chain, ...extras];
}

export type DeepSelectState = {
  x: number;
  y: number;
  cycleKey: string;
  index: number;
};

function cycleKey(cycle: string[]) {
  return cycle.join("\0");
}

function isSameSpot(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= SAME_SPOT_TOLERANCE_PX;
}

export function advanceDeepSelect(
  cycle: string[],
  clientX: number,
  clientY: number,
  state: DeepSelectState | null
): { id: string | null; nextState: DeepSelectState | null } {
  if (cycle.length === 0) return { id: null, nextState: state };

  const key = cycleKey(cycle);
  const sameSpot =
    state &&
    isSameSpot(state, { x: clientX, y: clientY }) &&
    state.cycleKey === key;

  const index = sameSpot ? (state!.index + 1) % cycle.length : 0;
  return {
    id: cycle[index] ?? null,
    nextState: { x: clientX, y: clientY, cycleKey: key, index },
  };
}

export function peekDeepSelect(
  cycle: string[],
  clientX: number,
  clientY: number,
  state: DeepSelectState | null
): string | null {
  if (cycle.length === 0) return null;

  const key = cycleKey(cycle);
  const sameSpot =
    state &&
    isSameSpot(state, { x: clientX, y: clientY }) &&
    state.cycleKey === key;

  return cycle[sameSpot ? state!.index : 0] ?? null;
}
