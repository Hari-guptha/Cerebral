import type { AnimatableProperty, AnimValue, EasingPreset, Project } from "@svg-animator/types";
import { addKeyframe } from "./animation";

export interface AiKeyframeSpec {
  time: number;
  value: AnimValue;
  easing?: EasingPreset;
  hold?: boolean;
}

export interface AiTrackSpec {
  property: AnimatableProperty;
  keyframes: AiKeyframeSpec[];
}

export interface AiElementAnimation {
  elementId?: string;
  elementName?: string;
  tracks: AiTrackSpec[];
}

export interface AiAnimationPlan {
  duration?: number;
  message?: string;
  animations: AiElementAnimation[];
}

const VALID_PROPERTIES: AnimatableProperty[] = [
  "x", "y", "rotation", "scaleX", "scaleY", "opacity",
  "fill", "stroke", "strokeWidth", "strokeDashoffset", "pathD", "pathProgress",
];

const VALID_EASINGS: EasingPreset[] = [
  "linear", "easeIn", "easeOut", "easeInOut", "spring", "bounce", "anticipate",
];

function resolveElementId(project: Project, spec: AiElementAnimation): string | null {
  if (spec.elementId && project.elements.some((e) => e.id === spec.elementId)) {
    return spec.elementId;
  }
  if (spec.elementName) {
    const byName = project.elements.find(
      (e) => e.name.toLowerCase() === spec.elementName!.toLowerCase()
    );
    if (byName) return byName.id;
    const partial = project.elements.find((e) =>
      e.name.toLowerCase().includes(spec.elementName!.toLowerCase())
    );
    if (partial) return partial.id;
  }
  return null;
}

export function applyAnimationPlan(project: Project, plan: AiAnimationPlan): Project {
  let result = { ...project, tracks: [...project.tracks] };

  if (plan.duration && plan.duration > result.duration) {
    result.duration = plan.duration;
  }

  for (const anim of plan.animations) {
    const elementId = resolveElementId(result, anim);
    if (!elementId) continue;

    for (const trackSpec of anim.tracks) {
      if (!VALID_PROPERTIES.includes(trackSpec.property)) continue;

      for (const kf of trackSpec.keyframes) {
        const time = Math.max(0, Math.min(result.duration, kf.time));
        result = addKeyframe(result, elementId, trackSpec.property, time, kf.value);

        if (kf.easing && VALID_EASINGS.includes(kf.easing)) {
          const track = result.tracks.find(
            (t) => t.elementId === elementId && t.property === trackSpec.property
          );
          const keyframe = track?.keyframes.find((k) => Math.abs(k.time - time) < 0.001);
          if (keyframe) {
            keyframe.easing = { type: "preset", preset: kf.easing };
            if (kf.hold) keyframe.hold = true;
          }
        }
      }
    }
  }

  return result;
}

export interface AiContextV2 {
  schemaVersion: 2;
  name: string;
  duration: number;
  fps: number;
  canvas: Project["canvas"];
  settings: {
    loop: string;
    trigger: string;
    workAreaIn: number | null;
    workAreaOut: number | null;
    autoKeyframe: boolean;
  };
  markers: { time: number; label: string }[];
  stateMachine: {
    name: string;
    states: { id: string; name: string; start: number; end: number }[];
    inputs: { id: string; name: string; type: string }[];
    transitions: { from: string; to: string; input: string }[];
  } | null;
  elements: {
    id: string;
    name: string;
    type: string;
    transform: Project["elements"][0]["transform"];
    opacity: number | string;
    visible: boolean;
    locked: boolean;
    selected: boolean;
    motionPathId: string | null;
    motionPathRotate: boolean;
    hasPathMorph: boolean;
  }[];
  tracks: {
    elementId: string;
    elementName: string;
    property: AnimatableProperty;
    keyframes: { time: number; value: AnimValue }[];
  }[];
  selectedIds: string[];
  hints: string[];
}

export function buildAiContext(project: Project, selectedIds: string[]): AiContextV2 {
  const elementById = new Map(project.elements.map((e) => [e.id, e]));

  const elements = project.elements
    .filter((e) => e.type !== "group" || getChildrenCount(project, e.id) > 0)
    .map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      transform: e.transform,
      opacity: e.attrs.opacity ?? 1,
      visible: e.visible,
      locked: e.locked,
      selected: selectedIds.includes(e.id),
      motionPathId: e.motionPathId ?? null,
      motionPathRotate: e.motionPathRotate ?? false,
      hasPathMorph: project.tracks.some(
        (t) => t.elementId === e.id && t.property === "pathD" && t.keyframes.length > 0
      ),
    }));

  const tracks = project.tracks
    .filter((t) => t.enabled && t.keyframes.length > 0)
    .map((t) => ({
      elementId: t.elementId,
      elementName: elementById.get(t.elementId)?.name ?? t.elementId,
      property: t.property,
      keyframes: [...t.keyframes]
        .sort((a, b) => a.time - b.time)
        .map((kf) => ({ time: kf.time, value: kf.value })),
    }));

  const sm = project.stateMachine;

  const hints: string[] = [
    "Use pathProgress (0–1) for motion along motionPathId paths",
    "Prefer element ids from context; match elementName only as fallback",
    "Respect workAreaIn/workAreaOut when looping preview sections",
  ];

  if (sm) {
    hints.push("Project has a state machine — timeline segments map to states");
  }

  return {
    schemaVersion: 2,
    name: project.name,
    duration: project.duration,
    fps: project.fps,
    canvas: project.canvas,
    settings: {
      loop: project.settings.loop,
      trigger: project.settings.trigger,
      workAreaIn: project.settings.workAreaIn ?? null,
      workAreaOut: project.settings.workAreaOut ?? null,
      autoKeyframe: project.settings.autoKeyframe,
    },
    markers: project.markers.map((m) => ({ time: m.time, label: m.label })),
    stateMachine: sm
      ? {
          name: sm.name,
          states: sm.states.map((s) => ({
            id: s.id,
            name: s.name,
            start: s.timelineStart,
            end: s.timelineEnd,
          })),
          inputs: sm.inputs.map((i) => ({ id: i.id, name: i.name, type: i.type })),
          transitions: sm.transitions.map((t) => {
            const from = sm.states.find((s) => s.id === t.fromStateId)?.name ?? t.fromStateId;
            const to = sm.states.find((s) => s.id === t.toStateId)?.name ?? t.toStateId;
            const input = sm.inputs.find((i) => i.id === t.inputId)?.name ?? t.inputId;
            return { from, to, input };
          }),
        }
      : null,
    elements,
    tracks,
    selectedIds,
    hints,
  };
}

function getChildrenCount(project: Project, parentId: string): number {
  return project.elements.filter((e) => e.parentId === parentId).length;
}
