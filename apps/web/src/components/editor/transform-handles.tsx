"use client";

import { useRef, useEffect, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore } from "@/store/editor-store";

interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const HANDLE_SIZE = 8;
const ROTATE_OFFSET = 24;

export function TransformHandles({ svgRef }: { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const {
    project, selectedIds, appliedState, zoom,
    setProperty, commitHistory, isDragging,
  } = useEditorStore(
    useShallow((s) => ({
      project: s.project,
      selectedIds: s.selectedIds,
      appliedState: s.appliedState,
      zoom: s.zoom,
      setProperty: s.setProperty,
      commitHistory: s.commitHistory,
      isDragging: s.isDragging,
    }))
  );

  const dragRef = useRef<{
    type: "scale" | "rotate";
    handle?: string;
    startX: number;
    startY: number;
    startAngle: number;
    startBBox: BBox;
    startValues: Record<string, { rotation: number; scaleX: number; scaleY: number }>;
  } | null>(null);

  const getSelectionBBox = useCallback((): BBox | null => {
    const svg = svgRef.current;
    if (!svg || selectedIds.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let found = false;

    for (const id of selectedIds) {
      const node = svg.querySelector(`[data-element-id="${id}"]`);
      if (!node) continue;
      try {
        const bb = (node as SVGGraphicsElement).getBBox();
        minX = Math.min(minX, bb.x);
        minY = Math.min(minY, bb.y);
        maxX = Math.max(maxX, bb.x + bb.width);
        maxY = Math.max(maxY, bb.y + bb.height);
        found = true;
      } catch { /* skip */ }
    }

    if (!found) return null;
    const pad = 4;
    return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
  }, [svgRef, selectedIds]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag || !project) return;

      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;

      if (drag.type === "rotate") {
        const cx = drag.startBBox.x + drag.startBBox.width / 2;
        const cy = drag.startBBox.y + drag.startBBox.height / 2;
        const svg = svgRef.current;
        if (!svg) return;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const ctm = svg.getScreenCTM();
        if (!ctm) return;
        const svgPt = pt.matrixTransform(ctm.inverse());
        const startPt = svg.createSVGPoint();
        startPt.x = drag.startX;
        startPt.y = drag.startY;
        const startSvgPt = startPt.matrixTransform(ctm.inverse());
        const startAngle = Math.atan2(startSvgPt.y - cy, startSvgPt.x - cx);
        const currentAngle = Math.atan2(svgPt.y - cy, svgPt.x - cx);
        const deltaDeg = ((currentAngle - startAngle) * 180) / Math.PI;
        for (const id of selectedIds) {
          const start = drag.startValues[id];
          if (!start) continue;
          setProperty(id, "rotation", start.rotation + deltaDeg, true);
        }
      } else if (drag.type === "scale" && drag.handle) {
        const factor = drag.handle.includes("e")
          ? 1 + dx / Math.max(drag.startBBox.width, 1)
          : drag.handle.includes("w")
            ? 1 - dx / Math.max(drag.startBBox.width, 1)
            : 1;
        const factorY = drag.handle.includes("s")
          ? 1 + dy / Math.max(drag.startBBox.height, 1)
          : drag.handle.includes("n")
            ? 1 - dy / Math.max(drag.startBBox.height, 1)
            : factor;

        for (const id of selectedIds) {
          const start = drag.startValues[id];
          if (!start) continue;
          setProperty(id, "scaleX", Math.max(0.05, start.scaleX * factor), true);
          setProperty(id, "scaleY", Math.max(0.05, start.scaleY * (drag.handle.length === 1 ? factor : factorY)), true);
        }
      }
    };

    const onUp = () => {
      if (dragRef.current) {
        commitHistory();
        dragRef.current = null;
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [project, selectedIds, zoom, setProperty, commitHistory]);

  if (!project || selectedIds.length === 0 || isDragging) return null;

  const bbox = getSelectionBBox();
  if (!bbox || bbox.width < 1) return null;

  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;

  const handles = [
    { id: "nw", x: bbox.x, y: bbox.y },
    { id: "n", x: cx, y: bbox.y },
    { id: "ne", x: bbox.x + bbox.width, y: bbox.y },
    { id: "e", x: bbox.x + bbox.width, y: cy },
    { id: "se", x: bbox.x + bbox.width, y: bbox.y + bbox.height },
    { id: "s", x: cx, y: bbox.y + bbox.height },
    { id: "sw", x: bbox.x, y: bbox.y + bbox.height },
    { id: "w", x: bbox.x, y: cy },
  ];

  const startDrag = (type: "scale" | "rotate", handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const startValues: typeof dragRef.current extends null ? never : NonNullable<typeof dragRef.current>["startValues"] = {};
    for (const id of selectedIds) {
      const el = project.elements.find((x) => x.id === id);
      const state = appliedState[id];
      if (!el) continue;
      startValues[id] = {
        rotation: state?.transform.rotation ?? el.transform.rotation,
        scaleX: state?.transform.scaleX ?? el.transform.scaleX,
        scaleY: state?.transform.scaleY ?? el.transform.scaleY,
      };
    }
    dragRef.current = {
      type, handle, startX: e.clientX, startY: e.clientY,
      startAngle: 0, startBBox: bbox, startValues,
    };
  };

  return (
    <g pointerEvents="none">
      <rect
        x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height}
        fill="none" stroke="white" strokeWidth={1 / zoom} strokeDasharray={`${4 / zoom} ${2 / zoom}`}
        pointerEvents="none"
      />
      {handles.map((h) => (
        <rect
          key={h.id}
          data-handle={h.id}
          x={h.x - HANDLE_SIZE / 2 / zoom}
          y={h.y - HANDLE_SIZE / 2 / zoom}
          width={HANDLE_SIZE / zoom}
          height={HANDLE_SIZE / zoom}
          fill="white"
          stroke="black"
          strokeWidth={1 / zoom}
          pointerEvents="all"
          style={{ cursor: `${h.id}-resize` }}
          onMouseDown={(e) => startDrag("scale", h.id, e)}
        />
      ))}
      <line
        x1={cx} y1={bbox.y} x2={cx} y2={bbox.y - ROTATE_OFFSET / zoom}
        stroke="white" strokeWidth={1 / zoom} pointerEvents="none"
      />
      <circle
        cx={cx} cy={bbox.y - ROTATE_OFFSET / zoom} r={5 / zoom}
        fill="white" stroke="black" strokeWidth={1 / zoom}
        pointerEvents="all" style={{ cursor: "grab" }}
        onMouseDown={(e) => startDrag("rotate", "rotate", e)}
      />
    </g>
  );
}
