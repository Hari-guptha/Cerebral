"use client";

import { getChildren } from "@svg-animator/engine";
import type { AppliedState, ElementNode } from "@svg-animator/types";
import { useEditorStore } from "@/store/editor-store";
import { SvgElementTree } from "@/components/editor/svg-element-tree";
import { Button } from "@/components/ui/button";
import { cn, formatFrame, formatTime } from "@/lib/utils";
import { Layers, Play, Pause, ZoomIn, ZoomOut, Minus, Plus } from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

function flattenVisibleLayers(elements: ElementNode[], parentId: string | null): ElementNode[] {
  const result: ElementNode[] = [];
  for (const el of getChildren(elements, parentId)) {
    if (!el.visible) continue;
    result.push(el);
    result.push(...flattenVisibleLayers(elements, el.id));
  }
  return result;
}

function subtreeStateRefUnchanged(
  elementId: string,
  elements: ElementNode[],
  prev: AppliedState,
  next: AppliedState
): boolean {
  if (prev[elementId] !== next[elementId]) return false;
  for (const child of getChildren(elements, elementId)) {
    if (!subtreeStateRefUnchanged(child.id, elements, prev, next)) return false;
  }
  return true;
}

const Layer3DCard = memo(function Layer3DCard({
  element,
  elements,
  index,
  total,
  spacing,
  isSelected,
  viewBox,
  canvasWidth,
  canvasHeight,
  appliedState,
  onSelect,
}: {
  element: ElementNode;
  elements: ElementNode[];
  index: number;
  total: number;
  spacing: number;
  isSelected: boolean;
  viewBox: string;
  canvasWidth: number;
  canvasHeight: number;
  appliedState: AppliedState;
  onSelect: (id: string) => void;
}) {
  // Index 0 = back of stack; higher index = closer to front (matches layer z-order).
  const depthFromBack = index;
  const backOffset = (total - 1) * spacing;
  let translateZ = depthFromBack * spacing - backOffset;
  if (isSelected) translateZ += spacing * 0.85;

  // Side-view tab stagger: upper layers sit down-right in front of lower ones.
  const translateY = depthFromBack * (spacing * 0.28);
  const translateX = depthFromBack * (spacing * 0.12);

  const paintZ = isSelected ? 10_000 : index + 1;

  return (
    <div
      className={cn(
        "absolute left-1/2 top-1/2 w-[min(40vw,280px)] cursor-pointer select-none",
        "transition-[transform,box-shadow] duration-300 ease-out"
      )}
      style={{
        transformStyle: "preserve-3d",
        zIndex: paintZ,
        transform: `translate(-50%, -50%) translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px)`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(element.id);
      }}
    >
      <div
        className={cn(
          "overflow-hidden rounded-lg border bg-neutral-950 shadow-2xl",
          isSelected
            ? "border-white ring-2 ring-white/30"
            : "border-neutral-700/80 hover:border-neutral-500"
        )}
        style={{
          boxShadow: isSelected
            ? "0 28px 70px rgba(255,255,255,0.15), 0 12px 32px rgba(0,0,0,0.65)"
            : `0 ${8 + depthFromBack * 4}px ${28 + depthFromBack * 8}px rgba(0,0,0,0.5)`,
        }}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/90 px-2.5 py-1.5">
          <span className="truncate text-[10px] font-medium text-neutral-200">{element.name}</span>
          <span className="shrink-0 font-mono text-[9px] text-neutral-600">
            {index === total - 1 ? "front" : index === 0 ? "back" : `#${index + 1}`}
          </span>
        </div>
        <div className="relative aspect-[4/3] bg-[#0c0c0c] p-2">
          <svg
            viewBox={viewBox}
            width="100%"
            height="100%"
            className="h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="transparent" />
            <SvgElementTree
              element={element}
              interactive={false}
              showSelection={false}
              appliedStateOverride={appliedState}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.element.id === next.element.id &&
    prev.index === next.index &&
    prev.total === next.total &&
    prev.spacing === next.spacing &&
    prev.isSelected === next.isSelected &&
    prev.viewBox === next.viewBox &&
    prev.canvasWidth === next.canvasWidth &&
    prev.canvasHeight === next.canvasHeight &&
    subtreeStateRefUnchanged(prev.element.id, prev.elements, prev.appliedState, next.appliedState)
  );
});

