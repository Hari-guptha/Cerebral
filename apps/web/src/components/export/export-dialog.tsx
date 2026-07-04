"use client";

import type { ExportFormat } from "@svg-animator/types";
import { exportProject, EXPORT_CAPABILITIES } from "@svg-animator/engine";
import { useEditorStore } from "@/store/editor-store";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { downloadBlob } from "@/lib/utils";
import { optimizeSvgString } from "@/lib/project-api";
import { exportToGif, exportToWebm, exportToMp4 } from "@/lib/raster-export";
import { useState } from "react";

function isSvgFormat(format: ExportFormat): boolean {
  return format === "smil" || format === "css" || format === "js";
}

const FORMATS: ExportFormat[] = [
  "smil", "css", "js", "html", "react", "lottie",
  "gif", "webm", "mp4",
  "project",
];

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const { project } = useEditorStore();
  const [format, setFormat] = useState<ExportFormat>("smil");
  const [preview, setPreview] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState("");

  const handleExport = async () => {
    if (!project) return;
    setExporting(true);
    setProgress("Exporting...");

    try {
      if (format === "gif") {
        const blob = await exportToGif(project, 15, (p) =>
          setProgress(`${p.phase}: ${p.frame}/${p.total}`)
        );
        downloadBlob(blob, `${project.name}.gif`, "image/gif");
      } else if (format === "webm") {
        const blob = await exportToWebm(project, 30, (p) =>
          setProgress(`${p.phase}: ${p.frame}/${p.total}`)
        );
        downloadBlob(blob, `${project.name}.webm`, "video/webm");
      } else if (format === "mp4") {
        const { blob, format: actual } = await exportToMp4(project, 30, (p) =>
          setProgress(`${p.phase}: ${p.frame}/${p.total}`)
        );
        downloadBlob(blob, `${project.name}.${actual}`, actual === "mp4" ? "video/mp4" : "video/webm");
      } else {
        const result = exportProject(project, {
          format,
          loop: project.settings.loop,
          trigger: project.settings.trigger,
          idPrefix: project.settings.idPrefix,
          responsive: project.settings.responsive,
          optimize: true,
        });
        let content = result.content;
        if (typeof content === "string" && isSvgFormat(format)) {
          content = optimizeSvgString(content);
        }
        downloadBlob(content, result.filename, result.mimeType);
      }
      setProgress("Done!");
      setTimeout(() => setProgress(""), 2000);
    } catch (e) {
      setProgress(`Error: ${e instanceof Error ? e.message : "Export failed"}`);
    } finally {
      setExporting(false);
    }
  };

  const handlePreview = () => {
    if (!project) return;
    if (format === "gif" || format === "webm" || format === "mp4") {
      setPreview(`Raster export: ${format.toUpperCase()} — frame-by-frame render from timeline. Click Download to export.`);
      setWarnings(["Raster exports may take a few seconds depending on duration and resolution."]);
      return;
    }
    try {
      const result = exportProject(project, {
        format,
        loop: project.settings.loop,
        trigger: project.settings.trigger,
      });
      setPreview(typeof result.content === "string" ? result.content : "[Binary content]");
      setWarnings(result.warnings);
    } catch (e) {
      setPreview(`Error: ${e instanceof Error ? e.message : "Export failed"}`);
      setWarnings([]);
    }
  };

  if (!project) return null;

  const caps = EXPORT_CAPABILITIES[format];

  return (
    <Dialog open={open} onClose={onClose} title="Export Animation" className="max-w-4xl">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm text-neutral-400">Choose export format:</p>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {FORMATS.map((f) => {
              const c = EXPORT_CAPABILITIES[f];
              return (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    format === f
                      ? "border-white bg-neutral-900"
                      : "border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  <div className="text-sm font-medium text-white">{c.label}</div>
                  <div className="text-xs text-neutral-500">{c.description}</div>
                </button>
              );
            })}
          </div>

          {caps && (
            <div className="rounded-lg border border-neutral-800 p-3 text-xs">
              <p className="mb-1 font-medium text-neutral-300">Capabilities</p>
              <ul className="list-inside list-disc text-green-400">
                {caps.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {progress && (
            <p className="text-xs text-neutral-400">{progress}</p>
          )}

          <div className="flex gap-2">
            <Button onClick={handlePreview} variant="outline" disabled={exporting}>
              Preview
            </Button>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? "Exporting..." : "Download"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-400">Preview</p>
          {warnings.length > 0 && (
            <div className="rounded border border-amber-800 bg-amber-900/20 p-2 text-xs text-amber-300">
              {warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}
          {(format === "smil" || format === "css" || format === "js") && preview && (
            <div
              className="mb-2 flex h-40 items-center justify-center rounded border border-neutral-800 bg-white"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          )}
          <pre className="max-h-80 overflow-auto rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-[10px] text-neutral-300">
            {preview || "Click Preview to see export output"}
          </pre>
        </div>
      </div>
    </Dialog>
  );
}
