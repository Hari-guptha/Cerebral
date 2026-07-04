import type { ElementNode, ElementType, Project, Transform2D } from "@svg-animator/types";
import { createId, DEFAULT_TRANSFORM } from "@svg-animator/types";

const ANIMATABLE_TAGS: Record<string, ElementType> = {
  g: "group",
  path: "path",
  rect: "rect",
  circle: "circle",
  ellipse: "ellipse",
  line: "line",
  polyline: "polyline",
  polygon: "polygon",
  text: "text",
  use: "use",
  image: "image",
};

const ATTR_KEYS = [
  "fill",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-dashoffset",
  "d",
  "x",
  "y",
  "width",
  "height",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "points",
  "font-size",
  "font-family",
  "href",
  "preserveAspectRatio",
  "objectFit",
  "cropX",
  "cropY",
  "cropWidth",
  "cropHeight",
  "trimIn",
  "trimOut",
  "sourceDuration",
  "muted",
  "playbackRate",
  "assetId",
];

function parseViewBox(svg: SVGSVGElement): { width: number; height: number; viewBox: string } {
  const vb = svg.getAttribute("viewBox");
  if (vb) {
    const parts = vb.split(/[\s,]+/).map(Number);
    if (parts.length === 4) {
      return { width: parts[2], height: parts[3], viewBox: vb };
    }
  }
  const w = parseFloat(svg.getAttribute("width") ?? "512");
  const h = parseFloat(svg.getAttribute("height") ?? "512");
  return { width: w, height: h, viewBox: `0 0 ${w} ${h}` };
}

function parseTransform(transformStr: string | null): Transform2D {
  if (!transformStr) return { ...DEFAULT_TRANSFORM };

  const result = { ...DEFAULT_TRANSFORM };
  const translate = transformStr.match(/translate\(([^)]+)\)/);
  if (translate) {
    const parts = translate[1].split(/[\s,]+/).map(Number);
    result.x = parts[0] ?? 0;
    result.y = parts[1] ?? 0;
  }
  const rotate = transformStr.match(/rotate\(([^)]+)\)/);
  if (rotate) {
    const parts = rotate[1].split(/[\s,]+/).map(Number);
    result.rotation = parts[0] ?? 0;
    if (parts.length >= 3) {
      result.originX = parts[1] ?? 0;
      result.originY = parts[2] ?? 0;
    }
  }
  const scale = transformStr.match(/scale\(([^)]+)\)/);
  if (scale) {
    const parts = scale[1].split(/[\s,]+/).map(Number);
    result.scaleX = parts[0] ?? 1;
    result.scaleY = parts[1] ?? parts[0] ?? 1;
  }
  return result;
}

function collectElements(
  node: Element,
  parentId: string | null,
  elements: ElementNode[],
  idCounter: { n: number },
  usedIds: Set<string>
): void {
  const tag = node.tagName.toLowerCase();
  const type = ANIMATABLE_TAGS[tag];
  if (!type) return;

  let svgId = node.getAttribute("id") ?? undefined;
  if (svgId && usedIds.has(svgId)) {
    svgId = `${svgId}_${idCounter.n++}`;
  }
  if (svgId) usedIds.add(svgId);

  const id = createId();
  const attrs: Record<string, string | number> = {};
  for (const key of ATTR_KEYS) {
    const val = node.getAttribute(key);
    if (val !== null) {
      attrs[key] = key === "stroke-width" || key.includes("opacity") ? parseFloat(val) || val : val;
    }
  }

  if (type === "image" && !attrs.href) {
    const xlinkHref =
      node.getAttribute("href") ??
      node.getAttribute("xlink:href") ??
      node.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (xlinkHref) attrs.href = xlinkHref;
  }

  const opacity = node.getAttribute("opacity");
  if (opacity) attrs.opacity = parseFloat(opacity);

  const name =
    svgId ??
    node.getAttribute("data-name") ??
  node.getAttribute("aria-label") ??
    `${type}_${idCounter.n++}`;

  elements.push({
    id,
    svgId,
    name,
    type,
    parentId,
    visible: node.getAttribute("display") !== "none" && node.getAttribute("visibility") !== "hidden",
    locked: false,
    order: elements.length,
    attrs,
    transform: parseTransform(node.getAttribute("transform")),
  });

  for (const child of Array.from(node.children)) {
    collectElements(child, id, elements, idCounter, usedIds);
  }
}

