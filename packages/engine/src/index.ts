export { parseSvg, getChildren, groupElements, ungroupElements, reorderElement } from "./parser";
export type { ParseResult } from "./parser";
export {
  renderProjectSnapshot,
  createElement,
  updateElementAttrs,
  createDefaultStateMachine,
} from "./render-snapshot";
export {
  initStateMachine,
  fireInput,
  fireInputByName,
  tickStateMachine,
  exportStateMachinePlayer,
  ensureStateMachine,
  addStateMachineInput,
  addStateMachineState,
  addStateTransition,
} from "./state-machine";
export type { StateMachineRuntime } from "./state-machine";
export {
  sampleProject,
  sampleTrack,
  addKeyframe,
  removeKeyframe,
  updateKeyframeTime,
  updateKeyframeEasing,
  setPropertyAtTime,
  staggerKeyframes,
  getTracksForElement,
  buildTransformString,
  getOrCreateTrack,
} from "./animation";
export { addStrokeDrawOn, addStaggerReveal, addPathMorph } from "./advanced-animators";
export { applyAnimationPlan, buildAiContext } from "./ai-animation";
export type { AiAnimationPlan, AiElementAnimation, AiTrackSpec, AiKeyframeSpec } from "./ai-animation";
export { ANIMATION_PRESETS, applyPreset } from "./presets";
export type { AnimationPreset, PresetTrack, PresetKeyframe } from "./presets";
export { evaluateEasing, toCssEasing, toSmilKeySplines } from "./easing";
export { estimatePathLength, measurePathLengthFromSvg, getPointOnPathD, getTangentAngleOnPathD, getPathVertices, rebuildPathFromVertices } from "./path-utils";
export { applyMotionPaths } from "./motion-path";
export { exportProject, exportSmil, exportCss, exportJs, exportReact, exportLottie, EXPORT_CAPABILITIES } from "./export";
