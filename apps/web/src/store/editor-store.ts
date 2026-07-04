import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  AnimatableProperty,
  AnimValue,
  AnimationTrack,
  DrawingTool,
  EasingCurve,
  ElementNode,
  LoopMode,
  Project,
  StateMachine,
  TimelineMarker,
} from "@svg-animator/types";
import { createEmptyProject, createId } from "@svg-animator/types";
import {
  parseSvg,
  addKeyframe,
  removeKeyframe,
  updateKeyframeTime,
  updateKeyframeEasing,
  setPropertyAtTime,
  groupElements,
  ungroupElements,
  reorderElement,
  staggerKeyframes,
  sampleProject,
  getChildren,
  applyAnimationPlan,
  applyPreset,
  createElement,
  updateElementAttrs,
  addPathMorph,
  ensureStateMachine,
  addStateMachineInput,
  addStateMachineState,
  addStateTransition,
  initStateMachine,
  fireInputByName,
  type StateMachineRuntime,
} from "@svg-animator/engine";
import type { AiAnimationPlan } from "@svg-animator/engine";
import type { AppliedState } from "@svg-animator/types";
import { reconcileAppliedState } from "@/lib/applied-state";
import { persistProject, saveAutoVersion, checkDatabaseStatus } from "@/lib/project-api";
import {
  buildImageAttrs,
  buildVideoAttrs,
  probeImageFile,
  probeVideoFile,
  type MediaImportOptions,
} from "@/lib/media-import";
import { hydrateProjectMediaHrefs } from "@/lib/media-assets";
import type { EditorStoreState, SelectionMode, CanvasViewMode } from "./editor-types";
export type { SelectionMode, CanvasViewMode } from "./editor-types";
import {
  initHistory,
  pushHistory,
  canUndo as historyCanUndo,
  canRedo as historyCanRedo,
  applyHistoryEntry,
} from "./editor-history";
import {
  flattenLayerIds,
  collectSubtreeIds,
  buildClipboard,
  cloneClipboard,
} from "./editor-clipboard";
import {
  buildKeyframeClipboard,
  deleteKeyframeRefs,
  duplicateKeyframeRefs,
  getAppliedPropertyValue,
  mergeKeyframeSelection,
  pasteKeyframeClipboard,
} from "./editor-keyframes";

