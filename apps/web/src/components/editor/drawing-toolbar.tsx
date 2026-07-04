"use client";

import type { DrawingTool } from "@svg-animator/types";
import { useEditorStore } from "@/store/editor-store";
import { cn } from "@/lib/utils";
import {
  MousePointer2, Square, Circle, Minus, Pen, Type, Spline,
} from "lucide-react";

const TOOLS: { id: DrawingTool; icon: typeof MousePointer2; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select (V)" },
  { id: "rectangle", icon: Square, label: "Rectangle (R)" },
  { id: "ellipse", icon: Circle, label: "Ellipse (E)" },
  { id: "line", icon: Minus, label: "Line (L)" },
  { id: "pen", icon: Pen, label: "Pen (P)" },
  { id: "motionPath", icon: Spline, label: "Motion Path (M) — select element first" },
  { id: "text", icon: Type, label: "Text (T)" },
];

export function DrawingToolbar() {
  const { activeTool, setActiveTool, project, selectedIds } = useEditorStore();
  if (!project) return null;

  return (
    <div className="flex flex-col gap-1 border-r border-neutral-800 bg-black p-1.5">
      {TOOLS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          title={label}
          disabled={id === "motionPath" && selectedIds.length !== 1}
          onClick={() => setActiveTool(id)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded transition-colors",
            activeTool === id
              ? "bg-white text-black"
              : "text-neutral-500 hover:bg-neutral-900 hover:text-white",
            id === "motionPath" && selectedIds.length !== 1 && "cursor-not-allowed opacity-40"
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
