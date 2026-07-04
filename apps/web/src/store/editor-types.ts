import type {
  AnimatableProperty,
  AnimValue,
  EasingCurve,
  Project,
} from "@svg-animator/types";
import type { AnimationTrack, ElementNode } from "@svg-animator/types";

export type SelectionMode = "replace" | "add" | "toggle" | "range";
export type CanvasViewMode = "editor" | "3d";

export interface HistoryEntry {
  project: Project;
  selectedIds: string[];
  selectionAnchorId: string | null;
}

export interface ElementClipboard {
  elements: ElementNode[];
  tracks: AnimationTrack[];
}

export interface KeyframeRef {
  trackId: string;
  keyframeId: string;
}

export interface KeyframeClipboardEntry {
  elementId: string;
  property: AnimatableProperty;
  time: number;
  value: AnimValue;
  easing: EasingCurve;
  hold?: boolean;
}

/** Minimal store shape needed by history helpers */
export interface HistoryStoreSlice {
  project: Project | null;
  selectedIds: string[];
  selectionAnchorId: string | null;
  history: HistoryEntry[];
  historyIndex: number;
}

export interface EditorStoreState extends HistoryStoreSlice {
  lastSelectedId: string | null;
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
  panX: number;
  panY: number;
  appliedState: import("@svg-animator/types").AppliedState;
  isDragging: boolean;
  timelineZoom: number;
  snapEnabled: boolean;
  rightPanelTab: "inspector" | "ai";
  leftPanelTab: "layers" | "states";
  activeTool: import("@svg-animator/types").DrawingTool;
  motionPathTargetId: string | null;
  clipboard: ElementClipboard | null;
  keyframeClipboard: KeyframeClipboardEntry[] | null;
  selectedKeyframeRefs: KeyframeRef[];
  activeAnimProperty: AnimatableProperty | null;
  lastClipboardType: "elements" | "keyframes" | null;
  renamingLayerId: string | null;
  canvasViewMode: CanvasViewMode;
  layer3dSpacing: number;
  layer3dZoom: number;
  editorCanvasHovered: boolean;
  onionSkinEnabled: boolean;
  stateMachinePreview: boolean;
  stateMachineRuntime: import("@svg-animator/engine").StateMachineRuntime | null;
  collabEnabled: boolean;
  workspaceId: string | null;
}
