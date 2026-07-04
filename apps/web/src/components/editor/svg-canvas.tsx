"use client";

import { buildTransformString, getChildren, sampleProject } from "@svg-animator/engine";
import { useEditorStore } from "@/store/editor-store";
import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { TransformHandles } from "@/components/editor/transform-handles";
import { MotionPathOverlay } from "@/components/editor/motion-path-overlay";
import { PathNodeEditor } from "@/components/editor/path-node-editor";
import { SvgElementTree } from "@/components/editor/svg-element-tree";
import {
  advanceDeepSelect,
  buildDeepSelectCycle,
  filterSelectableHits,
  getHitElementIdsAtPoint,
  peekDeepSelect,
  type DeepSelectState,
} from "@/lib/canvas-hit-test";
import { clamp } from "@/lib/utils";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SvgCanvas() {
  const {
    project,
    zoom,
    panX,
    panY,
    setPan,
    selectedIds,
    selectElement,
    setDragging,
    commitHistory,
    moveSelectedBy,
    activeTool,
    addDrawnElement,
    updateDrawnElement,
    appliedState,
    setCanvasViewport,
    setEditorCanvasHovered,
    currentTime,
    isPlaying,
    onionSkinEnabled,
    stateMachinePreview,
    fireStateMachineInput,
  } = useEditorStore(
    useShallow((s) => ({
      project: s.project,
      zoom: s.zoom,
      panX: s.panX,
      panY: s.panY,
      setPan: s.setPan,
      selectedIds: s.selectedIds,
      selectElement: s.selectElement,
      setDragging: s.setDragging,
      commitHistory: s.commitHistory,
      moveSelectedBy: s.moveSelectedBy,
      activeTool: s.activeTool,
      addDrawnElement: s.addDrawnElement,
      updateDrawnElement: s.updateDrawnElement,
      appliedState: s.appliedState,
      setZoom: s.setZoom,
      setCanvasViewport: s.setCanvasViewport,
      setEditorCanvasHovered: s.setEditorCanvasHovered,
      currentTime: s.currentTime,
      isPlaying: s.isPlaying,
      onionSkinEnabled: s.onionSkinEnabled,
      stateMachinePreview: s.stateMachinePreview,
      fireStateMachineInput: s.fireStateMachineInput,
    }))
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const panDrag = useRef<{ active: boolean; x: number; y: number; panX: number; panY: number } | null>(null);
  const elementDrag = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
  } | null>(null);
  const penSession = useRef<{
    tool: "pen" | "motionPath";
    elementId: string;
    points: { x: number; y: number }[];
  } | null>(null);
  const [penPreview, setPenPreview] = useState<{ x: number; y: number } | null>(null);
  const drawDrag = useRef<{
    tool: typeof activeTool;
    startSvg: { x: number; y: number };
    elementId: string | null;
  } | null>(null);
  const marqueeDrag = useRef<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    additive: boolean;
  } | null>(null);
  const [marquee, setMarquee] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [deepSelectHoverId, setDeepSelectHoverId] = useState<string | null>(null);
  const deepSelectRef = useRef<DeepSelectState | null>(null);
  const ctrlHeldRef = useRef(false);

  const screenToSvgPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const svgPt = pt.matrixTransform(ctm.inverse());
      return { x: svgPt.x, y: svgPt.y };
    },
    []
  );

  const screenToSvgDelta = useCallback(
    (dx: number, dy: number) => ({ dx: dx / zoom, dy: dy / zoom }),
    [zoom]
  );

  const rebuildPenPath = useCallback((points: { x: number; y: number }[], closed = false) => {
    let d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    if (closed && points.length > 2) d += " Z";
    return d;
  }, []);

  const finishPenSession = useCallback(
    (closed = false) => {
      const session = penSession.current;
      if (!session) return;

      if (session.points.length >= 2) {
        updateDrawnElement(session.elementId, { d: rebuildPenPath(session.points, closed) });
      }

      if (session.tool === "motionPath") {
        const targetId = useEditorStore.getState().motionPathTargetId;
        if (targetId) {
          useEditorStore.getState().setMotionPath(targetId, session.elementId, false);
        }
        useEditorStore.getState().setActiveTool("select");
      }

      commitHistory();
      penSession.current = null;
      setPenPreview(null);
    },
    [commitHistory, rebuildPenPath, updateDrawnElement]
  );

  const getDeepSelectCycle = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg || !project) return [];

      const hits = filterSelectableHits(
        getHitElementIdsAtPoint(svg, clientX, clientY),
        project.elements
      );
      const parentOf = (id: string) => project.elements.find((el) => el.id === id)?.parentId ?? null;
      return buildDeepSelectCycle(hits, parentOf);
    },
    [project]
  );

  const performDeepSelect = useCallback(
    (clientX: number, clientY: number) => {
      const cycle = getDeepSelectCycle(clientX, clientY);
      const { id, nextState } = advanceDeepSelect(cycle, clientX, clientY, deepSelectRef.current);
      deepSelectRef.current = nextState;
      if (id) {
        selectElement(id, "replace");
        setDeepSelectHoverId(id);
      }
      return id;
    },
    [getDeepSelectCycle, selectElement]
  );

  const updateDeepSelectHover = useCallback(
    (clientX: number, clientY: number) => {
      const cycle = getDeepSelectCycle(clientX, clientY);
      const id = peekDeepSelect(cycle, clientX, clientY, deepSelectRef.current);
      setDeepSelectHoverId(id);
    },
    [getDeepSelectCycle]
  );
  const getElementsInMarquee = useCallback(
    (rect: { left: number; top: number; right: number; bottom: number }) => {
      const svg = svgRef.current;
      if (!svg || !project) return [];

      const locked = new Set(project.elements.filter((el) => el.locked || el.visible === false).map((el) => el.id));
      const hits: string[] = [];

      for (const node of svg.querySelectorAll<SVGElement>("[data-element-id]")) {
        const id = node.getAttribute("data-element-id");
        if (!id || locked.has(id)) continue;

        const b = node.getBoundingClientRect();
        const intersects =
          b.right >= rect.left && b.left <= rect.right && b.bottom >= rect.top && b.top <= rect.bottom;
        if (intersects) hits.push(id);
      }

      return hits;
    },
    [project]
  );

  const handleElementMouseDown = useCallback(
    (e: React.MouseEvent, elementId: string) => {
      if (activeTool !== "select" || e.button !== 0 || e.altKey) return;
      e.stopPropagation();

      const el = project?.elements.find((x) => x.id === elementId);
      if (!el || el.locked) return;

      if (e.ctrlKey || e.metaKey) {
        performDeepSelect(e.clientX, e.clientY);
        return;
      }

      if (!e.shiftKey && !selectedIds.includes(elementId)) {
        selectElement(elementId, "replace");
        deepSelectRef.current = null;
      }

      elementDrag.current = {
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
      };
      setDragging(true);
    },
    [project, selectedIds, selectElement, setDragging, activeTool, performDeepSelect]
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool === "select" || e.button !== 0 || e.altKey) return;
      e.stopPropagation();
      const pt = screenToSvgPoint(e.clientX, e.clientY);

      if (activeTool === "text") {
        addDrawnElement("text", { x: pt.x, y: pt.y }, "Text");
        useEditorStore.getState().setActiveTool("select");
        return;
      }

      if (activeTool === "pen" || activeTool === "motionPath") {
        const isMotion = activeTool === "motionPath";

        if (!penSession.current) {
          addDrawnElement(isMotion ? "motionPath" : "pen", isMotion
            ? {
                d: `M ${pt.x} ${pt.y}`,
                fill: "none",
                stroke: "#22c55e",
                "stroke-width": 1.5,
                "stroke-dasharray": "6 4",
                opacity: 0.6,
              }
            : { d: `M ${pt.x} ${pt.y}`, fill: "none", stroke: "#ffffff", "stroke-width": 2 },
            isMotion ? "Motion Guide" : undefined);
          const id = useEditorStore.getState().selectedIds[0];
          if (!id) return;
          penSession.current = { tool: activeTool, elementId: id, points: [pt] };
          setPenPreview(pt);
          return;
        }

        const session = penSession.current;
        const first = session.points[0];
        if (session.points.length >= 2 && Math.hypot(pt.x - first.x, pt.y - first.y) < 10) {
          finishPenSession(true);
          return;
        }

        const last = session.points[session.points.length - 1];
        if (Math.hypot(pt.x - last.x, pt.y - last.y) < 2) return;

        session.points.push(pt);
        updateDrawnElement(session.elementId, { d: rebuildPenPath(session.points) });
        setPenPreview(pt);
        return;
      }

      drawDrag.current = { tool: activeTool, startSvg: pt, elementId: null };
      setDragging(true);
    },
    [activeTool, screenToSvgPoint, addDrawnElement, setDragging, finishPenSession, rebuildPenPath, updateDrawnElement]
  );

  const startMarquee = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== "select" || e.button !== 0 || !(e.ctrlKey || e.metaKey) || e.altKey) return false;
      if ((e.target as Element).closest("[data-element-id]")) return false;

      e.preventDefault();
      e.stopPropagation();

      marqueeDrag.current = {
        x1: e.clientX,
        y1: e.clientY,
        x2: e.clientX,
        y2: e.clientY,
        additive: e.shiftKey,
      };
      setMarquee({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY });
      setDragging(true);
      return true;
    },
    [activeTool, setDragging]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!penSession.current) return;
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        finishPenSession(e.key === "Enter");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finishPenSession]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (marqueeDrag.current) {
        marqueeDrag.current.x2 = e.clientX;
        marqueeDrag.current.y2 = e.clientY;
        const { x1, y1, x2, y2 } = marqueeDrag.current;
        setMarquee({ x1, y1, x2, y2 });
        return;
      }

      if (panDrag.current?.active) {
        const dx = e.clientX - panDrag.current.x;
        const dy = e.clientY - panDrag.current.y;
        setPan(panDrag.current.panX + dx, panDrag.current.panY + dy);
        return;
      }

      if (penSession.current) {
        setPenPreview(screenToSvgPoint(e.clientX, e.clientY));
        return;
      }

      if (drawDrag.current) {
        const pt = screenToSvgPoint(e.clientX, e.clientY);
        const { tool, startSvg, elementId } = drawDrag.current;

        if (!elementId) {
          const x = Math.min(startSvg.x, pt.x);
          const y = Math.min(startSvg.y, pt.y);
          const w = Math.abs(pt.x - startSvg.x);
          const h = Math.abs(pt.y - startSvg.y);

          if (tool === "rectangle" && w > 2 && h > 2) {
            if (!drawDrag.current.elementId) {
              addDrawnElement("rectangle", { x, y, width: w, height: h });
              drawDrag.current.elementId = useEditorStore.getState().selectedIds[0] ?? null;
            } else {
              updateDrawnElement(drawDrag.current.elementId, { x, y, width: w, height: h });
            }
          } else if (tool === "ellipse" && w > 2 && h > 2) {
            if (!drawDrag.current.elementId) {
              addDrawnElement("ellipse", { cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2 });
              drawDrag.current.elementId = useEditorStore.getState().selectedIds[0] ?? null;
            } else {
              updateDrawnElement(drawDrag.current.elementId, { cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2 });
            }
          } else if (tool === "line") {
            if (!drawDrag.current.elementId) {
              addDrawnElement("line", { x1: startSvg.x, y1: startSvg.y, x2: pt.x, y2: pt.y });
              drawDrag.current.elementId = useEditorStore.getState().selectedIds[0] ?? null;
            } else {
              updateDrawnElement(drawDrag.current.elementId, { x1: startSvg.x, y1: startSvg.y, x2: pt.x, y2: pt.y });
            }
          }
        }
        return;
      }

      if (elementDrag.current) {
        const totalDx = e.clientX - elementDrag.current.startX;
        const totalDy = e.clientY - elementDrag.current.startY;
        const frameDx = e.clientX - elementDrag.current.lastX;
        const frameDy = e.clientY - elementDrag.current.lastY;
        elementDrag.current.lastX = e.clientX;
        elementDrag.current.lastY = e.clientY;

        const { dx, dy } = screenToSvgDelta(frameDx, frameDy);
        if (Math.abs(totalDx) > 2 || Math.abs(totalDy) > 2) {
          moveSelectedBy(dx, dy, true);
        }
      }
    };

    const onUp = () => {
      if (marqueeDrag.current) {
        const { x1, y1, x2, y2, additive } = marqueeDrag.current;
        const dragged = Math.abs(x2 - x1) > 4 || Math.abs(y2 - y1) > 4;

        if (dragged) {
          const rect = {
            left: Math.min(x1, x2),
            top: Math.min(y1, y2),
            right: Math.max(x1, x2),
            bottom: Math.max(y1, y2),
          };
          const hits = getElementsInMarquee(rect);
          const store = useEditorStore.getState();

          if (additive) {
            const merged = new Set([...store.selectedIds, ...hits]);
            store.setSelectedIds([...merged]);
            if (hits.length > 0) {
              useEditorStore.setState({ selectionAnchorId: store.selectionAnchorId ?? hits[0] });
            }
          } else {
            store.setSelectedIds(hits);
            useEditorStore.setState({
              selectionAnchorId: hits[0] ?? null,
            });
          }
        }

        marqueeDrag.current = null;
        setMarquee(null);
      }

      if (drawDrag.current) {
        commitHistory();
        useEditorStore.getState().setActiveTool("select");
        drawDrag.current = null;
      }
      if (elementDrag.current) {
        const moved =
          Math.abs(elementDrag.current.startX - elementDrag.current.lastX) > 2 ||
          Math.abs(elementDrag.current.startY - elementDrag.current.lastY) > 2;
        if (moved) commitHistory();
      }
      elementDrag.current = null;
      panDrag.current = null;
      setDragging(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [
    setPan,
    setDragging,
    moveSelectedBy,
    commitHistory,
    screenToSvgDelta,
    screenToSvgPoint,
    addDrawnElement,
    updateDrawnElement,
    getElementsInMarquee,
  ]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (startMarquee(e)) return;

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      panDrag.current = { active: true, x: e.clientX, y: e.clientY, panX, panY };
      return;
    }

    if (
      e.button === 0 &&
      e.target === containerRef.current &&
      !e.ctrlKey &&
      !e.metaKey
    ) {
      deepSelectRef.current = null;
      useEditorStore.setState({
        selectedIds: [],
        lastSelectedId: null,
        selectionAnchorId: null,
      });
    }
  };

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      if (e.ctrlKey || e.metaKey) {
        const newZoom = clamp(zoom + (e.deltaY > 0 ? -0.1 : 0.1), 0.25, 4);
        const wx = (mx - cx - panX) / zoom;
        const wy = (my - cy - panY) / zoom;
        setCanvasViewport(newZoom, mx - cx - wx * newZoom, my - cy - wy * newZoom);
      } else {
        setPan(panX - e.deltaX, panY - e.deltaY);
      }
    },
    [panX, panY, zoom, setPan, setCanvasViewport]
  );

  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      ctrlHeldRef.current = ctrl;

      if (activeTool !== "select" || !ctrl) {
        if (deepSelectHoverId) setDeepSelectHoverId(null);
        return;
      }

      updateDeepSelectHover(e.clientX, e.clientY);
    },
    [activeTool, deepSelectHoverId, updateDeepSelectHover]
  );

  const handleSvgMouseLeave = useCallback(() => {
    setDeepSelectHoverId(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrlHeldRef.current && !ctrl) {
        setDeepSelectHoverId(null);
      }
      ctrlHeldRef.current = ctrl;
    };
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", () => {
      ctrlHeldRef.current = false;
      setDeepSelectHoverId(null);
    });
    return () => {
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  const frameStep = project ? 1 / project.fps : 1 / 30;
  const onionStates = useMemo(() => {
    if (!onionSkinEnabled || isPlaying || !project) return null;
    const prev = Math.max(0, currentTime - frameStep);
    const next = Math.min(project.duration, currentTime + frameStep);
    return {
      prev: prev < currentTime ? sampleProject(project, prev) : null,
      next: next > currentTime ? sampleProject(project, next) : null,
    };
  }, [onionSkinEnabled, isPlaying, project, currentTime, frameStep]);

  const handleSmPointer = useCallback(
    (inputName: string) => () => {
      if (stateMachinePreview) fireStateMachineInput(inputName);
    },
    [stateMachinePreview, fireStateMachineInput]
  );

  if (!project) return null;

  const roots = getChildren(project.elements, null);

  const marqueeStyle =
    marquee && containerRef.current
      ? (() => {
          const cr = containerRef.current.getBoundingClientRect();
          return {
            left: Math.min(marquee.x1, marquee.x2) - cr.left,
            top: Math.min(marquee.y1, marquee.y2) - cr.top,
            width: Math.abs(marquee.x2 - marquee.x1),
            height: Math.abs(marquee.y2 - marquee.y1),
          };
        })()
      : null;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-black touch-none"
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseEnter={() => setEditorCanvasHovered(true)}
      onMouseLeave={() => setEditorCanvasHovered(false)}
      style={{
        backgroundImage:
          "linear-gradient(to right, #111 1px, transparent 1px), linear-gradient(to bottom, #111 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          transform: `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <svg
          ref={svgRef}
          width={project.canvas.width}
          height={project.canvas.height}
          viewBox={project.canvas.viewBox}
          xmlns="http://www.w3.org/2000/svg"
          className="border border-neutral-800 bg-neutral-950 shadow-2xl"
          onMouseEnter={stateMachinePreview ? handleSmPointer("hover") : undefined}
          onMouseLeave={(e) => {
            if (stateMachinePreview) handleSmPointer("unhover")();
            handleSvgMouseLeave();
          }}
          onClick={stateMachinePreview ? handleSmPointer("click") : undefined}
          onMouseDown={(e) => {
            if (startMarquee(e)) return;
            startDrawing(e);
          }}
          onDoubleClick={() => {
            if (penSession.current) finishPenSession(false);
          }}
          onMouseMove={handleSvgMouseMove}
        >
          {onionStates?.prev && (
            <g pointerEvents="none" opacity={0.22} style={{ filter: "sepia(1) hue-rotate(180deg)" }}>
              {roots.map((el) => (
                <SvgElementTree
                  key={`onion-prev-${el.id}`}
                  element={el}
                  interactive={false}
                  showSelection={false}
                  projectOverride={project}
                  appliedStateOverride={onionStates.prev!}
                />
              ))}
            </g>
          )}
          {onionStates?.next && (
            <g pointerEvents="none" opacity={0.18} style={{ filter: "sepia(1) hue-rotate(90deg)" }}>
              {roots.map((el) => (
                <SvgElementTree
                  key={`onion-next-${el.id}`}
                  element={el}
                  interactive={false}
                  showSelection={false}
                  projectOverride={project}
                  appliedStateOverride={onionStates.next!}
                />
              ))}
            </g>
          )}
          {roots.map((el) => (
            <SvgElementTree
              key={el.id}
              element={el}
              onElementMouseDown={handleElementMouseDown}
              deepSelectHoverId={deepSelectHoverId}
              projectOverride={project}
              appliedStateOverride={appliedState}
              selectedIdsOverride={selectedIds}
              selectElementOverride={selectElement}
            />
          ))}
          {penPreview && penSession.current && penSession.current.points.length > 0 && (
            <line
              x1={penSession.current.points[penSession.current.points.length - 1].x}
              y1={penSession.current.points[penSession.current.points.length - 1].y}
              x2={penPreview.x}
              y2={penPreview.y}
              stroke="#38bdf8"
              strokeWidth={1}
              strokeDasharray="4 3"
              pointerEvents="none"
            />
          )}
          {selectedIds.length === 1 &&
            project.elements.find((e) => e.id === selectedIds[0])?.motionPathId && (
            <MotionPathOverlay
              project={project}
              elementId={selectedIds[0]}
              pathProgress={appliedState[selectedIds[0]]?.pathProgress ?? 0}
            />
          )}
          {selectedIds.length === 1 &&
            activeTool === "select" &&
            project.elements.find((e) => e.id === selectedIds[0])?.type === "path" && (
            <PathNodeEditor
              elementId={selectedIds[0]}
              pathD={String(
                project.elements.find((e) => e.id === selectedIds[0])?.attrs.d ??
                appliedState[selectedIds[0]]?.pathD ??
                ""
              )}
              screenToSvgPoint={screenToSvgPoint}
              locked={project.elements.find((e) => e.id === selectedIds[0])?.locked}
            />
          )}
          <TransformHandles svgRef={svgRef} />
        </svg>
      </div>
      {marqueeStyle && (
        <div
          className="pointer-events-none absolute border border-sky-400/80 bg-sky-400/10"
          style={marqueeStyle}
        />
      )}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded border border-neutral-800 bg-black/90 px-2 py-1 font-mono text-[10px] text-neutral-400">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-neutral-400 hover:text-white"
          onClick={() => setCanvasViewport(clamp(zoom - 0.1, 0.25, 4), panX, panY)}
          title="Zoom out"
        >
          <ZoomOut className="h-3 w-3" />
        </Button>
        <button
          type="button"
          className="min-w-[40px] rounded px-1 hover:bg-neutral-900"
          onClick={() => setCanvasViewport(1, 0, 0)}
          title="Reset zoom (Ctrl+0)"
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-neutral-400 hover:text-white"
          onClick={() => setCanvasViewport(clamp(zoom + 0.1, 0.25, 4), panX, panY)}
          title="Zoom in"
        >
          <ZoomIn className="h-3 w-3" />
        </Button>
        <span className="ml-1 border-l border-neutral-800 pl-2">
          {activeTool} · {selectedIds.length} selected
          {activeTool === "select" ? " · Ctrl+scroll zoom" : ""}
        </span>
      </div>
    </div>
  );
}