export interface ParseResult {
  project: Project;
  warnings: string[];
}

export function parseSvg(svgString: string, projectName = "Imported SVG"): ParseResult {
  const warnings: string[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error(`Invalid SVG: ${parseError.textContent ?? "parse error"}`);
  }

  const svg = doc.querySelector("svg");
  if (!svg) throw new Error("No <svg> root element found");

  const canvas = parseViewBox(svg);
  const elements: ElementNode[] = [];
  const idCounter = { n: 1 };
  const usedIds = new Set<string>();

  for (const child of Array.from(svg.children)) {
    collectElements(child, null, elements, idCounter, usedIds);
  }

  if (elements.length === 0) {
    warnings.push("No animatable elements found in SVG");
  }

  const project: Project = {
    id: createId(),
    name: projectName,
    version: 1,
    canvas,
    fps: 30,
    duration: 4,
    elements,
    tracks: [],
    markers: [],
    settings: {
      loop: "once",
      trigger: "load",
      autoKeyframe: true,
      idPrefix: "sa",
      responsive: false,
    },
    sourceSvg: svgString,
  };

  return { project, warnings };
}

export function getElementTree(elements: ElementNode[]): ElementNode[] {
  return [...elements].sort((a, b) => a.order - b.order);
}

export function getChildren(elements: ElementNode[], parentId: string | null): ElementNode[] {
  return elements.filter((e) => e.parentId === parentId).sort((a, b) => a.order - b.order);
}

export function groupElements(
  elements: ElementNode[],
  selectedIds: string[],
  groupId?: string
): ElementNode[] {
  if (selectedIds.length < 2) return elements;

  const selected = elements.filter((e) => selectedIds.includes(e.id));
  const parentIds = new Set(selected.map((e) => e.parentId));
  if (parentIds.size > 1) return elements;

  const parentId = selected[0]?.parentId ?? null;
  const minOrder = Math.min(...selected.map((e) => e.order));
  const newGroup: ElementNode = {
    id: groupId ?? createId(),
    name: `Group ${selected.length}`,
    type: "group",
    parentId,
    visible: true,
    locked: false,
    order: minOrder,
    attrs: {},
    transform: { ...DEFAULT_TRANSFORM },
  };

  const updated = elements.map((e) => {
    if (selectedIds.includes(e.id)) {
      return { ...e, parentId: newGroup.id };
    }
    if (e.order >= minOrder && !selectedIds.includes(e.id) && e.parentId === parentId) {
      return { ...e, order: e.order + 1 };
    }
    return e;
  });

  return [...updated, newGroup].sort((a, b) => a.order - b.order);
}

export function ungroupElements(elements: ElementNode[], groupId: string): ElementNode[] {
  const group = elements.find((e) => e.id === groupId);
  if (!group || group.type !== "group") return elements;

  return elements
    .filter((e) => e.id !== groupId)
    .map((e) => (e.parentId === groupId ? { ...e, parentId: group.parentId } : e));
}

export function reorderElement(
  elements: ElementNode[],
  elementId: string,
  direction: "up" | "down"
): ElementNode[] {
  const el = elements.find((e) => e.id === elementId);
  if (!el) return elements;

  const siblings = getChildren(elements, el.parentId);
  const idx = siblings.findIndex((s) => s.id === elementId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return elements;

  const other = siblings[swapIdx];
  return elements.map((e) => {
    if (e.id === el.id) return { ...e, order: other.order };
    if (e.id === other.id) return { ...e, order: el.order };
    return e;
  });
}
