"use client";

import {
  Undo2, Redo2, Download, Play, Pause,
  FolderOpen, Save, History, Brain, Settings, Share2, FilePlus2, Upload,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEditorStore } from "@/store/editor-store";
import { exportProjectFile } from "@/lib/db";
import { persistProject } from "@/lib/project-api";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ExportDialog } from "@/components/export/export-dialog";
import { ProjectsDialog } from "@/components/editor/projects-dialog";
import { VersionsDialog } from "@/components/editor/versions-dialog";
import { PresetsMenu } from "@/components/editor/presets-menu";
import { ShareDialog } from "@/components/editor/share-dialog";
import { ImportMediaDialog } from "@/components/editor/import-media-dialog";

export function EditorToolbar() {
  const {
    project, isPlaying, setIsPlaying, setProjectName,
    undo, redo, autosave, setRightPanelTab, newProject,
    historyIndex, history,
  } = useEditorStore(
    useShallow((s) => ({
      project: s.project,
      isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying,
      setProjectName: s.setProjectName,
      undo: s.undo,
      redo: s.redo,
      autosave: s.autosave,
      setRightPanelTab: s.setRightPanelTab,
      newProject: s.newProject,
      historyIndex: s.historyIndex,
      history: s.history,
    }))
  );
  const canUndo = historyIndex > 0 && history.length > 1;
  const canRedo = historyIndex < history.length - 1;
  const [exportOpen, setExportOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSave = async () => {
    if (!project) return;
    setSaveStatus("Saving...");
    const result = await persistProject(project);
    if (result.server) setSaveStatus("Saved to database");
    else if (result.local) setSaveStatus("Saved locally");
    else setSaveStatus("Save failed");
    setTimeout(() => setSaveStatus(null), 2000);
  };

  return (
    <>
      <header className="flex h-11 items-center gap-2 border-b border-neutral-800 bg-black px-4">
        <Link href="/" className="flex items-center gap-1.5">
          <Brain className="h-4 w-4 text-white" />
          <span className="text-xs font-semibold uppercase tracking-widest text-white">Cerebral</span>
        </Link>
        {project && (
          <Input
            className="h-7 w-40 text-xs"
            value={project.name}
            onChange={(e) => setProjectName(e.target.value)}
          />
        )}
        {saveStatus && (
          <span className="text-[10px] text-neutral-500">{saveStatus}</span>
        )}
        <div className="ml-1 flex gap-1">
          <Button variant="ghost" size="icon" onClick={undo} title="Undo (Ctrl+Z)" disabled={!canUndo}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} title="Redo (Ctrl+Y)" disabled={!canRedo}>
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <PresetsMenu />
          <Button variant="ghost" size="sm" onClick={() => setRightPanelTab("ai")} title="AI Animation">
            <Brain className="mr-1 h-4 w-4" /> AI
          </Button>
          <Link href="/settings">
            <Button variant="ghost" size="icon" title="Settings">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setShareOpen(true)} disabled={!project}>
            <Share2 className="mr-1 h-4 w-4" /> Share
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)} title="Import SVG, images, or video">
            <Upload className="mr-1 h-4 w-4" /> Import
          </Button>
          <Button variant="ghost" size="sm" onClick={() => newProject()} title="New blank project">
            <FilePlus2 className="mr-1 h-4 w-4" /> New
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setProjectsOpen(true)}>
            <FolderOpen className="mr-1 h-4 w-4" /> Projects
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setVersionsOpen(true)} disabled={!project}>
            <History className="mr-1 h-4 w-4" /> Versions
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={!project} title="Ctrl+S">
            <Save className="mr-1 h-4 w-4" /> Save
          </Button>
          <Button variant="ghost" size="sm" onClick={() => project && exportProjectFile(project)} disabled={!project}>
            Export File
          </Button>
          <Button variant="default" size="sm" onClick={async () => { await autosave(); setExportOpen(true); }} disabled={!project}>
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
        </div>
      </header>
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} />
      <ImportMediaDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <ProjectsDialog open={projectsOpen} onClose={() => setProjectsOpen(false)} />
      <VersionsDialog open={versionsOpen} onClose={() => setVersionsOpen(false)} />
    </>
  );
}
