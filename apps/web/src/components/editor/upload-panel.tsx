"use client";

import { useRef } from "react";
import { Upload, FileJson, FilePlus2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/editor-store";
import { importProjectFile } from "@/lib/db";
import { getMediaFileKind } from "@/lib/media-import";

export function UploadPanel() {
  const { importSvg, loadProjectData, newProject, importImageFile, importVideoFile } = useEditorStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const kind = getMediaFileKind(file);
    try {
      switch (kind) {
        case "project": {
          const project = await importProjectFile(file);
          loadProjectData(project);
          break;
        }
        case "svg": {
          const text = await file.text();
          importSvg(text, file.name.replace(/\.svg$/i, ""));
          break;
        }
        case "image":
          await importImageFile(file);
          break;
        case "video":
          await importVideoFile(file);
          break;
        default:
          alert("Unsupported file. Use SVG, PNG, JPG, WebP, GIF, MP4, WebM, or .svganim.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Import failed");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-4 p-8"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="rounded-xl border-2 border-dashed border-zinc-700 p-12 text-center">
        <Upload className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
        <p className="mb-2 text-sm text-zinc-300">
          Start a blank project, or drop SVG / images / video / .svganim
        </p>
        <p className="mb-4 text-xs text-zinc-500">PNG · JPG · WebP · GIF · MP4 · WebM · or paste SVG below</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => newProject()}>
            <FilePlus2 className="mr-1 h-4 w-4" /> New Project
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" /> Upload Media
          </Button>
          <Button variant="outline" onClick={() => projectRef.current?.click()}>
            <FileJson className="mr-1 h-4 w-4" /> Open Project
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".svg,.svganim,.json,image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <input
          ref={projectRef}
          type="file"
          accept=".svganim,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              const project = await importProjectFile(f);
              loadProjectData(project);
            }
          }}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-600">
        <ImageIcon className="h-3.5 w-3.5" />
        <span>Already editing? Use the Import button in the toolbar to add layers.</span>
      </div>
      <textarea
        className="h-32 w-full max-w-lg rounded-lg border border-zinc-700 bg-zinc-900 p-3 font-mono text-xs text-zinc-300"
        placeholder="Paste SVG markup here..."
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (text.includes("<svg")) {
            e.preventDefault();
            importSvg(text, "Pasted SVG");
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.ctrlKey) {
            const text = (e.target as HTMLTextAreaElement).value;
            if (text.includes("<svg")) importSvg(text, "Pasted SVG");
          }
        }}
      />
    </div>
  );
}
