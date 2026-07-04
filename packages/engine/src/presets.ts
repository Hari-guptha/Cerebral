import type { AnimatableProperty, AnimValue, EasingPreset, Project } from "@svg-animator/types";
import { addKeyframe } from "./animation";

export interface AnimationPreset {
  id: string;
  name: string;
  description: string;
  category: "entrance" | "emphasis" | "exit" | "motion";
  properties: AnimatableProperty[];
}

export interface PresetKeyframe {
  time: number;
  value: AnimValue;
  easing?: EasingPreset;
}

export interface PresetTrack {
  property: AnimatableProperty;
  keyframes: PresetKeyframe[];
}

export const ANIMATION_PRESETS: AnimationPreset[] = [
  { id: "fadeIn", name: "Fade In", description: "Opacity 0 → 1", category: "entrance", properties: ["opacity"] },
  { id: "fadeOut", name: "Fade Out", description: "Opacity 1 → 0", category: "exit", properties: ["opacity"] },
  { id: "slideInLeft", name: "Slide In Left", description: "Enter from left", category: "entrance", properties: ["x", "opacity"] },
  { id: "slideInRight", name: "Slide In Right", description: "Enter from right", category: "entrance", properties: ["x", "opacity"] },
  { id: "slideInUp", name: "Slide In Up", description: "Enter from below", category: "entrance", properties: ["y", "opacity"] },
  { id: "bounceIn", name: "Bounce In", description: "Scale bounce entrance", category: "entrance", properties: ["scaleX", "scaleY", "opacity"] },
  { id: "spin", name: "Spin", description: "Full 360° rotation", category: "motion", properties: ["rotation"] },
  { id: "pulse", name: "Pulse", description: "Scale up and back", category: "emphasis", properties: ["scaleX", "scaleY"] },
  { id: "float", name: "Float", description: "Gentle vertical bob", category: "motion", properties: ["y"] },
  { id: "pop", name: "Pop", description: "Quick scale pop", category: "emphasis", properties: ["scaleX", "scaleY"] },
];

const PRESET_TRACKS: Record<string, (duration: number, base: Record<AnimatableProperty, AnimValue>) => PresetTrack[]> = {
  fadeIn: (d, base) => [
    { property: "opacity", keyframes: [{ time: 0, value: 0, easing: "easeOut" }, { time: d * 0.4, value: 1, easing: "easeOut" }] },
  ],
  fadeOut: (d, base) => [
    { property: "opacity", keyframes: [{ time: 0, value: base.opacity ?? 1, easing: "easeIn" }, { time: d * 0.5, value: 0, easing: "easeIn" }] },
  ],
  slideInLeft: (d, base) => [
    { property: "x", keyframes: [{ time: 0, value: (base.x as number) - 120, easing: "easeOut" }, { time: d * 0.6, value: base.x as number, easing: "easeOut" }] },
    { property: "opacity", keyframes: [{ time: 0, value: 0, easing: "easeOut" }, { time: d * 0.4, value: 1, easing: "easeOut" }] },
  ],
  slideInRight: (d, base) => [
    { property: "x", keyframes: [{ time: 0, value: (base.x as number) + 120, easing: "easeOut" }, { time: d * 0.6, value: base.x as number, easing: "easeOut" }] },
    { property: "opacity", keyframes: [{ time: 0, value: 0, easing: "easeOut" }, { time: d * 0.4, value: 1, easing: "easeOut" }] },
  ],
  slideInUp: (d, base) => [
    { property: "y", keyframes: [{ time: 0, value: (base.y as number) + 80, easing: "easeOut" }, { time: d * 0.6, value: base.y as number, easing: "easeOut" }] },
    { property: "opacity", keyframes: [{ time: 0, value: 0, easing: "easeOut" }, { time: d * 0.4, value: 1, easing: "easeOut" }] },
  ],
  bounceIn: (d, base) => [
    { property: "scaleX", keyframes: [{ time: 0, value: 0.3, easing: "bounce" }, { time: d * 0.7, value: base.scaleX as number, easing: "bounce" }] },
    { property: "scaleY", keyframes: [{ time: 0, value: 0.3, easing: "bounce" }, { time: d * 0.7, value: base.scaleY as number, easing: "bounce" }] },
    { property: "opacity", keyframes: [{ time: 0, value: 0, easing: "easeOut" }, { time: d * 0.3, value: 1, easing: "easeOut" }] },
  ],
  spin: (d, base) => [
    { property: "rotation", keyframes: [{ time: 0, value: base.rotation as number, easing: "easeInOut" }, { time: d, value: (base.rotation as number) + 360, easing: "easeInOut" }] },
  ],
  pulse: (d, base) => [
    { property: "scaleX", keyframes: [{ time: 0, value: base.scaleX as number, easing: "easeInOut" }, { time: d * 0.5, value: (base.scaleX as number) * 1.15, easing: "easeInOut" }, { time: d, value: base.scaleX as number, easing: "easeInOut" }] },
    { property: "scaleY", keyframes: [{ time: 0, value: base.scaleY as number, easing: "easeInOut" }, { time: d * 0.5, value: (base.scaleY as number) * 1.15, easing: "easeInOut" }, { time: d, value: base.scaleY as number, easing: "easeInOut" }] },
  ],
  float: (d, base) => [
    { property: "y", keyframes: [{ time: 0, value: base.y as number, easing: "easeInOut" }, { time: d * 0.5, value: (base.y as number) - 20, easing: "easeInOut" }, { time: d, value: base.y as number, easing: "easeInOut" }] },
  ],
  pop: (d, base) => [
    { property: "scaleX", keyframes: [{ time: 0, value: base.scaleX as number, easing: "spring" }, { time: d * 0.35, value: (base.scaleX as number) * 1.25, easing: "spring" }, { time: d * 0.7, value: base.scaleX as number, easing: "spring" }] },
    { property: "scaleY", keyframes: [{ time: 0, value: base.scaleY as number, easing: "spring" }, { time: d * 0.35, value: (base.scaleY as number) * 1.25, easing: "spring" }, { time: d * 0.7, value: base.scaleY as number, easing: "spring" }] },
  ],
};

