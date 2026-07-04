import type { EasingCurve } from "@svg-animator/types";
import BezierEasing from "bezier-easing";

const PRESET_BEZIERS: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
  spring: [0.34, 1.56, 0.64, 1],
  bounce: [0.68, -0.55, 0.27, 1.55],
  anticipate: [-0.2, 0, 0.4, 1],
};

export function getBezierPoints(easing: EasingCurve): [number, number, number, number] {
  if (easing.type === "bezier" && easing.bezier) {
    return easing.bezier;
  }
  const preset = easing.preset ?? "easeInOut";
  return PRESET_BEZIERS[preset] ?? PRESET_BEZIERS.easeInOut;
}

export function evaluateEasing(t: number, easing: EasingCurve): number {
  const [x1, y1, x2, y2] = getBezierPoints(easing);
  const clamped = Math.max(0, Math.min(1, t));
  const fn = BezierEasing(x1, y1, x2, y2);
  return fn(clamped);
}

export function interpolateNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function interpolateColor(a: string, b: string, t: number): string {
  const parse = (c: string): [number, number, number, number] => {
    const hex = c.trim();
    if (hex.startsWith("#")) {
      const h = hex.slice(1);
      if (h.length === 3) {
        return [
          parseInt(h[0] + h[0], 16),
          parseInt(h[1] + h[1], 16),
          parseInt(h[2] + h[2], 16),
          1,
        ];
      }
      if (h.length === 6) {
        return [
          parseInt(h.slice(0, 2), 16),
          parseInt(h.slice(2, 4), 16),
          parseInt(h.slice(4, 6), 16),
          1,
        ];
      }
    }
    const rgb = hex.match(/rgba?\(([^)]+)\)/);
    if (rgb) {
      const parts = rgb[1].split(",").map((s) => parseFloat(s.trim()));
      return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
    }
    return [0, 0, 0, 1];
  };

  const [r1, g1, b1, a1] = parse(a);
  const [r2, g2, b2, a2] = parse(b);
  const r = Math.round(interpolateNumber(r1, r2, t));
  const g = Math.round(interpolateNumber(g1, g2, t));
  const bVal = Math.round(interpolateNumber(b1, b2, t));
  const alpha = interpolateNumber(a1, a2, t);
  if (alpha < 1) {
    return `rgba(${r},${g},${bVal},${alpha.toFixed(3)})`;
  }
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bVal.toString(16).padStart(2, "0")}`;
}

export function interpolateValue(
  a: number | string,
  b: number | string,
  t: number
): number | string {
  if (typeof a === "number" && typeof b === "number") {
    return interpolateNumber(a, b, t);
  }
  if (typeof a === "string" && typeof b === "string") {
    if (a.startsWith("#") || a.startsWith("rgb") || b.startsWith("#") || b.startsWith("rgb")) {
      return interpolateColor(a, b, t);
    }
    return t < 0.5 ? a : b;
  }
  return t < 0.5 ? a : b;
}

export function toSmilKeySplines(easing: EasingCurve): string {
  const [x1, y1, x2, y2] = getBezierPoints(easing).map((v) =>
    Math.max(0, Math.min(1, v))
  ) as [number, number, number, number];
  return `${x1} ${y1} ${x2} ${y2}`;
}

export function toCssEasing(easing: EasingCurve): string {
  if (easing.type === "preset" && easing.preset) {
    const map: Record<string, string> = {
      linear: "linear",
      easeIn: "ease-in",
      easeOut: "ease-out",
      easeInOut: "ease-in-out",
    };
    if (map[easing.preset]) return map[easing.preset];
  }
  const [x1, y1, x2, y2] = getBezierPoints(easing);
  return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
}
