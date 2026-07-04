"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Axis = "x" | "y";

export function PanelResizeHandle({
  axis,
  onDelta,
  className,
}: {
  axis: Axis;
  onDelta: (delta: number) => void;
  className?: string;
}) {
  const dragging = useRef(false);
  const lastPos = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      lastPos.current = axis === "x" ? e.clientX : e.clientY;
      document.body.style.cursor = axis === "x" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [axis]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const pos = axis === "x" ? e.clientX : e.clientY;
      const delta = pos - lastPos.current;
      lastPos.current = pos;
      onDelta(delta);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [axis, onDelta]);

  return (
    <div
      role="separator"
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      onMouseDown={onMouseDown}
      className={cn(
        "group relative shrink-0 bg-neutral-800 transition-colors hover:bg-neutral-600",
        axis === "x" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize",
        className
      )}
    >
      <div
        className={cn(
          "absolute bg-white/0 transition-colors group-hover:bg-white/20 group-active:bg-white/40",
          axis === "x" ? "inset-y-0 -left-1 w-3" : "inset-x-0 -top-1 h-3"
        )}
      />
    </div>
  );
}
