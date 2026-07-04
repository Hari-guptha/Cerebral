import type { AppliedState, Project } from "@svg-animator/types";
import { getPointOnPathD, getTangentAngleOnPathD } from "./path-utils";

/** Apply motion-path offsets after keyframe sampling. */
export function applyMotionPaths(project: Project, state: AppliedState): AppliedState {
  const elementById = new Map(project.elements.map((el) => [el.id, el]));
  const next: AppliedState = { ...state };
  let changed = false;

  for (const el of project.elements) {
    if (!el.motionPathId) continue;
    const pathEl = elementById.get(el.motionPathId);
    if (!pathEl || pathEl.type !== "path") continue;

    const pathD = typeof pathEl.attrs.d === "string" ? pathEl.attrs.d : "";
    if (!pathD.trim()) continue;

    const s = state[el.id];
    if (!s) continue;

    const progress = Math.max(0, Math.min(1, s.pathProgress ?? 0));
    const point = getPointOnPathD(pathD, progress);
    if (!point) continue;

    const offsetX = s.transform.x;
    const offsetY = s.transform.y;
    let rotation = s.transform.rotation;

    if (el.motionPathRotate) {
      const tangent = getTangentAngleOnPathD(pathD, progress);
      if (tangent != null) rotation += tangent;
    }

    next[el.id] = {
      ...s,
      transform: {
        ...s.transform,
        x: point.x + offsetX,
        y: point.y + offsetY,
        rotation,
      },
    };
    changed = true;
  }

  return changed ? next : state;
}
