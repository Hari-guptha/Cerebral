"use client";

import { useState } from "react";
import { ANIMATION_PRESETS } from "@svg-animator/engine";
import { useEditorStore } from "@/store/editor-store";
import { Button } from "@/components/ui/button";
import { Wand2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function PresetsMenu() {
  const { project, applyAnimationPreset } = useEditorStore();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("all");

  if (!project) return null;

  const categories = ["all", "entrance", "emphasis", "exit", "motion"] as const;
  const filtered = category === "all"
    ? ANIMATION_PRESETS
    : ANIMATION_PRESETS.filter((p) => p.category === category);

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} className="h-7 text-[10px]">
        <Wand2 className="mr-1 h-3.5 w-3.5" />
        Presets
        <ChevronDown className={cn("ml-1 h-3 w-3 transition-transform", open && "rotate-180")} />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded border border-neutral-800 bg-black shadow-2xl">
            <div className="flex gap-1 border-b border-neutral-800 p-2">
              {categories.map((c) => (
                <button key={c} type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded px-2 py-0.5 text-[9px] uppercase tracking-wider",
                    category === c ? "bg-white text-black" : "text-neutral-500 hover:text-white"
                  )}>
                  {c}
                </button>
              ))}
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
              {filtered.map((preset) => (
                <button key={preset.id} type="button"
                  className="flex w-full flex-col rounded px-3 py-2 text-left hover:bg-neutral-900"
                  onClick={() => { applyAnimationPreset(preset.id); setOpen(false); }}>
                  <span className="text-xs text-white">{preset.name}</span>
                  <span className="text-[10px] text-neutral-500">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
