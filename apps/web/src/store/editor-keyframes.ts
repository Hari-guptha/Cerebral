import type {
  AnimatableProperty,
  AnimValue,
  AppliedElementState,
  EasingCurve,
  Keyframe,
  Project,
} from "@svg-animator/types";
import { addKeyframe, removeKeyframe } from "@svg-animator/engine";
import type { KeyframeClipboardEntry, KeyframeRef } from "./editor-types";

export function getAppliedPropertyValue(
  state: AppliedElementState,
  property: AnimatableProperty
): AnimValue {
  switch (property) {
    case "x":
      return state.transform.x;
    case "y":
      return state.transform.y;
    case "rotation":
      return state.transform.rotation;
    case "scaleX":
      return state.transform.scaleX;
    case "scaleY":
      return state.transform.scaleY;
    case "opacity":
      return state.opacity;
    case "fill":
      return state.fill ?? "#000000";
    case "stroke":
      return state.stroke ?? "none";
    case "strokeWidth":
      return state.strokeWidth ?? 0;
    case "strokeDashoffset":
      return state.strokeDashoffset ?? 0;
    case "pathD":
      return state.pathD ?? "";
    case "pathProgress":
      return state.pathProgress ?? 0;
    default:
      return 0;
  }
}

export function resolveKeyframe(
  project: Project,
  ref: KeyframeRef
): { trackId: string; elementId: string; property: AnimatableProperty; keyframe: Keyframe } | null {
  const track = project.tracks.find((t) => t.id === ref.trackId);
  if (!track) return null;
  const keyframe = track.keyframes.find((k) => k.id === ref.keyframeId);
  if (!keyframe) return null;
  return { trackId: track.id, elementId: track.elementId, property: track.property, keyframe };
}

export function buildKeyframeClipboard(
  project: Project,
  refs: KeyframeRef[]
): KeyframeClipboardEntry[] {
  const entries: KeyframeClipboardEntry[] = [];
  for (const ref of refs) {
    const resolved = resolveKeyframe(project, ref);
    if (!resolved) continue;
    entries.push({
      elementId: resolved.elementId,
      property: resolved.property,
      time: resolved.keyframe.time,
      value: resolved.keyframe.value,
      easing: resolved.keyframe.easing,
      hold: resolved.keyframe.hold,
    });
  }
  return entries;
}

export function deleteKeyframeRefs(project: Project, refs: KeyframeRef[]): Project {
  let result = project;
  for (const ref of refs) {
    result = removeKeyframe(result, ref.trackId, ref.keyframeId);
  }
  return result;
}

export function pasteKeyframeClipboard(
  project: Project,
  entries: KeyframeClipboardEntry[],
  pasteTime: number,
  targetElementIds: string[]
): Project {
  if (entries.length === 0) return project;

  const minTime = Math.min(...entries.map((e) => e.time));
  let result = project;

  for (const entry of entries) {
    const targetElementId = targetElementIds.includes(entry.elementId)
      ? entry.elementId
      : targetElementIds[0];
    if (!targetElementId) continue;

    const time = Math.max(0, pasteTime + (entry.time - minTime));
    result = addKeyframe(result, targetElementId, entry.property, time, entry.value);

    const track = result.tracks.find(
      (t) => t.elementId === targetElementId && t.property === entry.property
    );
    const kf = track?.keyframes.find((k) => Math.abs(k.time - time) < 0.001);
    if (track && kf && entry.easing) {
      result = {
        ...result,
        tracks: result.tracks.map((t) =>
          t.id === track.id
            ? {
                ...t,
                keyframes: t.keyframes.map((k) =>
                  k.id === kf.id ? { ...k, easing: entry.easing, hold: entry.hold } : k
                ),
              }
            : t
        ),
      };
    }
  }

  return result;
}

export function duplicateKeyframeRefs(
  project: Project,
  refs: KeyframeRef[],
  offset: number
): { project: Project; newRefs: KeyframeRef[] } {
  const newRefs: KeyframeRef[] = [];
  let result = project;

  for (const ref of refs) {
    const resolved = resolveKeyframe(result, ref);
    if (!resolved) continue;

    const time = Math.min(
      project.duration,
      Math.max(0, resolved.keyframe.time + offset)
    );
    result = addKeyframe(
      result,
      resolved.elementId,
      resolved.property,
      time,
      resolved.keyframe.value
    );

    const track = result.tracks.find(
      (t) => t.elementId === resolved.elementId && t.property === resolved.property
    );
    const kf = track?.keyframes.find((k) => Math.abs(k.time - time) < 0.001);
    if (track && kf) {
      result = {
        ...result,
        tracks: result.tracks.map((t) =>
          t.id === track.id
            ? {
                ...t,
                keyframes: t.keyframes.map((k) =>
                  k.id === kf.id
                    ? {
                        ...k,
                        easing: resolved.keyframe.easing,
                        hold: resolved.keyframe.hold,
                      }
                    : k
                ),
              }
            : t
        ),
      };
      newRefs.push({ trackId: track.id, keyframeId: kf.id });
    }
  }

  return { project: result, newRefs };
}

export function keyframeRefKey(ref: KeyframeRef): string {
  return `${ref.trackId}:${ref.keyframeId}`;
}

export function isKeyframeSelected(refs: KeyframeRef[], trackId: string, keyframeId: string): boolean {
  return refs.some((r) => r.trackId === trackId && r.keyframeId === keyframeId);
}

export function mergeKeyframeSelection(
  refs: KeyframeRef[],
  ref: KeyframeRef,
  mode: "replace" | "add" | "toggle"
): KeyframeRef[] {
  const key = keyframeRefKey(ref);
  const exists = refs.some((r) => keyframeRefKey(r) === key);

  if (mode === "replace") return [ref];
  if (mode === "toggle") {
    return exists ? refs.filter((r) => keyframeRefKey(r) !== key) : [...refs, ref];
  }
  if (exists) return refs;
  return [...refs, ref];
}
