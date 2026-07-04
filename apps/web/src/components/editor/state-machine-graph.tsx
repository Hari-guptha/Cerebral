"use client";

import type { StateMachine } from "@svg-animator/types";
import { cn } from "@/lib/utils";

interface StateMachineGraphProps {
  machine: StateMachine;
  activeStateId?: string;
  onSelectState: (stateId: string) => void;
  onSetInitial: (stateId: string) => void;
}

export function StateMachineGraph({
  machine,
  activeStateId,
  onSelectState,
  onSetInitial,
}: StateMachineGraphProps) {
  const cols = Math.min(3, Math.max(1, machine.states.length));
  const cellW = 120;
  const cellH = 72;

  const positions = new Map<string, { x: number; y: number }>();
  machine.states.forEach((s, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.set(s.id, { x: 16 + col * (cellW + 24), y: 16 + row * (cellH + 32) });
  });

  const width = cols * (cellW + 24) + 16;
  const rows = Math.ceil(machine.states.length / cols);
  const height = rows * (cellH + 32) + 16;

  return (
    <div className="overflow-auto rounded border border-neutral-800 bg-neutral-950/80 p-2">
      <svg width={width} height={height} className="min-w-full">
        <defs>
          <marker id="sm-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#666" />
          </marker>
        </defs>

        {machine.transitions.map((t) => {
          const from = positions.get(t.fromStateId);
          const to = positions.get(t.toStateId);
          const input = machine.inputs.find((i) => i.id === t.inputId);
          if (!from || !to) return null;
          const x1 = from.x + cellW;
          const y1 = from.y + cellH / 2;
          const x2 = to.x;
          const y2 = to.y + cellH / 2;
          const mx = (x1 + x2) / 2;
          return (
            <g key={t.id}>
              <path
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="#555"
                strokeWidth={1.5}
                markerEnd="url(#sm-arrow)"
              />
              <text x={mx} y={(y1 + y2) / 2 - 4} textAnchor="middle" className="fill-neutral-500 text-[8px]">
                {input?.name ?? "?"}
              </text>
            </g>
          );
        })}

        {machine.states.map((state) => {
          const pos = positions.get(state.id)!;
          const isInitial = machine.initialStateId === state.id;
          const isActive = activeStateId === state.id;
          return (
            <g
              key={state.id}
              className="cursor-pointer"
              onClick={() => onSelectState(state.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onSetInitial(state.id);
              }}
            >
              <rect
                x={pos.x}
                y={pos.y}
                width={cellW}
                height={cellH}
                rx={8}
                className={cn(
                  "fill-neutral-900 stroke-neutral-700",
                  isActive && "stroke-sky-400 stroke-2",
                  isInitial && "stroke-white"
                )}
              />
              <text x={pos.x + 10} y={pos.y + 22} className="fill-white text-[11px] font-medium">
                {state.name}
              </text>
              <text x={pos.x + 10} y={pos.y + 40} className="fill-neutral-500 text-[9px] font-mono">
                {state.timelineStart.toFixed(1)}s – {state.timelineEnd.toFixed(1)}s
              </text>
              {isInitial && (
                <text x={pos.x + 10} y={pos.y + 56} className="fill-neutral-400 text-[8px] uppercase">
                  initial
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-[9px] text-neutral-600">Click state · double-click to set initial</p>
    </div>
  );
}
