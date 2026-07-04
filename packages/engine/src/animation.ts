import type {
  AnimatableProperty,
  AnimValue,
  AnimationTrack,
  AppliedElementState,
  AppliedState,
  ElementNode,
  Keyframe,
  Project,
  Transform2D,
} from "@svg-animator/types";
import { createId, DEFAULT_TRANSFORM } from "@svg-animator/types";
import { evaluateEasing, interpolateValue } from "./easing";
import { applyMotionPaths } from "./motion-path";

function getBaseOpacity(el: ElementNode): number {
  const o = el.attrs.opacity;
  if (typeof o === "number") return o;
  if (typeof o === "string") return parseFloat(o) || 1;
  return 1;
}

function getBaseFill(el: ElementNode): string {
  const f = el.attrs.fill;
  return typeof f === "string" ? f : "#000000";
}

function getBaseStroke(el: ElementNode): string {
  const s = el.attrs.stroke;
  return typeof s === "string" ? s : "none";
}

function getBaseStrokeWidth(el: ElementNode): number {
  const w = el.attrs["stroke-width"];
  if (typeof w === "number") return w;
  if (typeof w === "string") return parseFloat(w) || 0;
  return 0;
}

function getBasePathD(el: ElementNode): string {
  const d = el.attrs.d;
  return typeof d === "string" ? d : "";
}

function getPropertyValue(el: ElementNode, property: AnimatableProperty): AnimValue {
  switch (property) {
    case "x":
      return el.transform.x;
    case "y":
      return el.transform.y;
    case "rotation":
      return el.transform.rotation;
    case "scaleX":
      return el.transform.scaleX;
    case "scaleY":
      return el.transform.scaleY;
    case "opacity":
      return getBaseOpacity(el);
    case "fill":
      return getBaseFill(el);
    case "stroke":
      return getBaseStroke(el);
    case "strokeWidth":
      return getBaseStrokeWidth(el);
    case "strokeDashoffset":
      return (el.attrs["stroke-dashoffset"] as number) ?? 0;
    case "pathD":
      return getBasePathD(el);
    case "pathProgress":
      return 0;
    default:
      return 0;
  }
}

function sortedKeyframes(keyframes: Keyframe[]): Keyframe[] {
  return [...keyframes].sort((a, b) => a.time - b.time);
}

export function sampleTrack(keyframes: Keyframe[], time: number): AnimValue | undefined {
  if (keyframes.length === 0) return undefined;
  const sorted = sortedKeyframes(keyframes);

  if (time <= sorted[0].time) return sorted[0].value;
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  for (let i = 0; i < sorted.length - 1; i++) {
    const kf0 = sorted[i];
    const kf1 = sorted[i + 1];
    if (time >= kf0.time && time <= kf1.time) {
      if (kf0.hold) return kf0.value;
      const segmentDuration = kf1.time - kf0.time;
      if (segmentDuration <= 0) return kf1.value;
      const localT = (time - kf0.time) / segmentDuration;
      const easedT = evaluateEasing(localT, kf1.easing);
      return interpolateValue(kf0.value, kf1.value, easedT);
    }
  }
  return sorted[sorted.length - 1].value;
}

export function sampleProject(project: Project, time: number): AppliedState {
  const state: AppliedState = {};
  const elementById = new Map(project.elements.map((el) => [el.id, el]));

  for (const el of project.elements) {
    const base: AppliedElementState = {
      elementId: el.id,
      transform: { ...el.transform },
      opacity: getBaseOpacity(el),
      fill: getBaseFill(el),
      stroke: getBaseStroke(el),
      strokeWidth: getBaseStrokeWidth(el),
      strokeDashoffset: (el.attrs["stroke-dashoffset"] as number) ?? 0,
      pathD: getBasePathD(el),
      pathProgress: 0,
    };
    state[el.id] = base;
  }

  for (const track of project.tracks) {
    if (!track.enabled || track.keyframes.length === 0) continue;
    const el = elementById.get(track.elementId);
    if (!el) continue;

    const value = sampleTrack(track.keyframes, time);
    if (value === undefined) continue;

    const s = state[track.elementId];
    if (!s) continue;

    switch (track.property) {
      case "x":
        s.transform.x = value as number;
        break;
      case "y":
        s.transform.y = value as number;
        break;
      case "rotation":
        s.transform.rotation = value as number;
        break;
      case "scaleX":
        s.transform.scaleX = value as number;
        break;
      case "scaleY":
        s.transform.scaleY = value as number;
        break;
      case "opacity":
        s.opacity = value as number;
        break;
      case "fill":
        s.fill = value as string;
        break;
      case "stroke":
        s.stroke = value as string;
        break;
      case "strokeWidth":
        s.strokeWidth = value as number;
        break;
      case "strokeDashoffset":
        s.strokeDashoffset = value as number;
        break;
      case "pathD":
        s.pathD = value as string;
        break;
      case "pathProgress":
        s.pathProgress = value as number;
        break;
    }
  }

  return applyMotionPaths(project, state);
}

