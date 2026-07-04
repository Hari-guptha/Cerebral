import type { ElementNode, ElementType, Project, Transform2D } from "@svg-animator/types";
import { createId, DEFAULT_TRANSFORM } from "@svg-animator/types";
import { getChildren } from "./parser";
import { sampleProject, buildTransformString } from "./animation";

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function renderElementAtTime(
  project: Project,
  elementId: string,
  time: number,
  indent: string
): string {
  const el = project.elements.find((e) => e.id === elementId);
  if (!el || !el.visible) return "";

  const state = sampleProject(project, time)[elementId];
  const transform = state?.transform ?? el.transform;
  const transformStr = buildTransformString(transform);
  const opacity = state?.opacity ?? (el.attrs.opacity as number) ?? 1;

  const attrs: string[] = [];
  if (transformStr !== "none") attrs.push(`transform="${escapeAttr(transformStr)}"`);
  if (opacity !== 1) attrs.push(`opacity="${opacity}"`);
  attrs.push(`data-element-id="${escapeAttr(elementId)}"`);

  const fill = state?.fill ?? el.attrs.fill;
  const stroke = state?.stroke ?? el.attrs.stroke;
  const strokeWidth = state?.strokeWidth ?? el.attrs["stroke-width"];
  if (fill) attrs.push(`fill="${escapeAttr(String(fill))}"`);
  if (stroke) attrs.push(`stroke="${escapeAttr(String(stroke))}"`);
  if (strokeWidth) attrs.push(`stroke-width="${strokeWidth}"`);

  const children = getChildren(project.elements, elementId)
    .map((c) => renderElementAtTime(project, c.id, time, indent + "  "))
    .join("\n");

  if (el.type === "group") {
    return `${indent}<g ${attrs.join(" ")}>\n${children}\n${indent}</g>`;
  }

  const staticAttrs = { ...el.attrs };
  delete staticAttrs.fill;
  delete staticAttrs.stroke;
  delete staticAttrs["stroke-width"];
  delete staticAttrs.d;
  delete staticAttrs.opacity;

  for (const [k, v] of Object.entries(staticAttrs)) {
    if (v !== undefined && v !== "") attrs.push(`${k}="${escapeAttr(String(v))}"`);
  }

  if (el.type === "path") {
    const d = state?.pathD ?? el.attrs.d;
    if (d) attrs.push(`d="${escapeAttr(String(d))}"`);
    return `${indent}<path ${attrs.join(" ")}/>`;
  }

  if (el.type === "text") {
    const text = String(el.attrs.text ?? el.name);
    return `${indent}<text ${attrs.join(" ")}>${escapeAttr(text)}</text>`;
  }

  if (el.type === "image") {
    const href = String(el.attrs.href ?? "");
    if (href) attrs.push(`href="${escapeAttr(href)}"`);
    attrs.push(`x="${el.attrs.x ?? 0}"`);
    attrs.push(`y="${el.attrs.y ?? 0}"`);
    attrs.push(`width="${el.attrs.width ?? 100}"`);
    attrs.push(`height="${el.attrs.height ?? 100}"`);
    return `${indent}<image ${attrs.join(" ")}/>`;
  }

  if (el.type === "video") {
    const href = String(el.attrs.href ?? "");
    const w = el.attrs.width ?? 100;
    const h = el.attrs.height ?? 100;
    const x = el.attrs.x ?? 0;
    const y = el.attrs.y ?? 0;
    const objectFit = el.attrs.objectFit ?? "contain";
    if (href) {
      return `${indent}<foreignObject x="${x}" y="${y}" width="${w}" height="${h}" ${attrs.filter((a) => !a.startsWith("transform")).join(" ")}>
${indent}  <video xmlns="http://www.w3.org/1999/xhtml" src="${escapeAttr(href)}" style="width:100%;height:100%;object-fit:${objectFit}" muted playsinline/>
${indent}</foreignObject>`;
    }
    return "";
  }

  return `${indent}<${el.type} ${attrs.join(" ")}/>`;
}