function getBaseValues(project: Project, elementId: string): Record<AnimatableProperty, AnimValue> {
  const el = project.elements.find((e) => e.id === elementId);
  if (!el) {
    return { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, fill: "#000", stroke: "none", strokeWidth: 0, strokeDashoffset: 0, pathD: "", pathProgress: 0 };
  }
  return {
    x: el.transform.x,
    y: el.transform.y,
    rotation: el.transform.rotation,
    scaleX: el.transform.scaleX,
    scaleY: el.transform.scaleY,
    opacity: typeof el.attrs.opacity === "number" ? el.attrs.opacity : 1,
    fill: (el.attrs.fill as string) ?? "#000",
    stroke: (el.attrs.stroke as string) ?? "none",
    strokeWidth: (el.attrs["stroke-width"] as number) ?? 0,
    strokeDashoffset: (el.attrs["stroke-dashoffset"] as number) ?? 0,
    pathD: (el.attrs.d as string) ?? "",
    pathProgress: 0,
  };
}

export function applyPreset(
  project: Project,
  elementIds: string[],
  presetId: string,
  startTime: number,
  stagger = 0
): Project {
  const builder = PRESET_TRACKS[presetId];
  if (!builder) return project;

  let result = project;
  const segmentDuration = 1.2;

  elementIds.forEach((elementId, i) => {
    const offset = startTime + i * stagger;
    const base = getBaseValues(result, elementId);
    const tracks = builder(segmentDuration, base);

    for (const track of tracks) {
      for (const kf of track.keyframes) {
        result = addKeyframe(result, elementId, track.property, offset + kf.time, kf.value);
        const t = result.tracks.find((t) => t.elementId === elementId && t.property === track.property);
        const added = t?.keyframes.find((k) => Math.abs(k.time - (offset + kf.time)) < 0.001);
        if (added && kf.easing) {
          added.easing = { type: "preset", preset: kf.easing };
        }
      }
    }
  });

  const maxEnd = startTime + elementIds.length * stagger + segmentDuration;
  if (maxEnd > result.duration) {
    result = { ...result, duration: Math.ceil(maxEnd * 2) / 2 };
  }

  return result;
}