interface EditorStore extends EditorStoreState {
  newProject: (name?: string) => void;
  loadProjectData: (project: Project) => void;
  applyRemoteProject: (project: Project) => void;
  setCollabEnabled: (enabled: boolean) => void;
  setWorkspaceId: (id: string | null) => void;
  importSvg: (svg: string, name?: string) => void;
  importSvgIntoProject: (svg: string, name?: string, mode?: "replace" | "merge") => void;
  importImageFile: (file: File, options?: MediaImportOptions) => Promise<void>;
  importVideoFile: (file: File, options?: MediaImportOptions) => Promise<void>;
  hydrateProjectMedia: () => Promise<void>;
  setSelectedIds: (ids: string[]) => void;
  selectElement: (id: string, mode?: SelectionMode) => void;
  toggleSelection: (id: string, mode?: SelectionMode) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setCanvasViewport: (zoom: number, panX: number, panY: number) => void;
  setEditorCanvasHovered: (hovered: boolean) => void;
  setDuration: (duration: number) => void;
  setFps: (fps: number) => void;
  setProjectName: (name: string) => void;
  toggleElementVisibility: (id: string) => void;
  toggleElementLock: (id: string) => void;
  renameElement: (id: string, name: string) => void;
  setRenamingLayerId: (id: string | null) => void;
  finishRenameElement: (id: string, name: string) => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  reorderElement: (id: string, direction: "up" | "down") => void;
  setProperty: (elementId: string, property: AnimatableProperty, value: AnimValue, silent?: boolean) => void;
  moveSelectedBy: (dx: number, dy: number, silent?: boolean) => void;
  setDragging: (dragging: boolean) => void;
  addKeyframeAtPlayhead: (elementId: string, property: AnimatableProperty) => void;
  removeKeyframe: (trackId: string, keyframeId: string) => void;
  updateKeyframeTime: (trackId: string, keyframeId: string, time: number) => void;
  updateKeyframeEasing: (trackId: string, keyframeId: string, easing: EasingCurve) => void;
  staggerSelected: (property: AnimatableProperty, stagger: number, value: AnimValue) => void;
  addMarker: (label: string) => void;
  removeMarker: (id: string) => void;
  undo: () => void;
  redo: () => void;
  commitHistory: () => void;
  autosave: () => Promise<void>;
  refreshAppliedState: () => void;
  setTimelineZoom: (zoom: number) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setRightPanelTab: (tab: "inspector" | "ai") => void;
  applyAiPlan: (plan: AiAnimationPlan) => void;
  applyAnimationPreset: (presetId: string, stagger?: number) => void;
  toggleTrackEnabled: (trackId: string) => void;
  rotateSelectedBy: (degrees: number, silent?: boolean) => void;
  scaleSelectedBy: (factor: number, silent?: boolean) => void;
  setActiveTool: (tool: DrawingTool) => void;
  addDrawnElement: (type: DrawingTool, attrs: Record<string, string | number>, name?: string) => void;
  updateDrawnElement: (elementId: string, attrs: Record<string, string | number>) => void;
  setProjectSettings: (patch: Partial<Project["settings"]>) => void;
  applyPathMorph: (elementId: string, toPath: string, duration?: number) => void;
  setMotionPath: (elementId: string, pathId: string | null, rotate?: boolean) => void;
  updateStateMachine: (sm: StateMachine) => void;
  setWorkArea: (workAreaIn: number, workAreaOut: number) => void;
  setOnionSkinEnabled: (enabled: boolean) => void;
  setStateMachinePreview: (enabled: boolean) => void;
  resetStateMachineRuntime: () => void;
  fireStateMachineInput: (inputName: string) => void;
  addSmInput: (name: string) => void;
  addSmState: (name: string, start: number, end: number) => void;
  addSmTransition: (fromId: string, toId: string, inputId: string) => void;
  setLeftPanelTab: (tab: "layers" | "states") => void;
  setCanvasViewMode: (mode: CanvasViewMode) => void;
  setLayer3dSpacing: (spacing: number) => void;
  setLayer3dZoom: (zoom: number) => void;
  deleteSelected: () => void;
  copySelected: () => void;
  cutSelected: () => void;
  pasteClipboard: () => void;
  duplicateSelected: () => void;
  selectAll: () => void;
  deselectAll: () => void;
  nudgeSelected: (dx: number, dy: number) => void;
  setActiveAnimProperty: (property: AnimatableProperty | null) => void;
  selectKeyframe: (trackId: string, keyframeId: string, mode?: SelectionMode) => void;
  deselectKeyframes: () => void;
  deleteSelectedKeyframes: () => void;
  copySelectedKeyframes: () => void;
  cutSelectedKeyframes: () => void;
  pasteKeyframes: () => void;
  duplicateSelectedKeyframes: () => void;
  nudgeSelectedKeyframes: (dt: number) => void;
  insertKeyframeAtPlayhead: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useEditorStore = create<EditorStore>()(
  immer((set, get) => ({
    project: null,
    selectedIds: [],
    lastSelectedId: null,
    selectionAnchorId: null,
    currentTime: 0,
    isPlaying: false,
    zoom: 1,
    panX: 0,
    panY: 0,
    appliedState: {},
    history: [],
    historyIndex: -1,
    isDragging: false,
    timelineZoom: 1.25,
    snapEnabled: true,
    rightPanelTab: "inspector",
    leftPanelTab: "layers",
    activeTool: "select",
    motionPathTargetId: null,
    clipboard: null,
    keyframeClipboard: null,
    selectedKeyframeRefs: [],
    activeAnimProperty: null,
    lastClipboardType: null,
    renamingLayerId: null,
    canvasViewMode: "editor",
    layer3dSpacing: 140,
    layer3dZoom: 1,
    editorCanvasHovered: false,
    onionSkinEnabled: true,
    stateMachinePreview: false,
    stateMachineRuntime: null,
    collabEnabled: true,
    workspaceId: null,

    newProject: (name) =>
      set((state) => {
        const p = createEmptyProject(name);
        state.project = p;
        state.selectedIds = [];
        state.lastSelectedId = null;
        state.selectionAnchorId = null;
        state.currentTime = 0;
        state.isPlaying = false;
        initHistory(state, p);
        state.appliedState = {};
      }),

    loadProjectData: (project) => {
      set((state) => {
        state.project = project;
        state.selectedIds = [];
        state.lastSelectedId = null;
        state.selectionAnchorId = null;
        state.currentTime = 0;
        state.isPlaying = false;
        initHistory(state, project);
        state.appliedState = sampleProject(project, 0);
      });
      void get().hydrateProjectMedia();
    },

    applyRemoteProject: (project) =>
      set((state) => {
        state.project = project;
        state.appliedState = sampleProject(project, state.currentTime);
      }),

    setCollabEnabled: (enabled) => set((s) => { s.collabEnabled = enabled; }),
    setWorkspaceId: (id) => set((s) => { s.workspaceId = id; }),

    importSvg: (svg, name) => {
      const { project } = parseSvg(svg, name);
      get().loadProjectData(project);
      void get().hydrateProjectMedia();
      get().refreshAppliedState();
    },

    importSvgIntoProject: (svg, name, mode = "merge") => {
      if (mode === "replace") {
        get().importSvg(svg, name);
        return;
      }
      const { project: imported } = parseSvg(svg, name);
      const current = get().project;
      if (!current) {
        get().loadProjectData(imported);
        void get().hydrateProjectMedia();
        return;
      }

      const { element: group, project: withGroup } = createElement(
        "group",
        null,
        current,
        {},
        name ?? "Imported SVG"
      );
      const idMap = new Map<string, string>();
      for (const el of imported.elements) {
        idMap.set(el.id, createId());
      }
      const mergedElements = imported.elements.map((el) => ({
        ...el,
        id: idMap.get(el.id)!,
        parentId:
          el.parentId === null
            ? group.id
            : (idMap.get(el.parentId) ?? group.id),
      }));

      set((s) => {
        if (!s.project) return;
        s.project = {
          ...withGroup,
          elements: [...withGroup.elements, ...mergedElements],
        };
        s.selectedIds = [group.id];
        s.lastSelectedId = group.id;
      });
      get().commitHistory();
      void get().hydrateProjectMedia();
      get().refreshAppliedState();
    },

    importImageFile: async (file, options = {}) => {
      let project = get().project;
      if (!project) {
        get().newProject(file.name.replace(/\.[^.]+$/, ""));
        project = get().project;
      }
      if (!project) return;

      const probe = await probeImageFile(file);
      const attrs = buildImageAttrs(
        probe.dataUrl,
        probe.width,
        probe.height,
        project.canvas,
        options
      );
      set((s) => {
        if (!s.project) return;
        const { project: next } = createElement("image", null, s.project, attrs, file.name);
        s.project = next;
        const added = next.elements[next.elements.length - 1];
        s.selectedIds = [added.id];
        s.lastSelectedId = added.id;
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    importVideoFile: async (file, options = {}) => {
      let project = get().project;
      if (!project) {
        get().newProject(file.name.replace(/\.[^.]+$/, ""));
        project = get().project;
      }
      if (!project) return;

      const probe = await probeVideoFile(file);
      const trimOut = options.trimOut ?? probe.duration;
      const clipDuration = trimOut - (options.trimIn ?? 0);
      const attrs = buildVideoAttrs(
        probe.objectUrl,
        probe.assetId,
        probe.width,
        probe.height,
        probe.duration,
        project.canvas,
        { ...options, trimOut }
      );

      set((s) => {
        if (!s.project) return;
        const { project: next } = createElement("video", null, s.project, attrs, file.name);
        if (clipDuration > next.duration) {
          next.duration = Math.ceil(clipDuration * 10) / 10;
        }
        s.project = next;
        const added = next.elements[next.elements.length - 1];
        s.selectedIds = [added.id];
        s.lastSelectedId = added.id;
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    hydrateProjectMedia: async () => {
      const project = get().project;
      if (!project) return;
      const elements = project.elements.map((e) => ({
        ...e,
        attrs: { ...e.attrs },
      }));
      await hydrateProjectMediaHrefs(elements);
      set((s) => {
        if (!s.project) return;
        s.project.elements = elements;
      });
      get().refreshAppliedState();
    },

    setSelectedIds: (ids) =>
      set((s) => {
        s.selectedIds = ids;
        s.lastSelectedId = ids[ids.length - 1] ?? null;
      }),

    selectElement: (id, mode = "replace") =>
      set((s) => {
        if (!s.project) return;

        const anchor = s.selectionAnchorId ?? s.lastSelectedId;

        if (mode === "range" && !anchor) {
          mode = "add";
        }

        if (mode === "range" && anchor) {
          const flat = flattenLayerIds(s.project);
          const a = flat.indexOf(anchor);
          const b = flat.indexOf(id);
          if (a >= 0 && b >= 0) {
            const [start, end] = a < b ? [a, b] : [b, a];
            s.selectedIds = flat.slice(start, end + 1);
            s.lastSelectedId = id;
            return;
          }
          mode = "add";
        }

        if (mode === "toggle") {
          s.selectedIds = s.selectedIds.includes(id)
            ? s.selectedIds.filter((x) => x !== id)
            : [...s.selectedIds, id];
          if (!s.selectionAnchorId && s.selectedIds.length === 1) {
            s.selectionAnchorId = s.selectedIds[0];
          }
        } else if (mode === "add") {
          if (!s.selectedIds.includes(id)) {
            s.selectedIds = [...s.selectedIds, id];
          }
          if (!s.selectionAnchorId && s.selectedIds.length > 0) {
            s.selectionAnchorId = s.selectedIds[0];
          }
        } else {
          s.selectedIds = [id];
          s.selectionAnchorId = id;
        }

        s.lastSelectedId = id;
      }),

    toggleSelection: (id, mode = "toggle") => get().selectElement(id, mode),

    setCurrentTime: (time) =>
      set((s) => {
        if (!s.project) return;
        s.currentTime = Math.max(0, Math.min(time, s.project.duration));
        const sampled = sampleProject(s.project, s.currentTime);
        s.appliedState = reconcileAppliedState(s.appliedState, sampled);
      }),

    setIsPlaying: (playing) => set((s) => { s.isPlaying = playing; }),
    setZoom: (zoom) => set((s) => { s.zoom = Math.max(0.25, Math.min(4, zoom)); }),
    setPan: (x, y) => set((s) => { s.panX = x; s.panY = y; }),
    setCanvasViewport: (zoom, panX, panY) =>
      set((s) => {
        s.zoom = Math.max(0.25, Math.min(4, zoom));
        s.panX = panX;
        s.panY = panY;
      }),
    setEditorCanvasHovered: (hovered) => set((s) => { s.editorCanvasHovered = hovered; }),
    setDragging: (dragging) => set((s) => { s.isDragging = dragging; }),

    setDuration: (duration) => {
      set((s) => {
        if (!s.project) return;
        s.project.duration = Math.max(0.1, duration);
      });
      get().commitHistory();
    },

    setFps: (fps) => {
      set((s) => {
        if (!s.project) return;
        s.project.fps = fps;
      });
      get().commitHistory();
    },

    setProjectName: (name) =>
      set((s) => {
        if (!s.project) return;
        s.project.name = name;
      }),

    toggleElementVisibility: (id) => {
      set((s) => {
        if (!s.project) return;
        const el = s.project.elements.find((e) => e.id === id);
        if (el) el.visible = !el.visible;
      });
      get().refreshAppliedState();
      get().commitHistory();
    },

    toggleElementLock: (id) => {
      set((s) => {
        if (!s.project) return;
        const el = s.project.elements.find((e) => e.id === id);
        if (el) el.locked = !el.locked;
      });
      get().commitHistory();
    },

    renameElement: (id, name) =>
      set((s) => {
        if (!s.project) return;
        const el = s.project.elements.find((e) => e.id === id);
        if (el) el.name = name;
      }),

    setRenamingLayerId: (id) =>
      set((s) => {
        s.renamingLayerId = id;
      }),

    finishRenameElement: (id, name) => {
      const trimmed = name.trim();
      set((s) => {
        if (!s.project) return;
        const el = s.project.elements.find((e) => e.id === id);
        if (el && trimmed) el.name = trimmed;
        if (s.renamingLayerId === id) s.renamingLayerId = null;
      });
      get().commitHistory();
    },

    groupSelected: () => {
      const { project, selectedIds } = get();
      if (!project || selectedIds.length < 2) return;

      const elements = selectedIds
        .map((id) => project.elements.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e));

      if (elements.length < 2) return;

      const parentId = elements[0].parentId;
      const sameParentIds = elements
        .filter((e) => e.parentId === parentId && !e.locked)
        .map((e) => e.id);

      if (sameParentIds.length < 2) return;

      const groupId = createId();
      set((s) => {
        if (!s.project) return;
        s.project.elements = groupElements(s.project.elements, sameParentIds, groupId);
        s.selectedIds = [groupId];
        s.lastSelectedId = groupId;
        s.selectionAnchorId = groupId;
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    ungroupSelected: () => {
      const { project, selectedIds } = get();
      if (!project || selectedIds.length !== 1) return;
      const el = project.elements.find((e) => e.id === selectedIds[0]);
      if (!el || el.type !== "group") return;

      const childIds = getChildren(project.elements, el.id).map((c) => c.id);
      set((s) => {
        if (!s.project) return;
        s.project.elements = ungroupElements(s.project.elements, el.id);
        s.selectedIds = childIds;
        s.lastSelectedId = childIds[0] ?? null;
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    reorderElement: (id, direction) => {
      set((s) => {
        if (!s.project) return;
        s.project.elements = reorderElement(s.project.elements, id, direction);
      });
      get().commitHistory();
    },

    setProperty: (elementId, property, value, silent = false) => {
      const { project, currentTime } = get();
      if (!project) return;
      const el = project.elements.find((e) => e.id === elementId);
      if (el?.locked) return;

      const autoKeyframe = project.settings.autoKeyframe;
      set((s) => {
        if (!s.project) return;
        s.project = setPropertyAtTime(
          s.project,
          elementId,
          property,
          currentTime,
          value,
          autoKeyframe
        );
      });
      get().refreshAppliedState();
      if (!silent) get().commitHistory();
    },

    moveSelectedBy: (dx, dy, silent = false) => {
      const { selectedIds, project, snapEnabled } = get();
      if (!project || selectedIds.length === 0) return;

      let sdx = dx;
      let sdy = dy;
      if (snapEnabled) {
        const grid = 8;
        sdx = Math.round(dx / grid) * grid;
        sdy = Math.round(dy / grid) * grid;
      }

      for (const id of selectedIds) {
        const el = project.elements.find((e) => e.id === id);
        if (!el || el.locked) continue;
        const state = get().appliedState[id];
        const x = (state?.transform.x ?? el.transform.x) + sdx;
        const y = (state?.transform.y ?? el.transform.y) + sdy;
        get().setProperty(id, "x", x, true);
        get().setProperty(id, "y", y, true);
      }
      if (!silent) get().commitHistory();
    },

    addKeyframeAtPlayhead: (elementId, property) => {
      const { project, currentTime, appliedState } = get();
      if (!project) return;
      set((s) => {
        if (!s.project) return;
        const state = appliedState[elementId];
        const value = state
          ? getAppliedPropertyValue(state, property)
          : undefined;
        s.project = addKeyframe(s.project, elementId, property, currentTime, value);
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    removeKeyframe: (trackId, keyframeId) => {
      set((s) => {
        if (!s.project) return;
        s.project = removeKeyframe(s.project, trackId, keyframeId);
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    updateKeyframeTime: (trackId, keyframeId, time) => {
      set((s) => {
        if (!s.project) return;
        s.project = updateKeyframeTime(s.project, trackId, keyframeId, time);
      });
      get().refreshAppliedState();
    },

    updateKeyframeEasing: (trackId, keyframeId, easing) => {
      set((s) => {
        if (!s.project) return;
        s.project = updateKeyframeEasing(s.project, trackId, keyframeId, easing);
      });
      get().commitHistory();
    },

    staggerSelected: (property, stagger, value) => {
      const { project, selectedIds, currentTime } = get();
      if (!project || selectedIds.length === 0) return;
      set((s) => {
        if (!s.project) return;
        s.project = staggerKeyframes(
          s.project,
          selectedIds,
          property,
          currentTime,
          stagger,
          value
        );
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    addMarker: (label) => {
      set((s) => {
        if (!s.project) return;
        s.project.markers.push({
          id: `marker_${Date.now()}`,
          time: s.currentTime,
          label,
        });
      });
      get().commitHistory();
    },

    removeMarker: (id) => {
      set((s) => {
        if (!s.project) return;
        s.project.markers = s.project.markers.filter((m) => m.id !== id);
      });
      get().commitHistory();
    },

    undo: () => {
      const { historyIndex, history } = get();
      if (historyIndex <= 0 || history.length < 2) return;

      set((s) => {
        s.historyIndex -= 1;
        const entry = s.history[s.historyIndex];
        s.project = JSON.parse(JSON.stringify(entry.project)) as Project;
        s.selectedIds = [...entry.selectedIds];
        s.lastSelectedId = entry.selectedIds[entry.selectedIds.length - 1] ?? null;
        s.selectionAnchorId = entry.selectionAnchorId;
      });
      get().refreshAppliedState();
    },

    redo: () => {
      const { historyIndex, history } = get();
      if (historyIndex >= history.length - 1) return;

      set((s) => {
        s.historyIndex += 1;
        const entry = s.history[s.historyIndex];
        s.project = JSON.parse(JSON.stringify(entry.project)) as Project;
        s.selectedIds = [...entry.selectedIds];
        s.lastSelectedId = entry.selectedIds[entry.selectedIds.length - 1] ?? null;
        s.selectionAnchorId = entry.selectionAnchorId;
      });
      get().refreshAppliedState();
    },

    canUndo: () => historyCanUndo(get()),
    canRedo: () => historyCanRedo(get()),

    commitHistory: () =>
      set((s) => {
        if (!s.project) return;
        pushHistory(s);
      }),

    autosave: async () => {
      const { project } = get();
      if (!project) return;
      await persistProject(project);
    },

    refreshAppliedState: () => {
      const { project, currentTime } = get();
      set((s) => {
        if (!s.project) return;
        const sampled = sampleProject(project!, currentTime);
        s.appliedState = reconcileAppliedState(s.appliedState, sampled);
      });
    },

    setTimelineZoom: (zoom) =>
      set((s) => { s.timelineZoom = Math.max(0.25, Math.min(10, zoom)); }),

    setSnapEnabled: (enabled) =>
      set((s) => { s.snapEnabled = enabled; }),

    setRightPanelTab: (tab) =>
      set((s) => { s.rightPanelTab = tab; }),

    applyAiPlan: (plan) => {
      set((s) => {
        if (!s.project) return;
        s.project = applyAnimationPlan(s.project, plan);
        if (plan.duration && plan.duration > s.project.duration) {
          s.project.duration = plan.duration;
        }
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    applyAnimationPreset: (presetId, stagger = 0.1) => {
      const { project, selectedIds, currentTime } = get();
      if (!project) return;
      const targets = selectedIds.length > 0
        ? selectedIds
        : project.elements.filter((e) => e.visible && !e.locked && e.type !== "group").map((e) => e.id);
      if (targets.length === 0) return;

      set((s) => {
        if (!s.project) return;
        s.project = applyPreset(s.project, targets, presetId, currentTime, stagger);
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    toggleTrackEnabled: (trackId) => {
      set((s) => {
        if (!s.project) return;
        s.project.tracks = s.project.tracks.map((t) =>
          t.id === trackId ? { ...t, enabled: !t.enabled } : t
        );
      });
      get().refreshAppliedState();
      get().commitHistory();
    },

    rotateSelectedBy: (degrees, silent = false) => {
      const { selectedIds, project } = get();
      if (!project || selectedIds.length === 0) return;
      for (const id of selectedIds) {
        const el = project.elements.find((e) => e.id === id);
        if (!el || el.locked) continue;
        const state = get().appliedState[id];
        const rot = (state?.transform.rotation ?? el.transform.rotation) + degrees;
        get().setProperty(id, "rotation", rot, true);
      }
      if (!silent) get().commitHistory();
    },

    scaleSelectedBy: (factor, silent = false) => {
      const { selectedIds, project } = get();
      if (!project || selectedIds.length === 0) return;
      for (const id of selectedIds) {
        const el = project.elements.find((e) => e.id === id);
        if (!el || el.locked) continue;
        const state = get().appliedState[id];
        const sx = (state?.transform.scaleX ?? el.transform.scaleX) * factor;
        const sy = (state?.transform.scaleY ?? el.transform.scaleY) * factor;
        get().setProperty(id, "scaleX", sx, true);
        get().setProperty(id, "scaleY", sy, true);
      }
      if (!silent) get().commitHistory();
    },

    setActiveTool: (tool) => set((s) => {
      s.activeTool = tool;
      if (tool === "motionPath" && s.selectedIds.length === 1) {
        s.motionPathTargetId = s.selectedIds[0];
      } else if (tool !== "motionPath") {
        s.motionPathTargetId = null;
      }
    }),

    addDrawnElement: (type, attrs, name) => {
      if (type === "select" || !get().project) return;
      const map: Record<string, import("@svg-animator/types").ElementType> = {
        rectangle: "rect",
        ellipse: "ellipse",
        line: "line",
        pen: "path",
        motionPath: "path",
        text: "text",
      };
      const elType = map[type];
      if (!elType) return;
      set((s) => {
        if (!s.project) return;
        const { project: next } = createElement(elType, null, s.project, attrs, name);
        s.project = next;
        const added = next.elements[next.elements.length - 1];
        s.selectedIds = [added.id];
        s.lastSelectedId = added.id;
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    updateDrawnElement: (elementId, attrs) => {
      set((s) => {
        if (!s.project) return;
        s.project = updateElementAttrs(s.project, elementId, attrs);
      });
      get().refreshAppliedState();
    },

    setProjectSettings: (patch) => {
      set((s) => {
        if (!s.project) return;
        s.project.settings = { ...s.project.settings, ...patch };
      });
      get().commitHistory();
    },

    applyPathMorph: (elementId, toPath, duration = 1) => {
      const { project, currentTime } = get();
      if (!project) return;
      const el = project.elements.find((e) => e.id === elementId);
      if (!el) return;
      const fromPath = String(el.attrs.d ?? "");
      set((s) => {
        if (!s.project) return;
        s.project = addPathMorph(s.project, elementId, currentTime, currentTime + duration, fromPath, toPath);
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    setMotionPath: (elementId, pathId, rotate = false) => {
      set((s) => {
        if (!s.project) return;
        s.project = {
          ...s.project,
          elements: s.project.elements.map((el) =>
            el.id === elementId
              ? { ...el, motionPathId: pathId, motionPathRotate: rotate }
              : el
          ),
        };
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    updateStateMachine: (sm) => {
      set((s) => {
        if (!s.project) return;
        s.project.stateMachine = sm;
      });
      get().resetStateMachineRuntime();
      get().commitHistory();
    },

    setWorkArea: (workAreaIn, workAreaOut) => {
      set((s) => {
        if (!s.project) return;
        const duration = s.project.duration;
        s.project.settings.workAreaIn = Math.max(0, Math.min(workAreaIn, duration));
        s.project.settings.workAreaOut = Math.max(
          s.project.settings.workAreaIn ?? 0,
          Math.min(workAreaOut, duration)
        );
      });
      get().commitHistory();
    },

    setOnionSkinEnabled: (enabled) => set((s) => { s.onionSkinEnabled = enabled; }),

    setStateMachinePreview: (enabled) => {
      set((s) => {
        s.stateMachinePreview = enabled;
        if (enabled && s.project?.stateMachine) {
          s.stateMachineRuntime = initStateMachine(s.project.stateMachine);
          const st = s.project.stateMachine.states.find(
            (x) => x.id === s.project!.stateMachine!.initialStateId
          );
          if (st) s.currentTime = st.timelineStart;
        } else if (!enabled) {
          s.stateMachineRuntime = null;
        }
      });
      get().refreshAppliedState();
    },

    resetStateMachineRuntime: () => {
      set((s) => {
        if (!s.project?.stateMachine) {
          s.stateMachineRuntime = null;
          return;
        }
        s.stateMachineRuntime = initStateMachine(s.project.stateMachine);
      });
    },

    fireStateMachineInput: (inputName) => {
      const { project, stateMachineRuntime, stateMachinePreview } = get();
      if (!project?.stateMachine || !stateMachineRuntime || !stateMachinePreview) return;

      const next = fireInputByName(project.stateMachine, stateMachineRuntime, inputName);
      set((s) => {
        s.stateMachineRuntime = next;
        s.currentTime = next.localTime;
      });
      get().refreshAppliedState();
    },

    addSmInput: (name) => {
      set((s) => {
        if (!s.project) return;
        s.project = addStateMachineInput(s.project, name);
      });
      get().commitHistory();
    },

    addSmState: (name, start, end) => {
      set((s) => {
        if (!s.project) return;
        s.project = addStateMachineState(s.project, name, start, end);
      });
      get().commitHistory();
    },

    addSmTransition: (fromId, toId, inputId) => {
      set((s) => {
        if (!s.project) return;
        s.project = addStateTransition(s.project, fromId, toId, inputId);
      });
      get().commitHistory();
    },

    setLeftPanelTab: (tab) => set((s) => { s.leftPanelTab = tab; }),

    setCanvasViewMode: (mode) => set((s) => { s.canvasViewMode = mode; }),

    setLayer3dSpacing: (spacing) =>
      set((s) => { s.layer3dSpacing = Math.max(80, Math.min(320, spacing)); }),

    setLayer3dZoom: (zoom) =>
      set((s) => { s.layer3dZoom = Math.max(0.25, Math.min(3, zoom)); }),

    deleteSelected: () => {
      const { project, selectedIds } = get();
      if (!project || selectedIds.length === 0) return;

      const toDelete = new Set<string>();
      for (const id of selectedIds) {
        const el = project.elements.find((e) => e.id === id);
        if (!el || el.locked) continue;
        collectSubtreeIds(project.elements, id).forEach((x) => toDelete.add(x));
      }
      if (toDelete.size === 0) return;

      set((s) => {
        if (!s.project) return;
        s.project.elements = s.project.elements.filter((e) => !toDelete.has(e.id));
        s.project.tracks = s.project.tracks.filter((t) => !toDelete.has(t.elementId));
        s.selectedIds = [];
        s.lastSelectedId = null;
        s.selectionAnchorId = null;
        s.renamingLayerId = null;
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    copySelected: () => {
      const { project, selectedIds } = get();
      const clip = buildClipboard(project!, selectedIds);
      if (!clip) return;
      set((s) => { s.clipboard = clip; s.lastClipboardType = "elements"; });
    },

    cutSelected: () => {
      get().copySelected();
      get().deleteSelected();
    },

    pasteClipboard: () => {
      const { project, clipboard } = get();
      if (!project || !clipboard || clipboard.elements.length === 0) return;

      const { elements, tracks, rootIds } = cloneClipboard(clipboard);
      set((s) => {
        if (!s.project) return;
        s.project.elements = [...s.project.elements, ...elements];
        s.project.tracks = [...s.project.tracks, ...tracks];
        s.selectedIds = rootIds;
        s.lastSelectedId = rootIds[rootIds.length - 1] ?? null;
        s.selectionAnchorId = rootIds[0] ?? null;
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    duplicateSelected: () => {
      get().copySelected();
      get().pasteClipboard();
    },

    selectAll: () => {
      const { project } = get();
      if (!project) return;
      const ids = project.elements.map((e) => e.id);
      set((s) => {
        s.selectedIds = ids;
        s.lastSelectedId = ids[ids.length - 1] ?? null;
        s.selectionAnchorId = ids[0] ?? null;
      });
    },

    deselectAll: () => {
      set((s) => {
        s.selectedIds = [];
        s.lastSelectedId = null;
        s.selectionAnchorId = null;
        s.selectedKeyframeRefs = [];
        s.renamingLayerId = null;
      });
    },

    nudgeSelected: (dx, dy) => {
      get().moveSelectedBy(dx, dy, false);
    },

    setActiveAnimProperty: (property) => {
      set((s) => { s.activeAnimProperty = property; });
    },

    selectKeyframe: (trackId, keyframeId, mode = "replace") => {
      const kfMode = mode === "range" ? "add" : mode;
      set((s) => {
        s.selectedKeyframeRefs = mergeKeyframeSelection(
          s.selectedKeyframeRefs,
          { trackId, keyframeId },
          kfMode
        );
        const track = s.project?.tracks.find((t) => t.id === trackId);
        if (track) s.activeAnimProperty = track.property;
      });
    },

    deselectKeyframes: () => {
      set((s) => { s.selectedKeyframeRefs = []; });
    },

    deleteSelectedKeyframes: () => {
      const { project, selectedKeyframeRefs } = get();
      if (!project || selectedKeyframeRefs.length === 0) return;
      set((s) => {
        if (!s.project) return;
        s.project = deleteKeyframeRefs(s.project, selectedKeyframeRefs);
        s.selectedKeyframeRefs = [];
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    copySelectedKeyframes: () => {
      const { project, selectedKeyframeRefs } = get();
      if (!project || selectedKeyframeRefs.length === 0) return;
      const clip = buildKeyframeClipboard(project, selectedKeyframeRefs);
      if (clip.length === 0) return;
      set((s) => { s.keyframeClipboard = clip; s.lastClipboardType = "keyframes"; });
    },

    cutSelectedKeyframes: () => {
      get().copySelectedKeyframes();
      get().deleteSelectedKeyframes();
    },

    pasteKeyframes: () => {
      const { project, keyframeClipboard, currentTime, selectedIds } = get();
      if (!project || !keyframeClipboard || keyframeClipboard.length === 0) return;
      const targets = selectedIds.length > 0 ? selectedIds : [keyframeClipboard[0].elementId];
      set((s) => {
        if (!s.project) return;
        s.project = pasteKeyframeClipboard(
          s.project,
          keyframeClipboard,
          currentTime,
          targets
        );
        s.selectedKeyframeRefs = [];
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    duplicateSelectedKeyframes: () => {
      const { project, selectedKeyframeRefs } = get();
      if (!project || selectedKeyframeRefs.length === 0) return;
      const offset = 1 / project.fps;
      set((s) => {
        if (!s.project) return;
        const { project: next, newRefs } = duplicateKeyframeRefs(
          s.project,
          selectedKeyframeRefs,
          offset
        );
        s.project = next;
        s.selectedKeyframeRefs = newRefs;
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    nudgeSelectedKeyframes: (dt) => {
      const { project, selectedKeyframeRefs } = get();
      if (!project || selectedKeyframeRefs.length === 0) return;
      set((s) => {
        if (!s.project) return;
        for (const ref of selectedKeyframeRefs) {
          const track = s.project.tracks.find((t) => t.id === ref.trackId);
          const kf = track?.keyframes.find((k) => k.id === ref.keyframeId);
          if (!track || !kf) continue;
          const time = Math.max(0, Math.min(s.project.duration, kf.time + dt));
          s.project = updateKeyframeTime(s.project, ref.trackId, ref.keyframeId, time);
        }
      });
      get().commitHistory();
      get().refreshAppliedState();
    },

    insertKeyframeAtPlayhead: () => {
      const { project, selectedIds, currentTime, activeAnimProperty, appliedState } = get();
      if (!project || selectedIds.length === 0) return;

      const properties: AnimatableProperty[] = activeAnimProperty
        ? [activeAnimProperty]
        : ["x", "y", "rotation", "scaleX", "scaleY", "opacity"];

      set((s) => {
        if (!s.project) return;
        for (const elementId of selectedIds) {
          const el = s.project.elements.find((e) => e.id === elementId);
          if (!el || el.locked) continue;
          const state = appliedState[elementId];
          for (const property of properties) {
            const value = state ? getAppliedPropertyValue(state, property) : undefined;
            s.project = addKeyframe(s.project, elementId, property, currentTime, value);
          }
        }
      });
      get().commitHistory();
      get().refreshAppliedState();
    },
  }))
);
