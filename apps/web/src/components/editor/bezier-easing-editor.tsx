"use client";

import type { EasingCurve } from "@svg-animator/types";
import { evaluateEasing } from "@svg-animator/engine";
import { useCallback, useRef } from "react";

const W = 160;
const H = 100;
const PAD = 12;

interface BezierEasingEditorProps {
  value: EasingCurve;
  onChange: (curve: EasingCurve) => void;
}

export function BezierEasingEditor({ value, onChange }: BezierEasingEditorProps) {
  const bezier = value.bezier ?? [0.42, 0, 0.58, 1];
  const dragRef = useRef<"p1" | "p2" | null>(null);

  const toSvg = (x: number, y: number) => ({
    sx: PAD + x * (W - PAD * 2),
    sy: H - PAD - y * (H - PAD * 2),
  });

  const fromSvgP1 = (sx: number, sy: number) => {
    const x1 = Math.max(0, Math.min(1, (sx - PAD) / (W - PAD * 2)));
    const y1 = Math.max(0, Math.min(1, (H - PAD - sy) / (H - PAD * 2)));
    return [x1, y1, bezier[2], bezier[3]] as [number, number, number, number];
  };

  const p0 = toSvg(0, 0);
  const p3 = toSvg(1, 1);
  const p1 = toSvg(bezier[0], bezier[1]);
  const p2 = toSvg(bezier[2], bezier[3]);

  const onPointerDown = (handle: "p1" | "p2") => (e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = handle;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      if (dragRef.current === "p1") {
        onChange({ type: "bezier", bezier: fromSvgP1(sx, sy) });
      } else {
        const x2 = Math.max(0, Math.min(1, (sx - PAD) / (W - PAD * 2)));
        const y2 = Math.max(0, Math.min(1, (H - PAD - sy) / (H - PAD * 2)));
        onChange({ type: "bezier", bezier: [bezier[0], bezier[1], x2, y2] });
      }
    },
    [bezier, onChange]
  );

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const curvePath = `M ${p0.sx} ${p0.sy} C ${p1.sx} ${p1.sy}, ${p2.sx} ${p2.sy}, ${p3.sx} ${p3.sy}`;

  const samples = Array.from({ length: 24 }, (_, i) => {
    const t = i / 23;
    const y = evaluateEasing(t, { type: "bezier", bezier });
    const pt = toSvg(t, y);
    return `${pt.sx},${pt.sy}`;
  }).join(" ");

  return (
    <div className="space-y-2">
      <svg
        width={W}
        height={H}
        className="rounded border border-neutral-800 bg-neutral-950"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <line x1={p0.sx} y1={p0.sy} x2={p1.sx} y2={p1.sy} stroke="#444" strokeWidth={1} />
        <line x1={p3.sx} y1={p3.sy} x2={p2.sx} y2={p2.sy} stroke="#444" strokeWidth={1} />
        <path d={curvePath} fill="none" stroke="#38bdf8" strokeWidth={2} />
        <polyline points={samples} fill="none" stroke="#666" strokeWidth={1} strokeDasharray="2 2" />
        <circle
          cx={p1.sx}
          cy={p1.sy}
          r={5}
          fill="#fff"
          className="cursor-grab"
          onPointerDown={onPointerDown("p1")}
        />
        <circle
          cx={p2.sx}
          cy={p2.sy}
          r={5}
          fill="#38bdf8"
          className="cursor-grab"
          onPointerDown={onPointerDown("p2")}
        />
      </svg>
      <p className="font-mono text-[9px] text-neutral-500">
        cubic-bezier({bezier.map((n) => n.toFixed(2)).join(", ")})
      </p>
    </div>
  );
}
