"use client";

import { useCallback, useEffect, useRef } from "react";
import { getPathVertices, rebuildPathFromVertices } from "@svg-animator/engine";
import { useEditorStore } from "@/store/editor-store";

interface PathNodeEditorProps {
  elementId: string;
  pathD: string;
  screenToSvgPoint: (clientX: number, clientY: number) => { x: number; y: number };
  locked?: boolean;
}

export function PathNodeEditor({
  elementId,
  pathD,
  screenToSvgPoint,
  locked = false,
}: PathNodeEditorProps) {
  const dragRef = useRef<{ index: number } | null>(null);
  const vertices = getPathVertices(pathD);

  const commitVertices = useCallback(
    (verts: { x: number; y: number }[]) => {
      const d = rebuildPathFromVertices(verts);
      useEditorStore.getState().updateDrawnElement(elementId, { d });
    },
    [elementId]
  );

  useEffect(() => {
    if (locked) return;

    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const pt = screenToSvgPoint(e.clientX, e.clientY);
      const verts = getPathVertices(
        useEditorStore.getState().project?.elements.find((el) => el.id === elementId)?.attrs.d as string ?? pathD
      );
      const next = verts.map((v, i) =>
        i === dragRef.current!.index ? { x: pt.x, y: pt.y } : v
      );
      commitVertices(next);
    };

    const onUp = () => {
      if (dragRef.current) {
        useEditorStore.getState().commitHistory();
        dragRef.current = null;
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [locked, elementId, pathD, screenToSvgPoint, commitVertices]);

  if (vertices.length < 2 || locked) return null;

  return (
    <g className="path-node-editor" pointerEvents="all">
      {vertices.map((v, i) => (
        <circle
          key={i}
          cx={v.x}
          cy={v.y}
          r={5}
          fill="#fff"
          stroke="#0ea5e9"
          strokeWidth={1.5}
          style={{ cursor: "grab" }}
          onMouseDown={(e) => {
            e.stopPropagation();
            dragRef.current = { index: i };
            useEditorStore.getState().setDragging(true);
          }}
        />
      ))}
    </g>
  );
}
