"use client";

import { SvgCanvas } from "@/components/editor/svg-canvas";
import { Layer3DView } from "@/components/editor/layer-3d-view";
import { useEditorStore, type CanvasViewMode } from "@/store/editor-store";
import { cn } from "@/lib/utils";
import { Box, Boxes } from "lucide-react";

const MODES: { id: CanvasViewMode; label: string; icon: typeof Box }[] = [
  { id: "editor", label: "Editor", icon: Box },
  { id: "3d", label: "3D Layers", icon: Boxes },
];

export function EditorCanvasHost() {
  const canvasViewMode = useEditorStore((s) => s.canvasViewMode);
  const setCanvasViewMode = useEditorStore((s) => s.setCanvasViewMode);
  const project = useEditorStore((s) => s.project);

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-neutral-500">
        <p className="text-sm">Drop an SVG file or paste markup to begin</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute right-3 top-3 z-30 flex rounded-lg border border-neutral-700 bg-black/90 p-0.5 shadow-lg backdrop-blur-sm">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setCanvasViewMode(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors",
              canvasViewMode === id
                ? "bg-white text-black"
                : "text-neutral-400 hover:text-white"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="h-full w-full">
        {canvasViewMode === "editor" ? <SvgCanvas /> : <Layer3DView />}
      </div>
    </div>
  );
}