/** Render a static SVG snapshot at a given time (for raster export / previews) */
export function renderProjectSnapshot(project: Project, time: number): string {
  const roots = getChildren(project.elements, null);
  const body = roots.map((r) => renderElementAtTime(project, r.id, time, "  ")).join("\n");
  const bg = project.canvas.background ? ` style="background:${project.canvas.background}"` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${project.canvas.width}" height="${project.canvas.height}" viewBox="${project.canvas.viewBox}"${bg}>
${body}
</svg>`;
}

export function createElement(
  type: ElementType,
  parentId: string | null,
  project: Project,
  attrs: Record<string, string | number> = {},
  name?: string
): { element: ElementNode; project: Project } {
  const siblings = project.elements.filter((e) => e.parentId === parentId);
  const order = siblings.length > 0 ? Math.max(...siblings.map((s) => s.order)) + 1 : 0;
  const id = createId();

  const defaults: Record<ElementType, Record<string, string | number>> = {
    group: {},
    path: { d: "M 0 0", fill: "none", stroke: "#ffffff", "stroke-width": 2 },
    rect: { x: 0, y: 0, width: 100, height: 100, fill: "#ffffff" },
    circle: { cx: 50, cy: 50, r: 50, fill: "#ffffff" },
    ellipse: { cx: 50, cy: 50, rx: 60, ry: 40, fill: "#ffffff" },
    line: { x1: 0, y1: 0, x2: 100, y2: 100, stroke: "#ffffff", "stroke-width": 2 },
    polyline: { points: "0,0 50,50 100,0", fill: "none", stroke: "#ffffff", "stroke-width": 2 },
    polygon: { points: "50,0 100,100 0,100", fill: "#ffffff" },
    text: { x: 10, y: 30, "font-size": 24, fill: "#ffffff", text: "Text" },
    use: { href: "#", width: 100, height: 100 },
    image: {
      href: "",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      objectFit: "contain",
      cropX: 0,
      cropY: 0,
      cropWidth: 1,
      cropHeight: 1,
    },
    video: {
      href: "",
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      objectFit: "contain",
      cropX: 0,
      cropY: 0,
      cropWidth: 1,
      cropHeight: 1,
      trimIn: 0,
      trimOut: 0,
      sourceDuration: 0,
      muted: 1,
      playbackRate: 1,
    },
  };

  const element: ElementNode = {
    id,
    name: name ?? `${type}-${siblings.length + 1}`,
    type,
    parentId,
    visible: true,
    locked: false,
    order,
    attrs: { ...defaults[type], ...attrs },
    transform: { ...DEFAULT_TRANSFORM },
  };

  return {
    element,
    project: { ...project, elements: [...project.elements, element] },
  };
}

export function updateElementAttrs(
  project: Project,
  elementId: string,
  attrs: Record<string, string | number>
): Project {
  return {
    ...project,
    elements: project.elements.map((e) =>
      e.id === elementId ? { ...e, attrs: { ...e.attrs, ...attrs } } : e
    ),
  };
}

export function createDefaultStateMachine(duration: number): import("@svg-animator/types").StateMachine {
  const idleId = createId();
  const activeId = createId();
  const hoverInputId = createId();
  const unhoverInputId = createId();
  const clickInputId = createId();
  return {
    id: createId(),
    name: "Main",
    initialStateId: idleId,
    inputs: [
      { id: hoverInputId, name: "hover", type: "trigger" },
      { id: unhoverInputId, name: "unhover", type: "trigger" },
      { id: clickInputId, name: "click", type: "trigger" },
    ],
    states: [
      { id: idleId, name: "Idle", timelineStart: 0, timelineEnd: duration * 0.5, loop: true },
      { id: activeId, name: "Active", timelineStart: duration * 0.5, timelineEnd: duration, loop: true },
    ],
    transitions: [
      { id: createId(), fromStateId: idleId, toStateId: activeId, inputId: hoverInputId },
      { id: createId(), fromStateId: activeId, toStateId: idleId, inputId: unhoverInputId },
      { id: createId(), fromStateId: activeId, toStateId: idleId, inputId: clickInputId },
    ],
  };
}