export function Layer3DView() {
  const {
    project,
    appliedState,
    selectedIds,
    selectElement,
    isPlaying,
    currentTime,
    setIsPlaying,
    layer3dSpacing,
    setLayer3dSpacing,
    layer3dZoom,
    setLayer3dZoom,
  } = useEditorStore(
    useShallow((s) => ({
      project: s.project,
      appliedState: s.appliedState,
      selectedIds: s.selectedIds,
      selectElement: s.selectElement,
      isPlaying: s.isPlaying,
      currentTime: s.currentTime,
      setIsPlaying: s.setIsPlaying,
      layer3dSpacing: s.layer3dSpacing,
      setLayer3dSpacing: s.setLayer3dSpacing,
      layer3dZoom: s.layer3dZoom,
      setLayer3dZoom: s.setLayer3dZoom,
    }))
  );

  const [rotation, setRotation] = useState({ x: -14, y: 52 });
  const dragRef = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);

  const layers = useMemo(
    () => (project ? flattenVisibleLayers(project.elements, null) : []),
    [project]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-layer-card],[data-3d-controls]")) return;
    dragRef.current = { x: e.clientX, y: e.clientY, rx: rotation.x, ry: rotation.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [rotation.x, rotation.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setRotation({
      x: Math.max(-60, Math.min(10, dragRef.current.rx - dy * 0.35)),
      y: dragRef.current.ry + dx * 0.35,
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        setLayer3dSpacing(layer3dSpacing + (e.deltaY > 0 ? -12 : 12));
      } else {
        setLayer3dZoom(layer3dZoom + (e.deltaY > 0 ? -0.08 : 0.08));
      }
    },
    [layer3dSpacing, layer3dZoom, setLayer3dSpacing, setLayer3dZoom]
  );

  if (!project) return null;

  const perspective = 1600 / layer3dZoom;

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[#050505]"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 60% at 50% 40%, #1a1a2e 0%, #050505 70%)",
      }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: `${perspective}px` }}
      >
        <div
          className="relative h-[min(75vh,560px)] w-full max-w-5xl transition-transform duration-75"
          style={{
            transformStyle: "preserve-3d",
            transform: `scale(${layer3dZoom}) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          }}
        >
          {layers.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-600">
              No visible layers
            </div>
          ) : (
            layers.map((el, i) => (
              <div key={el.id} data-layer-card>
                <Layer3DCard
                  element={el}
                  elements={project.elements}
                  index={i}
                  total={layers.length}
                  spacing={layer3dSpacing}
                  isSelected={selectedIds.includes(el.id)}
                  viewBox={project.canvas.viewBox}
                  canvasWidth={project.canvas.width}
                  canvasHeight={project.canvas.height}
                  appliedState={appliedState}
                  onSelect={(id) => selectElement(id, "replace")}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Controls — top left, below canvas mode toggle */}
      <div
        data-3d-controls
        className="absolute left-3 top-14 flex flex-col gap-2 rounded-lg border border-neutral-800 bg-black/90 p-2 backdrop-blur-sm"
      >
        <div className="flex items-center gap-1">
          <span className="w-12 text-[9px] uppercase tracking-wider text-neutral-600">Zoom</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setLayer3dZoom(layer3dZoom - 0.15)}
            disabled={layer3dZoom <= 0.25}
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <button
            type="button"
            className="min-w-[44px] rounded px-1 py-0.5 font-mono text-[10px] text-neutral-400 hover:bg-neutral-900"
            onClick={() => setLayer3dZoom(1)}
            title="Reset zoom"
          >
            {Math.round(layer3dZoom * 100)}%
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setLayer3dZoom(layer3dZoom + 0.15)}
            disabled={layer3dZoom >= 3}
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-12 text-[9px] uppercase tracking-wider text-neutral-600">Gap</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setLayer3dSpacing(layer3dSpacing - 20)}
            disabled={layer3dSpacing <= 80}
            title="Decrease layer spacing"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-[44px] text-center font-mono text-[10px] text-neutral-400">
            {layer3dSpacing}px
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setLayer3dSpacing(layer3dSpacing + 20)}
            disabled={layer3dSpacing >= 320}
            title="Increase layer spacing"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="absolute right-3 top-14 flex items-center gap-2 rounded-md border border-neutral-800 bg-black/80 px-2.5 py-1.5 text-[9px] text-neutral-500 backdrop-blur-sm">
        <span className="text-neutral-600">back</span>
        <span className="text-neutral-700">→</span>
        <span className="text-white">front</span>
      </div>

      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md border border-neutral-800 bg-black/80 px-2.5 py-1.5 text-[10px] text-neutral-500 backdrop-blur-sm">
        <Layers className="h-3.5 w-3.5" />
        <span>{layers.length} layers · top = front · drag to orbit</span>
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-neutral-800 bg-black/80 px-3 py-1.5 backdrop-blur-sm">
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black hover:bg-neutral-200"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
        </button>
        <span className="font-mono text-[10px] text-neutral-400">
          {formatTime(currentTime)} · {formatFrame(currentTime, project.fps)}
          {isPlaying && <span className="ml-2 text-emerald-400">● Live</span>}
        </span>
      </div>

      <div className="absolute bottom-3 right-3 rounded-md border border-neutral-800 bg-black/80 px-3 py-1.5 font-mono text-[10px] text-neutral-500 backdrop-blur-sm">
        gap {layer3dSpacing}px · zoom {Math.round(layer3dZoom * 100)}% · {selectedIds.length} selected
      </div>
    </div>
  );
}
