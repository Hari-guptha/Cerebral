import type { ExportOptions, ExportResult, Keyframe, Project } from "@svg-animator/types";
import { toCssEasing } from "../easing";
import { buildTransformString } from "../animation";

function elId(project: Project, elementId: string, prefix: string): string {
  const el = project.elements.find((e) => e.id === elementId);
  return el?.svgId ?? `${prefix}_${elementId.slice(-6)}`;
}

function sortedKf(kfs: Keyframe[]): Keyframe[] {
  return [...kfs].sort((a, b) => a.time - b.time);
}

function keyframePercent(time: number, duration: number): string {
  return `${((time / duration) * 100).toFixed(2)}%`;
}

export function exportCss(project: Project, options: ExportOptions): ExportResult {
  const prefix = options.idPrefix ?? project.settings.idPrefix;
  const warnings: string[] = ["CSS animations won't play inside <img> tags"];

  const cssRules: string[] = [];
  const classMap: Record<string, string> = {};

  for (const track of project.tracks) {
    if (!track.enabled || track.keyframes.length < 2) continue;
    const el = project.elements.find((e) => e.id === track.elementId);
    if (!el) continue;

    const animName = `${prefix}_anim_${track.id.slice(-8)}`;
    const sorted = sortedKf(track.keyframes);
    const kfRules = sorted
      .map((kf) => {
        const pct = keyframePercent(kf.time, project.duration);
        const prop = track.property;
        let decl = "";
        if (prop === "opacity") decl = `opacity: ${kf.value};`;
        else if (prop === "fill") decl = `fill: ${kf.value};`;
        else if (prop === "stroke") decl = `stroke: ${kf.value};`;
        else if (prop === "strokeWidth") decl = `stroke-width: ${kf.value};`;
        else if (["x", "y", "rotation", "scaleX", "scaleY"].includes(prop)) {
          const t = { ...el.transform };
          (t as Record<string, number>)[prop] = kf.value as number;
          decl = `transform: ${buildTransformString(t)}; transform-box: fill-box; transform-origin: center;`;
        }
        return `  ${pct} { ${decl} }`;
      })
      .join("\n");

    const easing = toCssEasing(sorted[1]?.easing ?? { type: "preset", preset: "easeInOut" });
    cssRules.push(
      `@keyframes ${animName} {\n${kfRules}\n}\n.${animName} {\n  animation: ${animName} ${project.duration}s ${easing} ${project.settings.loop === "loop" ? "infinite" : "forwards"};\n}`
    );
    classMap[track.elementId] = (classMap[track.elementId] ?? "") + ` ${animName}`;
  }

  function renderElement(elementId: string, indent: string): string {
    const el = project.elements.find((e) => e.id === elementId);
    if (!el || !el.visible) return "";

    const id = elId(project, elementId, prefix);
    const cls = classMap[elementId]?.trim() ?? "";
    const children = project.elements
      .filter((e) => e.parentId === elementId)
      .sort((a, b) => a.order - b.order);

    const attrs = Object.entries(el.attrs)
      .map(([k, v]) => `${k}="${String(v).replace(/"/g, "&quot;")}"`)
      .join(" ");

    const transform = buildTransformString(el.transform);
    const transformAttr = transform !== "none" ? ` transform="${transform}"` : "";
    const classAttr = cls ? ` class="${cls}"` : "";

    if (el.type === "group") {
      const childContent = children.map((c) => renderElement(c.id, indent + "  ")).join("\n");
      return `${indent}<g id="${id}"${classAttr}${transformAttr}${attrs ? ` ${attrs}` : ""}>\n${childContent}\n${indent}</g>`;
    }

    const tag = el.type;
    return `${indent}<${tag} id="${id}"${classAttr}${transformAttr}${attrs ? ` ${attrs}` : ""} />`;
  }

  const rootElements = project.elements.filter((e) => e.parentId === null);
  const content = rootElements.map((e) => renderElement(e.id, "  ")).join("\n");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${project.canvas.width}" height="${project.canvas.height}" viewBox="${project.canvas.viewBox}">
  <style><![CDATA[
${cssRules.join("\n\n")}
  ]]></style>
${content}
</svg>`;

  return {
    format: "css",
    filename: `${project.name.replace(/[^a-z0-9]/gi, "_")}_css.svg`,
    mimeType: "image/svg+xml",
    content: svg,
    warnings,
  };
}
