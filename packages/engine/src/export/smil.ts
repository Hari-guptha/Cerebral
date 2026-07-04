import type { ExportOptions, ExportResult, Keyframe, Project } from "@svg-animator/types";
import { toSmilKeySplines } from "../easing";
import { buildTransformString } from "../animation";

function elId(project: Project, elementId: string, prefix: string): string {
  const el = project.elements.find((e) => e.id === elementId);
  return el?.svgId ?? `${prefix}_${elementId.slice(-6)}`;
}

function sortedKf(kfs: Keyframe[]): Keyframe[] {
  return [...kfs].sort((a, b) => a.time - b.time);
}

function buildValues(kfs: Keyframe[]): string {
  return sortedKf(kfs)
    .map((k) => k.value)
    .join(";");
}

function buildKeyTimes(kfs: Keyframe[], duration: number): string {
  return sortedKf(kfs)
    .map((k) => (k.time / duration).toFixed(4))
    .join(";");
}

function buildKeySplines(kfs: Keyframe[]): string {
  const sorted = sortedKf(kfs);
  if (sorted.length < 2) return "0 0 1 1";
  return sorted
    .slice(1)
    .map((k) => toSmilKeySplines(k.easing))
    .join(";");
}

function renderElement(
  project: Project,
  elementId: string,
  prefix: string,
  indent: string
): string {
  const el = project.elements.find((e) => e.id === elementId);
  if (!el || !el.visible) return "";

  const id = elId(project, elementId, prefix);
  const children = project.elements
    .filter((e) => e.parentId === elementId)
    .sort((a, b) => a.order - b.order);

  const tracks = project.tracks.filter((t) => t.elementId === elementId && t.enabled);
  const animTags: string[] = [];

  const transformTracks = tracks.filter((t) =>
    ["x", "y", "rotation", "scaleX", "scaleY"].includes(t.property)
  );
  const hasTransformAnim = transformTracks.some((t) => t.keyframes.length > 0);

  if (hasTransformAnim) {
    const translateTrack = tracks.find((t) => t.property === "x" || t.property === "y");
    const rotateTrack = tracks.find((t) => t.property === "rotation");
    const scaleTrack = tracks.find((t) => t.property === "scaleX");

    if (translateTrack && translateTrack.keyframes.length > 0) {
      const xTrack = tracks.find((t) => t.property === "x");
      const yTrack = tracks.find((t) => t.property === "y");
      const xKfs = xTrack?.keyframes ?? translateTrack.keyframes;
      const yKfs = yTrack?.keyframes ?? translateTrack.keyframes;
      const values = sortedKf(xKfs)
        .map((kx, i) => {
          const ky = sortedKf(yKfs)[i];
          return `${kx.value} ${ky?.value ?? 0}`;
        })
        .join(";");
      animTags.push(
        `${indent}  <animateTransform attributeName="transform" type="translate" additive="sum" dur="${project.duration}s" repeatCount="${project.settings.loop === "loop" ? "indefinite" : "1"}" values="${values}" keyTimes="${buildKeyTimes(xKfs, project.duration)}" keySplines="${buildKeySplines(xKfs)}" calcMode="spline" />`
      );
    }

    if (rotateTrack && rotateTrack.keyframes.length > 0) {
      animTags.push(
        `${indent}  <animateTransform attributeName="transform" type="rotate" additive="sum" dur="${project.duration}s" repeatCount="${project.settings.loop === "loop" ? "indefinite" : "1"}" values="${buildValues(rotateTrack.keyframes)}" keyTimes="${buildKeyTimes(rotateTrack.keyframes, project.duration)}" keySplines="${buildKeySplines(rotateTrack.keyframes)}" calcMode="spline" />`
      );
    }

    if (scaleTrack && scaleTrack.keyframes.length > 0) {
      animTags.push(
        `${indent}  <animateTransform attributeName="transform" type="scale" additive="sum" dur="${project.duration}s" repeatCount="${project.settings.loop === "loop" ? "indefinite" : "1"}" values="${buildValues(scaleTrack.keyframes)}" keyTimes="${buildKeyTimes(scaleTrack.keyframes, project.duration)}" keySplines="${buildKeySplines(scaleTrack.keyframes)}" calcMode="spline" />`
      );
    }
  } else if (el.transform && buildTransformString(el.transform) !== "none") {
    // static transform baked in
  }

  for (const track of tracks) {
    if (["x", "y", "rotation", "scaleX", "scaleY"].includes(track.property)) continue;
    if (track.keyframes.length === 0) continue;

    const attrMap: Record<string, string> = {
      opacity: "opacity",
      fill: "fill",
      stroke: "stroke",
      strokeWidth: "stroke-width",
      strokeDashoffset: "stroke-dashoffset",
      pathD: "d",
    };
    const attr = attrMap[track.property];
    if (!attr) continue;

    animTags.push(
      `${indent}  <animate attributeName="${attr}" dur="${project.duration}s" repeatCount="${project.settings.loop === "loop" ? "indefinite" : "1"}" values="${buildValues(track.keyframes)}" keyTimes="${buildKeyTimes(track.keyframes, project.duration)}" keySplines="${buildKeySplines(track.keyframes)}" calcMode="spline" />`
    );
  }

  const attrs = Object.entries(el.attrs)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, "&quot;")}"`)
    .join(" ");

  const transform = buildTransformString(el.transform);
  const transformAttr = transform !== "none" ? ` transform="${transform}"` : "";

  if (el.type === "group") {
    const childContent = children.map((c) => renderElement(project, c.id, prefix, indent + "  ")).join("\n");
    return `${indent}<g id="${id}"${transformAttr}${attrs ? ` ${attrs}` : ""}>\n${animTags.join("\n")}\n${childContent}\n${indent}</g>`;
  }

  const tag = el.type === "path" ? "path" : el.type;
  return `${indent}<${tag} id="${id}"${transformAttr}${attrs ? ` ${attrs}` : ""}>\n${animTags.join("\n")}\n${indent}</${tag}>`;
}

export function exportSmil(project: Project, options: ExportOptions): ExportResult {
  const prefix = options.idPrefix ?? project.settings.idPrefix;
  const warnings: string[] = [];

  const rootElements = project.elements.filter((e) => e.parentId === null);
  const content = rootElements
    .map((e) => renderElement(project, e.id, prefix, "  "))
    .join("\n");

  const responsive = options.responsive ?? project.settings.responsive;
  const widthHeight = responsive
    ? 'width="100%" height="100%"'
    : `width="${project.canvas.width}" height="${project.canvas.height}"`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" ${widthHeight} viewBox="${project.canvas.viewBox}">
${content}
</svg>`;

  return {
    format: "smil",
    filename: `${project.name.replace(/[^a-z0-9]/gi, "_")}.svg`,
    mimeType: "image/svg+xml",
    content: svg,
    warnings,
  };
}
