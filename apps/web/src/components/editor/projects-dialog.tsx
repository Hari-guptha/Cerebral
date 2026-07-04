"use client";

import type { Project } from "@svg-animator/types";
import { useEditorStore } from "@/store/editor-store";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { checkDatabaseStatus, deleteProjectFromServer, listServerProjects, loadProjectFromServer, type ProjectSummary } from "@/lib/project-api";
import { deleteProject, listProjects, loadProject } from "@/lib/db";
import { Database, FilePlus2, HardDrive, Trash2 } from "lucide-react";

interface ProjectsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ProjectsDialog({ open, onClose }: ProjectsDialogProps) {
  const { loadProjectData, newProject } = useEditorStore();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [dbOnline, setDbOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const refresh = async () => {
    setLoading(true);
    const online = await checkDatabaseStatus();
    setDbOnline(online);

    const local = (await listProjects()).map((p) => ({
      id: p.id,
      name: p.name,
      updatedAt: new Date(p.updatedAt).toISOString(),
      source: "local" as const,
    }));

    const server = online ? await listServerProjects() : [];
    const merged = new Map<string, ProjectSummary>();

    for (const p of [...local, ...server]) {
      const existing = merged.get(p.id);
      if (!existing || new Date(p.updatedAt) > new Date(existing.updatedAt)) {
        merged.set(p.id, p);
      }
    }

    setProjects(
      Array.from(merged.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    );
    setLoading(false);
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openProject = async (p: ProjectSummary) => {
    let project: Project | null | undefined;

    if (p.source === "server" || dbOnline) {
      project = await loadProjectFromServer(p.id);
    }
    if (!project) {
      project = await loadProject(p.id);
    }

    if (project) {
      loadProjectData(project);
      onClose();
    }
  };

  const removeProject = async (p: ProjectSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${p.name}"?`)) return;
    await deleteProject(p.id);
    if (dbOnline) await deleteProjectFromServer(p.id);
    refresh();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Projects" className="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-neutral-500">
          {dbOnline ? (
            <>
              <Database className="h-3 w-3" />
              PostgreSQL connected
            </>
          ) : (
            <>
              <HardDrive className="h-3 w-3" />
              Local only — run docker compose up -d
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              newProject();
              onClose();
            }}
          >
            <FilePlus2 className="mr-1 h-3.5 w-3.5" /> New Project
          </Button>
        </div>

        <div className="max-h-80 space-y-1 overflow-auto">
          {loading ? (
            <p className="py-8 text-center text-xs text-neutral-600">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-neutral-600">No saved projects</p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => openProject(p)}
                className="group flex w-full items-center justify-between rounded-sm border border-neutral-800 px-3 py-2.5 text-left transition-colors hover:bg-neutral-900"
              >
                <div>
                  <p className="text-sm text-white">{p.name}</p>
                  <p className="text-[10px] text-neutral-600">
                    {new Date(p.updatedAt).toLocaleString()}
                    {p.source === "server" && " · Server"}
                    {p.versionCount != null && p.versionCount > 0 && ` · ${p.versionCount} versions`}
                  </p>
                </div>
                <button
                  onClick={(e) => removeProject(p, e)}
                  className="rounded p-1 opacity-0 transition-opacity hover:bg-neutral-800 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5 text-neutral-500" />
                </button>
              </button>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
}
