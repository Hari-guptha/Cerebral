"use client";

import { useRef, useState } from "react";
import { FileImage, FileVideo, Upload, FileCode, Layers } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEditorStore } from "@/store/editor-store";
import { importProjectFile } from "@/lib/db";
import {
  getMediaFileKind,
  type MediaImportOptions,
} from "@/lib/media-import";
import type { ObjectFitMode } from "@svg-animator/types";

interface ImportMediaDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ImportMediaDialog({ open, onClose }: ImportMediaDialogProps) {
  const {
    project,
    importSvg,
    importSvgIntoProject,
    importImageFile,
    importVideoFile,
    loadProjectData,
  } = useEditorStore();

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ name: string; kind: string } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [svgMode, setSvgMode] = useState<"merge" | "replace">("merge");
  const [objectFit, setObjectFit] = useState<ObjectFitMode>("contain");
  const [fitToCanvas, setFitToCanvas] = useState(true);
  const [trimIn, setTrimIn] = useState(0);
  const [trimOut, setTrimOut] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  const resetForm = () => {
    setError(null);
    setPreview(null);
    setPendingFile(null);
    setTrimIn(0);
    setTrimOut(0);
    setVideoDuration(0);
    setSvgMode("merge");
    setObjectFit("contain");
    setFitToCanvas(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const mediaOptions = (): MediaImportOptions => ({
    objectFit,
    fitToCanvas,
    centerOnCanvas: true,
    trimIn,
    trimOut: trimOut > 0 ? trimOut : undefined,
  });

  const processFile = async (file: File) => {
    setImporting(true);
    setError(null);
    try {
      const kind = getMediaFileKind(file);
      const opts = mediaOptions();

      switch (kind) {
        case "project": {
          const proj = await importProjectFile(file);
          loadProjectData(proj);
          break;
        }
        case "svg": {
          const text = await file.text();
          if (project) {
            importSvgIntoProject(text, file.name.replace(/\.svg$/i, ""), svgMode);
          } else {
            importSvg(text, file.name.replace(/\.svg$/i, ""));
          }
          break;
        }
        case "image":
          await importImageFile(file, opts);
          break;
        case "video":
          await importVideoFile(file, {
            ...opts,
            trimOut: trimOut > 0 ? trimOut : videoDuration || undefined,
          });
          break;
        default:
          setError("Unsupported file type. Use SVG, PNG, JPG, WebP, GIF, MP4, WebM, or .svganim.");
          return;
      }
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    resetForm();
    setPendingFile(file);
    const kind = getMediaFileKind(file);
    setPreview({ name: file.name, kind });

    if (kind === "video") {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        setVideoDuration(video.duration);
        setTrimOut(video.duration);
        URL.revokeObjectURL(url);
      };
      video.src = url;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFileSelect(file);
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Import Media" className="max-w-lg">
      <div
        className="space-y-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div
          className="cursor-pointer rounded-lg border-2 border-dashed border-neutral-700 p-8 text-center transition-colors hover:border-neutral-500"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="mx-auto mb-3 h-10 w-10 text-neutral-600" />
          <p className="text-sm text-neutral-300">
            Drop or click to import
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            SVG · PNG · JPG · WebP · GIF · MP4 · WebM · MOV · .svganim
          </p>
          {preview && (
            <p className="mt-3 text-xs text-sky-400">
              Selected: {preview.name} ({preview.kind})
            </p>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".svg,.svganim,.json,image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFileSelect(f);
            e.target.value = "";
          }}
        />

        {project && preview?.kind === "svg" && (
          <div className="space-y-2 rounded border border-neutral-800 p-3">
            <Label className="text-[10px] uppercase tracking-wider text-neutral-500">SVG Import Mode</Label>
            <div className="flex gap-2">
              <Button
                variant={svgMode === "merge" ? "default" : "outline"}
                size="sm"
                onClick={() => setSvgMode("merge")}
              >
                <Layers className="mr-1 h-3 w-3" /> Add as Layer
              </Button>
              <Button
                variant={svgMode === "replace" ? "default" : "outline"}
                size="sm"
                onClick={() => setSvgMode("replace")}
              >
                <FileCode className="mr-1 h-3 w-3" /> Replace Project
              </Button>
            </div>
          </div>
        )}

        {preview && (preview.kind === "image" || preview.kind === "video") && (
          <div className="space-y-3 rounded border border-neutral-800 p-3">
            <Label className="text-[10px] uppercase tracking-wider text-neutral-500">Fit & Layout</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-neutral-600">Object Fit</Label>
                <select
                  className="mt-1 w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs"
                  value={objectFit}
                  onChange={(e) => setObjectFit(e.target.value as ObjectFitMode)}
                >
                  <option value="contain">Contain (fit inside)</option>
                  <option value="cover">Cover (fill frame)</option>
                  <option value="fill">Fill (stretch)</option>
                  <option value="none">None (original size)</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs text-neutral-400">
                  <input
                    type="checkbox"
                    checked={fitToCanvas}
                    onChange={(e) => setFitToCanvas(e.target.checked)}
                  />
                  Fit to canvas
                </label>
              </div>
            </div>
          </div>
        )}

        {preview?.kind === "video" && videoDuration > 0 && (
          <div className="space-y-3 rounded border border-neutral-800 p-3">
            <Label className="text-[10px] uppercase tracking-wider text-neutral-500">
              <FileVideo className="mr-1 inline h-3 w-3" />
              Video Trim (seconds)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-neutral-600">In Point</Label>
                <input
                  type="number"
                  min={0}
                  max={videoDuration}
                  step={0.1}
                  value={trimIn}
                  onChange={(e) => setTrimIn(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="mt-1 w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-neutral-600">Out Point</Label>
                <input
                  type="number"
                  min={trimIn}
                  max={videoDuration}
                  step={0.1}
                  value={trimOut}
                  onChange={(e) =>
                    setTrimOut(Math.min(videoDuration, parseFloat(e.target.value) || videoDuration))
                  }
                  className="mt-1 w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs"
                />
              </div>
            </div>
            <p className="text-[10px] text-neutral-600">
              Duration: {videoDuration.toFixed(2)}s · Clip: {(trimOut - trimIn).toFixed(2)}s
            </p>
          </div>
        )}

        {preview?.kind === "image" && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <FileImage className="h-3.5 w-3.5" />
            Image will be added as a new layer{project ? "" : " in a new project"}.
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            disabled={!pendingFile || importing}
            onClick={() => pendingFile && void processFile(pendingFile)}
          >
            {importing ? "Importing…" : "Import"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
