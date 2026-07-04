"use client";



import { EditorToolbar } from "@/components/editor/editor-toolbar";

import { LayersPanel } from "@/components/editor/layers-panel";

import { StateMachinePanel } from "@/components/editor/state-machine-panel";

import { InspectorPanel } from "@/components/editor/inspector-panel";

import { EditorCanvasHost } from "@/components/editor/editor-canvas-host";

import { DrawingToolbar } from "@/components/editor/drawing-toolbar";

import { TimelinePanel } from "@/components/editor/timeline-panel";

import { UploadPanel } from "@/components/editor/upload-panel";

import { AiChatPanel } from "@/components/ai/ai-chat-panel";

import { PanelResizeHandle } from "@/components/editor/panel-resize-handle";

import { useEditorStore } from "@/store/editor-store";

import {

  usePlaybackLoop,

  useAutosave,

  useKeyboardShortcuts,

} from "@/hooks/use-editor-hooks";

import { useEditorLayout } from "@/hooks/use-editor-layout";

import { useCollaboration } from "@/hooks/use-collaboration";

import { cn } from "@/lib/utils";

import { Sliders, Brain, Layers, GitBranch } from "lucide-react";

import { useEffect } from "react";

import type { Project } from "@svg-animator/types";



export default function EditorPage() {

  const project = useEditorStore((s) => s.project);

  const rightPanelTab = useEditorStore((s) => s.rightPanelTab);

  const leftPanelTab = useEditorStore((s) => s.leftPanelTab);

  const setRightPanelTab = useEditorStore((s) => s.setRightPanelTab);

  const setLeftPanelTab = useEditorStore((s) => s.setLeftPanelTab);

  const loadProjectData = useEditorStore((s) => s.loadProjectData);
  const canvasViewMode = useEditorStore((s) => s.canvasViewMode);

  const { layout, resizeLeft, resizeRight, resizeTimeline } = useEditorLayout();



  usePlaybackLoop();

  useAutosave();

  useKeyboardShortcuts();

  useCollaboration();



  useEffect(() => {

    const raw = sessionStorage.getItem("cerebral_import_project");

    if (raw) {

      sessionStorage.removeItem("cerebral_import_project");

      try {

        loadProjectData(JSON.parse(raw) as Project);

      } catch { /* ignore */ }

    }

  }, [loadProjectData]);



  return (

    <div className="flex h-screen flex-col bg-black text-white">

      <EditorToolbar />

      <div className="flex flex-1 overflow-hidden">

        <aside

          className="flex shrink-0 flex-col border-r border-neutral-800"

          style={{ width: layout.leftWidth }}

        >

          <div className="flex border-b border-neutral-800">

            <button

              type="button"

              onClick={() => setLeftPanelTab("layers")}

              className={cn(

                "flex flex-1 items-center justify-center gap-1 py-2 text-[9px] uppercase tracking-wider",

                leftPanelTab === "layers" ? "border-b-2 border-white text-white" : "text-neutral-500"

              )}

            >

              <Layers className="h-3 w-3" /> Layers

            </button>

            <button

              type="button"

              onClick={() => setLeftPanelTab("states")}

              className={cn(

                "flex flex-1 items-center justify-center gap-1 py-2 text-[9px] uppercase tracking-wider",

                leftPanelTab === "states" ? "border-b-2 border-white text-white" : "text-neutral-500"

              )}

            >

              <GitBranch className="h-3 w-3" /> States

            </button>

          </div>

          <div className="flex-1 overflow-hidden">

            {leftPanelTab === "layers" ? <LayersPanel /> : <StateMachinePanel />}

          </div>

        </aside>



        <PanelResizeHandle axis="x" onDelta={resizeLeft} />



        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">

          <div className="flex min-h-0 flex-1 overflow-hidden">

            {project && canvasViewMode === "editor" && <DrawingToolbar />}

            <div className="min-w-0 flex-1 overflow-hidden">

              {project ? <EditorCanvasHost /> : <UploadPanel />}

            </div>

          </div>



          <PanelResizeHandle axis="y" onDelta={resizeTimeline} />



          <div className="shrink-0 overflow-hidden" style={{ height: layout.timelineHeight }}>

            <TimelinePanel />

          </div>

        </main>



        <PanelResizeHandle axis="x" onDelta={resizeRight} />



        <aside

          className="flex shrink-0 flex-col border-l border-neutral-800"

          style={{ width: layout.rightWidth }}

        >

          <div className="flex border-b border-neutral-800">

            <button

              type="button"

              onClick={() => setRightPanelTab("inspector")}

              className={cn(

                "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[10px] uppercase tracking-wider",

                rightPanelTab === "inspector" ? "border-b-2 border-white text-white" : "text-neutral-500"

              )}

            >

              <Sliders className="h-3 w-3" /> Inspector

            </button>

            <button

              type="button"

              onClick={() => setRightPanelTab("ai")}

              className={cn(

                "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[10px] uppercase tracking-wider",

                rightPanelTab === "ai" ? "border-b-2 border-white text-white" : "text-neutral-500"

              )}

            >

              <Brain className="h-3 w-3" /> AI

            </button>

          </div>

          <div className="flex-1 overflow-hidden">

            {rightPanelTab === "inspector" ? <InspectorPanel /> : <AiChatPanel />}

          </div>

        </aside>

      </div>

    </div>

  );

}

