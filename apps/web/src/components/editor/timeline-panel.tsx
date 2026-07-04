"use client";

import { BezierEasingEditor } from "@/components/editor/bezier-easing-editor";
import type { AnimatableProperty, EasingCurve, EasingPreset } from "@svg-animator/types";
import { useEditorStore } from "@/store/editor-store";
import { formatTime, formatFrame, timeToFrame, cn, clamp } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Play, Pause, SkipBack, Magnet, ZoomIn, ZoomOut,
  ChevronDown, ChevronRight, Eye, EyeOff, Plus,
} from "lucide-react";
import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { isKeyframeSelected } from "@/store/editor-keyframes";

const EASING_PRESETS: EasingPreset[] = [
  "linear", "easeIn", "easeOut", "easeInOut", "spring", "bounce", "anticipate",
];

const ALL_PROPERTIES: AnimatableProperty[] = [
  "x", "y", "rotation", "scaleX", "scaleY", "opacity", "pathProgress",
];

const LABEL_WIDTH = 180;
const BASE_PX_PER_SEC = 160;
const RULER_HEIGHT = 56;

interface RulerTick {
  frame: number;
  time: number;
  left: number;
  kind: "major" | "mid" | "minor";
  showSecondLabel: boolean;
  showFrameLabel: boolean;
}

function buildRulerTicks(duration: number, fps: number, pxPerSec: number): RulerTick[] {
  const pxPerFrame = pxPerSec / fps;
  const totalFrames = Math.ceil(duration * fps);

  const minorStep =
    pxPerFrame >= 14 ? 1 :
    pxPerFrame >= 7 ? 2 :
    pxPerFrame >= 3.5 ? 5 :
    Math.max(1, Math.floor(fps / 4));

  const frameLabelStep =
    pxPerFrame >= 18 ? 1 :
    pxPerFrame >= 9 ? 5 :
    pxPerFrame >= 4.5 ? 10 :
    fps;

  const ticks: RulerTick[] = [];

  for (let f = 0; f <= totalFrames; f++) {
    const time = f / fps;
    if (time > duration + 0.0001) break;

    const isSecond = f % fps === 0;
    if (!isSecond && f % minorStep !== 0) continue;

    const kind: RulerTick["kind"] = isSecond ? "major" : f % Math.max(1, Math.floor(fps / 2)) === 0 ? "mid" : "minor";

    ticks.push({
      frame: f,
      time,
      left: time * pxPerSec,
      kind,
      showSecondLabel: isSecond,
      showFrameLabel: f % frameLabelStep === 0,
    });
  }

  return ticks;
}

function snapTime(time: number, fps: number, snap: boolean): number {
  if (!snap) return time;
  const frame = 1 / fps;
  return Math.round(time / frame) * frame;
}