export function getOrCreateTrack(
  project: Project,
  elementId: string,
  property: AnimatableProperty
): AnimationTrack {
  const existing = project.tracks.find(
    (t) => t.elementId === elementId && t.property === property
  );
  if (existing) return existing;

  return {
    id: createId(),
    elementId,
    property,
    keyframes: [],
    enabled: true,
  };
}

export function addKeyframe(
  project: Project,
  elementId: string,
  property: AnimatableProperty,
  time: number,
  value?: AnimValue
): Project {
  const el = project.elements.find((e) => e.id === elementId);
  if (!el) return project;

  const track = getOrCreateTrack(project, elementId, property);
  const val = value ?? getPropertyValue(el, property);

  const existingIdx = track.keyframes.findIndex((k) => Math.abs(k.time - time) < 0.001);
  const newKeyframe: Keyframe = {
    id: createId(),
    time,
    value: val,
    easing: { type: "preset", preset: "easeInOut" },
  };

  let keyframes: Keyframe[];
  if (existingIdx >= 0) {
    keyframes = track.keyframes.map((k, i) => (i === existingIdx ? { ...k, value: val } : k));
  } else {
    keyframes = [...track.keyframes, newKeyframe];
  }

  const updatedTrack = { ...track, keyframes };
  const trackExists = project.tracks.some((t) => t.id === track.id);
  const tracks = trackExists
    ? project.tracks.map((t) => (t.id === track.id ? updatedTrack : t))
    : [...project.tracks, updatedTrack];

  return { ...project, tracks };
}

export function removeKeyframe(project: Project, trackId: string, keyframeId: string): Project {
  return {
    ...project,
    tracks: project.tracks
      .map((t) =>
        t.id === trackId
          ? { ...t, keyframes: t.keyframes.filter((k) => k.id !== keyframeId) }
          : t
      )
      .filter((t) => t.keyframes.length > 0 || t.enabled),
  };
}

export function updateKeyframeTime(
  project: Project,
  trackId: string,
  keyframeId: string,
  time: number
): Project {
  return {
    ...project,
    tracks: project.tracks.map((t) =>
      t.id === trackId
        ? {
            ...t,
            keyframes: t.keyframes.map((k) => (k.id === keyframeId ? { ...k, time } : k)),
          }
        : t
    ),
  };
}

export function updateKeyframeEasing(
  project: Project,
  trackId: string,
  keyframeId: string,
  easing: Keyframe["easing"]
): Project {
  return {
    ...project,
    tracks: project.tracks.map((t) =>
      t.id === trackId
        ? {
            ...t,
            keyframes: t.keyframes.map((k) => (k.id === keyframeId ? { ...k, easing } : k)),
          }
        : t
    ),
  };
}

export function setPropertyAtTime(
  project: Project,
  elementId: string,
  property: AnimatableProperty,
  time: number,
  value: AnimValue,
  autoKeyframe: boolean
): Project {
  if (autoKeyframe) {
    return addKeyframe(project, elementId, property, time, value);
  }

  const el = project.elements.find((e) => e.id === elementId);
  if (!el) return project;

  if (["x", "y", "rotation", "scaleX", "scaleY"].includes(property)) {
    const transform = { ...el.transform };
    if (property === "x") transform.x = value as number;
    else if (property === "y") transform.y = value as number;
    else if (property === "rotation") transform.rotation = value as number;
    else if (property === "scaleX") transform.scaleX = value as number;
    else if (property === "scaleY") transform.scaleY = value as number;
    return {
      ...project,
      elements: project.elements.map((e) =>
        e.id === elementId ? { ...e, transform } : e
      ),
    };
  }

  const attrs = { ...el.attrs };
  const attrMap: Record<string, string> = {
    opacity: "opacity",
    fill: "fill",
    stroke: "stroke",
    strokeWidth: "stroke-width",
    strokeDashoffset: "stroke-dashoffset",
    pathD: "d",
  };
  const attrKey = attrMap[property];
  if (attrKey) attrs[attrKey] = value as string | number;

  return {
    ...project,
    elements: project.elements.map((e) => (e.id === elementId ? { ...e, attrs } : e)),
  };
}

export function staggerKeyframes(
  project: Project,
  elementIds: string[],
  property: AnimatableProperty,
  startTime: number,
  stagger: number,
  value: AnimValue
): Project {
  let result = project;
  elementIds.forEach((id, i) => {
    result = addKeyframe(result, id, property, startTime + i * stagger, value);
  });
  return result;
}

export function getTracksForElement(project: Project, elementId: string): AnimationTrack[] {
  return project.tracks.filter((t) => t.elementId === elementId);
}

export function buildTransformString(t: Transform2D): string {
  const parts: string[] = [];
  if (t.x !== 0 || t.y !== 0) parts.push(`translate(${t.x}, ${t.y})`);
  if (t.rotation !== 0) {
    parts.push(`rotate(${t.rotation}, ${t.originX}, ${t.originY})`);
  }
  if (t.scaleX !== 1 || t.scaleY !== 1) {
    parts.push(`scale(${t.scaleX}, ${t.scaleY})`);
  }
  return parts.join(" ") || "none";
}
