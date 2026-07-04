import type { ExportOptions, ExportResult, Project } from "@svg-animator/types";
import { exportCss } from "./css";
import { exportJs } from "./js";
import { exportLottie } from "./lottie";
import { exportHtml } from "./embed";
import { exportReact } from "./react";
import { exportSmil } from "./smil";

export function exportProject(project: Project, options: ExportOptions): ExportResult {
  switch (options.format) {
    case "smil":
      return exportSmil(project, options);
    case "css":
      return exportCss(project, options);
    case "js":
      return exportJs(project, options);
    case "html":
      return exportHtml(project, options);
    case "react":
      return exportReact(project, options);
    case "lottie":
      return exportLottie(project, options);
    case "project":
      return {
        format: "project",
        filename: `${sanitizeFilename(project.name)}.svganim`,
        mimeType: "application/json",
        content: JSON.stringify(project, null, 2),
        warnings: [],
      };
    default:
      throw new Error(`Export format "${options.format}" not yet supported in this build`);
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_-]/gi, "_").toLowerCase() || "animation";
}

export { exportSmil } from "./smil";
export { exportCss } from "./css";
export { exportJs } from "./js";
export { exportReact } from "./react";
export { exportLottie } from "./lottie";
export { exportHtml } from "./embed";

export const EXPORT_CAPABILITIES: Record<
  string,
  { label: string; description: string; features: string[]; limitations: string[] }
> = {
  smil: {
    label: "SMIL SVG",
    description: "Self-contained animated SVG, zero runtime",
    features: ["transform", "opacity", "colors", "stroke", "motion path"],
    limitations: ["No click/scroll triggers", "Limited path morph", "Deprecated in Chrome (still works)"],
  },
  css: {
    label: "CSS SVG",
    description: "SVG with embedded @keyframes styles",
    features: ["transform", "opacity", "colors"],
    limitations: ["Won't animate in <img>", "No path morph", "No interactivity"],
  },
  js: {
    label: "JS Player",
    description: "SVG with inline animation player",
    features: ["all properties", "triggers", "path morph", "motion path"],
    limitations: ["Requires JavaScript enabled"],
  },
  react: {
    label: "React Component",
    description: "TSX component for Next.js / React",
    features: ["SMIL inline", "component props"],
    limitations: ["React runtime required"],
  },
  lottie: {
    label: "Lottie JSON",
    description: "For lottie-web, iOS, Android",
    features: ["transform", "opacity", "shape layers", "path geometry"],
    limitations: ["Bezier easing approximated", "No path morph shapes"],
  },
  html: {
    label: "HTML Embed",
    description: "Standalone page with Cerebral inline runtime",
    features: ["keyframes", "motion paths", "state machine script", "self-contained"],
    limitations: ["Requires JavaScript", "Inline runtime (~3kb)"],
  },
  gif: {
    label: "GIF",
    description: "Raster animated GIF",
    features: ["universal compatibility"],
    limitations: ["Rasterized", "256 colors", "large file size"],
  },
  mp4: {
    label: "MP4",
    description: "H.264 video export",
    features: ["social media", "presentations"],
    limitations: ["Rasterized", "requires WebCodecs"],
  },
  webm: {
    label: "WebM",
    description: "VP9 video export",
    features: ["web video", "transparency"],
    limitations: ["Rasterized", "requires WebCodecs"],
  },
  project: {
    label: "Project File",
    description: "Native .svganim for re-editing",
    features: ["full round-trip", "all data preserved"],
    limitations: ["Requires SVG Animator to open"],
  },
};
