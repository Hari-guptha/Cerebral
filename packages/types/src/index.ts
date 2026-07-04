export type ElementType =
  | "group"
  | "path"
  | "rect"
  | "circle"
  | "ellipse"
  | "line"
  | "polyline"
  | "polygon"
  | "text"
  | "use"
  | "image"
  | "video";

/** How raster/video content fits its frame (CSS object-fit analogue). */
export type ObjectFitMode = "contain" | "cover" | "fill" | "none";

export interface MediaElementAttrs {
  href: string;
  /** IndexedDB asset reference for large blobs (video). */
  assetId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  objectFit: ObjectFitMode;
  /** Normalized crop rect (0–1) within source media. */
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  /** Video trim in source seconds. */
  trimIn?: number;
  trimOut?: number;
  sourceDuration?: number;
  muted?: number;
  playbackRate?: number;
}

export interface Transform2D {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  originX: number;
  originY: number;
}

export const DEFAULT_TRANSFORM: Transform2D = {
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  originX: 0,
  originY: 0,
};

export type AnimatableProperty =
  | "x"
  | "y"
  | "rotation"
  | "scaleX"
  | "scaleY"
  | "opacity"
  | "fill"
  | "stroke"
  | "strokeWidth"
  | "strokeDashoffset"
  | "pathD"
  | "pathProgress";

export type AnimValue = number | string;

export type EasingPreset =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "spring"
  | "bounce"
  | "anticipate";

export interface EasingCurve {
  type: "preset" | "bezier";
  preset?: EasingPreset;
  /** cubic-bezier control points [x1, y1, x2, y2] */
  bezier?: [number, number, number, number];
}

export const DEFAULT_EASING: EasingCurve = { type: "preset", preset: "easeInOut" };

export interface Keyframe {
  id: string;
  time: number;
  value: AnimValue;
  easing: EasingCurve;
  hold?: boolean;
}

export interface AnimationTrack {
  id: string;
  elementId: string;
  property: AnimatableProperty;
  keyframes: Keyframe[];
  enabled: boolean;
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color?: string;
}

export type LoopMode = "once" | "loop" | "pingpong";

export type TriggerType = "load" | "hover" | "click" | "scroll";

export type DrawingTool =
  | "select"
  | "rectangle"
  | "ellipse"
  | "line"
  | "pen"
  | "motionPath"
  | "text";

export type StateInputType = "trigger" | "bool" | "number";

export interface StateInput {
  id: string;
  name: string;
  type: StateInputType;
  defaultValue?: boolean | number;
}

export interface AnimationState {
  id: string;
  name: string;
  timelineStart: number;
  timelineEnd: number;
  loop?: boolean;
}

export interface StateTransition {
  id: string;
  fromStateId: string;
  toStateId: string;
  inputId: string;
}

export interface StateMachine {
  id: string;
  name: string;
  initialStateId: string;
  states: AnimationState[];
  transitions: StateTransition[];
  inputs: StateInput[];
}

export interface ProjectSettings {
  loop: LoopMode;
  trigger: TriggerType;
  autoKeyframe: boolean;
  idPrefix: string;
  responsive: boolean;
  workAreaIn?: number;
  workAreaOut?: number;
}

export const DEFAULT_SETTINGS: ProjectSettings = {
  loop: "once",
  trigger: "load",
  autoKeyframe: true,
  idPrefix: "sa",
  responsive: false,
};

export interface ElementNode {
  id: string;
  svgId?: string;
  name: string;
  type: ElementType;
  parentId: string | null;
  visible: boolean;
  locked: boolean;
  order: number;
  attrs: Record<string, string | number>;
  transform: Transform2D;
  /** Follow this path element's `d` geometry (0–1 via pathProgress). */
  motionPathId?: string | null;
  /** Rotate element tangent to the motion path. */
  motionPathRotate?: boolean;
}

export interface CanvasConfig {
  width: number;
  height: number;
  viewBox: string;
  background?: string;
}

export interface Project {
  id: string;
  name: string;
  version: 1;
  canvas: CanvasConfig;
  fps: number;
  duration: number;
  elements: ElementNode[];
  tracks: AnimationTrack[];
  markers: TimelineMarker[];
  settings: ProjectSettings;
  stateMachine?: StateMachine | null;
  sourceSvg?: string;
}

export type ExportFormat =
  | "smil"
  | "css"
  | "js"
  | "html"
  | "react"
  | "lottie"
  | "gif"
  | "mp4"
  | "webm"
  | "project";

export interface ExportOptions {
  format: ExportFormat;
  loop?: LoopMode;
  trigger?: TriggerType;
  optimize?: boolean;
  idPrefix?: string;
  responsive?: boolean;
}

export interface ExportResult {
  format: ExportFormat;
  filename: string;
  mimeType: string;
  content: string | Blob;
  warnings: string[];
}

export interface AppliedElementState {
  elementId: string;
  transform: Transform2D;
  opacity: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDashoffset?: number;
  pathD?: string;
  /** 0–1 progress along motionPathId */
  pathProgress?: number;
}

export type AppliedState = Record<string, AppliedElementState>;

export interface EditorState {
  project: Project | null;
  selectedIds: string[];
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
  panX: number;
  panY: number;
}

export function createId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyProject(name = "Untitled"): Project {
  return {
    id: createId(),
    name,
    version: 1,
    canvas: { width: 512, height: 512, viewBox: "0 0 512 512" },
    fps: 30,
    duration: 4,
    elements: [],
    tracks: [],
    markers: [],
    settings: { ...DEFAULT_SETTINGS },
    stateMachine: null,
  };
}
