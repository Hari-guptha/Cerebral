import type { ElementNode, Keyframe } from "@svg-animator/types";
import { getPathVertices } from "../path-utils";

function parseColor(c: string | undefined): [number, number, number, number] {
  if (!c || c === "none") return [0, 0, 0, 0];
  const hex = c.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
    const n = parseInt(h.slice(0, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a];
  }
  return [0, 0, 0, 1];
}

function lottiePathShape(d: string) {
  const verts = getPathVertices(d);
  const zero = verts.map(() => [0, 0]);
  return {
    ty: "sh",
    nm: "Path",
    ks: {
      a: 0,
      k: {
        i: zero,
        o: zero,
        v: verts.map((p) => [p.x, p.y]),
        c: false,
      },
    },
  };
}

function staticColor(c: string | undefined) {
  const [r, g, b, a] = parseColor(c);
  return { a: 0, k: [r, g, b, a], ix: 4 };
}

export function buildElementShapes(el: ElementNode): Record<string, unknown>[] {
  const fill = staticColor(el.attrs.fill as string | undefined);
  const stroke = staticColor(el.attrs.stroke as string | undefined);
  const strokeWidth =
    typeof el.attrs["stroke-width"] === "number"
      ? el.attrs["stroke-width"]
      : parseFloat(String(el.attrs["stroke-width"] ?? 0)) || 0;

  const styleShape = {
    ty: "st",
    nm: "Stroke",
    c: stroke,
    o: { a: 0, k: 100, ix: 4 },
    w: { a: 0, k: strokeWidth, ix: 4 },
  };

  const fillShape = {
    ty: "fl",
    nm: "Fill",
    c: fill,
    o: { a: 0, k: 100, ix: 4 },
    r: 1,
  };

  let geom: Record<string, unknown> | null = null;

  if (el.type === "path") {
    const d = String(el.attrs.d ?? "");
    if (d.trim()) geom = lottiePathShape(d);
  } else if (el.type === "rect") {
    const w = Number(el.attrs.width ?? 0);
    const h = Number(el.attrs.height ?? 0);
    geom = {
      ty: "rc",
      nm: "Rect",
      p: { a: 0, k: [Number(el.attrs.x ?? 0) + w / 2, Number(el.attrs.y ?? 0) + h / 2], ix: 2 },
      s: { a: 0, k: [w, h], ix: 2 },
      r: { a: 0, k: 0, ix: 4 },
    };
  } else if (el.type === "ellipse" || el.type === "circle") {
    geom = {
      ty: "el",
      nm: "Ellipse",
      p: { a: 0, k: [Number(el.attrs.cx ?? 0), Number(el.attrs.cy ?? 0)], ix: 2 },
      s: { a: 0, k: [Number(el.attrs.rx ?? el.attrs.r ?? 0) * 2, Number(el.attrs.ry ?? el.attrs.r ?? 0) * 2], ix: 2 },
    };
  }

  if (!geom) return [];

  const fillRgba = parseColor(el.attrs.fill as string | undefined);
  const hasFill = fillRgba[3] > 0 && el.attrs.fill !== "none";
  const hasStroke = strokeWidth > 0 && el.attrs.stroke !== "none";

  const items: Record<string, unknown>[] = [geom];
  if (hasFill) items.push(fillShape);
  if (hasStroke) items.push(styleShape);

  return [
    {
      ty: "gr",
      nm: el.name,
      it: items,
      np: 2,
      cix: 2,
      bm: 0,
      ix: 1,
    },
  ];
}

export function toLottieKeyframes(kfs: Keyframe[], fps: number, asPercent = false) {
  const sorted = [...kfs].sort((a, b) => a.time - b.time);
  return {
    a: 1,
    k: sorted.map((kf) => ({
      t: Math.round(kf.time * fps),
      s: [typeof kf.value === "number" ? (asPercent ? kf.value * 100 : kf.value) : 0],
      i: { x: [0.42], y: [0] },
      o: { x: [0.58], y: [1] },
    })),
    ix: 2,
  };
}

export function toLottiePositionKeyframes(
  xKfs: Keyframe[],
  yKfs: Keyframe[],
  fps: number,
  fallbackX: number,
  fallbackY: number
) {
  const times = new Set<number>();
  for (const k of xKfs) times.add(k.time);
  for (const k of yKfs) times.add(k.time);
  const sortedTimes = [...times].sort((a, b) => a - b);

  const sample = (kfs: Keyframe[], t: number, fallback: number) => {
    if (kfs.length === 0) return fallback;
    const sorted = [...kfs].sort((a, b) => a.time - b.time);
    if (t <= sorted[0].time) return sorted[0].value as number;
    if (t >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value as number;
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (t >= a.time && t <= b.time) {
        const u = (t - a.time) / (b.time - a.time || 1);
        return (a.value as number) + ((b.value as number) - (a.value as number)) * u;
      }
    }
    return fallback;
  };

  return {
    a: 1,
    k: sortedTimes.map((t) => ({
      t: Math.round(t * fps),
      s: [sample(xKfs, t, fallbackX), sample(yKfs, t, fallbackY), 0],
      i: { x: [0.42, 0.42, 0.42], y: [0, 0, 0] },
      o: { x: [0.58, 0.58, 0.58], y: [1, 1, 1] },
    })),
    ix: 2,
  };
}
