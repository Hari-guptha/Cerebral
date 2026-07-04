import type { AppliedElementState, AppliedState, Transform2D } from "@svg-animator/types";

function transformEqual(a: Transform2D, b: Transform2D): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.rotation === b.rotation &&
    a.scaleX === b.scaleX &&
    a.scaleY === b.scaleY &&
    a.originX === b.originX &&
    a.originY === b.originY
  );
}

export function elementStateEqual(a: AppliedElementState, b: AppliedElementState): boolean {
  return (
    a.elementId === b.elementId &&
    transformEqual(a.transform, b.transform) &&
    a.opacity === b.opacity &&
    a.fill === b.fill &&
    a.stroke === b.stroke &&
    a.strokeWidth === b.strokeWidth &&
    a.strokeDashoffset === b.strokeDashoffset &&
    a.pathD === b.pathD &&
    a.pathProgress === b.pathProgress
  );
}

/** Reuse unchanged element state objects so memoized preview nodes skip re-renders. */
export function reconcileAppliedState(prev: AppliedState, next: AppliedState): AppliedState {
  const result: AppliedState = {};
  let topLevelChanged = false;

  for (const id of Object.keys(next)) {
    const n = next[id];
    const p = prev[id];
    if (p && elementStateEqual(p, n)) {
      result[id] = p;
    } else {
      result[id] = n;
      topLevelChanged = true;
    }
  }

  if (!topLevelChanged && Object.keys(prev).length === Object.keys(next).length) {
    return prev;
  }

  return result;
}

export function quantizeTimeToFrame(time: number, fps: number): number {
  if (fps <= 0) return time;
  return Math.round(time * fps) / fps;
}