export function TimelinePanel() {
  const {
    project, currentTime, isPlaying, setCurrentTime, setIsPlaying,
    setDuration, selectedIds, selectElement,
    removeKeyframe, updateKeyframeTime, updateKeyframeEasing,
    addMarker, staggerSelected, commitHistory,
    addKeyframeAtPlayhead, toggleTrackEnabled,
    timelineZoom, setTimelineZoom, snapEnabled, setSnapEnabled,
    setWorkArea,
    onionSkinEnabled,
    setOnionSkinEnabled,
    selectedKeyframeRefs,
    selectKeyframe,
    deselectKeyframes,
    deleteSelectedKeyframes,
    copySelectedKeyframes,
    cutSelectedKeyframes,
    pasteKeyframes,
    duplicateSelectedKeyframes,
    setActiveAnimProperty,
    activeAnimProperty,
    insertKeyframeAtPlayhead,
  } = useEditorStore(
    useShallow((s) => ({
      project: s.project,
      currentTime: s.currentTime,
      isPlaying: s.isPlaying,
      setCurrentTime: s.setCurrentTime,
      setIsPlaying: s.setIsPlaying,
      setDuration: s.setDuration,
      selectedIds: s.selectedIds,
      selectElement: s.selectElement,
      removeKeyframe: s.removeKeyframe,
      updateKeyframeTime: s.updateKeyframeTime,
      updateKeyframeEasing: s.updateKeyframeEasing,
      addMarker: s.addMarker,
      staggerSelected: s.staggerSelected,
      commitHistory: s.commitHistory,
      addKeyframeAtPlayhead: s.addKeyframeAtPlayhead,
      toggleTrackEnabled: s.toggleTrackEnabled,
      timelineZoom: s.timelineZoom,
      setTimelineZoom: s.setTimelineZoom,
      snapEnabled: s.snapEnabled,
      setSnapEnabled: s.setSnapEnabled,
      setWorkArea: s.setWorkArea,
      onionSkinEnabled: s.onionSkinEnabled,
      setOnionSkinEnabled: s.setOnionSkinEnabled,
      selectedKeyframeRefs: s.selectedKeyframeRefs,
      selectKeyframe: s.selectKeyframe,
      deselectKeyframes: s.deselectKeyframes,
      deleteSelectedKeyframes: s.deleteSelectedKeyframes,
      copySelectedKeyframes: s.copySelectedKeyframes,
      cutSelectedKeyframes: s.cutSelectedKeyframes,
      pasteKeyframes: s.pasteKeyframes,
      duplicateSelectedKeyframes: s.duplicateSelectedKeyframes,
      setActiveAnimProperty: s.setActiveAnimProperty,
      activeAnimProperty: s.activeAnimProperty,
      insertKeyframeAtPlayhead: s.insertKeyframeAtPlayhead,
    }))
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const [draggingKf, setDraggingKf] = useState<{
    trackId: string; keyframeId: string; startX: number; origTime: number;
  } | null>(null);
  const [draggingPlayhead, setDraggingPlayhead] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [easingPopup, setEasingPopup] = useState<{
    trackId: string; keyframeId: string; x: number; y: number;
  } | null>(null);
  const [easingTab, setEasingTab] = useState<"preset" | "bezier">("preset");
  const [draggingWorkArea, setDraggingWorkArea] = useState<"in" | "out" | null>(null);
  const [showAllElements, setShowAllElements] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    trackId: string; keyframeId: string; x: number; y: number;
  } | null>(null);

  const pxPerSec = BASE_PX_PER_SEC * timelineZoom;
  const pxPerFrame = project ? pxPerSec / project.fps : 0;
  const totalFrames = project ? timeToFrame(project.duration, project.fps) : 0;
  const currentFrame = project ? timeToFrame(currentTime, project.fps) : 0;
  const workIn = project?.settings.workAreaIn ?? 0;
  const workOut = project?.settings.workAreaOut ?? project?.duration ?? 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !project) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const state = useEditorStore.getState();
      const next = clamp(state.timelineZoom + (e.deltaY > 0 ? -0.12 : 0.12), 0.25, 10);
      state.setTimelineZoom(next);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [project]);

  const onKfMouseDown = useCallback(
    (e: React.MouseEvent, trackId: string, keyframeId: string, time: number) => {
      e.stopPropagation();
      const mode: import("@/store/editor-store").SelectionMode =
        e.shiftKey ? "add" : e.ctrlKey || e.metaKey ? "toggle" : "replace";
      if (!isKeyframeSelected(selectedKeyframeRefs, trackId, keyframeId) || mode !== "replace") {
        selectKeyframe(trackId, keyframeId, mode);
      }
      setDraggingKf({ trackId, keyframeId, startX: e.clientX, origTime: time });
    }, [selectedKeyframeRefs, selectKeyframe]
  );

  const handleKeyframeClick = useCallback(
    (e: React.MouseEvent, trackId: string, keyframeId: string, time: number) => {
      e.stopPropagation();
      const mode: import("@/store/editor-store").SelectionMode =
        e.shiftKey ? "add" : e.ctrlKey || e.metaKey ? "toggle" : "replace";
      selectKeyframe(trackId, keyframeId, mode);
      setCurrentTime(time);
    }, [selectKeyframe, setCurrentTime]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggingWorkArea && project && scrollRef.current) {
        const rect = scrollRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + scrollRef.current.scrollLeft - LABEL_WIDTH;
        const t = snapTime(Math.max(0, Math.min(project.duration, x / pxPerSec)), project.fps, snapEnabled);
        if (draggingWorkArea === "in") {
          setWorkArea(t, Math.max(t, workOut));
        } else {
          setWorkArea(Math.min(t, workIn), t);
        }
        return;
      }
      if (draggingPlayhead && project) {
        const rect = scrollRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0) - LABEL_WIDTH;
        const t = snapTime(Math.max(0, Math.min(project.duration, x / pxPerSec)), project.fps, snapEnabled);
        setCurrentTime(t);
        return;
      }
      if (!draggingKf || !project) return;
      const dx = e.clientX - draggingKf.startX;
      const raw = draggingKf.origTime + dx / pxPerSec;
      const newTime = snapTime(Math.max(0, Math.min(project.duration, raw)), project.fps, snapEnabled);
      updateKeyframeTime(draggingKf.trackId, draggingKf.keyframeId, newTime);
    },
    [draggingKf, draggingPlayhead, draggingWorkArea, project, pxPerSec, snapEnabled, setCurrentTime, updateKeyframeTime, setWorkArea, workIn, workOut]
  );

  const onMouseUp = useCallback(() => {
    if (draggingKf) { commitHistory(); setDraggingKf(null); }
    if (draggingPlayhead) setDraggingPlayhead(false);
    if (draggingWorkArea) setDraggingWorkArea(null);
  }, [draggingKf, draggingPlayhead, draggingWorkArea, commitHistory]);

  const elementGroups = useMemo(() => {
    if (!project) return [];
    const ids = showAllElements
      ? project.elements.filter((e) => e.visible).map((e) => e.id)
      : selectedIds.length > 0 ? selectedIds : project.elements.map((e) => e.id);

    return ids.map((id) => {
      const el = project.elements.find((e) => e.id === id);
      if (!el) return null;
      const tracks = project.tracks.filter((t) => t.elementId === id);
      const hasKeyframes = tracks.some((t) => t.keyframes.length > 0);
      if (!showAllElements && selectedIds.length > 0 && !hasKeyframes && !selectedIds.includes(id)) return null;
      return { element: el, tracks };
    }).filter(Boolean) as { element: typeof project.elements[0]; tracks: typeof project.tracks }[];
  }, [project, selectedIds, showAllElements]);

  const rulerTicks = useMemo(
    () => (project ? buildRulerTicks(project.duration, project.fps, pxPerSec) : []),
    [project, pxPerSec]
  );

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center bg-black text-xs text-neutral-600">
        Timeline appears after importing SVG
      </div>
    );
  }

  const timelineWidth = project.duration * pxPerSec;
  const playheadLeft = LABEL_WIDTH + currentTime * pxPerSec;
  const frameStep = 1 / project.fps;

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    deselectKeyframes();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = snapTime(Math.max(0, Math.min(project.duration, x / pxPerSec)), project.fps, snapEnabled);
    setCurrentTime(t);
  };

  const closeMenus = () => {
    setEasingPopup(null);
    setContextMenu(null);
  };

  return (
    <div
      className="flex h-full flex-col bg-black text-white select-none"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Transport bar */}
      <div className="border-b border-neutral-800">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentTime(workIn)} title="Go to work area start">
          <SkipBack className="h-3 w-3" />
        </Button>
        <Button variant="default" size="icon" className="h-7 w-7 rounded-full" onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
        </Button>

        <span className="font-mono text-[11px]">
          <span className="text-white">{formatTime(currentTime)}</span>
          <span className="mx-1.5 text-neutral-600">·</span>
          <span className="text-neutral-400">{formatFrame(currentTime, project.fps)}</span>
          <span className="mx-1 text-neutral-700">/</span>
          <span className="text-neutral-500">{formatTime(project.duration)}</span>
          <span className="mx-1.5 text-neutral-700">·</span>
          <span className="text-neutral-500">F{totalFrames}</span>
        </span>

        <div className="h-3 w-px bg-neutral-800" />

        <label className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-neutral-600">
          Dur
          <input type="number" className="w-12 rounded border border-neutral-800 bg-neutral-950 px-1 py-0.5 font-mono text-[10px]"
            value={project.duration} min={0.5} step={0.5}
            onChange={(e) => setDuration(parseFloat(e.target.value) || 4)} />
        </label>

        <label className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-neutral-600">
          FPS
          <select className="rounded border border-neutral-800 bg-neutral-950 px-1 py-0.5 text-[10px]"
            value={project.fps} onChange={(e) => useEditorStore.getState().setFps(parseInt(e.target.value))}>
            {[12, 24, 30, 60].map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>

        <div className="h-3 w-px bg-neutral-800" />

        <Button variant={snapEnabled ? "default" : "ghost"} size="icon" className="h-7 w-7"
          onClick={() => setSnapEnabled(!snapEnabled)} title="Snap to frames">
          <Magnet className="h-3 w-3" />
        </Button>

        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTimelineZoom(timelineZoom - 0.25)} disabled={timelineZoom <= 0.25}>
          <ZoomOut className="h-3 w-3" />
        </Button>
        <button
          type="button"
          className="min-w-[72px] rounded px-1 py-0.5 font-mono text-[9px] text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300"
          title="Ctrl+scroll on timeline to zoom · click to reset"
          onClick={() => setTimelineZoom(1)}
        >
          {Math.round(timelineZoom * 100)}%
        </button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTimelineZoom(timelineZoom + 0.25)} disabled={timelineZoom >= 10}>
          <ZoomIn className="h-3 w-3" />
        </Button>
        <span className="font-mono text-[9px] text-neutral-600">
          {Math.round(pxPerSec)}px/s · {Math.round(pxPerFrame)}px/fr
        </span>

        <Button variant={onionSkinEnabled ? "default" : "ghost"} size="sm" className="h-6 text-[9px] px-2"
          onClick={() => setOnionSkinEnabled(!onionSkinEnabled)} title="Onion skin">
          Onion
        </Button>
        <div className="ml-auto flex gap-1">
          <Button variant={showAllElements ? "default" : "outline"} size="sm" className="h-6 text-[9px] px-2"
            onClick={() => setShowAllElements(!showAllElements)}>
            {showAllElements ? "All layers" : "Selected"}
          </Button>
          <Button variant="outline" size="sm" className="h-6 text-[9px] px-2"
            onClick={() => staggerSelected("opacity", 0.1, 1)} disabled={selectedIds.length < 2}>
            Stagger
          </Button>
          <Button variant="outline" size="sm" className="h-6 text-[9px] px-2"
            onClick={() => addMarker(`M${project.markers.length + 1}`)}>
            + Marker
          </Button>
          <Button variant="outline" size="sm" className="h-6 text-[9px] px-2"
            onClick={() => insertKeyframeAtPlayhead()} disabled={selectedIds.length === 0}
            title="Insert keyframe at playhead (I)">
            ◆ Keyframe
          </Button>
        </div>
      </div>
        <div className="border-t border-neutral-900 px-3 py-1 text-[9px] text-neutral-600">
          I insert keyframe · Del delete · Ctrl+C/X/V copy/cut/paste · Ctrl+D duplicate · ←→ nudge time · Esc deselect
        </div>
      </div>

      {/* Timeline body */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-auto"
        onClick={() => { deselectKeyframes(); closeMenus(); }}
      >
        <div style={{ width: LABEL_WIDTH + timelineWidth + 60, minHeight: "100%" }}>
          {/* Ruler */}
          <div className="sticky top-0 z-20 flex border-b border-neutral-800 bg-neutral-950" style={{ height: RULER_HEIGHT }}>
            <div
              className="sticky left-0 z-30 flex shrink-0 flex-col justify-center border-r border-neutral-800 bg-neutral-950 px-2"
              style={{ width: LABEL_WIDTH }}
            >
              <span className="text-[9px] uppercase tracking-wider text-neutral-600">Time</span>
              <span className="font-mono text-[10px] text-neutral-400">
                {project.fps} fps · {totalFrames} fr
              </span>
              <span className="font-mono text-[9px] text-neutral-600">
                Frame {currentFrame}
              </span>
            </div>
            <div className="relative flex-1 cursor-crosshair" onClick={handleRulerClick}>
              {/* Work area highlight */}
              <div className="absolute top-0 h-full bg-white/[0.03]"
                style={{ left: workIn * pxPerSec, width: (workOut - workIn) * pxPerSec }} />
              <div
                className="absolute top-0 z-20 h-full w-1 cursor-ew-resize bg-emerald-500/80"
                style={{ left: workIn * pxPerSec - 2 }}
                onMouseDown={(e) => { e.stopPropagation(); setDraggingWorkArea("in"); }}
                title="Work area in"
              />
              <div
                className="absolute top-0 z-20 h-full w-1 cursor-ew-resize bg-rose-500/80"
                style={{ left: workOut * pxPerSec - 2 }}
                onMouseDown={(e) => { e.stopPropagation(); setDraggingWorkArea("out"); }}
                title="Work area out"
              />

              {rulerTicks.map((tick) => (
                <div
                  key={tick.frame}
                  className="absolute top-0 flex h-full flex-col justify-between pointer-events-none"
                  style={{ left: tick.left }}
                >
                  <div className="flex flex-1 flex-col justify-end">
                    <div
                      className={cn(
                        "w-px",
                        tick.kind === "major" ? "h-5 bg-neutral-400" :
                        tick.kind === "mid" ? "h-3 bg-neutral-600" :
                        "h-2 bg-neutral-800"
                      )}
                    />
                  </div>
                  <div className="relative h-8 shrink-0">
                    {tick.showSecondLabel && (
                      <span className="absolute bottom-4 left-1 font-mono text-[10px] font-medium text-neutral-300">
                        {tick.time.toFixed(0)}s
                      </span>
                    )}
                    {tick.showFrameLabel && (
                      <span
                        className={cn(
                          "absolute bottom-0 left-1 font-mono text-[9px]",
                          tick.showSecondLabel ? "text-neutral-500" : "text-neutral-600"
                        )}
                      >
                        {tick.showSecondLabel ? `F${tick.frame}` : tick.frame}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Markers */}
          {project.markers.map((m) => (
            <div key={m.id} className="pointer-events-none absolute z-10"
              style={{ left: LABEL_WIDTH + m.time * pxPerSec, top: RULER_HEIGHT, bottom: 0 }}>
              <div className="h-full w-px bg-amber-500/60" />
              <span className="absolute top-0 -translate-x-1/2 rounded bg-amber-500/20 px-1 text-[8px] text-amber-400">{m.label}</span>
            </div>
          ))}

          {/* Element tracks */}
          {elementGroups.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-xs text-neutral-600">
              Select layers or add keyframes via Inspector
            </div>
          ) : (
            elementGroups.map(({ element, tracks }) => {
              const isCollapsed = collapsed[element.id];
              const isSelected = selectedIds.includes(element.id);
              const visibleTracks = isCollapsed
                ? tracks.filter((t) => t.keyframes.length > 0)
                : tracks.length > 0 ? tracks : [];

              return (
                <div key={element.id} className="border-b border-neutral-900">
                  {/* Element header row */}
                  <div className="flex h-7 items-center">
                    <div
                      className={cn(
                        "sticky left-0 z-10 flex h-full shrink-0 items-center gap-1 border-r border-neutral-800 px-2 cursor-pointer",
                        isSelected ? "bg-neutral-900" : "bg-black"
                      )}
                      style={{ width: LABEL_WIDTH }}
                      onClick={(e) => {
                        const mode: import("@/store/editor-store").SelectionMode =
                          e.shiftKey ? "add" : e.ctrlKey || e.metaKey ? "toggle" : "replace";
                        selectElement(element.id, mode);
                      }}
                    >
                      <button type="button" onClick={(e) => { e.stopPropagation(); setCollapsed((c) => ({ ...c, [element.id]: !c[element.id] })); }}
                        className="text-neutral-600 hover:text-white">
                        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      <span className="truncate text-[10px] font-medium">{element.name}</span>
                    </div>
                    <div className="relative h-full flex-1" style={{ width: timelineWidth }}>
                      {tracks.some((t) => t.keyframes.length > 0) && (
                        <div className="absolute inset-y-2 inset-x-0 rounded bg-white/[0.02]" />
                      )}
                    </div>
                  </div>

                  {/* Property sub-tracks */}
                  {!isCollapsed && (
                    ALL_PROPERTIES.map((prop) => {
                      const track = tracks.find((t) => t.property === prop);
                      const kfs = track?.keyframes ?? [];
                      const trackId = track?.id;
                      const enabled = track?.enabled ?? true;

                      return (
                        <div
                          key={prop}
                          className={cn(
                            "relative flex h-7 items-center hover:bg-neutral-950/50",
                            activeAnimProperty === prop && isSelected && "bg-neutral-900/40"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveAnimProperty(prop);
                            selectElement(element.id, "replace");
                          }}
                        >
                          <div className="sticky left-0 z-10 flex h-full shrink-0 items-center gap-1 border-r border-neutral-800 bg-neutral-950/80 px-2 pl-6"
                            style={{ width: LABEL_WIDTH }}>
                            {trackId ? (
                              <button type="button" onClick={() => toggleTrackEnabled(trackId)}
                                className={cn("text-neutral-600 hover:text-white", !enabled && "text-neutral-800")}>
                                {enabled ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                              </button>
                            ) : (
                              <button type="button" onClick={() => addKeyframeAtPlayhead(element.id, prop)}
                                className="text-neutral-700 hover:text-white" title="Add keyframe">
                                <Plus className="h-2.5 w-2.5" />
                              </button>
                            )}
                            <span className="font-mono text-[9px] text-neutral-500">{prop}</span>
                          </div>
                          <div className="relative h-full flex-1" style={{ width: timelineWidth }}>
                            {kfs.length >= 2 && [...kfs].sort((a, b) => a.time - b.time).slice(0, -1).map((kf, i) => {
                              const sorted = [...kfs].sort((a, b) => a.time - b.time);
                              const next = sorted[i + 1];
                              return (
                                <div key={`bar-${kf.id}`}
                                  className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-neutral-700 to-neutral-600"
                                  style={{ left: kf.time * pxPerSec, width: (next.time - kf.time) * pxPerSec }} />
                              );
                            })}
                            {kfs.map((kf) => {
                              const selected = trackId
                                ? isKeyframeSelected(selectedKeyframeRefs, trackId, kf.id)
                                : false;
                              return (
                              <div key={kf.id}
                                className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                                style={{ left: kf.time * pxPerSec }}>
                                <div
                                  className={cn(
                                    "h-2.5 w-2.5 rotate-45 border cursor-grab active:cursor-grabbing transition-transform hover:scale-125",
                                    selected
                                      ? "border-sky-400 bg-sky-500 shadow-[0_0_0_1px_rgba(56,189,248,0.5)]"
                                      : enabled
                                        ? "border-white bg-black"
                                        : "border-neutral-700 bg-neutral-900 opacity-40"
                                  )}
                                  title={`${kf.time.toFixed(2)}s → ${kf.value}`}
                                  onMouseDown={(e) => trackId && onKfMouseDown(e, trackId, kf.id, kf.time)}
                                  onClick={(e) => trackId && handleKeyframeClick(e, trackId, kf.id, kf.time)}
                                  onDoubleClick={(e) => { e.stopPropagation(); trackId && removeKeyframe(trackId, kf.id); }}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!trackId) return;
                                    if (!selected) selectKeyframe(trackId, kf.id, "replace");
                                    setContextMenu({ trackId, keyframeId: kf.id, x: e.clientX, y: e.clientY });
                                    setEasingPopup(null);
                                  }}
                                />
                              </div>
                            );})}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Collapsed: show only tracks with keyframes */}
                  {isCollapsed && visibleTracks.map((track) => (
                    <div key={track.id} className="relative flex h-7 items-center">
                      <div className="sticky left-0 z-10 flex h-full shrink-0 items-center border-r border-neutral-800 bg-neutral-950 px-3 pl-8"
                        style={{ width: LABEL_WIDTH }}>
                        <span className="font-mono text-[9px] text-neutral-500">{track.property}</span>
                      </div>
                      <div className="relative h-full flex-1" style={{ width: timelineWidth }}>
                        {track.keyframes.map((kf) => {
                          const selected = isKeyframeSelected(selectedKeyframeRefs, track.id, kf.id);
                          return (
                          <div key={kf.id} className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                            style={{ left: kf.time * pxPerSec }}>
                            <div
                              className={cn(
                                "h-2 w-2 rotate-45 border cursor-grab",
                                selected ? "border-sky-400 bg-sky-500" : "border-white bg-black"
                              )}
                              onMouseDown={(e) => onKfMouseDown(e, track.id, kf.id, kf.time)}
                              onClick={(e) => handleKeyframeClick(e, track.id, kf.id, kf.time)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!selected) selectKeyframe(track.id, kf.id, "replace");
                                setContextMenu({ trackId: track.id, keyframeId: kf.id, x: e.clientX, y: e.clientY });
                              }}
                            />
                          </div>
                        );})}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}

          {/* Playhead */}
          <div className="pointer-events-none absolute top-0 z-30 w-px bg-white"
            style={{ left: playheadLeft, height: "100%" }}>
            <div
              className="pointer-events-auto absolute -left-2 top-0 h-4 w-4 cursor-ew-resize"
              style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
              onMouseDown={(e) => { e.stopPropagation(); setDraggingPlayhead(true); }}
            >
              <div className="h-full w-full bg-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded border border-neutral-700 bg-black py-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu(null)}
        >
          {[
            { label: "Copy", shortcut: "Ctrl+C", action: () => { copySelectedKeyframes(); setContextMenu(null); } },
            { label: "Cut", shortcut: "Ctrl+X", action: () => { cutSelectedKeyframes(); setContextMenu(null); } },
            { label: "Paste", shortcut: "Ctrl+V", action: () => { pasteKeyframes(); setContextMenu(null); } },
            { label: "Duplicate", shortcut: "Ctrl+D", action: () => { duplicateSelectedKeyframes(); setContextMenu(null); } },
            { label: "Delete", shortcut: "Del", action: () => { deleteSelectedKeyframes(); setContextMenu(null); } },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[10px] text-neutral-300 hover:bg-neutral-800 hover:text-white"
              onClick={item.action}
            >
              <span>{item.label}</span>
              <span className="text-neutral-600">{item.shortcut}</span>
            </button>
          ))}
          <div className="my-1 border-t border-neutral-800" />
          <button
            type="button"
            className="flex w-full px-3 py-1.5 text-left text-[10px] text-neutral-300 hover:bg-neutral-800 hover:text-white"
            onClick={() => {
              const track = project.tracks.find((t) => t.id === contextMenu.trackId);
              const kf = track?.keyframes.find((k) => k.id === contextMenu.keyframeId);
              if (kf) setCurrentTime(kf.time);
              setContextMenu(null);
            }}
          >
            Go to keyframe time
          </button>
          <button
            type="button"
            className="flex w-full px-3 py-1.5 text-left text-[10px] text-neutral-300 hover:bg-neutral-800 hover:text-white"
            onClick={() => {
              setEasingPopup({
                trackId: contextMenu.trackId,
                keyframeId: contextMenu.keyframeId,
                x: contextMenu.x,
                y: contextMenu.y,
              });
              setContextMenu(null);
            }}
          >
            Edit easing…
          </button>
        </div>
      )}

      {/* Easing popup */}
      {easingPopup && (
        <div className="fixed z-50 w-48 rounded border border-neutral-700 bg-black p-2 shadow-xl"
          style={{ left: easingPopup.x, top: easingPopup.y }}
          onMouseLeave={() => setEasingPopup(null)}>
          <div className="mb-2 flex gap-1">
            <button type="button" className={cn("flex-1 rounded px-2 py-1 text-[9px]", easingTab === "preset" ? "bg-white text-black" : "text-neutral-500")}
              onClick={() => setEasingTab("preset")}>Presets</button>
            <button type="button" className={cn("flex-1 rounded px-2 py-1 text-[9px]", easingTab === "bezier" ? "bg-white text-black" : "text-neutral-500")}
              onClick={() => setEasingTab("bezier")}>Bezier</button>
          </div>
          {easingTab === "preset" ? (
            <div className="grid grid-cols-2 gap-1">
              {EASING_PRESETS.map((p) => (
                <button key={p} type="button"
                  className="rounded px-2 py-1 text-[9px] text-neutral-400 hover:bg-neutral-800 hover:text-white"
                  onClick={() => {
                    updateKeyframeEasing(easingPopup.trackId, easingPopup.keyframeId, { type: "preset", preset: p });
                    setEasingPopup(null);
                  }}>
                  {p}
                </button>
              ))}
            </div>
          ) : (
            <BezierEasingEditor
              value={{ type: "bezier", bezier: [0.42, 0, 0.58, 1] }}
              onChange={(curve: EasingCurve) => {
                updateKeyframeEasing(easingPopup.trackId, easingPopup.keyframeId, curve);
              }}
            />
          )}
        </div>
      )}

      {/* Bottom scrubber */}
      <div className="border-t border-neutral-800 px-3 py-2">
        <input type="range" min={0} max={project.duration} step={frameStep} value={currentTime}
          onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
          className="timeline-scrubber w-full" />
      </div>
    </div>
  );
}
