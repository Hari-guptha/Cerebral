"use client";

import type { Project } from "@svg-animator/types";
import { getPointOnPathD } from "@svg-animator/engine";

interface MotionPathOverlayProps {
  project: Project;
  elementId: string;
  pathProgress: number;
}

export function MotionPathOverlay({ project, elementId, pathProgress }: MotionPathOverlayProps) {
  const el = project.elements.find((e) => e.id === elementId);
  if (!el?.motionPathId) return null;

  const pathEl = project.elements.find((e) => e.id === el.motionPathId);
  if (!pathEl || pathEl.type !== "path") return null;

  const pathD = typeof pathEl.attrs.d === "string" ? pathEl.attrs.d : "";
  if (!pathD.trim()) return null;

  const marker = getPointOnPathD(pathD, pathProgress);

  return (
    <g pointerEvents="none" className="motion-path-overlay">
      <path
        d={pathD}
        fill="none"
        stroke="#22c55e"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        opacity={0.75}
      />
      {marker && (
        <circle
          cx={marker.x}
          cy={marker.y}
          r={5}
          fill="#22c55e"
          stroke="#000"
          strokeWidth={1}
        />
      )}
    </g>
  );
}
