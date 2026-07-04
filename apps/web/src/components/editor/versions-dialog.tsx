"use client";

import type { Project } from "@svg-animator/types";
import { useEditorStore } from "@/store/editor-store";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import {
  listProjectVersions,
  loadProjectVersion,
  saveProjectVersion,
  type ProjectVersionSummary,
} from "@/lib/project-api";
import { History, RotateCcw } from "lucide-react";

interface VersionsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function VersionsDialog({ open, onClose }: VersionsDialogProps) {
  const { project, loadProjectData } = useEditorStore();
  const [versions, setVersions] = useState<ProjectVersionSummary[]>([]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    if (!project) return;
    setLoading(true);
    const list = await listProjectVersions(project.id);
    setVersions(list);
    setLoading(false);
  };

  useEffect(() => {
    if (open && project) refresh();
  }, [open, project?.id]);

  const handleSaveVersion = async () => {
    if (!project) return;
    setSaving(true);
    const versionLabel = label.trim() || `Version ${versions.length + 1}`;
    await saveProjectVersion(project, versionLabel);
    setLabel("");
    await refresh();
    setSaving(false);
  };

  const handleRestore = async (versionId: string) => {
    if (!project) return;
    if (!confirm("Restore this version? Current unsaved changes will be replaced.")) return;
    const restored = await loadProjectVersion(project.id, versionId);
    if (restored) {
      loadProjectData(restored);
      onClose();
    }
  };

  if (!project) return null;

  return (
    <Dialog open={open} onClose={onClose} title="Version History" className="max-w-md">
      <div className="space-y-4">
        <p className="text-xs text-neutral-500">
          Save named snapshots while you animate. Auto-versions are created every few minutes.
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="Version label (e.g. Intro animation v2)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveVersion()}
          />
          <Button onClick={handleSaveVersion} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        <div className="max-h-72 space-y-1 overflow-auto border-t border-neutral-800 pt-3">
          {loading ? (
            <p className="py-6 text-center text-xs text-neutral-600">Loading versions...</p>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-neutral-600">
              <History className="mb-2 h-6 w-6 opacity-40" />
              <p className="text-xs">No versions yet — save one to get started</p>
            </div>
          ) : (
            versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-sm border border-neutral-800 px-3 py-2"
              >
                <div>
                  <p className="text-sm text-white">{v.label}</p>
                  <p className="text-[10px] text-neutral-600">
                    {new Date(v.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRestore(v.id)}
                  title="Restore this version"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Restore
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
}
