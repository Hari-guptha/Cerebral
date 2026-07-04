import type { Project } from "@svg-animator/types";
import { addKeyframe } from "./animation";
import { estimatePathLength } from "./path-utils";

/** Stroke draw-on: animate stroke-dashoffset from path length to 0 */
export function addStrokeDrawOn(
  project: Project,
  elementId: string,
  startTime: number,
  duration: number,
  pathLengthOverride?: number
): Project {
  const el = project.elements.find((e) => e.id === elementId);
  if (!el || el.type !== "path") return project;

  const d = String(el.attrs.d ?? "");
  const pathLength = pathLengthOverride ?? estimatePathLength(d);
  let p = addKeyframe(project, elementId, "strokeDashoffset", startTime, pathLength);
  p = addKeyframe(p, elementId, "strokeDashoffset", startTime + duration, 0);

  const elements = p.elements.map((e) =>
    e.id === elementId
      ? { ...e, attrs: { ...e.attrs, "stroke-dasharray": pathLength } }
      : e
  );
  return { ...p, elements };
}

/** Stagger reveal: fade + slide in selected elements */
export function addStaggerReveal(
  project: Project,
  elementIds: string[],
  startTime: number,
  stagger: number
): Project {
  let p = project;
  elementIds.forEach((id, i) => {
    const t = startTime + i * stagger;
    p = addKeyframe(p, id, "opacity", t, 0);
    p = addKeyframe(p, id, "opacity", t + 0.3, 1);
    p = addKeyframe(p, id, "y", t, 20);
    p = addKeyframe(p, id, "y", t + 0.3, 0);
  });
  return p;
}

/** Path morph: set pathD keyframes (JS export recommended) */
export function addPathMorph(
  project: Project,
  elementId: string,
  startTime: number,
  endTime: number,
  fromPath: string,
  toPath: string
): Project {
  let p = addKeyframe(project, elementId, "pathD", startTime, fromPath);
  p = addKeyframe(p, elementId, "pathD", endTime, toPath);
  return p;
}
